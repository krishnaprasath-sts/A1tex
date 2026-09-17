import { DataTypes } from 'sequelize'
import { sequelize } from '../database/sequelize.js'
import { EmailCampaign } from './email-campaign.model.js'
import { ContactEnquiry } from './contact-enquiry.model.js'
import { ShippingRate } from './shipping-rate.model.js'
export { EmailCampaign }
export { ContactEnquiry }
export { ShippingRate }

function autoJson(receiver: string) {
  return {
    type: DataTypes.JSON,
    get(this: any) {
      const raw = this.getDataValue(receiver) as unknown
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch { return raw }
      }
      return raw
    },
    set(this: any, value: unknown) {
      this.setDataValue(receiver, value)
    },
  } as any
}

const status = ['active', 'inactive'] as const

export const Admin = sequelize.define('Admin', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(140), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  role: { type: DataTypes.ENUM('super_admin', 'manager', 'employee'), allowNull: false, defaultValue: 'employee' },
  customRoleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'custom_role_id' },
  status: { type: DataTypes.ENUM(...status), allowNull: false, defaultValue: 'active' },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
}, { tableName: 'admins' })

export const CustomRole = sequelize.define('CustomRole', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
  isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_system' },
}, { tableName: 'custom_roles' })

export const RolePermission = sequelize.define('RolePermission', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'role_id' },
  permissionKey: { type: DataTypes.STRING(60), allowNull: false, field: 'permission_key' },
}, {
  tableName: 'role_permissions',
  timestamps: false,
  indexes: [{ unique: true, fields: ['role_id', 'permission_key'] }],
})

export const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(140), allowNull: false },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
  mobile: { type: DataTypes.STRING(32), allowNull: true, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  status: { type: DataTypes.ENUM(...status), allowNull: false, defaultValue: 'active' },
  emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'email_verified' },
  avatarUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'avatar_url' },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
  loginAttempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'login_attempts' },
  lockedUntil: { type: DataTypes.DATE, allowNull: true, field: 'locked_until' },
  verificationToken: { type: DataTypes.STRING(255), allowNull: true, field: 'verification_token' },
  verificationTokenExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'verification_token_expires_at' },
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
}, { tableName: 'customers', paranoid: true })

export const AnnouncementMessage = sequelize.define('AnnouncementMessage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  text: { type: DataTypes.STRING(180), allowNull: false },
  linkUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'link_url' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'announcement_messages' })

export const MarqueeMessage = sequelize.define('MarqueeMessage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  text: { type: DataTypes.STRING(255), allowNull: false },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'marquee_messages' })

export const Banner = sequelize.define('Banner', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  placement: { type: DataTypes.STRING(80), allowNull: false },
  title: { type: DataTypes.STRING(180), allowNull: true },
  subtitle: { type: DataTypes.STRING(255), allowNull: true },
  imageUrl: { type: DataTypes.STRING(255), allowNull: false, field: 'image_url' },
  ctaLabel: { type: DataTypes.STRING(80), allowNull: true, field: 'cta_label' },
  ctaUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'cta_url' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'banners' })

export const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  section: { type: DataTypes.STRING(80), allowNull: false },
  parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'parent_id' },
  name: { type: DataTypes.STRING(140), allowNull: false },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  href: { type: DataTypes.STRING(255), allowNull: false },
  imageUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'image_url' },
  tag: { type: DataTypes.STRING(80), allowNull: true },
  navVisible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'nav_visible' },
  homeVisible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'home_visible' },
  headerHighlight: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'header_highlight' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  metadata: autoJson('metadata'),
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
}, { tableName: 'categories', paranoid: true })



