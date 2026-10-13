-- Miniatura (<= 480 px) para as listas no celular: ~15-30 KB em vez de ~100 KB+ por foto.
-- Nula nas fotos antigas; nesse caso a API devolve a foto inteira.
ALTER TABLE image ADD COLUMN thumbnail BYTEA;
