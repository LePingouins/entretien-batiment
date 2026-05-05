package com.entretienbatiment.backend.modules.subscriptions.service;

import com.entretienbatiment.backend.modules.subscriptions.dto.*;
import com.entretienbatiment.backend.modules.subscriptions.model.*;
import com.entretienbatiment.backend.modules.subscriptions.repository.SoftwareSubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SoftwareSubscriptionService {

    private final SoftwareSubscriptionRepository repo;

    public SoftwareSubscriptionService(SoftwareSubscriptionRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<SubscriptionResponse> listAll() {
        return repo.findAllByOrderByNextDueDateAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getById(Long id) {
        return toResponse(repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found")));
    }

    @Transactional
    public SubscriptionResponse create(SubscriptionRequest req) {
        SoftwareSubscription sub = new SoftwareSubscription();
        applyRequest(sub, req);
        return toResponse(repo.save(sub));
    }

    @Transactional
    public SubscriptionResponse update(Long id, SubscriptionRequest req) {
        SoftwareSubscription sub = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        applyRequest(sub, req);
        return toResponse(repo.save(sub));
    }

    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found");
        }
        repo.deleteById(id);
    }

    @Transactional(readOnly = true)
    public SubscriptionReportResponse getReport() {
        List<SoftwareSubscription> all = repo.findAll();

        List<SoftwareSubscription> active = all.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE || s.getStatus() == SubscriptionStatus.TRIAL)
                .toList();

        BigDecimal totalMonthlyCost = active.stream()
                .map(SoftwareSubscription::getMonthlyCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalYearlyCost = active.stream()
                .map(SoftwareSubscription::getYearlyCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDate now = LocalDate.now();
        LocalDate thirtyDaysOut = now.plusDays(30);

        List<SoftwareSubscription> upcoming = all.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE)
                .filter(s -> s.getNextDueDate() != null
                        && !s.getNextDueDate().isBefore(now)
                        && !s.getNextDueDate().isAfter(thirtyDaysOut))
                .sorted(Comparator.comparing(SoftwareSubscription::getNextDueDate))
                .toList();

        int expiredCount = (int) all.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.EXPIRED
                        || s.getStatus() == SubscriptionStatus.CANCELLED)
                .count();

        // Cost by category (monthly equivalent, only active)
        Map<String, BigDecimal> costByCategory = active.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCategory().name(),
                        Collectors.reducing(BigDecimal.ZERO, SoftwareSubscription::getMonthlyCost, BigDecimal::add)
                ));

        // Count by category (all)
        Map<String, Integer> countByCategory = all.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCategory().name(),
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));

        // Cost by billing cycle (active only)
        Map<String, BigDecimal> costByBillingCycle = active.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getBillingCycle().name(),
                        Collectors.reducing(BigDecimal.ZERO, SoftwareSubscription::getCost, BigDecimal::add)
                ));

        // Count by status
        Map<String, Integer> countByStatus = all.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getStatus().name(),
                        Collectors.collectingAndThen(Collectors.counting(), Long::intValue)
                ));

        return new SubscriptionReportResponse(
                all.size(),
                active.size(),
                totalMonthlyCost,
                totalYearlyCost,
                upcoming.size(),
                expiredCount,
                costByCategory,
                countByCategory,
                costByBillingCycle,
                countByStatus,
                upcoming.stream().map(this::toResponse).toList()
        );
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    private void applyRequest(SoftwareSubscription sub, SubscriptionRequest req) {
        if (req.name() != null) sub.setName(req.name());
        if (req.vendor() != null) sub.setVendor(req.vendor());
        if (req.category() != null) sub.setCategory(SubscriptionCategory.valueOf(req.category()));
        if (req.cost() != null) sub.setCost(req.cost());
        if (req.currency() != null) sub.setCurrency(req.currency());
        if (req.billingCycle() != null) sub.setBillingCycle(SubscriptionBillingCycle.valueOf(req.billingCycle()));
        if (req.status() != null) sub.setStatus(SubscriptionStatus.valueOf(req.status()));
        if (req.startDate() != null) sub.setStartDate(LocalDate.parse(req.startDate()));
        if (req.nextDueDate() != null) sub.setNextDueDate(LocalDate.parse(req.nextDueDate()));
        if (req.autoRenew() != null) sub.setAutoRenew(req.autoRenew());
        if (req.websiteUrl() != null) sub.setWebsiteUrl(req.websiteUrl());
        if (req.contactEmail() != null) sub.setContactEmail(req.contactEmail());
        if (req.notes() != null) sub.setNotes(req.notes());
    }

    private SubscriptionResponse toResponse(SoftwareSubscription s) {
        return new SubscriptionResponse(
                s.getId(),
                s.getName(),
                s.getVendor(),
                s.getCategory().name(),
                s.getCost(),
                s.getCurrency(),
                s.getBillingCycle().name(),
                s.getStatus().name(),
                s.getStartDate() != null ? s.getStartDate().toString() : null,
                s.getNextDueDate() != null ? s.getNextDueDate().toString() : null,
                s.isAutoRenew(),
                s.getWebsiteUrl(),
                s.getContactEmail(),
                s.getNotes(),
                s.getMonthlyCost(),
                s.getYearlyCost(),
                s.getCreatedAt().toString(),
                s.getUpdatedAt().toString()
        );
    }
}