export const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(80), allowNull: true, unique: true },
  name: { type: DataTypes.STRING(180), allowNull: false },
  slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
  type: { type: DataTypes.STRING(180), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(140), allowNull: true },
  categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'category_id' },
  subCategoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'sub_category_id' },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  originalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'original_price' },
  stockQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'stock_qty' },
  lowStockThreshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10, field: 'low_stock_threshold' },
  enableBackInStockNotify: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'enable_back_in_stock_notify' },
  imageUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'image_url' },
  tag: { type: DataTypes.STRING(80), allowNull: true },
  weightKg: { type: DataTypes.DECIMAL(8, 3), allowNull: true, field: 'weight_kg' },
  lengthCm: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'length_cm' },
  breadthCm: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'breadth_cm' },
  heightCm: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'height_cm' },
  color: { type: DataTypes.STRING(140), allowNull: true },
  gender: { type: DataTypes.STRING(20), allowNull: true },
  ageGroup: { type: DataTypes.STRING(20), allowNull: true, field: 'age_group' },
  hasVariants: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_variants' },
  status: { type: DataTypes.ENUM('draft', 'active', 'archived'), allowNull: false, defaultValue: 'active' },
  featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  isNew: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_new' },
  isBestSeller: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_best_seller' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  gstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 5.00, field: 'gst_rate' },
  metaTitle: { type: DataTypes.STRING(255), allowNull: true, field: 'meta_title' },
  metaDescription: { type: DataTypes.TEXT, allowNull: true, field: 'meta_description' },
  metadata: autoJson('metadata'),
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
}, { tableName: 'products', paranoid: true })

export const ProductImage = sequelize.define('ProductImage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'product_id' },
  imageUrl: { type: DataTypes.STRING(255), allowNull: false, field: 'image_url' },
  altText: { type: DataTypes.STRING(180), allowNull: true, field: 'alt_text' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, { tableName: 'product_images' })

export const ProductVariant = sequelize.define('ProductVariant', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'product_id' },
  variantType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'color', field: 'variant_type' },
  label: { type: DataTypes.STRING(120), allowNull: false },
  colorName: { type: DataTypes.STRING(80), allowNull: true, field: 'color_name' },
  colorHex: { type: DataTypes.STRING(9), allowNull: true, field: 'color_hex' },
  size: { type: DataTypes.STRING(40), allowNull: true },
  sizes: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('sizes') as unknown
      if (!raw) return null
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch { return [raw] }
      }
      return raw
    },
    set(value: unknown) {
      if (Array.isArray(value)) {
        this.setDataValue('sizes', JSON.stringify(value))
      } else {
        this.setDataValue('sizes', value)
      }
    },
  },
  sku: { type: DataTypes.STRING(120), allowNull: true, unique: true },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  originalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'original_price' },
  stockQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'stock_qty' },
  sizeStock: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'size_stock',
    get() {
      const raw = this.getDataValue('sizeStock') as unknown
      if (!raw) return null
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch { return null }
      }
      return raw
    },
    set(value: unknown) {
      if (value && typeof value === 'object') {
        this.setDataValue('sizeStock', JSON.stringify(value))
      } else {
        this.setDataValue('sizeStock', value)
      }
    },
  },
  lowStockThreshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 10, field: 'low_stock_threshold' },
  imageUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'image_url' },
  isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
  gstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: true, defaultValue: 5.00, field: 'gst_rate' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, { tableName: 'product_variants' })

export const VariantImage = sequelize.define('VariantImage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'variant_id' },
  imageUrl: { type: DataTypes.STRING(255), allowNull: false, field: 'image_url' },
  altText: { type: DataTypes.STRING(180), allowNull: true, field: 'alt_text' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
}, { tableName: 'variant_images' })

