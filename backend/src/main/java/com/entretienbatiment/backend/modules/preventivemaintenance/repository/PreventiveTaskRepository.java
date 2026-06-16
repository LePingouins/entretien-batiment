package com.entretienbatiment.backend.modules.preventivemaintenance.repository;

import com.entretienbatiment.backend.modules.preventivemaintenance.model.PreventiveTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreventiveTaskRepository extends JpaRepository<PreventiveTask, Long> {
    List<PreventiveTask> findAllByActiveTrueOrderByDisplayOrderAsc();
}
