package com.bardomarcelo.menu.category;

import com.bardomarcelo.menu.common.ConflictException;
import com.bardomarcelo.menu.common.NotFoundException;
import com.bardomarcelo.menu.item.MenuItemRepository;
import com.bardomarcelo.menu.menu.MenuChangedEvent;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    private final CategoryRepository categories;
    private final MenuItemRepository items;
    private final ApplicationEventPublisher events;

    public CategoryService(CategoryRepository categories, MenuItemRepository items, ApplicationEventPublisher events) {
        this.categories = categories;
        this.items = items;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return categories.findAllByOrderByDisplayOrderAscNameAsc().stream().map(CategoryResponse::from).toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Já existe uma categoria com esse nome.");
        }
        Category saved = categories.save(new Category(name, orderOf(request)));
        events.publishEvent(new MenuChangedEvent());
        return CategoryResponse.from(saved);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = find(id);
        String name = request.name().trim();
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("Já existe uma categoria com esse nome.");
        }
        category.update(name, orderOf(request));
        events.publishEvent(new MenuChangedEvent());
        return CategoryResponse.from(category);
    }

    @Transactional
    public void delete(Long id) {
        Category category = find(id);
        if (items.existsByCategoryId(id)) {
            throw new ConflictException("A categoria possui itens; mova ou exclua os itens antes.");
        }
        categories.delete(category);
        events.publishEvent(new MenuChangedEvent());
    }

    private Category find(Long id) {
        return categories.findById(id).orElseThrow(() -> new NotFoundException("Categoria não encontrada."));
    }

    private static int orderOf(CategoryRequest request) {
        return request.displayOrder() == null ? 0 : request.displayOrder();
    }
}
