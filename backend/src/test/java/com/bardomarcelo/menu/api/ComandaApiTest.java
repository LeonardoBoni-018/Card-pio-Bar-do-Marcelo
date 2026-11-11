package com.bardomarcelo.menu.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.comanda.DiningTable;
import com.bardomarcelo.menu.item.MenuItem;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@DisplayName("Comandas (/api/pedidos/comandas)")
class ComandaApiTest extends ApiTestSupport {

    private AppUser joao;
    private AppUser ana;
    private DiningTable mesa1;
    private DiningTable mesa2;
    private MenuItem cerveja;
    private MenuItem panceta;

    @BeforeEach
    void setUpData() {
        joao = waiter("joao", "senha123", "João");
        ana = waiter("ana", "senha123", "Ana");
        mesa1 = table("Mesa 1", 1);
        mesa2 = table("Mesa 2", 2);
        Category cervejas = category("Cervejas", 1);
        Category porcoes = category("Porções", 2);
        cerveja = item("Brahma 600ml", "8.50", cervejas, true, false);
        panceta = items.save(new MenuItem("Panceta", "desc", new BigDecimal("70.00"), com.bardomarcelo.menu.item.PriceUnit.KG, null, true, false, porcoes));
    }

    private ResultActions send(MockHttpServletRequestBuilder req, AppUser who, Object body) throws Exception {
        return mvc.perform(req.header("Authorization", waiterBearer(who)).contentType(MediaType.APPLICATION_JSON).content(write(body)));
    }

