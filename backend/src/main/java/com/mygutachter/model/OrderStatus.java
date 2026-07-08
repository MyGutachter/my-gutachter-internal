package com.mygutachter.model;

/**
 * Order lifecycle status (from OMT). Stored on the unified order under {@code orderStatus}
 * to avoid colliding with the report-mode {@code status} field (OPEN/COMPLETED), which
 * tracks the report's own lifecycle.
 */
public enum OrderStatus {
    PENDING,
    DONE,
    CANCEL,
    ARCHIVE
}
