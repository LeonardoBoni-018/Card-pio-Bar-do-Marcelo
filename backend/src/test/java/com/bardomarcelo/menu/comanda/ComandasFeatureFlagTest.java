package com.bardomarcelo.menu.comanda;

import static org.assertj.core.api.Assertions.assertThat;

import com.bardomarcelo.menu.config.FeatureProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@DisplayName("Chave da funcionalidade de comandas")
class ComandasFeatureFlagTest {

    static class BeanDoModulo {}

    @Configuration
    @EnableConfigurationProperties(FeatureProperties.class)
    static class Config {
        @Bean
        @ComandasEnabled
        BeanDoModulo beanDoModulo() {
            return new BeanDoModulo();
        }
    }

    private final ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(Config.class);

    @Test
    @DisplayName("vem desligada por padrão e o módulo não é carregado")
    void offByDefault() {
        runner.run(ctx -> {
            assertThat(ctx.getBean(FeatureProperties.class).comandas()).isFalse();
            assertThat(ctx).doesNotHaveBean(BeanDoModulo.class);
        });
    }

    @Test
    @DisplayName("ligada pela propriedade, o módulo é carregado")
    void onWhenEnabled() {
        runner.withPropertyValues("app.features.comandas=true").run(ctx -> {
            assertThat(ctx.getBean(FeatureProperties.class).comandas()).isTrue();
            assertThat(ctx).hasSingleBean(BeanDoModulo.class);
        });
    }
}
