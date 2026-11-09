package com.bardomarcelo.menu.comanda;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

/**
 * Marca beans (controllers, services, jobs) do módulo de comandas: eles só existem quando
 * {@code app.features.comandas=true}. Com a chave desligada os endpoints nem são registrados (404).
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@ConditionalOnProperty(name = "app.features.comandas", havingValue = "true")
public @interface ComandasEnabled {}
