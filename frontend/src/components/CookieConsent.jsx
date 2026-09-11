import { useEffect, useState } from 'react'
import '../styles/CookieConsent.css'

const STORAGE_KEY = 'fam_cookie_consent'

const DEFAULT_PREFS = {
  necessary: true,
  analytics: false,
  marketing: false,
}

function readConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveConsent(decision, prefs = DEFAULT_PREFS) {
  const payload = {
    decision,
    prefs: { ...DEFAULT_PREFS, ...prefs, necessary: true },
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  return payload
}

/**
 * Всплывающее окно согласия на cookies в духе answear.ua:
 * принять / отклонить / настройки категорий.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)

  useEffect(() => {
    const existing = readConsent()
    if (!existing) {
      setVisible(true)
      return undefined
    }

    function handleOpenSettings() {
      setPrefs(existing.prefs || DEFAULT_PREFS)
      setShowSettings(true)
      setVisible(true)
    }

    window.addEventListener('fam:open-cookie-settings', handleOpenSettings)
    return () => window.removeEventListener('fam:open-cookie-settings', handleOpenSettings)
  }, [])

  function closeBanner() {
    setVisible(false)
    setShowSettings(false)
  }

  function handleAccept() {
    saveConsent('accepted', { necessary: true, analytics: true, marketing: true })
    closeBanner()
  }

  function handleReject() {
    saveConsent('rejected', { necessary: true, analytics: false, marketing: false })
    closeBanner()
  }

  function handleSaveSettings() {
    saveConsent('custom', prefs)
    closeBanner()
  }

  if (!visible) return null

  return (
    <div className="cookie-consent" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent__backdrop" aria-hidden="true" />
      <div className="cookie-consent__panel">
        <button
          type="button"
          className="cookie-consent__close"
          aria-label="Закрыть"
          onClick={handleReject}
        >
          ×
        </button>

        {!showSettings ? (
          <>
            <h2 id="cookie-consent-title">Файлы cookies на FAM.CAP</h2>
            <p>
              Мы используем файлы cookie, чтобы сайт работал корректно. Мы и наши партнёры также можем
              использовать дополнительные cookie для аналитики и персонализации. Для этого нужна ваша
              согласие — нажмите «Принимаю». Если не согласны — нажмите «Отклонить». Чтобы выбрать
              категории вручную, откройте «Настройки». Согласие можно изменить в любой момент через
              ссылку «Ваши cookies» в подвале сайта.
            </p>
            <p className="cookie-consent__links">
              <button type="button" className="cookie-consent__text-link" onClick={() => setShowSettings(true)}>
                Политика cookies
              </button>
              <span>·</span>
              <a href="#legal-privacy" onClick={(event) => event.preventDefault()}>
                Политика конфиденциальности
              </a>
            </p>
            <div className="cookie-consent__actions">
              <button type="button" className="cookie-consent__btn cookie-consent__btn--primary" onClick={handleAccept}>
                Принимаю
              </button>
              <button type="button" className="cookie-consent__btn" onClick={handleReject}>
                Отклонить
              </button>
              <button type="button" className="cookie-consent__btn" onClick={() => setShowSettings(true)}>
                Настройки
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="cookie-consent-title">Настройки cookies</h2>
            <p>Выберите, какие категории cookie разрешены. Необходимые cookie всегда включены.</p>

            <ul className="cookie-consent__prefs">
              <li>
                <div>
                  <strong>Необходимые</strong>
                  <span>Нужны для работы сайта, корзины и безопасности.</span>
                </div>
                <input type="checkbox" checked disabled readOnly />
              </li>
              <li>
                <div>
                  <strong>Аналитика</strong>
                  <span>Помогают понять, как вы пользуетесь магазином.</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(event) => setPrefs((current) => ({ ...current, analytics: event.target.checked }))}
                />
              </li>
              <li>
                <div>
                  <strong>Маркетинг</strong>
                  <span>Используются для персонализации предложений и рекламы.</span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(event) => setPrefs((current) => ({ ...current, marketing: event.target.checked }))}
                />
              </li>
            </ul>

            <div className="cookie-consent__actions">
              <button type="button" className="cookie-consent__btn cookie-consent__btn--primary" onClick={handleSaveSettings}>
                Сохранить настройки
              </button>
              <button type="button" className="cookie-consent__btn" onClick={() => setShowSettings(false)}>
                Назад
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Открывает окно настроек cookies из футера. */
export function openCookieSettings() {
  window.dispatchEvent(new Event('fam:open-cookie-settings'))
}
