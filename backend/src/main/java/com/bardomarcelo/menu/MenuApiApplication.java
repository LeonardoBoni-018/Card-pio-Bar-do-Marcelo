package com.bardomarcelo.menu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
public class MenuApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(MenuApiApplication.class, args);
    }
}
