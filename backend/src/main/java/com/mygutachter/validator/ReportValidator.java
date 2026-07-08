package com.mygutachter.validator;

import com.mygutachter.model.ReportDTO;
import com.mygutachter.model.PaintMeasurementDTO;
import com.mygutachter.model.DamageItemDTO;
import java.util.ArrayList;
import java.util.List;

public class ReportValidator {

    public static List<String> validateStep3(ReportDTO report) {
        List<String> errors = new ArrayList<>();

        // Validation for Lackschichtdickenmessung
        if (report.getNoPaintIssuesDetected() != null && !report.getNoPaintIssuesDetected()) {
            List<PaintMeasurementDTO> measurements = report.getPaintMeasurements();
            if (measurements == null || measurements.isEmpty()) {
                errors.add("At least one paint measurement is required if 'No paint issues detected' is not checked.");
            } else {
                for (int i = 0; i < measurements.size(); i++) {
                    PaintMeasurementDTO pm = measurements.get(i);
                    String prefix = "Paint Measurement #" + (i + 1) + ": ";

                    if (pm.getBodyPart() == null || pm.getBodyPart().trim().isEmpty()) {
                        errors.add(prefix + "Body part is required.");
                    }
                    if (pm.getMeasuredMicrons() == null || pm.getMeasuredMicrons() <= 0) {
                        errors.add(prefix + "Measured thickness (µm) must be greater than 0.");
                    }
                    if (pm.getImages() == null || pm.getImages().isEmpty()) {
                        errors.add(prefix + "At least one image is required.");
                    }
                    if (Boolean.TRUE.equals(pm.getDamageKnown())
                            && (pm.getRepairDamage() == null || pm.getRepairDamage().trim().isEmpty())) {
                        errors.add(prefix + "Repair damage description is required when damage is known.");
                    }
                }
            }
        }

        return errors;
    }

    public static List<String> validateStep2(ReportDTO report) {
        List<String> errors = new ArrayList<>();
        String vin = report.getVin();
        if (vin != null && !vin.isEmpty()) {
            if (vin.length() != 17) {
                errors.add("VIN must be exactly 17 characters long.");
            }
            if (!vin.matches("^[A-HJ-NPR-Z0-9]{17}$")) {
                errors.add(
                        "VIN contains invalid characters or is not in uppercase. It should only contain A-Z (excluding I, O, Q) and 0-9.");
            }
        }
        return errors;
    }

    public static List<String> validateStep4(ReportDTO report) {
        List<String> errors = new ArrayList<>();

        // Step 4: Damages
        if (report.getDamages() != null) {
            for (int i = 0; i < report.getDamages().size(); i++) {
                DamageItemDTO damage = report.getDamages().get(i);
                boolean hasDescription = damage.getDescription() != null && !damage.getDescription().trim().isEmpty();
                boolean hasImages = damage.getImages() != null && !damage.getImages().isEmpty();

                if (!hasDescription && !hasImages) {
                    errors.add("For damage entry #" + (i + 1) + " (" +
                            (damage.getBodyPart() != null ? damage.getBodyPart() : "unnamed") +
                            "), either a description or at least one image is required.");
                }
            }
        }

        return errors;
    }
}
