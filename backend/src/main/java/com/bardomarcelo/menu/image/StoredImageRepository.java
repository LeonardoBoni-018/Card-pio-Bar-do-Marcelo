package com.bardomarcelo.menu.image;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StoredImageRepository extends JpaRepository<StoredImage, String> {

    /** Fotos enviadas mas nunca usadas por nenhum item (upload abandonado). */
    @Modifying
    @Query("""
            delete from StoredImage i
            where i.createdAt < :cutoff
              and not exists (select 1 from MenuItem m where m.imageFilename = i.filename)
            """)
    int deleteOrphansCreatedBefore(@Param("cutoff") Instant cutoff);
}
