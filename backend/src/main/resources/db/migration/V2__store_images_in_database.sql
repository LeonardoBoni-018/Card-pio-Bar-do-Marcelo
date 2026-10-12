-- Fotos no banco: o disco do Render é efêmero (some a cada deploy). Cada foto já é reduzida (<= 1200 px)
-- e recomprimida na hora do upload, então ocupa algumas dezenas de KB.
CREATE TABLE image (
    filename     VARCHAR(100)             PRIMARY KEY,
    content_type VARCHAR(30)              NOT NULL,
    data         BYTEA                    NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_image_created_at ON image (created_at);
