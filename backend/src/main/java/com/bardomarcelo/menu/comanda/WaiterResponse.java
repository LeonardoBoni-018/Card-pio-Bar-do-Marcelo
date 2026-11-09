package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.auth.AppUser;

public record WaiterResponse(Long id, String name, String username, boolean active) {

    static WaiterResponse from(AppUser u) {
        return new WaiterResponse(u.getId(), u.getDisplayName(), u.getUsername(), u.isActive());
    }
}
