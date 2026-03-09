package com.entretienbatiment.backend.debug;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DebugErrorLogRepository extends JpaRepository<DebugErrorLog, Long> {

    long countByFingerprint(String fingerprint);

    long countBy();

    @Query("select count(distinct d.fingerprint) from DebugErrorLog d")
    long countDistinctFingerprints();

    Optional<DebugErrorLog> findTopByFingerprintOrderByOccurredAtDesc(String fingerprint);

    List<DebugErrorLog> findTop25ByFingerprintOrderByOccurredAtDesc(String fingerprint);

    @Query(value = """
            select
                fingerprint as fingerprint,
                max(exception_type) as exceptionType,
                max(error_message) as errorMessage,
                max(method_name) as methodName,
                count(*) as occurrences,
                max(occurred_at) as lastOccurredAt
            from debug_error_log
            group by fingerprint
            order by max(occurred_at) desc
            limit :limit
            """, nativeQuery = true)
    List<DebugErrorAggregateProjection> findGroupedErrors(@Param("limit") int limit);
}
