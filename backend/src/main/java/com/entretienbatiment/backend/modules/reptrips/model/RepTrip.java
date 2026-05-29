package com.entretienbatiment.backend.modules.reptrips.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rep_trip")
public class RepTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String status = "IN_PROGRESS"; // IN_PROGRESS | COMPLETED

    private String purpose;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "start_address", length = 512)
    private String startAddress;

    @Column(name = "start_lat")
    private Double startLat;

    @Column(name = "start_lng")
    private Double startLng;

    @Column(name = "end_address", length = 512)
    private String endAddress;

    @Column(name = "end_lat")
    private Double endLat;

    @Column(name = "end_lng")
    private Double endLng;

    @Column(name = "total_km")
    private Double totalKm;

    /** Optimal route via origin + recorded stops + destination (deterministic). */
    @Column(name = "ideal_km")
    private Double idealKm;

    /** Route through filtered GPS intermediates — what was actually driven. */
    @Column(name = "actual_km")
    private Double actualKm;

    /**
     * Which computation populated total_km: "actual", "ideal_fallback",
     * "haversine", "manual", etc. Audit trail for reimbursement disputes.
     */
    @Column(name = "distance_source", length = 32)
    private String distanceSource;

    @Column(name = "distance_method", nullable = false)
    private String distanceMethod = "HAVERSINE"; // HAVERSINE | ROAD | GPS | OSRM | GOOGLE

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "waypoints_json", columnDefinition = "TEXT")
    private String waypointsJson;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ─── V38: full-feature columns ─────────────────────────────────────────────

    /** Google-returned encoded polyline of the actual route (snapped to roads). */
    @Column(name = "actual_polyline", columnDefinition = "TEXT")
    private String actualPolyline;

    /** OSRM cross-check distance, when available. Used as third opinion vs Google. */
    @Column(name = "osrm_km")
    private Double osrmKm;

    /** Trip category: CLIENT | PICKUP | TRAINING | PERSONAL | OTHER. */
    @Column(name = "category", nullable = false, length = 32)
    private String category = "CLIENT";

    /** Approval workflow: PENDING | APPROVED | REJECTED | AUTO_APPROVED. */
    @Column(name = "approval_status", nullable = false, length = 16)
    private String approvalStatus = "PENDING";

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approval_note", length = 512)
    private String approvalNote;

    /** Free-text comment by the driver at submission ("road closure on 116"). */
    @Column(name = "driver_note", columnDefinition = "TEXT")
    private String driverNote;

    /** Once locked, the trip cannot be edited by anyone (including admin) without
     *  going through an explicit unlock + audit trail. */
    @Column(name = "locked", nullable = false)
    private boolean locked = false;

    @Column(name = "locked_at")
    private LocalDateTime lockedAt;

    /** Client-generated UUID to guard against duplicate submissions on retry. */
    @Column(name = "idempotency_key", length = 64, unique = true)
    private String idempotencyKey;

    /** Mileage rate (cents per km) snapshotted at submission so historical
     *  rate changes don't retroactively alter old reimbursements. */
    @Column(name = "mileage_rate_cents")
    private Integer mileageRateCents;

    /** Computed reimbursement amount in cents. = totalKm × mileageRateCents. */
    @Column(name = "reimbursement_cents")
    private Integer reimbursementCents;

    /**
     * Bitset of suspicion flags raised by the heuristics, e.g.
     *   bit 0 = outside business hours
     *   bit 1 = weekend / holiday
     *   bit 2 = no GPS waypoints
     *   bit 3 = round-number km (heuristic for manual entry)
     *   bit 4 = unusually long (>4 std dev for this user)
     *   bit 5 = ideal_fallback applied (drift detected)
     */
    @Column(name = "suspicion_flags", nullable = false)
    private int suspicionFlags = 0;

    /** Set when raw waypoints are purged for data-retention reasons. */
    @Column(name = "waypoints_archived_at")
    private LocalDateTime waypointsArchivedAt;

    /** Optional FK to the vehicle used for this trip. */
    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(nullable = false)
    private Boolean archived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @com.fasterxml.jackson.annotation.JsonManagedReference
    private List<RepTripStop> stops = new ArrayList<>();

    // Transient: populated from joined user query for admin views
    @Transient
    private String userEmail;

    public RepTrip() {}

    // Getters & setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStartAddress() { return startAddress; }
    public void setStartAddress(String startAddress) { this.startAddress = startAddress; }

    public Double getStartLat() { return startLat; }
    public void setStartLat(Double startLat) { this.startLat = startLat; }

    public Double getStartLng() { return startLng; }
    public void setStartLng(Double startLng) { this.startLng = startLng; }

    public String getEndAddress() { return endAddress; }
    public void setEndAddress(String endAddress) { this.endAddress = endAddress; }

    public Double getEndLat() { return endLat; }
    public void setEndLat(Double endLat) { this.endLat = endLat; }

    public Double getEndLng() { return endLng; }
    public void setEndLng(Double endLng) { this.endLng = endLng; }

    public Double getTotalKm() { return totalKm; }
    public void setTotalKm(Double totalKm) { this.totalKm = totalKm; }

    public Double getIdealKm() { return idealKm; }
    public void setIdealKm(Double idealKm) { this.idealKm = idealKm; }

    public Double getActualKm() { return actualKm; }
    public void setActualKm(Double actualKm) { this.actualKm = actualKm; }

    public String getDistanceSource() { return distanceSource; }
    public void setDistanceSource(String distanceSource) { this.distanceSource = distanceSource; }

    public String getDistanceMethod() { return distanceMethod; }
    public void setDistanceMethod(String distanceMethod) { this.distanceMethod = distanceMethod; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getWaypointsJson() { return waypointsJson; }
    public void setWaypointsJson(String waypointsJson) { this.waypointsJson = waypointsJson; }

    public LocalDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<RepTripStop> getStops() { return stops; }
    public void setStops(List<RepTripStop> stops) { this.stops = stops; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    // ─── V38 getters/setters ─────────────────────────────────────────────────
    public String getActualPolyline() { return actualPolyline; }
    public void setActualPolyline(String actualPolyline) { this.actualPolyline = actualPolyline; }

    public Double getOsrmKm() { return osrmKm; }
    public void setOsrmKm(Double osrmKm) { this.osrmKm = osrmKm; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }

    public Long getApprovedByUserId() { return approvedByUserId; }
    public void setApprovedByUserId(Long approvedByUserId) { this.approvedByUserId = approvedByUserId; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public String getApprovalNote() { return approvalNote; }
    public void setApprovalNote(String approvalNote) { this.approvalNote = approvalNote; }

    public String getDriverNote() { return driverNote; }
    public void setDriverNote(String driverNote) { this.driverNote = driverNote; }

    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }

    public LocalDateTime getLockedAt() { return lockedAt; }
    public void setLockedAt(LocalDateTime lockedAt) { this.lockedAt = lockedAt; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public Integer getMileageRateCents() { return mileageRateCents; }
    public void setMileageRateCents(Integer mileageRateCents) { this.mileageRateCents = mileageRateCents; }

    public Integer getReimbursementCents() { return reimbursementCents; }
    public void setReimbursementCents(Integer reimbursementCents) { this.reimbursementCents = reimbursementCents; }

    public int getSuspicionFlags() { return suspicionFlags; }
    public void setSuspicionFlags(int suspicionFlags) { this.suspicionFlags = suspicionFlags; }

    public LocalDateTime getWaypointsArchivedAt() { return waypointsArchivedAt; }
    public void setWaypointsArchivedAt(LocalDateTime waypointsArchivedAt) { this.waypointsArchivedAt = waypointsArchivedAt; }

    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }

    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    /** Haversine formula — distance in km between two lat/lng points */
    public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 10.0) / 10.0; // round to 1 decimal
    }
}
