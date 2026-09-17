'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Edit3,
  Eye,
  EyeOff,
  Grid2X2,
  Home,
  LogOut,
  MapPin,
  Package,
  Plus,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { updateProfile, createAddress, deleteAddress, fetchAddresses, updateAddress, fetchOrders, changePassword, forgotPassword, verifyOtp, resetPassword } from '@/lib/api/auth'
import type { AddressInput, CustomerAddress, CustomerOrder } from '@/lib/api/auth'
import { apiFetch } from '@/lib/api/client'
import { useAuth } from '@/components/auth/AuthContext'
import { resolveImageUrl } from '@/lib/api/client'

type AccountTab = 'dashboard' | 'orders' | 'address' | 'settings' | 'logout'

const tabs: Array<{ id: AccountTab; label: string; Icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', Icon: Grid2X2 },
  { id: 'orders', label: 'Orders', Icon: ShoppingBag },
  { id: 'address', label: 'Address', Icon: MapPin },
  { id: 'settings', label: 'Settings', Icon: Settings },
  { id: 'logout', label: 'Logout', Icon: LogOut },
]

function EmptyOrdersPanel({ title = 'Recent orders', showViewAll = true }: { title?: string; showViewAll?: boolean }) {
  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-6 lg:p-7">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className="font-playfair text-2xl sm:text-3xl font-medium italic tracking-wide text-[#0F172A]">
          {title}
        </h2>
        {showViewAll ? (
          <button type="button" className="font-montserrat self-start text-xs font-bold uppercase tracking-[0.2em] text-[#0F172A] transition hover:text-[#FCB900] sm:self-auto">
            View all
          </button>
        ) : null}
      </div>

      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] bg-[#FAFAFC]/45 px-4 py-7 text-center sm:min-h-[210px] sm:px-5 sm:py-8">
        <Package className="mb-5 h-8 w-8 text-[#8F8982] sm:mb-6 sm:h-9 sm:w-9" strokeWidth={1.8} />
        <p className="font-playfair mb-5 text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
          No orders found yet.
        </p>
        <Link
          href="/shop"
          className="font-montserrat inline-flex w-full items-center justify-center rounded-md bg-[#0F172A] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#080E1A] sm:w-auto"
        >
          Start shopping
        </Link>
      </div>
    </section>
  )
}

