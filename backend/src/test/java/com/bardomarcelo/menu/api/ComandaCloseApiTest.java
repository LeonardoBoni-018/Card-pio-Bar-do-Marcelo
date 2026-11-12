package com.bardomarcelo.menu.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.comanda.ComandaService;
import com.bardomarcelo.menu.comanda.DiningTable;
import com.bardomarcelo.menu.item.MenuItem;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@DisplayName("Fechar conta, descartar, reabrir e cancelar comandas")
class ComandaCloseApiTest extends ApiTestSupport {

    private AppUser joao;
    private DiningTable mesa;
    private MenuItem cerveja;

    @BeforeEach
    void data() {
        joao = waiter("joao", "senha123", "João");
        mesa = table("Mesa 1", 1);
        cerveja = item("Brahma", "8.50", category("Cervejas", 1), true, false);
    }

    private ResultActions as(String bearer, MockHttpServletRequestBuilder req, Object body) throws Exception {
        return mvc.perform(req.header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(write(body)));
    }

    private long openWithBeers(int qty) throws Exception {
        String w = waiterBearer(joao);
        long id = json.readTree(as(w, post("/api/pedidos/comandas"), Map.of("tableId", mesa.getId())).andReturn().getResponse().getContentAsString()).get("id").asLong();
        if (qty > 0) as(w, post("/api/pedidos/comandas/{id}/itens", id), Map.of("menuItemId", cerveja.getId(), "quantity", qty)).andExpect(status().isOk());
        return id;
    }

    @Test
    @DisplayName("garçom fecha com desconto e pessoas: total gravado, quem fechou, e a mesa fica livre")
    void close() throws Exception {
        long id = openWithBeers(4); // 34,00
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", id), Map.of("discount", 4, "people", 3))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.subtotal").value(34.00))
                .andExpect(jsonPath("$.discount").value(4))
                .andExpect(jsonPath("$.total").value(30.00))
                .andExpect(jsonPath("$.people").value(3))
                .andExpect(jsonPath("$.closedBy").value("João"))
                .andExpect(jsonPath("$.closedAt").exists());
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", waiterBearer(joao))).andExpect(jsonPath("$[0].comandas", hasSize(0)));
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", id), Map.of()).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("total fechado não muda se o preço do cardápio mudar depois")
    void closedTotalIsFrozen() throws Exception {
        long id = openWithBeers(2);
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", id), Map.of()).andExpect(jsonPath("$.total").value(17.00));
        jdbc.update("UPDATE menu_item SET price = 50 WHERE id = ?", cerveja.getId());
        mvc.perform(get("/api/pedidos/comandas/{id}", id).header("Authorization", bearer())).andExpect(jsonPath("$.total").value(17.00));
    }

    @Test
    @DisplayName("desconto maior que a conta, negativo, ou comanda vazia → recusado")
    void closeValidation() throws Exception {
        long id = openWithBeers(1);
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", id), Map.of("discount", 9)).andExpect(status().isConflict());
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", id), Map.of("discount", -1)).andExpect(status().isBadRequest());
        long empty = openWithBeers(0);
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", empty), Map.of())
                .andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("Comanda sem itens: descarte em vez de fechar."));
    }

    @Test
    @DisplayName("descarta comanda vazia (vira cancelada); com itens não descarta")
    void discard() throws Exception {
        long empty = openWithBeers(0);
        mvc.perform(post("/api/pedidos/comandas/{id}/descartar", empty).header("Authorization", waiterBearer(joao)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELED")).andExpect(jsonPath("$.canceledBy").value("João"));
        long full = openWithBeers(1);
        mvc.perform(post("/api/pedidos/comandas/{id}/descartar", full).header("Authorization", waiterBearer(joao))).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("proprietário reabre conta fechada (volta a aceitar itens); garçom não pode (403)")
    void reopen() throws Exception {
        long id = openWithBeers(1);
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", id), Map.of());
        mvc.perform(post("/api/admin/comandas/{id}/reabrir", id).header("Authorization", waiterBearer(joao))).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/comandas/{id}/reabrir", id).header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.closedBy").doesNotExist())
                .andExpect(jsonPath("$.reopenedCount").value(1));
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/itens", id), Map.of("menuItemId", cerveja.getId(), "quantity", 1)).andExpect(status().isOk());
        mvc.perform(post("/api/admin/comandas/{id}/reabrir", id).header("Authorization", bearer())).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("proprietário cancela (aberta ou fechada) com motivo; cancelada não reabre nem cancela de novo")
    void cancel() throws Exception {
        long id = openWithBeers(1);
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", id), Map.of());
        as(bearer(), post("/api/admin/comandas/{id}/cancelar", id), Map.of("reason", "lançada na mesa errada"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"))
                .andExpect(jsonPath("$.cancelReason").value("lançada na mesa errada"))
                .andExpect(jsonPath("$.canceledBy").value("Proprietário"));
        mvc.perform(post("/api/admin/comandas/{id}/reabrir", id).header("Authorization", bearer())).andExpect(status().isConflict());
        as(bearer(), post("/api/admin/comandas/{id}/cancelar", id), Map.of()).andExpect(status().isConflict());
        as(waiterBearer(joao), post("/api/admin/comandas/{id}/cancelar", openWithBeers(1)), Map.of()).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("lista do proprietário: hoje por padrão, filtro por situação, período inválido → 400")
    void list() throws Exception {
        long a = openWithBeers(1);
        long b = openWithBeers(2);
        as(waiterBearer(joao), post("/api/pedidos/comandas/{id}/fechar", b), Map.of());
        mvc.perform(get("/api/admin/comandas").header("Authorization", bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)));
        mvc.perform(get("/api/admin/comandas?status=CLOSED").header("Authorization", bearer()))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(b))
                .andExpect(jsonPath("$[0].total").value(17.00))
                .andExpect(jsonPath("$[0].closedBy").value("João"))
                .andExpect(jsonPath("$[0].tableName").value("Mesa 1"));
        mvc.perform(get("/api/admin/comandas?status=OPEN").header("Authorization", bearer())).andExpect(jsonPath("$[0].id").value(a));
        mvc.perform(get("/api/admin/comandas?de=2020-01-01&ate=2020-01-02").header("Authorization", bearer())).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/admin/comandas?de=2026-01-10&ate=2026-01-01").header("Authorization", bearer())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/comandas").header("Authorization", waiterBearer(joao))).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("dia do bar vira às 05:00 (madrugada conta no dia anterior)")
    void businessDay() {
        org.assertj.core.api.Assertions.assertThat(ComandaService.businessDay(Instant.parse("2026-11-12T06:30:00Z"))) // 03:30 em SP
                .isEqualTo(LocalDate.of(2026, 11, 11));
        org.assertj.core.api.Assertions.assertThat(ComandaService.businessDay(Instant.parse("2026-11-12T09:00:00Z"))) // 06:00 em SP
                .isEqualTo(LocalDate.of(2026, 11, 12));
    }
}
