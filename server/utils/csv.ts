/**
 * Serialises rows to RFC 4180 CSV. Cells that start with a formula character are
 * prefixed with a quote so spreadsheets don't execute them.
 */
export function toCsv(header: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const cell = (value: string | number | null | undefined): string => {
    let s = value === null || value === undefined ? '' : String(value)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
