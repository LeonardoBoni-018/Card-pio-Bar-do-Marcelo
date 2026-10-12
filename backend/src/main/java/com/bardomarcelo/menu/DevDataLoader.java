package com.bardomarcelo.menu;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.category.CategoryRepository;
import com.bardomarcelo.menu.item.MenuItem;
import com.bardomarcelo.menu.item.MenuItemRepository;
import java.math.BigDecimal;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Dados de exemplo (apenas no perfil dev) para desenvolver o front sem cadastrar tudo à mão. */
@Component
@Profile("dev")
class DevDataLoader implements ApplicationRunner {

    private final CategoryRepository categories;
    private final MenuItemRepository items;

    DevDataLoader(CategoryRepository categories, MenuItemRepository items) {
        this.categories = categories;
        this.items = items;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (categories.count() > 0) {
            return;
        }
        Category beers = categories.save(new Category("Cervejas", 1));
        Category snacks = categories.save(new Category("Porções", 2));
        Category drinks = categories.save(new Category("Bebidas", 3));
        add("Cerveja Long Neck", "Bem gelada · 355 ml", "9.00", true, beers);
        add("Cerveja 600 ml", "Pilsen · garrafa", "14.00", false, beers);
        add("Chopp", "Copo 300 ml", "8.50", false, beers);
        add("Batata Frita", "Porção crocante com cheddar e bacon", "32.00", true, snacks);
        add("Calabresa Acebolada", "Calabresa fatiada com cebola e pão", "36.00", false, snacks);
        add("Frango à Passarinho", "Frito na hora · serve 3 pessoas", "42.00", false, snacks);
        add("Refrigerante Lata", "Coca, Guaraná ou Fanta", "6.00", false, drinks);
        add("Suco Natural", "Laranja, limão ou maracujá", "8.00", false, drinks);
    }

    private void add(String name, String description, String price, boolean featured, Category category) {
        items.save(new MenuItem(name, description, new BigDecimal(price), null, true, featured, category));
    }
}
