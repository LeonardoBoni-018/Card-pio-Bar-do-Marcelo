package com.bardomarcelo.menu.item;

import com.bardomarcelo.menu.common.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/items")
@SecurityRequirement(name = "bearer-jwt")
public class AdminItemController {

    private final ItemService service;

    public AdminItemController(ItemService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ItemAdminResponse> search(@RequestParam(required = false) String q,
                                                  @RequestParam(required = false) Long categoryId,
                                                  @RequestParam(defaultValue = "0") @Min(0) int page,
                                                  @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.search(q, categoryId, page, size);
    }

    @GetMapping("/{id}")
    public ItemAdminResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<ItemAdminResponse> create(@Valid @RequestBody ItemRequest request) {
        ItemAdminResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/admin/items/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public ItemAdminResponse update(@PathVariable Long id, @Valid @RequestBody ItemRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/availability")
    public ItemAdminResponse setAvailability(@PathVariable Long id, @Valid @RequestBody AvailabilityRequest request) {
        return service.setAvailability(id, request.available());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
