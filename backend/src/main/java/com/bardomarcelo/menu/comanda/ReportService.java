package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.item.PriceUnit;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Relatórios do proprietário. Só contas FECHADAS entram nas vendas, pelo dia em que foram fechadas
 * (dia do bar: vira às 05:00 de São Paulo). Canceladas aparecem à parte. Sem nota fiscal: é só conferência.
 */
@Service
@ComandasEnabled
public class ReportService {

    static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    static final LocalTime DAY_START = LocalTime.of(5, 0);

    private final ComandaRepository comandas;

    public ReportService(ComandaRepository comandas) {
        this.comandas = comandas;
    }

    public record Summary(LocalDate from, LocalDate to, int closedCount, BigDecimal gross, BigDecimal discounts, BigDecimal total,
                          BigDecimal averageTicket, int canceledCount, BigDecimal canceledValue, List<DayRow> byDay, List<GroupRow> byWaiter,
                          List<GroupRow> byTable, List<ItemRow> topItems, List<ItemRow> customItems) {
    }

    public record DayRow(LocalDate date, int count, BigDecimal total) {
    }

    public record GroupRow(String name, int count, BigDecimal total) {
    }

    /** Itens vendidos (valor antes do desconto da conta). */
    public record ItemRow(String name, PriceUnit priceUnit, BigDecimal quantity, BigDecimal total) {
    }

    public static Instant startOf(LocalDate day) {
        return day.atTime(DAY_START).atZone(ZONE).toInstant();
    }

    public static LocalDate businessDay(Instant instant) {
        return instant.atZone(ZONE).minusHours(5).toLocalDate();
    }

    @Transactional(readOnly = true)
    public Summary summary(LocalDate from, LocalDate to) {
        Instant start = startOf(from);
        Instant end = startOf(to.plusDays(1));
        List<Comanda> closed = comandas.findClosedBetween(start, end);
        List<Comanda> canceled = comandas.findCanceledBetween(start, end);

        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal discounts = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        Map<LocalDate, GroupAcc> days = new TreeMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) days.put(d, new GroupAcc());
        Map<String, GroupAcc> waiters = new LinkedHashMap<>();
        Map<String, GroupAcc> tables = new LinkedHashMap<>();
        Map<String, ItemAcc> items = new LinkedHashMap<>();
        Map<String, ItemAcc> custom = new LinkedHashMap<>();

        for (Comanda c : closed) {
            gross = gross.add(c.subtotal());
            discounts = discounts.add(c.getDiscount());
            total = total.add(c.getTotal());
            days.computeIfAbsent(businessDay(c.getClosedAt()), k -> new GroupAcc()).add(c.getTotal());
            waiters.computeIfAbsent(c.getClosedBy().getDisplayName(), k -> new GroupAcc()).add(c.getTotal());
            tables.computeIfAbsent(c.getTable().getName(), k -> new GroupAcc()).add(c.getTotal());
            for (ComandaItem i : c.getItems()) {
                Map<String, ItemAcc> target = i.isCustom() ? custom : items;
                // mesmo produto com preços diferentes no período soma junto (chave: produto, ou nome se avulso/excluído)
                String key = i.getMenuItemId() != null ? "id:" + i.getMenuItemId() : "nome:" + i.getName().toLowerCase() + ":" + i.getPriceUnit();
                target.computeIfAbsent(key, k -> new ItemAcc(i.getName(), i.getPriceUnit())).add(i.getQuantity(), i.lineTotal());
            }
        }

        BigDecimal canceledValue = canceled.stream().map(Comanda::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal average = closed.isEmpty() ? BigDecimal.ZERO.setScale(2) : total.divide(BigDecimal.valueOf(closed.size()), 2, RoundingMode.HALF_UP);

        return new Summary(from, to, closed.size(), gross, discounts, total, average, canceled.size(), canceledValue,
                days.entrySet().stream().map(e -> new DayRow(e.getKey(), e.getValue().count, e.getValue().total)).toList(),
                groups(waiters), groups(tables), itemRows(items), itemRows(custom));
    }

    private static List<GroupRow> groups(Map<String, GroupAcc> map) {
        return map.entrySet().stream().map(e -> new GroupRow(e.getKey(), e.getValue().count, e.getValue().total))
                .sorted(Comparator.comparing(GroupRow::total).reversed().thenComparing(GroupRow::name)).toList();
    }

    private static List<ItemRow> itemRows(Map<String, ItemAcc> map) {
        return map.values().stream().map(a -> new ItemRow(a.name, a.unit, a.quantity, a.total))
                .sorted(Comparator.comparing(ItemRow::total).reversed().thenComparing(ItemRow::name)).toList();
    }

    /** Planilha (CSV com ";" e BOM, abre direto no Excel em português): uma linha por conta fechada. */
    @Transactional(readOnly = true)
    public String csv(LocalDate from, LocalDate to) {
        List<Comanda> closed = new ArrayList<>(comandas.findClosedBetween(startOf(from), startOf(to.plusDays(1))));
        closed.sort(Comparator.comparing(Comanda::getClosedAt));
        var time = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZONE);
        StringBuilder sb = new StringBuilder("﻿");
        sb.append("Comanda;Dia;Fechada em;Mesa;Identificação;Aberta por;Fechada por;Pessoas;Itens;Subtotal;Desconto;Total\r\n");
        for (Comanda c : closed) {
            sb.append(c.getId()).append(';')
                    .append(businessDay(c.getClosedAt()).format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append(';')
                    .append(time.format(c.getClosedAt())).append(';')
                    .append(cell(c.getTable().getName())).append(';')
                    .append(cell(c.getLabel())).append(';')
                    .append(cell(c.getOpenedBy().getDisplayName())).append(';')
                    .append(cell(c.getClosedBy().getDisplayName())).append(';')
                    .append(c.getPeople() == null ? "" : c.getPeople()).append(';')
                    .append(c.getItems().size()).append(';')
                    .append(money(c.subtotal())).append(';')
                    .append(money(c.getDiscount())).append(';')
                    .append(money(c.getTotal())).append("\r\n");
        }
        return sb.toString();
    }

    private static String money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',');
    }

    /** Aspas quando preciso; neutraliza fórmulas (=, +, -, @) para a planilha não executar nada. */
    static String cell(String v) {
        if (v == null) return "";
        String s = v;
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) s = "'" + s;
        if (s.contains(";") || s.contains("\"") || s.contains("\n")) s = "\"" + s.replace("\"", "\"\"") + "\"";
        return s;
    }

    private static final class GroupAcc {
        int count;
        BigDecimal total = BigDecimal.ZERO;

        void add(BigDecimal value) {
            count++;
            total = total.add(value);
        }
    }

    private static final class ItemAcc {
        final String name;
        final PriceUnit unit;
        BigDecimal quantity = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;

        ItemAcc(String name, PriceUnit unit) {
            this.name = name;
            this.unit = unit;
        }

        void add(BigDecimal q, BigDecimal value) {
            quantity = quantity.add(q);
            total = total.add(value);
        }
    }
}
