package com.entretienbatiment.backend.modules.expenses.repository;

import com.entretienbatiment.backend.modules.expenses.model.ExpenseReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseReceiptRepository extends JpaRepository<ExpenseReceipt, Long> {
}
