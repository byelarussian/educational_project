const CART_ICON_SRC = '/icons/cart.jpg'

/**
 * Иконка корзины в шапке: изображение с Pinterest, размер как у прежнего SVG (24×24).
 */
export default function StoreCartIcon() {
  return (
    <img
      className="store-cart__icon"
      src={CART_ICON_SRC}
      alt=""
      width={24}
      height={24}
      decoding="async"
    />
  )
}
