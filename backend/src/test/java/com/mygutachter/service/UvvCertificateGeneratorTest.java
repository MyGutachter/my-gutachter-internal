package com.mygutachter.service;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;
import java.io.File;
import java.io.FileOutputStream;

import static org.junit.jupiter.api.Assertions.*;

public class UvvCertificateGeneratorTest {

    private UvvCertificateGenerator createGenerator() {
        ResourceBundleMessageSource messageSource = new ResourceBundleMessageSource();
        messageSource.setBasenames("messages");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setFallbackToSystemLocale(false);
        return new UvvCertificateGenerator(messageSource);
    }

    @Test
    public void testGenerateCertificatePdf_German_Passed() throws Exception {
        Document order = createTestOrder();
        UvvCertificateGenerator generator = createGenerator();

        byte[] pdfBytes = generator.generateCertificatePdf(order, "John Doe", "PASSED", "de");

        verifyPdfBytes(pdfBytes);
        savePdfFile("UVV_Zertifikat_DE_Passed.pdf", pdfBytes);
    }

    @Test
    public void testGenerateCertificatePdf_German_Failed() throws Exception {
        Document order = createTestOrder();
        UvvCertificateGenerator generator = createGenerator();

        byte[] pdfBytes = generator.generateCertificatePdf(order, "John Doe", "FAILED", "de");

        verifyPdfBytes(pdfBytes);
        savePdfFile("UVV_Zertifikat_DE_Failed.pdf", pdfBytes);
    }

    @Test
    public void testGenerateCertificatePdf_English_Passed() throws Exception {
        Document order = createTestOrder();
        UvvCertificateGenerator generator = createGenerator();

        byte[] pdfBytes = generator.generateCertificatePdf(order, "John Doe", "PASSED", "en");

        verifyPdfBytes(pdfBytes);
        savePdfFile("UVV_Zertifikat_EN_Passed.pdf", pdfBytes);
    }

    @Test
    public void testGenerateCertificatePdf_English_Failed() throws Exception {
        Document order = createTestOrder();
        UvvCertificateGenerator generator = createGenerator();

        byte[] pdfBytes = generator.generateCertificatePdf(order, "John Doe", "FAILED", "en");

        verifyPdfBytes(pdfBytes);
        savePdfFile("UVV_Zertifikat_EN_Failed.pdf", pdfBytes);
    }

    @Test
    public void testGenerateCertificatePdf_FallbackChecklist_NoDefect() throws Exception {
        Document order = createTestOrder();
        // Make sure it has no defects by fixing the fireExtinguisher
        Document extinguisherDoc = new Document();
        extinguisherDoc.put("status", "available");
        order.put("fireExtinguisher", extinguisherDoc);

        UvvCertificateGenerator generator = createGenerator();
        byte[] pdfBytes = generator.generateCertificatePdf(order, "John Doe", null, "de");

        verifyPdfBytes(pdfBytes);
        savePdfFile("UVV_Zertifikat_Fallback_NoDefect.pdf", pdfBytes);
    }

    @Test
    public void testGenerateCertificatePdf_FallbackChecklist_WithDefect() throws Exception {
        Document order = createTestOrder();
        // createTestOrder already has a defect in fireExtinguisher

        UvvCertificateGenerator generator = createGenerator();
        byte[] pdfBytes = generator.generateCertificatePdf(order, "John Doe", null, "de");

        verifyPdfBytes(pdfBytes);
        savePdfFile("UVV_Zertifikat_Fallback_WithDefect.pdf", pdfBytes);
    }

    private Document createTestOrder() {
        Document order = new Document();
        order.put("licensePlateNumber", "K-IT 1113");
        order.put("vinNumber", "WBA1234567890");
        order.put("firstRegistration", "2015-05-12T00:00:00Z");
        order.put("clientCity", "Bochum");
        order.put("vehicleMake", "BMW");
        order.put("vehicleModel", "X5");
        order.put("mileage", "125000");
        order.put("clientName", "Marschall GmbH");

        // Checklist fields mapping values
        order.put("registrationCertificateStatus", "Original");
        order.put("nextHU", "2027-08-01");
        order.put("vehicleConditionStatus", "clean");
        order.put("engineRunWarningLightsActive", "no");
        order.put("chargingCable", "available");
        order.put("testDriveDone", "carried_out");
        order.put("reinspectionRequired", false);

        // Nested EquipmentItemDTO documents
        Document triangleDoc = new Document();
        triangleDoc.put("status", "available");
        order.put("warningTriangle", triangleDoc);

        Document vestDoc = new Document();
        vestDoc.put("status", "available");
        order.put("safetyVest", vestDoc);

        Document firstAidDoc = new Document();
        firstAidDoc.put("status", "available");
        order.put("firstAidKit", firstAidDoc);

        Document extinguisherDoc = new Document();
        extinguisherDoc.put("status", "not_available"); // Defect case to verify defect mapping
        order.put("fireExtinguisher", extinguisherDoc);

        // Tires
        java.util.List<Document> tires = new java.util.ArrayList<>();
        Document t1 = new Document();
        t1.put("treadDepth", "5.0");
        t1.put("damaged", false);
        t1.put("rimDamage", new java.util.ArrayList<>());
        tires.add(t1);
        order.put("tires", tires);

        // Damages and minderwertRows
        order.put("damages", new java.util.ArrayList<>());
        order.put("minderwertRows", new java.util.ArrayList<>());

        return order;
    }

    private void verifyPdfBytes(byte[] pdfBytes) {
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        // Verify PDF Magic Bytes (%PDF)
        assertEquals('%', (char) pdfBytes[0]);
        assertEquals('P', (char) pdfBytes[1]);
        assertEquals('D', (char) pdfBytes[2]);
        assertEquals('F', (char) pdfBytes[3]);
    }

    private void savePdfFile(String filename, byte[] pdfBytes) throws Exception {
        File targetDir = new File("target");
        if (targetDir.exists()) {
            File outputFile = new File(targetDir, filename);
            try (FileOutputStream fos = new FileOutputStream(outputFile)) {
                fos.write(pdfBytes);
            }
            System.out.println("Generated UVV test PDF saved to: " + outputFile.getAbsolutePath());
        }
    }
}
