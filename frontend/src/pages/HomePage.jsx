import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StoreProductCard from '../components/StoreProductCard.jsx'
import StoreAccountMenu from '../components/StoreAccountMenu.jsx'
import { fetchProducts, fetchProductsByCategory } from '../api'
import '../styles/HomePage.css'

const HERO_SLIDES = [
  {
    title: 'Новинки сезона',
    subtitle: "New Era, '47, American Needle, Goorin Brothers",
    cta: 'Выбрать ту самую бейсболку',
    image: 'https://famshop.ru/wp-content/cache/thumb/6c/486483ccda5c46c_3840x2060.jpg',
  },
  {
    title: 'Новинки лето 2026',
    subtitle: 'Свежий дроп головных уборов',
    cta: 'Смотреть новинки',
    image: 'https://famshop.ru/wp-content/cache/thumb/51/c6aeb625b12e251_3840x2060.jpg',
  },
  {
    title: 'Собери свой кастом',
    subtitle: 'FAM.CAP 10th Anniversary',
    cta: 'В магазин на Бауманской',
    image: 'https://famshop.ru/wp-content/cache/thumb/5b/69eb4aca0e6b55b_3840x2060.jpg',
  },
  {
    title: "Новинки Kangol SS'26",
    subtitle: 'На кенгуру не обижаемся',
    cta: 'Смотреть Kangol',
    image: 'https://famshop.ru/wp-content/cache/thumb/ff/a04e72d66f272ff_3840x2060.jpg',
  },
  {
    title: 'Юбилейный дроп футболок',
    subtitle: 'FAM.CAP 10th Anniversary',
    cta: 'Выбрать футболку',
    image: 'https://famshop.ru/wp-content/cache/thumb/34/3e67ff10eb0d034_3840x2060.jpg',
  },
  {
    title: 'ЛОНГСЛИВЫ «Мои псы/Maaa Dogs»',
    subtitle: 'В отпуск на Бауманской 9',
    cta: 'В каталог',
    image: 'https://famshop.ru/wp-content/cache/thumb/4e/07580fbad2a514e_3840x2060.jpg',
  },
  {
    title: '-20% на все шапки',
    subtitle: 'Только оригиналы',
    cta: 'К скидкам',
    image: 'https://famshop.ru/wp-content/cache/thumb/2d/ea066794f6ed82d_3840x2060.jpg',
  },
]

const BRANDS = ['FAM.CAP', 'New Era', 'Kangol', "'47", 'American Needle', 'Goorin Brothers', 'Flexfit', 'Carhartt WIP']

const CATEGORY_CARDS = [
  {
    title: 'Kangol',
    tag: '🦘',
    image: 'https://famshop.ru/wp-content/cache/thumb/b7/cd63c77a08405b7_370x180.jpg',
  },
  {
    title: 'New Era',
    image: 'https://famshop.ru/wp-content/cache/thumb/6e/aac224fdbce586e_370x180.jpg',
  },
  {
    title: 'FAM.CAP',
    tag: 'Локал',
    highlight: true,
    image: 'https://famshop.ru/wp-content/cache/thumb/87/8af6e536489a887_370x180.jpg',
  },
  {
    title: "'47",
    image: 'https://famshop.ru/wp-content/cache/thumb/eb/114b8ca6280d5eb_370x180.jpg',
  },
  {
    title: 'В отпуск',
    tag: 'с сеткой',
    image: 'https://famshop.ru/wp-content/cache/thumb/c2/8a758b4e935b9c2_370x180.jpg',
  },
]

const ARTICLES = [
  {
    title: 'История популярности логотипа NY Yankees',
    date: '10.07.2026',
    image: 'https://famshop.ru/wp-content/cache/thumb/d8/19672f95c5c1dd8_670x730.png',
    href: 'https://famshop.ru/blog/istoriya-vozniknoveniya-populyarnogo-logotipa-ny-do-komandy-ny-yankees/',
  },
  {
    title: 'Бейсболка: твой главный must-have 2026 года',
    date: '17.06.2026',
    image: 'https://famshop.ru/wp-content/cache/thumb/e0/5f082387e20dae0_670x730.jpg',
    href: 'https://famshop.ru/blog/beysbolka-vse-o-vidakh-vybore-materialakh-i-modnykh-trendakh-2026/',
  },
  {
    title: 'Все виды бейсболок: полный гид по стилям и выбору',
    date: '17.06.2026',
    image: 'https://famshop.ru/wp-content/cache/thumb/f1/df78aba3e4bb1f1_670x730.jpg',
    href: 'https://famshop.ru/blog/vse-vidy-beysbolok-polnyy-gid-po-nazvaniyam-stilyam-i-vyboru-idealnoy-modeli-2026/',
  },
]

