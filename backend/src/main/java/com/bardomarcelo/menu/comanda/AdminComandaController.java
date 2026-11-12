package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.comanda.ComandaDtos.CancelRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.ComandaListItem;
import com.bardomarcelo.menu.comanda.ComandaDtos.ComandaResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Proprietário: acompanha as comandas e corrige (reabrir conta fechada, cancelar). */
@RestController
@RequestMapping("/api/admin/comandas")
@SecurityRequirement(name = "bearer-jwt")
@ComandasEnabled
public class AdminComandaController {

    private final ComandaService service;

    public AdminComandaController(ComandaService service) {
        this.service = service;
    }

    /** Sem datas = o dia de hoje no bar. Período máximo de 93 dias. */
    @GetMapping
    public List<ComandaListItem> list(@RequestParam(required = false) List<ComandaStatus> status,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        LocalDate today = ComandaService.businessDay(Instant.now());
        LocalDate from = de == null ? today : de;
        LocalDate to = ate == null ? from.isAfter(today) ? from : today : ate;
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 92) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Período inválido (máximo de 93 dias).");
        }
        return service.search(status, from, to);
    }

    @PostMapping("/{id}/reabrir")
    public ComandaResponse reopen(@PathVariable Long id) {
        return service.reopen(id);
    }

    @PostMapping("/{id}/cancelar")
    public ComandaResponse cancel(@PathVariable Long id, @Valid @RequestBody(required = false) CancelRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.cancel(id, request == null ? null : request.reason(), jwt.getSubject());
    }
}
