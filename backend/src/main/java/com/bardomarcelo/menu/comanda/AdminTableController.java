package com.bardomarcelo.menu.comanda;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Cadastro de mesas pelo proprietário. */
@RestController
@RequestMapping("/api/admin/mesas")
@SecurityRequirement(name = "bearer-jwt")
@ComandasEnabled
public class AdminTableController {

    private final DiningTableService service;

    public AdminTableController(DiningTableService service) {
        this.service = service;
    }

    @GetMapping
    public List<TableResponse> list() {
        return service.list();
    }

    @PostMapping
    public ResponseEntity<TableResponse> create(@Valid @RequestBody TableRequest request) {
        TableResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/admin/mesas/" + created.id())).body(created);
    }

    @PostMapping("/lote")
    @ResponseStatus(HttpStatus.CREATED)
    public List<TableResponse> createBatch(@Valid @RequestBody TableBatchRequest request) {
        return service.createBatch(request);
    }

    @PutMapping("/{id}")
    public TableResponse update(@PathVariable Long id, @Valid @RequestBody TableRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
