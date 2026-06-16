package com.entretienbatiment.backend.modules.preventivemaintenance.repository;

import com.entretienbatiment.backend.modules.preventivemaintenance.model.PreventiveTaskCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PreventiveTaskCompletionRepository extends JpaRepository<PreventiveTaskCompletion, Long> {

    /**
     * For each task, return only the most recent completion record.
     * Uses a subquery that selects the MAX id per task (id is auto-increment so
     * the highest id == most recent).
     */
    @Query("""
        SELECT c FROM PreventiveTaskCompletion c
        WHERE c.id IN (
            SELECT MAX(c2.id) FROM PreventiveTaskCompletion c2
            GROUP BY c2.task.id
        )
    """)
    List<PreventiveTaskCompletion> findLatestCompletionPerTask();
}
