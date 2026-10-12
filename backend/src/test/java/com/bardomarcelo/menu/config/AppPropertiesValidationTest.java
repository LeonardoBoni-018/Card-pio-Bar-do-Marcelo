package com.bardomarcelo.menu.config;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("AppProperties (falha rápido com configuração insegura)")
class AppPropertiesValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private AppProperties props(String secret, String adminPassword) {
        return new AppProperties(
                new AppProperties.Jwt(secret, Duration.ofHours(1)),
                new AppProperties.Admin("admin", adminPassword),
                new AppProperties.Storage("uploads", 1200),
                new AppProperties.Cors(List.of("http://localhost:5173")),
                new AppProperties.Login(5, Duration.ofMinutes(15)));
    }

    @Test
    @DisplayName("configuração válida passa")
    void valid() {
        assertThat(validator.validate(props("s".repeat(32), "senha-forte-123"))).isEmpty();
    }

    @Test
    @DisplayName("segredo JWT curto é rejeitado")
    void shortSecret() {
        assertThat(validator.validate(props("curto", "senha-forte-123"))).isNotEmpty();
    }

    @Test
    @DisplayName("senha do admin curta é rejeitada")
    void shortPassword() {
        assertThat(validator.validate(props("s".repeat(32), "123"))).isNotEmpty();
    }
}
