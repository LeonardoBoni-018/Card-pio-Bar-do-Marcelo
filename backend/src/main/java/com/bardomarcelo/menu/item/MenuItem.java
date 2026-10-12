package com.bardomarcelo.menu.item;

import com.bardomarcelo.menu.category.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "menu_item")
public class MenuItem {

    public static final String IMAGE_URL_PREFIX = "/api/images/";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 500)
    private String description = "";

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "image_filename", length = 100)
    private String imageFilename;

    @Column(nullable = false)
    private boolean available = true;

    @Column(nullable = false)
    private boolean featured;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected MenuItem() {
    }

    public MenuItem(String name, String description, BigDecimal price, String imageFilename,
                    boolean available, boolean featured, Category category) {
        change(name, description, price, imageFilename, available, featured, category);
    }

    public void change(String name, String description, BigDecimal price, String imageFilename,
                       boolean available, boolean featured, Category category) {
        this.name = name;
        this.description = description == null ? "" : description;
        this.price = price;
        this.imageFilename = imageFilename;
        this.available = available;
        this.featured = featured;
        this.category = category;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public String imageUrl() {
        return imageFilename == null ? null : IMAGE_URL_PREFIX + imageFilename;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public String getImageFilename() { return imageFilename; }
    public boolean isAvailable() { return available; }
    public boolean isFeatured() { return featured; }
    public Category getCategory() { return category; }
    public Instant getUpdatedAt() { return updatedAt; }
}
