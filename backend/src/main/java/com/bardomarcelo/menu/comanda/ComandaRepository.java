package com.bardomarcelo.menu.comanda;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ComandaRepository extends JpaRepository<Comanda, Long> {

    /** Trava a linha da comanda até o fim da transação: dois garçons mexendo nela ao mesmo tempo entram em fila. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Comanda c where c.id = :id")
    Optional<Comanda> findForUpdate(Long id);

    /** Todas as comandas abertas com itens e quem abriu, numa consulta só (tela de mesas). */
    @Query("""
            select distinct c from Comanda c
            join fetch c.table join fetch c.openedBy left join fetch c.items
            where c.status = com.bardomarcelo.menu.comanda.ComandaStatus.OPEN
            order by c.openedAt
            """)
    List<Comanda> findAllOpenWithItems();

    boolean existsByTableId(Long tableId);

    /** Lista do proprietário: por situação e período de abertura, mais recentes primeiro. */
    @Query("""
            select distinct c from Comanda c
            join fetch c.table join fetch c.openedBy left join fetch c.closedBy left join fetch c.canceledBy left join fetch c.items
            where c.status in :statuses and c.openedAt >= :from and c.openedAt < :to
            order by c.openedAt desc
            """)
    List<Comanda> search(java.util.Collection<ComandaStatus> statuses, java.time.Instant from, java.time.Instant to);

    /** Move todos os itens de uma comanda para outra (juntar), direto no banco. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update ComandaItem i set i.comanda.id = :targetId where i.comanda.id = :sourceId")
    int moveItems(Long sourceId, Long targetId);
}
