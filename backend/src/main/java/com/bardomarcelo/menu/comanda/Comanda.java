package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.item.PriceUnit;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Comanda de uma mesa. Uma mesa pode ter várias abertas ao mesmo tempo (ex.: uma por pessoa).
 * Toda alteração passa por {@link #touch()}, que sobe a {@code version}: o celular do garçom usa isso para saber que algo mudou.
 */
@Entity
@Table(name = "comanda")
public class Comanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "table_id")
    private DiningTable table;

    @Column(length = 40)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ComandaStatus status = ComandaStatus.OPEN;

    private Integer people;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    /** Valor final, gravado ao fechar (etapa 4). */
    @Column(precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "merged_into")
    private Long mergedInto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "opened_by")
    private AppUser openedBy;

    @Column(name = "opened_at", nullable = false, updatable = false)
    private Instant openedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "closed_by")
    private AppUser closedBy;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    @OneToMany(mappedBy = "comanda", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<ComandaItem> items = new ArrayList<>();

    protected Comanda() {
    }

    public Comanda(DiningTable table, String label, Integer people, AppUser openedBy) {
        this.table = table;
        this.label = label;
        this.people = people;
        this.openedBy = openedBy;
        this.openedAt = this.updatedAt = Instant.now();
    }

    public boolean isOpen() {
        return status == ComandaStatus.OPEN;
    }

    /** Soma das linhas (cada uma já arredondada aos centavos). */
    public BigDecimal subtotal() {
        return items.stream().map(ComandaItem::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Subtotal menos desconto, nunca negativo. */
    public BigDecimal currentTotal() {
        return subtotal().subtract(discount).max(BigDecimal.ZERO);
    }

    ComandaItem addItem(Long menuItemId, String name, BigDecimal unitPrice, PriceUnit unit, BigDecimal quantity, String note, boolean custom, AppUser by) {
        ComandaItem item = new ComandaItem(this, menuItemId, name, unitPrice, unit, quantity, note, custom, by);
        items.add(item);
        touch();
        return item;
    }

    void removeItem(ComandaItem item) {
        items.remove(item);
        touch();
    }

    void updateHeader(String label, Integer people) {
        this.label = label;
        this.people = people;
        touch();
    }

    void moveTo(DiningTable target) {
        this.table = target;
        touch();
    }

    /** Marca esta comanda como juntada em {@code target} (os itens são movidos pelo serviço, direto no banco). */
    void markMergedInto(Comanda target) {
        this.status = ComandaStatus.MERGED;
        this.mergedInto = target.getId();
        touch();
    }

    void touch() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public DiningTable getTable() { return table; }
    public String getLabel() { return label; }
    public ComandaStatus getStatus() { return status; }
    public Integer getPeople() { return people; }
    public BigDecimal getDiscount() { return discount; }
    public BigDecimal getTotal() { return total; }
    public Long getMergedInto() { return mergedInto; }
    public AppUser getOpenedBy() { return openedBy; }
    public Instant getOpenedAt() { return openedAt; }
    public AppUser getClosedBy() { return closedBy; }
    public Instant getClosedAt() { return closedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
    public List<ComandaItem> getItems() { return items; }
}
