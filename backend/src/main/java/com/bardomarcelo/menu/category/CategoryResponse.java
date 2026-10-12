package com.bardomarcelo.menu.category;

public record CategoryResponse(Long id, String name, int displayOrder) {

    static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDisplayOrder());
    }
}
