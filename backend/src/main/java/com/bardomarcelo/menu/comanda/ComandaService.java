package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.auth.AppUser;
import com.bardomarcelo.menu.auth.AppUserRepository;
import com.bardomarcelo.menu.comanda.ComandaDtos.AddItemRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.ComandaResponse;
import com.bardomarcelo.menu.comanda.ComandaDtos.ComandaSummary;
import com.bardomarcelo.menu.comanda.ComandaDtos.OpenComandaRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.ServiceMenuCategory;
import com.bardomarcelo.menu.comanda.ComandaDtos.ServiceMenuItem;
import com.bardomarcelo.menu.comanda.ComandaDtos.TableOverview;
import com.bardomarcelo.menu.comanda.ComandaDtos.UpdateComandaRequest;
import com.bardomarcelo.menu.comanda.ComandaDtos.UpdateItemRequest;
import com.bardomarcelo.menu.common.ConflictException;
import com.bardomarcelo.menu.common.NotFoundException;
import com.bardomarcelo.menu.item.MenuItem;
import com.bardomarcelo.menu.item.MenuItemRepository;
import com.bardomarcelo.menu.item.PriceUnit;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Regras das comandas. Qualquer garçom mexe em qualquer comanda aberta (decisão do cliente); cada item guarda quem lançou.
 * Toda alteração trava a comanda (SELECT ... FOR UPDATE) para que dois celulares ao mesmo tempo não se atropelem.
 */
@Service
@ComandasEnabled
public class ComandaService {

    private final ComandaRepository comandas;
    private final DiningTableRepository tables;
    private final MenuItemRepository menuItems;
    private final AppUserRepository users;

    public ComandaService(ComandaRepository comandas, DiningTableRepository tables, MenuItemRepository menuItems, AppUserRepository users) {
        this.comandas = comandas;
        this.tables = tables;
        this.menuItems = menuItems;
        this.users = users;
    }

