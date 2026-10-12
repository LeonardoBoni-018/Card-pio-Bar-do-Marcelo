package com.bardomarcelo.menu.image;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "image")
public class StoredImage {

    @Id
    @Column(length = 100)
    private String filename;

    @Column(name = "content_type", nullable = false, length = 30)
    private String contentType;

    @JdbcTypeCode(SqlTypes.VARBINARY) // bytea no PostgreSQL (sem LOB/oid)
    @Column(nullable = false)
    private byte[] data;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected StoredImage() {
    }

    public StoredImage(String filename, String contentType, byte[] data, Instant createdAt) {
        this.filename = filename;
        this.contentType = contentType;
        this.data = data;
        this.createdAt = createdAt;
    }

    public String getFilename() { return filename; }
    public String getContentType() { return contentType; }
    public byte[] getData() { return data; }
    public Instant getCreatedAt() { return createdAt; }
}
