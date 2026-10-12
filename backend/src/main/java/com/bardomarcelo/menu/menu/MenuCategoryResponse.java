package com.bardomarcelo.menu.menu;

import java.util.List;

public record MenuCategoryResponse(Long id, String name, List<PublicItemResponse> items) {
}
