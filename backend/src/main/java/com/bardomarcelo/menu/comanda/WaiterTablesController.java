package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.comanda.ComandaDtos.ServiceMenuCategory;
import com.bardomarcelo.menu.comanda.ComandaDtos.TableOverview;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Área do garçom: mesas com as comandas abertas e o cardápio para lançar. */
@RestController
@RequestMapping("/api/pedidos")
@SecurityRequirement(name = "bearer-jwt")
@ComandasEnabled
public class WaiterTablesController {

    private final ComandaService service;

    public WaiterTablesController(ComandaService service) {
        this.service = service;
    }

    @GetMapping("/mesas")
    public List<TableOverview> tables() {
        return service.overview();
    }

    @GetMapping("/cardapio")
    public List<ServiceMenuCategory> menu() {
        return service.serviceMenu();
    }
}
