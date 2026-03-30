package com.entretienbatiment.backend.modules.urgentworkorders.dto;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public class UrgentWorkOrderMultipartRequest {
    private String title;
    private String description;
    private String location;
    private String dueDate;
    private String priority;
    private String status;
    private String assignedToUserId;
    private Boolean removeAttachment;
    private List<MultipartFile> files;
    private List<MultipartFile> invoiceFiles;
    private Boolean removeInvoice;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(String assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public Boolean getRemoveAttachment() {
        return removeAttachment;
    }

    public void setRemoveAttachment(Boolean removeAttachment) {
        this.removeAttachment = removeAttachment;
    }

    public List<MultipartFile> getFiles() {
        return files;
    }

    public void setFiles(List<MultipartFile> files) {
        this.files = files;
    }

    public List<MultipartFile> getInvoiceFiles() {
        return invoiceFiles;
    }

    public void setInvoiceFiles(List<MultipartFile> invoiceFiles) {
        this.invoiceFiles = invoiceFiles;
    }

    public Boolean getRemoveInvoice() {
        return removeInvoice;
    }

    public void setRemoveInvoice(Boolean removeInvoice) {
        this.removeInvoice = removeInvoice;
    }
}
