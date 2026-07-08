package com.mygutachter.exception;

/**
 * Thrown when the DAT API returns a response that cannot be parsed as
 * expected XML / SOAP structure.
 */
public class DatXmlParseException extends DatException {
    public DatXmlParseException(String message) {
        super(message);
    }

    public DatXmlParseException(String message, Throwable cause) {
        super(message, cause);
    }
}