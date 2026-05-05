package com.entretienbatiment.backend.modules.inventory.service;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.inventory.dto.*;
import com.entretienbatiment.backend.modules.inventory.model.*;
import com.entretienbatiment.backend.modules.inventory.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class InventoryService {

    private final InventoryCategoryRepository categoryRepo;
    private final InventoryProductRepository productRepo;
    private final InventoryCountSessionRepository sessionRepo;
    private final InventoryCountItemRepository itemRepo;
    private final AppUserRepository userRepo;

    public InventoryService(InventoryCategoryRepository categoryRepo,
                            InventoryProductRepository productRepo,
                            InventoryCountSessionRepository sessionRepo,
                            InventoryCountItemRepository itemRepo,
                            AppUserRepository userRepo) {
        this.categoryRepo = categoryRepo;
        this.productRepo = productRepo;
        this.sessionRepo = sessionRepo;
        this.itemRepo = itemRepo;
        this.userRepo = userRepo;
    }

    // ─── Categories ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        return categoryRepo.findAll().stream()
                .map(c -> new CategoryResponse(c.getId(), c.getName(), c.getCreatedAt()))
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest req) {
        if (categoryRepo.findByNameIgnoreCase(req.name()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists");
        }
        InventoryCategory cat = categoryRepo.save(new InventoryCategory(req.name()));
        return new CategoryResponse(cat.getId(), cat.getName(), cat.getCreatedAt());
    }

    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");
        }
        categoryRepo.deleteById(id);
    }

    // ─── Products ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProductResponse> listProducts() {
        return productRepo.findByArchivedFalseOrderByNameAsc().stream()
                .map(this::toProductResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> searchProducts(String q) {
        return productRepo.search(q).stream()
                .map(this::toProductResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long id) {
        return toProductResponse(findProduct(id));
    }

    @Transactional
    public ProductResponse createProduct(CreateProductRequest req) {
        if (productRepo.findBySkuIgnoreCase(req.sku()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists");
        }
        InventoryProduct p = new InventoryProduct();
        p.setSku(req.sku());
        p.setName(req.name());
        if (req.categoryId() != null) {
            p.setCategory(categoryRepo.findById(req.categoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found")));
        }
        p.setUnit(req.unit() != null ? req.unit() : "unit");
        p.setBarcode(req.barcode());
        p.setExpectedQty(req.expectedQty() != null ? req.expectedQty() : BigDecimal.ZERO);
        p.setLocationZone(req.locationZone());
        p.setNotes(req.notes());
        return toProductResponse(productRepo.save(p));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, UpdateProductRequest req) {
        InventoryProduct p = findProduct(id);
        if (req.sku() != null) {
            productRepo.findBySkuIgnoreCase(req.sku())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists");
                    });
            p.setSku(req.sku());
        }
        if (req.name() != null) p.setName(req.name());
        if (req.categoryId() != null) {
            p.setCategory(categoryRepo.findById(req.categoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found")));
        }
        if (req.unit() != null) p.setUnit(req.unit());
        if (req.barcode() != null) p.setBarcode(req.barcode());
        if (req.expectedQty() != null) p.setExpectedQty(req.expectedQty());
        if (req.locationZone() != null) p.setLocationZone(req.locationZone());
        if (req.notes() != null) p.setNotes(req.notes());
        return toProductResponse(productRepo.save(p));
    }

    @Transactional
    public void deleteProduct(Long id) {
        InventoryProduct p = findProduct(id);
        p.setArchived(true);
        productRepo.save(p);
    }

    @Transactional(readOnly = true)
    public List<String> getZones() {
        return productRepo.findDistinctZones();
    }

    // ─── Count Sessions ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SessionResponse> listSessions() {
        return sessionRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toSessionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SessionResponse getSession(Long id) {
        return toSessionResponse(findSession(id));
    }

    @Transactional
    public SessionResponse createSession(CreateSessionRequest req, Long userId) {
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found"));
        InventoryCountSession s = new InventoryCountSession();
        s.setName(req.name());
        s.setNotes(req.notes());
        s.setCreatedBy(user);
        s = sessionRepo.save(s);

        // Populate items from all active products
        List<InventoryProduct> products = productRepo.findByArchivedFalseOrderByNameAsc();
        for (InventoryProduct product : products) {
            InventoryCountItem item = new InventoryCountItem();
            item.setSession(s);
            item.setProduct(product);
            item.setExpectedQty(product.getExpectedQty());
            item.setZone(product.getLocationZone());
            itemRepo.save(item);
        }

        return toSessionResponse(s);
    }

    @Transactional
    public SessionResponse startSession(Long id) {
        InventoryCountSession s = findSession(id);
        if (s.getStatus() != InventorySessionStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session can only be started from DRAFT status");
        }
        s.start();
        return toSessionResponse(sessionRepo.save(s));
    }

    @Transactional
    public SessionResponse completeSession(Long id) {
        InventoryCountSession s = findSession(id);
        if (s.getStatus() != InventorySessionStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session must be IN_PROGRESS to complete");
        }
        s.complete();
        return toSessionResponse(sessionRepo.save(s));
    }

    @Transactional
    public SessionResponse cancelSession(Long id) {
        InventoryCountSession s = findSession(id);
        if (s.getStatus() == InventorySessionStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel a completed session");
        }
        s.cancel();
        return toSessionResponse(sessionRepo.save(s));
    }

    @Transactional
    public void deleteSession(Long id) {
        if (!sessionRepo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found");
        }
        sessionRepo.deleteById(id);
    }

    // ─── Count Items (live counting) ───────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CountItemResponse> getSessionItems(Long sessionId, String zone, String query) {
        List<InventoryCountItem> items;
        if (query != null && !query.isBlank()) {
            items = itemRepo.searchInSession(sessionId, query.trim());
        } else if (zone != null && !zone.isBlank()) {
            items = itemRepo.findBySessionAndZone(sessionId, zone);
        } else {
            items = itemRepo.findBySessionWithProduct(sessionId);
        }
        return items.stream().map(this::toCountItemResponse).toList();
    }

    @Transactional
    public CountItemResponse recordCount(Long sessionId, RecordCountRequest req, Long userId) {
        InventoryCountSession session = findSession(sessionId);
        if (session.getStatus() != InventorySessionStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is not in progress");
        }
        InventoryCountItem item = itemRepo.findBySession_IdAndProduct_Id(sessionId, req.productId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not in this session"));

        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found"));

        item.recordCount(req.countedQty(), user);
        if (req.notes() != null) item.setNotes(req.notes());
        return toCountItemResponse(itemRepo.save(item));
    }

    @Transactional(readOnly = true)
    public String exportSessionCsv(Long sessionId) {
        findSession(sessionId);
        List<InventoryCountItem> items = itemRepo.findBySessionWithProduct(sessionId);

        StringBuilder csv = new StringBuilder();
        csv.append("SKU,Product Name,Zone,Unit,Expected Qty,Counted Qty,Discrepancy,Counted By,Notes\n");

        for (InventoryCountItem item : items) {
            InventoryProduct product = item.getProduct();
            csv.append(escapeCsv(product.getSku())).append(',');
            csv.append(escapeCsv(product.getName())).append(',');
            csv.append(escapeCsv(item.getZone() != null ? item.getZone() : "")).append(',');
            csv.append(escapeCsv(product.getUnit())).append(',');
            csv.append(item.getExpectedQty()).append(',');
            csv.append(item.getCountedQty() != null ? item.getCountedQty() : "").append(',');
            csv.append(item.getDiscrepancy() != null ? item.getDiscrepancy() : "").append(',');
            csv.append(escapeCsv(item.getCountedBy() != null ? item.getCountedBy().getEmail() : "")).append(',');
            csv.append(escapeCsv(item.getNotes() != null ? item.getNotes() : ""));
            csv.append('\n');
        }
        return csv.toString();
    }

    // ─── Private helpers ───────────────────────────────────────────────────

    private InventoryProduct findProduct(Long id) {
        return productRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private InventoryCountSession findSession(Long id) {
        return sessionRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
    }

    private ProductResponse toProductResponse(InventoryProduct p) {
        return new ProductResponse(
                p.getId(), p.getSku(), p.getName(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getUnit(), p.getBarcode(), p.getExpectedQty(),
                p.getLocationZone(), p.getNotes(), p.isArchived(),
                p.getCreatedAt(), p.getUpdatedAt()
        );
    }

    private SessionResponse toSessionResponse(InventoryCountSession s) {
        long total = itemRepo.countBySession_Id(s.getId());
        long counted = itemRepo.countBySession_IdAndCountedQtyIsNotNull(s.getId());
        long discrepancies = itemRepo.countDiscrepancies(s.getId());
        return new SessionResponse(
                s.getId(), s.getName(), s.getStatus(), s.getNotes(),
                s.getStartedAt(), s.getCompletedAt(),
                s.getCreatedBy() != null ? s.getCreatedBy().getId() : null,
                s.getCreatedBy() != null ? s.getCreatedBy().getEmail() : null,
                (int) total, (int) counted, (int) discrepancies,
                s.getCreatedAt(), s.getUpdatedAt()
        );
    }

    private CountItemResponse toCountItemResponse(InventoryCountItem i) {
        InventoryProduct p = i.getProduct();
        return new CountItemResponse(
                i.getId(), p.getId(), p.getSku(), p.getName(), p.getBarcode(),
                p.getUnit(), i.getZone(),
                i.getExpectedQty(), i.getCountedQty(), i.getDiscrepancy(),
                i.getCountedBy() != null ? i.getCountedBy().getId() : null,
                i.getCountedBy() != null ? i.getCountedBy().getEmail() : null,
                i.getNotes(), i.getCountedAt()
        );
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
