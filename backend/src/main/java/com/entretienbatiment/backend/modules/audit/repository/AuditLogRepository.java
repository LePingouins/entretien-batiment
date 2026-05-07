package com.entretienbatiment.backend.modules.audit.repository;

import com.entretienbatiment.backend.modules.audit.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    long countByOccurredAtAfter(Instant from);

    long countByActionAndOccurredAtAfter(String action, Instant from);

    @Query("SELECT COUNT(DISTINCT a.userId) FROM AuditLog a WHERE a.userId IS NOT NULL AND a.occurredAt >= :from")
    long countDistinctUserIdByOccurredAtAfter(@Param("from") Instant from);

    @Query("SELECT a.action, COUNT(a) FROM AuditLog a WHERE a.occurredAt >= :from GROUP BY a.action ORDER BY COUNT(a) DESC")
    List<Object[]> findActionCountsAfter(@Param("from") Instant from);

    @Query(value = """
            SELECT user_id, user_email, user_role,
                   COUNT(*)                                                      AS total_actions,
                   COUNT(CASE WHEN action = 'LOGIN'                       THEN 1 END) AS login_count,
                   COUNT(CASE WHEN action = 'LOGOUT'                      THEN 1 END) AS logout_count,
                   COUNT(CASE WHEN action = 'CREATE_WORK_ORDER'           THEN 1 END) AS work_orders_created,
                   COUNT(CASE WHEN action = 'CREATE_URGENT_WORK_ORDER'    THEN 1 END) AS urgent_work_orders_created,
                   MAX(occurred_at)                                               AS last_seen
            FROM audit_logs
            WHERE occurred_at >= :from AND user_id IS NOT NULL
            GROUP BY user_id, user_email, user_role
            ORDER BY total_actions DESC
            """, nativeQuery = true)
    List<Object[]> findUserStatsAfter(@Param("from") Instant from);

    @Query(value = """
            SELECT CAST(occurred_at AT TIME ZONE 'UTC' AS DATE) AS day,
                   COUNT(*)                                    AS cnt
            FROM audit_logs
            WHERE occurred_at >= :from
            GROUP BY day
            ORDER BY day
            """, nativeQuery = true)
    List<Object[]> findTimelineAfter(@Param("from") Instant from);

    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:userId IS NULL OR a.userId = :userId)
              AND (:action IS NULL OR a.action = :action)
              AND (:from   IS NULL OR a.occurredAt >= :from)
              AND (:to     IS NULL OR a.occurredAt <= :to)
            ORDER BY a.occurredAt DESC
            """)
    Page<AuditLog> findFiltered(
            @Param("userId") Long userId,
            @Param("action") String action,
            @Param("from")   Instant from,
            @Param("to")     Instant to,
            Pageable pageable
    );
}
