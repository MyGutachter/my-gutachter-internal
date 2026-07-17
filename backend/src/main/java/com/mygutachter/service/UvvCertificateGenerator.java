package com.mygutachter.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class UvvCertificateGenerator {

    private static final Logger log = LoggerFactory.getLogger(UvvCertificateGenerator.class);

    private static final java.awt.Color BRAND_ORANGE = new java.awt.Color(223, 124, 37); // #df7c25
    private static final java.awt.Color BRAND_BLUE = new java.awt.Color(28, 59, 87);     // #1c3b57

    private final MessageSource messageSource;

    @Autowired
    public UvvCertificateGenerator(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    private String getMsg(String key, String lang) {
        try {
            return messageSource.getMessage(key, null, new Locale(lang));
        } catch (Exception e) {
            log.warn("Missing message bundle key '{}' for language '{}', using key name.", key, lang);
            return key;
        }
    }

    public byte[] generateCertificatePdf(org.bson.Document order, String inspectorName) {
        String uvvResult = order.getString("uvvResult");
        if (uvvResult == null || uvvResult.isBlank()) {
            uvvResult = "PASSED";
        }
        return generateCertificatePdf(order, inspectorName, uvvResult, "de");
    }

    public byte[] generateCertificatePdf(org.bson.Document order, String inspectorName, String uvvResult) {
        return generateCertificatePdf(order, inspectorName, uvvResult, "de");
    }

    public byte[] generateCertificatePdf(org.bson.Document order, String inspectorName, String uvvResult, String lang) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        
        // Use margins that leave space on the left for the orange sidebar (48pt wide)
        // Left margin: 86pt (48pt sidebar + 38pt padding)
        // Right margin: 50pt
        // Top margin: 35pt
        // Bottom margin: 60pt (to clear the footer)
        Document document = new Document(PageSize.A4, 86f, 50f, 35f, 60f);
        String langCode = "de".equalsIgnoreCase(lang) || "en".equalsIgnoreCase(lang) ? lang.toLowerCase() : "de";
        boolean isEn = "en".equalsIgnoreCase(langCode);

        // Resolve uvvResult: use parameter if non-null, else fall back to order field
        String finalUvvResult = (uvvResult != null && !uvvResult.isBlank()) ? uvvResult : order.getString("uvvResult");
        if (finalUvvResult == null || finalUvvResult.isBlank()) {
            finalUvvResult = "PASSED";
        }
        boolean isPassed = "PASSED".equalsIgnoreCase(finalUvvResult);

        Boolean reinspectionReqVal = order.getBoolean("reinspectionRequired");
        boolean reinspectionRequired;
        if (reinspectionReqVal != null) {
            reinspectionRequired = reinspectionReqVal;
        } else {
            reinspectionRequired = !isPassed;
        }

        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);

            // Set up custom font that supports Cyrillic/German characters (loaded from classpath resources)
            BaseFont baseFont;
            try {
                byte[] fontBytes;
                try (InputStream fontStream = getClass().getResourceAsStream("/fonts/DejaVuSans.ttf")) {
                    if (fontStream != null) {
                        fontBytes = fontStream.readAllBytes();
                    } else {
                        throw new java.io.FileNotFoundException("DejaVuSans.ttf not found in resources");
                    }
                }
                baseFont = BaseFont.createFont("DejaVuSans.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, BaseFont.CACHED, fontBytes, null);
            } catch (Exception e) {
                log.warn("Could not load DejaVu Sans font from resources, falling back to Helvetica: {}", e.getMessage());
                baseFont = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
            }

            Font verticalFont = new Font(baseFont, 10, Font.BOLD, java.awt.Color.WHITE);
            Font titleFont = new Font(baseFont, 36, Font.BOLD, java.awt.Color.BLACK);
            Font companyFont = new Font(baseFont, 11, Font.NORMAL, java.awt.Color.GRAY);
            Font regularFont = new Font(baseFont, 10.5f, Font.NORMAL, java.awt.Color.BLACK);
            Font regularBoldFont = new Font(baseFont, 10.5f, Font.BOLD, java.awt.Color.BLACK);
            Font plateLargeFont = new Font(baseFont, 26, Font.BOLD, java.awt.Color.BLACK);
            Font detailLabelFont = new Font(baseFont, 10.5f, Font.BOLD, java.awt.Color.GRAY);
            Font detailValueFont = new Font(baseFont, 10.5f, Font.NORMAL, java.awt.Color.BLACK);
            Font headerLabelFont = new Font(baseFont, 10.5f, Font.BOLD, java.awt.Color.BLACK);
            Font signatureLabelFont = new Font(baseFont, 8.5f, Font.NORMAL, java.awt.Color.BLACK);
            Font footerFont = new Font(baseFont, 6.8f, Font.NORMAL, java.awt.Color.GRAY);

            // Resolve vertical sidebar text
            String sidebarText = getMsg(isPassed ? "sidebar.text.passed" : "sidebar.text.failed", langCode);

            // Register background page event helper (Sidebar + Footer)
            writer.setPageEvent(new PageBackgroundEvent(sidebarText, baseFont, verticalFont, footerFont));

            document.open();

            // 1. Logo Row (Top Right)
            PdfPTable logoRowTable = new PdfPTable(1);
            logoRowTable.setWidthPercentage(100);
            PdfPCell logoCell = new PdfPCell();
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

            boolean logoLoaded = false;
            try (InputStream logoStream = getClass().getResourceAsStream("/certificates/uvv-certificate-logo.png")) {
                if (logoStream != null) {
                    byte[] logoBytes = logoStream.readAllBytes();
                    Image logoImg = Image.getInstance(logoBytes);
                    logoImg.scaleToFit(152f, 50f);
                    logoImg.setAlignment(Element.ALIGN_RIGHT);
                    logoCell.addElement(logoImg);
                    logoLoaded = true;
                }
            } catch (Exception e) {
                log.warn("Failed to load logo image from resources: {}", e.getMessage());
            }

            if (!logoLoaded) {
                // Fallback text logo
                PdfPTable textLogoTable = new PdfPTable(2);
                textLogoTable.setWidthPercentage(30);
                textLogoTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
                
                Font myFont = new Font(baseFont, 17, Font.BOLD, BRAND_BLUE);
                Font gFont = new Font(baseFont, 17, Font.BOLD, BRAND_ORANGE);

                PdfPCell myCell = new PdfPCell(new Paragraph("MY", myFont));
                myCell.setBorder(Rectangle.NO_BORDER);
                myCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

                PdfPCell gCell = new PdfPCell(new Paragraph("GUTACHTER", gFont));
                gCell.setBorder(Rectangle.NO_BORDER);
                gCell.setHorizontalAlignment(Element.ALIGN_LEFT);

                textLogoTable.addCell(myCell);
                textLogoTable.addCell(gCell);
                logoCell.addElement(textLogoTable);
            }
            logoRowTable.addCell(logoCell);
            document.add(logoRowTable);

            // 2. Title ("ZERTIFIKAT" / "MÄNGELBERICHT")
            String titleText = getMsg(isPassed ? "title.passed" : "title.failed", langCode);
            Paragraph titlePara = new Paragraph(titleText, titleFont);
            titlePara.setAlignment(Element.ALIGN_CENTER);
            titlePara.setSpacingBefore(12f); // compact spacing to ensure Table 1 fits Page 1
            document.add(titlePara);

            // 3. Subtitle ("MyGutachter GmbH")
            Paragraph companyPara = new Paragraph("MyGutachter GmbH", companyFont);
            companyPara.setAlignment(Element.ALIGN_CENTER);
            companyPara.setSpacingBefore(4f); // compact spacing
            document.add(companyPara);

            // 4. Description ("Hiermit bestätigen wir...")
            String descText = getMsg("desc.text", langCode);
            Paragraph descPara = new Paragraph(descText, regularFont);
            descPara.setAlignment(Element.ALIGN_CENTER);
            descPara.setSpacingBefore(16f); // compact spacing
            document.add(descPara);

            // Resolve values defensively
            String plateNumber = order.getString("licensePlateNumber");
            if (plateNumber == null || plateNumber.isBlank()) {
                plateNumber = (String) order.get("licensePlate");
            }
            if (plateNumber == null || plateNumber.isBlank()) {
                plateNumber = "—";
            }

            String vin = order.getString("vinNumber");
            if (vin == null || vin.isBlank()) {
                vin = (String) order.get("vin");
            }
            if (vin == null || vin.isBlank()) {
                vin = "—";
            }

            String registrationDate = formatRegistrationDate(order.get("firstRegistration"));
            if ("—".equals(registrationDate)) {
                registrationDate = formatRegistrationDate(order.get("firstRegistrationDate"));
            }
            if ("—".equals(registrationDate)) {
                registrationDate = formatRegistrationDate(order.get("lastVehicleInspectionDate"));
            }

            String city = "Bochum";
            Object clientCity = order.get("clientCity");
            if (clientCity != null && !clientCity.toString().isBlank()) {
                city = clientCity.toString().trim();
            } else {
                Object clientAddress = order.get("clientAddress");
                if (clientAddress != null && !clientAddress.toString().isBlank()) {
                    String addr = clientAddress.toString().trim();
                    int lastComma = addr.lastIndexOf(',');
                    if (lastComma != -1) {
                        city = addr.substring(lastComma + 1).trim().replaceAll("^\\d{5}\\s+", "");
                    }
                }
            }

            String inspectionDateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));

            // 6. Details Table
            PdfPTable detailsTable = new PdfPTable(new float[] { 165f, 175f });
            detailsTable.setTotalWidth(340f);
            detailsTable.setLockedWidth(true);
            detailsTable.setHorizontalAlignment(Element.ALIGN_CENTER);
            detailsTable.setSpacingBefore(12f); // compact spacing

            String labelPlate = getMsg("details.plate", langCode);
            String labelVin = getMsg("details.vin", langCode);
            String labelReg = getMsg("details.reg", langCode);

            addDetailRow(detailsTable, labelPlate, plateNumber, detailLabelFont, detailValueFont);
            addDetailRow(detailsTable, labelVin, vin, detailLabelFont, detailValueFont);
            addDetailRow(detailsTable, labelReg, registrationDate, detailLabelFont, detailValueFont);

            document.add(detailsTable);

            // 7. Statement ("die Anforderungen und...")
            String statementText = getMsg(isPassed ? "statement.passed" : "statement.failed", langCode);
            Paragraph statementPara = new Paragraph(statementText, regularFont);
            statementPara.setAlignment(Element.ALIGN_CENTER);
            statementPara.setSpacingBefore(12f); // compact spacing
            document.add(statementPara);

            // 8. Purpose ("Digitale UVV-Fahrzeugprüfung")
            String purposeText = getMsg("purpose.text", langCode);
            Paragraph purposePara = new Paragraph(purposeText, regularFont);
            purposePara.setAlignment(Element.ALIGN_CENTER);
            purposePara.setSpacingBefore(10f); // compact spacing
            document.add(purposePara);

            // 9. Table 1 (Feld / Inhalt)
            PdfPTable metaTable = new PdfPTable(new float[] { 165f, 294f });
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingBefore(12f); // compact spacing

            // Meta table header
            addMetaHeaderRow(metaTable, getMsg("meta.header.field", langCode), getMsg("meta.header.content", langCode), headerLabelFont);

            // Meta table fields resolver
            String companyVal = order.getString("clientName");
            if (companyVal == null || companyVal.isBlank()) {
                companyVal = order.getString("concernCompany");
            }
            if (companyVal == null || companyVal.isBlank()) {
                companyVal = getMsg("meta.val.company.default", langCode);
            }

            String driverVal = order.getString("contactPersonName");
            if (driverVal == null || driverVal.isBlank()) {
                driverVal = order.getString("carOwnerFullName");
            }
            if (driverVal == null) {
                driverVal = "";
            }

            String modelVal = order.getString("vehicleModel");
            String makeVal = order.getString("vehicleMake");
            String vehicleStr = "";
            if (makeVal != null && !makeVal.isBlank()) {
                vehicleStr += makeVal + " ";
            }
            if (modelVal != null && !modelVal.isBlank()) {
                vehicleStr += modelVal;
            }
            if (vehicleStr.isBlank()) {
                vehicleStr = getMsg("meta.val.model.default", langCode);
            }

            Object mileageObj = order.get("mileage");
            String mileageStr = (mileageObj != null && !mileageObj.toString().isBlank() && !"0".equals(mileageObj.toString())) 
                ? mileageObj.toString() 
                : getMsg("meta.val.mileage.default", langCode);

            String resultVal = isPassed 
                ? getMsg("meta.val.result.passed", langCode) 
                : getMsg("meta.val.result.failed", langCode);
            String defectsVal = isPassed 
                ? getMsg("meta.val.defects.passed", langCode) 
                : getMsg("meta.val.defects.failed", langCode);
            String deadlineVal = isPassed 
                ? getMsg("meta.val.deadline.passed", langCode) 
                : getMsg("meta.val.deadline.failed", langCode);
            String reinspectionVal = reinspectionRequired 
                ? getMsg("meta.val.reinspection.failed", langCode) 
                : getMsg("meta.val.reinspection.passed", langCode);

            // Row rendering Table 1 with optimized padding to fit Page 1 perfectly
            addMetaRow(metaTable, getMsg("meta.row.owner", langCode), companyVal, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.user", langCode), driverVal, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.plate", langCode), plateNumber, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.vin", langCode), vin, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.model", langCode), vehicleStr, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.mileage", langCode), mileageStr, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.date", langCode), inspectionDateStr, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.location", langCode), city, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.type", langCode), getMsg("meta.val.type.default", langCode), regularFont);
            addMetaRow(metaTable, getMsg("meta.row.inspector", langCode), inspectorName, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.result", langCode), resultVal, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.defects", langCode), defectsVal, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.deadline", langCode), deadlineVal, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.reinspection", langCode), reinspectionVal, regularFont);
            addMetaRow(metaTable, getMsg("meta.row.sig.inspector", langCode), getMsg("meta.val.sig.inspector.default", langCode), regularFont);
            addMetaRow(metaTable, getMsg("meta.row.sig.driver", langCode), getMsg("meta.val.sig.driver.default", langCode), regularFont);

            document.add(metaTable);

            // 10. Force Page Break for Checklist Table on Page 2
            document.newPage();

            // Checklist Page Header
            Paragraph checklistTitle = new Paragraph(getMsg("checklist.header.point", langCode) + " & " + getMsg("checklist.header.selection", langCode), headerLabelFont);
            checklistTitle.setSpacingAfter(10f);
            document.add(checklistTitle);

            // Table 2 (Checklist Table)
            PdfPTable checklistTable = new PdfPTable(new float[] { 30f, 320f, 109f });
            checklistTable.setWidthPercentage(100);
            
            // Header
            addChecklistHeaderRow(checklistTable, getMsg("checklist.header.nr", langCode), getMsg("checklist.header.point", langCode), getMsg("checklist.header.selection", langCode), headerLabelFont);

            for (int i = 1; i <= 54; i++) {
                String itemText = getMsg("checklist.item." + i, langCode);
                String selectionStr;
                if (i == 52) { // Prüfentscheidung: Fahrzeug betriebssicher
                    selectionStr = formatItem52Selection(isPassed, isEn);
                } else if (i == 53) { // Wiedervorlage/Nachprüfung erforderlich
                    selectionStr = formatItem53Selection(reinspectionRequired, isEn);
                } else if (i == 54) { // Prüfperson, Qualifikation, Datum, Unterschrift dokumentiert
                    selectionStr = formatItem54Selection(isPassed, isEn);
                } else {
                    String itemStatus = getChecklistStatus(i, order, isPassed);
                    selectionStr = formatNormalSelection(itemStatus, isEn);
                }

                addChecklistRow(checklistTable, String.valueOf(i), itemText, selectionStr, regularFont);
            }

            document.add(checklistTable);

            // 11. Table 3 (Inspection Result Summary) - placed right after the checklist
            Paragraph resultSummaryTitle = new Paragraph(getMsg("result.summary.title", langCode), headerLabelFont);
            resultSummaryTitle.setSpacingBefore(20f);
            resultSummaryTitle.setSpacingAfter(8f);
            document.add(resultSummaryTitle);

            PdfPTable resultSummaryTable = new PdfPTable(new float[] { 220f, 239f });
            resultSummaryTable.setWidthPercentage(100);

            // Determine the result summary values
            boolean hasChecklistData = order.containsKey("registrationCertificateStatus")
                || order.containsKey("nextHU")
                || order.containsKey("vehicleConditionStatus")
                || order.containsKey("engineRunWarningLightsActive")
                || order.containsKey("warningTriangle")
                || order.containsKey("safetyVest")
                || order.containsKey("firstAidKit")
                || order.containsKey("fireExtinguisher")
                || order.containsKey("chargingCable")
                || order.containsKey("testDriveDone");

            boolean hasCriticalDefect = false;
            int[] criticalIndices = { 18, 19, 20, 22, 23, 24, 25, 26 };
            for (int idx : criticalIndices) {
                if ("DEFECT".equalsIgnoreCase(getChecklistStatus(idx, order, false))) {
                    hasCriticalDefect = true;
                    break;
                }
            }

            boolean hasOccupationalDefect = false;
            int[] occupationalIndices = { 30, 31, 32, 33, 34, 35, 36, 48, 49 };
            for (int idx : occupationalIndices) {
                if ("DEFECT".equalsIgnoreCase(getChecklistStatus(idx, order, false))) {
                    hasOccupationalDefect = true;
                    break;
                }
            }

            boolean hasAnyDefect = false;
            for (int i = 1; i <= 51; i++) {
                if ("DEFECT".equalsIgnoreCase(getChecklistStatus(i, order, false))) {
                    hasAnyDefect = true;
                    break;
                }
            }

            boolean isSafe;
            boolean isRoad;
            boolean isOccupational;
            boolean isDefectsFound;
            boolean isReinspection;
            boolean isContinued;

            if (hasChecklistData) {
                isSafe = !hasAnyDefect;
                isRoad = !hasCriticalDefect;
                isOccupational = !hasOccupationalDefect;
                isDefectsFound = hasAnyDefect;
                isContinued = !hasCriticalDefect;
            } else {
                isSafe = isPassed;
                isRoad = isPassed;
                isOccupational = isPassed;
                isDefectsFound = !isPassed;
                isContinued = isPassed;
            }

            isReinspection = reinspectionRequired;

            // Rows in Table 3
            String res1 = isSafe 
                ? getMsg("result.summary.opt.safe.passed", langCode)
                : getMsg("result.summary.opt.safe.failed", langCode);
            String res2 = isRoad 
                ? getMsg("result.summary.opt.road.passed", langCode)
                : getMsg("result.summary.opt.road.failed", langCode);
            String res3 = isOccupational 
                ? getMsg("result.summary.opt.occupational.passed", langCode)
                : getMsg("result.summary.opt.occupational.failed", langCode);
            String res4 = isDefectsFound 
                ? getMsg("result.summary.opt.defects.failed", langCode)
                : getMsg("result.summary.opt.defects.passed", langCode);
            String res5 = isReinspection 
                ? getMsg("result.summary.opt.reinspection.failed", langCode)
                : getMsg("result.summary.opt.reinspection.passed", langCode);
            String res6 = isContinued 
                ? getMsg("result.summary.opt.continued.passed", langCode)
                : getMsg("result.summary.opt.continued.failed", langCode);

            addResultSummaryRow(resultSummaryTable, getMsg("result.summary.safe", langCode), res1, regularFont);
            addResultSummaryRow(resultSummaryTable, getMsg("result.summary.road", langCode), res2, regularFont);
            addResultSummaryRow(resultSummaryTable, getMsg("result.summary.occupational", langCode), res3, regularFont);
            addResultSummaryRow(resultSummaryTable, getMsg("result.summary.defects", langCode), res4, regularFont);
            addResultSummaryRow(resultSummaryTable, getMsg("result.summary.reinspection", langCode), res5, regularFont);
            addResultSummaryRow(resultSummaryTable, getMsg("result.summary.continued", langCode), res6, regularFont);

            resultSummaryTable.setSpacingAfter(15f);
            document.add(resultSummaryTable);

            // 12. Signatures and Stamp Row below Result Table
            PdfPTable sigTable = new PdfPTable(new float[] { 45f, 10f, 45f });
            sigTable.setWidthPercentage(100);
            sigTable.setSpacingBefore(10f);

            // Left Column (Signature line)
            PdfPCell leftSigCell = new PdfPCell();
            leftSigCell.setBorder(Rectangle.NO_BORDER);
            PdfPTable nestedLeft = new PdfPTable(1);
            nestedLeft.setWidthPercentage(100);

            PdfPCell spacerCell = new PdfPCell();
            spacerCell.setFixedHeight(80f);
            spacerCell.setBorder(Rectangle.NO_BORDER);
            nestedLeft.addCell(spacerCell);

            PdfPCell borderCell1 = new PdfPCell();
            borderCell1.setBorder(Rectangle.BOTTOM);
            borderCell1.setBorderWidth(0.7f);
            borderCell1.setFixedHeight(1f);
            nestedLeft.addCell(borderCell1);

            PdfPCell labelCell1 = new PdfPCell(new Paragraph(getMsg("sig.label.inspector", langCode), signatureLabelFont));
            labelCell1.setBorder(Rectangle.NO_BORDER);
            labelCell1.setHorizontalAlignment(Element.ALIGN_CENTER);
            labelCell1.setPaddingTop(6f);
            nestedLeft.addCell(labelCell1);

            leftSigCell.addElement(nestedLeft);
            sigTable.addCell(leftSigCell);

            // Gap
            PdfPCell gapCell = new PdfPCell();
            gapCell.setBorder(Rectangle.NO_BORDER);
            sigTable.addCell(gapCell);

            // Right Column (Stamp & line)
            PdfPCell rightSigCell = new PdfPCell();
            rightSigCell.setBorder(Rectangle.NO_BORDER);
            PdfPTable nestedRight = new PdfPTable(1);
            nestedRight.setWidthPercentage(100);

            PdfPCell stampImgCell = new PdfPCell();
            stampImgCell.setFixedHeight(80f);
            stampImgCell.setBorder(Rectangle.NO_BORDER);
            stampImgCell.setVerticalAlignment(Element.ALIGN_BOTTOM);
            stampImgCell.setHorizontalAlignment(Element.ALIGN_CENTER);

            boolean stampLoaded = false;
            try (InputStream stampStream = getClass().getResourceAsStream("/certificates/uvv-certificate-stamp.png")) {
                if (stampStream != null) {
                    byte[] stampBytes = stampStream.readAllBytes();
                    Image stampImg = Image.getInstance(stampBytes);
                    stampImg.scaleToFit(160f, 75f);
                    stampImg.setAlignment(Element.ALIGN_CENTER);
                    stampImgCell.addElement(stampImg);
                    stampLoaded = true;
                }
            } catch (Exception e) {
                log.warn("Failed to load stamp image from resources: {}", e.getMessage());
            }

            if (!stampLoaded) {
                PdfPCell emptyStamp = new PdfPCell();
                emptyStamp.setFixedHeight(75f);
                emptyStamp.setBorder(Rectangle.NO_BORDER);
                stampImgCell.addElement(emptyStamp);
            }

            nestedRight.addCell(stampImgCell);

            PdfPCell borderCell2 = new PdfPCell();
            borderCell2.setBorder(Rectangle.BOTTOM);
            borderCell2.setBorderWidth(0.7f);
            borderCell2.setFixedHeight(1f);
            nestedRight.addCell(borderCell2);

            PdfPCell labelCell2 = new PdfPCell(new Paragraph(getMsg("sig.label.stamp", langCode), signatureLabelFont));
            labelCell2.setBorder(Rectangle.NO_BORDER);
            labelCell2.setHorizontalAlignment(Element.ALIGN_CENTER);
            labelCell2.setPaddingTop(6f);
            nestedRight.addCell(labelCell2);

            rightSigCell.addElement(nestedRight);
            sigTable.addCell(rightSigCell);

            document.add(sigTable);

            // 13. Force Page Break for Legal Disclaimer / Basis on Last Page
            document.newPage();

            // Disclaimer Paragraphs
            Paragraph discTitle = new Paragraph(getMsg("disclaimer.title", langCode), regularBoldFont);
            discTitle.setSpacingBefore(10f);
            discTitle.setSpacingAfter(8f);
            document.add(discTitle);

            Paragraph discP1 = new Paragraph(getMsg("disclaimer.p1", langCode), regularFont);
            discP1.setSpacingAfter(10f);
            document.add(discP1);

            Paragraph discP2 = new Paragraph(getMsg("disclaimer.p2", langCode), regularFont);
            discP2.setSpacingAfter(10f);
            document.add(discP2);

            Paragraph discP3 = new Paragraph(getMsg("disclaimer.p3", langCode), regularFont);
            document.add(discP3);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate UVV certificate PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Could not generate UVV certificate", e);
        }
    }

    private void addDetailRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell1 = new PdfPCell(new Paragraph(label + ":", labelFont));
        cell1.setBorder(Rectangle.NO_BORDER);
        cell1.setPaddingBottom(7f);

        PdfPCell cell2 = new PdfPCell(new Paragraph(value, valueFont));
        cell2.setBorder(Rectangle.NO_BORDER);
        cell2.setPaddingBottom(7f);

        table.addCell(cell1);
        table.addCell(cell2);
    }

    private void addMetaHeaderRow(PdfPTable table, String col1, String col2, Font font) {
        PdfPCell cell1 = new PdfPCell(new Paragraph(col1, font));
        cell1.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        cell1.setBorder(Rectangle.BOTTOM);
        cell1.setBorderColor(java.awt.Color.GRAY);
        cell1.setBorderWidth(1f);
        cell1.setPadding(4f);

        PdfPCell cell2 = new PdfPCell(new Paragraph(col2, font));
        cell2.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        cell2.setBorder(Rectangle.BOTTOM);
        cell2.setBorderColor(java.awt.Color.GRAY);
        cell2.setBorderWidth(1f);
        cell2.setPadding(4f);

        table.addCell(cell1);
        table.addCell(cell2);
    }

    private void addMetaRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell cell1 = new PdfPCell(new Paragraph(label, font));
        cell1.setBorder(Rectangle.BOTTOM);
        cell1.setBorderColor(java.awt.Color.LIGHT_GRAY);
        cell1.setBorderWidth(0.5f);
        cell1.setPadding(4.2f); // set exactly to 4.2f padding to ensure Page 1 fit

        PdfPCell cell2 = new PdfPCell(new Paragraph(value, font));
        cell2.setBorder(Rectangle.BOTTOM);
        cell2.setBorderColor(java.awt.Color.LIGHT_GRAY);
        cell2.setBorderWidth(0.5f);
        cell2.setPadding(4.2f); // set exactly to 4.2f padding to ensure Page 1 fit

        table.addCell(cell1);
        table.addCell(cell2);
    }

    private void addChecklistHeaderRow(PdfPTable table, String col1, String col2, String col3, Font font) {
        PdfPCell cell1 = new PdfPCell(new Paragraph(col1, font));
        cell1.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        cell1.setBorder(Rectangle.BOTTOM);
        cell1.setBorderColor(java.awt.Color.GRAY);
        cell1.setBorderWidth(1f);
        cell1.setPadding(5f);

        PdfPCell cell2 = new PdfPCell(new Paragraph(col2, font));
        cell2.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        cell2.setBorder(Rectangle.BOTTOM);
        cell2.setBorderColor(java.awt.Color.GRAY);
        cell2.setBorderWidth(1f);
        cell2.setPadding(5f);

        PdfPCell cell3 = new PdfPCell(new Paragraph(col3, font));
        cell3.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        cell3.setBorder(Rectangle.BOTTOM);
        cell3.setBorderColor(java.awt.Color.GRAY);
        cell3.setBorderWidth(1f);
        cell3.setPadding(5f);

        table.addCell(cell1);
        table.addCell(cell2);
        table.addCell(cell3);
    }

    private void addChecklistRow(PdfPTable table, String nr, String item, String selection, Font font) {
        PdfPCell cell1 = new PdfPCell(new Paragraph(nr, font));
        cell1.setBorder(Rectangle.BOTTOM);
        cell1.setBorderColor(java.awt.Color.LIGHT_GRAY);
        cell1.setBorderWidth(0.5f);
        cell1.setPadding(6f);

        PdfPCell cell2 = new PdfPCell(new Paragraph(item, font));
        cell2.setBorder(Rectangle.BOTTOM);
        cell2.setBorderColor(java.awt.Color.LIGHT_GRAY);
        cell2.setBorderWidth(0.5f);
        cell2.setPadding(6f);

        PdfPCell cell3 = new PdfPCell(new Paragraph(selection, font));
        cell3.setBorder(Rectangle.BOTTOM);
        cell3.setBorderColor(java.awt.Color.LIGHT_GRAY);
        cell3.setBorderWidth(0.5f);
        cell3.setPadding(6f);

        table.addCell(cell1);
        table.addCell(cell2);
        table.addCell(cell3);
    }

    private void addResultSummaryRow(PdfPTable table, String resultLabel, String selection, Font font) {
        PdfPCell cell1 = new PdfPCell(new Paragraph(resultLabel, font));
        cell1.setBorder(Rectangle.BOTTOM);
        cell1.setBorderColor(java.awt.Color.LIGHT_GRAY);
        cell1.setBorderWidth(0.5f);
        cell1.setPadding(4f);

        PdfPCell cell2 = new PdfPCell(new Paragraph(selection, font));
        cell2.setBorder(Rectangle.BOTTOM);
        cell2.setBorderColor(java.awt.Color.LIGHT_GRAY);
        cell2.setBorderWidth(0.5f);
        cell2.setPadding(4f);

        table.addCell(cell1);
        table.addCell(cell2);
    }

    private String formatRegistrationDate(Object dateObj) {
        if (dateObj == null) {
            return "—";
        }
        String dateStr = dateObj.toString().trim();
        if (dateStr.isEmpty()) {
            return "—";
        }
        try {
            if (dateStr.contains("T")) {
                Instant instant;
                if (dateStr.endsWith("Z")) {
                    instant = Instant.parse(dateStr);
                } else {
                    LocalDateTime ldt = LocalDateTime.parse(dateStr);
                    instant = ldt.toInstant(ZoneOffset.UTC);
                }
                ZonedDateTime zonedDateTime = instant.atZone(ZoneId.of("Europe/Berlin"));
                return zonedDateTime.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } else if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                LocalDate localDate = LocalDate.parse(dateStr);
                return localDate.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
            } else if (dateStr.matches("\\d{2}\\.\\d{2}\\.\\d{4}")) {
                return dateStr;
            }
        } catch (Exception e) {
            // fallback
        }
        return dateStr;
    }

    private String getChecklistStatus(int itemNr, org.bson.Document order, boolean isPassed) {
        // ── Priority 1: explicit per-item data from the inline UVV checklist panel ──
        // If the inspector filled in the checklist via the new sidebar tab, use those values
        // directly rather than inferring from vehicle report fields.
        org.bson.Document uvvChecklist = order.get("uvvChecklist", org.bson.Document.class);
        if (uvvChecklist != null) {
            String explicit = uvvChecklist.getString(String.valueOf(itemNr));
            if (explicit != null && !explicit.isBlank()) {
                // Normalise frontend values to the expected PDF format
                switch (explicit.toUpperCase()) {
                    case "OK":          return "OK";
                    case "DEFECT":      return "DEFECT";
                    case "NA":          return "NA";
                    case "YES":         return "OK";   // item 52/53 "Ja" → green
                    case "NO":          return "DEFECT"; // item 52/53 "Nein" → defect
                    case "CONDITIONAL": return "NA";   // item 52 "mit Aufl." → N/A (conditional)
                    default:            return explicit;
                }
            }
        }
        // ── Fallback: infer status from vehicle report fields (legacy behaviour) ──
        switch (itemNr) {
            case 1: {
                String plate = order.getString("licensePlateNumber");
                if (plate == null || plate.isBlank()) plate = order.getString("licensePlate");
                String vin = order.getString("vinNumber");
                if (vin == null || vin.isBlank()) vin = order.getString("vin");
                Object mileage = order.get("mileage");
                if (plate != null && !plate.isBlank() && vin != null && !vin.isBlank() && mileage != null) {
                    return "OK";
                }
                return isPassed ? "OK" : "DEFECT";
            }
            case 2: {
                String status = order.getString("registrationCertificateStatus");
                String serviceStatus = order.getString("serviceBookletStatus");
                String manualStatus = order.getString("operatingManualStatus");
                if ("not_available".equalsIgnoreCase(status) || "not_available".equalsIgnoreCase(serviceStatus) || "not_available".equalsIgnoreCase(manualStatus)) {
                    return "DEFECT";
                }
                if ("Original".equalsIgnoreCase(status) || "Copy".equalsIgnoreCase(status)) {
                    return "OK";
                }
                return "NA";
            }
            case 3: {
                Object nextHU = order.get("nextHU");
                return (nextHU != null && !nextHU.toString().isBlank()) ? "OK" : "NA";
            }
            case 4: { // Kennzeichen vorne/hinten vorhanden, lesbar, fest
                boolean plateDmg = hasBodyPartDamage(order, "frontLicensePlate", "rearLicensePlate", "licensePlate");
                return plateDmg ? "DEFECT" : "OK";
            }
            case 5: {
                String cond = order.getString("vehicleConditionStatus");
                if ("dirty".equalsIgnoreCase(cond) || "wet".equalsIgnoreCase(cond) || "restricted".equalsIgnoreCase(cond)) {
                    return "DEFECT";
                } else if (cond != null && !cond.isBlank()) {
                    return "OK";
                }
                return "NA";
            }
            case 6: { // Karosserie
                boolean bodyDmg = hasBodyPartDamage(order, 
                    "bumper_front", "hood", "fender_front_left", "door_front_left", "door_rear_left", 
                    "quarter_panel_left", "sill_left", "roof_frame_left", "fender_front_right", 
                    "door_front_right", "door_rear_right", "quarter_panel_right", "sill_right", 
                    "roof_frame_right", "roof", "tailgate", "bumper_rear"
                );
                return bodyDmg ? "DEFECT" : "OK";
            }
            case 7: { // Türen, Hauben, Klappen, Schlösser
                boolean doorsDmg = hasBodyPartDamage(order, 
                    "door_front_left", "door_rear_left", "door_front_right", "door_rear_right", "tailgate", "hood"
                );
                return doorsDmg ? "DEFECT" : "OK";
            }
            case 8: { // Scheiben
                boolean windshieldDmg = hasBodyPartDamage(order, "windshield");
                return windshieldDmg ? "DEFECT" : "OK";
            }
            case 9: { // Spiegel
                boolean mirrorDmg = hasBodyPartDamage(order, "mirror_left", "mirror_right");
                return mirrorDmg ? "DEFECT" : "OK";
            }
            case 12: { // Beleuchtung vorne
                boolean frontLightsDmg = hasBodyPartDamage(order, "headlight_left", "headlight_right");
                return frontLightsDmg ? "DEFECT" : "OK";
            }
            case 13: { // Beleuchtung hinten
                boolean rearLightsDmg = hasBodyPartDamage(order, "rear_light_left", "rear_light_right");
                return rearLightsDmg ? "DEFECT" : "OK";
            }
            case 20: { // Lenkung
                boolean steeringDmg = hasBodyPartDamage(order, "steering_wheel");
                return steeringDmg ? "DEFECT" : "OK";
            }
            case 21: { // Fahrwerk/Federung
                Boolean below = order.getBoolean("inspectionFromBelow");
                if (Boolean.FALSE.equals(below)) {
                    return "NA";
                }
                return "OK";
            }
            case 22: { // Reifen Profiltiefe
                java.util.List<org.bson.Document> tires = order.getList("tires", org.bson.Document.class);
                if (tires == null || tires.isEmpty()) {
                    return "NA";
                }
                boolean hasLowTread = false;
                for (org.bson.Document tire : tires) {
                    Object tdObj = tire.get("treadDepth");
                    if (tdObj != null) {
                        try {
                            double depth = Double.parseDouble(tdObj.toString().trim().replaceAll("[^0-9.]", ""));
                            if (depth < 1.6) {
                                hasLowTread = true;
                                break;
                            }
                        } catch (Exception e) {
                            // ignore
                        }
                    }
                }
                return hasLowTread ? "DEFECT" : "OK";
            }
            case 23: { // Reifen Schäden
                java.util.List<org.bson.Document> tires = order.getList("tires", org.bson.Document.class);
                if (tires == null || tires.isEmpty()) {
                    return "NA";
                }
                boolean hasDamage = false;
                for (org.bson.Document tire : tires) {
                    Boolean damaged = tire.getBoolean("damaged");
                    if (Boolean.TRUE.equals(damaged)) {
                        hasDamage = true;
                        break;
                    }
                }
                return hasDamage ? "DEFECT" : "OK";
            }
            case 26: { // Felgen/Räder
                java.util.List<org.bson.Document> tires = order.getList("tires", org.bson.Document.class);
                if (tires == null || tires.isEmpty()) {
                    return "NA";
                }
                boolean hasRimDamage = false;
                for (org.bson.Document tire : tires) {
                    java.util.List<?> rimDmgList = tire.getList("rimDamage", Object.class);
                    if (rimDmgList != null && !rimDmgList.isEmpty()) {
                        hasRimDamage = true;
                        break;
                    }
                }
                return hasRimDamage ? "DEFECT" : "OK";
            }
            case 28: { // Sitze
                boolean seatsDmg = hasBodyPartDamage(order, "seat_driver", "seat_passenger");
                return seatsDmg ? "DEFECT" : "OK";
            }
            case 29: {
                String warningLights = order.getString("engineRunWarningLightsActive");
                if ("yes".equalsIgnoreCase(warningLights)) {
                    return "DEFECT";
                } else if ("no".equalsIgnoreCase(warningLights)) {
                    return "OK";
                }
                return "NA";
            }
            case 30: {
                return getEquipmentStatus(order, "warningTriangle");
            }
            case 31: {
                return getEquipmentStatus(order, "safetyVest");
            }
            case 32: {
                return getEquipmentStatus(order, "firstAidKit");
            }
            case 33: {
                return getEquipmentStatus(order, "fireExtinguisher");
            }
            case 39: { // Elektrische Anlage / Batterie
                Boolean batteryChecked = order.getBoolean("hybridBatteryChecked");
                if (batteryChecked != null && !batteryChecked) {
                    return "DEFECT";
                }
                return "OK";
            }
            case 44: {
                String chargingCable = order.getString("chargingCable");
                if ("available".equalsIgnoreCase(chargingCable) || "present".equalsIgnoreCase(chargingCable)) {
                    return "OK";
                } else if ("not_available".equalsIgnoreCase(chargingCable)) {
                    return "DEFECT";
                }
                return "NA";
            }
            case 49: { // Sonderaufbauten
                String status = order.getString("liftingPlatformStatus");
                if ("available".equalsIgnoreCase(status) || "ok".equalsIgnoreCase(status) || "present".equalsIgnoreCase(status)) {
                    return "OK";
                } else if ("not_available".equalsIgnoreCase(status) || "defect".equalsIgnoreCase(status)) {
                    return "DEFECT";
                }
                return "NA";
            }
            case 50: {
                String testDrive = order.getString("testDriveDone");
                if ("carried_out".equalsIgnoreCase(testDrive)) {
                    return "OK";
                } else if ("not_occurred".equalsIgnoreCase(testDrive)) {
                    return "DEFECT";
                } else if ("not_possible".equalsIgnoreCase(testDrive)) {
                    return "NA";
                }
                return "NA";
            }
            default:
                return "OK";
        }
    }

    private boolean hasBodyPartDamage(org.bson.Document order, String... bodyParts) {
        java.util.List<org.bson.Document> damages = order.getList("damages", org.bson.Document.class);
        if (damages != null) {
            for (org.bson.Document d : damages) {
                String bp = d.getString("bodyPart");
                if (bp != null) {
                    for (String target : bodyParts) {
                        if (target.equalsIgnoreCase(bp)) {
                            return true;
                        }
                    }
                }
            }
        }
        java.util.List<org.bson.Document> rows = order.getList("minderwertRows", org.bson.Document.class);
        if (rows != null) {
            for (org.bson.Document r : rows) {
                String bp = r.getString("bodyPart");
                String dmg = r.getString("damage");
                if (bp != null && dmg != null && !dmg.isBlank()) {
                    for (String target : bodyParts) {
                        if (target.equalsIgnoreCase(bp)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    private String getEquipmentStatus(org.bson.Document order, String fieldName) {
        Object obj = order.get(fieldName);
        if (obj instanceof org.bson.Document) {
            org.bson.Document doc = (org.bson.Document) obj;
            String status = doc.getString("status");
            if ("available".equalsIgnoreCase(status) || "ok".equalsIgnoreCase(status) || "present".equalsIgnoreCase(status)) {
                return "OK";
            } else if ("not_available".equalsIgnoreCase(status) || "defect".equalsIgnoreCase(status)) {
                return "DEFECT";
            }
        }
        return "NA";
    }

    private String formatNormalSelection(String status, boolean isEn) {
        String boxOk = "☐";
        String boxDefect = "☐";
        String boxNa = "☐";
        if ("OK".equalsIgnoreCase(status)) {
            boxOk = "☑";
        } else if ("DEFECT".equalsIgnoreCase(status)) {
            boxDefect = "☑";
        } else {
            boxNa = "☑";
        }
        if (isEn) {
            return boxOk + " OK  " + boxDefect + " Defect  " + boxNa + " N/A";
        } else {
            return boxOk + " i.O.  " + boxDefect + " Mangel  " + boxNa + " n.z.";
        }
    }

    private String formatItem52Selection(boolean isYes, boolean isEn) {
        String boxYes = isYes ? "☑" : "☐";
        String boxNo = isYes ? "☐" : "☑";
        if (isEn) {
            return boxYes + " Yes  " + boxNo + " No  ☐ Cond.";
        } else {
            return boxYes + " Ja  " + boxNo + " Nein  ☐ mit Aufl.";
        }
    }

    private String formatItem53Selection(boolean isYes, boolean isEn) {
        String boxYes = isYes ? "☑" : "☐";
        String boxNo = isYes ? "☐" : "☑";
        if (isEn) {
            return boxYes + " Yes  " + boxNo + " No";
        } else {
            return boxYes + " Ja  " + boxNo + " Nein";
        }
    }

    private String formatItem54Selection(boolean isOk, boolean isEn) {
        String boxOk = isOk ? "☑" : "☐";
        String boxDefect = isOk ? "☐" : "☑";
        if (isEn) {
            return boxOk + " OK  " + boxDefect + " Defect";
        } else {
            return boxOk + " i.O.  " + boxDefect + " Mangel";
        }
    }

    /**
     * Page event helper to write position-locked footer and draw the left vertical orange sidebar.
     */
    private static class PageBackgroundEvent extends PdfPageEventHelper {
        private final BaseFont baseFont;
        private final Font verticalFont;
        private final Font footerFont;
        private final String sidebarText;

        public PageBackgroundEvent(String sidebarText, BaseFont baseFont, Font verticalFont, Font footerFont) {
            this.sidebarText = sidebarText;
            this.baseFont = baseFont;
            this.verticalFont = verticalFont;
            this.footerFont = footerFont;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            
            // 1. Draw Left Orange Sidebar
            cb.setColorFill(BRAND_ORANGE);
            cb.rectangle(0f, 0f, 48f, PageSize.A4.getHeight());
            cb.fill();

            // Draw vertical text in sidebar (Centered)
            float sidebarX = 24f;
            float sidebarY = PageSize.A4.getHeight() / 2f;
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                new Phrase(sidebarText, verticalFont),
                sidebarX, sidebarY, 90f);

            // 2. Draw Bottom Footer Text
            float footerX = (PageSize.A4.getLeft() + PageSize.A4.getRight() + 48f) / 2f;
            float footerY = PageSize.A4.getBottom() + 15.6f;

            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                new Phrase("MyGutachter GmbH | Schlaraffiastraße 1 | 44867 Bochum | Tel. +49 232 27200770 | www.MyGutachter.de | Commerzbank AG |", footerFont),
                footerX, footerY + 16f, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                new Phrase("IBAN: DE29 4304 0036 0124 6529 00 | BIC: COBADEFFXXX | Sitz und Amtsgericht: Bochum | HRB 17883 | Steuernummer: 350/5722/5507", footerFont),
                footerX, footerY + 8f, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                new Phrase("Ust-IdNr. DE345173206 | Geschäftsführer: Leonard Scheidt, Burhan Epaydin", footerFont),
                footerX, footerY, 0);
        }
    }
}
