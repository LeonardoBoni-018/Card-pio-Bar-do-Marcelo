package com.bardomarcelo.menu.item;

import java.math.BigDecimal;
import java.time.Instant;

public record ItemAdminResponse(Long id, String name, String description, BigDecimal price,
                                String imageFilename, String imageUrl, boolean available, boolean featured,
                                Long categoryId, String categoryName, Instant updatedAt) {

    static ItemAdminResponse from(MenuItem i) {
        return new ItemAdminResponse(i.getId(), i.getName(), i.getDescription(), i.getPrice(),
                i.getImageFilename(), i.imageUrl(), i.isAvailable(), i.isFeatured(),
                i.getCategory().getId(), i.getCategory().getName(), i.getUpdatedAt());
    }
}
