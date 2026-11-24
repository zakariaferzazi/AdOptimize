export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map((cell) =>
    `"${(/^[=+\-@\t\r]/.test(cell) ? "'" : '') + cell.replace(/"/g, '""')}"`,
  ).join(',')).join('\r\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
