package com.entretienbatiment.backend.urgentworkorders;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UrgentWorkOrderService {
    private final UrgentWorkOrderRepository repository;

    public UrgentWorkOrderService(UrgentWorkOrderRepository repository) {
        this.repository = repository;
    }

    public List<UrgentWorkOrder> findAll() {
        return repository.findAll();
    }

    public Optional<UrgentWorkOrder> findById(Long id) {
        return repository.findById(id);
    }

    public UrgentWorkOrder save(UrgentWorkOrder urgentWorkOrder) {
        return repository.save(urgentWorkOrder);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
