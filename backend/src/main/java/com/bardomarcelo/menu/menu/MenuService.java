package com.bardomarcelo.menu.menu;

import com.bardomarcelo.menu.common.NotFoundException;
import com.bardomarcelo.menu.item.MenuItem;
import com.bardomarcelo.menu.item.MenuItemRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MenuService {

    public static final String CACHE = "menu";

    private final MenuItemRepository items;

    public MenuService(MenuItemRepository items) {
        this.items = items;
    }

    /** Cardápio agrupado por categoria; resultado em cache até alguma escrita do admin. */
    @Cacheable(CACHE)
    @Transactional(readOnly = true)
    public List<MenuCategoryResponse> getMenu() {
        Map<Long, List<PublicItemResponse>> byCategory = new LinkedHashMap<>();
        Map<Long, String> names = new LinkedHashMap<>();
        for (MenuItem item : items.findAvailableForMenu()) {
            Long categoryId = item.getCategory().getId();
            names.putIfAbsent(categoryId, item.getCategory().getName());
            byCategory.computeIfAbsent(categoryId, k -> new ArrayList<>()).add(PublicItemResponse.from(item));
        }
        return byCategory.entrySet().stream()
                .map(e -> new MenuCategoryResponse(e.getKey(), names.get(e.getKey()), List.copyOf(e.getValue())))
                .toList();
    }

    @Transactional(readOnly = true)
    public PublicItemResponse getItem(Long id) {
        return items.findById(id)
                .filter(MenuItem::isAvailable)
                .map(PublicItemResponse::from)
                .orElseThrow(() -> new NotFoundException("Item não encontrado."));
    }
}
