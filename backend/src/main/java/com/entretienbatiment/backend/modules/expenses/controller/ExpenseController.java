package com.entretienbatiment.backend.modules.expenses.controller;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.model.Role;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.expenses.dto.ExpenseRequest;
import com.entretienbatiment.backend.modules.expenses.model.Expense;
import com.entretienbatiment.backend.modules.expenses.model.ExpenseReceipt;
import com.entretienbatiment.backend.modules.expenses.repository.ExpenseReceiptRepository;
import com.entretienbatiment.backend.modules.expenses.repository.ExpenseRepository;
import com.entretienbatiment.backend.modules.files.config.UploadPaths;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Endpoints for the representant's own expense reports (invoices/receipts).
 * - REPRESENTANT: can only see/create/edit/delete their OWN expenses, no approval.
 * - ADMIN: can see and act on any user's expenses.
 */
@RestController
@RequestMapping("/api/expenses")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'REP_EXPENSES')")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final ExpenseReceiptRepository receiptRepository;
    private final AppUserRepository userRepository;
    private final UploadPaths uploadPaths;

    public ExpenseController(ExpenseRepository expenseRepository,
                             ExpenseReceiptRepository receiptRepository,
                             AppUserRepository userRepository,
                             UploadPaths uploadPaths) {
        this.expenseRepository = expenseRepository;
        this.receiptRepository = receiptRepository;
        this.userRepository = userRepository;
        this.uploadPaths = uploadPaths;
    }

    private Path uploadDir() { return uploadPaths.expenses(); }

    // ───────────────────────────── Helpers ──────────────────────────────────

    private AppUser requireUser(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Expense requireOwnedOrAdmin(Long id, AppUser user) {
        Expense e = expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (!user.getRole().isAdminLike() && !e.getUserId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your expense");
        }
        return e;
    }

    private void applyFields(Expense target, ExpenseRequest req) {
        if (req.date() != null)             target.setDate(req.date());
        if (req.supplier() != null)         target.setSupplier(req.supplier());
        if (req.description() != null)      target.setDescription(req.description());
        if (req.province() != null)         target.setProvince(req.province());
        if (req.imputationCode() != null)   target.setImputationCode(req.imputationCode());
        if (req.subtotalCents() != null)    target.setSubtotalCents(req.subtotalCents());
        if (req.tpsCents() != null)         target.setTpsCents(req.tpsCents());
        if (req.tvqCents() != null)         target.setTvqCents(req.tvqCents());
        if (req.tvhCents() != null)         target.setTvhCents(req.tvhCents());
        if (req.tipCents() != null)         target.setTipCents(req.tipCents());
        if (req.totalCents() != null)       target.setTotalCents(req.totalCents());
        if (req.notes() != null)            target.setNotes(req.notes());
    }

    // ───────────────────────────── CRUD ─────────────────────────────────────

    /** Rep / admin: list MY expenses (for admin viewing someone else's, use the admin endpoint). */
    @GetMapping
    public List<Expense> listMine(Authentication auth) {
        AppUser user = requireUser(auth);
        return expenseRepository.findByUserIdAndArchivedFalseOrderByDateDescIdDesc(user.getId());
    }

    /** Rep: list MY archived expenses. Admin: list ALL archived expenses. */
    @GetMapping("/archived")
    public List<Expense> listArchived(Authentication auth) {
        AppUser user = requireUser(auth);
        if (user.getRole().isAdminLike()) {
            return expenseRepository.findByArchivedTrueOrderByArchivedAtDesc();
        }
        return expenseRepository.findByUserIdAndArchivedTrueOrderByArchivedAtDesc(user.getId());
    }

    @GetMapping("/{id}")
    public Expense get(@PathVariable Long id, Authentication auth) {
        return requireOwnedOrAdmin(id, requireUser(auth));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Expense create(@RequestBody ExpenseRequest req, Authentication auth) {
        AppUser user = requireUser(auth);
        Expense e = new Expense();
        e.setUserId(user.getId());
        if (req.date() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date is required");
        }
        applyFields(e, req);
        return expenseRepository.save(e);
    }

    @PutMapping("/{id}")
    public Expense update(@PathVariable Long id, @RequestBody ExpenseRequest req, Authentication auth) {
        AppUser user = requireUser(auth);
        Expense e = requireOwnedOrAdmin(id, user);
        applyFields(e, req);
        return expenseRepository.save(e);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication auth) {
        AppUser user = requireUser(auth);
        Expense e = requireOwnedOrAdmin(id, user);
        // Delete receipt files from disk
        for (ExpenseReceipt r : e.getReceipts()) {
            deleteReceiptFileQuietly(r.getFilename());
        }
        expenseRepository.delete(e);
    }

    @PatchMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable Long id, Authentication auth) {
        AppUser user = requireUser(auth);
        if (!user.getRole().isAdminLike()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can archive expenses");
        }
        Expense e = expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        e.setArchived(true);
        e.setArchivedAt(LocalDateTime.now());
        expenseRepository.save(e);
    }

    @PatchMapping("/{id}/unarchive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unarchive(@PathVariable Long id, Authentication auth) {
        AppUser user = requireUser(auth);
        if (!user.getRole().isAdminLike()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can unarchive expenses");
        }
        Expense e = expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        e.setArchived(false);
        e.setArchivedAt(null);
        expenseRepository.save(e);
    }

    // ─────────────────────── Approval (admin only) ──────────────────────────

    public record StatusUpdateRequest(String status, String note) {}

    @PatchMapping("/{id}/status")
    public Expense updateStatus(@PathVariable Long id,
                                @RequestBody StatusUpdateRequest body,
                                Authentication auth) {
        AppUser admin = requireUser(auth);
        if (!admin.getRole().isAdminLike()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        Expense e = expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        String newStatus = body.status() == null ? "" : body.status().toUpperCase();
        if (!List.of("PENDING", "APPROVED", "REJECTED").contains(newStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        }
        e.setStatus(newStatus);
        e.setApprovedByUserId(admin.getId());
        e.setApprovedAt(LocalDateTime.now());
        e.setApprovalNote(body.note());
        return expenseRepository.save(e);
    }

    // ───────────────── Receipt upload / delete (multipart) ──────────────────

    @PostMapping(value = "/{id}/receipts", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public Expense addReceipt(@PathVariable Long id,
                              @RequestParam("file") MultipartFile file,
                              Authentication auth) {
        AppUser user = requireUser(auth);
        Expense e = requireOwnedOrAdmin(id, user);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }

        try {
            String original = file.getOriginalFilename();
            String ext = (original != null && original.contains("."))
                    ? original.substring(original.lastIndexOf('.'))
                    : "";
            String stored = UUID.randomUUID() + ext;

            Files.createDirectories(uploadDir());
            file.transferTo(uploadDir().resolve(stored).toAbsolutePath());

            ExpenseReceipt r = new ExpenseReceipt();
            r.setExpense(e);
            r.setFilename(stored);
            r.setContentType(file.getContentType());
            r.setOriginalName(original);
            r.setFileSize(file.getSize());
            e.getReceipts().add(r);
            receiptRepository.save(r);
            return expenseRepository.save(e);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store receipt", ex);
        }
    }

    @DeleteMapping("/{id}/receipts/{receiptId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeReceipt(@PathVariable Long id,
                              @PathVariable Long receiptId,
                              Authentication auth) {
        AppUser user = requireUser(auth);
        Expense e = requireOwnedOrAdmin(id, user);
        ExpenseReceipt receipt = e.getReceipts().stream()
                .filter(r -> r.getId().equals(receiptId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receipt not found"));
        deleteReceiptFileQuietly(receipt.getFilename());
        receiptRepository.deleteById(receiptId);
    }

    private void deleteReceiptFileQuietly(String filename) {
        if (filename == null) return;
        try {
            Files.deleteIfExists(uploadDir().resolve(filename));
        } catch (Exception ignored) { }
    }

    // ─────────────────────── OCR (stub) ────────────────────────────────────

    /**
     * Best-effort OCR of the first receipt photo. Currently a stub:
     * returns a placeholder with extracted text = null and parsed totals = null.
     *
     * To plug in OCR later, add a dependency such as Tess4J
     * ({@code net.sourceforge.tess4j:tess4j:5.x}) plus the native Tesseract
     * binary on the host, then read the image bytes from
     * {@code UPLOAD_DIR.resolve(receipt.getFilename())} and run
     * {@code new Tesseract().doOCR(...)}. Parse "TOTAL", "TPS"/"GST", "TVQ"/"QST"
     * and any "Sous-total" line with regex, then call setTotalCents etc. on the
     * Expense and persist. Suggested flag: {@code ocrProcessedAt = now()}.
     */
    @PostMapping("/{id}/ocr")
    public Expense runOcr(@PathVariable Long id, Authentication auth) {
        AppUser user = requireUser(auth);
        Expense e = requireOwnedOrAdmin(id, user);
        if (e.getReceipts().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Upload a receipt first");
        }
        e.setOcrProcessedAt(LocalDateTime.now());
        e.setOcrRawText("[OCR not yet enabled. Plug in Tess4J or a cloud OCR provider in ExpenseController.runOcr().]");
        return expenseRepository.save(e);
    }
}
