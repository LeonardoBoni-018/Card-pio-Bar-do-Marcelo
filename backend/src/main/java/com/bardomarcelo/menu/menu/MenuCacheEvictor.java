package com.bardomarcelo.menu.menu;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
class MenuCacheEvictor {

    private final CacheManager cacheManager;

    MenuCacheEvictor(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    /** Só limpa depois do commit, evitando que uma leitura concorrente recarregue dados antigos. */
    @TransactionalEventListener(fallbackExecution = true)
    void onMenuChanged(MenuChangedEvent event) {
        Cache cache = cacheManager.getCache(MenuService.CACHE);
        if (cache != null) {
            cache.clear();
        }
    }
}
