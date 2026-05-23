package com.entretienbatiment.backend.modules.reptrips.controller;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.reptrips.model.RepTrip;
import com.entretienbatiment.backend.modules.reptrips.model.RepTripStop;
import com.entretienbatiment.backend.modules.reptrips.repository.RepTripRepository;
import com.entretienbatiment.backend.modules.reptrips.repository.RepTripStopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rep-trips")
@PreAuthorize("@pageAccessService.canAccess(authentication, 'REP_TRIPS')")
public class RepTripController {

    @Autowired
    private RepTripRepository tripRepository;

    @Autowired
    private RepTripStopRepository stopRepository;

    @Autowired
    private AppUserRepository userRepository;

    // ─── Helper: resolve current user ────────────────────────────────────────

    private AppUser requireUser(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ─── User: list own trips ─────────────────────────────────────────────────

    @GetMapping
    public List<RepTrip> getMyTrips(Authentication auth) {
        AppUser user = requireUser(auth);
        return tripRepository.findByUserIdOrderByDateDescCreatedAtDesc(user.getId());
    }

    // ─── User: get single trip ────────────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<RepTrip> getTrip(@PathVariable Long id, Authentication auth) {
        AppUser user = requireUser(auth);
        return tripRepository.findById(id)
                .filter(t -> t.getUserId().equals(user.getId()) || user.getRole().isAdminLike())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── User: start a new trip ───────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<RepTrip> startTrip(@RequestBody RepTrip body, Authentication auth) {
        AppUser user = requireUser(auth);
        RepTrip trip = new RepTrip();
        trip.setUserId(user.getId());
        trip.setDate(body.getDate() != null ? body.getDate() : LocalDate.now());
        trip.setStatus("IN_PROGRESS");
        trip.setPurpose(body.getPurpose());
        trip.setNotes(body.getNotes());
        trip.setStartAddress(body.getStartAddress());
        trip.setStartLat(body.getStartLat());
        trip.setStartLng(body.getStartLng());
        trip.setDistanceMethod(body.getDistanceMethod() != null ? body.getDistanceMethod() : "HAVERSINE");
        return ResponseEntity.ok(tripRepository.save(trip));
    }

    // ─── User: update / end trip ──────────────────────────────────────────────

    @PatchMapping("/{id}")
    public ResponseEntity<RepTrip> updateTrip(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body,
                                               Authentication auth) {
        AppUser user = requireUser(auth);
        Optional<RepTrip> opt = tripRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        RepTrip trip = opt.get();
        if (!trip.getUserId().equals(user.getId()) && !user.getRole().isAdminLike()) {
            return ResponseEntity.status(403).build();
        }

        if (body.containsKey("status"))       trip.setStatus((String) body.get("status"));
        if (body.containsKey("purpose"))      trip.setPurpose((String) body.get("purpose"));
        if (body.containsKey("notes"))        trip.setNotes((String) body.get("notes"));
        if (body.containsKey("endAddress"))   trip.setEndAddress((String) body.get("endAddress"));
        if (body.containsKey("endLat"))       trip.setEndLat(toDouble(body.get("endLat")));
        if (body.containsKey("endLng"))       trip.setEndLng(toDouble(body.get("endLng")));

        // Auto-compute totalKm when ending trip with coordinates
        if (body.containsKey("totalKm")) {
            trip.setTotalKm(toDouble(body.get("totalKm")));
        } else if ("COMPLETED".equals(trip.getStatus())
                && trip.getStartLat() != null && trip.getStartLng() != null
                && trip.getEndLat() != null && trip.getEndLng() != null) {
            trip.setTotalKm(RepTrip.haversineKm(
                    trip.getStartLat(), trip.getStartLng(),
                    trip.getEndLat(), trip.getEndLng()));
        }

        return ResponseEntity.ok(tripRepository.save(trip));
    }

    // ─── User: delete trip ────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrip(@PathVariable Long id, Authentication auth) {
        AppUser user = requireUser(auth);
        Optional<RepTrip> opt = tripRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        RepTrip trip = opt.get();
        if (!trip.getUserId().equals(user.getId()) && !user.getRole().isAdminLike()) {
            return ResponseEntity.status(403).build();
        }
        tripRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Stops ────────────────────────────────────────────────────────────────

    @PostMapping("/{tripId}/stops")
    public ResponseEntity<RepTripStop> addStop(@PathVariable Long tripId,
                                                @RequestBody RepTripStop body,
                                                Authentication auth) {
        AppUser user = requireUser(auth);
        Optional<RepTrip> opt = tripRepository.findById(tripId);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        RepTrip trip = opt.get();
        if (!trip.getUserId().equals(user.getId()) && !user.getRole().isAdminLike()) {
            return ResponseEntity.status(403).build();
        }
        RepTripStop stop = new RepTripStop();
        stop.setTrip(trip);
        stop.setAddress(body.getAddress());
        stop.setLat(body.getLat());
        stop.setLng(body.getLng());
        stop.setReason(body.getReason() != null ? body.getReason() : "OTHER");
        stop.setNotes(body.getNotes());
        if (body.getStoppedAt() != null) stop.setStoppedAt(body.getStoppedAt());
        return ResponseEntity.ok(stopRepository.save(stop));
    }

    @DeleteMapping("/{tripId}/stops/{stopId}")
    public ResponseEntity<Void> deleteStop(@PathVariable Long tripId,
                                            @PathVariable Long stopId,
                                            Authentication auth) {
        AppUser user = requireUser(auth);
        Optional<RepTrip> opt = tripRepository.findById(tripId);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        RepTrip trip = opt.get();
        if (!trip.getUserId().equals(user.getId()) && !user.getRole().isAdminLike()) {
            return ResponseEntity.status(403).build();
        }
        stopRepository.deleteById(stopId);
        return ResponseEntity.noContent().build();
    }

    // ─── Admin: all trips ─────────────────────────────────────────────────────

    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('ADMIN','DEVELOPPER')")
    public List<RepTrip> getAllTrips(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Long userId) {

        List<RepTrip> trips;

        LocalDate start = parseDate(startDate);
        LocalDate end   = parseDate(endDate);

        if (start != null && end != null && userId != null) {
            trips = tripRepository.findByUserIdAndDateBetween(userId, start, end);
        } else if (start != null && end != null) {
            trips = tripRepository.findByDateBetween(start, end);
        } else if (userId != null) {
            trips = tripRepository.findByUserIdOrderByDateDescCreatedAtDesc(userId);
        } else {
            trips = tripRepository.findAllOrderByDateDesc();
        }

        // Enrich with user email
        trips.forEach(t -> userRepository.findById(t.getUserId())
                .ifPresent(u -> t.setUserEmail(u.getEmail())));
        return trips;
    }

    // ─── Admin: CSV export ────────────────────────────────────────────────────

    @GetMapping("/admin/export")
    @PreAuthorize("hasAnyRole('ADMIN','DEVELOPPER')")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Long userId) {

        List<RepTrip> trips;
        LocalDate start = parseDate(startDate);
        LocalDate end   = parseDate(endDate);

        if (start != null && end != null && userId != null) {
            trips = tripRepository.findByUserIdAndDateBetween(userId, start, end);
        } else if (start != null && end != null) {
            trips = tripRepository.findByDateBetween(start, end);
        } else if (userId != null) {
            trips = tripRepository.findByUserIdOrderByDateDescCreatedAtDesc(userId);
        } else {
            trips = tripRepository.findAllOrderByDateDesc();
        }

        trips.forEach(t -> userRepository.findById(t.getUserId())
                .ifPresent(u -> t.setUserEmail(u.getEmail())));

        StringBuilder sb = new StringBuilder();
        sb.append("ID,Date,Utilisateur,Statut,Objet,Adresse départ,Adresse arrivée,Km total,Arrêts,Notes\n");
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (RepTrip t : trips) {
            sb.append(csvVal(String.valueOf(t.getId()))).append(',');
            sb.append(csvVal(t.getDate() != null ? t.getDate().format(fmt) : "")).append(',');
            sb.append(csvVal(t.getUserEmail())).append(',');
            sb.append(csvVal(t.getStatus())).append(',');
            sb.append(csvVal(t.getPurpose())).append(',');
            sb.append(csvVal(t.getStartAddress())).append(',');
            sb.append(csvVal(t.getEndAddress())).append(',');
            sb.append(csvVal(t.getTotalKm() != null ? String.valueOf(t.getTotalKm()) : "")).append(',');
            sb.append(csvVal(String.valueOf(t.getStops().size()))).append(',');
            sb.append(csvVal(t.getNotes())).append('\n');

            // Append a sub-row per stop
            for (RepTripStop s : t.getStops()) {
                sb.append(",,,,ARRÊT,,");
                sb.append(csvVal(s.getAddress())).append(',');
                sb.append(',');
                sb.append(csvVal(s.getReason())).append(',');
                sb.append(csvVal(s.getNotes())).append('\n');
            }
        }

        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"kilométrage-représentants.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static String csvVal(String v) {
        if (v == null) return "";
        if (v.contains(",") || v.contains("\"") || v.contains("\n")) {
            return "\"" + v.replace("\"", "\"\"") + "\"";
        }
        return v;
    }

    private static Double toDouble(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }
}
