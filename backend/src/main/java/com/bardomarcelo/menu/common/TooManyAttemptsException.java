package com.bardomarcelo.menu.common;

public class TooManyAttemptsException extends RuntimeException {
    public TooManyAttemptsException() {
        super("Muitas tentativas de login. Tente novamente mais tarde.");
    }
}
