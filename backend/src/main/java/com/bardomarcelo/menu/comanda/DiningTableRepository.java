package com.bardomarcelo.menu.comanda;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    List<DiningTable> findAllByOrderByDisplayOrderAscNameAsc();

    List<DiningTable> findAllByActiveTrueOrderByDisplayOrderAscNameAsc();

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
