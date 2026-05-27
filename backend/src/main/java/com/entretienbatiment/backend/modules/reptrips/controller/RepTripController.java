package com.entretienbatiment.backend.modules.reptrips.controller;

import com.entretienbatiment.backend.modules.auth.model.AppUser;
import com.entretienbatiment.backend.modules.auth.repository.AppUserRepository;
import com.entretienbatiment.backend.modules.reptrips.model.RepTrip;
import com.entretienbatiment.backend.modules.reptrips.model.RepTripStop;
import com.entretienbatiment.backend.modules.reptrips.repository.RepTripRepository;
import com.entretienbatiment.backend.modules.reptrips.repository.RepTripStopRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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

    @Value("${google.routes.api.key:}")
    private String googleRoutesApiKey;

    /**
     * In-memory cache for IDEAL routes. Key = anchor signature (rounded
     * lat/lng to ~10 m precision). Value = km from Google.
     * The ideal route is deterministic for a given set of anchors, so a rep
     * driving the same loop daily only triggers one Google call (the first
     * time) instead of one per trip — roughly halving API cost over time.
     * Resets on app restart, which is fine: cache fills up again quickly.
     */
    private final java.util.concurrent.ConcurrentHashMap<String, Double> idealRouteCache
            = new java.util.concurrent.ConcurrentHashMap<>();

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

        if (body.containsKey("status")) {
            trip.setStatus((String) body.get("status"));
            if ("COMPLETED".equals(trip.getStatus()) && trip.getEndedAt() == null) {
                trip.setEndedAt(java.time.LocalDateTime.now());
            }
        }
        if (body.containsKey("purpose"))          trip.setPurpose((String) body.get("purpose"));
        if (body.containsKey("notes"))            trip.setNotes((String) body.get("notes"));
        if (body.containsKey("startAddress"))     trip.setStartAddress((String) body.get("startAddress"));
        if (body.containsKey("endAddress"))       trip.setEndAddress((String) body.get("endAddress"));
        if (body.containsKey("endLat"))           trip.setEndLat(toDouble(body.get("endLat")));
        if (body.containsKey("endLng"))           trip.setEndLng(toDouble(body.get("endLng")));
        if (body.containsKey("durationMinutes"))  trip.setDurationMinutes(toInteger(body.get("durationMinutes")));
        if (body.containsKey("waypointsJson"))    trip.setWaypointsJson((String) body.get("waypointsJson"));

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

        // Dual-distance audit fields (populated by /route-distance, sent
        // back by the client when finalising the trip).
        if (body.containsKey("idealKm"))        trip.setIdealKm(toDouble(body.get("idealKm")));
        if (body.containsKey("actualKm"))       trip.setActualKm(toDouble(body.get("actualKm")));
        if (body.containsKey("distanceSource")) trip.setDistanceSource((String) body.get("distanceSource"));

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
        // Verify the stop actually belongs to this trip (prevents cross-trip stop deletion)
        boolean stopBelongsToTrip = trip.getStops().stream().anyMatch(s -> s.getId().equals(stopId));
        if (!stopBelongsToTrip) return ResponseEntity.notFound().build();
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

    // ─── Google Routes proxy ──────────────────────────────────────────────────
    // Receives GPS waypoints from the mobile app and calls Google Routes API
    // server-side so the API key is never exposed in the app binary.

    @PostMapping("/route-distance")
    public ResponseEntity<Map<String, Object>> routeDistance(
            @RequestBody List<List<Double>> waypoints,
            Authentication auth) throws Exception {

        if (googleRoutesApiKey == null || googleRoutesApiKey.isBlank() || waypoints.size() < 2) {
            return ResponseEntity.badRequest().body(Map.of("error", "unavailable"));
        }

        // ─── Two-call routing for accuracy + detour support ───────────────────
        // Plan:
        //   1. IDEAL  = Google(origin + recorded stops + destination)
        //              → deterministic baseline, what the route SHOULD be.
        //   2. ACTUAL = Google(origin + recorded stops + filtered GPS
        //              intermediates + destination)
        //              → captures real detours actually driven.
        // Decision:
        //   - If actual <= ideal × 2.5  → use ACTUAL (real path, real detours).
        //   - Else                       → use IDEAL (drift-poisoned, fallback).
        // Filtered intermediates use a 100 m drift threshold and a 180 km/h
        // teleport filter so isolated GPS glitches can't sneak through.

        // Stops detected from the trace (long stationary clusters).
        List<List<Double>> stopAnchors = extractAnchors(waypoints, 150.0, 120_000L);
        // Strip first/last from stopAnchors — those are origin & destination.
        List<List<Double>> innerStops = new ArrayList<>();
        if (stopAnchors.size() > 2) {
            innerStops = stopAnchors.subList(1, stopAnchors.size() - 1);
        }

        List<Double> origin = waypoints.get(0);
        List<Double> destination = waypoints.get(waypoints.size() - 1);
        double straightKm = RepTrip.haversineKm(
                origin.get(0), origin.get(1),
                destination.get(0), destination.get(1));

        // ── Build IDEAL request: origin + stops + destination only ────────────
        List<List<Double>> idealPath = new ArrayList<>();
        idealPath.add(origin);
        idealPath.addAll(innerStops);
        idealPath.add(destination);

        // ── Build ACTUAL request: origin + stops + filtered intermediates ─────
        List<List<Double>> filtered = filterGpsDrift(waypoints, 100.0, 180.0);
        // Inject stops in correct positions: stops are already in filtered too
        // (they're just regular waypoints). filtered already has origin first
        // and destination last. Cap at 27 points total.
        List<List<Double>> actualPath = capWaypoints(filtered, 27);

        // Check the ideal cache first — same anchors → same ideal distance.
        String idealKey = anchorSignature(idealPath);
        Double idealKm = idealRouteCache.get(idealKey);
        boolean idealCached = idealKm != null;
        if (!idealCached) {
            idealKm = callGoogleRoutes(idealPath);
            if (idealKm != null) idealRouteCache.put(idealKey, idealKm);
        }
        Double actualKm = callGoogleRoutes(actualPath);

        if (idealKm == null && actualKm == null) {
            return ResponseEntity.ok(Map.of("error", "google_failed", "km", ""));
        }

        double chosen;
        String source;
        if (actualKm != null && idealKm != null) {
            double maxAllowed = idealKm * 2.5;
            if (actualKm <= maxAllowed) {
                chosen = actualKm;
                source = "actual";
            } else {
                System.out.println("[GoogleRoutes] REJECTED actual=" + actualKm
                        + "km, ideal=" + idealKm + "km, max=" + maxAllowed
                        + "km — using ideal as fallback (drift suspected)");
                chosen = idealKm;
                source = "ideal_fallback";
            }
        } else if (actualKm != null) {
            // No ideal — check vs straight-line distance.
            double maxAllowed = Math.max(2.0, straightKm * 3.0);
            if (actualKm > maxAllowed) {
                return ResponseEntity.ok(Map.of("error", "implausible_distance", "km", ""));
            }
            chosen = actualKm;
            source = "actual_no_ideal";
        } else {
            chosen = idealKm;
            source = "ideal_only";
        }

        double km = Math.round(chosen * 10.0) / 10.0;
        System.out.println("[GoogleRoutes] km=" + km + " source=" + source
                + " idealKm=" + idealKm + " actualKm=" + actualKm
                + " straightKm=" + straightKm
                + " idealCached=" + idealCached);

        // Return all three numbers so the UI can show them and the trip-save
        // endpoint can persist them for audit.
        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("km", km);
        resp.put("source", source);
        if (idealKm != null) resp.put("idealKm", Math.round(idealKm * 10.0) / 10.0);
        if (actualKm != null) resp.put("actualKm", Math.round(actualKm * 10.0) / 10.0);
        return ResponseEntity.ok(resp);
    }

    /** Build a stable hash key from an anchor path. Coordinates are rounded
     *  to ~10 m precision so trivial GPS variation in start/end still hits
     *  the cache. */
    private static String anchorSignature(List<List<Double>> path) {
        StringBuilder sb = new StringBuilder();
        for (List<Double> p : path) {
            sb.append(Math.round(p.get(0) * 10000.0)).append(',')
              .append(Math.round(p.get(1) * 10000.0)).append('|');
        }
        return sb.toString();
    }

    /**
     * Filter raw GPS waypoints to remove drift and teleport glitches.
     *  - Drops any point implying a speed > {@code maxKmh} from the previous
     *    kept point (GPS jump).
     *  - Drops any point that moved less than {@code minMoveM} metres from the
     *    previous kept point (stationary drift / parking lot wobble).
     * The first and last waypoints are always preserved.
     */
    private static List<List<Double>> filterGpsDrift(
            List<List<Double>> waypoints, double minMoveM, double maxKmh) {
        List<List<Double>> out = new ArrayList<>();
        if (waypoints.isEmpty()) return out;
        out.add(waypoints.get(0));
        for (int i = 1; i < waypoints.size() - 1; i++) {
            List<Double> prev = out.get(out.size() - 1);
            List<Double> cur = waypoints.get(i);
            double dM = RepTrip.haversineKm(prev.get(0), prev.get(1),
                    cur.get(0), cur.get(1)) * 1000.0;

            if (prev.size() >= 3 && cur.size() >= 3) {
                double dtSec = (cur.get(2) - prev.get(2)) / 1000.0;
                if (dtSec > 0) {
                    double kmh = (dM / 1000.0) / (dtSec / 3600.0);
                    if (kmh > maxKmh) continue;
                }
            }
            if (dM >= minMoveM) out.add(cur);
        }
        List<Double> last = waypoints.get(waypoints.size() - 1);
        if (!last.equals(out.get(out.size() - 1))) out.add(last);
        return out;
    }

    /** Down-sample a waypoint list to at most {@code maxTotal} points,
     *  always preserving the first and last. */
    private static List<List<Double>> capWaypoints(List<List<Double>> wps, int maxTotal) {
        if (wps.size() <= maxTotal) return wps;
        List<List<Double>> out = new ArrayList<>();
        out.add(wps.get(0));
        int inner = wps.size() - 2;
        int step = Math.max(1, inner / (maxTotal - 2));
        for (int i = 1; i < wps.size() - 1 && out.size() < maxTotal - 1; i += step) {
            out.add(wps.get(i));
        }
        out.add(wps.get(wps.size() - 1));
        return out;
    }

    /** Calls Google Routes computeRoutes for the given path (first = origin,
     *  last = destination, rest = intermediates). Returns distance in km, or
     *  null on any error. */
    private Double callGoogleRoutes(List<List<Double>> path) throws Exception {
        if (path.size() < 2) return null;
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode body = mapper.createObjectNode();
        body.set("origin", makeWaypoint(mapper, path.get(0)));
        body.set("destination", makeWaypoint(mapper, path.get(path.size() - 1)));
        ArrayNode intermediates = mapper.createArrayNode();
        for (int i = 1; i < path.size() - 1; i++) {
            intermediates.add(makeWaypoint(mapper, path.get(i)));
        }
        body.set("intermediates", intermediates);
        body.put("travelMode", "DRIVE");

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://routes.googleapis.com/directions/v2:computeRoutes"))
                .header("Content-Type", "application/json")
                .header("X-Goog-Api-Key", googleRoutesApiKey)
                .header("X-Goog-FieldMask", "routes.distanceMeters")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            System.out.println("[GoogleRoutes] HTTP " + response.statusCode() + " body: " + response.body());
            return null;
        }
        JsonNode result = mapper.readTree(response.body());
        JsonNode routes = result.get("routes");
        if (routes == null || !routes.isArray() || routes.isEmpty()
                || !routes.get(0).has("distanceMeters")) {
            return null;
        }
        return routes.get(0).get("distanceMeters").asDouble() / 1000.0;
    }

    /**
     * Extract stable anchor points from a raw GPS waypoint trace.
     * Always returns the first and last points, plus one median point for
     * every cluster where the device stayed inside {@code radiusM} metres
     * for at least {@code minStopMs} milliseconds (i.e. a real stop).
     * Waypoint format: [lat, lng, timestampMs]. Timestamp is required for
     * cluster detection; if missing we fall back to first + last only.
     */
    private static List<List<Double>> extractAnchors(
            List<List<Double>> waypoints, double radiusM, long minStopMs) {
        List<List<Double>> out = new ArrayList<>();
        if (waypoints.isEmpty()) return out;
        out.add(waypoints.get(0));

        // Need timestamps to find stationary clusters.
        boolean hasTs = waypoints.get(0).size() >= 3;
        if (hasTs && waypoints.size() > 2) {
            int i = 0;
            while (i < waypoints.size()) {
                List<Double> anchor = waypoints.get(i);
                int j = i + 1;
                // Grow the cluster while subsequent points stay within radius.
                while (j < waypoints.size()
                        && RepTrip.haversineKm(anchor.get(0), anchor.get(1),
                                waypoints.get(j).get(0), waypoints.get(j).get(1)) * 1000.0 <= radiusM) {
                    j++;
                }
                long dur = waypoints.get(j - 1).get(2).longValue() - anchor.get(2).longValue();
                if (j - i >= 2 && dur >= minStopMs) {
                    // Real stop — emit the median point of the cluster.
                    int mid = (i + j - 1) / 2;
                    List<Double> midPt = waypoints.get(mid);
                    // Avoid duplicating the first/last point.
                    if (!midPt.equals(out.get(out.size() - 1))
                            && mid != 0 && mid != waypoints.size() - 1) {
                        out.add(midPt);
                    }
                    i = j;
                } else {
                    i++;
                }
            }
        }

        List<Double> last = waypoints.get(waypoints.size() - 1);
        if (!last.equals(out.get(out.size() - 1))) out.add(last);
        return out;
    }

    private static ObjectNode makeWaypoint(ObjectMapper mapper, List<Double> latLng) {
        ObjectNode wp = mapper.createObjectNode();
        ObjectNode location = mapper.createObjectNode();
        ObjectNode ll = mapper.createObjectNode();
        ll.put("latitude", latLng.get(0));
        ll.put("longitude", latLng.get(1));
        location.set("latLng", ll);
        wp.set("location", location);
        return wp;
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

    private static Integer toInteger(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }
}
