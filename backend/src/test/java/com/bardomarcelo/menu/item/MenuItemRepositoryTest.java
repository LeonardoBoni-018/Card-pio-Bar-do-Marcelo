package com.bardomarcelo.menu.item;

import static org.assertj.core.api.Assertions.assertThat;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.category.CategoryRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("MenuItemRepository (schema Flyway + queries)")
class MenuItemRepositoryTest {

    @Autowired MenuItemRepository items;
    @Autowired CategoryRepository categories;

    private MenuItem save(String name, Category c, boolean available, boolean featured) {
        return items.save(new MenuItem(name, "", new BigDecimal("10.00"), null, available, featured, c));
    }

    @Test
    @DisplayName("findAvailableForMenu ordena por categoria, destaque e nome, e ignora indisponíveis")
    void availableForMenu() {
        Category b = categories.save(new Category("B", 2));
        Category a = categories.save(new Category("A", 1));
        save("zeta", a, true, false);
        save("beta", a, true, true);
        save("alfa", a, true, false);
        save("hidden", a, false, false);
        save("outro", b, true, false);

        List<MenuItem> result = items.findAvailableForMenu();

        assertThat(result).extracting(MenuItem::getName).containsExactly("beta", "alfa", "zeta", "outro");
    }

    @Test
    @DisplayName("busca por nome é case-insensitive e combina com categoria")
    void searchByNameAndCategory() {
        Category a = categories.save(new Category("A", 1));
        Category b = categories.save(new Category("B", 2));
        save("Chopp Claro", a, true, false);
        save("Chopp Escuro", b, true, false);
        save("Suco", a, true, false);

        var byName = items.findAll(MenuItemSpecifications.search("CHOPP", null), PageRequest.of(0, 10));
        var both = items.findAll(MenuItemSpecifications.search("chopp", a.getId()), PageRequest.of(0, 10));
        var all = items.findAll(MenuItemSpecifications.search("  ", null), PageRequest.of(0, 10));

        assertThat(byName.getTotalElements()).isEqualTo(2);
        assertThat(both.getContent()).extracting(MenuItem::getName).containsExactly("Chopp Claro");
        assertThat(all.getTotalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("existsByCategoryId e timestamps automáticos")
    void existsAndTimestamps() {
        Category a = categories.save(new Category("A", 1));
        Category empty = categories.save(new Category("Vazia", 2));
        MenuItem saved = save("Chopp", a, true, false);

        assertThat(items.existsByCategoryId(a.getId())).isTrue();
        assertThat(items.existsByCategoryId(empty.getId())).isFalse();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }
}
