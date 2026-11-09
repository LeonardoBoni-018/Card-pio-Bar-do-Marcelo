package com.bardomarcelo.menu.auth;

/** Perfis de acesso. O nome vira o papel no token (ROLE_ADMIN, ROLE_GARCOM). */
public enum UserRole {
    /** Proprietário: painel completo. */
    ADMIN,
    /** Garçom: só a área de comandas. */
    GARCOM
}
