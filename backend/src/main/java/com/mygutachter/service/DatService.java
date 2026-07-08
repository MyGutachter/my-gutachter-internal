package com.mygutachter.service;

import com.mygutachter.exception.DatAuthException;
import com.mygutachter.exception.DatException;
import com.mygutachter.exception.DatXmlParseException;
import com.mygutachter.model.VehicleIdentification;
import com.mygutachter.model.VehicleResponse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.logging.Logger;

/**
 * DatService – communicates with the DAT VehicleRepairOnline SOAP API.
 *
 * <p>
 * The XML parsing logic mirrors the Python {@code parse_vehicle_xml()}
 * function in {@code app.py}, producing the same rich data structure.
 * Custom exceptions replace bare {@link RuntimeException} throws so
 * callers can react to auth failures, network errors, and parse errors
 * independently.
 *
 * <p>
 * Namespace constants used throughout:
 * <ul>
 * <li>{@code NS_SOAP} = {@code http://schemas.xmlsoap.org/soap/envelope/}
 * <li>{@code NS_VIS} =
 * {@code http://sphinx.dat.de/services/VehicleIdentificationService}
 * <li>{@code NS_VXS} = {@code http://www.dat.de/vxs}
 * </ul>
 */
@Service
public class DatService {

    private static final Logger LOG = Logger.getLogger(DatService.class.getName());

    // ── XML namespaces (mirrors Python NS dict) ───────────────────────────────
    private static final String NS_SOAP = "http://schemas.xmlsoap.org/soap/envelope/";
    private static final String NS_VIS = "http://sphinx.dat.de/services/VehicleIdentificationService";
    private static final String NS_VXS = "http://www.dat.de/vxs";

    // ── Spring @Value config ──────────────────────────────────────────────────
    @Value("${dat.customer-number}")
    private String customerNumber;

    @Value("${dat.customer-login}")
    private String customerLogin;

    @Value("${dat.customer-password}")
    private String customerPassword;

    @Value("${dat.interface-partner-number}")
    private String partnerNumber;

    @Value("${dat.interface-partner-signature}")
    private String partnerSignature;

    @Value("${dat.auth-url}")
    private String authUrl;

    @Value("${dat.vin-url}")
    private String vinUrl;

    // ── Token cache ───────────────────────────────────────────────────────────
    private volatile String cachedToken;
    private volatile long tokenExpiry = 0;

    // ── HTTP client ───────────────────────────────────────────────────────────
    private final RestTemplate restTemplate = buildRestTemplate();

