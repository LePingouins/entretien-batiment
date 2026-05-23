package com.entretienbatiment.backend.modules.reptrips.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rep_trip_stop")
public class RepTripStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonBackReference
    private RepTrip trip;

    @Column(length = 512)
    private String address;

    private Double lat;
    private Double lng;

    @Column(nullable = false)
    private String reason = "OTHER"; // CLIENT | RESTAURANT | GAS | OFFICE | OTHER

    @Column(length = 512)
    private String notes;

    @Column(name = "stopped_at", nullable = false)
    private LocalDateTime stoppedAt = LocalDateTime.now();

    // Expose trip id in JSON without circular reference
    @com.fasterxml.jackson.annotation.JsonProperty("tripId")
    public Long getTripId() {
        return trip != null ? trip.getId() : null;
    }

    public RepTripStop() {}

    // Getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RepTrip getTrip() { return trip; }
    public void setTrip(RepTrip trip) { this.trip = trip; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getStoppedAt() { return stoppedAt; }
    public void setStoppedAt(LocalDateTime stoppedAt) { this.stoppedAt = stoppedAt; }
}
