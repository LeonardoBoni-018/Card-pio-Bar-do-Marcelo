package com.bardomarcelo.menu.category;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "o nome é obrigatório") @Size(max = 60, message = "máximo de 60 caracteres") String name,
        @Min(value = 0, message = "a ordem não pode ser negativa") Integer displayOrder) {
}
