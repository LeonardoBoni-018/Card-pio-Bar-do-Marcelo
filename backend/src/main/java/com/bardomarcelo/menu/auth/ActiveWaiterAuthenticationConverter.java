package com.bardomarcelo.menu.auth;

import com.bardomarcelo.menu.config.SecurityConfig;
import java.util.List;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

/**
 * Token de garçom só vale enquanto o garçom existir e estiver ativo: desativar alguém no painel corta o acesso
 * na hora, sem esperar o token expirar. Tokens do proprietário seguem como antes (sem consulta ao banco).
 */
public class ActiveWaiterAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final Converter<Jwt, ? extends AbstractAuthenticationToken> delegate;
    private final AppUserRepository users;

    public ActiveWaiterAuthenticationConverter(Converter<Jwt, ? extends AbstractAuthenticationToken> delegate, AppUserRepository users) {
        this.delegate = delegate;
        this.users = users;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList(SecurityConfig.ROLES_CLAIM);
        if (roles != null && roles.contains(SecurityConfig.ROLE_GARCOM) && !isActiveWaiter(jwt)) {
            throw new InvalidBearerTokenException("Usuário desativado.");
        }
        return delegate.convert(jwt);
    }

    private boolean isActiveWaiter(Jwt jwt) {
        Object uid = jwt.getClaim(SecurityConfig.USER_ID_CLAIM);
        if (!(uid instanceof Number id)) return false;
        return users.findById(id.longValue())
                .filter(u -> u.isActive() && u.getRole() == UserRole.GARCOM && u.getUsername().equals(jwt.getSubject()))
                .isPresent();
    }
}
