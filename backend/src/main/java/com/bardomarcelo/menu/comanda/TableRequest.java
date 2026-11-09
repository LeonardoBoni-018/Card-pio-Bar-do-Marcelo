package com.bardomarcelo.menu.comanda;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Criar/editar mesa. Ordem vazia = 0; "ativa" vazio = ativa. */
public record TableRequest(
        @NotBlank(message = "o nome é obrigatório") @Size(max = 40, message = "máximo de 40 caracteres") String name,
        @Min(value = 0, message = "a ordem não pode ser negativa") Integer displayOrder,
        Boolean active) {
}
