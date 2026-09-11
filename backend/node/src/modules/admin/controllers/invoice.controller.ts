import { Request, Response } from 'express'
import { z } from 'zod'
import {
  Order,
  OrderItem,
  Customer,
  Invoice,
  Product,
  Coupon,
} from '../../../models/index.js'
import {
  createInvoiceForOrder,
  regenerateInvoiceForOrder,
  syncInvoiceStatus,
  getInvoiceForOrder,
  listInvoices,
  getOrderWithInvoice,
  bulkGenerateInvoices,
} from '../../../services/invoice.service.js'
import { generateInvoicePdf } from '../../../services/order-invoice-pdf.service.js'
import { generateInvoiceExcel } from '../../../services/invoice-excel.service.js'
import { getCompanyInfo } from '../../../services/settings.service.js'
import { sendInvoiceEmail } from '../../../services/email.service.js'
import { writeAuditLog } from '../../../services/audit.service.js'
import { AppError } from '../../../utils/http.js'
import { adminId, idParam } from './utils.js'

export const invoiceListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['paid', 'unpaid', 'cancelled']).optional(),
})

export const createInvoice = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const order = await Order.findByPk(id)
  if (!order) throw new AppError(404, 'Order not found.')

  const invoice = await createInvoiceForOrder(Number(id))
  res.status(201).json({ item: invoice.get({ plain: true }) })
}

export const regenerateInvoice = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const invoice = await regenerateInvoiceForOrder(Number(id))
  await writeAuditLog({
    adminId: adminId(req),
    action: 'INVOICE_REGENERATE',
    entity: 'invoice',
    entityId: Number(id),
    details: { invoiceNumber: invoice.getDataValue('invoiceNumber') },
  })
  res.json({ item: invoice.get({ plain: true }) })
}

export const syncInvoice = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  await syncInvoiceStatus(Number(id))
  const invoice = await getInvoiceForOrder(Number(id))
  res.json({ item: invoice?.get({ plain: true }) || null })
}

export const getInvoice = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const invoice = await getInvoiceForOrder(Number(id))
  if (!invoice) return res.json({ item: null })
  res.json({ item: invoice.get({ plain: true }) })
}

export const getInvoices = async (req: Request, res: Response) => {
  const params = invoiceListSchema.parse(req.query)
  const result = await listInvoices(params)
  res.json(result)
}

export const getInvoicePdf = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const invoice = await Invoice.findByPk(Number(id), {
    include: [{ model: Order, include: [{ model: OrderItem, as: 'items' }, { model: Customer }] }],
  })
  if (!invoice) throw new AppError(404, 'Invoice not found.')

  const order = invoice.getDataValue('Order') as Record<string, unknown> | undefined
  if (!order) throw new AppError(404, 'Associated order not found.')

  const plainOrder = order as Record<string, unknown>
  const plainInvoice = invoice.get({ plain: true }) as Record<string, unknown>

  const items = (plainOrder.items as Array<Record<string, unknown>>) || []
  const productIds = items.map(i => Number(i.productId)).filter(Boolean)
  const products = productIds.length > 0
    ? await Product.findAll({ where: { id: productIds }, attributes: ['id', 'gstRate'] })
    : []
  const itemGstRates: Record<string, number> = {}
  for (const p of products) {
    const pid = p.getDataValue('id') as number
    const rate = p.getDataValue('gstRate') as number | null
    if (rate != null) itemGstRates[String(pid)] = rate
  }
  plainOrder.itemGstRates = itemGstRates

  if (plainOrder.couponCode) {
    const coupon = await Coupon.findOne({ where: { code: plainOrder.couponCode } })
    if (coupon) plainOrder.coupon = coupon.get({ plain: true })
  }

  const company = await getCompanyInfo()
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${String(plainInvoice.invoiceNumber || `invoice-${id}`)}.pdf"`)

  try {
    const doc = generateInvoicePdf(plainOrder, plainInvoice, company)
    doc.pipe(res)
    doc.on('error', () => { if (!res.headersSent) { res.status(500).end('PDF generation error') } })
  } catch (err) {
    if (!res.headersSent) { res.status(500).json({ message: 'PDF generation failed', detail: String(err) }) }
  }
}

