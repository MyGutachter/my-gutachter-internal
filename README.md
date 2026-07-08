# MyGutachter — Fahrzeugbewertung & Schadensgutachten

> Vehicle Appraisal & Damage Assessment Platform
> DEKRA-Style Zustandsbericht / Minderwertgutachten Generator

---

## 🚀 Schnellstart / Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5174
```

**Umgebungsvariablen / Environment:**
```bash
# .env (already created with defaults)
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK=true        # Uses mock data (KIA Sportage)
```

### Backend (Spring Boot)

```bash
cd backend
# Set environment variables:
export DAT_CUSTOMER_NUMBER=your_number
export DAT_CUSTOMER_LOGIN=your_login
export DAT_CUSTOMER_PASSWORD=your_password

mvn spring-boot:run
# → http://localhost:8080
```

> **Hinweis / Note:** The frontend works fully in mock mode (`VITE_USE_MOCK=true`). The backend is only needed for real DAT API calls.

---

## 📁 Project Structure

```
├── frontend/                    # React 18 + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── api/                 # DAT API client + mock
│   │   ├── components/
│   │   │   ├── layout/          # Header, Footer, StepIndicator, Sidebar
│   │   │   ├── steps/           # Step1-5 form components
│   │   │   └── ui/              # Reusable form inputs, badges, etc.
│   │   ├── constants/           # Company info, body parts, vehicle DB
│   │   ├── i18n/                # de.json + en.json translations
│   │   ├── pages/               # ReportFormPage, VehicleListPage
│   │   ├── store/               # Zustand state management
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # VIN validator, currency, PDF generator
│   └── tailwind.config.js
│
├── backend/                     # Spring Boot 3 (Java 17)
│   └── src/main/java/com/mygutachter/
│       ├── controller/          # DatController (POST /api/dat/vin-lookup)
│       ├── service/             # DatService (SOAP auth + VIN lookup)
│       ├── model/               # VinRequest, VehicleIdentification
│       └── config/              # CorsConfig
```

## ✨ Features

- **5-Step Form Workflow**: Order info → Vehicle ID → Condition → Damages → Summary
- **VIN Lookup**: DAT SOAP API integration with mock mode
- **Interactive Car Diagram**: SVG with clickable body parts for damage marking
- **Damage Table**: Add/remove rows, Anrechnung auto-logic, running totals
- **Photo Upload**: Multi-photo with base64, editable labels
- **PDF Export**: DEKRA-style A4 PDF via `window.print()` — all inline CSS
- **Bilingual**: German (default) + English toggle, PDF always in German
- **Responsive**: Mobile-first with bottom nav, card layouts on small screens
- **Auto-Save**: All state persisted to localStorage
- **Vehicle Database**: 170+ models with Preiskategorie (AZT + Hersteller)

## 🏢 MyGutachter GmbH

Schlaraffiastraße 1, 44867 Bochum | www.MyGutachter.de
