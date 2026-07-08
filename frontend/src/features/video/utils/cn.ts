/**
 * Minimal, dependency-free class-name combiner (ported components used clsx +
 * tailwind-merge, which the merged app doesn't ship). Supports the forms the
 * ported ui/Button and ui/Input use: strings, falsy values, and { class: bool }
 * maps. Later classes win by ordering (no Tailwind conflict de-duplication,
 * which those components don't rely on).
 */
type ClassValue = string | number | null | undefined | false | Record<string, unknown>;

export function cn(...inputs: ClassValue[]): string {
    const out: string[] = [];
    for (const input of inputs) {
        if (!input) continue;
        if (typeof input === 'string' || typeof input === 'number') {
            out.push(String(input));
        } else if (typeof input === 'object') {
            for (const [key, val] of Object.entries(input)) {
                if (val) out.push(key);
            }
        }
    }
    return out.join(' ');
}
