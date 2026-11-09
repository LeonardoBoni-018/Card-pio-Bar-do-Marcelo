package com.bardomarcelo.menu.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import com.bardomarcelo.menu.auth.AppUser;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("Login e acesso do garçom")
class WaiterAuthApiTest extends ApiTestSupport {

    private String login(String user, String pass, String ip) throws Exception {
        return mvc.perform(post("/api/auth/login").with(r -> { r.setRemoteAddr(ip); return r; })
                        .contentType(MediaType.APPLICATION_JSON).content(write(Map.of("username", user, "password", pass))))
                .andReturn().getResponse().getContentAsString();
    }

    private Map<?, ?> claims(String token) throws Exception {
        return json.readValue(Base64.getUrlDecoder().decode(token.split("\\.")[1]), Map.class);
    }

    @Test
    @DisplayName("garçom entra; o token traz papel GARCOM, id e nome; abre /api/pedidos e não abre /api/admin")
    void waiterLogin() throws Exception {
        AppUser w = waiter("joao", "senha123", "João");
        String token = json.readTree(login("joao", "senha123", "10.1.0.1")).get("accessToken").asText();
        Map<?, ?> claims = claims(token);
        assertThat(claims.get("roles")).isEqualTo(java.util.List.of("GARCOM"));
        assertThat(((Number) claims.get("uid")).longValue()).isEqualTo(w.getId());
        assertThat(claims.get("name")).isEqualTo("João");

        mvc.perform(get("/api/pedidos/mesas").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/items").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("proprietário recebe papel ADMIN e também abre a área do garçom")
    void adminToken() throws Exception {
        String token = json.readTree(login("admin", "admin12345", "10.1.0.2")).get("accessToken").asText();
        assertThat(claims(token).get("roles")).isEqualTo(java.util.List.of("ADMIN"));
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("garçom desativado não entra, e o token que já tinha para de valer na hora")
    void deactivated() throws Exception {
        AppUser w = waiter("joao", "senha123", "João");
        String bearer = waiterBearer(w);
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", bearer)).andExpect(status().isOk());

        w.updateProfile(w.getUsername(), w.getDisplayName(), false);
        users.save(w);

        mvc.perform(get("/api/pedidos/mesas").header("Authorization", bearer)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(write(Map.of("username", "joao", "password", "senha123"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token de garçom sem id, ou de garçom excluído, é recusado (401)")
    void forgedOrStaleWaiterToken() throws Exception {
        String noUid = token("joao", java.util.List.of("GARCOM"), java.time.Instant.now().plusSeconds(600));
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", "Bearer " + noUid)).andExpect(status().isUnauthorized());

        AppUser w = waiter("joao", "senha123", "João");
        String bearer = waiterBearer(w);
        users.delete(w);
        mvc.perform(get("/api/pedidos/mesas").header("Authorization", bearer)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("área do garçom exige token (401)")
    void requiresToken() throws Exception {
        mvc.perform(get("/api/pedidos/mesas")).andExpect(status().isUnauthorized());
    }
}
