package com.bardomarcelo.menu.image;

import com.bardomarcelo.menu.common.NotFoundException;
import com.bardomarcelo.menu.item.MenuItem;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.net.URI;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ImageController {

    private static final CacheControl IMMUTABLE = CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();

    private final ImageStorageService storage;

    public ImageController(ImageStorageService storage) {
        this.storage = storage;
    }

    @PostMapping(value = "/api/admin/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @SecurityRequirement(name = "bearer-jwt")
    public ResponseEntity<ImageResponse> upload(@RequestParam("file") MultipartFile file) {
        String filename = storage.store(file);
        String url = MenuItem.IMAGE_URL_PREFIX + filename;
        return ResponseEntity.created(URI.create(url)).body(new ImageResponse(filename, url));
    }

    /**
     * Nomes são UUIDs e o conteúdo nunca muda, então navegador e CDN (Vercel) podem guardar por muito tempo;
     * revalidações respondem 304 sem nem consultar o banco. {@code ?size=thumb} devolve a miniatura (listas no celular).
     */
    @GetMapping("/api/images/{filename}")
    public ResponseEntity<byte[]> download(@PathVariable String filename,
                                           @RequestParam(required = false) String size, WebRequest request) {
        if (!ImageStorageService.isValidName(filename)) {
            throw new NotFoundException("Imagem não encontrada.");
        }
        boolean thumb = "thumb".equals(size);
        String etag = "\"" + filename + (thumb ? "-thumb" : "") + "\"";
        if (request.checkNotModified(etag)) {
            return null; // 304 já enviado
        }
        StoredImage image = storage.find(filename).orElseThrow(() -> new NotFoundException("Imagem não encontrada."));
        byte[] body = thumb && image.getThumbnail() != null ? image.getThumbnail() : image.getData();
        return ResponseEntity.ok()
                .cacheControl(IMMUTABLE)
                .eTag(etag)
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .body(body);
    }
}
