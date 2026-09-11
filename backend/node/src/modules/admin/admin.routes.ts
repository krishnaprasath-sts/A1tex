import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'node:path'
import crypto from 'node:crypto'
import { requireAdminAuth } from '../../middleware/auth.js'
import { AppError, asyncHandler } from '../../utils/http.js'
import { UPLOADS_DIR } from './controllers/upload.controller.js'

// Import controllers
import { getDashboardStats, getSalesStats, getSalesBreakdown, getTopSellingProducts } from './controllers/dashboard.controller.js'
import { uploadFile, deleteUploadedFile } from './controllers/upload.controller.js'
import {
  getProductVariants,
  createProductVariant,
  getProductVariantById,
  updateProductVariant,
  deleteProductVariant,
  setVariantDefault,
  uploadVariantImage,
  deleteVariantImage,
  uploadVariantMainImage,
  reorderVariantImages,
  getAllVariants,
  getStockList,
  updateStockBatch,
  adjustStock,
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
  createProduct,
  importProducts,
  downloadSampleImport,
  importVariants,
  downloadVariantImportSample,
} from './controllers/product.controller.js'
import {
  getPipelineCounts,
  getPipelineStage,
  getOrderDetail,
  transitionOrder,
  getOrderPdf,
  getStageAddressesPdf,
  getStageInvoicesPdf,
  getDispatchedCodPendingInvoicesPdf,
  sendRecoveryEmail,
  updateOrderPayment,
} from './controllers/order.controller.js'
import {
  createInvoice,
  regenerateInvoice,
  syncInvoice,
  getInvoice,
  getInvoices,
  getInvoicePdf,
  updateInvoiceStatus,
  bulkCreateInvoices,
  exportInvoicesExcel,
  sendInvoiceEmailHandler,
  getOrderInvoicePdf,
} from './controllers/invoice.controller.js'
import { requirePermission, type PermissionKey } from '../../middleware/permissions.js'
import { listStaff, createStaff, updateStaff, deleteStaff } from './controllers/staff.controller.js'
import { listRoles, createRole, updateRole, deleteRole } from './controllers/roles.controller.js'
import { assignOrder, unassignOrder, getMyAssignments, packOrder } from './controllers/assignment.controller.js'
import {
  getReviews,
  createReview,
  moderateReview,
  deleteReview,
} from './controllers/review.controller.js'
import {
  getShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  resetShippingRates,
} from './controllers/shipping-rate.controller.js'
import {
  getCouponUsages,
  getTopCustomers,
  listResource,
  createResource,
  getResourceById,
  updateResource,
  deleteResource,
} from './controllers/resource.controller.js'


function hashedFilename(originalName: string): string {
  const ext = path.extname(originalName) || '.jpg'
  const hash = crypto.randomBytes(12).toString('hex')
  return `${hash}${ext}`
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    cb(null, hashedFilename(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new AppError(422, 'Only JPEG, PNG, and WebP images are allowed.'))
    }
  },
})

const uploadExcel = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ]
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(file.mimetype) || ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true)
    } else {
      cb(new AppError(422, 'Only Excel (.xlsx, .xls) and CSV files are allowed.'))
    }
  },
})

const router = Router()

const resourcePermissions: Record<string, PermissionKey[]> = {
  'announcement-messages': ['manage_settings'],
  'marquee-messages': ['manage_settings'],
  banners: ['manage_settings'],
  categories: ['manage_products'],
  products: ['manage_products'],
  customers: ['manage_customers'],
  coupons: ['manage_coupons'],
  orders: ['view_orders'],
  settings: ['manage_settings'],
  enquiries: ['manage_customers'],
}

function requireResourcePermission(req: Request, res: Response, next: NextFunction) {
  const keys = resourcePermissions[req.params.resource]
  if (!keys) return next(new AppError(404, 'Unknown admin resource.'))
  return requirePermission(...keys)(req, res, next)
}

router.use(requireAdminAuth)

// Dashboard
router.get('/dashboard', requirePermission('view_dashboard'), asyncHandler(getDashboardStats))
router.get('/dashboard/sales', requirePermission('view_reports'), asyncHandler(getSalesStats))
router.get('/dashboard/sales/products', requirePermission('view_reports'), asyncHandler(getSalesBreakdown))
router.get('/dashboard/top-products', requirePermission('view_reports'), asyncHandler(getTopSellingProducts))

