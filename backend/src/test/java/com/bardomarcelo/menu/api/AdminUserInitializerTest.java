package com.bardomarcelo.menu.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.bardomarcelo.menu.auth.AdminUser;
import com.bardomarcelo.menu.auth.AdminUserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

@DisplayName("Usuário proprietário criado a partir da configuração")
class AdminUserInitializerTest extends ApiTestSupport {

    @Autowired AdminUserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired ApplicationRunner adminUserInitializer;

    @Test
    @DisplayName("senha é guardada com BCrypt, nunca em texto puro")
    void passwordIsHashed() {
        AdminUser admin = users.findByUsername("admin").orElseThrow();
        assertThat(admin.getPasswordHash()).startsWith("$2").isNotEqualTo("admin12345");
        assertThat(encoder.matches("admin12345", admin.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("rodar de novo não duplica e re-sincroniza a senha alterada")
    void idempotentAndResyncsPassword() throws Exception {
        AdminUser admin = users.findByUsername("admin").orElseThrow();
        admin.setPasswordHash(encoder.encode("outra-senha"));
        users.save(admin);

        adminUserInitializer.run(new DefaultApplicationArguments());

        assertThat(users.count()).isEqualTo(1);
        assertThat(encoder.matches("admin12345", users.findByUsername("admin").orElseThrow().getPasswordHash())).isTrue();
    }
}
