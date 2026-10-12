package com.bardomarcelo.menu.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

@DisplayName("DatabaseUrlEnvironmentPostProcessor (string de conexão do Neon)")
class DatabaseUrlEnvironmentPostProcessorTest {

    private final DatabaseUrlEnvironmentPostProcessor processor = new DatabaseUrlEnvironmentPostProcessor();

    private StandardEnvironment process(String url) {
        StandardEnvironment env = new StandardEnvironment();
        if (url != null) {
            env.getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                    "spring.datasource.url", url, "spring.datasource.username", "original")));
        }
        processor.postProcessEnvironment(env, new SpringApplication());
        return env;
    }

    @Test
    @DisplayName("converte a URL do Neon em JDBC, extrai usuário/senha e remove channel_binding")
    void convertsNeonUrl() {
        var env = process("postgresql://marcelo:p%40ss%3Aword@ep-cool-123.us-east-2.aws.neon.tech/menu?sslmode=require&channel_binding=require");

        assertThat(env.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://ep-cool-123.us-east-2.aws.neon.tech/menu?sslmode=require");
        assertThat(env.getProperty("spring.datasource.username")).isEqualTo("marcelo");
        assertThat(env.getProperty("spring.datasource.password")).isEqualTo("p@ss:word");
    }

    @Test
    @DisplayName("aceita o esquema postgres:// e porta explícita")
    void acceptsPostgresSchemeAndPort() {
        var env = process("postgres://u:s@db.example.com:5433/app");
        assertThat(env.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://db.example.com:5433/app?sslmode=require");
    }

    @Test
    @DisplayName("hosts remotos sem sslmode recebem sslmode=require; localhost não")
    void sslDefaults() {
        assertThat(process("postgresql://u:s@neon.example/db").getProperty("spring.datasource.url")).contains("sslmode=require");
        assertThat(process("postgresql://u:s@localhost:5432/db").getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:postgresql://localhost:5432/db");
    }

    @Test
    @DisplayName("sem credenciais na URL mantém usuário/senha já configurados")
    void keepsConfiguredCredentials() {
        var env = process("postgresql://host.example/db?sslmode=require");
        assertThat(env.getProperty("spring.datasource.username")).isEqualTo("original");
    }

    @Test
    @DisplayName("URL jdbc: ou ausente não é alterada")
    void leavesJdbcUrlAlone() {
        var env = process("jdbc:postgresql://host/db?sslmode=require");
        assertThat(env.getProperty("spring.datasource.url")).isEqualTo("jdbc:postgresql://host/db?sslmode=require");
        assertThat(process(null).getProperty("spring.datasource.url")).isNull();
    }
}
