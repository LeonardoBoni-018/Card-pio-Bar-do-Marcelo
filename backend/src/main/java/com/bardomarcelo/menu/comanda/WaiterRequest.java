package com.bardomarcelo.menu.comanda;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Cadastro/edição de garçom. Na criação a senha é obrigatória; na edição, vazia = mantém a atual.
 * "ativo" vazio = ativo.
 */
public record WaiterRequest(
        @NotBlank(message = "o nome é obrigatório") @Size(max = 60, message = "máximo de 60 caracteres") String name,
        @NotBlank(message = "o usuário é obrigatório")
        @Pattern(regexp = "^\\s*[A-Za-z0-9._-]{3,30}\\s*$", message = "use de 3 a 30 letras, números, ponto, hífen ou sublinhado, sem espaços")
        String username,
        @Size(min = 6, max = 100, message = "a senha precisa ter de 6 a 100 caracteres") String password,
        Boolean active) {
}
