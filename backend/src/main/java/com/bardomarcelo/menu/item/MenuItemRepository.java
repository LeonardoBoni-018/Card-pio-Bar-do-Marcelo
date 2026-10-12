package com.bardomarcelo.menu.item;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long>, JpaSpecificationExecutor<MenuItem> {

    /** Uma única query (join fetch) evita N+1 ao montar o cardápio público. */
    @Query("""
            select i from MenuItem i join fetch i.category c
            where i.available = true
            order by c.displayOrder, c.name, i.featured desc, i.name
            """)
    List<MenuItem> findAvailableForMenu();

    boolean existsByCategoryId(Long categoryId);

    @Override
    @EntityGraph(attributePaths = "category")
    Page<MenuItem> findAll(Specification<MenuItem> spec, Pageable pageable);
}
