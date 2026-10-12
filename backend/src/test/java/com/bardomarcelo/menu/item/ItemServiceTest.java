package com.bardomarcelo.menu.item;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.category.CategoryRepository;
import com.bardomarcelo.menu.common.NotFoundException;
import com.bardomarcelo.menu.image.ImageStorageService;
import com.bardomarcelo.menu.menu.MenuChangedEvent;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
@DisplayName("ItemService")
class ItemServiceTest {

    private static final String OLD_IMG = "11111111-1111-1111-1111-111111111111.jpg";
    private static final String NEW_IMG = "22222222-2222-2222-2222-222222222222.jpg";

    @Mock MenuItemRepository items;
    @Mock CategoryRepository categories;
    @Mock ImageStorageService images;
    @Mock ApplicationEventPublisher events;
    @InjectMocks ItemService service;

    private final Category beers = new Category("Cervejas", 1);

    private ItemRequest request(String image) {
        return new ItemRequest(" Chopp ", null, new BigDecimal("8.50"), 1L, image, null, null);
    }

    @Test
    @DisplayName("create: aplica padrões, remove espaços do nome e invalida o cache")
    void createAppliesDefaults() {
        when(categories.findById(1L)).thenReturn(Optional.of(beers));
        when(items.save(any(MenuItem.class))).thenAnswer(inv -> inv.getArgument(0));

        ItemAdminResponse response = service.create(request(null));

        assertThat(response.name()).isEqualTo("Chopp");
        assertThat(response.description()).isEmpty();
        assertThat(response.available()).isTrue();
        assertThat(response.featured()).isFalse();
        verify(events).publishEvent(any(MenuChangedEvent.class));
    }

    @Test
    @DisplayName("create: categoria inexistente → NotFound e nada é salvo")
    void createUnknownCategory() {
        when(categories.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(request(null))).isInstanceOf(NotFoundException.class);
        verify(items, never()).save(any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    @DisplayName("create: imagem que não existe no storage → NotFound")
    void createMissingImage() {
        when(categories.findById(1L)).thenReturn(Optional.of(beers));
        when(images.exists(NEW_IMG)).thenReturn(false);
        assertThatThrownBy(() -> service.create(request(NEW_IMG))).isInstanceOf(NotFoundException.class);
        verify(items, never()).save(any());
    }

    @Test
    @DisplayName("update: trocar a imagem agenda a remoção da antiga")
    void updateReplacesImage() {
        MenuItem existing = new MenuItem("Chopp", "", new BigDecimal("8.50"), OLD_IMG, true, false, beers);
        when(items.findById(5L)).thenReturn(Optional.of(existing));
        when(categories.findById(1L)).thenReturn(Optional.of(beers));
        when(images.exists(NEW_IMG)).thenReturn(true);

        service.update(5L, request(NEW_IMG));

        verify(images).deleteAfterCommit(OLD_IMG);
        assertThat(existing.getImageFilename()).isEqualTo(NEW_IMG);
    }

    @Test
    @DisplayName("update: manter a mesma imagem não toca no arquivo nem revalida")
    void updateKeepsImage() {
        MenuItem existing = new MenuItem("Chopp", "", new BigDecimal("8.50"), OLD_IMG, true, false, beers);
        when(items.findById(5L)).thenReturn(Optional.of(existing));
        when(categories.findById(1L)).thenReturn(Optional.of(beers));

        service.update(5L, request(OLD_IMG));

        verify(images, never()).exists(any());
        verify(images, never()).deleteAfterCommit(any());
    }

    @Test
    @DisplayName("update: remover a foto (null) apaga o arquivo antigo")
    void updateRemovesImage() {
        MenuItem existing = new MenuItem("Chopp", "", new BigDecimal("8.50"), OLD_IMG, true, false, beers);
        when(items.findById(5L)).thenReturn(Optional.of(existing));
        when(categories.findById(1L)).thenReturn(Optional.of(beers));

        service.update(5L, request(null));

        verify(images).deleteAfterCommit(OLD_IMG);
        assertThat(existing.getImageFilename()).isNull();
    }

    @Test
    @DisplayName("delete: remove o item, agenda a remoção da foto e invalida o cache")
    void deleteRemovesImage() {
        MenuItem existing = new MenuItem("Chopp", "", new BigDecimal("8.50"), OLD_IMG, true, false, beers);
        when(items.findById(5L)).thenReturn(Optional.of(existing));

        service.delete(5L);

        verify(items).delete(existing);
        verify(images).deleteAfterCommit(OLD_IMG);
        verify(events).publishEvent(any(MenuChangedEvent.class));
    }

    @Test
    @DisplayName("delete: item sem foto não mexe no storage")
    void deleteWithoutImage() {
        MenuItem existing = new MenuItem("Chopp", "", new BigDecimal("8.50"), null, true, false, beers);
        when(items.findById(5L)).thenReturn(Optional.of(existing));

        service.delete(5L);

        verify(images, never()).deleteAfterCommit(any());
    }

    @Test
    @DisplayName("setAvailability: item inexistente → NotFound")
    void availabilityNotFound() {
        when(items.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.setAvailability(9L, false)).isInstanceOf(NotFoundException.class);
    }
}
