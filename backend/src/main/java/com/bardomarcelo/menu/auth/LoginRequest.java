package com.bardomarcelo.menu.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "informe o usuário") @Size(max = 60, message = "máximo de 60 caracteres") String username,
        @NotBlank(message = "informe a senha") @Size(max = 100, message = "máximo de 100 caracteres") String password) {
}
