package com.entretienbatiment.backend.modules.permissions.repository;

import com.entretienbatiment.backend.modules.auth.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.entretienbatiment.backend.modules.permissions.model.RolePageAccess;

public interface RolePageAccessRepository extends JpaRepository<RolePageAccess, Long> {
    Optional<RolePageAccess> findByPageKeyAndRole(String pageKey, Role role);
    List<RolePageAccess> findByPageKeyIn(List<String> pageKeys);
}
