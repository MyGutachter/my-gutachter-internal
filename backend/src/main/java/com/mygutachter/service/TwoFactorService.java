package com.mygutachter.service;

import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import org.springframework.stereotype.Service;

import static dev.samstevens.totp.util.Utils.getDataUriForImage;

/**
 * TOTP (time-based one-time password) helper, ported from VideoExpert's
 * {@code TwoFactorService}. Generates secrets, renders the otpauth QR code as a
 * data URI, and verifies 6-digit codes.
 */
@Service
public class TwoFactorService {

    public String generateNewSecret() {
        SecretGenerator generator = new DefaultSecretGenerator();
        return generator.generate();
    }

    public String generateQrCodeImageUri(String secret, String label) {
        QrData data = new QrData.Builder()
                .label(label)
                .secret(secret)
                .issuer("MyGutachter")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        QrGenerator generator = new ZxingPngQrGenerator();
        byte[] imageData;
        try {
            imageData = generator.generate(data);
        } catch (QrGenerationException e) {
            throw new RuntimeException("Error generating QR code", e);
        }

        return getDataUriForImage(imageData, generator.getImageMimeType());
    }

    public boolean isOtpValid(String secret, String code) {
        if (secret == null || code == null) {
            return false;
        }
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), timeProvider);
        return verifier.isValidCode(secret, code);
    }
}
