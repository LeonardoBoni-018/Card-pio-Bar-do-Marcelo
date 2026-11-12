package com.bardomarcelo.menu.comanda;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Relatórios de vendas (contas fechadas) por período. Sem datas = hoje no bar. Máximo de 366 dias. */
@RestController
@RequestMapping("/api/admin/relatorios")
@SecurityRequirement(name = "bearer-jwt")
@ComandasEnabled
public class AdminReportController {

    private final ReportService service;

    public AdminReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping
    public ReportService.Summary summary(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        LocalDate[] p = period(de, ate);
        return service.summary(p[0], p[1]);
    }

    @GetMapping("/planilha")
    public ResponseEntity<byte[]> csv(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        LocalDate[] p = period(de, ate);
        String name = "vendas-" + p[0] + (p[0].equals(p[1]) ? "" : "-a-" + p[1]) + ".csv";
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"")
                .body(service.csv(p[0], p[1]).getBytes(StandardCharsets.UTF_8));
    }

    private static LocalDate[] period(LocalDate de, LocalDate ate) {
        LocalDate today = ReportService.businessDay(Instant.now());
        LocalDate from = de == null ? today : de;
        LocalDate to = ate == null ? from : ate;
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 365) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Período inválido (máximo de 1 ano).");
        }
        return new LocalDate[] {from, to};
    }
}
