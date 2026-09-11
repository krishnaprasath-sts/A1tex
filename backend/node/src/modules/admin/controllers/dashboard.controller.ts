import { Request, Response } from 'express'
import { Op } from 'sequelize'
import { sequelize } from '../../../database/sequelize.js'
import { AppError } from '../../../utils/http.js'
import {
  Product,
  ProductImage,
  Category,
  Customer,
  Order,
  OrderItem,
  Banner,
} from '../../../models/index.js'

// The abandoned-checkout checkpoint: an order row created before the customer
// ever paid. Matches resource.controller.ts's revenue filter.
const ABANDONED_STATUS = 'pending_payment'

// Left behind by the pre-order feature, which shipped 2026-06-26 and was
// removed on 2026-07-07 in favour of stock-notifications ("notify me when
// back in stock"). Nothing writes this status any more and no pipeline stage
// or transition rule accepts it, so the surviving rows are unreachable test
// data — deliberately not surfaced anywhere in the dashboard. This entry is
// the safety net that keeps them out of revenue; do not remove it while any
// such row can still exist.
const PRE_ORDER_STATUS = 'pre_order'

// Orders in these statuses don't represent completed/valid sales revenue.
const EXCLUDED_SALES_STATUSES = [
  ABANDONED_STATUS,
  PRE_ORDER_STATUS,
  'cancelled',
  'rto',
  'returned',
]

// Orders that are valid but still need the admin to move them along. COD
// orders legitimately sit here unpaid, so payment_status is deliberately not
// part of this test.
const IN_PROGRESS_STATUSES = ['pending', 'confirmed', 'packing', 'dispatched', 'out_for_delivery']

/* ─── Store-timezone date helpers ─────────────────────────────────────────
 * Day boundaries must follow the STORE's timezone, not the server's. A box
 * running in UTC would otherwise roll "today" over at 05:30 IST and report
 * the wrong day's sales. Override with STORE_TIMEZONE when needed.
 */
const STORE_TIMEZONE = process.env.STORE_TIMEZONE || 'Asia/Kolkata'

// Milliseconds that must be added to a UTC instant to read as store-local time.
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const map: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = Number(part.value)
  }
  // Intl can emit hour "24" for midnight in some engines.
  const hour = map.hour === 24 ? 0 : map.hour
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
  return asUtc - date.getTime() + (date.getMilliseconds())
}

// The UTC instant at which the given store-local calendar day begins. Resolved
// twice so a DST shift between the guess and the real offset still lands right.
function zonedStartOfDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
  const firstOffset = tzOffsetMs(guess, STORE_TIMEZONE)
  const candidate = new Date(guess.getTime() - firstOffset)
  const secondOffset = tzOffsetMs(candidate, STORE_TIMEZONE)
  return secondOffset === firstOffset ? candidate : new Date(guess.getTime() - secondOffset)
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  return shifted.toISOString().slice(0, 10)
}

// Today's calendar date (YYYY-MM-DD) as the store sees it.
function storeToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function storeStartOfMonth(): Date {
  return zonedStartOfDay(`${storeToday().slice(0, 7)}-01`)
}

// Half-open [start, end) instant range covering the given inclusive day range.
function rangeToInstants(from: string, to: string): { start: Date; end: Date } {
  return { start: zonedStartOfDay(from), end: zonedStartOfDay(addDays(to, 1)) }
}

/* ─── Store Overview ──────────────────────────────────────────────────── */

// Products with variants keep their real stock on product_variants, so a
// product's true availability is the SUM across its variants; products with no
// variant rows fall back to their own stock_qty. Done as one raw query because
// the per-product aggregate has to be collapsed again into two scalar counts.
async function getStockCounts(): Promise<{ outOfStock: number; lowStock: number }> {
  const [rows] = await sequelize.query(`
    SELECT
      COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS outOfStock,
      COALESCE(SUM(CASE WHEN stock > 0 AND stock <= threshold THEN 1 ELSE 0 END), 0) AS lowStock
    FROM (
      SELECT
        p.id,
        COALESCE(SUM(v.stock_qty), p.stock_qty) AS stock,
        p.low_stock_threshold AS threshold
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      WHERE p.status = 'active' AND p.deleted_at IS NULL
      GROUP BY p.id, p.stock_qty, p.low_stock_threshold
    ) t
  `)
  const row = (rows as Array<{ outOfStock: number | string; lowStock: number | string }>)[0]
  return {
    outOfStock: Number(row?.outOfStock) || 0,
    lowStock: Number(row?.lowStock) || 0,
  }
}

