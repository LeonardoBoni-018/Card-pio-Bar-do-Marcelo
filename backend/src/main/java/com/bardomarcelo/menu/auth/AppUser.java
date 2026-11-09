package com.bardomarcelo.menu.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Usuário que entra no sistema: o proprietário (ADMIN) ou um garçom (GARCOM). */
@Entity
@Table(name = "admin_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 60)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private UserRole role;

    @Column(nullable = false)
    private boolean active;

    protected AppUser() {
    }

    private AppUser(String username, String passwordHash, String displayName, UserRole role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.role = role;
        this.active = true;
    }

    public static AppUser admin(String username, String passwordHash) {
        return new AppUser(username, passwordHash, "Proprietário", UserRole.ADMIN);
    }

    public static AppUser waiter(String username, String passwordHash, String displayName) {
        return new AppUser(username, passwordHash, displayName, UserRole.GARCOM);
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
    public UserRole getRole() { return role; }
    public boolean isActive() { return active; }

    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    /** Garante que o usuário da configuração continue sendo o proprietário e ativo. */
    void makeActiveAdmin() {
        this.role = UserRole.ADMIN;
        this.active = true;
    }

    public void updateProfile(String username, String displayName, boolean active) {
        this.username = username;
        this.displayName = displayName;
        this.active = active;
    }
}
