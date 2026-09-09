package com.entretienbatiment.backend.modules.projectboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import com.entretienbatiment.backend.modules.projectboard.model.ProjectBoardTask;

public interface ProjectBoardTaskRepository extends JpaRepository<ProjectBoardTask, Long>, JpaSpecificationExecutor<ProjectBoardTask> {
    List<ProjectBoardTask> findByArchivedFalse();
    List<ProjectBoardTask> findByStatusAndArchivedFalse(String status);
}
