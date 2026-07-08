package com.mygutachter.model;

/**
 * Which app an order is usable in. An order can carry both (it was imported into both
 * Video Expert and Vehicle Report from OMT) — stored as a unioned {@code modes} set on the
 * order. Drives which app's order list the order appears in (Decision Q2, Phase 7).
 */
public enum OrderMode {
    VIDEO_EXPERT,
    VEHICLE_REPORT;

    /** True if {@code value} is a recognised mode name. */
    public static boolean isValid(String value) {
        if (value == null) {
            return false;
        }
        for (OrderMode m : values()) {
            if (m.name().equals(value)) {
                return true;
            }
        }
        return false;
    }
}
