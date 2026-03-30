package com.entretienbatiment.backend.modules.workorders.dto;

public record MaterialRequest(
    String name,
    Integer quantity,
    String url,
    String description,
    String supplier
) {}
