package com.bardomarcelo.menu.auth;

import com.bardomarcelo.menu.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Garante o usuário proprietário a partir das variáveis de ambiente (nada de senha no código). */
@Component
class AdminUserInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);

    private final AdminUserRepository users;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    AdminUserInitializer(AdminUserRepository users, PasswordEncoder encoder, AppProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String username = props.admin().username();
        String password = props.admin().password();
        users.findByUsername(username).ifPresentOrElse(user -> {
            if (!encoder.matches(password, user.getPasswordHash())) {
                user.setPasswordHash(encoder.encode(password));
                log.info("Senha do usuário '{}' atualizada a partir da configuração", username);
            }
        }, () -> {
            users.save(new AdminUser(username, encoder.encode(password)));
            log.info("Usuário proprietário '{}' criado", username);
        });
    }
}
