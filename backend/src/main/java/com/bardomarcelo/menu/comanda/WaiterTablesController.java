package com.bardomarcelo.menu.comanda;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Área do garçom: mesas ativas (na etapa 2 passa a trazer as comandas abertas de cada uma). */
@RestController
@RequestMapping("/api/pedidos/mesas")
@SecurityRequirement(name = "bearer-jwt")
@ComandasEnabled
public class WaiterTablesController {

    private final DiningTableService service;

    public WaiterTablesController(DiningTableService service) {
        this.service = service;
    }

    @GetMapping
    public List<TableResponse> list() {
        return service.listActive();
    }
}
