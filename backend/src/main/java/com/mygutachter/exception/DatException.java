package com.mygutachter.exception;

/**
 * Base exception for all DAT API errors.
 */
public class DatException extends RuntimeException {

    private final int httpStatus;

    public DatException(String message) {
        super(message);
        this.httpStatus = 0;
    }

    public DatException(String message, Throwable cause) {
        super(message, cause);
        this.httpStatus = 0;
    }

    public DatException(String message, int httpStatus) {
        super(message);
        this.httpStatus = httpStatus;
    }

    public DatException(String message, int httpStatus, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
    }

    /** HTTP status code from the DAT server (0 if unavailable). */
    public int getHttpStatus() {
        return httpStatus;
    }
}
