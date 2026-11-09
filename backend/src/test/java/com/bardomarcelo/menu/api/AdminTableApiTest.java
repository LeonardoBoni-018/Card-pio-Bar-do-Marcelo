package com.bardomarcelo.menu.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bardomarcelo.menu.comanda.DiningTable;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

@DisplayName("Cadastro de mesas (/api/admin/mesas) e mesas do garçom (/api/pedidos/mesas)")
class AdminTableApiTest extends ApiTestSupport {

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, Object body) throws Exception {
        return mvc.perform(req.header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON).content(write(body)));
    }

    @Test
    @DisplayName("cria mesa (nome com espaços normalizados), ativa por padrão; nome repetido → 409")
    void create() throws Exception {
        send(post("/api/admin/mesas"), Map.of("name", "  Mesa   1 ")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Mesa 1"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.displayOrder").value(0));
        send(post("/api/admin/mesas"), Map.of("name", "mesa 1")).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("validação: nome vazio, longo ou ordem negativa → 400")
    void validation() throws Exception {
        send(post("/api/admin/mesas"), Map.of("name", "")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.name").exists());
        send(post("/api/admin/mesas"), Map.of("name", "x".repeat(41))).andExpect(status().isBadRequest());
        send(post("/api/admin/mesas"), Map.of("name", "ok", "displayOrder", -1)).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("lote cria Mesa 1..N na ordem e pula as que já existem")
    void batch() throws Exception {
        table("Mesa 2", 2);
        send(post("/api/admin/mesas/lote"), Map.of("quantity", 4)).andExpect(status().isCreated())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].name").value("Mesa 1"))
                .andExpect(jsonPath("$[2].name").value("Mesa 4"));
        send(post("/api/admin/mesas/lote"), Map.of("quantity", 2, "prefix", "Varanda")).andExpect(status().isCreated())
                .andExpect(jsonPath("$[1].name").value("Varanda 2"));
        send(post("/api/admin/mesas/lote"), Map.of("quantity", 101)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/mesas").header("Authorization", bearer()))
                .andExpect(jsonPath("$", hasSize(6)))
                .andExpect(jsonPath("$[0].name").value("Mesa 1"));
    }

    @Test
    @DisplayName("edita nome, ordem e ativa; desativada some da lista do garçom; exclui → 204")
    void updateAndDelete() throws Exception {
        DiningTable t = table("Mesa 1", 1);
        DiningTable other = table("Balcão", 2);
        send(put("/api/admin/mesas/{id}", t.getId()), Map.of("name", "Mesa 01", "displayOrder", 3, "active", false))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Mesa 01"))
                .andExpect(jsonPath("$.active").value(false));
        send(put("/api/admin/mesas/{id}", t.getId()), Map.of("name", "balcão")).andExpect(status().isConflict());
        send(put("/api/admin/mesas/{id}", 999999), Map.of("name", "X")).andExpect(status().isNotFound());

        var waiter = waiter("joao", "senha123", "João");
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", waiterBearer(waiter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Balcão"));

        mvc.perform(delete("/api/admin/mesas/{id}", other.getId()).header("Authorization", bearer())).andExpect(status().isNoContent());
        mvc.perform(delete("/api/admin/mesas/{id}", other.getId()).header("Authorization", bearer())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("garçom não acessa o cadastro de mesas (403)")
    void waiterCannotManage() throws Exception {
        var waiter = waiter("joao", "senha123", "João");
        mvc.perform(get("/api/admin/mesas").header("Authorization", waiterBearer(waiter))).andExpect(status().isForbidden());
    }
}