/**
 * Проверяет, подходит ли товар под строку поиска (название, бренд, тег, без учёта регистра).
 */
function matchesQuery(product, query) {
  const haystack = `${product.title} ${product.brand} ${product.tag}`.toLowerCase()
  return haystack.includes(query)
}

/**
 * Главная витрина FAM.CAP: шапка, слайдер, каталог с API, поиск, подписка и добавление в корзину.
 */
export default function HomePage({
  user,
  isAuthenticated,
  onLogout,
  onLogin,
  onRegister,
  loading,
  message,
  setMessage,
  cartCount = 0,
  onAddToCart,
}) {
  const [products, setProducts] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartNotice, setCartNotice] = useState('')
  const [legalDoc, setLegalDoc] = useState(null)

  useEffect(() => {
    if (!legalDoc) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') setLegalDoc(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [legalDoc])

  useEffect(() => {
    let cancelled = false

    /** Грузит товары группировкой by_category; если эндпоинт недоступен — берёт обычный список /products/. */
    async function loadStoreProducts() {
      try {
        const grouped = await fetchProductsByCategory()
        const list = Array.isArray(grouped)
          ? grouped.flatMap((group) => group.products || [])
          : []
        if (!cancelled) {
          setProducts(list)
        }
      } catch {
        try {
          const response = await fetchProducts({ page: 1 })
          if (!cancelled) {
            setProducts(response.results || [])
          }
        } catch {
          if (!cancelled) {
            setProducts([])
          }
        }
      }
    }

    loadStoreProducts()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % HERO_SLIDES.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return products
    return products.filter((product) => matchesQuery(product, query))
  }, [products, searchQuery])

  const novelties = filteredProducts.slice(0, 8)
  const bestsellers = filteredProducts.slice(8, 16)
  const newEraProducts = filteredProducts
    .filter((product) => (product.brand || '').toLowerCase().includes('new era') || (product.title || '').toLowerCase().includes('new era'))
    .slice(0, 8)
  const saleProducts = filteredProducts.filter((product) => (product.tag || '').toLowerCase().includes('скид')).slice(0, 8)

  /** Кладёт товар в корзину через колбэк App и на 2 секунды показывает уведомление. */
  async function handleAddProduct(product) {
    const result = await onAddToCart?.(product)
    setCartNotice(result?.ok ? 'Товар добавлен в корзину' : result?.message || '')
    window.setTimeout(() => setCartNotice(''), 2200)
  }

  const slide = HERO_SLIDES[heroIndex]

  return (
    <div className="store-page">
      <header className="store-header">
        <div className="store-header__inner">
          <Link to="/" className="store-logo" aria-label="FAM.CAP">
            <span>FAM.CAP</span>
          </Link>

          <nav className={`store-nav ${menuOpen ? 'is-open' : ''}`}>
            <a href="#novinki" className="store-nav__link store-nav__link--accent">
              Новинки
            </a>
            <a href="#catalog" className="store-nav__link">
              Головные уборы
            </a>
            <div className="store-nav__dropdown">
              <button type="button" className="store-nav__link">
                Бренды
              </button>
              <div className="store-nav__menu">
                {BRANDS.map((brand) => (
                  <a key={brand} href="#catalog">
                    {brand}
                  </a>
                ))}
              </div>
            </div>
            <a href="#sale" className="store-nav__link">
              Скидки
            </a>
            <a href="#about" className="store-nav__link">
              О нас
            </a>
          </nav>

          <a className="store-phone" href="tel:+79852332506">
            +7 (985) 233-25-06
          </a>

          <div className="store-header__actions">
            <button type="button" className="store-icon-btn" onClick={() => setSearchOpen((open) => !open)} aria-label="Поиск">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 16.5 20.5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <StoreAccountMenu
              isAuthenticated={isAuthenticated}
              user={user}
              onLogout={onLogout}
              onLogin={onLogin}
              onRegister={onRegister}
              loading={loading}
              message={message}
              setMessage={setMessage}
            />
            <Link
              className="store-icon-btn store-icon-btn--cart"
              to={isAuthenticated ? '/cabinet?tab=cart' : '/login'}
              aria-label="Корзина"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 8h12l-1 11H7L6 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 8V7a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {cartCount ? <span className="store-cart-badge">{cartCount}</span> : null}
            </Link>
            <button type="button" className="store-icon-btn store-burger" onClick={() => setMenuOpen((open) => !open)} aria-label="Меню">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {searchOpen && (
          <form
            className="store-search"
            onSubmit={(event) => {
              event.preventDefault()
              setSearchOpen(false)
            }}
          >
            <input
              type="search"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
            />
            <button type="submit">Поиск</button>
          </form>
        )}
      </header>

      <section className="store-hero">
        {HERO_SLIDES.map((item, index) => (
          <div
            key={item.title}
            className={`store-hero__slide ${index === heroIndex ? 'is-active' : ''}`}
            style={{ backgroundImage: `url(${item.image})` }}
          />
        ))}
        <div className="store-hero__content">
          <p className="store-hero__subtitle">{slide.subtitle}</p>
          <h1 className="store-hero__title">{slide.title}</h1>
          <a className="store-btn store-btn--white" href="#novinki">
            {slide.cta}
          </a>
        </div>
        <div className="store-hero__dots">
          {HERO_SLIDES.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={index === heroIndex ? 'is-active' : ''}
              onClick={() => setHeroIndex(index)}
              aria-label={`Слайд ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="store-categories" id="catalog">
        <h2 className="visually-hidden">Категории товаров</h2>
        <div className="store-categories__row">
          {CATEGORY_CARDS.map((card) => (
            <a key={card.title} className="store-category-card" href="#novinki">
              <img src={card.image} alt={card.title} />
              <span className={`store-category-card__title ${card.highlight ? 'is-highlight' : ''}`}>{card.title}</span>
              {card.tag ? <span className="store-category-card__tag">{card.tag}</span> : null}
            </a>
          ))}
        </div>
      </section>

      {cartNotice ? <p className="store-cart-notice">{cartNotice}</p> : null}

      <ProductRail
        id="novinki"
        title="Новинки"
        tag="New"
        description="Самые свежие новинки головных уборов от известных мировых брендов в FAM"
        products={novelties}
        onAddToCart={handleAddProduct}
      />

      <section className="store-about" id="about">
        <div className="store-about__media" aria-hidden="true" />
        <div className="store-about__caps" aria-hidden="true" />
        <div className="store-about__panel">
          <p className="store-about__kicker">Больше, чем магазин.</p>
          <h2>
            Твой гид в мире головных уборов
          </h2>
          <p className="store-about__text">Основан в 2016 году семьей любителей бейсболок</p>
          <a className="store-btn store-btn--white" href="#store">
            О магазине
          </a>
        </div>
      </section>

      <ProductRail
        title="Бестселлеры"
        tag="Best"
        description="Ваш выбор, лучшие из лучших"
        products={bestsellers.length ? bestsellers : novelties}
        onAddToCart={handleAddProduct}
      />

      <ProductRail
        title="New Era"
        description="Американский культовый бренд со 100-летней историей, те самые бейсболки с бейсбольных стадионов и из музыкальных клипов."
        products={newEraProducts.length ? newEraProducts : novelties}
        onAddToCart={handleAddProduct}
      />

      <ProductRail
        id="sale"
        title="Скидки"
        description="Честные цены на оригинальные модели"
        products={saleProducts.length ? saleProducts : filteredProducts.slice(-8)}
        onAddToCart={handleAddProduct}
      />

      <section className="store-dark">
        <div className="store-why">
          <p className="store-why__subtitle">Cap Lovers Club</p>
          <p className="store-why__lead">
            FAM — это семья, объединенная любовью к бейсболкам. Комьюнити настоящих ценителей головных уборов
            <span> famshop.ru</span>
          </p>
          <ul className="store-why__list">
            <li>
              <h3>100% ОРИГИНАЛ</h3>
              <p>9 лет работаем с брендами и только с проверенными поставщиками из Европы и официальными дистрибьюторами в России.</p>
            </li>
            <li>
              <h3>ПОМОГАЕМ С ВЫБОРОМ</h3>
              <p>Мы знаем о бейсболках очень много и точно подберем для тебя ту самую. Приходи в гости!</p>
            </li>
            <li>
              <h3>ЧЕСТНЫЕ ЦЕНЫ</h3>
              <p>Всегда остаемся честными и прикладываем все усилия для сохранения минимально возможных цен.</p>
            </li>
            <li>
              <h3>ЗДЕСЬ ПРО КАЧЕСТВО</h3>
              <p>Лицензионная продукция, продуманный крой и особое внимание к деталям.</p>
            </li>
          </ul>
        </div>

        <section className="store-reviews">
          <div className="store-reviews__header">
            <h2>
              Отзывы
              <small>500+ оценок</small>
              <br />
              покупателей
            </h2>
            <p className="store-reviews__rating">★★★★★ 5.0</p>
            <a href="https://yandex.ru/maps/org/fam/26251557981/reviews/" target="_blank" rel="noreferrer">
              Отзывы на Яндекс Картах
            </a>
          </div>
        </section>

        <section className="store-articles">
          <div className="store-articles__header">
            <h2>Полезные статьи</h2>
            <a href="https://famshop.ru/blog/" target="_blank" rel="noreferrer">
              Показать ещё
            </a>
          </div>
          <div className="store-articles__grid">
            {ARTICLES.map((article) => (
              <a key={article.title} className="store-article" href={article.href} target="_blank" rel="noreferrer">
                <img src={article.image} alt={article.title} />
                <h3>{article.title}</h3>
                <time>{article.date}</time>
              </a>
            ))}
          </div>
        </section>

        <section className="store-locations" id="store">
          <article className="store-location">
            <img src="https://famshop.ru/wp-content/cache/thumb/82/837caa985aa2882_3710x1230.jpg" alt="Флагманский магазин" />
            <div className="store-location__content">
              <h3>МЕТРО БАУМАНСКАЯ</h3>
              <p>
                Флагманский магазин
                <br />в Москве
              </p>
              <a
                className="store-btn store-btn--white"
                href="https://yandex.ru/maps/org/fam/26251557981/"
                target="_blank"
                rel="noreferrer"
              >
                Посмотреть на карте
              </a>
            </div>
          </article>
          <article className="store-location">
            <img src="https://famshop.ru/wp-content/cache/thumb/5b/69eb4aca0e6b55b_3710x1230.jpg" alt="Зона кастомизации" />
            <div className="store-location__content">
              <h3>В магазине на Бауманской 9</h3>
              <p>Зона кастомизации</p>
            </div>
          </article>
        </section>
      </section>

      <footer className="store-footer">
        <div className="store-footer__nav">
          <button type="button" className="store-footer__link" onClick={() => setLegalDoc('terms')}>
            Пользовательское соглашение
          </button>
          <button type="button" className="store-footer__link" onClick={() => setLegalDoc('privacy')}>
            Политика обработки персональных данных
          </button>
        </div>

        <div className="store-footer__meta">
          <a href="tel:+79852332506">+7 (985) 233-25-06</a>
          <div>
            <p>Адрес магазина</p>
            <p>г. Москва, ул. Бауманская д.9</p>
          </div>
          <div>
            <p>Время работы</p>
            <p>Ежедневно 10:00 — 22:00</p>
          </div>
          {isAuthenticated ? (
            <button type="button" className="store-footer__logout" onClick={onLogout}>
              Выйти ({user?.username})
            </button>
          ) : null}
        </div>
      </footer>

      {legalDoc ? (
        <div className="store-legal-modal" role="dialog" aria-modal="true" aria-labelledby="store-legal-title">
          <button
            type="button"
            className="store-legal-modal__backdrop"
            aria-label="Закрыть"
            onClick={() => setLegalDoc(null)}
          />
          <div className="store-legal-modal__panel">
            <button
              type="button"
              className="store-legal-modal__close"
              onClick={() => setLegalDoc(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className="store-legal-modal__content">
              {legalDoc === 'terms' ? (
                <>
                  <h2 id="store-legal-title">Пользовательское соглашение / Правила</h2>
                  <p>
                    Настоящее Пользовательское соглашение является договором между Администрацией и Пользователем,
                    в котором определены условия пользования Сайтом, а также взаимные права и обязанности сторон.
                  </p>
                  <p>
                    В соответствии с п. 1 ст. 398 Гражданского кодекса Республики Беларусь настоящее Пользовательское
                    соглашение является договором присоединения.
                  </p>
                  <p>
                    В соответствии с п. 2 ст. 407 Гражданского кодекса Республики Беларусь настоящее Пользовательское
                    соглашение является публичной офертой. Пользовательское соглашение считается заключенным с момента
                    получения Администрацией согласия Пользователя с условиями настоящего Пользовательского соглашения
                    (акцепт оферты). Акцепт оферты производится путем осуществления Пользователем действий, указанных
                    в п. 1.3 Пользовательского соглашения.
                  </p>
                  <p>
                    Пользовательское соглашение определяет условия использования Сайта, а также взаимные права и
                    обязанности сторон.
                  </p>
                  <h3>Основные положения</h3>
                  <h3>1. Общие положения</h3>
                  <p>
                    1.1. Сайт FAP.CAP, размещенный по адресу https://www.FAP.CAP.ru (далее — Сайт), — коммерческий
                    электронный информационный ресурс Общества с ограниченной ответственностью «FAP.CAP», представляющий
                    собой совокупность общеполезных онлайн-сервисов (новостной электронный портал сетевого издания FAP.CAP;
                    маркетплейс «Каталог FAP.CAP»; доска объявлений «Барахолка»; сервис по размещению заказов и поиску
                    исполнителей «Услуги FAP.CAP»; позволяющий Пользователям ресурса создавать темы для обсуждения,
                    обмениваться сообщениями и делиться своим опытом, задавать вопросы и отвечать на вопросы других
                    Пользователей).
                  </p>
                </>
              ) : (
                <>
                  <h2 id="store-legal-title">Политика обработки персональных данных ООО «FAP.CAP»</h2>
                  <p className="store-legal-modal__meta">
                    УТВЕРЖДЕНО
                    <br />
                    Приказ директора
                    <br />
                    ООО «FAP.CAP»
                    <br />
                    18.08.2026 № 128
                  </p>
                  <h3>ПОЛИТИКА ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ ООО «FAP.CAP.ru»</h3>
                  <p>(изменения вступили в силу с 19.08.2026)</p>
                  <h3>ГЛАВА 1. ОБЩИЕ ПОЛОЖЕНИЯ</h3>
                  <p>
                    Настоящая Политика обработки персональных данных (далее — Политика) разработана ООО «FAP.CAP» во
                    исполнение требований Закона Республики Беларусь от 07.05.2021 № 99-З «О защите персональных данных»
                    (далее — Закон № 99-З).
                  </p>
                  <p>
                    В силу Закона № 99-З Общество с ограниченной ответственностью «FAP.CAP» (УНП 190657494) является
                    юридическим лицом, осуществляющим обработку персональных данных (далее — Оператор). Место нахождения:
                    220123, г. Москва, ул. Старовиленская, 100/7, 2-й этаж.
                  </p>
                  <p>
                    Политика разъясняет субъектам персональных данных цели, правовые основания, порядок обработки их
                    персональных данных, а также имеющиеся в связи с этим у субъектов персональных данных права и механизм
                    их реализации.
                  </p>
                  <p>Политика не применяется к обработке персональных данных:</p>
                  <p>
                    в процессе трудовой деятельности и при осуществлении административных процедур (в отношении работников
                    и бывших работников)
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Горизонтальная полка товаров на главной: заголовок, описание и сетка карточек StoreProductCard.
 */
function ProductRail({ id, title, tag, description, products, onAddToCart }) {
  return (
    <section className="store-rail" id={id}>
      <div className="store-rail__header">
        <h2>
          {title}
          {tag ? <span>{tag}</span> : null}
        </h2>
        {description ? <p>{description}</p> : null}
      </div>
      {products.length ? (
        <div className="store-rail__grid">
          {products.map((product) => (
            <StoreProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
          ))}
        </div>
      ) : (
        <p className="store-rail__empty">Товары появятся после загрузки каталога.</p>
      )}
    </section>
  )
}
