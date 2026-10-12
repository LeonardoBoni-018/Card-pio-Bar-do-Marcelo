package com.bardomarcelo.menu.image;

import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Evita que uploads abandonados encham o banco (o plano gratuito do Neon tem pouco espaço). */
@Component
class ImageCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(ImageCleanupJob.class);
    static final Duration GRACE_PERIOD = Duration.ofHours(24);

    private final StoredImageRepository images;

    ImageCleanupJob(StoredImageRepository images) {
        this.images = images;
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public int deleteOrphans() {
        int removed = images.deleteOrphansCreatedBefore(Instant.now().minus(GRACE_PERIOD));
        if (removed > 0) {
            log.info("{} imagem(ns) órfã(s) removida(s)", removed);
        }
        return removed;
    }
}