    /** Mesas ativas com as comandas abertas de cada uma (e mesas desativadas que ainda têm comanda aberta). */
    @Transactional(readOnly = true)
    public List<TableOverview> overview() {
        Map<Long, List<Comanda>> byTable = new LinkedHashMap<>();
        for (Comanda c : comandas.findAllOpenWithItems()) {
            byTable.computeIfAbsent(c.getTable().getId(), k -> new ArrayList<>()).add(c);
        }
        List<TableOverview> result = new ArrayList<>();
        for (DiningTable t : tables.findAllByOrderByDisplayOrderAscNameAsc()) {
            List<Comanda> open = byTable.getOrDefault(t.getId(), List.of());
            if (!t.isActive() && open.isEmpty()) continue;
            BigDecimal total = open.stream().map(Comanda::currentTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(new TableOverview(t.getId(), t.getName(), t.getDisplayOrder(), t.isActive(), total,
                    open.stream().map(ComandaSummary::from).toList()));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<ServiceMenuCategory> serviceMenu() {
        Map<Long, ServiceMenuCategory> categories = new LinkedHashMap<>();
        for (MenuItem i : menuItems.findAllForService()) {
            categories.computeIfAbsent(i.getCategory().getId(), k -> new ServiceMenuCategory(k, i.getCategory().getName(), new ArrayList<>()))
                    .items().add(new ServiceMenuItem(i.getId(), i.getName(), i.getPrice(), i.getPriceUnit(), i.isAvailable()));
        }
        return List.copyOf(categories.values());
    }

    @Transactional
    public ComandaResponse open(OpenComandaRequest request, String username) {
        DiningTable table = activeTable(request.tableId());
        Comanda comanda = comandas.save(new Comanda(table, blankToNull(request.label()), request.people(), user(username)));
        return ComandaResponse.from(comanda);
    }

    @Transactional(readOnly = true)
    public ComandaResponse get(Long id) {
        return ComandaResponse.from(comandas.findById(id).orElseThrow(ComandaService::notFound));
    }

    @Transactional
    public ComandaResponse updateHeader(Long id, UpdateComandaRequest request) {
        Comanda comanda = openForUpdate(id);
        comanda.updateHeader(blankToNull(request.label()), request.people());
        return saved(comanda);
    }

    @Transactional
    public ComandaResponse addItem(Long id, AddItemRequest request, String username) {
        Comanda comanda = openForUpdate(id);
        AppUser by = user(username);
        String note = blankToNull(request.note());
        if (request.menuItemId() != null) {
            MenuItem item = menuItems.findById(request.menuItemId()).orElseThrow(() -> new NotFoundException("Produto não encontrado no cardápio."));
            if (!item.isAvailable()) {
                throw new ConflictException("“" + item.getName() + "” está indisponível no momento.");
            }
            checkQuantity(item.getPriceUnit(), request.quantity());
            comanda.addItem(item.getId(), item.getName(), item.getPrice(), item.getPriceUnit(), request.quantity(), note, false, by);
        } else {
            if (request.name() == null || request.name().isBlank() || request.unitPrice() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item avulso precisa de nome e preço.");
            }
            checkQuantity(PriceUnit.UNIT, request.quantity());
            comanda.addItem(null, request.name().trim().replaceAll("\\s+", " "), request.unitPrice(), PriceUnit.UNIT, request.quantity(), note, true, by);
        }
        return saved(comanda);
    }

    @Transactional
    public ComandaResponse updateItem(Long id, Long itemId, UpdateItemRequest request) {
        Comanda comanda = openForUpdate(id);
        ComandaItem item = item(comanda, itemId);
        checkQuantity(item.getPriceUnit(), request.quantity());
        item.update(request.quantity(), blankToNull(request.note()));
        comanda.touch();
        return saved(comanda);
    }

    @Transactional
    public ComandaResponse removeItem(Long id, Long itemId) {
        Comanda comanda = openForUpdate(id);
        comanda.removeItem(item(comanda, itemId));
        return saved(comanda);
    }

    @Transactional
    public ComandaResponse move(Long id, Long tableId) {
        Comanda comanda = openForUpdate(id);
        DiningTable target = activeTable(tableId);
        if (!target.getId().equals(comanda.getTable().getId())) {
            comanda.moveTo(target);
        }
        return saved(comanda);
    }

    /** Junta {@code fromId} nesta comanda (ex.: o grupo decidiu pagar junto). Trava as duas em ordem de id para não haver impasse. */
    @Transactional
    public ComandaResponse merge(Long id, Long fromId) {
        if (id.equals(fromId)) {
            throw new ConflictException("Escolha outra comanda para juntar.");
        }
        Comanda first = openForUpdate(Math.min(id, fromId));
        Comanda second = openForUpdate(Math.max(id, fromId));
        Comanda target = first.getId().equals(id) ? first : second;
        Comanda source = target == first ? second : first;
        source.markMergedInto(target);
        target.touch();
        comandas.saveAndFlush(source);
        comandas.saveAndFlush(target);
        comandas.moveItems(source.getId(), target.getId()); // limpa o contexto: relê a comanda já com os itens
        return ComandaResponse.from(comandas.findById(id).orElseThrow(ComandaService::notFound));
    }

    /** Fecha a conta (qualquer garçom). Comanda vazia não fecha: descarte. Desconto até o valor da conta. */
    @Transactional
    public ComandaResponse close(Long id, ComandaDtos.CloseRequest request, String username) {
        Comanda comanda = openForUpdate(id);
        if (comanda.getItems().isEmpty()) {
            throw new ConflictException("Comanda sem itens: descarte em vez de fechar.");
        }
        BigDecimal discount = request.discount() == null ? BigDecimal.ZERO : request.discount();
        if (discount.compareTo(comanda.subtotal()) > 0) {
            throw new ConflictException("O desconto não pode ser maior que o valor da conta.");
        }
        comanda.close(discount, request.people(), user(username));
        return saved(comanda);
    }

    /** Descarta comanda aberta por engano (sem itens). Fica no histórico como cancelada. */
    @Transactional
    public ComandaResponse discard(Long id, String username) {
        Comanda comanda = openForUpdate(id);
        if (!comanda.getItems().isEmpty()) {
            throw new ConflictException("Só dá para descartar comanda sem itens. Remova os itens ou feche a conta.");
        }
        comanda.cancel("Descartada (aberta sem itens)", user(username));
        return saved(comanda);
    }

    /** Proprietário: reabre conta fechada. A mesa precisa estar ativa. */
    @Transactional
    public ComandaResponse reopen(Long id) {
        Comanda comanda = comandas.findForUpdate(id).orElseThrow(ComandaService::notFound);
        if (comanda.getStatus() != ComandaStatus.CLOSED) {
            throw new ConflictException("Só comandas fechadas podem ser reabertas.");
        }
        if (!comanda.getTable().isActive()) {
            throw new ConflictException("A mesa “" + comanda.getTable().getName() + "” está desativada. Ative-a antes de reabrir.");
        }
        comanda.reopen();
        return saved(comanda);
    }

    /** Proprietário: cancela comanda aberta ou fechada (sai dos relatórios), com motivo. */
    @Transactional
    public ComandaResponse cancel(Long id, String reason, String username) {
        Comanda comanda = comandas.findForUpdate(id).orElseThrow(ComandaService::notFound);
        if (comanda.getStatus() != ComandaStatus.OPEN && comanda.getStatus() != ComandaStatus.CLOSED) {
            throw new ConflictException("Esta comanda não pode ser cancelada.");
        }
        comanda.cancel(blankToNull(reason), user(username));
        return saved(comanda);
    }

    /** Proprietário: lista por situação e dia (fuso de São Paulo, dia vira às 05:00). */
    @Transactional(readOnly = true)
    public List<ComandaDtos.ComandaListItem> search(List<ComandaStatus> statuses, java.time.LocalDate from, java.time.LocalDate to) {
        java.time.ZoneId zone = java.time.ZoneId.of("America/Sao_Paulo");
        java.time.LocalTime cut = java.time.LocalTime.of(5, 0);
        java.time.Instant start = from.atTime(cut).atZone(zone).toInstant();
        java.time.Instant end = to.plusDays(1).atTime(cut).atZone(zone).toInstant();
        List<ComandaStatus> st = statuses == null || statuses.isEmpty() ? List.of(ComandaStatus.values()) : statuses;
        return comandas.search(st, start, end).stream().map(ComandaDtos.ComandaListItem::from).toList();
    }

    /** "Hoje" no bar: antes das 05:00 ainda conta como o dia anterior. */
    public static java.time.LocalDate businessDay(java.time.Instant now) {
        return now.atZone(java.time.ZoneId.of("America/Sao_Paulo")).minusHours(5).toLocalDate();
    }

    private ComandaResponse saved(Comanda comanda) {
        comandas.saveAndFlush(comanda); // grava já para a resposta trazer a versão nova
        return ComandaResponse.from(comanda);
    }

    private Comanda openForUpdate(Long id) {
        Comanda comanda = comandas.findForUpdate(id).orElseThrow(ComandaService::notFound);
        if (!comanda.isOpen()) {
            throw new ConflictException(switch (comanda.getStatus()) {
                case CLOSED -> "Esta comanda já foi fechada.";
                case CANCELED -> "Esta comanda foi cancelada.";
                case MERGED -> "Esta comanda foi juntada em outra (comanda " + comanda.getMergedInto() + ").";
                case OPEN -> "";
            });
        }
        return comanda;
    }

    private DiningTable activeTable(Long tableId) {
        DiningTable table = tables.findById(tableId).orElseThrow(() -> new NotFoundException("Mesa não encontrada."));
        if (!table.isActive()) {
            throw new ConflictException("A mesa “" + table.getName() + "” está desativada.");
        }
        return table;
    }

    private static ComandaItem item(Comanda comanda, Long itemId) {
        return comanda.getItems().stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Item não encontrado nesta comanda."));
    }

    /** Por unidade: quantidade inteira. Por quilo: até 3 casas (gramas). */
    private static void checkQuantity(PriceUnit unit, BigDecimal quantity) {
        if (unit == PriceUnit.UNIT && quantity.stripTrailingZeros().scale() > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Para itens por unidade, a quantidade precisa ser um número inteiro.");
        }
    }

    private AppUser user(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado."));
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Comanda não encontrada.");
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim().replaceAll("\\s+", " ");
    }
}
