package com.entretienbatiment.backend.modules.permissions.service;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.auth.model.Role;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import com.entretienbatiment.backend.modules.permissions.model.RolePageAccess;
import com.entretienbatiment.backend.modules.permissions.model.UserPageAccessOverride;
import com.entretienbatiment.backend.modules.permissions.repository.RolePageAccessRepository;
import com.entretienbatiment.backend.modules.permissions.repository.UserPageAccessOverrideRepository;

@Service("pageAccessService")
@Transactional
public class PageAccessService {

    public static final String PAGE_DASHBOARD = "DASHBOARD";
    public static final String PAGE_WORK_ORDERS = "WORK_ORDERS";
    public static final String PAGE_URGENT_WORK_ORDERS = "URGENT_WORK_ORDERS";
    public static final String PAGE_MILEAGE = "MILEAGE";
    public static final String PAGE_ARCHIVE = "ARCHIVE";
    public static final String PAGE_ANALYTICS = "ANALYTICS";
    public static final String PAGE_USERS = "USERS";
    public static final String PAGE_NOTIFICATIONS = "NOTIFICATIONS";
    public static final String PAGE_INVENTORY = "INVENTORY";
    public static final String PAGE_INVENTORY_PRODUCTS = "INVENTORY_PRODUCTS";
    public static final String PAGE_SUBSCRIPTIONS = "SUBSCRIPTIONS";

    private static final List<String> MANAGED_PAGE_KEYS = List.of(
            PAGE_DASHBOARD,
            PAGE_WORK_ORDERS,
            PAGE_URGENT_WORK_ORDERS,
            PAGE_MILEAGE,
            PAGE_ARCHIVE,
            PAGE_ANALYTICS,
            PAGE_USERS,
            PAGE_NOTIFICATIONS,
            PAGE_INVENTORY,
            PAGE_INVENTORY_PRODUCTS,
            PAGE_SUBSCRIPTIONS
    );

    private static final Map<Role, Set<String>> DEFAULT_ALLOWED_BY_ROLE = defaultAllowedByRole();

    private final AppUserRepository userRepository;
    private final RolePageAccessRepository rolePageAccessRepository;
    private final UserPageAccessOverrideRepository userPageAccessOverrideRepository;

    public PageAccessService(
            AppUserRepository userRepository,
            RolePageAccessRepository rolePageAccessRepository,
            UserPageAccessOverrideRepository userPageAccessOverrideRepository
    ) {
        this.userRepository = userRepository;
        this.rolePageAccessRepository = rolePageAccessRepository;
        this.userPageAccessOverrideRepository = userPageAccessOverrideRepository;
    }

    @Transactional(readOnly = true)
    public List<PageAccessEntryDto> getCurrentUserPageAccess(Authentication authentication) {
        AppUser user = requireAuthenticatedUser(authentication);
        return toPageEntries(resolveEffectiveAccess(
                effectiveAccessRole(user.getRole()),
                loadStoredRoleRules(),
                mapOverridesByPage(userPageAccessOverrideRepository.findByUserId(user.getId()))
        ));
    }

    @Transactional(readOnly = true)
    public List<RolePageAccessRuleDto> getRoleRules() {
        Map<String, Map<Role, RolePageAccess>> storedRules = loadStoredRoleRules();

        List<RolePageAccessRuleDto> result = new ArrayList<>();
        for (String pageKey : MANAGED_PAGE_KEYS) {
            result.add(new RolePageAccessRuleDto(
                    pageKey,
                    resolveRoleAllowed(pageKey, Role.ADMIN, storedRules),
                    resolveRoleAllowed(pageKey, Role.TECH, storedRules),
                    resolveRoleAllowed(pageKey, Role.WORKER, storedRules)
            ));
        }
        return result;
    }

