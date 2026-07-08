package com.mygutachter.model;

/**
 * Where an order originated. Used to route outbound OMT calls (UVV, report sync-back)
 * to the correct OMT server once dev/prod run side by side (Decision Q5/Q11).
 */
public enum OrderSource {
    OMT,
    OMT_DEV,
    MANUAL
}
