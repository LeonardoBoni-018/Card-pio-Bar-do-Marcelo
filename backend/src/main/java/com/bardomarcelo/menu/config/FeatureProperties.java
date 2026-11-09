package com.bardomarcelo.menu.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Chaves de funcionalidades em construção (prefixo {@code app.features}).
 *
 * <p>Tudo começa DESLIGADO: código novo pode chegar à produção sem aparecer para ninguém até a chave
 * ser ligada por variável de ambiente (ex.: {@code APP_FEATURE_COMANDAS=true}).
 *
 * @param comandas pedidos/comandas dos garçons (ver docs/comandas/ESCOPO.md)
 */
@ConfigurationProperties("app.features")
public record FeatureProperties(@DefaultValue("false") boolean comandas) {}
