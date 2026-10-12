package com.bardomarcelo.menu.item;

import org.springframework.data.jpa.domain.Specification;

final class MenuItemSpecifications {

    private MenuItemSpecifications() {
    }

    static Specification<MenuItem> search(String query, Long categoryId) {
        return Specification.where(nameContains(query)).and(inCategory(categoryId));
    }

    private static Specification<MenuItem> nameContains(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        String escaped = query.trim().toLowerCase()
                .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        return (root, cq, cb) -> cb.like(cb.lower(root.get("name")), "%" + escaped + "%", '\\');
    }

    private static Specification<MenuItem> inCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return (root, cq, cb) -> cb.equal(root.get("category").get("id"), categoryId);
    }
}
