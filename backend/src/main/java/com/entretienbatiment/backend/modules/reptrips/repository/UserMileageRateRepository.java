package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.UserMileageRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserMileageRateRepository extends JpaRepository<UserMileageRate, Long> {

    /**
     * Returns the most-specific rate effective on the given date:
     * user-specific takes priority over company default (userId IS NULL).
     */
    @Query("SELECT r FROM UserMileageRate r " +
           "WHERE (r.userId = :userId OR r.userId IS NULL) " +
           "  AND r.effectiveFrom <= :on " +
           "ORDER BY (CASE WHEN r.userId IS NULL THEN 1 ELSE 0 END) ASC, r.effectiveFrom DESC")
    List<UserMileageRate> findApplicableRates(@Param("userId") Long userId, @Param("on") LocalDate on);

    default Optional<UserMileageRate> findRateFor(Long userId, LocalDate on) {
        List<UserMileageRate> list = findApplicableRates(userId, on);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    List<UserMileageRate> findByUserIdIsNullOrderByEffectiveFromDesc();

    List<UserMileageRate> findByUserIdOrderByEffectiveFromDesc(Long userId);
}
