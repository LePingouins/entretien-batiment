package com.entretienbatiment.backend.workorders.web.admin.dto;

public record MaterialResponse(
    Long id,
    String name,
    Integer quantity,
    boolean bought,
    String url,
    String description
) {}
