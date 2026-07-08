/**
 * Normalize any date string to YYYY-MM-DD format (for HTML <input type="date">).
 *
 * Supported input formats:
 *  - "2026-03-30"                      (already correct)
 *  - "2026-03-30T14:00:00Z"            (ISO 8601 with timezone)
 *  - "2026-03-30T13:53:43.5835885Z"    (ISO 8601 with high-precision fractional seconds)
 *  - "30.03.2026"                      (German DD.MM.YYYY)
 *  - "03/30/2026"                      (US MM/DD/YYYY)
 *  - Any string parseable by new Date()
 *
 * Returns empty string for falsy/unparseable input.
 */
export function normalizeDate(value: string): string {
    if (!value || typeof value !== 'string') return '';

    const trimmed = value.trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // ISO 8601 datetime: "2026-03-30T14:00:00Z" or "2026-03-30T13:53:43.5835885Z"
    // Use the Date constructor so the browser shifts from UTC to local time.
    if (trimmed.includes('T')) {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    // German format: DD.MM.YYYY
    const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (deMatch) {
        return `${deMatch[3]}-${deMatch[2].padStart(2, '0')}-${deMatch[1].padStart(2, '0')}`;
    }

    // US format: MM/DD/YYYY
    const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
        return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
    }

    // Fallback: try Date constructor
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Can't parse — return as-is
    return trimmed;
}

/**
 * Normalize any time string to HH:MM format (for HTML <input type="time">).
 *
 * Supported input formats:
 *  - "13:54"                           (already correct)
 *  - "13:54:23"                        (with seconds)
 *  - "13:54:23.8989820"                (with high-precision fractional seconds)
 *  - "1:54 PM" / "01:54 PM"           (12-hour with AM/PM)
 *  - "2026-03-30T13:53:43.5835885Z"   (ISO 8601 — extracts time part)
 *
 * Returns empty string for falsy/unparseable input.
 */
export function normalizeTime(value: string): string {
    if (!value || typeof value !== 'string') return '';

    const trimmed = value.trim();

    // Already in HH:MM format
    if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;

    // Time only: "HH:MM:SS" or "HH:MM:SS.fractional"
    const timeOnlyMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (timeOnlyMatch) {
        return `${timeOnlyMatch[1].padStart(2, '0')}:${timeOnlyMatch[2]}`;
    }

    // ISO 8601 datetime: use Date constructor so browser shifts from UTC to local time.
    if (trimmed.includes('T')) {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
    }

    // 12-hour format: "1:54 PM" or "01:54 PM"
    const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHourMatch) {
        let hours = parseInt(twelveHourMatch[1], 10);
        const minutes = twelveHourMatch[2];
        const period = twelveHourMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return `${String(hours).padStart(2, '0')}:${minutes}`;
    }

    // Fallback: try Date constructor
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // Can't parse — return as-is
    return trimmed;
}

/**
 * Format a date string to DD.MM.YYYY for display (e.g. in PDF).
 * Handles all the same input formats as normalizeDate.
 */
export function formatDate(dateString: string): string {
    if (!dateString) return '';

    // First normalize to YYYY-MM-DD
    const normalized = normalizeDate(dateString);
    if (!normalized) return '';

    // Parse YYYY-MM-DD
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return `${match[3]}.${match[2]}.${match[1]}`;
    }

    // Fallback: use Date constructor
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

/**
 * Format a date string to "DD.MM.YYYY, HH:mm" for display.
 * Example: "11.05.2026, 14:35"
 */
export function formatDateTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Only include time if it's not exactly midnight (00:00) 
    // OR if it's clearly a datetime string with time info.
    // However, to keep it consistent as per user request "Time display optional, but consistent",
    // we will include it if the input string had a 'T' or a colon, or just always for formatDateTime.
    // The user specifically asked for "Time display optional, but consistent".
    // Let's always include it for formatDateTime, but format it as German.
    return `${day}.${month}.${year}, ${hours}:${minutes}`;
}

/**
 * Today's date as YYYY-MM-DD (for default values / HTML date inputs).
 */
export function todayISO(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Auto-formats a date input string to DD.MM.YYYY.
 * Strips non-digits and inserts dots.
 */
export function formatDateInput(value: string): string {
    // Strip all non-digits
    const digits = value.replace(/\D/g, '').substring(0, 8);

    // Build DD.MM.YYYY
    let res = '';
    if (digits.length > 0) {
        res += digits.substring(0, 2);
    }
    if (digits.length > 2) {
        res += '.' + digits.substring(2, 4);
    }
    if (digits.length > 4) {
        res += '.' + digits.substring(4, 8);
    }
    return res;
}

/**
 * Auto-formats a month-year input string to MM.YYYY.
 * Strips non-digits and inserts a dot after the month.
 */
export function formatMonthYearInput(value: string): string {
    const digits = value.replace(/\D/g, '').substring(0, 6);

    let res = '';
    if (digits.length > 0) {
        res += digits.substring(0, 2);
    }
    if (digits.length > 2) {
        res += '.' + digits.substring(2, 6);
    }
    return res;
}

/**
 * Normalize any month-year string to YYYY-MM format (for HTML <input type="month">).
 *
 * Supported input formats:
 *  - "2026-12"                         (already correct)
 *  - "12.2026"                         (German MM.YYYY)
 *  - "15.12.2026"                      (legacy DD.MM.YYYY — month + year only)
 *  - "12 / 2026"                       (spaced slash variant)
 */
export function normalizeMonthYear(value: string): string {
    if (!value || typeof value !== 'string') return '';

    const trimmed = value.trim();

    if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

    const legacyMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (legacyMatch) {
        return `${legacyMatch[3]}-${legacyMatch[2].padStart(2, '0')}`;
    }

    const monthYearMatch = trimmed.match(/^(\d{1,2})[./\s]+(\d{4})$/);
    if (monthYearMatch) {
        return `${monthYearMatch[2]}-${monthYearMatch[1].padStart(2, '0')}`;
    }

    const normalized = normalizeDate(trimmed);
    const dateMatch = normalized.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (dateMatch) {
        return `${dateMatch[1]}-${dateMatch[2]}`;
    }

    return '';
}

/**
 * Format a month-year string to MM.YYYY for display and storage (e.g. HU/TÜV dates).
 */
export function formatMonthYear(value: string): string {
    if (!value || typeof value !== 'string') return '';

    const normalized = normalizeMonthYear(value);
    if (!normalized) return value.trim();

    const match = normalized.match(/^(\d{4})-(\d{2})$/);
    if (match) {
        return `${match[2]}.${match[1]}`;
    }

    return value.trim();
}

/**
 * Parse a month-year string (MM.YYYY) into a Date at the first day of that month.
 */
export function parseMonthYear(value: string | null | undefined): Date | null {
    if (!value) return null;

    const normalized = normalizeMonthYear(value);
    if (!normalized) return null;

    const match = normalized.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return null;

    return new Date(year, month, 1);
}
