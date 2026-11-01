-- Preço por unidade (padrão) ou por quilo (ex.: "R$ 70,00 o kg").
ALTER TABLE menu_item ADD COLUMN IF NOT EXISTS price_unit VARCHAR(10) NOT NULL DEFAULT 'UNIT';
ALTER TABLE menu_item ADD CONSTRAINT ck_menu_item_price_unit CHECK (price_unit IN ('UNIT', 'KG'));
