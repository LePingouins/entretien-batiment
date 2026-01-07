package com.entretienbatiment.backend.mileage;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MileageEntryRepository extends JpaRepository<MileageEntry, Long> {
}
