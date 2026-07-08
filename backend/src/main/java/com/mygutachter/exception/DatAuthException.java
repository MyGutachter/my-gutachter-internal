package com.mygutachter.exception;

/**
 * Thrown when authentication against the DAT API fails
 * (e.g. wrong credentials, token not present in response).
 */
public class DatAuthException extends DatException {
    public DatAuthException(String message) {
        super(message);
    }

    public DatAuthException(String message, Throwable cause) {
        super(message, cause);
    }

    public DatAuthException(String message, int httpStatus) {
        super(message, httpStatus);
    }
}