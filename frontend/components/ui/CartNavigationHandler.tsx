'use client'

import { useEffect } from 'react'

export default function CartNavigationHandler() {
  useEffect(() => {
    function handleCartClick(event: MouseEvent) {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      const control = target.closest('a, button')

      if (!(control instanceof HTMLElement)) {
        return
      }

      const href = control instanceof HTMLAnchorElement ? control.getAttribute('href') ?? '' : ''
      const label = [
        control.getAttribute('aria-label'),
        control.getAttribute('title'),
        control.textContent,
        control.className,
        href,
      ]
        .join(' ')
        .toLowerCase()

      if (label.includes('add to cart')) {
        return
      }

      const isCartControl =
        label.includes('cart') ||
        label.includes('bag') ||
        href === '/cart' ||
        href.endsWith('/cart') ||
        href.includes('cart')

      if (!isCartControl) {
        return
      }

      event.preventDefault()

      if (window.location.pathname !== '/cart') {
        window.location.href = '/cart'
      }
    }

    document.addEventListener('click', handleCartClick, true)

    return () => {
      document.removeEventListener('click', handleCartClick, true)
    }
  }, [])

  return null
}
