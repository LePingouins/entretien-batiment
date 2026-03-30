package com.entretienbatiment.backend.modules.workorders.service;

import com.entretienbatiment.backend.modules.workorders.model.WorkOrderStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class WorkOrderStatusRules {

    private WorkOrderStatusRules() {}

    public static void requireNotTerminal(WorkOrderStatus current) {
        if (current == WorkOrderStatus.COMPLETED || current == WorkOrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot change status from " + current);
        }
    }

    // ADMIN: OPEN/ASSIGNED/IN_PROGRESS -> CANCELLED
    public static void validateAdminCancel(WorkOrderStatus current) {
        if (current == WorkOrderStatus.COMPLETED || current == WorkOrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "cannot cancel from " + current);
        }
        // OPEN/ASSIGNED/IN_PROGRESS allowed
    }

    // TECH:
    // ASSIGNED -> IN_PROGRESS
    // IN_PROGRESS -> COMPLETED
    public static void validateTechUpdate(WorkOrderStatus current, WorkOrderStatus next) {
        requireNotTerminal(current);

        boolean allowed =
                (current == WorkOrderStatus.ASSIGNED && next == WorkOrderStatus.IN_PROGRESS)
                        || (current == WorkOrderStatus.IN_PROGRESS && next == WorkOrderStatus.COMPLETED);

        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "invalid status transition: " + current + " -> " + next);
        }
    }

    // ADMIN assign rule (optional, but recommended):
    // only OPEN can be assigned
    public static void validateAdminAssign(WorkOrderStatus current) {
        requireNotTerminal(current);
        if (current != WorkOrderStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "can only assign OPEN work orders");
        }
    }
}
