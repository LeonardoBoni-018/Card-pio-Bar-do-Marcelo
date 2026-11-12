-- Comandas (etapa 4): motivo do cancelamento e quem cancelou/reabriu. Só ADICIONA colunas.
ALTER TABLE comanda ADD COLUMN cancel_reason VARCHAR(140);
ALTER TABLE comanda ADD COLUMN canceled_by BIGINT;
ALTER TABLE comanda ADD COLUMN canceled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE comanda ADD COLUMN reopened_count INT NOT NULL DEFAULT 0;
ALTER TABLE comanda ADD CONSTRAINT fk_comanda_canceled FOREIGN KEY (canceled_by) REFERENCES admin_user (id);
