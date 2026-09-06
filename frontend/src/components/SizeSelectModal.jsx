import { useEffect, useState } from 'react'

/** Типовые размеры головных уборов (см), как на витринах FAM.CAP. */
const HAT_SIZES = ['55', '56', '57', '58', '59', '60', '61', '62']

/**
 * Содержимое модалки размера — состояние сбрасывается при каждом открытии через key.
 */
function SizeSelectModalContent({ product, onClose, onConfirm }) {
  const [size, setSize] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleConfirm() {
    if (!size) {
      setError('Выберите размер')
      return
    }
    onConfirm(size)
  }

  return (
    <div className="store-size-modal" role="dialog" aria-modal="true" aria-labelledby="store-size-title">
      <button type="button" className="store-size-modal__backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="store-size-modal__panel">
        <button type="button" className="store-size-modal__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2 id="store-size-title">Выберите размер</h2>
        <p className="store-size-modal__product">{product.title}</p>
        <div className="store-size-modal__sizes">
          {HAT_SIZES.map((value) => (
            <button
              key={value}
              type="button"
              className={size === value ? 'is-active' : ''}
              onClick={() => {
                setSize(value)
                setError('')
              }}
            >
              {value}
            </button>
          ))}
        </div>
        {error ? <p className="store-size-modal__error">{error}</p> : null}
        <button type="button" className="store-size-modal__submit" onClick={handleConfirm}>
          В корзину
        </button>
      </div>
    </div>
  )
}

/**
 * Модалка выбора размера перед добавлением в корзину.
 * Закрывается по Escape, фону и крестику.
 */
export default function SizeSelectModal({ open, product, onClose, onConfirm }) {
  if (!open || !product) return null

  return (
    <SizeSelectModalContent
      key={product.id}
      product={product}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}
