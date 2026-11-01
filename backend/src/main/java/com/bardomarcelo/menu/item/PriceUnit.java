package com.bardomarcelo.menu.item;

/** Como o preço é cobrado: por unidade/porção (padrão) ou por quilo. */
public enum PriceUnit {
    UNIT,
    KG;

    /** Texto vindo da API; vazio/nulo = unidade. */
    public static PriceUnit parse(String value) {
        return value == null || value.isBlank() ? UNIT : PriceUnit.valueOf(value.trim().toUpperCase());
    }
}
