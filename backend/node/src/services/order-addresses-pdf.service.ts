import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BUNDLED_FONT_REGULAR = path.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSans-Regular.ttf')
const BUNDLED_FONT_BOLD = path.join(__dirname, '..', '..', 'assets', 'fonts', 'NotoSans-Bold.ttf')

function registerFont(doc: PDFKit.PDFDocument) {
  if (fs.existsSync(BUNDLED_FONT_REGULAR) && fs.existsSync(BUNDLED_FONT_BOLD)) {
    doc.registerFont('Unicode-Regular', BUNDLED_FONT_REGULAR)
    doc.registerFont('Unicode-Bold', BUNDLED_FONT_BOLD)
    return { regular: 'Unicode-Regular', bold: 'Unicode-Bold' }
  }
  console.error('[Addresses PDF] Bundled Unicode font not found')
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' }
}

export function generateAddressesPdf(orders: Array<Record<string, unknown>>, title = 'Confirmed Orders - Customer Addresses'): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 36, bottom: 36, left: 40, right: 40 },
    info: {
      Title: title,
      Author: 'A1 TEX',
    },
  })

  const { regular, bold } = registerFont(doc)
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const leftCol = doc.page.margins.left
  let y = doc.page.margins.top

  doc.fontSize(16).font(bold).fillColor('#8B1A2B')
  doc.text(title, leftCol, y, { width: pageWidth, align: 'center' })
  y += 28

  doc.fontSize(9).font(regular).fillColor('#666')
  doc.text(`Total: ${orders.length} orders`, leftCol, y, { width: pageWidth, align: 'center' })
  y += 10
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, leftCol, y, { width: pageWidth, align: 'center' })
  y += 20

  doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#ddd').stroke()
  y += 16

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const shippingAddress = order.shippingAddress as Record<string, unknown> | null | undefined
    const customer = order.Customer as Record<string, unknown> | undefined
    const customerPhone = String(shippingAddress?.phone || customer?.mobile || '')

    if (y > doc.page.height - doc.page.margins.bottom - 80) {
      doc.addPage()
      y = doc.page.margins.top
    }

    const serial = i + 1

    doc.fontSize(11).font(bold).fillColor('#333')
    doc.text(`${serial}.  ${order.orderNumber || `Order #${order.id}`}`, leftCol, y)
    y += 18

    doc.fontSize(10).font(regular).fillColor('#444')

    if (shippingAddress) {
      const name = [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' ') || String(customer?.name || '') || '–'
      doc.text(name, leftCol, y)
      y += 15

      if (shippingAddress.address) {
        doc.text(String(shippingAddress.address), leftCol, y)
        y += 15
      }

      const cityState = [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ')
      const pincode = shippingAddress.pincode ? ` — ${shippingAddress.pincode}` : ''
      doc.text(`${cityState}${pincode}`, leftCol, y)
      y += 18

      if (customerPhone) {
        doc.text(`Phone: ${customerPhone}`, leftCol, y)
        y += 18
      }
    } else if (customer) {
      doc.text(String(customer.name || '–'), leftCol, y)
      y += 15

      if (customer.mobile) {
        doc.text(`Phone: ${String(customer.mobile)}`, leftCol, y)
        y += 18
      }
    } else {
      doc.text('No shipping address', leftCol, y)
      y += 18
    }

    if (order.customerEmail || customer?.email) {
      doc.text(`Email: ${String(customer?.email || order.customerEmail)}`, leftCol, y)
      y += 18
    }

    doc.moveTo(leftCol, y).lineTo(leftCol + pageWidth, y).strokeColor('#eee').stroke()
    y += 20
  }

  doc.end()
  return doc
}
