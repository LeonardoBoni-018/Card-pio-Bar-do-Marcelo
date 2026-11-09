package com.bardomarcelo.menu.auth;

import com.bardomarcelo.menu.common.InvalidCredentialsException;
import com.bardomarcelo.menu.common.TooManyAttemptsException;
import com.bardomarcelo.menu.config.AppProperties;
import com.bardomarcelo.menu.config.FeatureProperties;
import com.bardomarcelo.menu.config.SecurityConfig;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final LoginRateLimiter limiter;
    private final Duration ttl;
    private final FeatureProperties features;
    /** Hash descartável: mantém o tempo de resposta igual para usuário inexistente. */
    private final String dummyHash;

    AuthService(AppUserRepository users, PasswordEncoder encoder, JwtEncoder jwtEncoder,
                LoginRateLimiter limiter, AppProperties props, FeatureProperties features) {
        this.users = users;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.limiter = limiter;
        this.ttl = props.jwt().ttl();
        this.features = features;
        this.dummyHash = encoder.encode("dummy-password");
    }

    public TokenResponse login(LoginRequest request, String clientKey) {
        if (limiter.isBlocked(clientKey)) {
            throw new TooManyAttemptsException();
        }
        AppUser user = users.findByUsername(request.username()).orElse(null);
        boolean ok = encoder.matches(request.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !ok || !canSignIn(user)) {
            limiter.recordFailure(clientKey);
            throw new InvalidCredentialsException();
        }
        limiter.reset(clientKey);
        return issueToken(user);
    }

    /** Garçom desativado, ou com a funcionalidade de comandas desligada, não entra (mesma resposta de senha errada). */
    private boolean canSignIn(AppUser user) {
        if (!user.isActive()) return false;
        return user.getRole() != UserRole.GARCOM || features.comandas();
    }

    private TokenResponse issueToken(AppUser user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(user.getUsername())
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim(SecurityConfig.ROLES_CLAIM, List.of(user.getRole().name()))
                .claim(SecurityConfig.USER_ID_CLAIM, user.getId())
                .claim(SecurityConfig.NAME_CLAIM, user.getDisplayName())
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new TokenResponse(token, "Bearer", ttl.toSeconds());
    }
}
