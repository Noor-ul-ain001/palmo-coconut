import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const BasketContext = createContext(null)

export const MAX_QTY = 12
export const FREE_SHIPPING_AT = 45

export function BasketProvider({ children }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  // Which line was touched last, so the drawer can flash just that row.
  const [lastTouched, setLastTouched] = useState(null)

  const addItem = useCallback((item) => {
    const key = `${item.flavourId}-${item.packId}`
    setItems((prev) => {
      const existing = prev.find((p) => p.key === key)
      if (existing) {
        return prev.map((p) =>
          p.key === key ? { ...p, qty: Math.min(MAX_QTY, p.qty + 1) } : p
        )
      }
      return [...prev, { ...item, key, qty: 1 }]
    })
    setLastTouched(key)
  }, [])

  const setQty = useCallback((key, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((p) => p.key !== key)
        : prev.map((p) => (p.key === key ? { ...p, qty: Math.min(MAX_QTY, qty) } : p))
    )
    setLastTouched(key)
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((p) => p.key !== key))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])
  const total = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.price, 0), [items])
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_AT - total)

  const value = useMemo(
    () => ({
      items,
      addItem,
      setQty,
      removeItem,
      clear,
      count,
      total,
      remainingForFreeShipping,
      isOpen,
      open,
      close,
      lastTouched,
    }),
    [
      items,
      addItem,
      setQty,
      removeItem,
      clear,
      count,
      total,
      remainingForFreeShipping,
      isOpen,
      open,
      close,
      lastTouched,
    ]
  )

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
}

export function useBasket() {
  const ctx = useContext(BasketContext)
  if (!ctx) throw new Error('useBasket must be used within BasketProvider')
  return ctx
}