export const updateInvoiceStatus = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const { status } = z.object({ status: z.enum(['paid', 'unpaid', 'cancelled']) }).parse(req.body)

  const invoice = await Invoice.findByPk(Number(id))
  if (!invoice) throw new AppError(404, 'Invoice not found.')

  await invoice.update({ status })
  await writeAuditLog({
    adminId: adminId(req),
    action: 'INVOICE_STATUS_UPDATE',
    entity: 'invoice',
    entityId: Number(id),
    details: { status },
  })

  res.json({ item: invoice.get({ plain: true }) })
}

export const bulkCreateInvoices = async (req: Request, res: Response) => {
  const { orderIds } = z.object({ orderIds: z.array(z.number().int().positive()) }).parse(req.body)
  const results = await bulkGenerateInvoices(orderIds)
  res.json({ results })
}

export const exportInvoicesExcel = async (req: Request, res: Response) => {
  const params = invoiceListSchema.extend({ perPage: z.coerce.number().int().positive().default(10000) }).parse(req.query)
  const data = await listInvoices(params)

  const buffer = await generateInvoiceExcel(data.items)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.xlsx"`)
  res.send(buffer)
}

export const sendInvoiceEmailHandler = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)
  const invoice = await Invoice.findByPk(Number(id), { include: [{ model: Order, include: [{ model: OrderItem, as: 'items' }, { model: Customer }] }] })
  if (!invoice) throw new AppError(404, 'Invoice not found.')

  const order = invoice.getDataValue('Order') as Record<string, unknown> | undefined
  if (!order) throw new AppError(404, 'Associated order not found.')

  const customerEmail = ((order.Customer as Record<string, unknown> | undefined)?.email as string) || (order.customerEmail as string) || ''
  if (!customerEmail) throw new AppError(400, 'No customer email found for this order.')

  const plainOrder = order as Record<string, unknown>
  const plainInvoice = invoice.get({ plain: true }) as Record<string, unknown>

  await sendInvoiceEmail(customerEmail, plainInvoice, plainOrder)
  res.json({ ok: true, message: `Invoice emailed to ${customerEmail}` })
}

export const getOrderInvoicePdf = async (req: Request, res: Response) => {
  const { id } = idParam.parse(req.params)

  const result = await getOrderWithInvoice(Number(id))
  if (!result) throw new AppError(404, 'Order not found.')

  const invoice = (result.Invoice || result.invoice) as Record<string, unknown> | undefined
  if (!invoice) throw new AppError(404, 'Invoice not found. Generate one first.')

  const items = (result.items as Array<Record<string, unknown>>) || []
  const productIds = items.map(i => Number(i.productId)).filter(Boolean)
  const products = productIds.length > 0
    ? await Product.findAll({ where: { id: productIds }, attributes: ['id', 'gstRate'] })
    : []
  const itemGstRates: Record<string, number> = {}
  for (const p of products) {
    const pid = p.getDataValue('id') as number
    const rate = p.getDataValue('gstRate') as number | null
    if (rate != null) itemGstRates[String(pid)] = rate
  }
  result.itemGstRates = itemGstRates

  if (result.couponCode) {
    const coupon = await Coupon.findOne({ where: { code: result.couponCode } })
    if (coupon) result.coupon = coupon.get({ plain: true })
  }

  const company = await getCompanyInfo()

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${String(invoice.invoiceNumber || `invoice-${id}`)}.pdf"`)

  try {
    const doc = generateInvoicePdf(result, invoice, company)
    doc.pipe(res)
    doc.on('error', () => { if (!res.headersSent) { res.status(500).end('PDF generation error') } })
  } catch (err) {
    if (!res.headersSent) { res.status(500).json({ message: 'PDF generation failed', detail: String(err) }) }
  }
}
