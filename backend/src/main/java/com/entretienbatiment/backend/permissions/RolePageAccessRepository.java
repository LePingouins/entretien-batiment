package com.entretienbatiment.backend.permissions;

import com.entretienbatiment.backend.auth.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RolePageAccessRepository extends JpaRepository<RolePageAccess, Long> {
    Optional<RolePageAccess> findByPageKeyAndRole(String pageKey, Role role);
    List<RolePageAccess> findByPageKeyIn(List<String> pageKeys);
}
