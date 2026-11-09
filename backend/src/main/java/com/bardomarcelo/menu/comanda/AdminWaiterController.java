package com.bardomarcelo.menu.comanda;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Cadastro de garçons pelo proprietário (sem exclusão: desative para cortar o acesso). */
@RestController
@RequestMapping("/api/admin/garcons")
@SecurityRequirement(name = "bearer-jwt")
@ComandasEnabled
public class AdminWaiterController {

    private final WaiterService service;

    public AdminWaiterController(WaiterService service) {
        this.service = service;
    }

    @GetMapping
    public List<WaiterResponse> list() {
        return service.list();
    }

    @PostMapping
    public ResponseEntity<WaiterResponse> create(@Valid @RequestBody WaiterRequest request) {
        WaiterResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/admin/garcons/" + created.id())).body(created);
    }

    @PutMapping("/{id}")
    public WaiterResponse update(@PathVariable Long id, @Valid @RequestBody WaiterRequest request) {
        return service.update(id, request);
    }
}