export default function AccountDashboard() {
  const router = useRouter()
  const { session, refresh, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<AccountTab>('dashboard')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    mobile: '',
  })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false)
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotStep, setForgotStep] = useState<'idle' | 'otp-sent' | 'otp-entered' | 'done'>('idle')

  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState<AddressInput>({
    firstName: '', lastName: '', address: '', city: '', state: '', pincode: '', phone: '', isDefault: false,
  })
  const [addressTouched, setAddressTouched] = useState<Record<string, boolean>>({})
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})
  const [pincodeAutoFilled, setPincodeAutoFilled] = useState(false)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const pincodeTimer = useRef<ReturnType<typeof setTimeout>>()

  function validateAddressField(field: string, value: string): string {
    switch (field) {
      case 'firstName': return !value.trim() ? 'First name is required' : value.trim().length < 2 ? 'Enter at least 2 characters' : ''
      case 'address': return !value.trim() ? 'Address is required' : ''
      case 'city': return !value.trim() ? 'City is required' : ''
      case 'state': return !value.trim() ? 'State is required' : ''
      case 'pincode': return !value.trim() ? 'Pincode is required' : !/^\d{6}$/.test(value.trim()) ? 'Enter a valid 6-digit pincode' : ''
      case 'phone': return !value.trim() ? 'Phone number is required' : !/^\d{10}$/.test(value.trim().replace(/\D/g, '')) ? 'Enter a valid 10-digit phone number' : ''
      default: return ''
    }
  }

  function handleAddressFieldBlur(field: string) {
    setAddressTouched(p => ({ ...p, [field]: true }))
    const error = validateAddressField(field, addressForm[field as keyof AddressInput] as string || '')
    setAddressErrors(p => ({ ...p, [field]: error }))
  }

  function handleAddressFieldChange(field: keyof AddressInput, value: string) {
    setAddressForm(p => ({ ...p, [field]: value }))
    if (addressTouched[field]) {
      const error = validateAddressField(field, value)
      setAddressErrors(p => ({ ...p, [field]: error }))
    }
  }

  // Pincode auto-fill: when pincode reaches 6 digits, lookup city/state from India Post API
  useEffect(() => {
    if (addressForm.pincode.length === 6 && /^\d{6}$/.test(addressForm.pincode)) {
      clearTimeout(pincodeTimer.current)
      pincodeTimer.current = setTimeout(async () => {
        setPincodeLoading(true)
        try {
          const data = await apiFetch<{ isValid: boolean; city: string; district: string; state: string }>(
            `/storefront/pincode/${addressForm.pincode}`,
          )
          if (data.isValid) {
            setAddressForm(p => ({ ...p, city: data.district || data.city, state: data.state }))
            setPincodeAutoFilled(true)
            setAddressErrors(p => ({ ...p, city: '', state: '' }))
          } else {
            setPincodeAutoFilled(false)
          }
        } catch {
          // Pincode lookup failed silently
        } finally {
          setPincodeLoading(false)
        }
      }, 500)
    } else if (addressForm.pincode.length < 6) {
      setPincodeAutoFilled(false)
    }
    return () => clearTimeout(pincodeTimer.current)
  }, [addressForm.pincode])

  function isAddressFormValid(): boolean {
    const fields: (keyof AddressInput)[] = ['firstName', 'address', 'city', 'state', 'pincode', 'phone']
    const errs: Record<string, string> = {}
    let valid = true
    fields.forEach(f => {
      const val = addressForm[f] as string || ''
      const e = validateAddressField(f, val)
      if (e) { errs[f] = e; valid = false }
    })
    setAddressErrors(errs)
    setAddressTouched(Object.fromEntries(fields.map(f => [f, true])))
    return valid
  }

  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'orders') {
      if (orders.length === 0 && activeTab === 'dashboard') {
        fetchOrders().then(data => setOrders(data.orders)).catch(() => setOrders([]))
      }
      if (activeTab === 'orders') {
        setOrdersLoading(true)
        fetchOrders()
          .then(data => setOrders(data.orders))
          .catch(() => setOrders([]))
          .finally(() => setOrdersLoading(false))
      }
    }
    if (activeTab === 'address') {
      setAddressesLoading(true)
      fetchAddresses()
        .then(data => setAddresses(data.addresses))
        .catch(() => setAddresses([]))
        .finally(() => setAddressesLoading(false))
    }
  }, [activeTab])

  function openAddAddress() {
    setEditingAddress(null)
    setAddressForm({ firstName: '', lastName: '', address: '', city: '', state: '', pincode: '', phone: '', isDefault: false })
    setAddressTouched({})
    setAddressErrors({})
    setPincodeAutoFilled(false)
    setShowAddressForm(true)
  }

  function openEditAddress(addr: CustomerAddress) {
    setEditingAddress(addr)
    setAddressForm({
      firstName: addr.firstName,
      lastName: addr.lastName || '',
      address: addr.address,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      phone: addr.phone,
      isDefault: addr.isDefault,
    })
    setAddressTouched({})
    setAddressErrors({})
    setPincodeAutoFilled(false)
    setShowAddressForm(true)
  }

  async function handleSaveAddress() {
    if (!isAddressFormValid()) return
    setSavingAddress(true)
    try {
      if (editingAddress) {
        const data = await updateAddress(editingAddress.id, addressForm)
        setAddresses(prev => prev.map(a => a.id === editingAddress.id ? { ...a, ...data.address } : a))
      } else {
        const data = await createAddress(addressForm)
        setAddresses(prev => [data.address, ...prev])
      }
      setShowAddressForm(false)
      setEditingAddress(null)
    } catch {
      // ignore
    } finally {
      setSavingAddress(false)
    }
  }

  async function handleDeleteAddress(id: number) {
    try {
      await deleteAddress(id)
      setAddresses(prev => prev.filter(a => a.id !== id))
    } catch {
      // ignore
    }
  }

  async function handleSetDefault(addr: CustomerAddress) {
    try {
      await updateAddress(addr.id, {
        firstName: addr.firstName,
        lastName: addr.lastName,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        phone: addr.phone,
        isDefault: true,
      })
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addr.id })))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!session) return
    setProfile({
      name: session.name,
      email: session.email,
      mobile: session.mobile || '',
    })
  }, [session])

  if (!session) return null

  const displayAccount = {
    initials: session.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'A1',
    name: session.name,
    email: session.email,
    mobile: session.mobile || '',
  }

  async function handleLogout() {
    await logout()
    router.replace('/')
  }

  async function handleSaveProfile() {
    setSaveError('')
    setSaving(true)
    try {
      const data = await updateProfile({
        name: profile.name,
        email: profile.email,
        mobile: profile.mobile || null,
      })
      setProfile({
        name: data.customer.name,
        email: data.customer.email,
        mobile: data.customer.mobile || '',
      })
      await refresh()
      setEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const renderPanel = () => {
    if (activeTab === 'dashboard') {
      const stats = [
        { label: 'Total', value: orders.length },
        { label: 'Awaiting', value: orders.filter(o => o.status === 'confirmed' || o.status === 'packing' || o.status === 'dispatched' || o.status === 'out_for_delivery').length },
        { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length },
        { label: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length },
      ]
      return (
        <div className="space-y-5 sm:space-y-7">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-4">
            {stats.map(stat => (
              <article key={stat.label} className="min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5 shadow-[0_10px_30px_rgba(74,15,28,0.04)] sm:px-5 sm:py-6">
                <p className="font-montserrat mb-3 break-words text-xs font-bold uppercase tracking-[0.2em] text-[#0F172A]">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold leading-none text-[#0F172A] sm:text-4xl">{stat.value}</p>
              </article>
            ))}
          </div>
          {orders.length === 0 ? <EmptyOrdersPanel /> : (
            <div className="space-y-3">
              {orders.slice(0, 4).map(order => (
                <Link href={`/account/orders/${order.id}`} key={order.id} className="block rounded-lg border border-[#E2E8F0] bg-white p-4 transition hover:shadow-md hover:border-[#FCB900]/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0F172A]">#{order.orderNumber}</p>
                      <p className="text-xs text-[#64748B]">{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} — {order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{order.status}</span>
                      <span className="font-bold text-[#0F172A]">₹{parseFloat(order.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  {(order.status === 'dispatched' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748B]">
                      {order.trackingNumber ? <span>Tracking: {order.trackingNumber}</span> : null}
                      {order.deliveryAgentName ? <span>Agent: {order.deliveryAgentName}</span> : null}
                      {order.deliveredAt ? <span>Delivered: {new Date(order.deliveredAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span> : null}
                      {(order.status === 'dispatched' || order.status === 'out_for_delivery') && order.dispatchedAt ? <span>Dispatched: {new Date(order.dispatchedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span> : null}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'orders') {
      return (
        <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-6 lg:p-7">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="font-playfair text-2xl sm:text-3xl font-medium italic tracking-wide text-[#0F172A]">
              Orders
            </h2>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0F172A] border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <EmptyOrdersPanel title="Orders" showViewAll={false} />
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="rounded-lg border border-[#E2E8F0] bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">#{order.orderNumber}</p>
                      <p className="text-xs text-[#64748B]">{new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        order.status === 'confirmed' || order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{order.status}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        order.paymentStatus === 'paid' || order.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                        order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{order.paymentStatus}</span>
                    </div>
                  </div>

                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-2 text-sm">
                      {item.imageUrl && (
                        <div className="h-12 w-10 shrink-0 overflow-hidden rounded border border-[#E2E8F0] bg-[#FAFAFC]">
                          <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#0F172A]">{item.name}</p>
                        <p className="text-xs text-[#64748B]">{item.variantLabel || [item.color, item.size].filter(Boolean).join(' / ') || ''} x {item.quantity}</p>
                      </div>
                      <p className="ml-4 shrink-0 font-semibold text-[#0F172A]">₹{parseFloat(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                  ))}

                  {(order.status === 'dispatched' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-xs text-[#64748B] border-b border-[#E2E8F0] mb-2">
                      {order.trackingNumber ? <span>Tracking: {order.trackingNumber}</span> : null}
                      {order.deliveryAgentName ? <span>Agent: {order.deliveryAgentName}</span> : null}
                      {order.deliveryAgentPhone ? <span>Phone: {order.deliveryAgentPhone}</span> : null}
                      {order.deliveredAt ? <span>Delivered on: {new Date(order.deliveredAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span> : null}
                      {(order.status === 'dispatched' || order.status === 'out_for_delivery') && order.dispatchedAt ? <span>Dispatched on: {new Date(order.dispatchedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span> : null}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <Link href={`/account/orders/${order.id}`} className="text-xs font-semibold text-[#0F172A] underline-offset-2 hover:underline">View Details</Link>
                    <span className="text-base font-bold text-[#0F172A]">₹{parseFloat(order.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )
    }

    if (activeTab === 'address') {
      return (
        <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-6 lg:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="font-montserrat mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#64748B]">Address</p>
              <h2 className="font-playfair break-words text-2xl sm:text-3xl font-medium italic tracking-wide text-[#0F172A]">
                Saved address
              </h2>
            </div>
            <button type="button" onClick={openAddAddress} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0F172A] px-5 py-3 font-semibold text-white transition hover:bg-[#080E1A] sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Address
            </button>
          </div>

          {/* Address Form */}
          {showAddressForm && (
            <div className="mb-6 rounded-lg border border-[#FCB900]/40 bg-[#FAFAFC] p-4 sm:p-5">
              <h3 className="font-playfair mb-4 text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
                {editingAddress ? 'Edit Address' : 'New Address'}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <input value={addressForm.firstName} onChange={e => handleAddressFieldChange('firstName', e.target.value)} onBlur={() => handleAddressFieldBlur('firstName')} placeholder="First name *" className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A] ${addressTouched.firstName && addressErrors.firstName ? 'border-red-400' : 'border-[#E2E8F0]'}`} />
                  {addressTouched.firstName && addressErrors.firstName && <p className="mt-1 text-xs text-red-500">{addressErrors.firstName}</p>}
                </div>
                <div>
                  <input value={addressForm.lastName || ''} onChange={e => handleAddressFieldChange('lastName', e.target.value)} placeholder="Last name" className="w-full rounded-md border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A]" />
                </div>
                <div className="sm:col-span-2">
                  <input value={addressForm.address} onChange={e => handleAddressFieldChange('address', e.target.value)} onBlur={() => handleAddressFieldBlur('address')} placeholder="Address (House No., Building, Street) *" className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A] ${addressTouched.address && addressErrors.address ? 'border-red-400' : 'border-[#E2E8F0]'}`} />
                  {addressTouched.address && addressErrors.address && <p className="mt-1 text-xs text-red-500">{addressErrors.address}</p>}
                </div>
                <div className="relative">
                  <input value={addressForm.city} onChange={e => handleAddressFieldChange('city', e.target.value)} onBlur={() => handleAddressFieldBlur('city')} placeholder="City *" className={`w-full rounded-md border bg-white px-4 py-3 pr-16 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A] ${addressTouched.city && addressErrors.city ? 'border-red-400' : 'border-[#E2E8F0]'}`} />
                  {pincodeAutoFilled && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700">Auto</span>}
                  {addressTouched.city && addressErrors.city && <p className="mt-1 text-xs text-red-500">{addressErrors.city}</p>}
                </div>
                <div className="relative">
                  <input value={addressForm.state} onChange={e => handleAddressFieldChange('state', e.target.value)} onBlur={() => handleAddressFieldBlur('state')} placeholder="State *" className={`w-full rounded-md border bg-white px-4 py-3 pr-16 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A] ${addressTouched.state && addressErrors.state ? 'border-red-400' : 'border-[#E2E8F0]'}`} />
                  {pincodeAutoFilled && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700">Auto</span>}
                  {addressTouched.state && addressErrors.state && <p className="mt-1 text-xs text-red-500">{addressErrors.state}</p>}
                </div>
                <div className="relative">
                  <input value={addressForm.pincode} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); handleAddressFieldChange('pincode', v) }} onBlur={() => handleAddressFieldBlur('pincode')} placeholder="Pincode *" maxLength={6} className={`w-full rounded-md border bg-white px-4 py-3 pr-10 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A] ${addressTouched.pincode && addressErrors.pincode ? 'border-red-400' : 'border-[#E2E8F0]'}`} />
                  {pincodeLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2"><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0F172A] border-t-transparent" /></span>}
                  {addressTouched.pincode && addressErrors.pincode && <p className="mt-1 text-xs text-red-500">{addressErrors.pincode}</p>}
                </div>
                <div>
                  <input value={addressForm.phone} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); handleAddressFieldChange('phone', v) }} onBlur={() => handleAddressFieldBlur('phone')} placeholder="Phone (10 digits) *" maxLength={10} className={`w-full rounded-md border bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A] ${addressTouched.phone && addressErrors.phone ? 'border-red-400' : 'border-[#E2E8F0]'}`} />
                  {addressTouched.phone && addressErrors.phone && <p className="mt-1 text-xs text-red-500">{addressErrors.phone}</p>}
                </div>
              </div>
              <label className="mt-4 flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addressForm.isDefault || false} onChange={e => setAddressForm(p => ({ ...p, isDefault: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-[#0F172A] accent-[#0F172A]" />
                <span className="text-sm text-[#0F172A]">Set as default address</span>
              </label>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={handleSaveAddress} disabled={savingAddress} className="rounded-md bg-[#0F172A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#080E1A] disabled:opacity-50">
                  {savingAddress ? 'Saving...' : editingAddress ? 'Update' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddress(null) }} className="rounded-md border border-[#E2E8F0] bg-white px-6 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F5EDD6]">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Address List */}
          {addressesLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0F172A] border-t-transparent" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E2E8F0] bg-[#FAFAFC]/45 p-4 sm:p-5">
              <div className="mb-4 flex min-w-0 items-start gap-3">
                <Home className="mt-1 h-5 w-5 shrink-0 text-[#0F172A]" />
                <div className="min-w-0">
                  <h3 className="font-playfair break-words text-lg sm:text-xl font-medium italic tracking-wide text-[#0F172A]">
                    No address saved yet
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                    Add a delivery address to make checkout faster for your next A1 TEX order.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map(addr => (
                <div key={addr.id} className={`rounded-lg border p-4 sm:p-5 ${addr.isDefault ? 'border-[#FCB900] bg-[#FAFAFC]' : 'border-[#E2E8F0] bg-white'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {addr.isDefault && (
                        <span className="mb-2 inline-block rounded-full bg-[#FCB900]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#8B6914]">Default</span>
                      )}
                      <p className="text-sm font-semibold text-[#0F172A]">{addr.firstName} {addr.lastName || ''}</p>
                      <p className="mt-1 text-sm text-[#64748B]">{addr.address}</p>
                      <p className="text-sm text-[#64748B]">{addr.city}, {addr.state} — {addr.pincode}</p>
                      <p className="text-sm text-[#64748B]">{addr.phone}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!addr.isDefault && (
                        <button type="button" onClick={() => handleSetDefault(addr)} className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F172A] transition hover:bg-[#F5EDD6]" title="Set as default">
                          Set Default
                        </button>
                      )}
                      <button type="button" onClick={() => openEditAddress(addr)} className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#0F172A] transition hover:bg-[#F5EDD6]" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDeleteAddress(addr.id)} className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )
    }

    if (activeTab === 'settings') {
      return (
        <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-6 lg:p-7">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="font-montserrat mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#64748B]">Settings</p>
              <h2 className="font-playfair break-words text-2xl sm:text-3xl font-medium italic tracking-wide text-[#0F172A]">
                Profile preferences
              </h2>
            </div>
            <button
              type="button"
              onClick={() => { if (editing) { handleSaveProfile() } else { setEditing(true) } }}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0F172A] px-5 py-3 font-semibold text-white transition hover:bg-[#080E1A] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {editing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
            </button>
          </div>

          {saveError ? <p className="mb-4 text-sm font-medium text-[#A34336]">{saveError}</p> : null}

          <div className="grid min-w-0 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Name</span>
              <input
                value={profile.name}
                readOnly={!editing}
                onChange={event => setProfile(current => ({ ...current, name: event.target.value }))}
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition read-only:text-[#64748B] focus:border-[#0F172A]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Email</span>
              <input
                value={profile.email}
                readOnly={!editing}
                onChange={event => setProfile(current => ({ ...current, email: event.target.value }))}
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition read-only:text-[#64748B] focus:border-[#0F172A]"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Mobile</span>
              <input
                value={profile.mobile}
                readOnly={!editing}
                onChange={event => setProfile(current => ({ ...current, mobile: event.target.value }))}
                className="w-full rounded-md border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition read-only:text-[#64748B] focus:border-[#0F172A]"
              />
            </label>
          </div>

          <hr className="my-8 border-[#E2E8F0]" />

          <div>
            <h3 className="font-playfair mb-4 text-xl font-medium italic tracking-wide text-[#0F172A]">
              Change password
            </h3>

            {passwordSuccess ? (
              <p className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{passwordSuccess}</p>
            ) : null}
            {passwordError ? (
              <p className="mb-4 text-sm font-medium text-[#A34336]">{passwordError}</p>
            ) : null}

            <div className="grid min-w-0 gap-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Current password</span>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={event => { setPasswordForm(f => ({ ...f, currentPassword: event.target.value })); setPasswordError(''); setPasswordSuccess('') }}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white pl-4 pr-10 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#0F172A]">New password</span>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={event => { setPasswordForm(f => ({ ...f, newPassword: event.target.value })); setPasswordError(''); setPasswordSuccess('') }}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white pl-4 pr-10 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Confirm new password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={event => { setPasswordForm(f => ({ ...f, confirmPassword: event.target.value })); setPasswordError(''); setPasswordSuccess('') }}
                    className="w-full rounded-md border border-[#E2E8F0] bg-white pl-4 pr-10 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={async () => {
                  setPasswordError('')
                  setPasswordSuccess('')
                  if (!passwordForm.currentPassword) { setPasswordError('Current password is required.'); return }
                  if (passwordForm.newPassword.length < 6) { setPasswordError('New password must be at least 6 characters.'); return }
                  if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('New passwords do not match.'); return }
                  setChangingPassword(true)
                  try {
                    await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
                    setPasswordSuccess('Password changed successfully.')
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  } catch (err: any) {
                    setPasswordError(err?.message || 'Failed to change password.')
                  } finally {
                    setChangingPassword(false)
                  }
                }}
                disabled={changingPassword}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0F172A] px-5 py-3 font-semibold text-white transition hover:bg-[#080E1A] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {changingPassword ? 'Changing...' : 'Change password'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setForgotSent(false)
                  setPasswordError('')
                  setForgotLoading(true)
                  try {
                    const res = await forgotPassword(session?.email || profile.email)
                    setForgotStep('otp-sent')
                    setPasswordSuccess(res?.emailSent ? 'A 6-digit OTP has been sent to your email.' : 'We have sent an OTP to your email.')
                  } catch (err: any) {
                    setPasswordError(err?.message || 'Failed to send OTP.')
                  } finally {
                    setForgotLoading(false)
                  }
                }}
                disabled={forgotLoading}
                className="text-sm font-semibold text-[#0F172A] underline transition hover:text-[#FCB900] disabled:opacity-50 cursor-pointer"
              >
                {forgotLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>

            {forgotStep === 'otp-sent' && (
              <div className="mt-5 rounded-lg border border-[#FCB900]/40 bg-[#FAFAFC] p-5">
                <h4 className="mb-3 text-base font-semibold text-[#0F172A]">Enter OTP from your email</h4>
                <p className="mb-3 text-sm text-[#7A665]">We sent a 6-digit OTP to {session?.email || profile.email}. It expires in 15 minutes.</p>
                <div className="flex items-end gap-3">
                  <label className="block flex-1">
                    <span className="mb-2 block text-sm font-semibold text-[#0F172A]">OTP</span>
                    <input
                      type="text"
                      value={forgotOtp}
                      onChange={e => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      className="w-full rounded-md border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A]"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={async () => {
                      setPasswordError('')
                      if (forgotOtp.length !== 6) { setPasswordError('Enter a valid 6-digit OTP.'); return }
                      setForgotLoading(true)
                      try {
                        await verifyOtp(session?.email || profile.email, forgotOtp)
                        setForgotStep('otp-entered')
                        setPasswordError('')
                      } catch (err: any) {
                        setPasswordError(err?.message || 'Invalid or expired OTP.')
                      } finally {
                        setForgotLoading(false)
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0F172A] px-5 py-3 font-semibold text-white transition hover:bg-[#080E1A] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                  >
                    {forgotLoading ? 'Verifying...' : 'Continue'}
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setForgotStep('idle'); setForgotOtp(''); setPasswordError(''); setPasswordSuccess('') }}
                    className="text-sm font-semibold text-[#0F172A] underline transition hover:text-[#FCB900] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 'otp-entered' && (
              <div className="mt-5 rounded-lg border border-[#FCB900]/40 bg-[#FAFAFC] p-5">
                <h4 className="mb-3 text-base font-semibold text-[#0F172A]">Set new password</h4>
                <p className="mb-3 text-sm text-[#64748B]">OTP verified. Enter your new password below.</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#0F172A]">New password</span>
                    <div className="relative">
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={e => setForgotNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full rounded-md border border-[#E2E8F0] bg-white pl-4 pr-10 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                        aria-label={showForgotNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        {showForgotNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Confirm password</span>
                    <div className="relative">
                      <input
                        type={showForgotConfirmPassword ? 'text' : 'password'}
                        value={forgotConfirmPassword}
                        onChange={e => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full rounded-md border border-[#E2E8F0] bg-white pl-4 pr-10 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                        aria-label={showForgotConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showForgotConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setPasswordError('')
                      setPasswordSuccess('')
                      if (forgotNewPassword.length < 6) { setPasswordError('New password must be at least 6 characters.'); return }
                      if (forgotNewPassword !== forgotConfirmPassword) { setPasswordError('Passwords do not match.'); return }
                      setForgotLoading(true)
                      try {
                        await resetPassword(forgotOtp, session?.email || profile.email, forgotNewPassword)
                        setForgotStep('done')
                        setPasswordSuccess('Password reset successfully. You can now sign in with your new password.')
                        setForgotOtp('')
                        setForgotNewPassword('')
                        setForgotConfirmPassword('')
                      } catch (err: any) {
                        setPasswordError(err?.message || 'Failed to reset password.')
                      } finally {
                        setForgotLoading(false)
                      }
                    }}
                    disabled={forgotLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0F172A] px-5 py-3 font-semibold text-white transition hover:bg-[#080E1A] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {forgotLoading ? 'Resetting...' : 'Reset password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotStep('otp-sent'); setForgotNewPassword(''); setForgotConfirmPassword(''); setPasswordError('') }}
                    className="rounded-md border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F5EDD6]"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )
    }

    return (
      <section className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-center sm:p-8">
        <LogOut className="mx-auto mb-5 h-9 w-9 text-[#0F172A] sm:h-10 sm:w-10" />
        <h2 className="font-playfair mb-3 text-2xl sm:text-3xl font-medium italic tracking-wide text-[#0F172A]">
          Logout preview
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-[#64748B]">End your A1 TEX account session on this browser.</p>
        <button type="button" onClick={handleLogout} className="inline-flex w-full justify-center rounded-md bg-[#0F172A] px-6 py-3 font-semibold text-white transition hover:bg-[#080E1A] sm:w-auto">
          Logout and go home
        </button>
      </section>
    )
  }

  return (
    <main className="bg-[#FAFAFC] text-[#0F172A]">
      <section className="border-b border-[#E2E8F0] bg-[#FAFAFC]">
        <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-8 sm:py-10 lg:px-16 xl:px-24">
          <p className="font-montserrat mb-3 text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-[#0F172A]">
            My Account
          </p>
          <h1 className="font-playfair mb-3 break-words text-3xl sm:mb-4 sm:text-4xl md:text-5xl font-medium tracking-wide leading-tight text-[#0F172A]">
            Hello, {displayAccount.name.split(' ')[0] || 'there'}
          </h1>
          <p className="font-sans max-w-3xl text-sm sm:text-base font-medium leading-relaxed text-[#0F172A]">
            Manage orders, addresses, and profile preferences.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-7 sm:px-8 sm:py-10 lg:px-16 xl:px-24">
        <div className="grid min-w-0 gap-5 sm:gap-7 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-[0_12px_35px_rgba(74,15,28,0.05)] sm:p-6">
            <div className="mb-5 flex min-w-0 items-center gap-3 border-b border-[#E2E8F0] pb-5 sm:mb-6 sm:gap-4 sm:pb-6">
              <div className="font-playfair flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#FCB900]/45 bg-[#F5EDD6] text-xl font-semibold text-[#0F172A] sm:h-16 sm:w-16 sm:text-2xl">
                {displayAccount.initials}
              </div>
              <div className="min-w-0">
                <h2 className="font-playfair break-words text-xl sm:text-2xl font-medium tracking-wide text-[#0F172A]">
                  {displayAccount.name}
                </h2>
                <p className="font-sans mt-1 break-all text-sm leading-5 text-[#64748B] sm:break-words sm:text-base font-medium">
                  {displayAccount.email}
                </p>
              </div>
            </div>

            <nav className="hidden space-y-3 lg:block" aria-label="Account navigation">
              {tabs.map(({ id, label, Icon }) => {
                const active = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`font-playfair flex w-full min-w-0 items-center gap-3 rounded-md px-4 py-3 text-left text-lg sm:text-xl font-medium tracking-wide transition ${
                      active ? 'bg-[#0F172A] text-white shadow-[inset_4px_0_0_#FCB900]' : 'text-[#0F172A] hover:bg-[#F5EDD6] hover:text-[#0F172A]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                )
              })}
            </nav>

            <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden" aria-label="Account navigation">
              {tabs.map(({ id, label, Icon }) => {
                const active = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                      active ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#E2E8F0] bg-white text-[#0F172A]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                )
              })}
            </nav>
          </aside>

          <div>{renderPanel()}</div>
        </div>
      </section>
    </main>
  )
}
