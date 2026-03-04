package com.entretienbatiment.backend.workorders.web.admin.dto;

import com.entretienbatiment.backend.workorders.domain.WorkOrderPriority;
import com.entretienbatiment.backend.workorders.domain.WorkOrderStatus;

import java.time.Instant;
import java.time.LocalDate;

import java.util.List;

public record WorkOrderResponse(
        Long id,
        String title,
        String description,
        String location,
        WorkOrderPriority priority,
        WorkOrderStatus status,

        Long createdByUserId,
        String createdByName,
        Long assignedToUserId,
        String assignedToName,

        LocalDate requestedDate,
        LocalDate dueDate,

        Instant createdAt,
        Instant updatedAt,

        String attachmentFilename,
        String attachmentContentType,
        String attachmentDownloadUrl,

        Integer materialsCount,
        List<String> materialsPreview,

        /** Manual ordering index within the status column. NULL means priority-based ordering. */
        Integer sortIndex,

        /** Whether this work order has been archived. */
        boolean archived,

        /** Timestamp when the work order was archived. */
        Instant archivedAt
) {}
