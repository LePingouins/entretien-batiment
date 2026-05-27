package com.entretienbatiment.backend.modules.reptrips.repository;

import com.entretienbatiment.backend.modules.reptrips.model.RepTrip;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RepTripRepository extends JpaRepository<RepTrip, Long> {

    /** Lightweight projection for GPS management — does NOT select waypoints_json. */
    interface GpsSummary {
        Long getId();
        java.time.LocalDate getDate();
        Long getUserId();
        Double getTotalKm();
        java.time.LocalDateTime getWaypointsArchivedAt();
    }

    @Query("SELECT t.id as id, t.date as date, t.userId as userId, t.totalKm as totalKm, " +
           "t.waypointsArchivedAt as waypointsArchivedAt " +
           "FROM RepTrip t WHERE t.status = 'COMPLETED' AND t.waypointsJson IS NOT NULL " +
           "ORDER BY t.date DESC, t.id DESC")
    List<GpsSummary> findGpsSummaries(Pageable pageable);

    List<RepTrip> findByUserIdOrderByDateDescCreatedAtDesc(Long userId);

    @Query("SELECT t FROM RepTrip t WHERE t.userId = :userId AND t.status = 'IN_PROGRESS' ORDER BY t.createdAt DESC")
    List<RepTrip> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT t FROM RepTrip t ORDER BY t.date DESC, t.createdAt DESC")
    List<RepTrip> findAllOrderByDateDesc();

    @Query("SELECT t FROM RepTrip t WHERE t.date BETWEEN :start AND :end ORDER BY t.date DESC")
    List<RepTrip> findByDateBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT t FROM RepTrip t WHERE t.userId = :userId AND t.date BETWEEN :start AND :end ORDER BY t.date DESC")
    List<RepTrip> findByUserIdAndDateBetween(@Param("userId") Long userId,
                                              @Param("start") LocalDate start,
                                              @Param("end") LocalDate end);

    Optional<RepTrip> findByIdempotencyKey(String idempotencyKey);

    @Query("SELECT t FROM RepTrip t WHERE t.approvalStatus = 'PENDING' ORDER BY t.date DESC, t.createdAt DESC")
    List<RepTrip> findPendingApproval();

    @Query("SELECT COALESCE(SUM(t.totalKm), 0) FROM RepTrip t WHERE t.userId = :userId AND t.date BETWEEN :start AND :end")
    Double sumKmForUserBetween(@Param("userId") Long userId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(t.reimbursementCents), 0) FROM RepTrip t WHERE t.userId = :userId AND t.date BETWEEN :start AND :end")
    Long sumReimbursementForUserBetween(@Param("userId") Long userId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT t FROM RepTrip t WHERE t.endedAt IS NOT NULL AND t.endedAt < :cutoff AND t.waypointsArchivedAt IS NULL")
    List<RepTrip> findRetentionCandidates(@Param("cutoff") java.time.LocalDateTime cutoff);
}
