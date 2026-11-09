package com.bardomarcelo.menu.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

/** Como a produção roda hoje: chave desligada. Nada do módulo responde e garçom não entra. */
@TestPropertySource(properties = "app.features.comandas=false")
@DisplayName("Comandas com a chave desligada (produção)")
class ComandasDisabledApiTest extends ApiTestSupport {

    @Test
    @DisplayName("rotas do módulo não existem (404), mesmo para o proprietário")
    void routesAbsent() throws Exception {
        mvc.perform(get("/api/admin/mesas").header("Authorization", bearer())).andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/garcons").header("Authorization", bearer())).andExpect(status().isNotFound());
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", bearer())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("garçom cadastrado não consegue entrar; o cardápio e o painel seguem normais")
    void waiterCannotLogin() throws Exception {
        waiter("joao", "senha123", "João");
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(write(Map.of("username", "joao", "password", "senha123"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/menu")).andExpect(status().isOk());
        mvc.perform(get("/api/admin/categories").header("Authorization", bearer())).andExpect(status().isOk());
    }
}
