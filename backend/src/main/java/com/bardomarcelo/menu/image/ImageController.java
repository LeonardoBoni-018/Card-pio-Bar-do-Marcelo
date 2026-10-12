package com.bardomarcelo.menu.image;

import com.bardomarcelo.menu.common.NotFoundException;
import com.bardomarcelo.menu.item.MenuItem;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.nio.file.Path;
import java.time.Duration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ImageController {

    private final ImageStorageService storage;

    public ImageController(ImageStorageService storage) {
        this.storage = storage;
    }

    @PostMapping(value = "/api/admin/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @SecurityRequirement(name = "bearer-jwt")
    public ResponseEntity<ImageResponse> upload(@RequestParam("file") MultipartFile file) {
        String filename = storage.store(file);
        String url = MenuItem.IMAGE_URL_PREFIX + filename;
        return ResponseEntity.created(java.net.URI.create(url)).body(new ImageResponse(filename, url));
    }

    /** Nomes são UUIDs e nunca mudam de conteúdo, então o navegador pode guardar por muito tempo. */
    @GetMapping("/api/images/{filename}")
    public ResponseEntity<Resource> download(@PathVariable String filename) {
        Path path = storage.resolve(filename);
        if (path == null || !storage.exists(filename)) {
            throw new NotFoundException("Imagem não encontrada.");
        }
        MediaType type = filename.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .contentType(type)
                .body(new FileSystemResource(path));
    }
}