export const getDashboardStats = async (_req: Request, res: Response) => {
  const startOfMonth = storeStartOfMonth()

  const [
    activeProducts,
    stockCounts,
    parentCategories,
    subCategories,
    hiddenCategories,
    activeCustomers,
    verifiedCustomers,
    newCustomers,
    validOrders,
    inProgressOrders,
    deliveredOrders,
    abandonedOrders,
    activeBanners,
    inactiveBanners,
  ] = await Promise.all([
    Product.count({ where: { status: 'active' } }),
    getStockCounts(),
    Category.count({ where: { active: true, parentId: null } }),
    Category.count({ where: { active: true, parentId: { [Op.ne]: null } } }),
    Category.count({ where: { active: false } }),
    Customer.count({ where: { status: 'active' } }),
    Customer.count({ where: { status: 'active', emailVerified: true } }),
    Customer.count({ where: { status: 'active', createdAt: { [Op.gte]: startOfMonth } } }),
    Order.count({ where: { status: { [Op.notIn]: EXCLUDED_SALES_STATUSES } } }),
    Order.count({ where: { status: { [Op.in]: IN_PROGRESS_STATUSES } } }),
    Order.count({ where: { status: 'delivered' } }),
    Order.count({ where: { status: ABANDONED_STATUS } }),
    Banner.count({ where: { active: true } }),
    Banner.count({ where: { active: false } }),
  ])

  res.json({
    stats: [
      {
        key: 'products',
        label: 'Products',
        value: activeProducts,
        hint: 'Live on the storefront',
        meta: [
          { key: 'outOfStock', label: 'Out of stock', value: stockCounts.outOfStock },
          { key: 'lowStock', label: 'Low stock', value: stockCounts.lowStock },
        ],
      },
      {
        key: 'categories',
        label: 'Categories',
        value: parentCategories + subCategories,
        hint: 'Active, all levels',
        meta: [
          { key: 'parents', label: 'Top level', value: parentCategories },
          { key: 'subcategories', label: 'Sub', value: subCategories },
          { key: 'hidden', label: 'Hidden', value: hiddenCategories },
        ],
      },
      {
        key: 'customers',
        label: 'Customers',
        value: activeCustomers,
        hint: 'Active accounts',
        meta: [
          { key: 'verified', label: 'Verified', value: verifiedCustomers },
          { key: 'newThisMonth', label: 'New this month', value: newCustomers },
        ],
      },
      {
        key: 'orders',
        label: 'Orders',
        value: validOrders,
        hint: 'Excludes abandoned & cancelled',
        meta: [
          { key: 'inProgress', label: 'In progress', value: inProgressOrders },
          { key: 'delivered', label: 'Delivered', value: deliveredOrders },
          { key: 'abandoned', label: 'Abandoned', value: abandonedOrders },
        ],
      },
      {
        key: 'banners',
        label: 'Banners',
        value: activeBanners,
        hint: 'Currently displayed',
        meta: [{ key: 'inactive', label: 'Hidden', value: inactiveBanners }],
      },
    ],
    generatedAt: new Date().toISOString(),
    timezone: STORE_TIMEZONE,
  })
}

/* ─── Sales ───────────────────────────────────────────────────────────── */

async function sumSales(where: Record<string, unknown>) {
  const [sumResult, count] = await Promise.all([
    Order.sum('grandTotal', {
      where: { ...where, status: { [Op.notIn]: EXCLUDED_SALES_STATUSES } },
    }),
    Order.count({
      where: { ...where, status: { [Op.notIn]: EXCLUDED_SALES_STATUSES } },
    }),
  ])
  return { amount: Number(sumResult) || 0, count }
}

// Expects a plain YYYY-MM-DD string (what <input type="date"> sends) so we don't
// misparse locale-ambiguous formats like "07/25/2026" as a valid date.
function parseDateParam(value: unknown, paramName: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, `Invalid "${paramName}" date. Expected format YYYY-MM-DD.`)
  }
  const [y, m, d] = value.split('-').map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    throw new AppError(400, `Invalid "${paramName}" date. Expected format YYYY-MM-DD.`)
  }
  return value
}