    public List<RolePageAccessRuleDto> updateRoleRules(List<RolePageAccessRuleUpdateRequest> updates) {
        if (updates == null || updates.isEmpty()) {
            throw badRequest("At least one page access rule is required");
        }

        for (RolePageAccessRuleUpdateRequest update : updates) {
            String pageKey = normalizeAndValidatePageKey(update.pageKey());
            if (update.admin() == null || update.tech() == null || update.worker() == null) {
                throw badRequest("Each rule must include admin, tech and worker values");
            }

            upsertRoleRule(pageKey, Role.ADMIN, update.admin());
            upsertRoleRule(pageKey, Role.TECH, update.tech());
            upsertRoleRule(pageKey, Role.WORKER, update.worker());
        }

        return getRoleRules();
    }

    @Transactional(readOnly = true)
    public List<UserPageAccessOverviewDto> getUserAccessOverview() {
        List<AppUser> users = userRepository.findAll().stream()
                .sorted((a, b) -> a.getEmail().compareToIgnoreCase(b.getEmail()))
                .toList();

        Map<String, Map<Role, RolePageAccess>> storedRules = loadStoredRoleRules();
        List<Long> userIds = users.stream().map(AppUser::getId).toList();
        Map<Long, Map<String, UserPageAccessOverride>> overridesByUser = userPageAccessOverrideRepository
                .findByUserIdIn(userIds)
                .stream()
                .collect(Collectors.groupingBy(
                        UserPageAccessOverride::getUserId,
                        Collectors.toMap(UserPageAccessOverride::getPageKey, it -> it, (a, b) -> b)
                ));

        return users.stream()
                .map(user -> toUserOverview(user, storedRules, overridesByUser.getOrDefault(user.getId(), Map.of())))
                .toList();
    }

    public UserPageAccessOverviewDto updateUserOverrides(Long userId, List<UserPageAccessUpdateRequest> updates) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (updates == null || updates.isEmpty()) {
            throw badRequest("At least one user override is required");
        }

        Map<String, OverrideState> requestedStates = new LinkedHashMap<>();
        Map<String, UserPageAccessUpdateRequest> updatesByPage = new LinkedHashMap<>();
        for (UserPageAccessUpdateRequest update : updates) {
            String pageKey = normalizeAndValidatePageKey(update.pageKey());
            OverrideState state = update.state() == null ? OverrideState.DEFAULT : update.state();
            requestedStates.put(pageKey, state);
            updatesByPage.put(pageKey, update);
        }

        Map<String, UserPageAccessOverride> existingByPage = mapOverridesByPage(
                userPageAccessOverrideRepository.findByUserId(userId)
        );

        for (Map.Entry<String, OverrideState> entry : requestedStates.entrySet()) {
            String pageKey = entry.getKey();
            OverrideState state = entry.getValue();
            UserPageAccessOverride existing = existingByPage.get(pageKey);

            if (state == OverrideState.DEFAULT) {
                if (existing != null) {
                    userPageAccessOverrideRepository.delete(existing);
                }
                continue;
            }

            boolean allowed = state == OverrideState.ALLOW;
            UserPageAccessUpdateRequest update = updatesByPage.get(pageKey);
            String rawFrom  = update != null ? update.validFrom()  : null;
            String rawUntil = update != null ? update.validUntil() : null;
            Instant parsedFrom  = parseInstantOrNull(rawFrom);
            Instant parsedUntil = parseInstantOrNull(rawUntil);

            if (existing == null) {
                UserPageAccessOverride created = new UserPageAccessOverride();
                created.setUserId(userId);
                created.setPageKey(pageKey);
                created.setAllowed(allowed);
                created.setValidFrom(parsedFrom);
                created.setValidUntil(parsedUntil);
                userPageAccessOverrideRepository.save(created);
            } else {
                existing.setAllowed(allowed);
                existing.setValidFrom(parsedFrom);
                existing.setValidUntil(parsedUntil);
                userPageAccessOverrideRepository.save(existing);
            }
        }

        Map<String, Map<Role, RolePageAccess>> storedRules = loadStoredRoleRules();
        Map<String, UserPageAccessOverride> refreshedOverrides = mapOverridesByPage(
                userPageAccessOverrideRepository.findByUserId(userId)
        );