export const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  orderNumber: { type: DataTypes.STRING(80), allowNull: false, unique: true, field: 'order_number' },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'customer_id' },
  customerName: { type: DataTypes.STRING(140), allowNull: true, field: 'customer_name' },
  customerEmail: { type: DataTypes.STRING(190), allowNull: true, field: 'customer_email' },
  customerMobile: { type: DataTypes.STRING(20), allowNull: true, field: 'customer_mobile' },
  status: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'pending' },
  paymentStatus: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'pending', field: 'payment_status' },
  paymentMethod: { type: DataTypes.STRING(32), allowNull: true, field: 'payment_method' },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  shippingTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'shipping_total' },
  discount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  gstTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'gst_total' },
  taxableAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'taxable_amount' },
  grandTotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'grand_total' },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'shipping_address',
    get() {
      const raw = this.getDataValue('shippingAddress') as unknown
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch { return raw }
      }
      return raw
    },
    set(value: unknown) {
      this.setDataValue('shippingAddress', value)
    },
  },
  deliveryAgentName: { type: DataTypes.STRING(120), allowNull: true, field: 'delivery_agent_name' },
  deliveryAgentPhone: { type: DataTypes.STRING(20), allowNull: true, field: 'delivery_agent_phone' },
  trackingNumber: { type: DataTypes.STRING(80), allowNull: true, field: 'tracking_number' },
  trackingUrl: { type: DataTypes.STRING(512), allowNull: true, field: 'tracking_url' },
  shippingProvider: { type: DataTypes.STRING(80), allowNull: true, field: 'shipping_provider' },
  dispatchedAt: { type: DataTypes.DATE, allowNull: true, field: 'dispatched_at' },
  deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
  cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
  cancellationReason: { type: DataTypes.TEXT, allowNull: true, field: 'cancellation_reason' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  couponId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'coupon_id' },
  couponCode: { type: DataTypes.STRING(50), allowNull: true, field: 'coupon_code' },
  razorpayPaymentId: { type: DataTypes.STRING(120), allowNull: true, field: 'razorpay_payment_id' },
  razorpayOrderId: { type: DataTypes.STRING(120), allowNull: true, field: 'razorpay_order_id' },
  processedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'processed_by' },
  assignedAdminId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'assigned_admin_id' },
  assignedAt: { type: DataTypes.DATE, allowNull: true, field: 'assigned_at' },
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const raw = this.getDataValue('metadata') as unknown
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch { return raw }
      }
      return raw
    },
    set(value: unknown) {
      this.setDataValue('metadata', value)
    },
  },
}, { tableName: 'orders', paranoid: true })

export const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'order_id' },
  invoiceNumber: { type: DataTypes.STRING(60), allowNull: false, unique: true, field: 'invoice_number' },
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW, field: 'invoice_date' },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
  status: { type: DataTypes.ENUM('paid', 'unpaid', 'cancelled'), allowNull: false, defaultValue: 'unpaid' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'invoices' })

export const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'order_id' },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'product_id' },
  variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'variant_id' },
  name: { type: DataTypes.STRING(180), allowNull: false },
  sku: { type: DataTypes.STRING(80), allowNull: true },
  variantLabel: { type: DataTypes.STRING(120), allowNull: true, field: 'variant_label' },
  color: { type: DataTypes.STRING(80), allowNull: true },
  size: { type: DataTypes.STRING(40), allowNull: true },
  imageUrl: { type: DataTypes.STRING(255), allowNull: true, field: 'image_url' },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'unit_price' },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: 'order_items' })

export const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  value: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const raw = this.getDataValue('value') as unknown
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) } catch { return raw }
      }
      return raw
    },
    set(value: unknown) {
      this.setDataValue('value', value)
    },
  },
}, { tableName: 'settings' })

export const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  adminId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'admin_id' },
  action: { type: DataTypes.STRING(120), allowNull: false },
  entity: { type: DataTypes.STRING(120), allowNull: false },
  entityId: { type: DataTypes.STRING(80), allowNull: true, field: 'entity_id' },
  details: autoJson('details'),
}, { tableName: 'audit_logs', updatedAt: false })

export const PasswordReset = sequelize.define('PasswordReset', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'customer_id' },
  tokenHash: { type: DataTypes.STRING(255), allowNull: false, field: 'token_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  usedAt: { type: DataTypes.DATE, allowNull: true, field: 'used_at' },
}, { tableName: 'password_resets' })

export const CustomerAddress = sequelize.define('CustomerAddress', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'customer_id' },
  firstName: { type: DataTypes.STRING(140), allowNull: false, field: 'first_name' },
  lastName: { type: DataTypes.STRING(140), allowNull: true, field: 'last_name' },
  address: { type: DataTypes.STRING(255), allowNull: false },
  city: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.STRING(100), allowNull: false },
  pincode: { type: DataTypes.STRING(20), allowNull: false },
  phone: { type: DataTypes.STRING(32), allowNull: false },
  isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
}, { tableName: 'customer_addresses' })

