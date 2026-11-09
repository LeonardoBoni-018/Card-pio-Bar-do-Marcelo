package com.bardomarcelo.menu.comanda;

public record TableResponse(Long id, String name, int displayOrder, boolean active) {

    static TableResponse from(DiningTable t) {
        return new TableResponse(t.getId(), t.getName(), t.getDisplayOrder(), t.isActive());
    }
}
