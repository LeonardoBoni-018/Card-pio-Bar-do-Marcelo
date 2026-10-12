package com.bardomarcelo.menu.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

@Configuration
public class HttpCacheConfig {

    /** ETag no cardápio público: clientes revalidam e recebem 304 sem corpo quando nada mudou. */
    @Bean
    FilterRegistrationBean<ShallowEtagHeaderFilter> menuEtagFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> reg = new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        reg.addUrlPatterns("/api/menu", "/api/items/*");
        reg.setName("menuEtagFilter");
        return reg;
    }
}