    /**
     * RestTemplate that never throws on 4xx/5xx – the DAT VIN service can
     * return HTTP 500 containing a SOAP Fault whose {@code <faultstring>}
     * embeds the actual vehicle XML. We read the body ourselves.
     */
    private static RestTemplate buildRestTemplate() {
        RestTemplate rt = new RestTemplate();
        rt.setErrorHandler(new ResponseErrorHandler() {
            @Override
            public boolean hasError(org.springframework.http.client.ClientHttpResponse r)
                    throws IOException {
                return false;
            }

            @Override
            public void handleError(org.springframework.http.client.ClientHttpResponse r)
                    throws IOException {
                /* intentionally empty */ }
        });
        return rt;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Public API
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Looks up a vehicle by VIN. Obtains (or re-uses) a cached auth token
     * automatically.
     *
     * @param vin 17-character vehicle identification number
     * @return fully populated {@link VehicleIdentification}
     * @throws DatAuthException     if token acquisition fails
     * @throws DatXmlParseException if the response cannot be parsed
     * @throws DatException         for all other DAT API errors
     */
    public VehicleResponse lookupVin(String vin) {
        if (vin == null || vin.isBlank()) {
            throw new IllegalArgumentException("VIN must not be null or blank");
        }
        String normalizedVin = vin.trim().toUpperCase();
        String token = getToken();
        VehicleIdentification vi = callVinLookup(normalizedVin, token);
        return VehicleResponse.from(vi);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Auth
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Returns a valid token from cache or fetches a new one.
     * Mirrors Python {@code get_auth_token()}.
     */
    private synchronized String getToken() {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiry) {
            return cachedToken;
        }

        String soapBody = buildAuthSoapBody();
        String responseXml = sendSoapRequest(authUrl, soapBody, null);

        Document doc = parseXml(responseXml);

        // Token element can appear under various namespace prefixes
        NodeList tokens = doc.getElementsByTagName("token");
        if (tokens.getLength() == 0) {
            // Try without prefix as well
            tokens = doc.getElementsByTagNameNS("*", "token");
        }
        if (tokens.getLength() == 0) {
            throw new DatAuthException(
                    "No <token> element found in auth response. Raw: "
                            + responseXml.substring(0, Math.min(300, responseXml.length())));
        }

        String token = tokens.item(0).getTextContent().trim();
        if (token.isEmpty()) {
            throw new DatAuthException("Auth token element was empty in DAT response");
        }

        cachedToken = token;
        tokenExpiry = System.currentTimeMillis() + 20L * 60 * 1000; // 20 min
        LOG.info("[DAT] Auth token refreshed.");
        return cachedToken;
    }

    private String buildAuthSoapBody() {
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                + "<soapenv:Envelope"
                + " xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\""
                + " xmlns:aut=\"http://sphinx.dat.de/services/Authentication\">"
                + "<soapenv:Header/><soapenv:Body><aut:generateToken><request>"
                + "<customerNumber>" + customerNumber + "</customerNumber>"
                + "<customerLogin>" + customerLogin + "</customerLogin>"
                + "<customerPassword>" + customerPassword + "</customerPassword>"
                + "<interfacePartnerNumber>" + partnerNumber + "</interfacePartnerNumber>"
                + "<interfacePartnerSignature>" + partnerSignature + "</interfacePartnerSignature>"
                + "<productVariant>calculateExpert</productVariant>"
                + "</request></aut:generateToken></soapenv:Body></soapenv:Envelope>";
    }

    // ═════════════════════════════════════════════════════════════════════════
    // VIN Lookup
    // ═════════════════════════════════════════════════════════════════════════

    private VehicleIdentification callVinLookup(String vin, String token) {
        String soapBody = buildVinSoapBody(vin);
        String response = sendSoapRequest(vinUrl, soapBody, token);
        return parseVehicleResponse(response);
    }

    private String buildVinSoapBody(String vin) {
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                + "<soapenv:Envelope"
                + " xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\""
                + " xmlns:veh=\"http://sphinx.dat.de/services/VehicleIdentificationService\">"
                + "<soapenv:Header/><soapenv:Body>"
                + "<veh:getVehicleIdentificationByVin><request>"
                + "<locale country=\"de\" datCountryIndicator=\"de\" language=\"de\"/>"
                + "<restriction>ALL</restriction>"
                + "<vin>" + vin + "</vin>"
                + "<coverage>ALL</coverage>"
                + "</request></veh:getVehicleIdentificationByVin>"
                + "</soapenv:Body></soapenv:Envelope>";
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HTTP
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Posts a SOAP request and returns the raw response body.
     *
     * <p>
     * Mirrors Python {@code requests.post()} calls in {@code get_auth_token()}
     * and {@code get_vehicle_by_vin()}.
     *
     * @throws DatException on network / IO failure
     */
    private String sendSoapRequest(String url, String body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/xml; charset=utf-8"));
        headers.set("SOAPAction", "\"\"");
        if (token != null && !token.isBlank()) {
            headers.set("DAT-AuthorizationToken", token);
        }

        HttpEntity<String> request = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            LOG.info(() -> "[DAT] POST " + url + " -> HTTP " + response.getStatusCode());

            String responseBody = response.getBody();
            if (responseBody == null || responseBody.isBlank()) {
                throw new DatException(
                        "Empty response body from DAT at " + url,
                        response.getStatusCode().value());
            }
            return responseBody;

        } catch (ResourceAccessException e) {
            // Network timeout / connection refused
            throw new DatException("Network error calling DAT at " + url + ": " + e.getMessage(), e);
        } catch (RestClientException e) {
            throw new DatException("HTTP client error calling DAT at " + url + ": " + e.getMessage(), e);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Top-level response router
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Entry-point for turning a raw DAT response string into a
     * {@link VehicleIdentification}. Handles three cases:
     * <ol>
     * <li>JSON response – converted to XML first (legacy path)
     * <li>Normal SOAP response – parsed directly
     * <li>SOAP Fault with embedded vehicle XML inside {@code <faultstring>}
     * </ol>
     * Mirrors Python's {@code parse_vehicle_xml()} + fault-handling logic.
     */
    private VehicleIdentification parseVehicleResponse(String rawResponse) {
        // ── 0. JSON detection (legacy fallback) ───────────────────────────────
        String trimmed = rawResponse.trim();
        System.out.println("[DAT] Raw response: " + rawResponse);
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            LOG.warning("[DAT] JSON response detected – converting to XML");
            rawResponse = convertJsonToXml(rawResponse);
        }

        Document doc = parseXml(rawResponse);

        // ── 1. Happy path: normal SOAP vehicle response ───────────────────────
        NodeList bodyList = doc.getElementsByTagNameNS(NS_SOAP, "Body");
        if (bodyList.getLength() > 0) {
            Element body = (Element) bodyList.item(0);
            Element responseEl = getDirectChild(body, NS_VIS, "getVehicleIdentificationByVinResponse");
            if (responseEl != null) {
                Element vxs = getDirectChild(responseEl, null, "VXS");
                Element dossier = vxs != null ? getDirectChild(vxs, NS_VXS, "Dossier") : null;
                Element vehicle = dossier != null ? getDirectChild(dossier, NS_VXS, "Vehicle") : null;

                if (vehicle != null) {
                    return parseVehicleXml(dossier, vehicle);
                }
            }
        }

        // ── 2. SOAP Fault: embedded vehicle XML inside <faultstring> ──────────
        NodeList faultNodes = doc.getElementsByTagName("faultstring");
        if (faultNodes.getLength() > 0) {
            String faultText = faultNodes.item(0).getTextContent();
            LOG.warning("[DAT] SOAP Fault detected: "
                    + faultText.substring(0, Math.min(200, faultText.length())));

            int startIdx = faultText.indexOf("<additionalInformation>");
            if (startIdx >= 0) {
                String embeddedXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                        + faultText.substring(startIdx);

                Document embeddedDoc = parseXml(embeddedXml);

                // Print flat key-value map for debugging
                Map<String, String> kvMap = new LinkedHashMap<>();
                extractKeyValuePairs(embeddedDoc.getDocumentElement(), "", kvMap);
                kvMap.forEach((k, v) -> LOG.fine("[DAT XML] " + k + " = " + v));

                NodeList embedded = embeddedDoc.getElementsByTagNameNS("*", "Vehicle");
                if (embedded.getLength() > 0) {
                    // In the fault path there is no Dossier wrapper, so pass null
                    return parseVehicleXml(null, (Element) embedded.item(0));
                }
            }

            // Re-throw with the fault text so callers get useful context
            throw new DatException("DAT SOAP Fault (no vehicle data extractable): "
                    + faultText.substring(0, Math.min(500, faultText.length())));
        }

        throw new DatXmlParseException(
                "Could not extract vehicle data from DAT response. "
                        + "First 300 chars: " + rawResponse.substring(0, Math.min(300, rawResponse.length())));
    }

    /** Package-private entry point for unit tests that parse fixture XML. */
    VehicleIdentification parseVehicleResponseForTest(String rawResponse) {
        return parseVehicleResponse(rawResponse);
    }

    /** Package-private entry point for unit tests of description-based inference. */
    Integer inferCylindersFromTextForTest(String text) {
        return inferCylindersFromText(text);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Main XML → VehicleIdentification parser
    // Mirrors Python parse_vehicle_xml() section by section
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Converts a parsed {@code <Vehicle>} DOM element (and optionally its
     * {@code <Dossier>} parent) into a fully populated
     * {@link VehicleIdentification}.
     *
     * @param dossier may be {@code null} when parsing fault-embedded XML
     * @param vehicle the {@code <Vehicle>} element (never {@code null})
     */
    private VehicleIdentification parseVehicleXml(Element dossier, Element vehicle) {
        VehicleIdentification vi = new VehicleIdentification();

        // ── Core vehicle identity ─────────────────────────────────────────────
        vi.setDatECode(childText(vehicle, "DatECode"));
        vi.setConstructionTime(childText(vehicle, "ConstructionTime"));
        vi.setManufacturer(resolveIdentityText(vehicle, dossier,
                "ManufacturerName", "Manufacturer", "Hersteller"));
        vi.setBaseModel(resolveIdentityText(vehicle, dossier,
                "BaseModelName", "BaseModel", "ModelName", "Model"));
        vi.setSubModel(resolveIdentityText(vehicle, dossier,
                "SubModelName", "SubModel", "TypeName"));

        // ── KBA numbers – join into a single comma-separated string ───────────
        Element kbaElem = getFirstByLocalName(vehicle, "KbaNumbersN");
        if (kbaElem != null) {
            List<String> kbas = new ArrayList<>();
            for (Element k : getChildrenByLocalName(kbaElem, "KbaNumber")) {
                String t = k.getTextContent();
                if (t != null && !t.isBlank())
                    kbas.add(t.trim());
            }
            if (!kbas.isEmpty())
                vi.setKbaNumbers(String.join(", ", kbas));
        }

        // ── Equipment sections ────────────────────────────────────────────────
        Element equipmentElem = getFirstByLocalName(vehicle, "Equipment");
        if (equipmentElem != null) {
            Element seriesEl = getFirstByLocalName(equipmentElem, "SeriesEquipment");
            if (seriesEl != null) {
                List<String> names = new ArrayList<>();
                for (Element pos : getChildrenByLocalName(seriesEl, "EquipmentPosition")) {
                    String desc = childText(pos, "Description");
                    if (desc != null && !desc.isBlank())
                        names.add(desc);
                }
                vi.setStandardEquipment(names);
            }

            Element specialEl = getFirstByLocalName(equipmentElem, "SpecialEquipment");
            if (specialEl != null) {
                List<String> names = new ArrayList<>();
                for (Element pos : getChildrenByLocalName(specialEl, "EquipmentPosition")) {
                    String desc = childText(pos, "Description");
                    if (desc != null && !desc.isBlank())
                        names.add(desc);
                }
                vi.setOptionalEquipment(names);
            }
        }

        // ── VINColors → standardColor + colorData ─────────────────────────────
        Element vinResultElem = getFirstByLocalName(vehicle, "VINResult");
        if (vinResultElem != null) {
            Element vinColorsElem = getFirstByLocalName(vinResultElem, "VINColors");
            if (vinColorsElem != null) {
                List<Element> colorElems = getChildrenByLocalName(vinColorsElem, "VINColor");
                if (!colorElems.isEmpty()) {
                    // standardColor from the first entry
                    vi.setStandardColor(childText(colorElems.get(0), "StandardColor"));

                    // colorData: colorId → code, colorId_desc → description, colorId_paint →
                    // paintType
                    Map<String, String> cd = new java.util.LinkedHashMap<>();
                    for (Element ce : colorElems) {
                        String colorId = childText(ce, "ColorID");
                        if (colorId == null)
                            continue;
                        String code = childText(ce, "Code");
                        String desc = childText(ce, "Description");
                        String paint = childText(ce, "PaintType");
                        if (code != null)
                            cd.put(colorId, code);
                        if (desc != null)
                            cd.put(colorId + "_desc", desc);
                        if (paint != null)
                            cd.put(colorId + "_paint", paint);
                    }
                    if (!cd.isEmpty())
                        vi.setColorData(cd);
                }
            }
        }

        // ── Technical Data ──────────────────────────────────────────────────
        // Strategy: search for TechnicalData in multiple ways —
        // 1) direct child of Vehicle, 2) recursive descendant of Vehicle,
        // 3) anywhere in the owner document (handles SOAP Fault where
        //    TechnicalData sits outside the Vehicle element).
        Element techElem = getFirstByLocalName(vehicle, "TechnicalVehicleData");
        if (techElem == null) {
            techElem = getFirstByLocalName(vehicle, "TechnicalData");
        }
        // Deep search within Vehicle subtree
        if (techElem == null) {
            techElem = findDeepByLocalName(vehicle, "TechnicalVehicleData");
        }
        if (techElem == null) {
            techElem = findDeepByLocalName(vehicle, "TechnicalData");
        }
        // Search entire document (fault XML may place it as sibling of Vehicle)
        if (techElem == null) {
            Document ownerDoc = vehicle.getOwnerDocument();
            for (String tagName : new String[]{"TechnicalVehicleData", "TechnicalData"}) {
                NodeList nl = ownerDoc.getElementsByTagNameNS("*", tagName);
                if (nl.getLength() > 0) {
                    techElem = (Element) nl.item(0);
                    LOG.info("[DAT] Found " + tagName + " via document-wide search");
                    break;
                }
            }
        }
        if (techElem != null) {
            LOG.info("[DAT] TechnicalData element found: " + techElem.getLocalName());
            extractTechnicalFields(techElem, vi);
        } else {
            LOG.warning("[DAT] TechnicalData element NOT found — "
                    + "trying to find displacement fields directly in the document");
            // Last resort: search the entire document for displacement tags
            extractDisplacementFromDocument(vehicle.getOwnerDocument(), vi);
        }

        // ── Build combined equipment list (used by EV detection and fallbacks) ─
        List<String> allEquip = new ArrayList<>();
        if (vi.getStandardEquipment() != null) allEquip.addAll(vi.getStandardEquipment());
        if (vi.getOptionalEquipment() != null) allEquip.addAll(vi.getOptionalEquipment());

        // ── EV detection (used to guard ICE-only fallbacks below) ────────────
        boolean isEV = isPureElectricVehicle(allEquip, vi.getFuelType());
        if (isEV) {
            LOG.info("[DAT] EV detected — zeroing displacement & cylinders, correcting transmission");
            vi.setDisplacement(0);
            vi.setCylinders(0);
            // If the DAT XML sent an ICE gear-count (e.g. "5-Gang"), override it
            if (vi.getTransmission() != null
                    && java.util.regex.Pattern.compile("\\d+-Gang", java.util.regex.Pattern.CASE_INSENSITIVE)
                               .matcher(vi.getTransmission()).find()) {
                LOG.info("[DAT] EV: correcting transmission '" + vi.getTransmission() + "' → 'Elektrogetriebe (1-Gang)'");
                vi.setTransmission("Elektrogetriebe (1-Gang)");
            }
        }

        // ── Equipment-based fallback for displacement (ICE vehicles only) ────
        // If displacement is still null/0 after all XML parsing, parse it from
        // equipment strings like "Motor 2,0 Ltr. - 110 kW 16V Turbodiesel".
        // Guard: skip entirely for pure EVs to prevent EV motor strings like
        // "Elektromotor 1,2 Ltr." from producing a bogus CCM value.
        if (!isEV && (vi.getDisplacement() == null || vi.getDisplacement() == 0)) {
            for (String eq : allEquip) {
                java.util.regex.Matcher m = java.util.regex.Pattern
                        .compile("(\\d+[,.]\\d+)\\s*Ltr", java.util.regex.Pattern.CASE_INSENSITIVE)
                        .matcher(eq);
                if (m.find()) {
                    double liters = Double.parseDouble(m.group(1).replace(',', '.'));
                    int ccm = mapLitersToCcm(liters, vi.getManufacturer(), eq);
                    vi.setDisplacement(ccm);
                    LOG.info("[DAT] Displacement from equipment smart fallback: \"" + eq
                            + "\" (Liters: " + liters + ", Mfg: " + vi.getManufacturer() + ") → " + vi.getDisplacement() + " ccm");
                    break;
                }
            }
        }

        // ── Cylinder extraction fallback (ICE only) ───────────────────────
        if (!isEV) {
            if (vi.getCylinders() == null) {
                extractCylindersFromDocument(vehicle.getOwnerDocument(), vi);
            }
            if (vi.getCylinders() == null) {
                inferCylindersFromDescriptions(vi, vehicle);
            }
        }

        logParsedSummary(vi);
        return vi;
    }
    // ═════════════════════════════════════════════════════════════════════════
    // Technical field extraction helpers
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Extracts all technical fields (power, displacement, cylinders, etc.) from
     * the given {@code techElem} into {@code vi}. Factored out of
     * {@code parseVehicleXml} so it can be called from multiple search paths.
     */
    private void extractTechnicalFields(Element techElem, VehicleIdentification vi) {
        // Power (kW)
        String pKw = childText(techElem, "PowerKW");
        if (pKw == null) pKw = childText(techElem, "PowerKw");
        if (pKw == null) pKw = childText(techElem, "LeistungKW");
        if (pKw == null) pKw = childText(techElem, "LeistungKw");
        if (pKw == null) pKw = childText(techElem, "Leistung");
        if (pKw != null) {
            try {
                String numeric = pKw.replaceAll("[^0-9]", "");
                if (!numeric.isEmpty()) {
                    vi.setPowerKw(Integer.parseInt(numeric));
                }
            } catch (Exception e) {
                LOG.warning("[DAT] Failed to parse Power: " + pKw);
            }
        }

        // Displacement (ccm)
        String disp = childText(techElem, "Displacement");
        if (disp == null) disp = childText(techElem, "Hubraum");
        if (disp == null) disp = childText(techElem, "HubraumCcm");
        if (disp == null) disp = childText(techElem, "Capacity");
        if (disp == null) disp = childText(techElem, "CapacityCcm");
        if (disp != null) {
            try {
                java.util.regex.Matcher dispMatcher =
                    java.util.regex.Pattern.compile("(\\d+(?:[.,]\\d+)?)").matcher(disp);
                if (dispMatcher.find()) {
                    String numericStr = dispMatcher.group(1).replace(',', '.');
                    vi.setDisplacement((int) Double.parseDouble(numericStr));
                    LOG.info("[DAT] Displacement parsed: " + disp + " → " + vi.getDisplacement());
                }
            } catch (Exception e) {
                LOG.warning("[DAT] Failed to parse Displacement: " + disp);
            }
        }

        // Cylinders
        String cyl = childText(techElem, "CylinderCount");
        if (cyl == null) cyl = childText(techElem, "Cylinders");
        if (cyl == null) cyl = childText(techElem, "Zylinder");
        if (cyl == null) cyl = childText(techElem, "ZylinderAnzahl");
        if (cyl == null) cyl = childText(techElem, "NumberOfCylinders");
        if (cyl != null) {
            try {
                String numeric = cyl.replaceAll("[^0-9]", "");
                if (!numeric.isEmpty()) {
                    vi.setCylinders(Integer.parseInt(numeric));
                }
            } catch (Exception e) {
                LOG.warning("[DAT] Failed to parse Cylinders: " + cyl);
            }
        }

        // Fuel Type
        String fuel = childText(techElem, "FuelType");
        if (fuel == null) fuel = childText(techElem, "Kraftstoff");
        // Normalize EV fuel type variants to canonical "Elektro"
        if (fuel != null) {
            String ft = fuel.trim().toLowerCase(Locale.ROOT);
            if (ft.equals("bev") || ft.equals("electric") || ft.equals("strom")
                    || ft.equals("elektrisch") || ft.equals("elektrizitaet")
                    || ft.equals("electricity")) {
                fuel = "Elektro";
                LOG.info("[DAT] Normalized EV fuelType '" + ft + "' → 'Elektro'");
            }
        }
        vi.setFuelType(fuel);

        // Transmission
        String trans = childText(techElem, "TransmissionType");
        if (trans == null) trans = childText(techElem, "Getriebeart");
        if (trans == null) trans = childText(techElem, "Getriebe");
        vi.setTransmission(trans);

        // Drive Type
        String drive = childText(techElem, "DriveType");
        if (drive == null) drive = childText(techElem, "Antriebsart");
        if (drive == null) drive = childText(techElem, "Antrieb");
        vi.setDriveType(drive);

        // Emission Class
        String emission = childText(techElem, "EmissionClass");
        if (emission == null) emission = childText(techElem, "Schadstoffklasse");
        vi.setEmissionClass(emission);

        // Body Type
        String body = childText(techElem, "BodyType");
        if (body == null) body = childText(techElem, "Aufbau");
        vi.setBodyType(body);

        // Doors
        String doors = childText(techElem, "DoorCount");
        if (doors == null) doors = childText(techElem, "Doors");
        if (doors == null) doors = childText(techElem, "AnzahlTueren");
        if (doors != null) {
            try {
                vi.setDoors(Integer.parseInt(doors.replaceAll("[^0-9]", "")));
            } catch (Exception e) {
                LOG.warning("[DAT] Failed to parse Doors: " + doors);
            }
        }

        // Seats
        String seats = childText(techElem, "SeatCount");
        if (seats == null) seats = childText(techElem, "Seats");
        if (seats == null) seats = childText(techElem, "AnzahlSitze");
        if (seats != null) {
            try {
                vi.setSeats(Integer.parseInt(seats.replaceAll("[^0-9]", "")));
            } catch (Exception e) {
                LOG.warning("[DAT] Failed to parse Seats: " + seats);
            }
        }

        // Motorvariant
        String motorVariant = childText(techElem, "Motorvariant");
        if (motorVariant != null && !motorVariant.isBlank()) {
            String currentSubModel = vi.getSubModel();
            if (currentSubModel == null || currentSubModel.isBlank()) {
                vi.setSubModel(motorVariant);
            } else if (!currentSubModel.contains(motorVariant)) {
                vi.setSubModel(currentSubModel + " (" + motorVariant + ")");
            }
        }
    }

    /**
     * Searches the entire DOM document for displacement-related elements and
     * sets the value on {@code vi} if found. Used when no TechnicalData wrapper
     * element can be located.
     */
    private void extractDisplacementFromDocument(Document doc, VehicleIdentification vi) {
        for (String tagName : new String[]{
                "Displacement", "Hubraum", "HubraumCcm", "Capacity", "CapacityCcm"}) {
            NodeList nodes = doc.getElementsByTagNameNS("*", tagName);
            if (nodes.getLength() > 0) {
                String text = nodes.item(0).getTextContent();
                if (text != null && !text.isBlank()) {
                    try {
                        java.util.regex.Matcher m = java.util.regex.Pattern
                                .compile("(\\d+(?:[.,]\\d+)?)").matcher(text.strip());
                        if (m.find()) {
                            String numericStr = m.group(1).replace(',', '.');
                            vi.setDisplacement((int) Double.parseDouble(numericStr));
                            LOG.info("[DAT] Displacement from document search (" + tagName
                                    + "): " + text + " → " + vi.getDisplacement());
                            return;
                        }
                    } catch (Exception e) {
                        LOG.warning("[DAT] Failed to parse displacement from " + tagName + ": " + text);
                    }
                }
            }
        }
    }

    /**
     * Searches the entire DOM document for cylinder-count elements and sets
     * the value on {@code vi} when found.
     */
    private void extractCylindersFromDocument(Document doc, VehicleIdentification vi) {
        for (String tagName : new String[]{
                "CylinderCount", "Cylinders", "Zylinder", "ZylinderAnzahl", "NumberOfCylinders"}) {
            NodeList nodes = doc.getElementsByTagNameNS("*", tagName);
            if (nodes.getLength() > 0) {
                String text = nodes.item(0).getTextContent();
                if (text != null && !text.isBlank()) {
                    try {
                        String numeric = text.replaceAll("[^0-9]", "");
                        if (!numeric.isEmpty()) {
                            vi.setCylinders(Integer.parseInt(numeric));
                            LOG.info("[DAT] Cylinders from document search (" + tagName
                                    + "): " + text + " → " + vi.getCylinders());
                            return;
                        }
                    } catch (Exception e) {
                        LOG.warning("[DAT] Failed to parse cylinders from " + tagName + ": " + text);
                    }
                }
            }
        }
    }

    /**
     * Infers cylinder count from engine and marketing descriptions when no
     * explicit XML field is present. Only matches unambiguous layout patterns
     * (V6, I4, N-Zylinder, etc.) — never from valve count or displacement.
     */
    private void inferCylindersFromDescriptions(VehicleIdentification vi, Element vehicle) {
        List<String> allEquip = new ArrayList<>();
        if (vi.getStandardEquipment() != null) allEquip.addAll(vi.getStandardEquipment());
        if (vi.getOptionalEquipment() != null) allEquip.addAll(vi.getOptionalEquipment());

        if (isPureElectricVehicle(allEquip, vi.getFuelType())) {
            vi.setCylinders(0);
            LOG.info("[DAT] Cylinders set to 0 for pure electric vehicle");
            return;
        }

        List<String> texts = new ArrayList<>();
        for (String eq : allEquip) {
            if (eq != null && eq.matches("(?i)Motor\\s+.*")) {
                texts.add(eq);
            }
        }
        for (String tag : new String[]{
                "SalesDescription", "ContainerNameN", "SubModelName",
                "EngineDescription", "VariantDescription", "MarketingDescription"}) {
            String t = childText(vehicle, tag);
            if (t != null && !t.isBlank()) {
                texts.add(t);
            }
        }

        for (String text : texts) {
            Integer cyl = inferCylindersFromText(text);
            if (cyl != null) {
                vi.setCylinders(cyl);
                LOG.info("[DAT] Cylinders inferred from description: \"" + text + "\" → " + cyl);
                return;
            }
        }
    }

    private boolean isPureElectricVehicle(List<String> equipment, String fuelType) {
        if (fuelType != null) {
            String ft = fuelType.trim().toLowerCase(Locale.ROOT);
            // DAT may return: "Elektro", "BEV", "Strom", "Electric", "Elektrisch"
            if (ft.equals("elektro") || ft.equals("bev") || ft.equals("electric")
                    || ft.equals("strom") || ft.equals("elektrisch")
                    || ft.equals("elektrizitaet") || ft.equals("electricity")) {
                return true;
            }
        }
        String combined = String.join(" ", equipment).toLowerCase(Locale.ROOT);
        boolean hasElectric = combined.contains("elektromotor")
                || combined.contains("hv-batterie")
                || combined.contains("elektrofahrzeug")
                || combined.contains("hochvoltbatterie")
                || combined.contains("antriebsbatterie");
        boolean hasPlugin = combined.contains("plug-in") || combined.contains("plugin")
                || combined.contains("phev");
        return hasElectric && !hasPlugin;
    }

    /**
     * Returns cylinder count when {@code text} contains an unambiguous engine
     * layout descriptor, or {@code null} when it cannot be determined.
     */
    private Integer inferCylindersFromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        int flags = java.util.regex.Pattern.CASE_INSENSITIVE | java.util.regex.Pattern.UNICODE_CASE;

        java.util.regex.Matcher explicit = java.util.regex.Pattern
                .compile("\\b(\\d+)[-\\s]?Zylinder\\b", flags).matcher(text);
        if (explicit.find()) {
            return Integer.parseInt(explicit.group(1));
        }

        explicit = java.util.regex.Pattern.compile("\\b(\\d+)Zyl\\b", flags).matcher(text);
        if (explicit.find()) {
            return Integer.parseInt(explicit.group(1));
        }

        if (java.util.regex.Pattern.compile("\\bV12\\b", flags).matcher(text).find()) return 12;
        if (java.util.regex.Pattern.compile("\\bV10\\b", flags).matcher(text).find()) return 10;
        if (java.util.regex.Pattern.compile("\\bV8\\b", flags).matcher(text).find()) return 8;
        if (java.util.regex.Pattern.compile("\\bV6\\b", flags).matcher(text).find()) return 6;
        if (java.util.regex.Pattern.compile("\\bI6\\b", flags).matcher(text).find()) return 6;
        if (java.util.regex.Pattern.compile("\\bInline\\s*6\\b", flags).matcher(text).find()) return 6;
        if (java.util.regex.Pattern.compile("\\bBoxer\\s*6\\b", flags).matcher(text).find()) return 6;
        if (java.util.regex.Pattern.compile("\\bI4\\b", flags).matcher(text).find()) return 4;
        if (java.util.regex.Pattern.compile("\\bInline\\s*4\\b", flags).matcher(text).find()) return 4;
        if (java.util.regex.Pattern.compile("\\bI3\\b", flags).matcher(text).find()) return 3;
        if (java.util.regex.Pattern.compile("\\b3[-\\s]?cylinder\\b", flags).matcher(text).find()) return 3;
        if (java.util.regex.Pattern.compile("\\b3[-\\s]?Zyl\\b", flags).matcher(text).find()) return 3;
        if (java.util.regex.Pattern.compile("\\bTwin[-\\s]?cylinder\\b", flags).matcher(text).find()) return 2;
        if (java.util.regex.Pattern.compile("\\b2[-\\s]?Zyl\\b", flags).matcher(text).find()) return 2;

        return null;
    }

    /**
     * Recursively searches all descendants of {@code parent} (not just direct
     * children) for an element matching {@code localName} (case-insensitive).
     */
    private Element findDeepByLocalName(Element parent, String localName) {
        if (parent == null || localName == null) return null;
        NodeList all = parent.getElementsByTagNameNS("*", localName);
        if (all.getLength() > 0) return (Element) all.item(0);
        // getElementsByTagNameNS is case-sensitive on localName, so also try
        // a manual recursive walk for case-insensitive matching
        return findDeepByLocalNameRecursive(parent, localName);
    }

    private Element findDeepByLocalNameRecursive(Element parent, String localName) {
        org.w3c.dom.NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            org.w3c.dom.Node n = children.item(i);
            if (n.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE) {
                Element el = (Element) n;
                if (localName.equalsIgnoreCase(el.getLocalName())) {
                    return el;
                }
                Element found = findDeepByLocalNameRecursive(el, localName);
                if (found != null) return found;
            }
        }
        return null;
    }
    /**
     * Translates a rounded liter value from an equipment string (e.g. "2,0 Ltr.")
     * into the exact historical/technical ccm displacement commonly returned by DAT.
     * Maps 1.0 -> 999, BMW 2.0 Diesel -> 1995, BMW 3.0 Petrol -> 2998, etc.
     */
    private int mapLitersToCcm(double liters, String manufacturer, String equipText) {
        String mfg = manufacturer != null ? manufacturer.toUpperCase() : "";
        String eq = equipText != null ? equipText.toLowerCase() : "";
        boolean isDiesel = eq.contains("diesel") || eq.contains("d ") || eq.contains(" hdi")
                || eq.contains(" tdi") || eq.contains(" cdti") || eq.contains(" crdi")
                || eq.contains(" dci") || eq.contains("td ");

        // Round to 1 decimal place to avoid float representation issues
        double l = Math.round(liters * 10.0) / 10.0;

        if (l == 1.0) {
            if (mfg.contains("FORD") || mfg.contains("TOYOTA")) return 998;
            return 999; // Standard VAG, BMW, Opel, Renault, PSA 1.0
        }
        if (l == 1.2) {
            if (mfg.contains("OPEL") || mfg.contains("PEUGEOT") || mfg.contains("CITROEN") || mfg.contains("PSA")) return 1199;
            if (mfg.contains("RENAULT") || mfg.contains("DACIA")) return 1149;
            return 1197; // VAG 1.2 TSI
        }
        if (l == 1.3) {
            if (mfg.contains("RENAULT") || mfg.contains("MERCEDES")) return 1332;
            return 1329;
        }
        if (l == 1.4) {
            if (mfg.contains("OPEL")) return 1364;
            return 1395; // VAG 1.4 TSI
        }
        if (l == 1.5) {
            if (mfg.contains("BMW")) {
                return isDiesel ? 1496 : 1499;
            }
            if (mfg.contains("MERCEDES")) {
                return 1461; // OM607/OM608
            }
            if (mfg.contains("FORD") || mfg.contains("PEUGEOT") || mfg.contains("CITROEN") || mfg.contains("PSA")) {
                return isDiesel ? 1499 : 1496;
            }
            return 1498; // VAG 1.5 TSI
        }
        if (l == 1.6) {
            return 1598; // Universally 1598 ccm
        }
        if (l == 1.8) {
            if (mfg.contains("MERCEDES")) return 1796;
            return 1798; // VAG, Toyota 1.8
        }
        if (l == 2.0) {
            if (mfg.contains("BMW")) {
                return isDiesel ? 1995 : 1998;
            }
            if (mfg.contains("MERCEDES")) {
                return isDiesel ? 1950 : 1991;
            }
            if (mfg.contains("AUDI") || mfg.contains("VOLKSWAGEN") || mfg.contains("VW") || mfg.contains("SEAT") || mfg.contains("SKODA")) {
                return isDiesel ? 1968 : 1984;
            }
            if (mfg.contains("OPEL")) return 1956;
            if (mfg.contains("PSA") || mfg.contains("PEUGEOT") || mfg.contains("CITROEN")) return 1997;
            if (mfg.contains("FORD")) return 1996;
            return 1995; // Default fallback
        }
        if (l == 2.1 || l == 2.2) {
            if (mfg.contains("MERCEDES")) return 2143; // OM651 2.1/2.2 Diesel
            if (mfg.contains("PSA") || mfg.contains("FORD")) return 2198;
            return (int)(l * 1000);
        }
        if (l == 2.5) {
            if (mfg.contains("AUDI") || mfg.contains("VOLKSWAGEN") || mfg.contains("VW")) return 2480; // RS3/TTRS 5-cyl
            return 2497;
        }
        if (l == 3.0) {
            if (mfg.contains("BMW")) {
                return isDiesel ? 2993 : 2998;
            }
            if (mfg.contains("MERCEDES")) {
                return isDiesel ? 2925 : 2999;
            }
            if (mfg.contains("AUDI") || mfg.contains("VOLKSWAGEN") || mfg.contains("VW")) {
                return isDiesel ? 2967 : 2995;
            }
            return 2998; // Default fallback
        }
        return (int) Math.floor(liters * 1000);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // JSON → XML conversion (legacy path, mirrors convertJsonResponseToXml)
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Converts a JSON response to minimal SOAP/XML so it can be processed by
     * the existing XML pipeline.
     *
     * @throws DatXmlParseException if the expected JSON structure is missing
     */
    private String convertJsonToXml(String json) {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root;
        try {
            root = mapper.readTree(json);
        } catch (IOException e) {
            throw new DatXmlParseException("Failed to parse JSON from DAT response: " + e.getMessage(), e);
        }

        JsonNode vehicle = root
                .path("Envelope").path("Body")
                .path("getVehicleIdentificationByVinResponse")
                .path("VXS").path("Dossier").path("Vehicle");

        if (vehicle.isMissingNode()) {
            throw new DatXmlParseException(
                    "Cannot find Vehicle node in JSON response. "
                            + "Keys at root: " + root.fieldNames());
        }

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.newDocument();

            Element envelope = doc.createElementNS(NS_SOAP, "soapenv:Envelope");
            doc.appendChild(envelope);
            Element body = doc.createElementNS(NS_SOAP, "soapenv:Body");
            envelope.appendChild(body);
            Element responseEl = doc.createElement("getVehicleIdentificationByVinResponse");
            body.appendChild(responseEl);
            Element vxs = doc.createElement("VXS");
            responseEl.appendChild(vxs);
            Element dossier = doc.createElementNS(NS_VXS, "ns1:Dossier");
            vxs.appendChild(dossier);
            Element vehicleEl = doc.createElementNS(NS_VXS, "ns1:Vehicle");
            dossier.appendChild(vehicleEl);

            appendJsonNodeAsXml(doc, vehicleEl, vehicle);

            TransformerFactory tf = TransformerFactory.newInstance();
            Transformer transformer = tf.newTransformer();
            transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "no");
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            StringWriter sw = new StringWriter();
            transformer.transform(new DOMSource(doc), new StreamResult(sw));
            String xmlResult = sw.toString();
            LOG.info("[DAT] JSON converted to XML (" + xmlResult.length() + " chars)");
            return xmlResult;

        } catch (Exception e) {
            throw new DatXmlParseException("Error building XML from JSON: " + e.getMessage(), e);
        }
    }

