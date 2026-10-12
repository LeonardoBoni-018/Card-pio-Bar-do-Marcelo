package com.bardomarcelo.menu.api;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.category.CategoryRepository;
import com.bardomarcelo.menu.image.ImageStorageService;
import com.bardomarcelo.menu.image.StoredImageRepository;
import com.bardomarcelo.menu.item.MenuItem;
import com.bardomarcelo.menu.item.MenuItemRepository;
import com.bardomarcelo.menu.menu.MenuService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Base dos testes de integração: sobe a aplicação inteira (H2 + Flyway) e limpa os dados a cada teste. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class ApiTestSupport {

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected CategoryRepository categories;
    @Autowired protected MenuItemRepository items;
    @Autowired protected CacheManager cacheManager;
    @Autowired protected JwtEncoder jwtEncoder;
    @Autowired protected ImageStorageService images;
    @Autowired protected StoredImageRepository storedImages;

    @BeforeEach
    void cleanDatabase() {
        items.deleteAll();
        storedImages.deleteAll();
        categories.deleteAll();
        cacheManager.getCache(MenuService.CACHE).clear();
    }

    protected String bearer() {
        return "Bearer " + token("admin", List.of("ADMIN"), Instant.now().plusSeconds(600));
    }

    protected String token(String subject, List<String> roles, Instant expiresAt) {
        Instant issuedAt = expiresAt.minusSeconds(60);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(subject).issuedAt(issuedAt).expiresAt(expiresAt).claim("roles", roles).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    protected Category category(String name, int order) {
        return categories.save(new Category(name, order));
    }

    protected MenuItem item(String name, String price, Category category, boolean available, boolean featured) {
        return items.save(new MenuItem(name, "desc " + name, new BigDecimal(price), null, available, featured, category));
    }

    protected Map<String, Object> itemBody(String name, Object price, Long categoryId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("description", "Descrição de " + name);
        body.put("price", price);
        body.put("categoryId", categoryId);
        return body;
    }

    protected String write(Object body) {
        try {
            return json.writeValueAsString(body);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    protected static byte[] image(String format, int width, int height, boolean alpha) {
        BufferedImage img = new BufferedImage(width, height, alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < width; x += 8) {
            for (int y = 0; y < height; y += 8) {
                img.setRGB(x, y, alpha ? 0x80FF6600 : 0xF26B1D);
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            ImageIO.write(img, format, out);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }
}