// Validates & resolves the optional ?from=&to= query params shared by the
// sales endpoints. Returns null when neither is supplied (caller falls back
// to its own default, e.g. "today"). Throws AppError on any invalid input.
// Both values are YYYY-MM-DD, so plain string comparison orders them correctly.
function resolveDateRangeParams(req: Request): { from: string; to: string } | null {
  const from = parseDateParam(req.query.from, 'from')
  const to = parseDateParam(req.query.to, 'to')

  if ((from && !to) || (!from && to)) {
    throw new AppError(400, 'Both "from" and "to" dates are required to filter by range.')
  }
  if (!from || !to) return null

  if (from > to) {
    throw new AppError(400, '"from" date must be on or before "to" date.')
  }
  const today = storeToday()
  if (from > today || to > today) {
    throw new AppError(400, 'Date range cannot be in the future.')
  }
  return { from, to }
}

export const getSalesStats = async (req: Request, res: Response) => {
  const today = storeToday()
  const { start: startOfToday, end: startOfTomorrow } = rangeToInstants(today, today)

  const resolved = resolveDateRangeParams(req)

  const [total, todayTotals] = await Promise.all([
    sumSales({}),
    sumSales({ createdAt: { [Op.gte]: startOfToday, [Op.lt]: startOfTomorrow } }),
  ])

  let range: { amount: number; count: number } | null = null
  if (resolved) {
    const { start, end } = rangeToInstants(resolved.from, resolved.to)
    range = await sumSales({ createdAt: { [Op.gte]: start, [Op.lt]: end } })
  }

  res.json({
    totalSales: total.amount,
    todaySales: todayTotals.amount,
    rangeSales: range ? range.amount : null,
    orderCount: {
      total: total.count,
      today: todayTotals.count,
      range: range ? range.count : null,
    },
  })
}

// Per-product breakdown (quantity + revenue) for a date/range, plus order
// counts. Defaults to "today" when no from/to params are supplied, so the
// panel can auto-fetch as soon as the admin opens the dashboard.
export const getSalesBreakdown = async (req: Request, res: Response) => {
  const resolved = resolveDateRangeParams(req)
  const today = storeToday()
  const from = resolved ? resolved.from : today
  const to = resolved ? resolved.to : today
  const { start, end } = rangeToInstants(from, to)

  const orderWhere = {
    createdAt: { [Op.gte]: start, [Op.lt]: end },
    status: { [Op.notIn]: EXCLUDED_SALES_STATUSES },
  }

  const [orderCount, totalOrdersAllTime, productRows] = await Promise.all([
    Order.count({ where: orderWhere }),
    Order.count({ where: { status: { [Op.notIn]: EXCLUDED_SALES_STATUSES } } }),
    OrderItem.findAll({
      attributes: [
        'productId',
        'name',
        [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('OrderItem.total')), 'totalRevenue'],
      ],
      include: [{ model: Order, attributes: [], where: orderWhere, required: true }],
      group: ['productId', 'name'],
      order: [[sequelize.literal('totalRevenue'), 'DESC']],
      raw: true,
    }) as unknown as Promise<Array<{ productId: number | null; name: string; totalQuantity: string; totalRevenue: string }>>,
  ])

  res.json({
    date: { from, to },
    orderCount,
    totalOrdersAllTime,
    products: productRows.map((row) => ({
      productId: row.productId,
      name: row.name,
      quantity: Number(row.totalQuantity) || 0,
      revenue: Number(row.totalRevenue) || 0,
    })),
  })
}

const TOP_PRODUCTS_DEFAULT_LIMIT = 5
const TOP_PRODUCTS_MAX_LIMIT = 50

function parseLimitParam(value: unknown): number {
  if (value === undefined || value === null || value === '') return TOP_PRODUCTS_DEFAULT_LIMIT
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, `Invalid "limit". Expected an integer between 1 and ${TOP_PRODUCTS_MAX_LIMIT}.`)
  }
  return Math.min(n, TOP_PRODUCTS_MAX_LIMIT)
}

