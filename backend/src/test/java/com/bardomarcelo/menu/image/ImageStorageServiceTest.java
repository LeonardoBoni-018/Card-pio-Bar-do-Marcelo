package com.bardomarcelo.menu.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bardomarcelo.menu.common.InvalidImageException;
import com.bardomarcelo.menu.config.AppProperties;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

@DisplayName("ImageStorageService")
class ImageStorageServiceTest {

    @TempDir Path dir;
    ImageStorageService storage;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties(
                new AppProperties.Jwt("x".repeat(32), Duration.ofHours(1)),
                new AppProperties.Admin("admin", "12345678"),
                new AppProperties.Storage(dir.toString(), 500),
                new AppProperties.Cors(List.of()),
                new AppProperties.Login(5, Duration.ofMinutes(15)));
        storage = new ImageStorageService(props);
    }

    private static byte[] encode(String format, BufferedImage img) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    private static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("file", "x.png", "image/png", bytes);
    }

    @Test
    @DisplayName("grava com nome UUID e remove metadados; arquivo passa a existir")
    void storesWithRandomName() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(50, 50, BufferedImage.TYPE_INT_RGB))));

        assertThat(name).matches(ImageStorageService.FILENAME.pattern());
        assertThat(storage.exists(name)).isTrue();
        assertThat(Files.exists(dir.resolve(name))).isTrue();
    }

    @Test
    @DisplayName("reduz imagens maiores que o limite mantendo a proporção")
    void shrinks() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(1000, 400, BufferedImage.TYPE_INT_RGB))));
        BufferedImage stored = ImageIO.read(dir.resolve(name).toFile());
        assertThat(stored.getWidth()).isEqualTo(500);
        assertThat(stored.getHeight()).isEqualTo(200);
    }

    @Test
    @DisplayName("não amplia imagens pequenas")
    void doesNotEnlarge() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(120, 80, BufferedImage.TYPE_INT_RGB))));
        BufferedImage stored = ImageIO.read(dir.resolve(name).toFile());
        assertThat(stored.getWidth()).isEqualTo(120);
    }

    @Test
    @DisplayName("JPEG em escala de cinza é convertido sem erro")
    void grayscale() throws IOException {
        String name = storage.store(file(encode("jpg", new BufferedImage(60, 60, BufferedImage.TYPE_BYTE_GRAY))));
        assertThat(name).endsWith(".jpg");
    }

    @Test
    @DisplayName("rejeita vazio, nulo, texto, GIF e arquivo truncado")
    void rejectsInvalid() throws IOException {
        assertThatThrownBy(() -> storage.store(null)).isInstanceOf(InvalidImageException.class);
        assertThatThrownBy(() -> storage.store(file(new byte[0]))).isInstanceOf(InvalidImageException.class);
        assertThatThrownBy(() -> storage.store(file("oi".getBytes()))).isInstanceOf(InvalidImageException.class);
        byte[] gif = encode("gif", new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB));
        assertThatThrownBy(() -> storage.store(file(gif))).isInstanceOf(InvalidImageException.class)
                .hasMessageContaining("JPG ou PNG");
        byte[] png = encode("png", new BufferedImage(200, 200, BufferedImage.TYPE_INT_RGB));
        byte[] truncated = java.util.Arrays.copyOf(png, 30);
        assertThatThrownBy(() -> storage.store(file(truncated))).isInstanceOf(InvalidImageException.class);
        assertThat(dir).isEmptyDirectory();
    }

    @Test
    @DisplayName("resolve só aceita nomes no formato esperado (anti path traversal)")
    void resolveGuards() {
        assertThat(storage.resolve("../etc/passwd")).isNull();
        assertThat(storage.resolve("..\\x.jpg")).isNull();
        assertThat(storage.resolve(null)).isNull();
        assertThat(storage.resolve("11111111-1111-1111-1111-111111111111.jpg")).isNotNull();
        assertThat(storage.exists("../x")).isFalse();
    }

    @Test
    @DisplayName("delete remove o arquivo e ignora nomes inválidos ou inexistentes")
    void delete() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB))));
        storage.delete("../fora");
        storage.delete("11111111-1111-1111-1111-111111111111.jpg");
        storage.delete(name);
        assertThat(storage.exists(name)).isFalse();
    }

    @Test
    @DisplayName("deleteAfterCommit sem transação apaga na hora")
    void deleteAfterCommitWithoutTransaction() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB))));
        storage.deleteAfterCommit(name);
        assertThat(storage.exists(name)).isFalse();
    }
}
