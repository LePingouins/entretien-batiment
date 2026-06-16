package com.entretienbatiment.backend.modules.preventivemaintenance.model;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "preventive_task_completion")
public class PreventiveTaskCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private PreventiveTask task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "completed_by_user_id")
    private AppUser completedBy;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt = Instant.now();

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Long getId() { return id; }

    public PreventiveTask getTask() { return task; }
    public void setTask(PreventiveTask task) { this.task = task; }

    public AppUser getCompletedBy() { return completedBy; }
    public void setCompletedBy(AppUser completedBy) { this.completedBy = completedBy; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
