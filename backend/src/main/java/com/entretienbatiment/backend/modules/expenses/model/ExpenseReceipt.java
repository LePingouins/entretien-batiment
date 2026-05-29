package com.entretienbatiment.backend.modules.expenses.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "expense_receipt")
public class ExpenseReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonBackReference
    private Expense expense;

    @Column(nullable = false)
    private String filename;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "original_name", length = 512)
    private String originalName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Expense getExpense() { return expense; }
    public void setExpense(Expense expense) { this.expense = expense; }
    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
