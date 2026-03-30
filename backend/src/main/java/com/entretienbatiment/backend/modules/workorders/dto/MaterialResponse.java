package com.entretienbatiment.backend.modules.workorders.dto;

public record MaterialResponse(
    Long id,
    String name,
    Integer quantity,
    boolean bought,
    String url,
    String description,
    String supplier
) {}
