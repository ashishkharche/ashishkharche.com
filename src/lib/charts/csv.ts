/** A parsed CSV file: the header names and one record per row. */
export interface CsvTable {
  columns: string[]
  rows: Record<string, string>[]
}

/**
 * Parses CSV text (RFC 4180: quoted fields, doubled quotes, CRLF or LF line
 * ends). The first row is the header. Blank lines are skipped.
 */
export function parseCsv(text: string): CsvTable {
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      record.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      record.push(field)
      if (record.some((value) => value !== '')) records.push(record)
      record = []
      field = ''
    } else field += char
  }
  record.push(field)
  if (record.some((value) => value !== '')) records.push(record)
  const [columns = [], ...body] = records
  return {
    columns,
    rows: body.map((values) => Object.fromEntries(columns.map((name, i) => [name, values[i] ?? '']))),
  }
}

/** Writes rows back to CSV text, quoting only the fields that need it. */
export function toCsv(columns: string[], rows: Record<string, string | number>[]): string {
  const quote = (value: string | number) => {
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return [columns.map(quote).join(','), ...rows.map((row) => columns.map((c) => quote(row[c] ?? '')).join(','))]
    .join('\n')
    .concat('\n')
}
