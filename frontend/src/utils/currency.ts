export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ' €';
}

export function formatCurrencyPlain(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount) + ' €';
}
