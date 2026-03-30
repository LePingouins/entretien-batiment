package com.entretienbatiment.backend.modules.permissions.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import com.entretienbatiment.backend.modules.permissions.service.PageAccessService;

@RestController
@RequestMapping("/api/page-access")
public class PageAccessController {

    private final PageAccessService pageAccessService;

    public PageAccessController(PageAccessService pageAccessService) {
        this.pageAccessService = pageAccessService;
    }

    @GetMapping("/me")
    public PageAccessResponse me(Authentication authentication) {
        return new PageAccessResponse(pageAccessService.getCurrentUserPageAccess(authentication));
    }

    public record PageAccessResponse(List<PageAccessService.PageAccessEntryDto> pages) {}
}
