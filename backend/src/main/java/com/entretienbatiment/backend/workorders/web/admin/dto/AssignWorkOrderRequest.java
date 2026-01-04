package com.entretienbatiment.backend.workorders.web.admin.dto;

import jakarta.validation.constraints.NotNull;

public record AssignWorkOrderRequest(
        @NotNull Long techUserId
) {}