package com.bardomarcelo.menu.menu;

import com.bardomarcelo.menu.item.MenuItem;
import java.math.BigDecimal;

/** Visão pública de um item: só o que o cliente precisa ver. */
public record PublicItemResponse(Long id, String name, String description, BigDecimal price, String imageUrl, boolean featured) {

    public static PublicItemResponse from(MenuItem i) {
        return new PublicItemResponse(i.getId(), i.getName(), i.getDescription(), i.getPrice(), i.imageUrl(), i.isFeatured());
    }
}
