'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type CheckoutContextType = {
  shippingTotal: number
  setShippingTotal: (val: number) => void
  shippingCalculated: boolean
  setShippingCalculated: (val: boolean) => void
  isProcessing: boolean
  setIsProcessing: (val: boolean) => void
  paymentMethod: string
  setPaymentMethod: (val: string) => void
  razorpayOrderId: string | null
  setRazorpayOrderId: (val: string | null) => void
  couponCode: string | null
  setCouponCode: (val: string | null) => void
  couponDiscount: number
  setCouponDiscount: (val: number) => void
  couponLabel: string
  setCouponLabel: (val: string) => void
  couponDescription: string | null
  setCouponDescription: (val: string | null) => void
  selectedCourierName: string
  setSelectedCourierName: (val: string) => void
  selectedCourierCode: string
  setSelectedCourierCode: (val: string) => void
}

const CheckoutContext = createContext<CheckoutContextType | null>(null)

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [shippingTotal, setShippingTotal] = useState(0)
  const [shippingCalculated, setShippingCalculated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponLabel, setCouponLabel] = useState('')
  const [couponDescription, setCouponDescription] = useState<string | null>(null)
  const [selectedCourierName, setSelectedCourierName] = useState('')
  const [selectedCourierCode, setSelectedCourierCode] = useState('')

  return (
    <CheckoutContext.Provider value={{
      shippingTotal, setShippingTotal,
      shippingCalculated, setShippingCalculated,
      isProcessing, setIsProcessing,
      paymentMethod, setPaymentMethod,
      razorpayOrderId, setRazorpayOrderId,
      couponCode, setCouponCode,
      couponDiscount, setCouponDiscount,
      couponLabel, setCouponLabel,
      couponDescription, setCouponDescription,
      selectedCourierName, setSelectedCourierName,
      selectedCourierCode, setSelectedCourierCode,
    }}>
      {children}
    </CheckoutContext.Provider>
  )
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider')
  return ctx
}
