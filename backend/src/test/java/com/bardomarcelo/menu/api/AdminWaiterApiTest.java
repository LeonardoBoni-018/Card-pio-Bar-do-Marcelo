package com.bardomarcelo.menu.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.auth.UserRole;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

@DisplayName("Cadastro de garçons (/api/admin/garcons)")
class AdminWaiterApiTest extends ApiTestSupport {

    private ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, Object body) throws Exception {
        return mvc.perform(req.header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON).content(write(body)));
    }

    @Test
    @DisplayName("cria garçom com usuário em minúsculas e senha com hash; resposta nunca traz a senha")
    void create() throws Exception {
        send(post("/api/admin/garcons"), Map.of("name", " João Silva ", "username", " Joao ", "password", "senha123"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("João Silva"))
                .andExpect(jsonPath("$.username").value("joao"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.password").doesNotExist());
        AppUser saved = users.findByUsername("joao").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(UserRole.GARCOM);
        assertThat(passwordEncoder.matches("senha123", saved.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("usuário já usado (inclusive o do proprietário) → 409")
    void duplicate() throws Exception {
        waiter("joao", "senha123", "João");
        send(post("/api/admin/garcons"), Map.of("name", "Outro", "username", "JOAO", "password", "senha123")).andExpect(status().isConflict());
        send(post("/api/admin/garcons"), Map.of("name", "Outro", "username", "admin", "password", "senha123")).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("validação: usuário com espaço, senha curta ou ausente → 400")
    void validation() throws Exception {
        send(post("/api/admin/garcons"), Map.of("name", "A", "username", "joao silva", "password", "senha123"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.username").exists());
        send(post("/api/admin/garcons"), Map.of("name", "A", "username", "joao", "password", "123"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.password").exists());
        send(post("/api/admin/garcons"), Map.of("name", "A", "username", "joao")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("lista só garçons (sem o proprietário), em ordem de nome")
    void list() throws Exception {
        waiter("bia", "senha123", "Beatriz");
        waiter("ana", "senha123", "Ana");
        mvc.perform(get("/api/admin/garcons").header("Authorization", bearer()))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Ana"));
    }

    @Test
    @DisplayName("edita nome/usuário/ativo; senha vazia mantém a atual, preenchida troca")
    void update() throws Exception {
        AppUser w = waiter("joao", "senha123", "João");
        Map<String, Object> body = new HashMap<>(Map.of("name", "João P.", "username", "joaop", "active", false));
        send(put("/api/admin/garcons/{id}", w.getId()), body).andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("joaop"))
                .andExpect(jsonPath("$.active").value(false));
        assertThat(passwordEncoder.matches("senha123", users.findById(w.getId()).orElseThrow().getPasswordHash())).isTrue();

        body.put("password", "nova-senha");
        send(put("/api/admin/garcons/{id}", w.getId()), body).andExpect(status().isOk());
        assertThat(passwordEncoder.matches("nova-senha", users.findById(w.getId()).orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("não edita o proprietário por esta rota (404)")
    void cannotEditAdmin() throws Exception {
        Long adminId = users.findByUsername("admin").orElseThrow().getId();
        send(put("/api/admin/garcons/{id}", adminId), Map.of("name", "X", "username", "admin", "active", false)).andExpect(status().isNotFound());
    }
}
