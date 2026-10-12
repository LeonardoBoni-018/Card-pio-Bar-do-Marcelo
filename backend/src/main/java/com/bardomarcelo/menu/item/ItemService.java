package com.bardomarcelo.menu.item;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.category.CategoryRepository;
import com.bardomarcelo.menu.common.NotFoundException;
import com.bardomarcelo.menu.common.PageResponse;
import com.bardomarcelo.menu.image.ImageStorageService;
import com.bardomarcelo.menu.menu.MenuChangedEvent;
import java.util.Objects;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItemService {

    private final MenuItemRepository items;
    private final CategoryRepository categories;
    private final ImageStorageService images;
    private final ApplicationEventPublisher events;

    public ItemService(MenuItemRepository items, CategoryRepository categories,
                       ImageStorageService images, ApplicationEventPublisher events) {
        this.items = items;
        this.categories = categories;
        this.images = images;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public PageResponse<ItemAdminResponse> search(String query, Long categoryId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("name").ascending().and(Sort.by("id")));
        return PageResponse.of(items.findAll(MenuItemSpecifications.search(query, categoryId), pageable), ItemAdminResponse::from);
    }

    @Transactional(readOnly = true)
    public ItemAdminResponse get(Long id) {
        return ItemAdminResponse.from(find(id));
    }

    @Transactional
    public ItemAdminResponse create(ItemRequest request) {
        Category category = findCategory(request.categoryId());
        requireImage(request.imageFilename());
        MenuItem item = items.save(new MenuItem(request.name().trim(), request.description(), request.price(),
                request.imageFilename(), flag(request.available(), true), flag(request.featured(), false), category));
        events.publishEvent(new MenuChangedEvent());
        return ItemAdminResponse.from(item);
    }

    @Transactional
    public ItemAdminResponse update(Long id, ItemRequest request) {
        MenuItem item = find(id);
        Category category = findCategory(request.categoryId());
        String oldImage = item.getImageFilename();
        if (!Objects.equals(oldImage, request.imageFilename())) {
            requireImage(request.imageFilename());
        }
        item.change(request.name().trim(), request.description(), request.price(), request.imageFilename(),
                flag(request.available(), true), flag(request.featured(), false), category);
        if (oldImage != null && !oldImage.equals(request.imageFilename())) {
            images.deleteAfterCommit(oldImage);
        }
        events.publishEvent(new MenuChangedEvent());
        return ItemAdminResponse.from(item);
    }

    @Transactional
    public ItemAdminResponse setAvailability(Long id, boolean available) {
        MenuItem item = find(id);
        item.setAvailable(available);
        events.publishEvent(new MenuChangedEvent());
        return ItemAdminResponse.from(item);
    }

    @Transactional
    public void delete(Long id) {
        MenuItem item = find(id);
        items.delete(item);
        if (item.getImageFilename() != null) {
            images.deleteAfterCommit(item.getImageFilename());
        }
        events.publishEvent(new MenuChangedEvent());
    }

    private MenuItem find(Long id) {
        return items.findById(id).orElseThrow(() -> new NotFoundException("Item não encontrado."));
    }

    private Category findCategory(Long id) {
        return categories.findById(id).orElseThrow(() -> new NotFoundException("Categoria não encontrada."));
    }

    private void requireImage(String filename) {
        if (filename != null && !images.exists(filename)) {
            throw new NotFoundException("Imagem não encontrada; envie a foto novamente.");
        }
    }

    private static boolean flag(Boolean value, boolean defaultValue) {
        return value == null ? defaultValue : value;
    }
}
