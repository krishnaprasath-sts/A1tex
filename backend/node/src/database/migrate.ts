import { DataTypes, QueryInterface } from 'sequelize'
import { ensureDatabaseExists, sequelize } from './sequelize.js'

const timestamps = {
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}

async function tableExists(queryInterface: QueryInterface, tableName: string) {
  const tables = await queryInterface.showAllTables() as Array<string | { tableName?: string }>
  return tables.map(table => (typeof table === 'string' ? table : table.tableName ?? '')).includes(tableName)
}

async function createTableIfMissing(queryInterface: QueryInterface, tableName: string, definition: Record<string, any>) {
  if (await tableExists(queryInterface, tableName)) return
  await queryInterface.createTable(tableName, definition)
  console.log(`Created table: ${tableName}`)
}

const safeAddColumn = async (table: string, col: string, def: any) => {
  const qi = sequelize.getQueryInterface()
  try { await qi.addColumn(table, col, def) } catch { /* column already exists */ }
}

const safeAddIndex = async (table: string, indexName: string, fields: string[], opts?: any) => {
  const qi = sequelize.getQueryInterface()
  try { await qi.addIndex(table, fields, { name: indexName, ...opts }) } catch { /* index already exists */ }
}

// ─── Core migration function (runs every server start) ─────────────
export async function runMigrations() {
  const qi = sequelize.getQueryInterface()
  await sequelize.authenticate()

  // ── Tables ────────────────────────────────────────────────────
  await createTableIfMissing(qi, 'admins', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(140), allowNull: false },
    email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('super_admin', 'manager'), allowNull: false, defaultValue: 'super_admin' },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'customers', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(140), allowNull: false },
    email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
    mobile: { type: DataTypes.STRING(32), allowNull: true, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    avatar_url: { type: DataTypes.STRING(255), allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    login_attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    locked_until: { type: DataTypes.DATE, allowNull: true },
    verification_token: { type: DataTypes.STRING(255), allowNull: true },
    verification_token_expires_at: { type: DataTypes.DATE, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'announcement_messages', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    text: { type: DataTypes.STRING(180), allowNull: false },
    link_url: { type: DataTypes.STRING(255), allowNull: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'marquee_messages', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    text: { type: DataTypes.STRING(255), allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'banners', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    placement: { type: DataTypes.STRING(80), allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: true },
    subtitle: { type: DataTypes.STRING(255), allowNull: true },
    image_url: { type: DataTypes.STRING(255), allowNull: false },
    cta_label: { type: DataTypes.STRING(80), allowNull: true },
    cta_url: { type: DataTypes.STRING(255), allowNull: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'categories', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
      onDelete: 'SET NULL'
    },
    section: { type: DataTypes.STRING(80), allowNull: false },
    name: { type: DataTypes.STRING(140), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    href: { type: DataTypes.STRING(255), allowNull: false },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    tag: { type: DataTypes.STRING(80), allowNull: true },
    nav_visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    home_visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'contact_enquiries', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(140), allowNull: false },
    email: { type: DataTypes.STRING(190), allowNull: false },
    phonenumber: { type: DataTypes.STRING(32), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'products', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(80), allowNull: true, unique: true },
    name: { type: DataTypes.STRING(180), allowNull: false },
    slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
    type: { type: DataTypes.STRING(180), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(140), allowNull: true },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
      onDelete: 'SET NULL'
    },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    original_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    stock_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    low_stock_threshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10 },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    color: { type: DataTypes.STRING(140), allowNull: true },
    gender: { type: DataTypes.STRING(20), allowNull: true },
    age_group: { type: DataTypes.STRING(20), allowNull: true },
    has_variants: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.ENUM('draft', 'active', 'archived'), allowNull: false, defaultValue: 'active' },
    featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_new: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_best_seller: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    gst_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 5.00 },
    meta_title: { type: DataTypes.STRING(255), allowNull: true },
    meta_description: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'product_images', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    image_url: { type: DataTypes.STRING(255), allowNull: false },
    alt_text: { type: DataTypes.STRING(180), allowNull: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'product_variants', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    variant_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'color' },
    label: { type: DataTypes.STRING(120), allowNull: false },
    color_name: { type: DataTypes.STRING(80), allowNull: true },
    color_hex: { type: DataTypes.STRING(9), allowNull: true },
    size: { type: DataTypes.STRING(40), allowNull: true },
    sku: { type: DataTypes.STRING(120), allowNull: true, unique: true },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    original_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    stock_qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    low_stock_threshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10 },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    size_stock: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'variant_images', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    variant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'CASCADE'
    },
    image_url: { type: DataTypes.STRING(255), allowNull: false },
    alt_text: { type: DataTypes.STRING(180), allowNull: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'coupons', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    type: { type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping'), allowNull: false },
    value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    min_cart_value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    max_discount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    usage_limit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    per_user_limit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    used_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    starts_at: { type: DataTypes.DATE, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'orders', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    order_number: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'customers', key: 'id' },
      onDelete: 'SET NULL'
    },
    customer_name: { type: DataTypes.STRING(140), allowNull: true },
    customer_email: { type: DataTypes.STRING(190), allowNull: true },
    customer_mobile: { type: DataTypes.STRING(20), allowNull: true },
    status: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'pending' },
    payment_status: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'pending' },
    payment_method: { type: DataTypes.STRING(32), allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    shipping_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    discount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    gst_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    taxable_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    grand_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    shipping_address: { type: DataTypes.JSON, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    coupon_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'coupons', key: 'id' },
      onDelete: 'SET NULL'
    },
    coupon_code: { type: DataTypes.STRING(50), allowNull: true },
    delivery_agent_name: { type: DataTypes.STRING(120), allowNull: true },
    delivery_agent_phone: { type: DataTypes.STRING(20), allowNull: true },
    tracking_number: { type: DataTypes.STRING(80), allowNull: true },
    tracking_url: { type: DataTypes.STRING(512), allowNull: true },
    shipping_provider: { type: DataTypes.STRING(80), allowNull: true },
    dispatched_at: { type: DataTypes.DATE, allowNull: true },
    delivered_at: { type: DataTypes.DATE, allowNull: true },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    razorpay_payment_id: { type: DataTypes.STRING(120), allowNull: true },
    razorpay_order_id: { type: DataTypes.STRING(120), allowNull: true },
    processed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    assigned_admin_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'admins', key: 'id' },
      onDelete: 'SET NULL',
    },
    assigned_at: { type: DataTypes.DATE, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'order_items', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'products', key: 'id' },
      onDelete: 'SET NULL'
    },
    variant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'SET NULL'
    },
    name: { type: DataTypes.STRING(180), allowNull: false },
    sku: { type: DataTypes.STRING(80), allowNull: true },
    variant_label: { type: DataTypes.STRING(120), allowNull: true },
    color: { type: DataTypes.STRING(80), allowNull: true },
    size: { type: DataTypes.STRING(40), allowNull: true },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'invoices', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    invoice_number: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    invoice_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('paid', 'unpaid', 'cancelled'), allowNull: false, defaultValue: 'unpaid' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  })

  await createTableIfMissing(qi, 'settings', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    value: { type: DataTypes.JSON, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'audit_logs', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    admin_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'admins', key: 'id' },
      onDelete: 'SET NULL'
    },
    action: { type: DataTypes.STRING(120), allowNull: false },
    entity: { type: DataTypes.STRING(120), allowNull: false },
    entity_id: { type: DataTypes.STRING(80), allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  })

  await createTableIfMissing(qi, 'password_resets', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onDelete: 'CASCADE'
    },
    token_hash: { type: DataTypes.STRING(255), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'customer_addresses', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onDelete: 'CASCADE'
    },
    first_name: { type: DataTypes.STRING(140), allowNull: false },
    last_name: { type: DataTypes.STRING(140), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: false },
    city: { type: DataTypes.STRING(100), allowNull: false },
    state: { type: DataTypes.STRING(100), allowNull: false },
    pincode: { type: DataTypes.STRING(20), allowNull: false },
    phone: { type: DataTypes.STRING(32), allowNull: false },
    is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'reviews', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onDelete: 'CASCADE'
    },
    rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    moderated_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'admins', key: 'id' },
      onDelete: 'SET NULL'
    },
    moderated_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'review_images', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    review_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'reviews', key: 'id' },
      onDelete: 'CASCADE'
    },
    image_url: { type: DataTypes.STRING(255), allowNull: false },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'coupon_usages', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    coupon_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'coupons', key: 'id' },
      onDelete: 'CASCADE'
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'customers', key: 'id' },
      onDelete: 'SET NULL'
    },
    customer_email: { type: DataTypes.STRING(190), allowNull: true },
    discount_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    used_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  })

  await createTableIfMissing(qi, 'coupon_customers', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    coupon_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'coupons', key: 'id' },
      onDelete: 'CASCADE'
    },
    customer_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onDelete: 'CASCADE'
    },
  })

  await createTableIfMissing(qi, 'cart_items', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onDelete: 'CASCADE'
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    variant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'CASCADE'
    },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    color: { type: DataTypes.STRING(80), allowNull: true },
    size: { type: DataTypes.STRING(40), allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'wishlist_items', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onDelete: 'CASCADE'
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE'
    },
    variant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'CASCADE'
    },
    color: { type: DataTypes.STRING(80), allowNull: true },
    size: { type: DataTypes.STRING(40), allowNull: true },
    ...timestamps,
  })



  // ─── New tables ────────────────────────────────────────────────

  await createTableIfMissing(qi, 'order_status_history', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    from_status: { type: DataTypes.STRING(60), allowNull: true },
    to_status: { type: DataTypes.STRING(60), allowNull: false },
    changed_by: { type: DataTypes.INTEGER, allowNull: true },
    changed_by_type: { type: DataTypes.ENUM('admin', 'customer', 'system', 'webhook'), allowNull: false, defaultValue: 'system' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  })

  await createTableIfMissing(qi, 'refunds', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'processed', 'failed'), allowNull: false, defaultValue: 'pending' },
    gateway_refund_id: { type: DataTypes.STRING(120), allowNull: true },
    initiated_by: { type: DataTypes.INTEGER, allowNull: true },
    initiated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'invoices', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    order_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE'
    },
    invoice_number: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    invoice_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('paid', 'unpaid', 'cancelled'), allowNull: false, defaultValue: 'unpaid' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'email_campaigns', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'general' },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    product_ids: { type: DataTypes.JSON, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'sent'), allowNull: false, defaultValue: 'draft' },
    recipient_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    ...timestamps,
  })

  // ─── Column migrations (adds new columns to existing tables) ────
  // customers
  await safeAddColumn('customers', 'last_login_at', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('customers', 'avatar_url', { type: DataTypes.STRING(255), allowNull: true })
  await safeAddColumn('customers', 'login_attempts', { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  await safeAddColumn('customers', 'locked_until', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('customers', 'verification_token', { type: DataTypes.STRING(255), allowNull: true })
  await safeAddColumn('customers', 'verification_token_expires_at', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('customers', 'deleted_at', { type: DataTypes.DATE, allowNull: true })

  // categories
  await safeAddColumn('categories', 'parent_id', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, references: { model: 'categories', key: 'id' }, onDelete: 'SET NULL' })
  await safeAddColumn('categories', 'header_highlight', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false })
  await safeAddColumn('categories', 'deleted_at', { type: DataTypes.DATE, allowNull: true })

  // products
  await safeAddColumn('products', 'low_stock_threshold', { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10 })
  await safeAddColumn('products', 'meta_title', { type: DataTypes.STRING(255), allowNull: true })
  await safeAddColumn('products', 'meta_description', { type: DataTypes.TEXT, allowNull: true })
  await safeAddColumn('products', 'deleted_at', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('products', 'allow_pre_order', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false })
  await safeAddColumn('products', 'enable_back_in_stock_notify', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false })
  await safeAddColumn('products', 'restock_date', { type: DataTypes.DATEONLY, allowNull: true })
  await safeAddColumn('products', 'tag', { type: DataTypes.STRING(80), allowNull: true })
  await safeAddColumn('products', 'is_best_seller', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false })

  // product_variants
  await safeAddColumn('product_variants', 'sku', { type: DataTypes.STRING(120), allowNull: true })
  await safeAddColumn('product_variants', 'low_stock_threshold', { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10 })
  await safeAddColumn('product_variants', 'gst_rate', { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 5.00 })
  await safeAddColumn('product_variants', 'sizes', { type: DataTypes.TEXT, allowNull: true })
  await safeAddColumn('product_variants', 'size_stock', { type: DataTypes.TEXT, allowNull: true })
  // Migrate existing size values to sizes JSON array
  try {
    await qi.sequelize.query("UPDATE product_variants SET sizes = CONCAT('[\"', REPLACE(size, '\"', '\\\\\"'), '\"]') WHERE size IS NOT NULL AND size != '' AND sizes IS NULL")
  } catch { /* data migration already done or no rows to migrate */ }

  // orders
  await safeAddColumn('orders', 'customer_name', { type: DataTypes.STRING(140), allowNull: true })
  await safeAddColumn('orders', 'customer_email', { type: DataTypes.STRING(190), allowNull: true })
  await safeAddColumn('orders', 'customer_mobile', { type: DataTypes.STRING(20), allowNull: true })
  await safeAddColumn('orders', 'payment_method', { type: DataTypes.STRING(32), allowNull: true })
  try {
    await qi.sequelize.query("ALTER TABLE `orders` MODIFY COLUMN `customer_name` VARCHAR(140) NULL DEFAULT NULL")
  } catch { /* already nullable */ }
  try {
    await qi.sequelize.query("ALTER TABLE `orders` MODIFY COLUMN `customer_email` VARCHAR(190) NULL DEFAULT NULL")
  } catch { /* already nullable */ }
  try {
    await qi.sequelize.query("ALTER TABLE `orders` MODIFY COLUMN `customer_mobile` VARCHAR(20) NULL DEFAULT NULL")
  } catch { /* already nullable */ }
  try {
    await qi.sequelize.query("ALTER TABLE `orders` MODIFY COLUMN `payment_method` VARCHAR(32) NULL DEFAULT NULL")
  } catch { /* already nullable */ }
  // Convert status/payment_status from ENUM to VARCHAR if the live DB used an older ENUM definition
  try {
    await qi.sequelize.query("ALTER TABLE `orders` MODIFY COLUMN `status` VARCHAR(60) NOT NULL DEFAULT 'pending'")
  } catch { /* already VARCHAR */ }
  try {
    await qi.sequelize.query("ALTER TABLE `orders` MODIFY COLUMN `payment_status` VARCHAR(60) NOT NULL DEFAULT 'pending'")
  } catch { /* already VARCHAR */ }
  await safeAddColumn('orders', 'tracking_url', { type: DataTypes.STRING(512), allowNull: true })
  await safeAddColumn('orders', 'shipping_provider', { type: DataTypes.STRING(80), allowNull: true })
  await safeAddColumn('orders', 'delivery_agent_name', { type: DataTypes.STRING(120), allowNull: true })
  await safeAddColumn('orders', 'delivery_agent_phone', { type: DataTypes.STRING(20), allowNull: true })
  await safeAddColumn('orders', 'tracking_number', { type: DataTypes.STRING(80), allowNull: true })
  await safeAddColumn('orders', 'dispatched_at', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('orders', 'delivered_at', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('orders', 'cancelled_at', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('orders', 'cancellation_reason', { type: DataTypes.TEXT, allowNull: true })
  await safeAddColumn('orders', 'notes', { type: DataTypes.TEXT, allowNull: true })
  await safeAddColumn('orders', 'razorpay_payment_id', { type: DataTypes.STRING(120), allowNull: true })
  await safeAddColumn('orders', 'razorpay_order_id', { type: DataTypes.STRING(120), allowNull: true })
  await safeAddColumn('orders', 'processed_by', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true })
  await safeAddColumn('orders', 'assigned_admin_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: { model: 'admins', key: 'id' },
    onDelete: 'SET NULL',
  })
  await safeAddColumn('orders', 'assigned_at', { type: DataTypes.DATE, allowNull: true })
  await safeAddColumn('orders', 'gst_total', { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  await safeAddColumn('orders', 'taxable_amount', { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  await safeAddColumn('orders', 'discount', { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 })
  await safeAddColumn('orders', 'coupon_id', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true })
  await safeAddColumn('orders', 'coupon_code', { type: DataTypes.STRING(50), allowNull: true })
  await safeAddColumn('orders', 'deleted_at', { type: DataTypes.DATE, allowNull: true })

  // order_items
  await safeAddColumn('order_items', 'sku', { type: DataTypes.STRING(80), allowNull: true })
  await safeAddColumn('order_items', 'variant_label', { type: DataTypes.STRING(120), allowNull: true })
  await safeAddColumn('order_items', 'color', { type: DataTypes.STRING(80), allowNull: true })
  await safeAddColumn('order_items', 'size', { type: DataTypes.STRING(40), allowNull: true })
  await safeAddColumn('order_items', 'image_url', { type: DataTypes.STRING(255), allowNull: true })

  // reviews
  await safeAddColumn('reviews', 'customer_id', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true })
  await safeAddColumn('reviews', 'body', { type: DataTypes.TEXT, allowNull: true })
  await safeAddColumn('reviews', 'status', { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' })
  await safeAddColumn('reviews', 'subject', { type: DataTypes.STRING(255), allowNull: true })
  await safeAddColumn('reviews', 'moderated_by', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: { model: 'admins', key: 'id' },
    onDelete: 'SET NULL',
  })
  await safeAddColumn('reviews', 'moderated_at', { type: DataTypes.DATE, allowNull: true })

  // email_campaigns
  await safeAddColumn('email_campaigns', 'image_url', { type: DataTypes.STRING(255), allowNull: true })
  try {
    await qi.sequelize.query("ALTER TABLE email_campaigns MODIFY COLUMN type VARCHAR(80) NOT NULL DEFAULT 'general'")
  } catch { /* column already compatible */ }

  // banners title column to allow NULL
  try {
    await qi.changeColumn('banners', 'title', {
      type: DataTypes.STRING(180),
      allowNull: true,
    })
  } catch { /* ignored if already compatible */ }

  // guest_sessions
  await createTableIfMissing(qi, 'guest_sessions', {
    session_id: { type: DataTypes.STRING(64), primaryKey: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  })
  // fix existing table if created without defaults
  try {
    await qi.sequelize.query("ALTER TABLE guest_sessions MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
  } catch { /* already correct */ }
  try {
    await qi.sequelize.query("ALTER TABLE guest_sessions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at")
  } catch { /* column already exists */ }

  // cart_items
  await safeAddColumn('cart_items', 'color', { type: DataTypes.STRING(80), allowNull: true })
  await safeAddColumn('cart_items', 'size', { type: DataTypes.STRING(40), allowNull: true })
  await safeAddColumn('cart_items', 'session_id', { type: DataTypes.STRING(64), allowNull: true })
  try {
    await qi.sequelize.query("ALTER TABLE cart_items MODIFY COLUMN user_id INT UNSIGNED NULL")
  } catch { /* already nullable */ }

  // wishlist_items
  await safeAddColumn('wishlist_items', 'session_id', { type: DataTypes.STRING(64), allowNull: true })
  await safeAddColumn('wishlist_items', 'variant_id', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true })
  await safeAddColumn('wishlist_items', 'color', { type: DataTypes.STRING(80), allowNull: true })
  await safeAddColumn('wishlist_items', 'size', { type: DataTypes.STRING(40), allowNull: true })
  try {
    await qi.sequelize.query("ALTER TABLE wishlist_items MODIFY COLUMN user_id INT UNSIGNED NULL")
  } catch { /* already nullable */ }

  // ─── Indexes ────────────────────────────────────────────────────
  // reviews indexes
  await safeAddIndex('reviews', 'reviews_product_id_customer_id_unique', ['product_id', 'customer_id'], { unique: true })
  await safeAddIndex('reviews', 'reviews_product_id', ['product_id'])
  await safeAddIndex('reviews', 'reviews_customer_id', ['customer_id'])
  await safeAddIndex('reviews', 'reviews_status', ['status'])

  // FK indexes for JOIN performance
  await safeAddIndex('products', 'idx_products_category_id', ['category_id'])
  await safeAddIndex('products', 'idx_products_code', ['code'])
  await safeAddIndex('products', 'idx_products_status', ['status'])
  await safeAddIndex('products', 'idx_products_name', ['name'])

  await safeAddIndex('product_images', 'idx_product_images_product_id', ['product_id'])
  await safeAddIndex('product_variants', 'idx_product_variants_product_id', ['product_id'])
  await safeAddIndex('product_variants', 'idx_product_variants_sku', ['sku'])
  await safeAddIndex('product_variants', 'idx_product_variants_status', ['status'])
  await safeAddIndex('variant_images', 'idx_variant_images_variant_id', ['variant_id'])
  await safeAddIndex('order_items', 'idx_order_items_order_id', ['order_id'])
  await safeAddIndex('order_items', 'idx_order_items_product_id', ['product_id'])
  await safeAddIndex('order_items', 'idx_order_items_variant_id', ['variant_id'])
  await safeAddIndex('order_items', 'idx_order_items_sku', ['sku'])
  await safeAddIndex('orders', 'idx_orders_customer_id', ['customer_id'])
  await safeAddIndex('orders', 'idx_orders_coupon_id', ['coupon_id'])
  await safeAddIndex('orders', 'idx_orders_status', ['status'])
  await safeAddIndex('orders', 'idx_orders_payment_status', ['payment_status'])
  await safeAddIndex('invoices', 'idx_invoices_order_id', ['order_id'])
  await safeAddIndex('customer_addresses', 'idx_customer_addresses_customer_id', ['customer_id'])
  await safeAddIndex('password_resets', 'idx_password_resets_customer_id', ['customer_id'])
  await safeAddIndex('coupon_usages', 'idx_coupon_usages_coupon_id', ['coupon_id'])
  await safeAddIndex('coupon_usages', 'idx_coupon_usages_order_id', ['order_id'])
  await safeAddIndex('coupon_customers', 'uq_coupon_customers_coupon_customer', ['coupon_id', 'customer_id'], { unique: true })
  await safeAddIndex('coupon_customers', 'idx_coupon_customers_customer_id', ['customer_id'])
  await safeAddIndex('review_images', 'idx_review_images_review_id', ['review_id'])
  await safeAddIndex('audit_logs', 'idx_audit_logs_entity', ['entity', 'entity_id'])
  await safeAddIndex('audit_logs', 'idx_audit_logs_action', ['action'])
  await safeAddIndex('audit_logs', 'idx_audit_logs_created_at', ['created_at'])
  await safeAddIndex('order_status_history', 'idx_order_status_history_order_id', ['order_id'])
  await safeAddIndex('refunds', 'idx_refunds_order_id', ['order_id'])
  try {
    await qi.removeIndex('cart_items', 'uq_cart_items_user_product_variant')
  } catch { /* ignore if doesn't exist */ }
  try {
    await qi.removeIndex('cart_items', 'uq_cart_items_user_product_variant_v2')
  } catch { /* ignore if doesn't exist */ }
  await safeAddIndex('cart_items', 'idx_cart_items_user_id', ['user_id'])
  await safeAddIndex('cart_items', 'idx_cart_items_session_id', ['session_id'])
  try {
    await qi.removeIndex('wishlist_items', 'uq_wishlist_items_user_product')
  } catch { /* ignore if doesn't exist */ }
  await safeAddIndex('wishlist_items', 'idx_wishlist_items_user_id', ['user_id'])
  await safeAddIndex('wishlist_items', 'idx_wishlist_items_session_id', ['session_id'])
  await safeAddIndex('wishlist_items', 'idx_wishlist_items_variant_id', ['variant_id'])
  await safeAddColumn('products', 'sub_category_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'categories', key: 'id' },
    onDelete: 'SET NULL'
  })

  // ─── Custom Roles & Permissions ───────────────────────────────
  await createTableIfMissing(qi, 'custom_roles', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ...timestamps,
  })

  await createTableIfMissing(qi, 'role_permissions', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'custom_roles', key: 'id' }, onDelete: 'CASCADE' },
    permission_key: { type: DataTypes.STRING(60), allowNull: false },
  })
  await safeAddIndex('role_permissions', 'uq_role_permissions_role_key', ['role_id', 'permission_key'], { unique: true })

  // admins
  await safeAddColumn('admins', 'custom_role_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: { model: 'custom_roles', key: 'id' },
    onDelete: 'SET NULL',
  })
  try {
    await qi.sequelize.query("ALTER TABLE admins MODIFY COLUMN role ENUM('super_admin', 'manager', 'employee') NOT NULL DEFAULT 'employee'")
  } catch { /* already modified */ }

  // ─── Shipping Rates ───────────────────────────────────────────
  await createTableIfMissing(qi, 'shipping_rates', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    courier_service: { type: DataTypes.STRING(80), allowNull: false },
    state: { type: DataTypes.STRING(100), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    estimated_days: { type: DataTypes.STRING(80), allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ...timestamps,
  })
  await safeAddIndex('shipping_rates', 'uq_shipping_rates_courier_state', ['courier_service', 'state'], { unique: true })
  await safeAddIndex('shipping_rates', 'idx_shipping_rates_courier_service', ['courier_service'])
  await safeAddIndex('shipping_rates', 'idx_shipping_rates_state', ['state'])
  await safeAddIndex('shipping_rates', 'idx_shipping_rates_active', ['active'])

  // ─── Cleanup Unused / Legacy Tables ───────────────────────────
  try {
    const [fkRows] = await qi.sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'products' AND REFERENCED_TABLE_NAME = 'brands'
    `)
    for (const row of fkRows as any[]) {
      await qi.sequelize.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``)
    }
  } catch { /* ignored if no FK */ }

  try {
    await qi.sequelize.query("ALTER TABLE `products` DROP COLUMN `brand_id`")
  } catch { /* ignored if column does not exist */ }

  const unusedTables = [
    'addresses',
    'brands',
    'cart',
    'wishlist',
    'users',
    'price_drop_email_logs',
    'price_drop_events',
    'stock_notifications',
  ]
  for (const table of unusedTables) {
    try {
      await qi.sequelize.query(`DROP TABLE IF EXISTS \`${table}\``)
    } catch { /* ignored */ }
  }

  console.log('Migration complete.')
}

// ─── Standalone execution (via `npx tsx src/database/migrate.ts`) ──
async function migrate() {
  await ensureDatabaseExists()
  await runMigrations()
  await sequelize.close()
}

const isMainModule = process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')
if (isMainModule) {
  migrate().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
