import { generateInvoicePdf } from './order-invoice-pdf.service.js'

export function generateOrderPdf(order: Record<string, unknown>): PDFKit.PDFDocument {
  const invoiceData = {
    invoiceNumber: order.invoiceNumber || `INV-${order.orderNumber || order.id}`,
    invoiceDate: order.createdAt || new Date(),
    status: order.paymentStatus === 'paid' ? 'paid' : 'unpaid',
  }
  return generateInvoicePdf(order, invoiceData)
}

