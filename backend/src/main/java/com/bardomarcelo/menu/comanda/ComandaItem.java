package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.item.PriceUnit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/** Linha da comanda. Nome e preço são cópias do momento do lançamento: mudar o cardápio depois não altera a conta. */
@Entity
@Table(name = "comanda_item")
public class ComandaItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comanda_id")
    private Comanda comanda;

    @Column(name = "menu_item_id")
    private Long menuItemId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_unit", nullable = false, length = 4)
    private PriceUnit priceUnit;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal quantity;

    @Column(length = 140)
    private String note;

    @Column(nullable = false)
    private boolean custom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "added_by")
    private AppUser addedBy;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt;

    protected ComandaItem() {
    }

    ComandaItem(Comanda comanda, Long menuItemId, String name, BigDecimal unitPrice, PriceUnit priceUnit, BigDecimal quantity,
                String note, boolean custom, AppUser addedBy) {
        this.comanda = comanda;
        this.menuItemId = menuItemId;
        this.name = name;
        this.unitPrice = unitPrice;
        this.priceUnit = priceUnit;
        this.quantity = quantity;
        this.note = note;
        this.custom = custom;
        this.addedBy = addedBy;
        this.addedAt = Instant.now();
    }

    /** Preço × quantidade, arredondado aos centavos (meio para cima). */
    public BigDecimal lineTotal() {
        return unitPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);
    }

    void moveTo(Comanda target) {
        this.comanda = target;
    }

    void update(BigDecimal quantity, String note) {
        this.quantity = quantity;
        this.note = note;
    }

    public Long getId() { return id; }
    public Comanda getComanda() { return comanda; }
    public Long getMenuItemId() { return menuItemId; }
    public String getName() { return name; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public PriceUnit getPriceUnit() { return priceUnit; }
    public BigDecimal getQuantity() { return quantity; }
    public String getNote() { return note; }
    public boolean isCustom() { return custom; }
    public AppUser getAddedBy() { return addedBy; }
    public Instant getAddedAt() { return addedAt; }
}