// Best sellers ranked by units sold, with the product's current name and
// image. Unlike the breakdown endpoint this defaults to ALL TIME when no
// from/to is supplied — a "today only" top-seller list would be empty most
// of the morning and tells the admin nothing.
export const getTopSellingProducts = async (req: Request, res: Response) => {
  const resolved = resolveDateRangeParams(req)
  const limit = parseLimitParam(req.query.limit)

  const orderWhere: Record<string, unknown> = {
    status: { [Op.notIn]: EXCLUDED_SALES_STATUSES },
  }
  let range: { from: string; to: string } | null = null

  if (resolved) {
    const { start, end } = rangeToInstants(resolved.from, resolved.to)
    orderWhere.createdAt = { [Op.gte]: start, [Op.lt]: end }
    range = { from: resolved.from, to: resolved.to }
  }

  // Grouped by productId ALONE (not by name like the breakdown endpoint does):
  // OrderItem.name is a snapshot taken at checkout, so a renamed product would
  // otherwise split into two rows and under-count its real sales. The snapshot
  // name/image are kept via MAX() purely as a fallback for products that no
  // longer exist. Rows with a null productId are skipped — in MySQL they would
  // all collapse into a single meaningless "product".
  const rows = (await OrderItem.findAll({
    attributes: [
      'productId',
      [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'totalQuantity'],
      [sequelize.fn('SUM', sequelize.col('OrderItem.total')), 'totalRevenue'],
      [sequelize.fn('MAX', sequelize.col('OrderItem.name')), 'snapshotName'],
      [sequelize.fn('MAX', sequelize.col('OrderItem.image_url')), 'snapshotImageUrl'],
    ],
    where: { productId: { [Op.ne]: null } },
    include: [{ model: Order, attributes: [], where: orderWhere, required: true }],
    // sequelize.col(), not the 'productId' attribute name: a table-qualified
    // string in `group` is emitted verbatim and MySQL rejects `OrderItem`.`productId`.
    group: [sequelize.col('OrderItem.product_id')],
    order: [
      [sequelize.literal('totalQuantity'), 'DESC'],
      [sequelize.literal('totalRevenue'), 'DESC'],
    ],
    limit,
    subQuery: false,
    raw: true,
  })) as unknown as Array<{
    productId: number
    totalQuantity: string
    totalRevenue: string
    snapshotName: string | null
    snapshotImageUrl: string | null
  }>

  const productIds = rows.map((row) => Number(row.productId))

  // Hydrated separately instead of joined into the aggregate above: joining
  // product_images into a GROUP BY query would multiply the summed rows.
  // paranoid: false so archived/soft-deleted products still resolve a name.
  const [products, images] = productIds.length
    ? await Promise.all([
        Product.findAll({
          attributes: ['id', 'name', 'slug', 'imageUrl'],
          where: { id: { [Op.in]: productIds } },
          paranoid: false,
          raw: true,
        }) as unknown as Promise<Array<{ id: number; name: string; slug: string | null; imageUrl: string | null }>>,
        ProductImage.findAll({
          attributes: ['productId', 'imageUrl'],
          where: { productId: { [Op.in]: productIds } },
          order: [['sortOrder', 'ASC'], ['id', 'ASC']],
          raw: true,
        }) as unknown as Promise<Array<{ productId: number; imageUrl: string }>>,
      ])
    : [[], []]

  const productById = new Map(products.map((p) => [Number(p.id), p]))
  const firstImageByProduct = new Map<number, string>()
  for (const img of images) {
    const key = Number(img.productId)
    if (!firstImageByProduct.has(key) && img.imageUrl) {
      firstImageByProduct.set(key, img.imageUrl)
    }
  }

  res.json({
    range,
    products: rows.map((row) => {
      const id = Number(row.productId)
      const product = productById.get(id)
      return {
        productId: id,
        name: product?.name || row.snapshotName || 'Unknown product',
        slug: product?.slug ?? null,
        // Cover image first, then the gallery's first image (variant-only
        // products often have no cover), then the order-time snapshot.
        imageUrl: product?.imageUrl || firstImageByProduct.get(id) || row.snapshotImageUrl || null,
        quantity: Number(row.totalQuantity) || 0,
        revenue: Number(row.totalRevenue) || 0,
      }
    }),
  })
}
