package com.mygutachter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class MyGutachterApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyGutachterApplication.class, args);
    }
}
