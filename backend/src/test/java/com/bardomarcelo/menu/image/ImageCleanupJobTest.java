package com.bardomarcelo.menu.image;

import static org.assertj.core.api.Assertions.assertThat;

import com.bardomarcelo.menu.category.Category;
import com.bardomarcelo.menu.category.CategoryRepository;
import com.bardomarcelo.menu.item.MenuItem;
import com.bardomarcelo.menu.item.MenuItemRepository;
import java.math.BigDecimal;
import java.time.Instant;
import com.bardomarcelo.menu.config.AppProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@EnableConfigurationProperties(AppProperties.class)
@Import(ImageCleanupJob.class)
@DisplayName("ImageCleanupJob")
class ImageCleanupJobTest {

    private static final String USED = "11111111-1111-1111-1111-111111111111.jpg";
    private static final String OLD_ORPHAN = "22222222-2222-2222-2222-222222222222.jpg";
    private static final String NEW_ORPHAN = "33333333-3333-3333-3333-333333333333.jpg";

    @Autowired ImageCleanupJob job;
    @Autowired StoredImageRepository images;
    @Autowired CategoryRepository categories;
    @Autowired MenuItemRepository items;

    private void save(String name, Instant createdAt) {
        images.save(new StoredImage(name, "image/jpeg", new byte[] {1, 2, 3}, createdAt));
    }

    @Test
    @DisplayName("remove só fotos antigas que nenhum item usa")
    void removesOnlyOldOrphans() {
        Instant old = Instant.now().minus(ImageCleanupJob.GRACE_PERIOD).minusSeconds(60);
        save(USED, old);
        save(OLD_ORPHAN, old);
        save(NEW_ORPHAN, Instant.now());
        Category c = categories.save(new Category("Cervejas", 1));
        items.save(new MenuItem("Chopp", "", new BigDecimal("8.50"), USED, true, false, c));

        int removed = job.deleteOrphans();

        assertThat(removed).isEqualTo(1);
        assertThat(images.findAll()).extracting(StoredImage::getFilename).containsExactlyInAnyOrder(USED, NEW_ORPHAN);
    }

    @Test
    @DisplayName("sem órfãs não remove nada")
    void nothingToRemove() {
        assertThat(job.deleteOrphans()).isZero();
    }
}
