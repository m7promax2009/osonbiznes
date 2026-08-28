/**
 * Universal CSV/Excel exporter with UTF-8 BOM
 * Supports Uzbek Latin & Cyrillic characters without mojibake in Microsoft Excel
 */
export function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) {
    alert("Eksport qilish uchun ma'lumot mavjud emas")
    return
  }

  const headerKeys = Object.keys(headers)
  const headerLabels = Object.values(headers)

  const csvRows = []
  // Header row
  csvRows.push(headerLabels.map(label => `"${String(label).replace(/"/g, '""')}"`).join(','))

  // Data rows
  for (const row of rows) {
    const values = headerKeys.map(key => {
      let val = row[key]
      if (val === null || val === undefined) val = ''
      else if (val instanceof Date) val = val.toLocaleDateString('uz-UZ')
      else if (typeof val === 'object') val = JSON.stringify(val)
      return `"${String(val).replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 properly
  const csvContent = '\uFEFF' + csvRows.join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