export const Coupon = sequelize.define('Coupon', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false },
  value: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  minCartValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'min_cart_value' },
  maxDiscount: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'max_discount' },
  usageLimit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'usage_limit' },
  perUserLimit: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, field: 'per_user_limit' },
  usedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'used_count' },
  startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
  expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  description: { type: DataTypes.STRING(255), allowNull: true },
}, { tableName: 'coupons' })

export const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'product_id' },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'customer_id' },
  rating: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 5 } },
  subject: { type: DataTypes.STRING(255), allowNull: true },
  body: { type: DataTypes.TEXT, allowNull: true },
  title: { type: DataTypes.STRING(255), allowNull: true },
  comment: { type: DataTypes.TEXT, allowNull: true },
  isVerifiedBuyer: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_verified_buyer' },
  isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_approved' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'approved' },
  moderatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'moderated_by' },
  moderatedAt: { type: DataTypes.DATE, allowNull: true, field: 'moderated_at' },
}, {
  tableName: 'reviews',
  indexes: [
    { unique: true, fields: ['product_id', 'customer_id'] },
    { fields: ['product_id'] },
    { fields: ['customer_id'] },
    { fields: ['status'] },
  ],
})

export const ReviewImage = sequelize.define('ReviewImage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  reviewId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'review_id' },
  imageUrl: { type: DataTypes.STRING(255), allowNull: false, field: 'image_url' },
}, { tableName: 'review_images' })

export const CouponUsage = sequelize.define('CouponUsage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  couponId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'coupon_id' },
  orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'order_id' },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'customer_id' },
  customerEmail: { type: DataTypes.STRING(190), allowNull: true, field: 'customer_email' },
  discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'discount_amount' },
  usedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'used_at' },
}, { tableName: 'coupon_usages', timestamps: false })

// Rows for a coupon restrict it to specific customers; a coupon with no
// rows here applies to all customers (the pre-existing behavior).
export const CouponCustomer = sequelize.define('CouponCustomer', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  couponId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'coupon_id' },
  customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'customer_id' },
}, {
  tableName: 'coupon_customers',
  timestamps: false,
  indexes: [{ unique: true, fields: ['coupon_id', 'customer_id'] }],
})

// ─── New models ──────────────────────────────────────────────────────

export const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'order_id' },
  fromStatus: { type: DataTypes.STRING(60), allowNull: true, field: 'from_status' },
  toStatus: { type: DataTypes.STRING(60), allowNull: false, field: 'to_status' },
  changedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'changed_by' },
  changedByType: { type: DataTypes.ENUM('admin', 'customer', 'system', 'webhook'), allowNull: false, defaultValue: 'system', field: 'changed_by_type' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'order_status_history', updatedAt: false })

export const Refund = sequelize.define('Refund', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'order_id' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'processed', 'failed'), allowNull: false, defaultValue: 'pending' },
  gatewayRefundId: { type: DataTypes.STRING(120), allowNull: true, field: 'gateway_refund_id' },
  initiatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'initiated_by' },
  initiatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'initiated_at' },
  processedAt: { type: DataTypes.DATE, allowNull: true, field: 'processed_at' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'refunds' })

export const GuestSession = sequelize.define('GuestSession', {
  sessionId: { type: DataTypes.STRING(64), primaryKey: true, field: 'session_id' },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, { tableName: 'guest_sessions', timestamps: false })

export const CartItem = sequelize.define('CartItem', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'user_id' },
  sessionId: { type: DataTypes.STRING(64), allowNull: true, field: 'session_id' },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'product_id' },
  variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'variant_id' },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  color: { type: DataTypes.STRING(80), allowNull: true },
  size: { type: DataTypes.STRING(40), allowNull: true },
}, {
  tableName: 'cart_items',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['session_id'] },
  ],
})

export const WishlistItem = sequelize.define('WishlistItem', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'user_id' },
  sessionId: { type: DataTypes.STRING(64), allowNull: true, field: 'session_id' },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'product_id' },
  variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'variant_id' },
  color: { type: DataTypes.STRING(80), allowNull: true },
  size: { type: DataTypes.STRING(40), allowNull: true },
}, {
  tableName: 'wishlist_items',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['session_id'] },
  ],
})

