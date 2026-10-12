package com.bardomarcelo.menu.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.StringJoiner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Neon (e Render/Heroku) entregam a conexão como {@code postgresql://usuario:senha@host/banco?sslmode=require},
 * formato que o driver JDBC não entende. Este processador converte para {@code jdbc:postgresql://host/banco?sslmode=require}
 * e extrai usuário/senha, para que bastar colar a string do provedor em {@code DB_URL}.
 * URLs que já começam com {@code jdbc:} não são alteradas.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String URL_PROPERTY = "spring.datasource.url";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty(URL_PROPERTY);
        if (url == null || !(url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
            return;
        }
        Map<String, Object> converted = convert(url);
        environment.getPropertySources().addFirst(new MapPropertySource("databaseUrlConversion", converted));
    }

    static Map<String, Object> convert(String url) {
        URI uri = URI.create(url);
        Map<String, Object> props = new LinkedHashMap<>();
        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
        if (uri.getPort() > 0) {
            jdbc.append(':').append(uri.getPort());
        }
        jdbc.append(uri.getPath() == null ? "" : uri.getPath());

        StringJoiner query = new StringJoiner("&");
        boolean hasSsl = false;
        if (uri.getRawQuery() != null) {
            for (String pair : uri.getRawQuery().split("&")) {
                String key = pair.split("=", 2)[0];
                if (key.equals("channel_binding")) {
                    continue; // parâmetro do libpq que o driver JDBC não usa
                }
                hasSsl |= key.equals("sslmode");
                query.add(pair);
            }
        }
        if (!hasSsl && !isLocal(uri.getHost())) {
            query.add("sslmode=require");
        }
        if (query.length() > 0) {
            jdbc.append('?').append(query);
        }
        props.put(URL_PROPERTY, jdbc.toString());

        if (uri.getRawUserInfo() != null) {
            String[] credentials = uri.getRawUserInfo().split(":", 2);
            props.put("spring.datasource.username", decode(credentials[0]));
            if (credentials.length > 1) {
                props.put("spring.datasource.password", decode(credentials[1]));
            }
        }
        return props;
    }

    private static boolean isLocal(String host) {
        return "localhost".equals(host) || "127.0.0.1".equals(host);
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE; // depois de application.yml e das variáveis de ambiente
    }
}
