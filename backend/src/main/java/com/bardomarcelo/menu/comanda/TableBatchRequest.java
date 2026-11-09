package com.bardomarcelo.menu.comanda;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cria várias mesas numeradas de uma vez: "Mesa 1" até "Mesa N" (as que já existem são puladas). */
public record TableBatchRequest(
        @NotNull(message = "informe a quantidade") @Min(value = 1, message = "mínimo de 1 mesa") @Max(value = 100, message = "máximo de 100 mesas") Integer quantity,
        @Size(max = 30, message = "máximo de 30 caracteres") String prefix) {
}