    /** Recursively converts a Jackson JsonNode subtree into DOM elements. */
    private void appendJsonNodeAsXml(Document doc, Element parent, JsonNode node) {
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String fieldName = field.getKey();
                JsonNode value = field.getValue();

                if ("@attributes".equals(fieldName) && value.isObject()) {
                    value.fields().forEachRemaining(
                            a -> parent.setAttribute(a.getKey(), a.getValue().asText()));
                } else if ("#text".equals(fieldName)) {
                    parent.setTextContent(value.asText());
                } else if (value.isArray()) {
                    for (JsonNode item : value) {
                        Element child = doc.createElement(sanitizeXmlTag(fieldName));
                        parent.appendChild(child);
                        appendJsonNodeAsXml(doc, child, item);
                    }
                } else {
                    Element child = doc.createElement(sanitizeXmlTag(fieldName));
                    parent.appendChild(child);
                    appendJsonNodeAsXml(doc, child, value);
                }
            }
        } else if (node.isValueNode()) {
            parent.setTextContent(node.asText());
        }
    }

    private String sanitizeXmlTag(String name) {
        if (name == null || name.isEmpty())
            return "_";
        return name.replaceAll("[^a-zA-Z0-9_\\-.]", "_")
                .replaceAll("^([0-9\\-.])", "_$1");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DOM helpers – mirror Python's _text() / elem.find() / elem.findall()
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Returns the text of the first matching identity element, trying direct
     * children and deep search on both {@code vehicle} and {@code dossier}.
     */
    private String resolveIdentityText(Element vehicle, Element dossier, String... localNames) {
        for (String name : localNames) {
            String value = childText(vehicle, name);
            if (value != null) return value;

            Element deep = findDeepByLocalName(vehicle, name);
            if (deep != null) {
                String text = deep.getTextContent();
                if (text != null && !text.isBlank()) return text.strip();
            }

            if (dossier != null) {
                value = childText(dossier, name);
                if (value != null) return value;

                deep = findDeepByLocalName(dossier, name);
                if (deep != null) {
                    String text = deep.getTextContent();
                    if (text != null && !text.isBlank()) return text.strip();
                }
            }
        }
        return null;
    }

    /**
     * Returns the text of the first <em>direct child</em> element that matches
     * {@code localName} (any namespace), trimmed and {@code null} if empty.
     * Mirrors Python {@code _text(elem, tag)}.
     */
    private String childText(Element parent, String localName) {
        Element child = getFirstByLocalName(parent, localName);
        if (child == null)
            return null;
        String text = child.getTextContent();
        return (text != null && !text.isBlank()) ? text.strip() : null;
    }

    /**
     * Returns the first direct-child element with the given local name
     * (namespace-independent). Mirrors Python {@code elem.find(tag, NS)}.
     */
    private Element getFirstByLocalName(Element parent, String localName) {
        if (parent == null || localName == null)
            return null;
        org.w3c.dom.NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            org.w3c.dom.Node n = children.item(i);
            if (n.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE
                    && localName.equalsIgnoreCase(n.getLocalName())) {
                return (Element) n;
            }
        }
        return null;
    }

    /**
     * Returns all direct-child elements with the given local name.
     * Mirrors Python {@code elem.findall(tag, NS)}.
     */
    private List<Element> getChildrenByLocalName(Element parent, String localName) {
        List<Element> result = new ArrayList<>();
        if (parent == null || localName == null)
            return result;
        org.w3c.dom.NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            org.w3c.dom.Node n = children.item(i);
            if (n.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE
                    && localName.equalsIgnoreCase(n.getLocalName())) {
                result.add((Element) n);
            }
        }
        return result;
    }

    /**
     * Returns the first direct-child element matching {@code localName} in
     * {@code nsUri}. Pass {@code null} for {@code nsUri} to match any
     * namespace (or no namespace).
     */
    private Element getDirectChild(Element parent, String nsUri, String localName) {
        if (parent == null || localName == null)
            return null;
        org.w3c.dom.NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            org.w3c.dom.Node n = children.item(i);
            if (n.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE
                    && localName.equalsIgnoreCase(n.getLocalName())) {
                if (nsUri == null || nsUri.equals(n.getNamespaceURI())) {
                    return (Element) n;
                }
            }
        }
        return null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // XML parsing / key-value debug helpers
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Parses an XML string into a DOM {@link Document}.
     *
     * @throws DatXmlParseException on malformed XML
     */
    private Document parseXml(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            // Protect against XXE
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
        } catch (SAXException e) {
            throw new DatXmlParseException(
                    "Malformed XML from DAT: " + e.getMessage()
                            + " | First 200 chars: " + xml.substring(0, Math.min(200, xml.length())),
                    e);
        } catch (ParserConfigurationException | IOException e) {
            throw new DatXmlParseException("XML parser setup error: " + e.getMessage(), e);
        }
    }

    /**
     * Recursively walks the DOM and collects every leaf text node as a flat
     * {@code key=value} entry. Repeated sibling elements get an index suffix.
     * Used only for debug logging of fault-path responses.
     */
    private void extractKeyValuePairs(org.w3c.dom.Node node, String path, Map<String, String> result) {
        String localName = node.getLocalName() != null ? node.getLocalName() : node.getNodeName();
        String currentPath = path.isEmpty() ? localName : path + "." + localName;

        org.w3c.dom.NamedNodeMap attrs = node.getAttributes();
        if (attrs != null) {
            for (int i = 0; i < attrs.getLength(); i++) {
                org.w3c.dom.Node attr = attrs.item(i);
                String attrName = attr.getLocalName() != null ? attr.getLocalName() : attr.getNodeName();
                result.put(currentPath + "[@" + attrName + "]", attr.getNodeValue());
            }
        }

        NodeList children = node.getChildNodes();
        List<org.w3c.dom.Node> elementChildren = new ArrayList<>();
        StringBuilder textContent = new StringBuilder();

        for (int i = 0; i < children.getLength(); i++) {
            org.w3c.dom.Node child = children.item(i);
            if (child.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE) {
                elementChildren.add(child);
            } else if (child.getNodeType() == org.w3c.dom.Node.TEXT_NODE) {
                String text = child.getTextContent().trim();
                if (!text.isEmpty())
                    textContent.append(text);
            }
        }

        if (elementChildren.isEmpty()) {
            String val = textContent.toString();
            if (!val.isEmpty())
                result.put(currentPath, val);
            return;
        }

        Map<String, List<org.w3c.dom.Node>> grouped = new LinkedHashMap<>();
        for (org.w3c.dom.Node child : elementChildren) {
            String k = child.getLocalName() != null ? child.getLocalName() : child.getNodeName();
            grouped.computeIfAbsent(k, x -> new ArrayList<>()).add(child);
        }

        for (Map.Entry<String, List<org.w3c.dom.Node>> entry : grouped.entrySet()) {
            List<org.w3c.dom.Node> siblings = entry.getValue();
            if (siblings.size() == 1) {
                extractKeyValuePairs(siblings.get(0), currentPath, result);
            } else {
                for (int i = 0; i < siblings.size(); i++) {
                    extractKeyValuePairs(siblings.get(i),
                            currentPath + "." + entry.getKey() + "[" + i + "]", result);
                }
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Logging helper
    // ═════════════════════════════════════════════════════════════════════════

    private void logParsedSummary(VehicleIdentification vi) {
        LOG.info("[DAT] Parsed VehicleIdentification:"
                + " manufacturer=" + vi.getManufacturer()
                + " baseModel=" + vi.getBaseModel()
                + " subModel=" + vi.getSubModel()
                + " construction=" + vi.getConstructionTime()
                + " standardEquipment=" + (vi.getStandardEquipment() != null ? vi.getStandardEquipment().size() : 0)
                + " optionalEquipment=" + (vi.getOptionalEquipment() != null ? vi.getOptionalEquipment().size() : 0));
    }
}
