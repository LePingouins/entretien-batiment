package com.entretienbatiment.backend.modules.expenses.repository;

import com.entretienbatiment.backend.modules.expenses.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserIdOrderByDateDescIdDesc(Long userId);

    List<Expense> findByUserIdAndArchivedFalseOrderByDateDescIdDesc(Long userId);

    List<Expense> findByUserIdAndArchivedTrueOrderByArchivedAtDesc(Long userId);

    List<Expense> findByArchivedTrueOrderByArchivedAtDesc();

    List<Expense> findByUserIdAndDateBetweenOrderByDateAscIdAsc(Long userId, LocalDate start, LocalDate end);
}
