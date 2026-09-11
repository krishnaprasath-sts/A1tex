import { apiFetch } from './client'
import type { CustomerAddress, CustomerSession } from './types'

export type { CustomerAddress }

export type RegisterInput = {
  name: string
  email: string
  mobile?: string
  password: string
}

export type LoginInput = {
  contact: string
  password: string
}

export async function registerCustomer(input: RegisterInput) {
  return apiFetch<{ customer: CustomerSession }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function loginCustomer(input: LoginInput) {
  return apiFetch<{ customer: CustomerSession }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getCurrentCustomer() {
  return apiFetch<{ customer: CustomerSession }>('/auth/me')
}

export async function logoutCustomer() {
  return apiFetch<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
  })
}

export async function forgotPassword(email: string) {
  return apiFetch<{ message: string; devOtp?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(otp: string, email: string, password: string) {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ otp, email, password }),
  })
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function updateProfile(input: {
  name?: string
  email?: string
  mobile?: string | null
}) {
  return apiFetch<{ customer: CustomerSession }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export type AddressInput = {
  firstName: string
  lastName?: string | null
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  isDefault?: boolean
}

export async function fetchAddresses() {
  return apiFetch<{ addresses: CustomerAddress[] }>('/auth/addresses')
}

export async function createAddress(input: AddressInput) {
  return apiFetch<{ address: CustomerAddress }>('/auth/addresses', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateAddress(id: number, input: AddressInput) {
  return apiFetch<{ address: CustomerAddress }>(`/auth/addresses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteAddress(id: number) {
  return apiFetch<{ ok: boolean }>(`/auth/addresses/${id}`, {
    method: 'DELETE',
  })
}

export type CustomerOrderItem = {
  id: number
  name: string
  color?: string
  size?: string
  variantLabel?: string
  imageUrl?: string
  quantity: number
  unitPrice: string
  total: string
}

export type CustomerOrder = {
  id: number
  orderNumber: string
  customerEmail?: string
  status: string
  paymentStatus: string
  subtotal: string
  shippingTotal: string
  grandTotal: string
  gstTotal?: string
  taxableAmount?: string
  discount?: string
  couponCode?: string
  deliveryAgentName?: string
  deliveryAgentPhone?: string
  trackingNumber?: string
  dispatchedAt?: string
  deliveredAt?: string
  createdAt: string
  items: CustomerOrderItem[]
  shippingAddress?: {
    firstName: string
    lastName?: string
    address: string
    city: string
    state: string
    pincode: string
    phone: string
  }
}

export async function fetchOrders() {
  return apiFetch<{ orders: CustomerOrder[] }>('/storefront/orders')
}

export async function fetchOrder(id: number) {
  return apiFetch<{ order: CustomerOrder }>(`/storefront/orders/${id}`)
}
