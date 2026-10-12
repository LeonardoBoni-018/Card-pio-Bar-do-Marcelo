package com.bardomarcelo.menu.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

@DisplayName("Imagens (/api/admin/images e /api/images/{nome})")
class ImageApiTest extends ApiTestSupport {

    private ResultActions upload(String name, String contentType, byte[] data, boolean authenticated) throws Exception {
        var request = multipart("/api/admin/images").file(new MockMultipartFile("file", name, contentType, data));
        if (authenticated) {
            request.header("Authorization", bearer());
        }
        return mvc.perform(request);
    }

    @Test
    @DisplayName("upload de JPG → 201, gravado como .jpg e servido com cache longo")
    void uploadJpeg() throws Exception {
        String filename = json.readTree(upload("foto.jpg", "image/jpeg", image("jpg", 200, 100, false), true)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.filename").value(endsWith(".jpg")))
                .andReturn().getResponse().getContentAsString()).get("filename").asText();

        mvc.perform(get("/api/images/{f}", filename))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/jpeg"))
                .andExpect(header().string("Cache-Control", containsString("immutable")))
                .andExpect(header().string("Cache-Control", containsString("max-age=31536000")));
    }

    @Test
    @DisplayName("PNG com transparência continua PNG")
    void uploadPngWithAlpha() throws Exception {
        upload("logo.png", "image/png", image("png", 64, 64, true), true)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.filename").value(endsWith(".png")));
    }

    @Test
    @DisplayName("imagens grandes são reduzidas para no máximo 1200 px")
    void resizesLargeImages() throws Exception {
        String filename = json.readTree(upload("grande.png", "image/png", image("png", 3000, 2000, false), true)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("filename").asText();

        byte[] bytes = mvc.perform(get("/api/images/{f}", filename)).andReturn().getResponse().getContentAsByteArray();
        BufferedImage stored = ImageIO.read(new ByteArrayInputStream(bytes));
        assertThat(stored.getWidth()).isEqualTo(1200);
        assertThat(stored.getHeight()).isEqualTo(800);
    }

    @Test
    @DisplayName("arquivo que não é imagem (mesmo com Content-Type de imagem) → 400")
    void rejectsNonImage() throws Exception {
        upload("malware.png", "image/png", "<script>alert(1)</script>".getBytes(), true)
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("formato não suportado (GIF) → 400")
    void rejectsGif() throws Exception {
        upload("anim.gif", "image/gif", image("gif", 20, 20, false), true).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PNG corrompido → 400")
    void rejectsCorrupted() throws Exception {
        byte[] png = image("png", 100, 100, false);
        byte[] truncated = java.util.Arrays.copyOf(png, 40);
        upload("quebrada.png", "image/png", truncated, true).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("arquivo vazio ou ausente → 400")
    void rejectsEmpty() throws Exception {
        upload("vazio.png", "image/png", new byte[0], true).andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/admin/images").header("Authorization", bearer())).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("upload exige autenticação")
    void uploadRequiresAuth() throws Exception {
        upload("foto.jpg", "image/jpeg", image("jpg", 20, 20, false), false).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("download: nome inexistente, inválido ou com path traversal → 404/400, nunca o arquivo")
    void downloadGuards() throws Exception {
        mvc.perform(get("/api/images/{f}", "11111111-1111-1111-1111-111111111111.jpg")).andExpect(status().isNotFound());
        mvc.perform(get("/api/images/{f}", "passwd")).andExpect(status().isNotFound());
        mvc.perform(get("/api/images/{f}", "..%2F..%2Fetc%2Fpasswd")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/images/%2e%2e/application.yml")).andExpect(status().is4xxClientError());
    }
}
