/**
 * Comandas dos garçons: mesas, comandas abertas/fechadas, itens lançados (do cardápio ou avulsos) e relatórios.
 *
 * <p>Regras deste módulo enquanto estiver em construção (detalhes em docs/comandas/ESCOPO.md):
 * <ul>
 *   <li>Todo bean público do módulo leva {@link com.bardomarcelo.menu.comanda.ComandasEnabled}.</li>
 *   <li>Endpoints do garçom em {@code /api/pedidos/**}; os do dono em {@code /api/admin/**}.</li>
 *   <li>Migrations do módulo usam a faixa reservada V10–V19 (V5–V9 ficam livres para correções em produção).</li>
 *   <li>Preço e nome do item são copiados no lançamento; valores sempre em {@code BigDecimal}.</li>
 * </ul>
 */
package com.bardomarcelo.menu.comanda;
