'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, Loader2, Lock, MapPin, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'
import { useAuth } from '@/components/auth/AuthContext'
import { fetchAddresses } from '@/lib/api/auth'
import type { CustomerAddress } from '@/lib/api/auth'
import { apiFetch } from '@/lib/api/client'
import { useCheckout } from './CheckoutContext'
import { fetchShippingConfig, type ShippingConfig } from '@/lib/api/storefront'
import ShippingPopup from './ShippingPopup'

type Step = 'contact' | 'shipping' | 'payment'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export default function CheckoutForm({ isBuyNow }: { isBuyNow?: boolean }) {
  const router = useRouter()
  const { items: cartItems, subtotal: cartSubtotal, clearCart } = useCart()
  const { session } = useAuth()
  const { shippingTotal, setShippingTotal, shippingCalculated, setShippingCalculated, setIsProcessing, paymentMethod, setPaymentMethod, couponCode, selectedCourierName, setSelectedCourierName, selectedCourierCode, setSelectedCourierCode } = useCheckout()

  const [mounted, setMounted] = useState(false)
  const [buyNowItem, setBuyNowItem] = useState<any | null>(null)

  useEffect(() => {
    if (isBuyNow) {
      try {
        const raw = sessionStorage.getItem('buyNowItem')
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          if (parsed?.id && parsed?.name && parsed?.price != null && Number(parsed.price) >= 0 && Number(parsed?.qty) >= 1) {
            setBuyNowItem(parsed)
          }
        }
      } catch {}
    }
    setMounted(true)
  }, [isBuyNow])

  const checkoutItems = isBuyNow ? (buyNowItem ? [buyNowItem] : []) : cartItems
  const checkoutSubtotal = isBuyNow && buyNowItem
    ? Number(buyNowItem.price ?? 0) * Number(buyNowItem.qty ?? 1)
    : cartSubtotal
  const [activeStep, setActiveStep] = useState<Step>('contact')
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])

  useEffect(() => {
    if (session) {
      setEmail(session.email)
      fetchAddresses().then(data => {
        setSavedAddresses(data.addresses)
        const defaultAddr = data.addresses.find(a => a.isDefault) || data.addresses[0]
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id)
          setFirstName(defaultAddr.firstName)
          setLastName(defaultAddr.lastName || '')
          setAddress(defaultAddr.address)
          setCity(defaultAddr.city)
          setState(defaultAddr.state)
          setPincode(defaultAddr.pincode)
          setPhone(defaultAddr.phone)
        }
      }).catch(() => {})
    }
  }, [session])

  function handleSelectAddress(addr: CustomerAddress) {
    setSelectedAddressId(addr.id)
    setFirstName(addr.firstName)
    setLastName(addr.lastName || '')
    setAddress(addr.address)
    setCity(addr.city)
    setState(addr.state)
    setPincode(addr.pincode)
    setPhone(addr.phone)
    if (addr.pincode && addr.pincode.length === 6) {
      calculateShipping(addr.pincode, addr.state)
    }
  }

  // Form states
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [phone, setPhone] = useState('')
  const [, setLocalPaymentMethod] = useState('upi')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryInfo, setDeliveryInfo] = useState<{ available: boolean; rate: number; estimatedDays: string; courierName: string } | null>(null)
  const [courierOptions, setCourierOptions] = useState<Array<{ id: string; name: string; code: string; rate: number; estimatedDays: string; isFreeShipping?: boolean }>>([])
  const [deliveryChecking, setDeliveryChecking] = useState(false)
  const [pincodeAutoFilled, setPincodeAutoFilled] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [shipTouched, setShipTouched] = useState<Record<string, boolean>>({})
  const [shipErrors, setShipErrors] = useState<Record<string, string>>({})

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [showShippingPopup, setShowShippingPopup] = useState(false)

  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>({ freeShippingEnabled: false, freeShippingThreshold: 0 })

  useEffect(() => {
    setPaymentMethod('online')
  }, [setPaymentMethod])

  useEffect(() => {
    fetchShippingConfig().then(setShippingConfig)
  }, [])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchShippingConfig().then(setShippingConfig)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const hasFreeShipping = shippingConfig.freeShippingEnabled && shippingConfig.freeShippingThreshold > 0 && checkoutSubtotal >= shippingConfig.freeShippingThreshold

  function validateShipField(field: string, value: string): string {
    switch (field) {
      case 'firstName': return !value.trim() ? 'First name is required' : value.trim().length < 2 ? 'Enter at least 2 characters' : ''
      case 'address': return !value.trim() ? 'Address is required' : ''
      case 'city': return !value.trim() ? 'City is required' : ''
      case 'state': return !value ? 'Please select a state' : ''
      case 'pincode': return !value.trim() ? 'Pincode is required' : !/^\d{6}$/.test(value.trim()) ? 'Enter a valid 6-digit pincode' : ''
      case 'phone': return !value.trim() ? 'Phone number is required' : !/^\d{10}$/.test(value.trim().replace(/\D/g, '')) ? 'Enter a valid 10-digit phone number' : ''
      default: return ''
    }
  }

  function handleShipBlur(field: string) {
    setShipTouched(p => ({ ...p, [field]: true }))
    const value = { firstName, address, city, state, pincode, phone }[field] || ''
    setShipErrors(p => ({ ...p, [field]: validateShipField(field, value) }))
  }

  function isShippingValid(): boolean {
    const fields = ['firstName', 'address', 'city', 'state', 'pincode', 'phone'] as const
    const values = { firstName, address, city, state, pincode, phone }
    const errs: Record<string, string> = {}
    let valid = true
    fields.forEach(f => {
      const e = validateShipField(f, values[f])
      if (e) { errs[f] = e; valid = false }
    })
    setShipErrors(errs)
    setShipTouched(Object.fromEntries(fields.map(f => [f, true])))
    return valid
  }

  async function calculateShipping(pin?: string, stateOverride?: string) {
    const activePin = pin !== undefined ? pin : pincode
    const activeState = stateOverride !== undefined ? stateOverride : state
    if ((!activePin || activePin.length < 6) && !activeState) return
    if (checkoutItems.length === 0) return
    setDeliveryChecking(true)

    try {
      const data = await apiFetch<{
        state?: string
        shippingOptions: Array<{ id: string; name: string; code: string; rate: number; estimatedDays: string; isFreeShipping?: boolean }>
      }>(
        '/storefront/orders/calculate-shipping',
        {
          method: 'POST',
          body: JSON.stringify({
            pincode: activePin,
            state: activeState,
            items: checkoutItems.map(i => ({ weight: (i as any).weightKg ?? 0.5, quantity: i.qty })),
            subtotal: checkoutSubtotal,
            cod: paymentMethod === 'cod',
          }),
        },
      )
      if (data.shippingOptions && data.shippingOptions.length > 0) {
        setCourierOptions(data.shippingOptions)
        // Keep current selected courier if available, otherwise pick the first
        const currentSelected = data.shippingOptions.find(c => c.code === selectedCourierCode) || data.shippingOptions[0]
        setSelectedCourierCode(currentSelected.code)
        setSelectedCourierName(currentSelected.name)
        setShippingTotal(currentSelected.rate)
        setDeliveryInfo({ available: true, rate: currentSelected.rate, estimatedDays: currentSelected.estimatedDays, courierName: currentSelected.name })
        setShippingCalculated(true)
      } else {
        setCourierOptions([])
        setShippingTotal(0)
        setDeliveryInfo({ available: false, rate: 0, estimatedDays: '', courierName: '' })
        setShippingCalculated(false)
      }
    } catch {
      setCourierOptions([])
      setShippingTotal(0)
      setDeliveryInfo(null)
      setShippingCalculated(false)
    } finally {
      setDeliveryChecking(false)
    }
  }

  function handleSelectCourier(code: string) {
    const chosen = courierOptions.find(c => c.code === code)
    if (!chosen) return
    setSelectedCourierCode(chosen.code)
    setSelectedCourierName(chosen.name)
    setShippingTotal(chosen.rate)
    setDeliveryInfo({ available: true, rate: chosen.rate, estimatedDays: chosen.estimatedDays, courierName: chosen.name })
  }

  useEffect(() => {
    if (pincode.length === 6) {
      const timer = setTimeout(async () => {
        let detectedState = state
        try {
          const pincodeData = await apiFetch<{ isValid: boolean; city: string; district: string; state: string }>(
            `/storefront/pincode/${pincode}`,
          )
          if (pincodeData.isValid) {
            setCity(pincodeData.district || pincodeData.city)
            setState(pincodeData.state)
            detectedState = pincodeData.state
            setPincodeAutoFilled(true)
            setShipErrors(p => ({ ...p, city: '', state: '' }))
          } else {
            setCity('')
            setState('')
            setPincodeAutoFilled(false)
          }
        } catch {}
        calculateShipping(pincode, detectedState)
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setCity('')
      setState('')
      setPincodeAutoFilled(false)
      setShippingCalculated(false)
    }
    setDeliveryInfo(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincode])

  // Recalculate shipping when payment method changes (COD vs online affects rates)
  useEffect(() => {
    if (pincode.length === 6) calculateShipping(pincode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod])

  // Update shipping when free shipping threshold is crossed
  useEffect(() => {
    if (hasFreeShipping && shippingCalculated) {
      setShippingTotal(0)
      setDeliveryInfo({ available: true, rate: 0, estimatedDays: '2-5 business days', courierName: 'Free Shipping' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFreeShipping])

  const handleNext = (nextStep: Step) => {
    if (nextStep === 'payment' && !isShippingValid()) return
    setError(null)
    setActiveStep(nextStep)
  }

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve()

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true

      const timeout = setTimeout(() => reject(new Error('Razorpay SDK load timed out')), 10000)

      script.onload = () => { clearTimeout(timeout); resolve() }
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load Razorpay SDK')) }

      document.body.appendChild(script)
    })
  }

  async function handleRazorpayPayment(body: Record<string, unknown>): Promise<{ order: { id: number }; guestToken?: string }> {
    const razorpayData = await apiFetch<{ razorpayOrderId: string | null; amount: number; currency: string; orderId: number; status?: string; guestToken?: string }>(
      '/storefront/orders/create-razorpay-order',
      { method: 'POST', body: JSON.stringify(body) },
    )

    if (!razorpayData.razorpayOrderId) {
      return { order: { id: razorpayData.orderId }, guestToken: razorpayData.guestToken }
    }

    await loadRazorpayScript()

    return new Promise<{ order: { id: number }; guestToken?: string }>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayData.amount,
        currency: razorpayData.currency || 'INR',
        name: 'A1 TEX',
        description: `Order #${razorpayData.razorpayOrderId}`,
        order_id: razorpayData.razorpayOrderId,
        handler: async function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
          try {
            const verifyData = await apiFetch<{ order: { id: number }; guestToken?: string }>(
              '/storefront/orders/verify-payment',
              {
                method: 'POST',
                timeoutMs: 30000,
                body: JSON.stringify({
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                  orderId: razorpayData.orderId,
                }),
              },
            )
            resolve(verifyData)
          } catch (err) {
            reject(err)
          }
        },
        modal: {
          ondismiss: function () {
            reject(new Error('Payment cancelled'))
          },
        },
        prefill: {
          email: email || undefined,
          contact: phone || undefined,
        },
        theme: { color: '#8B1A2B' },
      })
      rzp.open()
    })
  }

  const handlePlaceOrder = async () => {
    setError(null)

    // Block if delivery is not serviceable to this pincode
    if (deliveryInfo && !deliveryInfo.available) {
      setError('Delivery is not available to this pincode. Please try a different address.')
      return
    }

    setIsLoading(true)
    setIsProcessing(true)

    const body: Record<string, unknown> = {
      paymentMethod: 'online',
      items: checkoutItems.map((item: any) => ({
        productId: typeof item.id === 'number' ? item.id : Number(item.id) || undefined,
        variantId: item.variantId,
        name: item.name,
        variantLabel: item.variantLabel,
        color: item.color,
        size: item.size,
        imageUrl: item.image,
        quantity: Number(item.qty),
        unitPrice: Number(item.price),
        total: Number(item.price) * Number(item.qty),
      })),
      customerEmail: email || undefined,
      shippingAddress: {
        firstName,
        lastName: lastName || undefined,
        address,
        city,
        state,
        pincode,
        phone,
      },
      shippingTotal,
      ...(selectedCourierName ? { courierName: selectedCourierName } : {}),
      ...(selectedCourierCode ? { courierCode: selectedCourierCode } : {}),
      ...(couponCode ? { couponCode } : {}),
    }

    try {
      const data = await handleRazorpayPayment(body)
      const guestToken = data.guestToken

      if (isBuyNow) {
        try { sessionStorage.removeItem('buyNowItem') } catch {}
      } else {
        clearCart()
      }
      const qs = guestToken ? `orderId=${data.order.id}&token=${encodeURIComponent(guestToken)}` : `orderId=${data.order.id}`
      router.push(`/order-confirmation?${qs}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      setIsProcessing(false)
    }
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B1A1A]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Loading checkout...</span>
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {checkoutItems.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FDF6F0] text-[#8B1A1A] flex items-center justify-center mx-auto mb-4 border border-[#8B1A1A]/20 shadow-xs">
            <ShoppingBag size={28} />
          </div>
          <h2 className="mb-2 text-2xl font-bold font-serif text-[#0F172A]">
            {isBuyNow ? 'No Buy Now Item Selected' : 'Your Checkout is Empty'}
          </h2>
          <p className="mb-6 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {isBuyNow
              ? 'You haven\'t selected a saree for instant checkout yet. Pick any handcrafted piece from our collections or review your cart.'
              : 'Add your favorite pure silk and handloom sarees to your bag before proceeding to checkout.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-xl bg-[#8B1A1A] text-sm font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#721226] no-underline"
            >
              Explore Silk Sarees →
            </Link>
            <Link
              href="/cart"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-xl border border-slate-200 text-sm font-semibold uppercase tracking-wider text-slate-700 bg-white shadow-xs transition-all hover:border-[#8B1A1A] hover:text-[#8B1A1A] no-underline"
            >
              View Shopping Bag
            </Link>
          </div>
          <div className="border-t border-slate-100 pt-6">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-2.5">Featured Collections</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: 'Bridal Sarees', href: '/shop?filter=Bridal+Sarees' },
                { label: 'Kanchipuram Silk', href: '/shop?filter=Kanchipuram+Silk' },
                { label: 'Banarasi Silk', href: '/shop?filter=Banarasi+Silk' },
                { label: 'Party Wear', href: '/shop?filter=Party+Wear' },
              ].map(c => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-50 hover:bg-[#FDF6F0] text-slate-600 hover:text-[#8B1A1A] border border-slate-200 hover:border-[#8B1A1A]/30 transition-colors font-medium no-underline"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* Visual Stepper */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-2">
        <button
          type="button"
          onClick={() => setActiveStep('contact')}
          className="flex items-center gap-2.5 text-left transition-opacity"
        >
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            activeStep === 'contact'
              ? 'bg-[#8B1A1A] text-white shadow-sm'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {activeStep === 'contact' ? '1' : '✓'}
          </span>
          <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
            activeStep === 'contact' ? 'text-[#8B1A1A]' : 'text-slate-600 hover:text-[#8B1A1A]'
          }`}>
            Contact
          </span>
        </button>

        <div className="h-0.5 flex-1 max-w-[40px] sm:max-w-[60px] bg-slate-200 mx-2" />

        <button
          type="button"
          onClick={() => { if (email) setActiveStep('shipping') }}
          className={`flex items-center gap-2.5 text-left transition-opacity ${!email ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            activeStep === 'shipping'
              ? 'bg-[#8B1A1A] text-white shadow-sm'
              : activeStep === 'payment'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-400'
          }`}>
            {activeStep === 'payment' ? '✓' : '2'}
          </span>
          <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
            activeStep === 'shipping' ? 'text-[#8B1A1A]' : activeStep === 'payment' ? 'text-slate-600 hover:text-[#8B1A1A]' : 'text-slate-400'
          }`}>
            Delivery
          </span>
        </button>

        <div className="h-0.5 flex-1 max-w-[40px] sm:max-w-[60px] bg-slate-200 mx-2" />

        <div className="flex items-center gap-2.5 text-left">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            activeStep === 'payment'
              ? 'bg-[#8B1A1A] text-white shadow-sm'
              : 'bg-slate-100 text-slate-400'
          }`}>
            3
          </span>
          <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
            activeStep === 'payment' ? 'text-[#8B1A1A]' : 'text-slate-400'
          }`}>
            Payment
          </span>
        </div>
      </div>

      {/* 1. Contact Info */}
      <div className="border-b border-slate-200/80 pb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-[#0F172A]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B1A1A] text-[10px] font-bold text-white">1</span>
            Contact Information
          </h2>
          {activeStep !== 'contact' && (
            <button onClick={() => setActiveStep('contact')} className="text-xs font-bold uppercase tracking-wider text-[#8B1A1A] hover:underline">
              Edit
            </button>
          )}
        </div>

        {activeStep === 'contact' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Email Address <span className="text-red-500">*</span></label>
              {!session && <Link href="/login" className="text-xs font-semibold text-[#8B1A1A] hover:underline">Log in</Link>}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailTouched) setEmailError(!e.target.value.trim() ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value.trim()) ? 'Enter a valid email' : '') }}
              onBlur={() => { setEmailTouched(true); setEmailError(!email.trim() ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email' : '') }}
              placeholder="you@example.com"
              className={`w-full rounded-xl shadow-xs border px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white ${emailTouched && emailError ? 'border-red-400' : 'border-slate-200'}`}
            />
            {emailTouched && emailError && <p className="mt-1 text-xs text-red-500 font-medium">{emailError}</p>}

            <label className="mt-4 flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#8B1A1A] focus:ring-[#8B1A1A] accent-[#8B1A1A]" defaultChecked />
              <span className="text-xs text-slate-600 font-medium">Keep me updated with order tracking & exclusive festive drops</span>
            </label>

            <button
              onClick={() => { setEmailTouched(true); const err = !email.trim() ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email' : ''; setEmailError(err); if (!err) handleNext('shipping') }}
              className="mt-5 w-full rounded-xl bg-[#8B1A1A] py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#721226] sm:w-auto sm:px-8 cursor-pointer"
            >
              Continue to Delivery →
            </button>
          </div>
        )}
        {activeStep !== 'contact' && (
          <div className="text-sm font-medium text-slate-600 bg-slate-50 px-3.5 py-2 rounded-lg inline-block">
            {email || 'Not provided'}
          </div>
        )}
      </div>

      {/* 2. Shipping Address */}
      <div className={`border-b border-slate-200/80 pb-5 transition-opacity duration-300 ${activeStep === 'contact' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-[#0F172A]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B1A1A] text-[10px] font-bold text-white">2</span>
            Delivery Address
          </h2>
          {activeStep === 'payment' && (
            <button onClick={() => setActiveStep('shipping')} className="text-xs font-bold uppercase tracking-wider text-[#8B1A1A] hover:underline">
              Edit
            </button>
          )}
        </div>

        {activeStep === 'shipping' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Saved Addresses</p>
                <div className="space-y-2">
                  {savedAddresses.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectAddress(addr)}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-[#8B1A1A] bg-[#FDF6F0]/60 ring-1 ring-[#8B1A1A]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8B1A1A]" />
                        <div className="min-w-0 text-sm">
                          <span className="font-semibold text-slate-800">{addr.firstName} {addr.lastName || ''}</span>
                          {addr.isDefault && <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-[#8B1A1A] bg-[#FDF6F0] px-2 py-0.5 rounded-md border border-[#8B1A1A]/20">Default</span>}
                          <p className="text-xs text-slate-500 mt-0.5">{addr.address}, {addr.city}, {addr.state} — {addr.pincode}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <input
                  type="text"
                  placeholder="First name *"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); if (shipTouched.firstName) setShipErrors(p => ({ ...p, firstName: validateShipField('firstName', e.target.value) })) }}
                  onBlur={() => handleShipBlur('firstName')}
                  className={`w-full rounded-xl shadow-xs border px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white ${shipTouched.firstName && shipErrors.firstName ? 'border-red-400' : 'border-slate-200'}`}
                />
                {shipTouched.firstName && shipErrors.firstName && <p className="mt-1 text-xs text-red-500 font-medium">{shipErrors.firstName}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full rounded-xl shadow-xs border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Address (House No., Building, Street) *"
                  value={address}
                  onChange={e => { setAddress(e.target.value); if (shipTouched.address) setShipErrors(p => ({ ...p, address: validateShipField('address', e.target.value) })) }}
                  onBlur={() => handleShipBlur('address')}
                  className={`w-full rounded-xl shadow-xs border px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white ${shipTouched.address && shipErrors.address ? 'border-red-400' : 'border-slate-200'}`}
                />
                {shipTouched.address && shipErrors.address && <p className="mt-1 text-xs text-red-500 font-medium">{shipErrors.address}</p>}
              </div>
              <div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="City *"
                    value={city}
                    onChange={e => { setCity(e.target.value); if (shipTouched.city) setShipErrors(p => ({ ...p, city: validateShipField('city', e.target.value) })) }}
                    onBlur={() => handleShipBlur('city')}
                    className={`w-full rounded-xl shadow-xs border px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white ${shipTouched.city && shipErrors.city ? 'border-red-400' : 'border-slate-200'}`}
                  />
                  {pincodeAutoFilled && city && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Auto-filled</span>
                  )}
                </div>
                {shipTouched.city && shipErrors.city && <p className="mt-1 text-xs text-red-500 font-medium">{shipErrors.city}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="State *"
                  value={state}
                  onChange={e => { setState(e.target.value); if (shipTouched.state) setShipErrors(p => ({ ...p, state: validateShipField('state', e.target.value) })) }}
                  onBlur={() => handleShipBlur('state')}
                  className={`w-full rounded-xl shadow-xs border px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white ${shipTouched.state && shipErrors.state ? 'border-red-400' : 'border-slate-200'}`}
                />
                {shipTouched.state && shipErrors.state && <p className="mt-1 text-xs text-red-500 font-medium">{shipErrors.state}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Pincode *"
                  value={pincode}
                  onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setPincode(v); if (shipTouched.pincode) setShipErrors(p => ({ ...p, pincode: validateShipField('pincode', v) })) }}
                  onBlur={() => handleShipBlur('pincode')}
                  maxLength={6}
                  className={`w-full rounded-xl shadow-xs border px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white ${shipTouched.pincode && shipErrors.pincode ? 'border-red-400' : 'border-slate-200'}`}
                />
                {shipTouched.pincode && shipErrors.pincode && <p className="mt-1 text-xs text-red-500 font-medium">{shipErrors.pincode}</p>}
                {deliveryChecking && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin text-[#8B1A1A]" /> Checking delivery availability…
                  </p>
                )}
                {deliveryInfo && !deliveryChecking && (
                  <div className={`mt-2.5 p-3 rounded-xl border text-xs leading-relaxed ${deliveryInfo.available ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50/70 border-rose-200 text-rose-800'}`}>
                    <p className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                      {deliveryInfo.available ? '✅ Serviceable Area' : '❌ Pincode Not Serviceable'}
                    </p>
                    {deliveryInfo.available ? (
                      <div className="space-y-0.5 font-medium text-slate-700">
                        <div><span className="text-slate-500">Selected Courier:</span> <strong>{selectedCourierName || deliveryInfo.courierName}</strong></div>
                        <div><span className="text-slate-500">Shipping:</span> {deliveryInfo.rate === 0 ? <span className="text-emerald-700 font-bold">FREE</span> : `₹${deliveryInfo.rate}`}</div>
                        {deliveryInfo.estimatedDays && (
                          <div><span className="text-slate-500">Estimated Delivery:</span> {deliveryInfo.estimatedDays}</div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-600">We do not currently deliver to pincode {pincode}. Please verify the address.</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <input
                  type="tel"
                  placeholder="Phone (10 digits) *"
                  value={phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setPhone(v); if (shipTouched.phone) setShipErrors(p => ({ ...p, phone: validateShipField('phone', v) })) }}
                  onBlur={() => handleShipBlur('phone')}
                  maxLength={10}
                  className={`w-full rounded-xl shadow-xs border px-4 py-3 text-sm outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white ${shipTouched.phone && shipErrors.phone ? 'border-red-400' : 'border-slate-200'}`}
                />
                {shipTouched.phone && shipErrors.phone && <p className="mt-1 text-xs text-red-500 font-medium">{shipErrors.phone}</p>}
              </div>
            </div>

            {/* Courier Selection Dropdown & Options */}
            {courierOptions.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-200/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Courier Partner *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowShippingPopup(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8B1A1A] hover:underline cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>Calculate / View Shipping Breakdown</span>
                  </button>
                </div>

                {/* Dropdown Field */}
                <select
                  value={selectedCourierCode}
                  onChange={e => handleSelectCourier(e.target.value)}
                  className="w-full rounded-xl shadow-xs border border-slate-200 px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/20 bg-white text-slate-800"
                >
                  {courierOptions.map(c => (
                    <option key={c.id} value={c.code}>
                      {c.name} — {c.rate === 0 ? 'FREE Shipping' : `₹${c.rate}`} ({c.estimatedDays})
                    </option>
                  ))}
                </select>

                {/* Quick Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {courierOptions.map(c => {
                    const isSelected = c.code === selectedCourierCode
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCourier(c.code)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-[#8B1A1A] bg-[#FDF6F0]/60 ring-1 ring-[#8B1A1A]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="courier_option"
                            checked={isSelected}
                            onChange={() => handleSelectCourier(c.code)}
                            className="accent-[#8B1A1A]"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{c.name}</p>
                            <p className="text-[11px] text-slate-500">{c.estimatedDays}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold ${c.rate === 0 ? 'text-emerald-700 font-extrabold' : 'text-slate-900'}`}>
                            {c.rate === 0 ? 'FREE' : `₹${c.rate}`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => handleNext('payment')}
              className="mt-6 w-full rounded-xl bg-[#8B1A1A] py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#721226] sm:w-auto sm:px-8 cursor-pointer"
            >
              Continue to Payment →
            </button>
          </div>
        )}
        {activeStep === 'payment' && (
          <div className="text-sm font-medium text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-lg flex items-center justify-between">
            <span>{address ? `${address}, ${city}, ${state} — ${pincode}` : 'Not provided'}</span>
            <button
              type="button"
              onClick={() => setShowShippingPopup(true)}
              className="text-xs font-bold text-[#8B1A1A] hover:underline inline-flex items-center gap-1 ml-2 cursor-pointer"
            >
              <Truck className="h-3 w-3" />
              <span>Change Courier</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Payment Method (Online Payment Only - COD Removed) */}
      <div className={`transition-opacity duration-300 ${activeStep !== 'payment' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-[#0F172A]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B1A1A] text-[10px] font-bold text-white">3</span>
            Payment Method
          </h2>
        </div>

        {activeStep === 'payment' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <p className="mb-4 text-xs font-medium text-slate-500">All orders are processed securely online. We do not offer Cash on Delivery.</p>

            {/* Online Payment Dedicated Trust Card */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#8B1A1A]/30 bg-gradient-to-br from-[#FDF6F0] to-white shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#8B1A1A] text-white flex items-center justify-center shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Online Payment</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                        Fast & 100% Secure
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">UPI, Cards, Net Banking — Instant artisan confirmation</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span className="font-medium">Supported Payment Modes:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs">
                    UPI (Google Pay, PhonePe, Paytm)
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs">
                    Credit & Debit Cards
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-2xs">
                    Net Banking
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7">
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
                  {error}
                </div>
              )}
              {deliveryInfo && !deliveryInfo.available && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 font-medium">
                  Delivery is not currently available to pincode {pincode}. Please update your delivery address.
                </div>
              )}
              <button
                onClick={handlePlaceOrder}
                disabled={isLoading || (deliveryInfo != null && !deliveryInfo.available)}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#8B1A1A] py-4 text-sm sm:text-base font-bold uppercase tracking-wider text-white shadow-md shadow-[#8B1A1A]/20 transition-all hover:bg-[#721226] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Secure Order...
                  </>
                ) : (
                  <>
                    <Lock size={18} strokeWidth={2.5} />
                    Proceed to Secure Payment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* Shipping Calculation Popup Modal */}
      <ShippingPopup
        isOpen={showShippingPopup}
        onClose={() => setShowShippingPopup(false)}
        currentState={state}
        pincode={pincode}
        subtotal={checkoutSubtotal}
        selectedCourierCode={selectedCourierCode}
        onSelectCourier={chosen => {
          setSelectedCourierCode(chosen.code)
          setSelectedCourierName(chosen.name)
          setShippingTotal(chosen.rate)
          setDeliveryInfo({
            available: true,
            rate: chosen.rate,
            estimatedDays: chosen.estimatedDays,
            courierName: chosen.name,
          })
          setShippingCalculated(true)
        }}
        onConfirmProceed={async () => {
          setShowShippingPopup(false)
          await handlePlaceOrder()
        }}
        isProcessing={isLoading}
      />
    </div>
    </>
  )
}
