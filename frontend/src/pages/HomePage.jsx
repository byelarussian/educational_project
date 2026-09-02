import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StoreProductCard from '../components/StoreProductCard.jsx'
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

function matchesQuery(product, query) {
  const haystack = `${product.title} ${product.brand} ${product.tag}`.toLowerCase()
  return haystack.includes(query)
}

export default function HomePage({ user, isAuthenticated, onLogout }) {
  const [products, setProducts] = useState([])
  const [heroIndex, setHeroIndex] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribeMessage, setSubscribeMessage] = useState('')

  useEffect(() => {
    let cancelled = false

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

  function handleSubscribe(event) {
    event.preventDefault()
    setSubscribeMessage('Данные успешно отправлены!')
    setSubscribeEmail('')
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
            <a href="#catalog" className="store-nav__link">
              Одежда и аксессуары
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
              Информация
            </a>
            <a href="#store" className="store-nav__link">
              Магазин в Москве
            </a>
          </nav>

          <a className="store-phone" href="tel:+79852332506">
            +7 (985) 233-25-06
          </a>

          <div className="store-header__actions">
            <button type="button" className="store-icon-btn" onClick={() => setSearchOpen((open) => !open)} aria-label="Поиск">
              ⌕
            </button>
            {isAuthenticated ? (
              <Link className="store-icon-btn" to="/tasks" aria-label="Аккаунт">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </Link>
            ) : (
              <Link className="store-icon-btn" to="/login" aria-label="Войти">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5 19c1.5-3.2 4-5 7-5s5.5 1.8 7 5" />
                </svg>
              </Link>
            )}
            <a className="store-icon-btn" href="#novinki" aria-label="Корзина">
              ☐
            </a>
            <button type="button" className="store-icon-btn store-burger" onClick={() => setMenuOpen((open) => !open)} aria-label="Меню">
              ☰
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

      <section className="store-brands">
        <h2 className="visually-hidden">Бренды</h2>
        <div className="store-brands__row">
          {BRANDS.concat(BRANDS).map((brand, index) => (
            <span key={`${brand}-${index}`} className="store-brands__item">
              {brand}
            </span>
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

      <ProductRail
        id="novinki"
        title="Новинки"
        tag="New"
        description="Самые свежие новинки головных уборов от известных мировых брендов в FAM"
        products={novelties}
      />

      <section className="store-about" id="about">
        <div className="store-about__panel">
          <p className="store-about__kicker">Больше, чем магазин.</p>
          <h2>
            Твой гид
            <br />в мире головных уборов
          </h2>
          <p className="store-about__text">Основан в 2016 году семьей любителей бейсболок</p>
          <a className="store-btn store-btn--white" href="#store">
            О магазине
          </a>
        </div>
        <div className="store-ticker" aria-hidden="true">
          <div className="store-ticker__track">
            {Array.from({ length: 8 }).map((_, index) => (
              <span key={index}>Клуб любителей бейсболок</span>
            ))}
          </div>
        </div>
      </section>

      <ProductRail
        title="Бестселлеры"
        tag="Best"
        description="Ваш выбор, лучшие из лучших"
        products={bestsellers.length ? bestsellers : novelties}
      />

      <section className="store-guide">
        <p>FAM подскажет</p>
        <h2>Как выбрать бейсболку</h2>
        <a className="store-btn store-btn--white" href="#novinki">
          Подобрать
        </a>
      </section>

      <ProductRail
        title="New Era"
        description="Американский культовый бренд со 100-летней историей, те самые бейсболки с бейсбольных стадионов и из музыкальных клипов."
        products={newEraProducts.length ? newEraProducts : novelties}
      />

      <ProductRail
        id="sale"
        title="Скидки"
        description="Честные цены на оригинальные модели"
        products={saleProducts.length ? saleProducts : filteredProducts.slice(-8)}
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
        <form className="store-subscribe" onSubmit={handleSubscribe}>
          <h2>Подпишись на рассылку и будь в курсе спец. предложений и новинок</h2>
          <div className="store-subscribe__row">
            <input
              type="email"
              placeholder="Email"
              value={subscribeEmail}
              onChange={(event) => setSubscribeEmail(event.target.value)}
              required
            />
            <button type="submit" aria-label="Подписаться">
              →
            </button>
          </div>
          {subscribeMessage ? <p className="store-subscribe__ok">{subscribeMessage}</p> : null}
        </form>

        <div className="store-footer__nav">
          <span>Подарочные сертификаты</span>
          <span>Таблицы размеров</span>
          <span>Магазины в Москве</span>
          <span>Рекомендации по уходу</span>
          <span>Вопрос-ответ</span>
          <span>Доставка</span>
          <span>Оплата</span>
          <span>Возврат</span>
        </div>

        <div className="store-ticker store-ticker--footer" aria-hidden="true">
          <div className="store-ticker__track">
            {Array.from({ length: 8 }).map((_, index) => (
              <span key={index}>Клуб любителей бейсболок</span>
            ))}
          </div>
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
          ) : (
            <Link to="/login">Вход / регистрация</Link>
          )}
        </div>
      </footer>
    </div>
  )
}

function ProductRail({ id, title, tag, description, products }) {
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
            <StoreProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="store-rail__empty">Товары появятся после загрузки каталога.</p>
      )}
    </section>
  )
}
