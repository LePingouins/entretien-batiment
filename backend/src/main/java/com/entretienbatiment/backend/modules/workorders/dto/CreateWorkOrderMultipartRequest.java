package com.entretienbatiment.backend.modules.workorders.dto;

import com.entretienbatiment.backend.modules.workorders.model.WorkOrderPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

public class CreateWorkOrderMultipartRequest {
    @NotBlank
    @Size(max = 140)
    private String title;

    @Size(max = 4000)
    private String description;

    @Size(max = 200)
    private String location;

    private WorkOrderPriority priority;
    private LocalDate requestedDate;
    private LocalDate dueDate;
    private Long assignedToUserId;

    private List<MultipartFile> files;
    private List<MultipartFile> invoiceFiles;

    // Getters and setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public WorkOrderPriority getPriority() { return priority; }
    public void setPriority(WorkOrderPriority priority) { this.priority = priority; }
    public LocalDate getRequestedDate() { return requestedDate; }
    public void setRequestedDate(LocalDate requestedDate) { this.requestedDate = requestedDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public Long getAssignedToUserId() { return assignedToUserId; }
    public void setAssignedToUserId(Long assignedToUserId) { this.assignedToUserId = assignedToUserId; }
    public List<MultipartFile> getFiles() { return files; }
    public void setFiles(List<MultipartFile> files) { this.files = files; }
    public List<MultipartFile> getInvoiceFiles() { return invoiceFiles; }
    public void setInvoiceFiles(List<MultipartFile> invoiceFiles) { this.invoiceFiles = invoiceFiles; }
}
