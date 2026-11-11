package com.bardomarcelo.menu.comanda;

public enum ComandaStatus {
    /** Aberta: recebe itens. */
    OPEN,
    /** Conta fechada (etapa 4). */
    CLOSED,
    /** Cancelada pelo proprietário (etapa 4). */
    CANCELED,
    /** Juntada em outra comanda: os itens foram para lá. */
    MERGED
}
