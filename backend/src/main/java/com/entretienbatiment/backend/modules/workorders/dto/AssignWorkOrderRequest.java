package com.entretienbatiment.backend.modules.workorders.dto;

import jakarta.validation.constraints.NotNull;

public record AssignWorkOrderRequest(
        @NotNull Long techUserId
) {}