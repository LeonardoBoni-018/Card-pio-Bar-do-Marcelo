package com.bardomarcelo.menu.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.bardomarcelo.menu.common.InvalidImageException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import com.bardomarcelo.menu.config.AppProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@ActiveProfiles("test")
@EnableConfigurationProperties(AppProperties.class)
@Import(ImageStorageService.class)
@DisplayName("ImageStorageService (armazenamento no banco)")
class ImageStorageServiceTest {

    @Autowired ImageStorageService storage;
    @Autowired StoredImageRepository repository;

    private static byte[] encode(String format, BufferedImage img) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    private static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("file", "x.png", "image/png", bytes);
    }

    private static BufferedImage decode(byte[] data) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(data));
    }

    @Test
    @DisplayName("grava no banco com nome UUID e content-type correto")
    void storesInDatabase() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(50, 50, BufferedImage.TYPE_INT_RGB))));

        assertThat(name).matches(ImageStorageService.FILENAME.pattern()).endsWith(".jpg");
        StoredImage stored = storage.find(name).orElseThrow();
        assertThat(stored.getContentType()).isEqualTo("image/jpeg");
        assertThat(stored.getData()).isNotEmpty();
        assertThat(storage.exists(name)).isTrue();
    }

    @Test
    @DisplayName("gera miniatura de até 480 px, menor que a foto inteira")
    void createsThumbnail() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(3000, 1500, BufferedImage.TYPE_INT_RGB))));
        StoredImage stored = storage.find(name).orElseThrow();
        BufferedImage thumb = decode(stored.getThumbnail());
        assertThat(thumb.getWidth()).isEqualTo(480);
        assertThat(thumb.getHeight()).isEqualTo(240);
        assertThat(stored.getThumbnail().length).isLessThan(stored.getData().length);
    }

    @Test
    @DisplayName("foto já pequena não precisa de miniatura própria")
    void smallPhotoHasNoThumbnail() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(300, 200, BufferedImage.TYPE_INT_RGB))));
        assertThat(storage.find(name).orElseThrow().getThumbnail()).isNull();
    }

    @Test
    @DisplayName("PNG com transparência é mantido como PNG")
    void keepsAlphaAsPng() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(40, 40, BufferedImage.TYPE_INT_ARGB))));
        assertThat(name).endsWith(".png");
        assertThat(storage.find(name).orElseThrow().getContentType()).isEqualTo("image/png");
    }

    @Test
    @DisplayName("reduz imagens maiores que o limite mantendo a proporção")
    void shrinks() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(3000, 1500, BufferedImage.TYPE_INT_RGB))));
        BufferedImage stored = decode(storage.find(name).orElseThrow().getData());
        assertThat(stored.getWidth()).isEqualTo(1200);
        assertThat(stored.getHeight()).isEqualTo(600);
    }

    @Test
    @DisplayName("foto muito grande (48 MP) é lida com subamostragem e termina dentro do limite")
    void hugePhotoIsSubsampled() throws IOException {
        // 1-bit por pixel: ~6 MB em memória, mas 48 megapixels "lógicos" — força o caminho de subamostragem
        BufferedImage huge = new BufferedImage(8000, 6000, BufferedImage.TYPE_BYTE_BINARY);
        String name = storage.store(file(encode("png", huge)));
        BufferedImage stored = decode(storage.find(name).orElseThrow().getData());
        assertThat(Math.max(stored.getWidth(), stored.getHeight())).isEqualTo(1200);
    }

    @Test
    @DisplayName("não amplia imagens pequenas")
    void doesNotEnlarge() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(120, 80, BufferedImage.TYPE_INT_RGB))));
        assertThat(decode(storage.find(name).orElseThrow().getData()).getWidth()).isEqualTo(120);
    }

    @Test
    @DisplayName("JPEG em escala de cinza é convertido sem erro")
    void grayscale() throws IOException {
        String name = storage.store(file(encode("jpg", new BufferedImage(60, 60, BufferedImage.TYPE_BYTE_GRAY))));
        assertThat(name).endsWith(".jpg");
    }

    @Test
    @DisplayName("rejeita vazio, nulo, texto, GIF, truncado e resolução absurda — sem gravar nada")
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
        byte[] gigantic = encode("png", new BufferedImage(11000, 11000, BufferedImage.TYPE_BYTE_BINARY));
        assertThatThrownBy(() -> storage.store(file(gigantic))).isInstanceOf(InvalidImageException.class)
                .hasMessageContaining("resolução");
        assertThat(repository.count()).isZero();
    }

    @Test
    @DisplayName("nomes fora do formato esperado nunca chegam ao banco")
    void nameGuards() {
        assertThat(ImageStorageService.isValidName("../etc/passwd")).isFalse();
        assertThat(ImageStorageService.isValidName(null)).isFalse();
        assertThat(ImageStorageService.isValidName("11111111-1111-1111-1111-111111111111.jpg")).isTrue();
        assertThat(storage.find("../x")).isEmpty();
        assertThat(storage.exists("../x")).isFalse();
        storage.delete("../x"); // ignorado
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("delete remove a imagem (em transação própria) e ignora inexistentes")
    void delete() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB))));
        try {
            storage.delete("11111111-1111-1111-1111-111111111111.jpg");
            storage.delete(name);
            assertThat(storage.exists(name)).isFalse();
        } finally {
            repository.deleteAll();
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("deleteAfterCommit sem transação apaga na hora")
    void deleteAfterCommitWithoutTransaction() throws IOException {
        String name = storage.store(file(encode("png", new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB))));
        try {
            storage.deleteAfterCommit(name);
            assertThat(storage.exists(name)).isFalse();
        } finally {
            repository.deleteAll();
        }
    }
}
