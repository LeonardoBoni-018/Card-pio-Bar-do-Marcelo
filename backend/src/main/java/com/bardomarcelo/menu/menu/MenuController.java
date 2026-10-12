package com.bardomarcelo.menu.menu;

import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints públicos (somente leitura) consumidos pela página do cliente. */
@RestController
@RequestMapping("/api")
public class MenuController {

    /** Sempre revalida (ETag → 304 sem corpo): o cliente nunca vê um cardápio defasado depois que o dono edita. */
    private static final CacheControl REVALIDATE = CacheControl.noCache().cachePublic();

    private final MenuService service;

    public MenuController(MenuService service) {
        this.service = service;
    }

    @GetMapping("/menu")
    public ResponseEntity<List<MenuCategoryResponse>> menu() {
        return ResponseEntity.ok().cacheControl(REVALIDATE).body(service.getMenu());
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<PublicItemResponse> item(@PathVariable Long id) {
        return ResponseEntity.ok().cacheControl(REVALIDATE).body(service.getItem(id));
    }
}
