import { env } from '../config/env.js'

let cachedToken: { token: string; expiresAt: number } | null = null

interface ShipRocketLoginResponse {
  token: string
}

interface ShipRocketServiceabilityResponse {
  data: {
    available_courier_companies: Array<{
      courier_name: string
      freight_charge: number
      rate: number
      etd: string
      estimated_delivery_days: string
    }>
  }
}

interface ShipRocketOrderResponse {
  order_id: number
  shipment_id: number
  status: string
  awb_code?: string
  label_url?: string
}

interface ShipRocketAssignAwbResponse {
  awb_code: string
  courier_name: string
  label_url: string
  manifest_url: string
}

interface ShipRocketPickupResponse {
  pickup_token: string
  pickup_date: string
  pickup_time: string
  status: string
}

interface ShipRocketCancelResponse {
  status: string
  message: string
}

const BASE = env.SHIPROCKET_API_BASE_URL

async function apiPost<T>(path: string, body: Record<string, unknown>, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ShipRocket API error (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ShipRocket API error (${res.status}): ${text}`)
  }
  return res.json() as Promise<T>
}

export async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  if (!env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD) {
    throw new Error('ShipRocket credentials not configured')
  }

  const data = await apiPost<ShipRocketLoginResponse>('/auth/login', {
    email: env.SHIPROCKET_EMAIL,
    password: env.SHIPROCKET_PASSWORD,
  })

  cachedToken = { token: data.token, expiresAt: Date.now() + 6 * 60 * 60 * 1000 }
  return data.token
}

export function clearToken() {
  cachedToken = null
}

export async function checkServiceability(params: {
  deliveryPincode: string
  weight: number
  cod?: boolean
  declaredValue?: number
}): Promise<Array<{ courier_name: string; rate: number; estimated_delivery_days: string }>> {
  const token = await getToken()
  const qs = new URLSearchParams({
    pickup_postcode: env.WAREHOUSE_PINCODE || '622301',
    delivery_postcode: params.deliveryPincode,
    weight: String(params.weight),
    cod: params.cod ? '1' : '0',
    ...(params.declaredValue ? { declared_value: String(params.declaredValue) } : {}),
  }).toString()
  const data = await apiGet<ShipRocketServiceabilityResponse>(`/courier/serviceability/?${qs}`, token)
  const couriers = data?.data?.available_courier_companies || []
  return couriers.map(c => ({
    courier_name: c.courier_name,
    rate: c.freight_charge ?? c.rate ?? 0,
    estimated_delivery_days: c.etd || c.estimated_delivery_days || '',
  }))
}

export async function createShipment(order: {
  orderId: number
  orderNumber: string
  orderDate: string
  billingCustomerName: string
  billingAddress: string
  billingCity: string
  billingState: string
  billingPincode: string
  billingPhone: string
  orderItems: Array<{ name: string; sku: string; quantity: number; price: number }>
  paymentMethod: string
  weight?: number
  lengthCm?: number
  breadthCm?: number
  heightCm?: number
  subTotal?: number
  grandTotal?: number
}): Promise<ShipRocketOrderResponse> {
  const token = await getToken()

  const shipmentItems = order.orderItems.map((item, i) => ({
    name: item.name,
    sku: item.sku || `SKU-${i}`,
    units: item.quantity,
    selling_price: item.price,
  }))

  const nameParts = order.billingCustomerName.trim().split(/\s+/)
  const firstName = nameParts[0] || 'Customer'
  const lastName = nameParts.slice(1).join(' ') || ''

  const body: Record<string, unknown> = {
    order_id: order.orderNumber,
    order_date: order.orderDate,
    pickup_location: env.SHIPROCKET_PICKUP_LOCATION,
    channel_id: env.SHIPROCKET_CHANNEL_ID || '',
    comment: `Order #${order.orderNumber}`,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: order.billingAddress,
    billing_city: order.billingCity,
    billing_state: order.billingState,
    billing_pincode: order.billingPincode,
    billing_country: 'India',
    billing_phone: order.billingPhone,
    shipping_is_billing: true,
    payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    sub_total: order.subTotal ?? 0,
    grand_total: order.grandTotal ?? 0,
    length: order.lengthCm ?? 10,
    breadth: order.breadthCm ?? 10,
    height: order.heightCm ?? 5,
    order_items: shipmentItems,
  }

  if (order.weight) body['weight'] = order.weight

  return apiPost<ShipRocketOrderResponse>('/orders/create/adhoc', body, token)
}

export async function assignAwb(
  shipmentId: number | string,
  courierId?: string,
): Promise<ShipRocketAssignAwbResponse> {
  const token = await getToken()
  const body: Record<string, unknown> = { shipment_id: shipmentId }
  if (courierId) body.courier_id = courierId
  return apiPost<ShipRocketAssignAwbResponse>('/courier/assign/awb', body, token)
}

export async function generatePickup(
  shipmentId: number | string,
): Promise<ShipRocketPickupResponse> {
  const token = await getToken()
  return apiPost<ShipRocketPickupResponse>('/courier/generate/pickup', {
    shipment_id: [shipmentId],
  }, token)
}

export async function cancelShiprocketOrder(
  orderId: string,
): Promise<ShipRocketCancelResponse> {
  const token = await getToken()
  return apiPost<ShipRocketCancelResponse>('/orders/cancel', {
    order_id: orderId,
  }, token)
}

export async function trackShipment(shipmentId: number): Promise<unknown> {
  const token = await getToken()
  return apiGet(`/courier/tracking?shipment_id=${shipmentId}`, token)
}

export const SHIPROCKET_STATUS_MAP: Record<string, string> = {
  SHIPPED: 'dispatched',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  RTO: 'rto',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
  PICKUP: 'dispatched',
}

export function mapShiprocketStatus(srStatus: string): string | null {
  return SHIPROCKET_STATUS_MAP[srStatus] || null
}
