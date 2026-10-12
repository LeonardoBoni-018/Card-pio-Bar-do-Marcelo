package com.bardomarcelo.menu.auth;

import com.bardomarcelo.menu.common.InvalidCredentialsException;
import com.bardomarcelo.menu.common.TooManyAttemptsException;
import com.bardomarcelo.menu.config.AppProperties;
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

    private final AdminUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwtEncoder;
    private final LoginRateLimiter limiter;
    private final Duration ttl;
    /** Hash descartável: mantém o tempo de resposta igual para usuário inexistente. */
    private final String dummyHash;

    AuthService(AdminUserRepository users, PasswordEncoder encoder, JwtEncoder jwtEncoder,
                LoginRateLimiter limiter, AppProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.jwtEncoder = jwtEncoder;
        this.limiter = limiter;
        this.ttl = props.jwt().ttl();
        this.dummyHash = encoder.encode("dummy-password");
    }

    public TokenResponse login(LoginRequest request, String clientKey) {
        if (limiter.isBlocked(clientKey)) {
            throw new TooManyAttemptsException();
        }
        AdminUser user = users.findByUsername(request.username()).orElse(null);
        boolean ok = encoder.matches(request.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !ok) {
            limiter.recordFailure(clientKey);
            throw new InvalidCredentialsException();
        }
        limiter.reset(clientKey);
        return issueToken(user.getUsername());
    }

    private TokenResponse issueToken(String username) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(username)
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("roles", List.of(SecurityConfig.ROLE_ADMIN))
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new TokenResponse(token, "Bearer", ttl.toSeconds());
    }
}
