package com.bardomarcelo.menu.item;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ItemRequest(
        @NotBlank(message = "o nome é obrigatório") @Size(max = 100, message = "máximo de 100 caracteres") String name,
        @Size(max = 500, message = "máximo de 500 caracteres") String description,
        @NotNull(message = "o preço é obrigatório")
        @DecimalMin(value = "0.00", message = "o preço não pode ser negativo")
        @Digits(integer = 8, fraction = 2, message = "use no máximo 2 casas decimais") BigDecimal price,
        @NotNull(message = "a categoria é obrigatória") Long categoryId,
        @Pattern(regexp = "^[0-9a-f-]{36}\\.(jpg|png)$", message = "nome de imagem inválido") String imageFilename,
        Boolean available,
        Boolean featured) {
}
