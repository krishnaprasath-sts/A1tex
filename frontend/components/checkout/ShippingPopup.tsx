'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Clock, Loader2, Lock, ShieldCheck, Truck, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

export interface CourierOption {
  code: string
  name: string
  rate: number
  estimatedDays: string
  isFreeShipping?: boolean
}

interface ShippingPopupProps {
  isOpen: boolean
  onClose: () => void
  currentState: string
  pincode?: string
  subtotal: number
  selectedCourierCode: string
  onSelectCourier: (courier: CourierOption) => void
  onConfirmProceed: () => void
  isProcessing?: boolean
}

export default function ShippingPopup({
  isOpen,
  onClose,
  currentState,
  pincode,
  subtotal,
  selectedCourierCode,
  onSelectCourier,
  onConfirmProceed,
  isProcessing = false,
}: ShippingPopupProps) {
  const [activeState, setActiveState] = useState(currentState || 'Tamil Nadu')
  const [isChangingState, setIsChangingState] = useState(false)
  const [couriers, setCouriers] = useState<CourierOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentState) {
      setActiveState(currentState)
    }
  }, [currentState])

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    async function loadRates() {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch<{
          state?: string
          shippingOptions?: Array<{
            id: string
            name: string
            code: string
            rate: number
            estimatedDays: string
            isFreeShipping?: boolean
          }>
        }>(
          '/storefront/orders/calculate-shipping',
          {
            method: 'POST',
            body: JSON.stringify({
              pincode: pincode || undefined,
              state: activeState,
              subtotal,
              cod: false,
            }),
          },
        )

        if (cancelled) return

        if (res.shippingOptions && res.shippingOptions.length > 0) {
          const list: CourierOption[] = res.shippingOptions.map(c => ({
            code: c.code,
            name: c.name,
            rate: c.rate,
            estimatedDays: c.estimatedDays,
            isFreeShipping: c.isFreeShipping,
          }))
          setCouriers(list)

          // If current selected courier is not in the options or not set, select the first one
          const match = list.find(c => c.code === selectedCourierCode) || list[0]
          if (match) {
            onSelectCourier(match)
          }
        } else {
          // Fallback call to /storefront/shipping-charge?state=...
          try {
            const chargeRes = await apiFetch<{
              state: string
              rates: Array<{
                courier: string
                courierName: string
                amount: number
                estimatedDays: string
              }>
            }>(`/storefront/shipping-charge?state=${encodeURIComponent(activeState)}`)

            if (cancelled) return
            if (chargeRes.rates && chargeRes.rates.length > 0) {
              const list: CourierOption[] = chargeRes.rates.map(r => ({
                code: r.courier,
                name: r.courierName,
                rate: r.amount,
                estimatedDays: r.estimatedDays,
              }))
              setCouriers(list)
              const match = list.find(c => c.code === selectedCourierCode) || list[0]
              if (match) {
                onSelectCourier(match)
              }
            }
          } catch {
            setError('Could not retrieve shipping rates for this state.')
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to fetch shipping rates. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRates()

    return () => {
      cancelled = true
    }
  }, [isOpen, activeState, pincode, subtotal])

  if (!isOpen) return null

  const selectedCourier = couriers.find(c => c.code === selectedCourierCode) || couriers[0]
  const currentShippingFee = selectedCourier ? selectedCourier.rate : 0
  const finalTotal = subtotal + currentShippingFee

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200/80 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-[#6B1110] via-[#8B1A1A] to-[#A32323] px-6 py-4 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Truck className="h-4 w-4 text-[#F5E6C8]" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Shipping & Courier Selection</h3>
              <p className="text-[11px] text-stone-200">Select your preferred courier partner for delivery</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {/* Delivery Location Banner */}
          <div className="flex items-center justify-between bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-stone-500 font-medium">Delivering to:</span>
              <span className="font-bold text-stone-900">{activeState}</span>
              {pincode && <span className="text-stone-400">({pincode})</span>}
            </div>
            <button
              type="button"
              onClick={() => setIsChangingState(!isChangingState)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B1A1A] hover:underline cursor-pointer"
            >
              <span>{isChangingState ? 'Done' : 'Change State'}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isChangingState ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* State Selector Dropdown if open */}
          {isChangingState && (
            <div className="p-3 bg-stone-100/80 rounded-xl border border-stone-200 animate-in fade-in slide-in-from-top-2 duration-150">
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Select Destination State / UT:
              </label>
              <select
                value={activeState}
                onChange={e => {
                  setActiveState(e.target.value)
                  setIsChangingState(false)
                }}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-900 outline-none focus:border-[#8B1A1A] focus:ring-1 focus:ring-[#8B1A1A]"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Courier Options List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Available Courier Services
              </span>
              <span className="text-[11px] text-stone-400">
                {couriers.length} options for {activeState}
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                <Loader2 className="h-6 w-6 animate-spin text-[#8B1A1A]" />
                <span className="text-xs text-stone-500 font-medium">Calculating dynamic shipping charges...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            ) : couriers.length === 0 ? (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 text-center">
                No courier services found for this state. Please verify the state name.
              </div>
            ) : (
              <div className="space-y-2.5">
                {couriers.map(c => {
                  const isSelected = c.code === selectedCourier?.code
                  return (
                    <div
                      key={c.code}
                      onClick={() => onSelectCourier(c)}
                      className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#8B1A1A] bg-[#FDF6F0] ring-1.5 ring-[#8B1A1A] shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-[#8B1A1A] bg-[#8B1A1A] text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900">{c.name}</span>
                            {c.rate === 40 && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Best Value
                              </span>
                            )}
                            {c.rate === 70 && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                All-India Flat
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>Estimated: {c.estimatedDays || '2-4 business days'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold text-stone-900">
                          {c.rate === 0 ? (
                            <span className="text-emerald-700 font-bold">FREE</span>
                          ) : (
                            `₹${c.rate}`
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 font-medium">Standard charge</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Price Summary Breakdown */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/90 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-stone-800">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Courier Delivery ({selectedCourier?.name || 'Selected'}):</span>
              <span className="font-semibold text-stone-800">
                {currentShippingFee === 0 ? (
                  <span className="text-emerald-700 font-bold">FREE</span>
                ) : (
                  `₹${currentShippingFee}`
                )}
              </span>
            </div>
            <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-bold text-stone-900">
              <span>Total Payable:</span>
              <span className="text-[#8B1A1A] text-base font-extrabold">
                ₹{finalTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* 100% Online Payment & Security Trust Notice */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-emerald-900 text-xs">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
            <div className="leading-tight">
              <span className="font-bold">100% Secure Online Payment</span>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Pay instantly via UPI (GPay, PhonePe, Paytm), Cards, or Net Banking.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 rounded-xl border border-stone-300 py-3 text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-stone-50 transition cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onConfirmProceed}
              disabled={isProcessing || loading || couriers.length === 0}
              className="w-full sm:w-2/3 flex items-center justify-center gap-2 rounded-xl bg-[#8B1A1A] py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-[#8B1A1A]/20 transition-all hover:bg-[#721226] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting to Razorpay...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Confirm & Pay ₹{finalTotal.toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
