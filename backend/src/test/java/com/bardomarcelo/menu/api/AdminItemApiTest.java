package com.bardomarcelo.menu.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.item.MenuItem;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

@DisplayName("CRUD de itens (/api/admin/items)")
class AdminItemApiTest extends ApiTestSupport {

    private String uploadPng() throws Exception {
        String body = mvc.perform(multipart("/api/admin/images")
                        .file(new MockMultipartFile("file", "foto.png", "image/png", image("png", 100, 80, false)))
                        .header("Authorization", bearer()))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("filename").asText();
    }

    @Test
    @DisplayName("cria item → 201 + Location, com padrões (disponível, sem destaque)")
    void create() throws Exception {
        Category beers = category("Cervejas", 1);
        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(write(itemBody("  Chopp  ", "8.50", beers.getId()))))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/admin/items/")))
                .andExpect(jsonPath("$.name").value("Chopp"))
                .andExpect(jsonPath("$.price").value(8.50))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.featured").value(false))
                .andExpect(jsonPath("$.categoryName").value("Cervejas"));
        assertThat(items.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("cria item com foto enviada antes")
    void createWithImage() throws Exception {
        Category beers = category("Cervejas", 1);
        String filename = uploadPng();
        Map<String, Object> body = itemBody("Chopp", 8.5, beers.getId());
        body.put("imageFilename", filename);

        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").value("/api/images/" + filename));
    }

    @Test
    @DisplayName("dados inválidos → 400 com erros por campo")
    void validation() throws Exception {
        Category beers = category("Cervejas", 1);
        Map<String, Object> body = itemBody("", -1, beers.getId());
        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.price").exists());

        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(write(itemBody("Chopp", "8.505", beers.getId()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.price").exists());

        Map<String, Object> badImage = itemBody("Chopp", 8, beers.getId());
        badImage.put("imageFilename", "../../etc/passwd");
        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(badImage)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.imageFilename").exists());
        assertThat(items.count()).isZero();
    }

    @Test
    @DisplayName("JSON malformado → 400")
    void malformedJson() throws Exception {
        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{nao-e-json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("categoria ou imagem inexistente → 404")
    void referencesMustExist() throws Exception {
        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(itemBody("Chopp", 8, 999999L))))
                .andExpect(status().isNotFound());

        Category beers = category("Cervejas", 1);
        Map<String, Object> body = itemBody("Chopp", 8, beers.getId());
        body.put("imageFilename", "11111111-1111-1111-1111-111111111111.jpg");
        mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(body)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("edita todos os campos do item")
    void update() throws Exception {
        Category beers = category("Cervejas", 1);
        Category snacks = category("Porções", 2);
        MenuItem item = item("Chopp", "8.50", beers, true, false);

        Map<String, Object> body = itemBody("Batata", "32.00", snacks.getId());
        body.put("available", false);
        body.put("featured", true);
        mvc.perform(put("/api/admin/items/{id}", item.getId()).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Batata"))
                .andExpect(jsonPath("$.price").value(32.00))
                .andExpect(jsonPath("$.categoryName").value("Porções"))
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.featured").value(true));
    }

    @Test
    @DisplayName("trocar a foto apaga o arquivo antigo")
    void replacingImageDeletesOldFile() throws Exception {
        Category beers = category("Cervejas", 1);
        String first = uploadPng();
        String second = uploadPng();
        Map<String, Object> create = itemBody("Chopp", 8, beers.getId());
        create.put("imageFilename", first);
        String created = mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(create)))
                .andReturn().getResponse().getContentAsString();
        long id = json.readTree(created).get("id").asLong();

        Map<String, Object> update = itemBody("Chopp", 8, beers.getId());
        update.put("imageFilename", second);
        mvc.perform(put("/api/admin/items/{id}", id).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(update)))
                .andExpect(status().isOk());

        assertThat(Files.exists(Path.of(UPLOAD_DIR.toString(), first))).isFalse();
        assertThat(Files.exists(Path.of(UPLOAD_DIR.toString(), second))).isTrue();
    }

    @Test
    @DisplayName("alterna a disponibilidade com PATCH")
    void availability() throws Exception {
        MenuItem item = item("Chopp", "8.50", category("Cervejas", 1), true, false);
        mvc.perform(patch("/api/admin/items/{id}/availability", item.getId()).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"available\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
        mvc.perform(patch("/api/admin/items/{id}/availability", item.getId()).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("exclui item e apaga a foto; depois disso → 404")
    void deleteItem() throws Exception {
        Category beers = category("Cervejas", 1);
        String filename = uploadPng();
        Map<String, Object> body = itemBody("Chopp", 8, beers.getId());
        body.put("imageFilename", filename);
        long id = json.readTree(mvc.perform(post("/api/admin/items").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(body)))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(delete("/api/admin/items/{id}", id).header("Authorization", bearer()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/admin/items/{id}", id).header("Authorization", bearer()))
                .andExpect(status().isNotFound());
        assertThat(Files.exists(Path.of(UPLOAD_DIR.toString(), filename))).isFalse();
        mvc.perform(delete("/api/admin/items/{id}", id).header("Authorization", bearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("update/patch de item inexistente → 404")
    void notFound() throws Exception {
        Category beers = category("Cervejas", 1);
        mvc.perform(put("/api/admin/items/{id}", 999999).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(write(itemBody("X", 1, beers.getId()))))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/api/admin/items/{id}/availability", 999999).header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"available\":true}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("lista paginada com busca por nome e filtro por categoria (inclui indisponíveis)")
    void search() throws Exception {
        Category beers = category("Cervejas", 1);
        Category snacks = category("Porções", 2);
        item("Chopp", "8.50", beers, true, false);
        item("Cerveja 600", "14.00", beers, false, false);
        item("Batata_Frita", "32.00", snacks, true, false);
        item("Batata 100%", "10.00", snacks, true, false);

        mvc.perform(get("/api/admin/items").header("Authorization", bearer()))
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.content[0].name").value("Batata 100%")); // ordenado por nome

        mvc.perform(get("/api/admin/items").param("q", "chopp").header("Authorization", bearer()))
                .andExpect(jsonPath("$.content", hasSize(1)));
        mvc.perform(get("/api/admin/items").param("categoryId", beers.getId().toString()).header("Authorization", bearer()))
                .andExpect(jsonPath("$.content", hasSize(2)));
        // curingas do LIKE são tratados como texto
        mvc.perform(get("/api/admin/items").param("q", "_").header("Authorization", bearer()))
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name").value("Batata_Frita"));
        mvc.perform(get("/api/admin/items").param("q", "%").header("Authorization", bearer()))
                .andExpect(jsonPath("$.content", hasSize(1)));

        mvc.perform(get("/api/admin/items").param("size", "2").param("page", "1").header("Authorization", bearer()))
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    @DisplayName("parâmetros de paginação inválidos → 400")
    void invalidPaging() throws Exception {
        mvc.perform(get("/api/admin/items").param("size", "1000").header("Authorization", bearer()))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/items").param("page", "-1").header("Authorization", bearer()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("busca um item pelo id")
    void getOne() throws Exception {
        MenuItem item = item("Chopp", "8.50", category("Cervejas", 1), true, false);
        mvc.perform(get("/api/admin/items/{id}", item.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Chopp"))
                .andExpect(jsonPath("$.updatedAt").exists());
        mvc.perform(get("/api/admin/items/{id}", item.getId()).header("Authorization", bearer()))
                .andExpect(header().doesNotExist("Location"));
    }
}
