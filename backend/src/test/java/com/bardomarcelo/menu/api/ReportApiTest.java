package com.bardomarcelo.menu.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.comanda.DiningTable;
import com.bardomarcelo.menu.item.MenuItem;
import com.bardomarcelo.menu.item.PriceUnit;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("Relatórios (/api/admin/relatorios)")
class ReportApiTest extends ApiTestSupport {

    private AppUser joao;
    private AppUser ana;
    private DiningTable mesa1;
    private DiningTable mesa2;
    private MenuItem cerveja;
    private MenuItem panceta;

    @BeforeEach
    void data() {
        joao = waiter("joao", "senha123", "João");
        ana = waiter("ana", "senha123", "Ana");
        mesa1 = table("Mesa 1", 1);
        mesa2 = table("Mesa 2", 2);
        var cat = category("Cervejas", 1);
        cerveja = item("Brahma", "8.50", cat, true, false);
        panceta = items.save(new MenuItem("Panceta", "d", new BigDecimal("70.00"), PriceUnit.KG, null, true, false, cat));
    }

    /** Abre, lança e fecha; depois põe a hora do fechamento (UTC) onde o teste quer. */
    private long closed(AppUser who, DiningTable t, Map<String, Object> item, Map<String, Object> custom, int discount, String closedAtUtc) throws Exception {
        String w = waiterBearer(who);
        long id = json.readTree(mvc.perform(post("/api/pedidos/comandas").header("Authorization", w).contentType(MediaType.APPLICATION_JSON)
                .content(write(Map.of("tableId", t.getId())))).andReturn().getResponse().getContentAsString()).get("id").asLong();
        for (Map<String, Object> body : new Map[] {item, custom}) {
            if (body != null) mvc.perform(post("/api/pedidos/comandas/{id}/itens", id).header("Authorization", w).contentType(MediaType.APPLICATION_JSON).content(write(body)));
        }
        mvc.perform(post("/api/pedidos/comandas/{id}/fechar", id).header("Authorization", w).contentType(MediaType.APPLICATION_JSON)
                .content(write(Map.of("discount", discount)))).andExpect(status().isOk());
        jdbc.update("UPDATE comanda SET closed_at = ? WHERE id = ?", Timestamp.from(Instant.parse(closedAtUtc)), id);
        return id;
    }

    @Test
    @DisplayName("resumo: totais, ticket médio, por dia (vira às 05:00), por garçom, por mesa, mais vendidos e avulsos")
    void summary() throws Exception {
        // 10/11 21:00 SP → dia 10
        closed(joao, mesa1, Map.of("menuItemId", cerveja.getId(), "quantity", 4), Map.of("name", "Gelo", "unitPrice", 5, "quantity", 2), 4, "2026-11-11T00:00:00Z");
        // 11/11 02:00 SP (madrugada) → ainda dia 10
        closed(ana, mesa2, Map.of("menuItemId", panceta.getId(), "quantity", 0.5), null, 0, "2026-11-11T05:00:00Z");
        // 11/11 20:00 SP → dia 11
        closed(joao, mesa2, Map.of("menuItemId", cerveja.getId(), "quantity", 2), null, 0, "2026-11-11T23:00:00Z");
        // fora do período
        closed(ana, mesa1, Map.of("menuItemId", cerveja.getId(), "quantity", 10), null, 0, "2026-11-20T23:00:00Z");

        mvc.perform(get("/api/admin/relatorios?de=2026-11-10&ate=2026-11-11").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.closedCount").value(3))
                .andExpect(jsonPath("$.gross").value(96.00))        // 44 + 35 + 17
                .andExpect(jsonPath("$.discounts").value(4))
                .andExpect(jsonPath("$.total").value(92.00))
                .andExpect(jsonPath("$.averageTicket").value(30.67))
                .andExpect(jsonPath("$.byDay", hasSize(2)))
                .andExpect(jsonPath("$.byDay[0].date").value("2026-11-10"))
                .andExpect(jsonPath("$.byDay[0].count").value(2))
                .andExpect(jsonPath("$.byDay[0].total").value(75.00))
                .andExpect(jsonPath("$.byDay[1].total").value(17.00))
                .andExpect(jsonPath("$.byWaiter[0].name").value("João"))
                .andExpect(jsonPath("$.byWaiter[0].total").value(57.00))
                .andExpect(jsonPath("$.byWaiter[1].name").value("Ana"))
                .andExpect(jsonPath("$.byTable[0].name").value("Mesa 2"))
                .andExpect(jsonPath("$.byTable[0].count").value(2))
                .andExpect(jsonPath("$.topItems[0].name").value("Brahma"))
                .andExpect(jsonPath("$.topItems[0].quantity").value(6))
                .andExpect(jsonPath("$.topItems[0].total").value(51.00))
                .andExpect(jsonPath("$.topItems[1].priceUnit").value("KG"))
                .andExpect(jsonPath("$.topItems[1].quantity").value(0.5))
                .andExpect(jsonPath("$.customItems", hasSize(1)))
                .andExpect(jsonPath("$.customItems[0].name").value("Gelo"))
                .andExpect(jsonPath("$.customItems[0].total").value(10.00));
    }

    @Test
    @DisplayName("canceladas e abertas não entram nas vendas; canceladas aparecem à parte")
    void canceledSeparate() throws Exception {
        long id = closed(joao, mesa1, Map.of("menuItemId", cerveja.getId(), "quantity", 2), null, 0, "2026-11-11T23:00:00Z");
        mvc.perform(post("/api/admin/comandas/{id}/cancelar", id).header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON).content("{}"));
        jdbc.update("UPDATE comanda SET canceled_at = ? WHERE id = ?", Timestamp.from(Instant.parse("2026-11-11T23:30:00Z")), id);
        mvc.perform(get("/api/admin/relatorios?de=2026-11-11").header("Authorization", bearer()))
                .andExpect(jsonPath("$.closedCount").value(0))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.averageTicket").value(0))
                .andExpect(jsonPath("$.canceledCount").value(1))
                .andExpect(jsonPath("$.canceledValue").value(17.00));
    }

    @Test
    @DisplayName("planilha CSV: ; como separador, vírgula decimal, BOM e proteção contra fórmula")
    void csv() throws Exception {
        long id = closed(joao, mesa1, Map.of("menuItemId", cerveja.getId(), "quantity", 4), null, 4, "2026-11-11T23:00:00Z");
        jdbc.update("UPDATE comanda SET label = '=SOMA(1;2)' WHERE id = ?", id);
        byte[] body = mvc.perform(get("/api/admin/relatorios/planilha?de=2026-11-11").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"vendas-2026-11-11.csv\""))
                .andReturn().getResponse().getContentAsByteArray();
        String csv = new String(body, StandardCharsets.UTF_8);
        assertThat(csv).startsWith("﻿Comanda;Dia;");
        assertThat(csv).contains(id + ";11/11/2026;11/11/2026 20:00;Mesa 1;\"'=SOMA(1;2)\";João;João;;1;34,00;4,00;30,00");
    }

    @Test
    @DisplayName("período inválido → 400; garçom → 403")
    void access() throws Exception {
        mvc.perform(get("/api/admin/relatorios?de=2026-11-11&ate=2026-11-01").header("Authorization", bearer())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/relatorios?de=2024-01-01&ate=2026-01-01").header("Authorization", bearer())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/relatorios").header("Authorization", waiterBearer(joao))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/relatorios").header("Authorization", bearer())).andExpect(status().isOk()).andExpect(jsonPath("$.byDay", hasSize(1)));
    }
}
