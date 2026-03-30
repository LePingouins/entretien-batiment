package com.entretienbatiment.backend.modules.mileage.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import com.entretienbatiment.backend.modules.mileage.model.MileageEntry;

public interface MileageEntryRepository extends JpaRepository<MileageEntry, Long>, JpaSpecificationExecutor<MileageEntry> {
    
    @Query("SELECT m FROM MileageEntry m WHERE m.archived = false AND m.date < :cutoffDate")
    List<MileageEntry> findMileageEntriesToArchive(
        @Param("cutoffDate") java.time.LocalDate cutoffDate
    );

    List<MileageEntry> findByArchivedFalse();
            // Removed broken JPQL query. Use Specification for advanced filtering.

    List<MileageEntry> findByArchivedTrue();
}

