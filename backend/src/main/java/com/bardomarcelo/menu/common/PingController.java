package com.bardomarcelo.menu.common;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Chamada mais leve possível (sem banco): o painel do proprietário a usa para manter a API acordada no plano gratuito
 * do Render, que a desliga após 15 minutos sem acesso.
 */
@RestController
public class PingController {

    @GetMapping("/api/ping")
    public ResponseEntity<Void> ping() {
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
    }
}