// Uploads
router.post('/uploads', requirePermission('manage_products', 'manage_settings'), upload.single('file'), asyncHandler(uploadFile))
router.delete('/uploads/:filename', requirePermission('manage_products', 'manage_settings'), asyncHandler(deleteUploadedFile))

// Variant Endpoints
router.get('/products/:productId/variants', requirePermission('manage_products', 'manage_stock'), asyncHandler(getProductVariants))
router.post('/products/:productId/variants', requirePermission('manage_products'), asyncHandler(createProductVariant))
router.get('/products/:productId/variants/:variantId', requirePermission('manage_products', 'manage_stock'), asyncHandler(getProductVariantById))
router.put('/products/:productId/variants/:variantId', requirePermission('manage_products'), asyncHandler(updateProductVariant))
router.delete('/products/:productId/variants/:variantId', requirePermission('manage_products'), asyncHandler(deleteProductVariant))
router.put('/products/:productId/variants/:variantId/set-default', requirePermission('manage_products'), asyncHandler(setVariantDefault))
router.post('/products/:productId/variants/:variantId/images', requirePermission('manage_products'), upload.single('file'), asyncHandler(uploadVariantImage))
router.delete('/products/:productId/variants/:variantId/images/:imageId', requirePermission('manage_products'), asyncHandler(deleteVariantImage))
router.put('/products/:productId/variants/:variantId/main-image', requirePermission('manage_products'), upload.single('file'), asyncHandler(uploadVariantMainImage))
router.put('/products/:productId/variants/:variantId/images/reorder', requirePermission('manage_products'), asyncHandler(reorderVariantImages))

// Standalone Variant & Stock Endpoints
router.get('/variants', requirePermission('manage_products', 'manage_stock'), asyncHandler(getAllVariants))
router.get('/stock', requirePermission('manage_stock'), asyncHandler(getStockList))
router.put('/stock/batch', requirePermission('manage_stock'), asyncHandler(updateStockBatch))
router.post('/stock/adjust', requirePermission('manage_stock'), asyncHandler(adjustStock))

// Product Gallery Image Endpoints
router.get('/products/:productId/images', requirePermission('manage_products'), asyncHandler(getProductImages))
router.post('/products/:productId/images', requirePermission('manage_products'), upload.single('file'), asyncHandler(uploadProductImage))
router.delete('/products/:productId/images/:imageId', requirePermission('manage_products'), asyncHandler(deleteProductImage))
router.put('/products/:productId/images/reorder', requirePermission('manage_products'), asyncHandler(reorderProductImages))

// Order Pipeline Endpoints
router.get('/orders/pipeline/counts', requirePermission('view_orders'), asyncHandler(getPipelineCounts))
router.get('/orders/pipeline/:stage', requirePermission('view_orders'), asyncHandler(getPipelineStage))
router.get('/orders/:id/detail', requirePermission('view_orders', 'view_my_orders'), asyncHandler(getOrderDetail))
router.put('/orders/:id/transition', requirePermission('transition_orders'), asyncHandler(transitionOrder))
router.put('/orders/:id/payment', asyncHandler(updateOrderPayment))
router.get('/orders/:stage/addresses/pdf', requirePermission('view_orders'), asyncHandler(getStageAddressesPdf))
router.get('/orders/:stage/invoices/pdf', requirePermission('manage_invoices'), asyncHandler(getStageInvoicesPdf))
router.get('/orders/dispatched/cod-pending/invoices/pdf', requirePermission('manage_invoices'), asyncHandler(getDispatchedCodPendingInvoicesPdf))
router.get('/orders/:id/pdf', requirePermission('view_orders'), asyncHandler(getOrderPdf))
router.post('/orders/:id/send-recovery-email', requirePermission('view_orders'), asyncHandler(sendRecoveryEmail))

// Invoice Endpoints
router.post('/orders/:id/invoice', requirePermission('manage_invoices'), asyncHandler(createInvoice))
router.put('/orders/:id/invoice/regenerate', requirePermission('manage_invoices'), asyncHandler(regenerateInvoice))
router.put('/orders/:id/invoice/sync-status', requirePermission('manage_invoices'), asyncHandler(syncInvoice))
router.get('/orders/:id/invoice', requirePermission('manage_invoices'), asyncHandler(getInvoice))

