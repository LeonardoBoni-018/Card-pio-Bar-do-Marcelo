package com.bardomarcelo.menu.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@DisplayName("POST /api/auth/login")
class AuthApiTest extends ApiTestSupport {

    private static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    private org.springframework.test.web.servlet.ResultActions login(String user, String pass, String ip) throws Exception {
        return mvc.perform(post("/api/auth/login").with(fromIp(ip)).contentType(MediaType.APPLICATION_JSON)
                .content(write(Map.of("username", user, "password", pass))));
    }

    @Test
    @DisplayName("credenciais corretas devolvem um JWT que abre as rotas do admin")
    void loginOk() throws Exception {
        String body = login("admin", "admin12345", "10.0.0.1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(8 * 3600))
                .andReturn().getResponse().getContentAsString();
        String token = json.readTree(body).get("accessToken").asText();

        mvc.perform(get("/api/admin/categories").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("senha errada → 401 sem revelar se o usuário existe")
    void wrongPassword() throws Exception {
        login("admin", "senha-errada", "10.0.0.2")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Usuário ou senha inválidos."));
    }

    @Test
    @DisplayName("usuário inexistente → mesma resposta 401")
    void unknownUser() throws Exception {
        login("ninguem", "admin12345", "10.0.0.3")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Usuário ou senha inválidos."));
    }

    @Test
    @DisplayName("campos vazios → 400 com detalhes por campo")
    void validation() throws Exception {
        mvc.perform(post("/api/auth/login").with(fromIp("10.0.0.4")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.username").exists())
                .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    @DisplayName("após 3 falhas o IP é bloqueado (429), mesmo com a senha certa")
    void rateLimit() throws Exception {
        for (int i = 0; i < 3; i++) {
            login("admin", "errada", "10.0.0.5").andExpect(status().isUnauthorized());
        }
        login("admin", "admin12345", "10.0.0.5").andExpect(status().isTooManyRequests());
        // outro IP não é afetado
        login("admin", "admin12345", "10.0.0.6").andExpect(status().isOk());
    }

    @Test
    @DisplayName("login bem-sucedido zera o contador de falhas")
    void successResetsCounter() throws Exception {
        login("admin", "errada", "10.0.0.7").andExpect(status().isUnauthorized());
        login("admin", "errada", "10.0.0.7").andExpect(status().isUnauthorized());
        login("admin", "admin12345", "10.0.0.7").andExpect(status().isOk());
        login("admin", "errada", "10.0.0.7").andExpect(status().isUnauthorized());
        login("admin", "errada", "10.0.0.7").andExpect(status().isUnauthorized());
        login("admin", "admin12345", "10.0.0.7").andExpect(status().isOk());
    }
}
