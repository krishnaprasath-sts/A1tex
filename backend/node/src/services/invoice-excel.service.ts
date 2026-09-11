import ExcelJS from 'exceljs'
import { getCompanyInfo } from './settings.service.js'

export async function generateInvoiceExcel(invoices: Record<string, unknown>[]): Promise<Buffer> {
  const company = await getCompanyInfo()

  const workbook = new ExcelJS.Workbook()
  workbook.creator = company.name
  workbook.created = new Date()

  const ws = workbook.addWorksheet('Invoices', {
    properties: { tabColor: { argb: '8B1A2B' } },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  })

  ws.columns = [
    { header: '#', key: 'id', width: 6 },
    { header: 'Invoice No', key: 'invoiceNumber', width: 22 },
    { header: 'Invoice Date', key: 'invoiceDate', width: 16 },
    { header: 'Order No', key: 'orderNumber', width: 22 },
    { header: 'Customer', key: 'customerEmail', width: 30 },
    { header: 'Order Amount', key: 'grandTotal', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '8B1A2B' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i]
    const order = (inv.Order || {}) as Record<string, unknown>
    const row = ws.addRow({
      id: i + 1,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate ? String(inv.invoiceDate).slice(0, 10) : '',
      orderNumber: order.orderNumber || '',
      customerEmail: order.customerEmail || '',
      grandTotal: order.grandTotal ? Number(order.grandTotal).toFixed(2) : '0.00',
      status: inv.status,
    })

    const statusColor = inv.status === 'paid' ? '228B22' : inv.status === 'cancelled' ? 'DC143C' : 'DAA520'
    row.getCell('status').font = { color: { argb: statusColor }, bold: true }

    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5' } }
      })
    }
  }

  ws.autoFilter = { from: 'A1', to: `G${invoices.length + 1}` }

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}