export const models = {
  Admin,
  Customer,
  CustomerAddress,
  AnnouncementMessage,
  MarqueeMessage,
  Banner,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  VariantImage,
  Order,
  OrderItem,
  Setting,
  Invoice,
  AuditLog,
  PasswordReset,
  Coupon,
  CouponUsage,
  CouponCustomer,
  Review,
  ReviewImage,
  OrderStatusHistory,
  Refund,
  EmailCampaign,
  GuestSession,
  WishlistItem,
  CustomRole,
  RolePermission,
  ShippingRate,
}

export function initAssociations() {
  Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' })
  Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' })
  Category.hasMany(Product, { foreignKey: 'category_id' })
  Product.belongsTo(Category, { foreignKey: 'category_id' })
  Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' })
  Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' })
  ProductVariant.belongsTo(Product, { foreignKey: 'product_id' })
  ProductVariant.hasMany(VariantImage, { foreignKey: 'variant_id', as: 'images' })
  VariantImage.belongsTo(ProductVariant, { foreignKey: 'variant_id' })
  Customer.hasMany(Order, { foreignKey: 'customer_id' })
  Customer.hasMany(CustomerAddress, { foreignKey: 'customer_id', as: 'addresses' })
  CustomerAddress.belongsTo(Customer, { foreignKey: 'customer_id' })
  Order.belongsTo(Customer, { foreignKey: 'customer_id' })
  Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' })
  Order.belongsTo(Coupon, { foreignKey: 'coupon_id' })
  OrderItem.belongsTo(Order, { foreignKey: 'order_id' })
  Order.hasOne(Invoice, { foreignKey: 'order_id' })
  Invoice.belongsTo(Order, { foreignKey: 'order_id' })
  Coupon.hasMany(CouponUsage, { foreignKey: 'coupon_id', as: 'usages' })
  CouponUsage.belongsTo(Coupon, { foreignKey: 'coupon_id' })
  CouponUsage.belongsTo(Order, { foreignKey: 'order_id' })
  Coupon.hasMany(CouponCustomer, { foreignKey: 'coupon_id', as: 'eligibleCustomers' })
  CouponCustomer.belongsTo(Coupon, { foreignKey: 'coupon_id' })
  CouponCustomer.belongsTo(Customer, { foreignKey: 'customer_id' })
  CartItem.belongsTo(Product, { foreignKey: 'product_id' })
  CartItem.belongsTo(ProductVariant, { foreignKey: 'variant_id' })
  Customer.hasMany(CartItem, { foreignKey: 'user_id' })
  CartItem.belongsTo(Customer, { foreignKey: 'user_id' })

  WishlistItem.belongsTo(Product, { foreignKey: 'product_id' })
  WishlistItem.belongsTo(ProductVariant, { foreignKey: 'variant_id' })
  Customer.hasMany(WishlistItem, { foreignKey: 'user_id' })
  WishlistItem.belongsTo(Customer, { foreignKey: 'user_id' })

  Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' })
  Review.belongsTo(Product, { foreignKey: 'product_id' })
  Customer.hasMany(Review, { foreignKey: 'customer_id', as: 'reviews' })
  Review.belongsTo(Customer, { foreignKey: 'customer_id' })
  Review.hasMany(ReviewImage, { foreignKey: 'review_id', as: 'images' })
  ReviewImage.belongsTo(Review, { foreignKey: 'review_id' })

  // New associations
  Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory' })
  OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id' })
  Order.hasMany(Refund, { foreignKey: 'order_id', as: 'refunds' })
  Refund.belongsTo(Order, { foreignKey: 'order_id' })

  // Role & staff associations
  CustomRole.hasMany(RolePermission, { foreignKey: 'role_id', as: 'permissions' })
  RolePermission.belongsTo(CustomRole, { foreignKey: 'role_id' })
  Admin.belongsTo(CustomRole, { foreignKey: 'custom_role_id', as: 'customRole' })
  Order.belongsTo(Admin, { foreignKey: 'assigned_admin_id', as: 'assignedAdmin' })
  Admin.hasMany(Order, { foreignKey: 'assigned_admin_id', as: 'assignedOrders' })
}