    private JsonNode open(DiningTable t, AppUser who, String label) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("tableId", t.getId()));
        if (label != null) body.put("label", label);
        return json.readTree(send(post("/api/pedidos/comandas"), who, body).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private ResultActions add(long comandaId, AppUser who, Map<String, Object> body) throws Exception {
        return send(post("/api/pedidos/comandas/{id}/itens", comandaId), who, body);
    }

    @Test
    @DisplayName("abre comanda numa mesa ativa: aberta, sem itens, total zero, com quem abriu")
    void openComanda() throws Exception {
        send(post("/api/pedidos/comandas"), joao, Map.of("tableId", mesa1.getId(), "label", "  João  da janela ", "people", 2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.tableName").value("Mesa 1"))
                .andExpect(jsonPath("$.label").value("João da janela"))
                .andExpect(jsonPath("$.people").value(2))
                .andExpect(jsonPath("$.openedBy").value("João"))
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    @DisplayName("mesa desativada ou inexistente não abre comanda (409/404)")
    void openOnInvalidTable() throws Exception {
        mesa2.update("Mesa 2", 2, false);
        tables.save(mesa2);
        send(post("/api/pedidos/comandas"), joao, Map.of("tableId", mesa2.getId())).andExpect(status().isConflict());
        send(post("/api/pedidos/comandas"), joao, Map.of("tableId", 999999)).andExpect(status().isNotFound());
        send(post("/api/pedidos/comandas"), joao, Map.of()).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("várias comandas na mesma mesa; a tela de mesas mostra cada uma com o total")
    void severalPerTable() throws Exception {
        long a = open(mesa1, joao, "João").get("id").asLong();
        open(mesa1, ana, "Maria");
        add(a, joao, Map.of("menuItemId", cerveja.getId(), "quantity", 3)).andExpect(status().isOk());

        mvc.perform(get("/api/pedidos/mesas").header("Authorization", waiterBearer(ana)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Mesa 1"))
                .andExpect(jsonPath("$[0].comandas", hasSize(2)))
                .andExpect(jsonPath("$[0].openTotal").value(25.50))
                .andExpect(jsonPath("$[0].comandas[0].label").value("João"))
                .andExpect(jsonPath("$[0].comandas[0].itemCount").value(1))
                .andExpect(jsonPath("$[1].comandas", hasSize(0)));
    }

    @Test
    @DisplayName("lança item do cardápio copiando nome e preço; mudar o preço depois não altera a comanda")
    void addMenuItemCopiesPrice() throws Exception {
        long id = open(mesa1, joao, null).get("id").asLong();
        add(id, ana, Map.of("menuItemId", cerveja.getId(), "quantity", 2, "note", " bem gelada "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Brahma 600ml"))
                .andExpect(jsonPath("$.items[0].unitPrice").value(8.50))
                .andExpect(jsonPath("$.items[0].lineTotal").value(17.00))
                .andExpect(jsonPath("$.items[0].note").value("bem gelada"))
                .andExpect(jsonPath("$.items[0].addedBy").value("Ana"))
                .andExpect(jsonPath("$.items[0].custom").value(false))
                .andExpect(jsonPath("$.total").value(17.00));

        jdbc.update("UPDATE menu_item SET price = 99 WHERE id = ?", cerveja.getId());
        mvc.perform(get("/api/pedidos/comandas/{id}", id).header("Authorization", waiterBearer(joao)))
                .andExpect(jsonPath("$.items[0].unitPrice").value(8.50))
                .andExpect(jsonPath("$.total").value(17.00));
    }

    @Test
    @DisplayName("item indisponível não pode ser lançado (409); cardápio do garçom mostra com available=false")
    void unavailableItem() throws Exception {
        MenuItem acabou = item("Heineken", "13.00", cerveja.getCategory(), false, false);
        long id = open(mesa1, joao, null).get("id").asLong();
        add(id, joao, Map.of("menuItemId", acabou.getId(), "quantity", 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("“Heineken” está indisponível no momento."));
        add(id, joao, Map.of("menuItemId", 999999, "quantity", 1)).andExpect(status().isNotFound());

        mvc.perform(get("/api/pedidos/cardapio").header("Authorization", waiterBearer(joao)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Cervejas"))
                .andExpect(jsonPath("$[0].items[0].name").value("Brahma 600ml"))
                .andExpect(jsonPath("$[0].items[1].name").value("Heineken"))
                .andExpect(jsonPath("$[0].items[1].available").value(false))
                .andExpect(jsonPath("$[1].items[0].priceUnit").value("KG"));
    }

    @Test
    @DisplayName("item por kg aceita gramas e arredonda aos centavos; por unidade exige número inteiro")
    void quantities() throws Exception {
        long id = open(mesa1, joao, null).get("id").asLong();
        add(id, joao, Map.of("menuItemId", panceta.getId(), "quantity", 0.355))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].quantity").value(0.355))
                .andExpect(jsonPath("$.items[0].lineTotal").value(24.85)); // 70 × 0,355 = 24,85
        add(id, joao, Map.of("menuItemId", cerveja.getId(), "quantity", 1.5)).andExpect(status().isBadRequest());
        add(id, joao, Map.of("menuItemId", cerveja.getId(), "quantity", 0)).andExpect(status().isBadRequest());
        add(id, joao, Map.of("menuItemId", panceta.getId(), "quantity", 0.3555)).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("item avulso: nome e preço digitados; sem preço → 400")
    void customItem() throws Exception {
        long id = open(mesa1, joao, null).get("id").asLong();
        add(id, joao, Map.of("name", "  Carvão  3kg ", "unitPrice", 25, "quantity", 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Carvão 3kg"))
                .andExpect(jsonPath("$.items[0].custom").value(true))
                .andExpect(jsonPath("$.items[0].menuItemId").doesNotExist())
                .andExpect(jsonPath("$.total").value(50.00));
        add(id, joao, Map.of("name", "Gelo", "quantity", 1)).andExpect(status().isBadRequest());
        add(id, joao, Map.of("name", "Gelo", "unitPrice", -1, "quantity", 1)).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("edita quantidade/observação e remove item; total acompanha; a versão sobe a cada mudança")
    void editAndRemove() throws Exception {
        JsonNode c = open(mesa1, joao, null);
        long id = c.get("id").asLong();
        long v0 = c.get("version").asLong();
        JsonNode after = json.readTree(add(id, joao, Map.of("menuItemId", cerveja.getId(), "quantity", 1)).andReturn().getResponse().getContentAsString());
        long itemId = after.get("items").get(0).get("id").asLong();
        org.assertj.core.api.Assertions.assertThat(after.get("version").asLong()).isGreaterThan(v0);

        send(patch("/api/pedidos/comandas/{id}/itens/{item}", id, itemId), ana, Map.of("quantity", 4, "note", "sem copo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].quantity").value(4))
                .andExpect(jsonPath("$.items[0].note").value("sem copo"))
                .andExpect(jsonPath("$.total").value(34.00));
        send(patch("/api/pedidos/comandas/{id}/itens/{item}", id, 999999), ana, Map.of("quantity", 1)).andExpect(status().isNotFound());

        mvc.perform(delete("/api/pedidos/comandas/{id}/itens/{item}", id, itemId).header("Authorization", waiterBearer(ana)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    @DisplayName("edita identificação e nº de pessoas")
    void editHeader() throws Exception {
        long id = open(mesa1, joao, "x").get("id").asLong();
        send(patch("/api/pedidos/comandas/{id}", id), joao, Map.of("label", "Casal", "people", 2))
                .andExpect(status().isOk()).andExpect(jsonPath("$.label").value("Casal")).andExpect(jsonPath("$.people").value(2));
        send(patch("/api/pedidos/comandas/{id}", id), joao, Map.of("people", 0)).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("move a comanda para outra mesa; destino desativado → 409")
    void move() throws Exception {
        long id = open(mesa1, joao, null).get("id").asLong();
        send(post("/api/pedidos/comandas/{id}/mover", id), joao, Map.of("tableId", mesa2.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tableName").value("Mesa 2"));
        DiningTable off = table("Varanda", 3);
        off.update("Varanda", 3, false);
        tables.save(off);
        send(post("/api/pedidos/comandas/{id}/mover", id), joao, Map.of("tableId", off.getId())).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("junta duas comandas: itens vão para a de destino; a outra fica como juntada e não aceita mais itens")
    void merge() throws Exception {
        long a = open(mesa1, joao, "A").get("id").asLong();
        long b = open(mesa2, ana, "B").get("id").asLong();
        add(a, joao, Map.of("menuItemId", cerveja.getId(), "quantity", 1));
        add(b, ana, Map.of("menuItemId", cerveja.getId(), "quantity", 2));
        add(b, ana, Map.of("name", "Gelo", "unitPrice", 5, "quantity", 1));

        send(post("/api/pedidos/comandas/{id}/juntar", a), joao, Map.of("fromComandaId", b))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.total").value(30.50));
        mvc.perform(get("/api/pedidos/comandas/{id}", b).header("Authorization", waiterBearer(ana)))
                .andExpect(jsonPath("$.status").value("MERGED"))
                .andExpect(jsonPath("$.mergedInto").value(a))
                .andExpect(jsonPath("$.items", hasSize(0)));
        add(b, ana, Map.of("menuItemId", cerveja.getId(), "quantity", 1))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Esta comanda foi juntada em outra (comanda " + a + ")."));
        send(post("/api/pedidos/comandas/{id}/juntar", a), joao, Map.of("fromComandaId", a)).andExpect(status().isConflict());
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", waiterBearer(ana)))
                .andExpect(jsonPath("$[1].comandas", hasSize(0)));
    }

    @Test
    @DisplayName("comanda fechada não aceita alterações (409)")
    void closedIsReadOnly() throws Exception {
        long id = open(mesa1, joao, null).get("id").asLong();
        jdbc.update("UPDATE comanda SET status = 'CLOSED' WHERE id = ?", id);
        add(id, joao, Map.of("menuItemId", cerveja.getId(), "quantity", 1))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("Esta comanda já foi fechada."));
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", waiterBearer(joao))).andExpect(jsonPath("$[0].comandas", hasSize(0)));
    }

    @Test
    @DisplayName("produto excluído do cardápio depois: a linha da comanda continua, com nome e preço copiados")
    void deletedMenuItemKeepsLine() throws Exception {
        long id = open(mesa1, joao, null).get("id").asLong();
        add(id, joao, Map.of("menuItemId", cerveja.getId(), "quantity", 2));
        mvc.perform(delete("/api/admin/items/{id}", cerveja.getId()).header("Authorization", bearer())).andExpect(status().isNoContent());
        mvc.perform(get("/api/pedidos/comandas/{id}", id).header("Authorization", waiterBearer(joao)))
                .andExpect(jsonPath("$.items[0].name").value("Brahma 600ml"))
                .andExpect(jsonPath("$.items[0].menuItemId").doesNotExist())
                .andExpect(jsonPath("$.total").value(17.00));
    }

    @Test
    @DisplayName("mesa que já teve comanda não pode ser excluída (409), só desativada")
    void tableWithHistoryCannotBeDeleted() throws Exception {
        open(mesa1, joao, null);
        mvc.perform(delete("/api/admin/mesas/{id}", mesa1.getId()).header("Authorization", bearer())).andExpect(status().isConflict());
        mvc.perform(put("/api/admin/mesas/{id}", mesa1.getId()).header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(write(Map.of("name", "Mesa 1", "active", false)))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("proprietário também lança; sem token → 401; comanda inexistente → 404")
    void accessRules() throws Exception {
        mvc.perform(post("/api/pedidos/comandas").header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                .content(write(Map.of("tableId", mesa1.getId())))).andExpect(status().isCreated()).andExpect(jsonPath("$.openedBy").value("Proprietário"));
        mvc.perform(post("/api/pedidos/comandas").contentType(MediaType.APPLICATION_JSON).content(write(Map.of("tableId", mesa1.getId()))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/pedidos/comandas/{id}", 999999).header("Authorization", waiterBearer(joao))).andExpect(status().isNotFound());
    }
}
