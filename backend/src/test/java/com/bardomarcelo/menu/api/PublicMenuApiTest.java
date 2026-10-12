package com.bardomarcelo.menu.api;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.item.MenuItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("Cardápio público (GET /api/menu, /api/items/{id})")
class PublicMenuApiTest extends ApiTestSupport {

    @Test
    @DisplayName("sem itens → lista vazia")
    void empty() throws Exception {
        mvc.perform(get("/api/menu")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    @DisplayName("agrupa por categoria, respeita a ordem e esconde indisponíveis e categorias vazias")
    void groupsAndFilters() throws Exception {
        Category drinks = category("Bebidas", 2);
        Category beers = category("Cervejas", 1);
        category("Vazia", 3);
        item("Chopp", "8.50", beers, true, false);
        item("Long Neck", "9.00", beers, true, true);
        item("Esgotada", "10.00", beers, false, false);
        item("Suco", "8.00", drinks, true, false);

        mvc.perform(get("/api/menu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Cervejas"))
                .andExpect(jsonPath("$[0].items", hasSize(2)))
                .andExpect(jsonPath("$[0].items[0].name").value("Long Neck")) // destaque primeiro
                .andExpect(jsonPath("$[0].items[0].featured").value(true))
                .andExpect(jsonPath("$[0].items[0].price").value(9.00))
                .andExpect(jsonPath("$[0].items[0].imageUrl").value(nullValue()))
                .andExpect(jsonPath("$[0].items[1].name").value("Chopp"))
                .andExpect(jsonPath("$[1].name").value("Bebidas"))
                .andExpect(jsonPath("$[1].items", hasSize(1)));
    }

    @Test
    @DisplayName("resposta pública não expõe campos internos")
    void doesNotLeakInternalFields() throws Exception {
        item("Chopp", "8.50", category("Cervejas", 1), true, false);
        mvc.perform(get("/api/menu"))
                .andExpect(jsonPath("$[0].items[0].available").doesNotExist())
                .andExpect(jsonPath("$[0].items[0].updatedAt").doesNotExist())
                .andExpect(jsonPath("$[0].items[0].imageFilename").doesNotExist());
    }

    @Test
    @DisplayName("envia Cache-Control e ETag; revalidação devolve 304")
    void httpCaching() throws Exception {
        item("Chopp", "8.50", category("Cervejas", 1), true, false);
        String etag = mvc.perform(get("/api/menu"))
                .andExpect(header().string("Cache-Control", containsString("max-age=30")))
                .andExpect(header().exists("ETag"))
                .andReturn().getResponse().getHeader("ETag");

        mvc.perform(get("/api/menu").header("If-None-Match", etag)).andExpect(status().isNotModified());
    }

    @Test
    @DisplayName("alterações do admin aparecem imediatamente (cache invalidado)")
    void cacheEvictedOnWrite() throws Exception {
        Category beers = category("Cervejas", 1);
        MenuItem chopp = item("Chopp", "8.50", beers, true, false);

        mvc.perform(get("/api/menu")).andExpect(jsonPath("$[0].items[0].price").value(8.50)); // aquece o cache

        mvc.perform(put("/api/admin/items/{id}", chopp.getId())
                        .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content(write(itemBody("Chopp", "9.90", beers.getId()))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/menu")).andExpect(jsonPath("$[0].items[0].price").value(9.90));

        mvc.perform(patch("/api/admin/items/{id}/availability", chopp.getId())
                        .header("Authorization", bearer()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"available\":false}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/menu")).andExpect(content().json("[]"));
    }

    @Test
    @DisplayName("detalhe de item disponível → 200; indisponível ou inexistente → 404")
    void itemDetail() throws Exception {
        Category beers = category("Cervejas", 1);
        MenuItem ok = item("Chopp", "8.50", beers, true, false);
        MenuItem hidden = item("Esgotada", "10.00", beers, false, false);

        mvc.perform(get("/api/items/{id}", ok.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Chopp"));
        mvc.perform(get("/api/items/{id}", hidden.getId())).andExpect(status().isNotFound());
        mvc.perform(get("/api/items/{id}", 999999)).andExpect(status().isNotFound());
        mvc.perform(get("/api/items/abc")).andExpect(status().isBadRequest());
    }
}
