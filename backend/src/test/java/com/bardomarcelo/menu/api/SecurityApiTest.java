package com.bardomarcelo.menu.api;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

@DisplayName("Segurança")
class SecurityApiTest extends ApiTestSupport {

    @ParameterizedTest(name = "GET {0} sem token → 401")
    @ValueSource(strings = {"/api/admin/items", "/api/admin/items/1", "/api/admin/categories"})
    void adminRoutesRequireToken(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("escritas do admin sem token → 401")
    void adminWritesRequireToken() throws Exception {
        mvc.perform(post("/api/admin/items").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/admin/items/1")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/categories").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token expirado → 401")
    void expiredToken() throws Exception {
        String expired = token("admin", List.of("ADMIN"), Instant.now().minusSeconds(120));
        mvc.perform(get("/api/admin/items").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token adulterado → 401")
    void tamperedToken() throws Exception {
        String valid = token("admin", List.of("ADMIN"), Instant.now().plusSeconds(600));
        String tampered = valid.substring(0, valid.length() - 4) + "AAAA";
        mvc.perform(get("/api/admin/items").header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token válido sem papel ADMIN → 403")
    void wrongRole() throws Exception {
        String user = token("cliente", List.of("USER"), Instant.now().plusSeconds(600));
        mvc.perform(get("/api/admin/items").header("Authorization", "Bearer " + user))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("rotas inexistentes/não mapeadas são negadas")
    void unknownRoutesDenied() throws Exception {
        mvc.perform(get("/api/qualquer-coisa")).andExpect(status().isUnauthorized());
        mvc.perform(get("/h2-console")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("rotas públicas respondem sem token e com cabeçalhos de segurança")
    void publicRoutesAndHeaders() throws Exception {
        mvc.perform(get("/api/menu"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", containsString("default-src 'none'")))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("health de liveness (usado pelo Render) responde sem consultar o banco")
    void livenessProbe() throws Exception {
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("/api/ping é público, leve e nunca fica em cache")
    void ping() throws Exception {
        mvc.perform(get("/api/ping"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    @DisplayName("CORS libera apenas a origem configurada")
    void cors() throws Exception {
        mvc.perform(options("/api/menu")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        // padrão com curinga (previews da Vercel)
        mvc.perform(options("/api/menu")
                        .header("Origin", "https://cardapio-git-feature-marcelo.vercel.app")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://cardapio-git-feature-marcelo.vercel.app"));
        mvc.perform(options("/api/menu")
                        .header("Origin", "https://outro-projeto.vercel.app")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
        mvc.perform(options("/api/menu")
                        .header("Origin", "http://site-malicioso.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
