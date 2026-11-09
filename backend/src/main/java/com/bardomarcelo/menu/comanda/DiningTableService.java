package com.bardomarcelo.menu.comanda;

import com.bardomarcelo.menu.common.ConflictException;
import com.bardomarcelo.menu.common.NotFoundException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ComandasEnabled
public class DiningTableService {

    static final String DEFAULT_PREFIX = "Mesa";

    private final DiningTableRepository tables;

    public DiningTableService(DiningTableRepository tables) {
        this.tables = tables;
    }

    @Transactional(readOnly = true)
    public List<TableResponse> list() {
        return tables.findAllByOrderByDisplayOrderAscNameAsc().stream().map(TableResponse::from).toList();
    }

    /** Só as mesas ativas: é o que o garçom vê. */
    @Transactional(readOnly = true)
    public List<TableResponse> listActive() {
        return tables.findAllByActiveTrueOrderByDisplayOrderAscNameAsc().stream().map(TableResponse::from).toList();
    }

    @Transactional
    public TableResponse create(TableRequest request) {
        String name = normalize(request.name());
        if (tables.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Já existe uma mesa com esse nome.");
        }
        DiningTable table = new DiningTable(name, orderOf(request));
        if (Boolean.FALSE.equals(request.active())) {
            table.update(name, orderOf(request), false);
        }
        return TableResponse.from(tables.save(table));
    }

    @Transactional
    public List<TableResponse> createBatch(TableBatchRequest request) {
        String prefix = request.prefix() == null || request.prefix().isBlank() ? DEFAULT_PREFIX : normalize(request.prefix());
        List<TableResponse> created = new ArrayList<>();
        for (int i = 1; i <= request.quantity(); i++) {
            String name = prefix + " " + i;
            if (!tables.existsByNameIgnoreCase(name)) {
                created.add(TableResponse.from(tables.save(new DiningTable(name, i))));
            }
        }
        return created;
    }

    @Transactional
    public TableResponse update(Long id, TableRequest request) {
        DiningTable table = find(id);
        String name = normalize(request.name());
        if (tables.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("Já existe uma mesa com esse nome.");
        }
        table.update(name, orderOf(request), request.active() == null ? table.isActive() : request.active());
        return TableResponse.from(table);
    }

    @Transactional
    public void delete(Long id) {
        // na etapa 2: recusar (409) quando a mesa tiver comandas; com histórico, o caminho é desativar
        tables.delete(find(id));
    }

    private DiningTable find(Long id) {
        return tables.findById(id).orElseThrow(() -> new NotFoundException("Mesa não encontrada."));
    }

    private static String normalize(String name) {
        return name.trim().replaceAll("\\s+", " ");
    }

    private static int orderOf(TableRequest request) {
        return request.displayOrder() == null ? 0 : request.displayOrder();
    }
}
