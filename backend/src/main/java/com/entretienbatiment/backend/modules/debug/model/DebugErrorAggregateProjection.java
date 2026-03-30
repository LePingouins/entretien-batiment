package com.entretienbatiment.backend.modules.debug.model;

import java.time.Instant;

public interface DebugErrorAggregateProjection {
    String getFingerprint();

    String getExceptionType();

    String getErrorMessage();

    String getMethodName();

    long getOccurrences();

    Instant getLastOccurredAt();
}
