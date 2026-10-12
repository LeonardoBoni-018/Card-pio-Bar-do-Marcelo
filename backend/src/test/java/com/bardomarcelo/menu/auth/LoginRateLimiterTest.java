package com.bardomarcelo.menu.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.bardomarcelo.menu.config.AppProperties;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("LoginRateLimiter")
class LoginRateLimiterTest {

    private LoginRateLimiter limiter(int max, Duration window) {
        return new LoginRateLimiter(new AppProperties(
                new AppProperties.Jwt("x".repeat(32), Duration.ofHours(1)),
                new AppProperties.Admin("admin", "12345678"),
                new AppProperties.Storage(1200),
                new AppProperties.Cors(List.of()),
                new AppProperties.Login(max, window)));
    }

    @Test
    @DisplayName("bloqueia só depois de atingir o máximo de falhas, por chave")
    void blocksAtThreshold() {
        LoginRateLimiter limiter = limiter(3, Duration.ofMinutes(5));
        limiter.recordFailure("a");
        limiter.recordFailure("a");
        assertThat(limiter.isBlocked("a")).isFalse();
        limiter.recordFailure("a");
        assertThat(limiter.isBlocked("a")).isTrue();
        assertThat(limiter.isBlocked("b")).isFalse();
    }

    @Test
    @DisplayName("reset libera a chave")
    void resetUnblocks() {
        LoginRateLimiter limiter = limiter(1, Duration.ofMinutes(5));
        limiter.recordFailure("a");
        assertThat(limiter.isBlocked("a")).isTrue();
        limiter.reset("a");
        assertThat(limiter.isBlocked("a")).isFalse();
    }

    @Test
    @DisplayName("o bloqueio expira após a janela")
    void expires() throws InterruptedException {
        LoginRateLimiter limiter = limiter(1, Duration.ofMillis(50));
        limiter.recordFailure("a");
        assertThat(limiter.isBlocked("a")).isTrue();
        Thread.sleep(120);
        assertThat(limiter.isBlocked("a")).isFalse();
    }
}
