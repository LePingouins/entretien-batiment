package com.entretienbatiment.backend.modules.representants.controller;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.model.Role;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.expenses.model.Expense;
import com.entretienbatiment.backend.modules.expenses.repository.ExpenseRepository;
import com.entretienbatiment.backend.modules.representants.service.RepresentantExcelExportService;
import com.entretienbatiment.backend.modules.reptrips.model.RepTrip;
import com.entretienbatiment.backend.modules.reptrips.repository.RepTripRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

/**
 * Admin-only directory of REPRESENTANT users with drill-down to their
 * trips, expenses, totals, and Excel export.
 */
@RestController
@RequestMapping("/api/admin/representants")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRepresentantsController {

    private final AppUserRepository userRepository;
    private final RepTripRepository tripRepository;
    private final ExpenseRepository expenseRepository;
    private final RepresentantExcelExportService excelService;

    public AdminRepresentantsController(AppUserRepository userRepository,
                                        RepTripRepository tripRepository,
                                        ExpenseRepository expenseRepository,
                                        RepresentantExcelExportService excelService) {
        this.userRepository = userRepository;
        this.tripRepository = tripRepository;
        this.expenseRepository = expenseRepository;
        this.excelService = excelService;
    }

    public record RepListItem(Long id, String email, boolean enabled, int tripCount, long expenseCount) {}

    public record RepProfile(
            Long id,
            String email,
            boolean enabled,
            List<RepTrip> trips,
            List<Expense> expenses,
            double totalKm,
            long totalReimbursementCents,
            long totalExpenseCents
    ) {}

    @GetMapping
    public List<RepListItem> list() {
        List<AppUser> reps = userRepository.findByRoleIn(java.util.List.of(Role.REPRESENTANT, Role.DEVELOPPER));
        return reps.stream()
                .sorted((a, b) -> a.getEmail().compareToIgnoreCase(b.getEmail()))
                .map(u -> {
                    List<RepTrip> trips = tripRepository.findByUserIdOrderByDateDescCreatedAtDesc(u.getId());
                    long expCount = expenseRepository.findByUserIdOrderByDateDescIdDesc(u.getId()).size();
                    return new RepListItem(u.getId(), u.getEmail(), u.isEnabled(), trips.size(), expCount);
                })
                .toList();
    }

    @GetMapping("/{userId}")
    public RepProfile profile(@PathVariable Long userId,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        AppUser u = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));

        List<RepTrip> trips;
        List<Expense> expenses;
        if (startDate != null && endDate != null) {
            trips = tripRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
            expenses = expenseRepository.findByUserIdAndDateBetweenOrderByDateAscIdAsc(userId, startDate, endDate);
        } else {
            trips = tripRepository.findByUserIdOrderByDateDescCreatedAtDesc(userId);
            expenses = expenseRepository.findByUserIdOrderByDateDescIdDesc(userId);
        }
        // Hide archived items — they live in the Archive page only.
        trips = trips.stream().filter(t -> !Boolean.TRUE.equals(t.getArchived())).toList();
        expenses = expenses.stream().filter(e -> !Boolean.TRUE.equals(e.getArchived())).toList();

        double totalKm = trips.stream()
                .mapToDouble(t -> t.getTotalKm() == null ? 0.0 : t.getTotalKm())
                .sum();
        long totalReimb = trips.stream()
                .mapToLong(t -> t.getReimbursementCents() == null ? 0 : t.getReimbursementCents())
                .sum();
        long totalExpense = expenses.stream()
                .mapToLong(e -> e.getTotalCents() == null ? 0 : e.getTotalCents())
                .sum();

        return new RepProfile(u.getId(), u.getEmail(), u.isEnabled(),
                trips, expenses, totalKm, totalReimb, totalExpense);
    }

    /**
     * Excel export matching the template in the screenshots:
     * - Header (NOM + DATE)
     * - KILOMÉTRAGE section (date, client, note, odometre start/end, km, province, code GL, sous-total, TPS, TVQ, TVH, pourboire, total)
     * - DÉPENSES section (date, fournisseur, nature, km, province, code GL, sous-total, TPS, TVQ, TVH, pourboire, total)
     * - Totals row
     */
    @GetMapping("/{userId}/export")
    public ResponseEntity<byte[]> export(@PathVariable Long userId,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                                         @RequestParam(name = "includePhone", defaultValue = "false") boolean includePhone) {
        AppUser u = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));

        List<RepTrip> trips = tripRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
        List<Expense> expenses = expenseRepository.findByUserIdAndDateBetweenOrderByDateAscIdAsc(userId, startDate, endDate);

        byte[] xlsx = excelService.build(u, trips, expenses, startDate, endDate, includePhone);
        String filename = "compte-de-depenses-" + u.getEmail().replace('@', '_') + "-" + startDate + "_" + endDate + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(xlsx);
    }

    /** CSV export — useful for dev testing; mirrors the Excel structure but in plain text. */
    @GetMapping("/{userId}/export-csv")
    public ResponseEntity<byte[]> exportCsv(@PathVariable Long userId,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        AppUser u = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));

        List<RepTrip> trips = tripRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
        List<Expense> expenses = expenseRepository.findByUserIdAndDateBetweenOrderByDateAscIdAsc(userId, startDate, endDate);

        StringBuilder sb = new StringBuilder();
        sb.append("COMPTE DE DÉPENSES\n");
        sb.append("NOM:,").append(u.getEmail()).append("\n");
        sb.append("DATE:,").append(startDate).append(" au ").append(endDate).append("\n\n");

        // KM section
        sb.append("KILOMÉTRAGE\n");
        sb.append("NO,DATE,CLIENT,NOTE,KM PARCOURU,PROVINCE,CODE GL,REMBOURSEMENT ($)\n");
        double totalKm = 0;
        long totalReimb = 0;
        int idx = 1;
        for (RepTrip t : trips) {
            sb.append(idx++).append(",");
            sb.append(t.getDate() == null ? "" : t.getDate().toString()).append(",");
            sb.append(csvEscape(t.getPurpose())).append(",");
            sb.append(csvEscape(t.getNotes())).append(",");
            double km = t.getTotalKm() == null ? 0.0 : t.getTotalKm();
            sb.append(km).append(",");
            sb.append("QC,");
            sb.append(",");
            double reimb = t.getReimbursementCents() == null ? 0.0 : t.getReimbursementCents() / 100.0;
            sb.append(String.format("%.2f", reimb)).append("\n");
            totalKm += km;
            if (t.getReimbursementCents() != null) totalReimb += t.getReimbursementCents();
        }
        sb.append(",,,,,,,\n");
        sb.append("TOTAL KM:,,,,").append(totalKm).append(",,,").append(String.format("%.2f", totalReimb / 100.0)).append("\n\n");

        // Expense section
        sb.append("DÉPENSES\n");
        sb.append("NO,DATE,FOURNISSEUR,NATURE,PROVINCE,CODE GL,SOUS-TOTAL,TPS,TVQ,TVH,POURBOIRE,TOTAL,STATUT\n");
        long totSub = 0, totTps = 0, totTvq = 0, totTvh = 0, totTip = 0, totAll = 0;
        int eidx = 1;
        for (Expense e : expenses) {
            sb.append(eidx++).append(",");
            sb.append(e.getDate() == null ? "" : e.getDate().toString()).append(",");
            sb.append(csvEscape(e.getSupplier())).append(",");
            sb.append(csvEscape(e.getDescription())).append(",");
            sb.append(csvEscape(e.getProvince())).append(",");
            sb.append(csvEscape(e.getImputationCode())).append(",");
            sb.append(fmtCents(e.getSubtotalCents())).append(",");
            sb.append(fmtCents(e.getTpsCents())).append(",");
            sb.append(fmtCents(e.getTvqCents())).append(",");
            sb.append(fmtCents(e.getTvhCents())).append(",");
            sb.append(fmtCents(e.getTipCents())).append(",");
            sb.append(fmtCents(e.getTotalCents())).append(",");
            sb.append(e.getStatus() == null ? "" : e.getStatus()).append("\n");
            totSub  += e.getSubtotalCents()  == null ? 0 : e.getSubtotalCents();
            totTps  += e.getTpsCents()       == null ? 0 : e.getTpsCents();
            totTvq  += e.getTvqCents()       == null ? 0 : e.getTvqCents();
            totTvh  += e.getTvhCents()       == null ? 0 : e.getTvhCents();
            totTip  += e.getTipCents()       == null ? 0 : e.getTipCents();
            totAll  += e.getTotalCents()     == null ? 0 : e.getTotalCents();
        }
        sb.append(",,,,,Totaux:,");
        sb.append(fmtCents(totSub)).append(",");
        sb.append(fmtCents(totTps)).append(",");
        sb.append(fmtCents(totTvq)).append(",");
        sb.append(fmtCents(totTvh)).append(",");
        sb.append(fmtCents(totTip)).append(",");
        sb.append(fmtCents(totAll)).append(",\n\n");

        sb.append("GRAND TOTAL (KM + Dépenses):,,,,,,,,,,,");
        sb.append(String.format("%.2f", (totalReimb + totAll) / 100.0)).append("\n");

        byte[] csv = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String filename = "compte-de-depenses-" + u.getEmail().replace('@', '_') + "-" + startDate + "_" + endDate + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    private static String csvEscape(String s) {
        if (s == null || s.isEmpty()) return "";
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    private static String fmtCents(Long cents) {
        return cents == null ? "" : String.format("%.2f", cents / 100.0);
    }
}
