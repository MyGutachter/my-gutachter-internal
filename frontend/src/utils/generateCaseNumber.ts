export function generateCaseNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString().slice(2, 8).padStart(6, '0');
    return `MG-${year}-${random}`;
}
