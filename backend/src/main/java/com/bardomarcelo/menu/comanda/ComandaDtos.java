package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.item.PriceUnit;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Corpos de requisição e respostas da área de comandas. */
public final class ComandaDtos {

    private ComandaDtos() {
    }

    public record OpenComandaRequest(
            @NotNull(message = "escolha a mesa") Long tableId,
            @Size(max = 40, message = "máximo de 40 caracteres") String label,
            @Min(value = 1, message = "mínimo de 1 pessoa") @Max(value = 99, message = "máximo de 99 pessoas") Integer people) {
    }

    public record UpdateComandaRequest(
            @Size(max = 40, message = "máximo de 40 caracteres") String label,
            @Min(value = 1, message = "mínimo de 1 pessoa") @Max(value = 99, message = "máximo de 99 pessoas") Integer people) {
    }

    /**
     * Lançar item. Do cardápio: {@code menuItemId} (nome e preço vêm do cardápio). Avulso: {@code name} + {@code unitPrice}.
     * Quantidade: inteira para itens por unidade; até 3 casas (kg) para itens por quilo.
     */
    public record AddItemRequest(
            Long menuItemId,
            @Size(max = 100, message = "máximo de 100 caracteres") String name,
            @DecimalMin(value = "0.00", message = "o preço não pode ser negativo") @DecimalMax(value = "99999.99", message = "preço alto demais")
            @Digits(integer = 5, fraction = 2, message = "use no máximo 2 casas decimais") BigDecimal unitPrice,
            @NotNull(message = "informe a quantidade") @DecimalMin(value = "0.001", message = "a quantidade precisa ser maior que zero")
            @DecimalMax(value = "999", message = "quantidade alta demais") @Digits(integer = 3, fraction = 3, message = "use no máximo 3 casas decimais")
            BigDecimal quantity,
            @Size(max = 140, message = "máximo de 140 caracteres") String note) {
    }

    public record UpdateItemRequest(
            @NotNull(message = "informe a quantidade") @DecimalMin(value = "0.001", message = "a quantidade precisa ser maior que zero")
            @DecimalMax(value = "999", message = "quantidade alta demais") @Digits(integer = 3, fraction = 3, message = "use no máximo 3 casas decimais")
            BigDecimal quantity,
            @Size(max = 140, message = "máximo de 140 caracteres") String note) {
    }

    public record MoveRequest(@NotNull(message = "escolha a mesa de destino") Long tableId) {
    }

    public record MergeRequest(@NotNull(message = "escolha a comanda a juntar") Long fromComandaId) {
    }

    public record ItemResponse(Long id, Long menuItemId, String name, BigDecimal unitPrice, PriceUnit priceUnit, BigDecimal quantity,
                               BigDecimal lineTotal, String note, boolean custom, String addedBy, Instant addedAt) {
        static ItemResponse from(ComandaItem i) {
            return new ItemResponse(i.getId(), i.getMenuItemId(), i.getName(), i.getUnitPrice(), i.getPriceUnit(), i.getQuantity(), i.lineTotal(),
                    i.getNote(), i.isCustom(), i.getAddedBy().getDisplayName(), i.getAddedAt());
        }
    }

    public record ComandaResponse(Long id, Long tableId, String tableName, String label, ComandaStatus status, Integer people,
                                  BigDecimal subtotal, BigDecimal discount, BigDecimal total, String openedBy, Instant openedAt,
                                  Instant updatedAt, long version, Long mergedInto, List<ItemResponse> items) {
        static ComandaResponse from(Comanda c) {
            BigDecimal total = c.getTotal() != null ? c.getTotal() : c.currentTotal();
            return new ComandaResponse(c.getId(), c.getTable().getId(), c.getTable().getName(), c.getLabel(), c.getStatus(), c.getPeople(),
                    c.subtotal(), c.getDiscount(), total, c.getOpenedBy().getDisplayName(), c.getOpenedAt(), c.getUpdatedAt(), c.getVersion(),
                    c.getMergedInto(), c.getItems().stream().map(ItemResponse::from).toList());
        }
    }

    /** Resumo de comanda aberta, para os cartões da tela de mesas. */
    public record ComandaSummary(Long id, String label, BigDecimal total, int itemCount, String openedBy, Instant openedAt, long version) {
        static ComandaSummary from(Comanda c) {
            return new ComandaSummary(c.getId(), c.getLabel(), c.currentTotal(), c.getItems().size(), c.getOpenedBy().getDisplayName(),
                    c.getOpenedAt(), c.getVersion());
        }
    }

    /** Mesa com as comandas abertas. Mantém os campos da mesa (id, name, displayOrder, active) da etapa 1. */
    public record TableOverview(Long id, String name, int displayOrder, boolean active, BigDecimal openTotal, List<ComandaSummary> comandas) {
    }

    /** Produto para lançar: aparece mesmo indisponível (em cinza no celular), mas não pode ser lançado. */
    public record ServiceMenuItem(Long id, String name, BigDecimal price, PriceUnit priceUnit, boolean available) {
    }

    public record ServiceMenuCategory(Long id, String name, List<ServiceMenuItem> items) {
    }
}
