package com.bardomarcelo.menu.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bardomarcelo.menu.category.Category;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("CRUD de categorias (/api/admin/categories)")
class AdminCategoryApiTest extends ApiTestSupport {

    private org.springframework.test.web.servlet.ResultActions create(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/admin/categories").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON).content(write(body)));
    }

    @Test
    @DisplayName("cria categoria → 201 + Location; ordem padrão 0")
    void createCategory() throws Exception {
        create(Map.of("name", "  Cervejas ")).andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/admin/categories/")))
                .andExpect(jsonPath("$.name").value("Cervejas"))
                .andExpect(jsonPath("$.displayOrder").value(0));
    }

    @Test
    @DisplayName("nome vazio, longo ou ordem negativa → 400")
    void validation() throws Exception {
        create(Map.of("name", "")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.name").exists());
        create(Map.of("name", "x".repeat(61))).andExpect(status().isBadRequest());
        create(Map.of("name", "ok", "displayOrder", -1)).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("nome duplicado (sem diferenciar maiúsculas) → 409")
    void duplicateName() throws Exception {
        create(Map.of("name", "Cervejas")).andExpect(status().isCreated());
        create(Map.of("name", "cervejas")).andExpect(status().isConflict());
    }

    @Test
    @DisplayName("lista ordenada por ordem e nome")
    void list() throws Exception {
        category("Bebidas", 2);
        category("Cervejas", 1);
        mvc.perform(get("/api/admin/categories").header("Authorization", bearer()))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Cervejas"));
    }

    @Test
    @DisplayName("edita; renomear para nome de outra categoria → 409; manter o próprio nome → 200")
    void update() throws Exception {
        Category beers = category("Cervejas", 1);
        category("Bebidas", 2);
        mvc.perform(put("/api/admin/categories/{id}", beers.getId()).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(Map.of("name", "Cervejas", "displayOrder", 5))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.displayOrder").value(5));
        mvc.perform(put("/api/admin/categories/{id}", beers.getId()).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(Map.of("name", "bebidas"))))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/admin/categories/{id}", 999999).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(Map.of("name", "X"))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("não exclui categoria com itens (409); exclui quando vazia (204)")
    void deleteCategory() throws Exception {
        Category beers = category("Cervejas", 1);
        Category empty = category("Vazia", 2);
        item("Chopp", "8.50", beers, true, false);

        mvc.perform(delete("/api/admin/categories/{id}", beers.getId()).header("Authorization", bearer()))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/admin/categories/{id}", empty.getId()).header("Authorization", bearer()))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/admin/categories/{id}", empty.getId()).header("Authorization", bearer()))
                .andExpect(status().isNotFound());
    }
}
