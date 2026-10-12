package com.bardomarcelo.menu.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Configurações tipadas da aplicação (prefixo {@code app}). Falha na inicialização se algo estiver inválido. */
@Validated
@ConfigurationProperties("app")
public record AppProperties(
        @Valid @NotNull Jwt jwt,
        @Valid @NotNull Admin admin,
        @Valid @NotNull Storage storage,
        @Valid @NotNull Cors cors,
        @Valid @NotNull Login login) {

    public record Jwt(@NotBlank @Size(min = 32, message = "o segredo JWT precisa ter ao menos 32 caracteres") String secret,
                      @NotNull Duration ttl) {}

    public record Admin(@NotBlank String username,
                        @NotBlank @Size(min = 8, message = "a senha do admin precisa ter ao menos 8 caracteres") String password) {}

    public record Storage(@NotBlank String dir, @Min(200) int maxDimension) {}

    public record Cors(@NotNull List<String> allowedOrigins) {}

    public record Login(@Min(1) int maxFailures, @NotNull Duration blockDuration) {}
}
