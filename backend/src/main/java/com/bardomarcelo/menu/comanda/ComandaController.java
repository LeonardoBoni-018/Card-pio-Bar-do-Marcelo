package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.comanda.ComandaDtos.AddItemRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.ComandaResponse;
import com.bardomarcelo.menu.comanda.ComandaDtos.MergeRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.MoveRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.OpenComandaRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.UpdateComandaRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.UpdateItemRequest;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Comandas (garçom e proprietário). Toda resposta de alteração devolve a comanda inteira, já recalculada. */
@RestController
@RequestMapping("/api/pedidos/comandas")
@SecurityRequirement(name = "bearer-jwt")
@ComandasEnabled
public class ComandaController {

    private final ComandaService service;

    public ComandaController(ComandaService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ComandaResponse> open(@Valid @RequestBody OpenComandaRequest request, @AuthenticationPrincipal Jwt jwt) {
        ComandaResponse created = service.open(request, jwt.getSubject());
        return ResponseEntity.created(URI.create("/api/pedidos/comandas/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public ComandaResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PatchMapping("/{id}")
    public ComandaResponse update(@PathVariable Long id, @Valid @RequestBody UpdateComandaRequest request) {
        return service.updateHeader(id, request);
    }

    @PostMapping("/{id}/itens")
    public ComandaResponse addItem(@PathVariable Long id, @Valid @RequestBody AddItemRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.addItem(id, request, jwt.getSubject());
    }

    @PatchMapping("/{id}/itens/{itemId}")
    public ComandaResponse updateItem(@PathVariable Long id, @PathVariable Long itemId, @Valid @RequestBody UpdateItemRequest request) {
        return service.updateItem(id, itemId, request);
    }

    @DeleteMapping("/{id}/itens/{itemId}")
    public ComandaResponse removeItem(@PathVariable Long id, @PathVariable Long itemId) {
        return service.removeItem(id, itemId);
    }

    @PostMapping("/{id}/fechar")
    public ComandaResponse close(@PathVariable Long id, @Valid @RequestBody ComandaDtos.CloseRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.close(id, request, jwt.getSubject());
    }

    @PostMapping("/{id}/descartar")
    public ComandaResponse discard(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return service.discard(id, jwt.getSubject());
    }

    @PostMapping("/{id}/mover")
    public ComandaResponse move(@PathVariable Long id, @Valid @RequestBody MoveRequest request) {
        return service.move(id, request.tableId());
    }

    @PostMapping("/{id}/juntar")
    public ComandaResponse merge(@PathVariable Long id, @Valid @RequestBody MergeRequest request) {
        return service.merge(id, request.fromComandaId());
    }
}
