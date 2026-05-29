package com.entretienbatiment.backend.modules.expenses.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "expense")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDate date;

    private String supplier;
    private String description;
    private String province;

    @Column(name = "imputation_code")
    private String imputationCode;

    @Column(name = "subtotal_cents") private Long subtotalCents;
    @Column(name = "tps_cents")      private Long tpsCents;
    @Column(name = "tvq_cents")      private Long tvqCents;
    @Column(name = "tvh_cents")      private Long tvhCents;
    @Column(name = "tip_cents")      private Long tipCents;
    @Column(name = "total_cents")    private Long totalCents;

    @Column(nullable = false, length = 16)
    private String status = "PENDING"; // PENDING | APPROVED | REJECTED

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approval_note", length = 512)
    private String approvalNote;

    @Column(name = "ocr_processed_at")
    private LocalDateTime ocrProcessedAt;

    @Column(name = "ocr_raw_text", columnDefinition = "TEXT")
    private String ocrRawText;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<ExpenseReceipt> receipts = new ArrayList<>();

    @PreUpdate
    public void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    // ── Getters / setters ───────────────────────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }
    public String getImputationCode() { return imputationCode; }
    public void setImputationCode(String imputationCode) { this.imputationCode = imputationCode; }
    public Long getSubtotalCents() { return subtotalCents; }
    public void setSubtotalCents(Long subtotalCents) { this.subtotalCents = subtotalCents; }
    public Long getTpsCents() { return tpsCents; }
    public void setTpsCents(Long tpsCents) { this.tpsCents = tpsCents; }
    public Long getTvqCents() { return tvqCents; }
    public void setTvqCents(Long tvqCents) { this.tvqCents = tvqCents; }
    public Long getTvhCents() { return tvhCents; }
    public void setTvhCents(Long tvhCents) { this.tvhCents = tvhCents; }
    public Long getTipCents() { return tipCents; }
    public void setTipCents(Long tipCents) { this.tipCents = tipCents; }
    public Long getTotalCents() { return totalCents; }
    public void setTotalCents(Long totalCents) { this.totalCents = totalCents; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getApprovedByUserId() { return approvedByUserId; }
    public void setApprovedByUserId(Long approvedByUserId) { this.approvedByUserId = approvedByUserId; }
    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }
    public String getApprovalNote() { return approvalNote; }
    public void setApprovalNote(String approvalNote) { this.approvalNote = approvalNote; }
    public LocalDateTime getOcrProcessedAt() { return ocrProcessedAt; }
    public void setOcrProcessedAt(LocalDateTime ocrProcessedAt) { this.ocrProcessedAt = ocrProcessedAt; }
    public String getOcrRawText() { return ocrRawText; }
    public void setOcrRawText(String ocrRawText) { this.ocrRawText = ocrRawText; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<ExpenseReceipt> getReceipts() { return receipts; }
    public void setReceipts(List<ExpenseReceipt> receipts) { this.receipts = receipts; }
}
