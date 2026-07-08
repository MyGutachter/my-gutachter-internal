package com.mygutachter.util;

/**
 * Password strength rules (ported from VideoExpert's {@code PasswordValidator}).
 *
 * <p>Requires at least 8 characters and an uppercase letter, a lowercase letter,
 * a digit and a special character. Throws {@link IllegalArgumentException} with a
 * user-facing message on the first failing rule; callers surface that message.
 */
public class PasswordValidator {

    private PasswordValidator() {
    }

    public static void validate(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new IllegalArgumentException("Password must contain at least one number");
        }
        if (!password.matches(".*[@#$%^&+=!].*")) {
            throw new IllegalArgumentException("Password must contain at least one special character (@#$%^&+=!)");
        }
    }
}
