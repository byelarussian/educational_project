const GUEST_CART_KEY = 'fam_guest_cart'

/**
 * Читает гостевую корзину из localStorage.
 * @returns {{ items: Array, total: string, count: number }}
 */
export function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY)
    if (!raw) return emptyCart()
    const parsed = JSON.parse(raw)
    return normalizeCart(Array.isArray(parsed?.items) ? parsed.items : [])
  } catch {
    return emptyCart()
  }
}

/**
 * Пишет позиции гостевой корзины в localStorage и возвращает нормализованный снимок.
 */
export function writeGuestCart(items) {
  const next = normalizeCart(items)
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ items: next.items }))
  return next
}

/** Очищает гостевую корзину. */
export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY)
  return emptyCart()
}

/**
 * Добавляет товар выбранного размера в гостевую корзину.
 * Одинаковые product_id + size увеличивают quantity.
 */
export function addGuestCartItem({ product, size, quantity = 1, unitPrice }) {
  const current = readGuestCart().items
  const sizeValue = String(size || '').trim()
  const price = Number(unitPrice)
  const existing = current.find(
    (item) => item.product?.id === product.id && item.size === sizeValue,
  )

  let nextItems
  if (existing) {
    nextItems = current.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            quantity: item.quantity + quantity,
            line_total: String((item.quantity + quantity) * Number(item.product.price)),
          }
        : item,
    )
  } else {
    const snapshot = {
      id: `guest-${product.id}-${sizeValue}-${Date.now()}`,
      size: sizeValue,
      quantity,
      line_total: String(quantity * price),
      product: {
        id: product.id,
        title: product.title,
        image_url: product.image_url || '',
        price: String(price),
        currency: product.currency || '₽',
        brand: product.brand || '',
        product_url: product.product_url || '',
      },
    }
    nextItems = [snapshot, ...current]
  }

  return writeGuestCart(nextItems)
}

/** Меняет количество позиции гостевой корзины. */
export function updateGuestCartItem(id, quantity) {
  const qty = Math.max(1, Number(quantity) || 1)
  const nextItems = readGuestCart().items.map((item) => {
    if (item.id !== id) return item
    const price = Number(item.product?.price) || 0
    return {
      ...item,
      quantity: qty,
      line_total: String(qty * price),
    }
  })
  return writeGuestCart(nextItems)
}

/** Удаляет позицию из гостевой корзины. */
export function removeGuestCartItem(id) {
  return writeGuestCart(readGuestCart().items.filter((item) => item.id !== id))
}

function emptyCart() {
  return { items: [], total: '0', count: 0 }
}

function normalizeCart(items) {
  const safeItems = items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity) || 1)
    const price = Number(item.product?.price) || 0
    return {
      ...item,
      size: item.size || '',
      quantity,
      line_total: String(quantity * price),
    }
  })
  const total = safeItems.reduce((sum, item) => sum + Number(item.line_total), 0)
  const count = safeItems.reduce((sum, item) => sum + item.quantity, 0)
  return {
    items: safeItems,
    total: String(total),
    count,
  }
}
