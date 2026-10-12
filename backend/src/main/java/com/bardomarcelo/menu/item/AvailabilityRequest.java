package com.bardomarcelo.menu.item;

import jakarta.validation.constraints.NotNull;

public record AvailabilityRequest(@NotNull(message = "informe se o item está disponível") Boolean available) {
}
