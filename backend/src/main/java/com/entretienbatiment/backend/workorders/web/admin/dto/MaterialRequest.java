package com.entretienbatiment.backend.workorders.web.admin.dto;

public record MaterialRequest(
    String name,
    Integer quantity,
    String url,
    String description
) {}
