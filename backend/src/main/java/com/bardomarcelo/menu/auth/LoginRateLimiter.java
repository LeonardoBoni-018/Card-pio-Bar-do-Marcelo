package com.bardomarcelo.menu.auth;

import com.bardomarcelo.menu.config.AppProperties;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/** Bloqueia por IP após N falhas de login dentro da janela, contra força bruta. */
@Component
class LoginRateLimiter {

    private final Cache<String, AtomicInteger> failures;
    private final int maxFailures;

    LoginRateLimiter(AppProperties props) {
        this.maxFailures = props.login().maxFailures();
        this.failures = Caffeine.newBuilder()
                .expireAfterWrite(props.login().blockDuration())
                .maximumSize(10_000)
                .build();
    }

    boolean isBlocked(String key) {
        AtomicInteger count = failures.getIfPresent(key);
        return count != null && count.get() >= maxFailures;
    }

    void recordFailure(String key) {
        failures.get(key, k -> new AtomicInteger()).incrementAndGet();
    }

    void reset(String key) {
        failures.invalidate(key);
    }
}
