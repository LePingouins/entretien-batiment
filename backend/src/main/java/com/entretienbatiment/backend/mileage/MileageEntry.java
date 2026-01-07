package com.entretienbatiment.backend.mileage;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class MileageEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;
    private String supplier;
    private Integer startKm;
    private Integer endKm;

    public MileageEntry() {}

    public MileageEntry(LocalDate date, String supplier, Integer startKm, Integer endKm) {
        this.date = date;
        this.supplier = supplier;
        this.startKm = startKm;
        this.endKm = endKm;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public Integer getStartKm() { return startKm; }
    public void setStartKm(Integer startKm) { this.startKm = startKm; }
    public Integer getEndKm() { return endKm; }
    public void setEndKm(Integer endKm) { this.endKm = endKm; }
    public Integer getTotalKm() {
        if (startKm == null || endKm == null) return null;
        int total = endKm - startKm;
        return total < 0 ? 0 : total;
    }
}