// Invoice Management
router.get('/invoices', requirePermission('manage_invoices'), asyncHandler(getInvoices))
router.get('/invoices/:id/pdf', requirePermission('manage_invoices'), asyncHandler(getInvoicePdf))
router.put('/invoices/:id/status', requirePermission('manage_invoices'), asyncHandler(updateInvoiceStatus))
router.post('/invoices/bulk', requirePermission('manage_invoices'), asyncHandler(bulkCreateInvoices))
router.get('/invoices/export/excel', requirePermission('manage_invoices'), asyncHandler(exportInvoicesExcel))
router.post('/invoices/:id/send-email', requirePermission('manage_invoices'), asyncHandler(sendInvoiceEmailHandler))
router.get('/orders/:id/invoice/pdf', requirePermission('manage_invoices'), asyncHandler(getOrderInvoicePdf))

// Coupon usages
router.get('/coupons/:id/usages', requirePermission('manage_coupons'), asyncHandler(getCouponUsages))
router.get('/coupons/top-customers', requirePermission('manage_coupons'), asyncHandler(getTopCustomers))

// Reviews
router.get('/reviews', requirePermission('manage_products'), asyncHandler(getReviews))
router.post('/reviews', requirePermission('manage_products'), asyncHandler(createReview))
router.put('/reviews/:id/moderate', requirePermission('manage_products'), asyncHandler(moderateReview))
router.delete('/reviews/:id', requirePermission('manage_products'), asyncHandler(deleteReview))

// Shipping Rates (Shipping Zone Management)
router.get('/shipping-rates', requirePermission('manage_settings'), asyncHandler(getShippingRates))
router.post('/shipping-rates', requirePermission('manage_settings'), asyncHandler(createShippingRate))
router.post('/shipping-rates/reset-defaults', requirePermission('manage_settings'), asyncHandler(resetShippingRates))
router.put('/shipping-rates/:id', requirePermission('manage_settings'), asyncHandler(updateShippingRate))
router.delete('/shipping-rates/:id', requirePermission('manage_settings'), asyncHandler(deleteShippingRate))

// Product create with auto-default-variant (interceptor before generic post('/:resource'))
router.post('/products', requirePermission('manage_products'), asyncHandler(createProduct))

// Product Import
router.get('/products/import/sample', requirePermission('manage_products'), asyncHandler(downloadSampleImport))
router.post('/products/import', requirePermission('manage_products'), uploadExcel.single('file'), asyncHandler(importProducts))

// Variant Import
router.get('/products/variants/import/sample', requirePermission('manage_products'), asyncHandler(downloadVariantImportSample))
router.post('/products/variants/import', requirePermission('manage_products'), uploadExcel.single('file'), asyncHandler(importVariants))

// Staff management routes
router.get('/staff', requirePermission('manage_staff', 'assign_orders'), asyncHandler(listStaff))
router.post('/staff', requirePermission('manage_staff'), asyncHandler(createStaff))
router.patch('/staff/:id', requirePermission('manage_staff'), asyncHandler(updateStaff))
router.delete('/staff/:id', requirePermission('manage_staff'), asyncHandler(deleteStaff))

// Role management routes
router.get('/roles', requirePermission('manage_roles', 'manage_staff'), asyncHandler(listRoles))
router.post('/roles', requirePermission('manage_roles'), asyncHandler(createRole))
router.put('/roles/:id', requirePermission('manage_roles'), asyncHandler(updateRole))
router.delete('/roles/:id', requirePermission('manage_roles'), asyncHandler(deleteRole))

// Order assignment & packing routes
router.post('/orders/:id/assign', requirePermission('assign_orders'), asyncHandler(assignOrder))
router.delete('/orders/:id/assign', requirePermission('assign_orders'), asyncHandler(unassignOrder))
router.get('/orders/my-assignments', requirePermission('view_my_orders'), asyncHandler(getMyAssignments))
router.patch('/orders/:id/pack', requirePermission('pack_orders'), asyncHandler(packOrder))

// Generic Resource Endpoints
router.get('/:resource', requireResourcePermission, asyncHandler(listResource))
router.post('/:resource', requireResourcePermission, asyncHandler(createResource))
router.get('/:resource/:id', requireResourcePermission, asyncHandler(getResourceById))
router.put('/:resource/:id', requireResourcePermission, asyncHandler(updateResource))
router.delete('/:resource/:id', requireResourcePermission, asyncHandler(deleteResource))

export default router