        return toUserOverview(user, storedRules, refreshedOverrides);
    }

    @Transactional(readOnly = true)
    public boolean canAccess(Authentication authentication, String rawPageKey) {
        if (authentication == null || authentication.getName() == null || rawPageKey == null || rawPageKey.isBlank()) {
            return false;
        }

        String pageKey = rawPageKey.trim().toUpperCase(Locale.ROOT);
        if (!MANAGED_PAGE_KEYS.contains(pageKey)) {
            return false;
        }

        AppUser user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .filter(AppUser::isEnabled)
                .orElse(null);

        if (user == null || user.getRole() == null) {
            return false;
        }

        Role effectiveRole = effectiveAccessRole(user.getRole());
        if (effectiveRole == null) {
            return false;
        }

        UserPageAccessOverride override = userPageAccessOverrideRepository
                .findByUserIdAndPageKey(user.getId(), pageKey)
                .orElse(null);

        if (override != null) {
            if (!override.isActiveNow()) {
                // Schedule has expired or hasn't started yet — fall through to role default
            } else {
                return override.isAllowed();
            }
        }

        return rolePageAccessRepository.findByPageKeyAndRole(pageKey, effectiveRole)
                .map(RolePageAccess::isAllowed)
            .orElse(defaultAllowed(effectiveRole, pageKey));
    }

    private AppUser requireAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }

        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .filter(AppUser::isEnabled)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated"));
    }

    private void upsertRoleRule(String pageKey, Role role, boolean allowed) {
        RolePageAccess rule = rolePageAccessRepository
                .findByPageKeyAndRole(pageKey, role)
                .orElseGet(() -> {
                    RolePageAccess created = new RolePageAccess();
                    created.setPageKey(pageKey);
                    created.setRole(role);
                    return created;
                });

        rule.setAllowed(allowed);
        rolePageAccessRepository.save(rule);
    }

    private String normalizeAndValidatePageKey(String rawPageKey) {
        if (rawPageKey == null || rawPageKey.isBlank()) {
            throw badRequest("pageKey is required");
        }

        String pageKey = rawPageKey.trim().toUpperCase(Locale.ROOT);
        if (!MANAGED_PAGE_KEYS.contains(pageKey)) {
            throw badRequest("Unsupported pageKey: " + rawPageKey);
        }

        return pageKey;
    }

    private Map<String, Map<Role, RolePageAccess>> loadStoredRoleRules() {
        return rolePageAccessRepository.findByPageKeyIn(MANAGED_PAGE_KEYS)
                .stream()
                .collect(Collectors.groupingBy(
                        RolePageAccess::getPageKey,
                        Collectors.toMap(RolePageAccess::getRole, it -> it, (a, b) -> b)
                ));
    }

    private boolean resolveRoleAllowed(String pageKey, Role role, Map<String, Map<Role, RolePageAccess>> storedRules) {
        Map<Role, RolePageAccess> pageRules = storedRules.get(pageKey);
        if (pageRules != null && pageRules.get(role) != null) {
            return pageRules.get(role).isAllowed();
        }
        return defaultAllowed(role, pageKey);
    }

    private boolean defaultAllowed(Role role, String pageKey) {
        return DEFAULT_ALLOWED_BY_ROLE.getOrDefault(role, Set.of()).contains(pageKey);
    }

    private LinkedHashMap<String, Boolean> resolveEffectiveAccess(
            Role role,
            Map<String, Map<Role, RolePageAccess>> storedRules,
            Map<String, UserPageAccessOverride> overridesByPage
    ) {
        LinkedHashMap<String, Boolean> effective = new LinkedHashMap<>();
        for (String pageKey : MANAGED_PAGE_KEYS) {
            UserPageAccessOverride override = overridesByPage.get(pageKey);
            if (override != null) {
                effective.put(pageKey, override.isAllowed());
            } else {
                effective.put(pageKey, resolveRoleAllowed(pageKey, role, storedRules));
            }
        }
        return effective;
    }

    private Map<String, UserPageAccessOverride> mapOverridesByPage(List<UserPageAccessOverride> overrides) {
        return overrides.stream()
                .collect(Collectors.toMap(UserPageAccessOverride::getPageKey, it -> it, (a, b) -> b));
    }

    private List<PageAccessEntryDto> toPageEntries(Map<String, Boolean> effectiveMap) {
        return MANAGED_PAGE_KEYS.stream()
                .map(pageKey -> new PageAccessEntryDto(pageKey, Boolean.TRUE.equals(effectiveMap.get(pageKey))))
                .toList();
    }

    private UserPageAccessOverviewDto toUserOverview(
            AppUser user,
            Map<String, Map<Role, RolePageAccess>> storedRules,
            Map<String, UserPageAccessOverride> overridesByPage
    ) {
        List<UserPageAccessItemDto> pages = new ArrayList<>();
        for (String pageKey : MANAGED_PAGE_KEYS) {
            UserPageAccessOverride override = overridesByPage.get(pageKey);
            OverrideState state = OverrideState.DEFAULT;
            boolean effectiveAllowed;

            String overrideValidFrom  = null;
            String overrideValidUntil = null;
            if (override != null) {
                state = override.isAllowed() ? OverrideState.ALLOW : OverrideState.DENY;
                overrideValidFrom  = override.getValidFrom()  != null ? override.getValidFrom().toString()  : null;
                overrideValidUntil = override.getValidUntil() != null ? override.getValidUntil().toString() : null;
                effectiveAllowed = override.isActiveNow() ? override.isAllowed()
                        : resolveRoleAllowed(pageKey, effectiveAccessRole(user.getRole()), storedRules);
            } else {
                effectiveAllowed = resolveRoleAllowed(pageKey, effectiveAccessRole(user.getRole()), storedRules);
            }

            pages.add(new UserPageAccessItemDto(pageKey, state, effectiveAllowed, overrideValidFrom, overrideValidUntil));
        }

        return new UserPageAccessOverviewDto(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                pages
        );
    }

    private static Instant parseInstantOrNull(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Instant.parse(raw);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private Role effectiveAccessRole(Role role) {
        if (role == null) {
            return null;
        }
        return role.isAdminLike() ? Role.ADMIN : role;
    }

    private static Map<Role, Set<String>> defaultAllowedByRole() {
        Map<Role, Set<String>> defaults = new EnumMap<>(Role.class);

        defaults.put(Role.ADMIN, Set.of(
                PAGE_DASHBOARD,
                PAGE_WORK_ORDERS,
                PAGE_URGENT_WORK_ORDERS,
                PAGE_MILEAGE,
                PAGE_ARCHIVE,
                PAGE_ANALYTICS,
                PAGE_USERS,
                PAGE_NOTIFICATIONS,
                PAGE_INVENTORY,
                PAGE_INVENTORY_PRODUCTS,
                PAGE_SUBSCRIPTIONS
        ));

        defaults.put(Role.DEVELOPPER, defaults.get(Role.ADMIN));

        defaults.put(Role.TECH, Set.of(
                PAGE_DASHBOARD,
                PAGE_WORK_ORDERS,
                PAGE_URGENT_WORK_ORDERS,
                PAGE_MILEAGE,
                PAGE_NOTIFICATIONS
        ));

        defaults.put(Role.WORKER, Set.of(
                PAGE_DASHBOARD,
                PAGE_WORK_ORDERS,
                PAGE_URGENT_WORK_ORDERS,
                PAGE_MILEAGE,
                PAGE_NOTIFICATIONS
        ));

        return defaults;
    }

    public enum OverrideState {
        DEFAULT,
        ALLOW,
        DENY
    }

    public record PageAccessEntryDto(String pageKey, boolean allowed) {}

    public record RolePageAccessRuleDto(String pageKey, boolean admin, boolean tech, boolean worker) {}

    public record RolePageAccessRuleUpdateRequest(String pageKey, Boolean admin, Boolean tech, Boolean worker) {}

    public record UserPageAccessItemDto(String pageKey, OverrideState state, boolean effectiveAllowed, String validFrom, String validUntil) {}

    public record UserPageAccessOverviewDto(Long userId, String email, Role role, boolean enabled, List<UserPageAccessItemDto> pages) {}

    public record UserPageAccessUpdateRequest(String pageKey, OverrideState state, String validFrom, String validUntil) {}
}
