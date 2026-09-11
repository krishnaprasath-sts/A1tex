import { Op } from 'sequelize'
import { Invoice, Order, OrderItem, Customer, Coupon } from '../models/index.js'
import { getCompanyInfo, invalidateCompanyCache } from './settings.service.js'
import { sendInvoiceEmail } from './email.service.js'

export async function generateInvoiceNumber(): Promise<string> {
  const company = await getCompanyInfo()
  const prefix = company.invoicePrefix || 'INV'
  const year = new Date().getFullYear()
  const pattern = `${prefix}-${year}-`
  const matching = await Invoice.findAll({
    where: { invoiceNumber: { [Op.like]: `${pattern}%` } },
    attributes: ['invoiceNumber'],
  })
  let maxSeq = 0
  for (const inv of matching) {
    const parts = (inv.getDataValue('invoiceNumber') as string).split('-')
    const num = parseInt(parts[parts.length - 1] || '0', 10)
    if (!isNaN(num) && num > maxSeq) maxSeq = num
  }
  return `${pattern}${String(maxSeq + 1).padStart(5, '0')}`
}

export async function createInvoiceForOrder(orderId: number, options?: { sendEmail?: boolean }) {
  const existing = await Invoice.findOne({ where: { orderId } })
  if (existing) return existing

  const order = await Order.findByPk(orderId, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
    ],
  })
  if (!order) throw new Error('Order not found')

  const invoiceNumber = await generateInvoiceNumber()

  const invoice = await Invoice.create({
    orderId,
    invoiceNumber,
    invoiceDate: new Date(),
    status: order.getDataValue('paymentStatus') === 'paid' ? 'paid' : 'unpaid',
  })

  const plain = order.get({ plain: true }) as Record<string, unknown>

  if (plain.couponCode) {
    const coupon = await Coupon.findOne({ where: { code: plain.couponCode } })
    if (coupon) plain.coupon = coupon.get({ plain: true })
  }

  if (options?.sendEmail !== false) {
    const customerEmail = (plain.Customer as Record<string, unknown> | undefined)?.email as string
      || plain.customerEmail as string
    if (customerEmail) {
      sendInvoiceEmail(customerEmail, invoice.get({ plain: true }) as Record<string, unknown>, plain).catch(() => {
        // email failure should not block invoice creation
      })
    }
  }

  return invoice
}

export async function regenerateInvoiceForOrder(orderId: number) {
  const invoice = await Invoice.findOne({ where: { orderId } })
  if (!invoice) throw new Error('Invoice not found. Generate one first.')

  const order = await Order.findByPk(orderId, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
    ],
  })
  if (!order) throw new Error('Order not found')

  const newInvoiceNumber = await generateInvoiceNumber()

  await invoice.update({
    invoiceNumber: newInvoiceNumber,
    invoiceDate: new Date(),
    status: order.getDataValue('paymentStatus') === 'paid' ? 'paid' : 'unpaid',
  })

  return invoice.reload()
}

export async function syncInvoiceStatus(orderId: number) {
  const invoice = await Invoice.findOne({ where: { orderId } })
  if (!invoice) return

  const order = await Order.findByPk(orderId, { attributes: ['paymentStatus', 'status'] })
  if (!order) return

  const newStatus = order.getDataValue('status') === 'cancelled'
    ? 'cancelled'
    : order.getDataValue('paymentStatus') === 'paid'
      ? 'paid'
      : 'unpaid'

  if (invoice.getDataValue('status') !== newStatus) {
    await invoice.update({ status: newStatus })
  }
}

export async function getInvoiceForOrder(orderId: number) {
  return Invoice.findOne({ where: { orderId } })
}

export async function listInvoices(params: {
  page: number
  perPage: number
  search?: string
  status?: string
}) {
  const { page, perPage, search, status } = params
  const where: any = {}
  if (status) where.status = status

  if (search) {
    where[Op.or as any] = [
      { invoiceNumber: { [Op.like]: `%${search}%` } },
    ]
  }

  const [rows, total] = await Promise.all([
    Invoice.findAll({
      where,
      include: [
        { model: Order, attributes: ['orderNumber', 'customerEmail', 'grandTotal', 'status', 'paymentStatus', 'couponCode', 'discount'] },
      ],
      order: [['id', 'DESC']],
      offset: (page - 1) * perPage,
      limit: perPage,
    }),
    Invoice.count({ where }),
  ])

  return {
    items: rows.map(r => r.get({ plain: true })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
}

export async function bulkGenerateInvoices(orderIds: number[]) {
  const results: Array<{ orderId: number; invoiceNumber: string | null; error?: string }> = []
  for (const orderId of orderIds) {
    try {
      const invoice = await createInvoiceForOrder(orderId, { sendEmail: false })
      results.push({ orderId, invoiceNumber: invoice.getDataValue('invoiceNumber') as string })
    } catch (err: any) {
      results.push({ orderId, invoiceNumber: null, error: err.message })
    }
  }
  return results
}

export async function getOrderWithInvoice(orderId: number) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer },
      { model: Invoice },
    ],
  })
  if (!order) return null
  return order.get({ plain: true }) as Record<string, unknown>
}
