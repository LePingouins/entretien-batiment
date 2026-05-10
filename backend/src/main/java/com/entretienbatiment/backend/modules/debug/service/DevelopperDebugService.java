package com.entretienbatiment.backend.modules.debug.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import com.entretienbatiment.backend.modules.debug.model.DebugErrorLog;
import com.entretienbatiment.backend.modules.debug.repository.DebugErrorLogRepository;

@Service
@Transactional
public class DevelopperDebugService {

    private static final int DEFAULT_LIMIT = 50;

    private final DebugErrorLogRepository debugErrorLogRepository;

    public DevelopperDebugService(DebugErrorLogRepository debugErrorLogRepository) {
        this.debugErrorLogRepository = debugErrorLogRepository;
    }

    public void logError(Throwable throwable, int statusCode, HttpServletRequest request) {
        if (throwable == null) {
            return;
        }

        try {
            StackTraceElement frame = firstApplicationFrame(throwable);
            String methodName = frame == null ? "unknown" : frame.getClassName() + "#" + frame.getMethodName();
            String exceptionType = throwable.getClass().getName();
            String message = throwable.getMessage();
            String fingerprint = fingerprint(exceptionType, message, methodName);

            DebugErrorLog log = new DebugErrorLog();
            log.setFingerprint(fingerprint);
            log.setExceptionType(exceptionType);
            log.setErrorMessage(message == null ? "" : message);
            log.setMethodName(methodName);
            log.setStatusCode(statusCode);
            log.setOccurredAt(Instant.now());
            log.setRequestMethod(request != null ? request.getMethod() : "");
            log.setRequestPath(request != null ? request.getRequestURI() : "");
            log.setContext(buildContext(request));
            log.setStackTrace(toStackTrace(throwable));
            debugErrorLogRepository.save(log);
        } catch (Exception ignored) {
            // Never let debug logging break API responses.
        }
    }

    @Transactional(readOnly = true)
    public DevelopperDebugDashboardResponse getDashboard(int limit) {
        int safeLimit = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, 200);

        long totalOccurrences = debugErrorLogRepository.countBy();
        long uniqueErrors = debugErrorLogRepository.countDistinctFingerprints();

        List<DebugErrorGroupResponse> groups = debugErrorLogRepository.findGroupedErrors(safeLimit)
                .stream()
                .map(group -> new DebugErrorGroupResponse(
                        group.getFingerprint(),
                        group.getOccurrences(),
                        group.getExceptionType(),
                        group.getErrorMessage(),
                        group.getMethodName(),
                        group.getLastOccurredAt(),
                        toOccurrence(debugErrorLogRepository.findTopByFingerprintOrderByOccurredAtDesc(group.getFingerprint()).orElse(null))
                ))
                .toList();

        return new DevelopperDebugDashboardResponse(totalOccurrences, uniqueErrors, groups);
    }

    @Transactional(readOnly = true)
    public DevelopperDebugErrorDetailResponse getErrorDetail(String fingerprint) {
        long occurrences = debugErrorLogRepository.countByFingerprint(fingerprint);
        List<DebugErrorOccurrenceResponse> entries = debugErrorLogRepository
                .findTop25ByFingerprintOrderByOccurredAtDesc(fingerprint)
                .stream()
                .map(this::toOccurrence)
                .toList();

        return new DevelopperDebugErrorDetailResponse(fingerprint, occurrences, entries);
    }

    public void deleteByFingerprint(String fingerprint) {
        debugErrorLogRepository.deleteAllByFingerprint(fingerprint);
    }

    public void deleteAll() {
        debugErrorLogRepository.deleteAll();
    }

    private DebugErrorOccurrenceResponse toOccurrence(DebugErrorLog log) {
        if (log == null) {
            return null;
        }

        return new DebugErrorOccurrenceResponse(
                log.getId(),
                log.getOccurredAt(),
                log.getRequestMethod(),
                log.getRequestPath(),
                log.getStatusCode(),
                log.getMethodName(),
                log.getContext(),
                log.getErrorMessage(),
                log.getStackTrace()
        );
    }

    private StackTraceElement firstApplicationFrame(Throwable throwable) {
        for (StackTraceElement frame : throwable.getStackTrace()) {
            if (frame.getClassName() != null && frame.getClassName().startsWith("com.entretienbatiment.")) {
                return frame;
            }
        }
        return throwable.getStackTrace().length == 0 ? null : throwable.getStackTrace()[0];
    }

    private String buildContext(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String principal = auth != null ? String.valueOf(auth.getName()) : "anonymous";

        if (request == null) {
            return "user=" + principal;
        }

        String queryString = request.getQueryString();
        String query = queryString == null || queryString.isBlank() ? "" : "?" + queryString;
        return "user=" + principal
                + "; path=" + request.getRequestURI() + query
                + "; remote=" + request.getRemoteAddr();
    }

    private String fingerprint(String exceptionType, String message, String methodName) {
        try {
            String raw = exceptionType + "|" + (message == null ? "" : message) + "|" + methodName;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            return String.valueOf((exceptionType + "|" + message + "|" + methodName).hashCode());
        }
    }

    private String toStackTrace(Throwable throwable) {
        StringWriter sw = new StringWriter();
        try (PrintWriter pw = new PrintWriter(sw)) {
            throwable.printStackTrace(pw);
        }
        return sw.toString();
    }

    public record DevelopperDebugDashboardResponse(
            long totalOccurrences,
            long uniqueErrors,
            List<DebugErrorGroupResponse> errors
    ) {
    }

    public record DebugErrorGroupResponse(
            String fingerprint,
            long occurrences,
            String exceptionType,
            String errorMessage,
            String methodName,
            Instant lastOccurredAt,
            DebugErrorOccurrenceResponse latest
    ) {
    }

    public record DevelopperDebugErrorDetailResponse(
            String fingerprint,
            long occurrences,
            List<DebugErrorOccurrenceResponse> entries
    ) {
    }

    public record DebugErrorOccurrenceResponse(
            Long id,
            Instant occurredAt,
            String requestMethod,
            String requestPath,
            Integer statusCode,
            String methodName,
            String context,
            String errorMessage,
            String stackTrace
    ) {
    }
}
