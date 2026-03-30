package com.entretienbatiment.backend.common.exception;

import com.entretienbatiment.backend.modules.debug.service.DevelopperDebugService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@RestControllerAdvice
public class ApiExceptionHandler {

    private final DevelopperDebugService developperDebugService;

    public ApiExceptionHandler(DevelopperDebugService developperDebugService) {
        this.developperDebugService = developperDebugService;
    }

    record ApiError(String message, int status, Instant timestamp) {}

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handle(ResponseStatusException ex, HttpServletRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        developperDebugService.logError(ex, status.value(), request);

        return ResponseEntity.status(status)
                .body(new ApiError(
                        ex.getReason(),
                        status.value(),
                        Instant.now()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        developperDebugService.logError(ex, HttpStatus.INTERNAL_SERVER_ERROR.value(), request);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError(
                        "Internal server error",
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        Instant.now()
                ));
    }
}
