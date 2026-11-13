// Маршруты и SEO-данные каждой страницы. Используется и при пререндере, и в браузере.
import { SITE, BASE, STORE, products, animals, categories, catOf, catPath, brands, brandList, brandPath, inCat, pages, posts, faq, contacts, productPath, minPrice, img, minAll } from './data'

const abs = (p = '') => `${SITE}/${p}`
const cut = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1)).replace(/[,.:;—-]+$/, '') + '…')
const OG_IMAGE = abs('og-image.jpg')
const BRAND = `Зоомагазин «${STORE}»`
const SFX = ` | ${STORE}`

const org = {
  '@type': 'PetStore',
  '@id': abs('#store'),
  name: BRAND,
  url: abs(),
  logo: abs('icons/icon-512.png'),
  image: OG_IMAGE,
  description: 'Интернет-зоомагазин в Санкт-Петербурге: корма Wonderfur и Nateria для кошек и собак с бесплатной доставкой до пунктов выдачи 5Post.',
  areaServed: { '@type': 'City', name: 'Санкт-Петербург' },
  currenciesAccepted: 'RUB',
  sameAs: [contacts.telegram, contacts.max],
  ...(contacts.demo ? {} : { telephone: contacts.phone, email: contacts.email }),
}

// Бесплатная доставка по Санкт-Петербургу и возврат 7 дней — для расширенных сниппетов
const shipping = {
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'RUB' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'RU', addressRegion: 'Санкт-Петербург' },
}
const returnPolicy = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'RU',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
}

const crumbs = (list) => ({
  '@type': 'BreadcrumbList',
  itemListElement: list.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
})

const productLd = (p) => {
  const b = brands[p.brand]
  return {
    '@type': 'Product',
    '@id': abs(productPath(p) + '#product'),
    name: `${p.line} ${p.name.replace(/^Для/, 'для')}`,
    description: `${p.text} ${p.more}`,
    image: abs(`img/p/${p.id}.webp`),
    brand: { '@type': 'Brand', name: p.line },
    manufacturer: { '@type': 'Organization', name: b.maker },
    countryOfOrigin: 'RU',
    category: `${catOf(p.animal, p.cat).name} ${animals[p.animal].of}`,
    sku: p.weights[0].gtin,
    gtin13: p.weights[0].gtin,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Вкус', value: p.taste },
      { '@type': 'PropertyValue', name: 'Для кого', value: p.ageLabel },
      ...(b.declaration ? [{ '@type': 'PropertyValue', name: 'Декларация соответствия', value: b.declaration }] : []),
    ],
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'RUB',
      lowPrice: minPrice(p),
      highPrice: Math.max(...p.weights.map((w) => w.price)),
      offerCount: p.weights.length,
      offers: p.weights.map((w) => ({
        '@type': 'Offer',
        name: `${p.line} ${p.short}, ${w.w}`,
        sku: w.gtin,
        gtin13: w.gtin,
        price: w.price,
        priceCurrency: 'RUB',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        url: abs(productPath(p)),
        seller: { '@id': abs('#store') },
        areaServed: { '@type': 'City', name: 'Санкт-Петербург' },
        shippingDetails: shipping,
        hasMerchantReturnPolicy: returnPolicy,
      })),
    },
  }
}

const listLd = (list, name) => ({
  '@type': 'ItemList',
  name,
  itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(productPath(p)), name: `${p.line} ${p.name.replace(/^Для/, 'для')}` })),
})

// Все страницы сайта: path (без BASE, со слэшем на конце или '') → описание
export function routes() {
  return [
    { path: '', type: 'home' },
    { path: pages.catalog.path, type: 'catalog' },
    ...Object.keys(animals).map((a) => ({ path: animals[a].path, type: 'animal', animal: a })),
    ...Object.keys(categories).flatMap((a) => categories[a].map((c) => ({ path: catPath(a, c.id), type: 'cat', animal: a, cat: c.id }))),
    ...products.map((p) => ({ path: productPath(p), type: 'product', id: p.id })),
    { path: pages.brands.path, type: 'brands' },
    ...brandList.map((b) => ({ path: brandPath(b), type: 'brand', brand: b.name })),
    { path: pages.blog.path, type: 'blog' },
    ...posts.map((p) => ({ path: `blog/${p.slug}/`, type: 'post', slug: p.slug })),
    ...['delivery', 'returns', 'about', 'contacts', 'faq', 'privacy', 'consent'].map((k) => ({ path: pages[k].path, type: 'page', page: k })),
    { path: 'spasibo/', type: 'thanks' },
  ]
}

export function match(path) {
  const clean = path.replace(/^\/+/, '').replace(/[?#].*$/, '')
  const norm = clean && !clean.endsWith('/') ? clean + '/' : clean
  return routes().find((r) => r.path === norm) || { path: norm, type: '404' }
}

// Пустые разделы (товаров пока нет) не индексируем — чтобы поисковик не считал их «пустышками»
export const isEmptyRoute = (r) => (r.type === 'cat' && !inCat(r.animal, r.cat).length) || (r.type === 'animal' && !inCat(r.animal).length)

// Путь текущей страницы из location.pathname
export const stripBase = (pathname) => (pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, ''))

export function head(route) {
  const p = route.id && products.find((x) => x.id === route.id)
  const post = route.slug && posts.find((x) => x.slug === route.slug)
  let title, desc, ld = [], image = OG_IMAGE, type = 'website', robots = 'index, follow, max-image-preview:large'
  switch (route.type) {
    case 'home':
      title = `Зоомагазин «${STORE}» в СПб — всё для кошек и собак, доставка бесплатно`
      desc = `Интернет-зоомагазин в Санкт-Петербурге: товары для кошек и собак — корма, лакомства, наполнители, амуниция, игрушки, уход. Корма Wonderfur и Nateria от ${minAll} ₽. Бесплатная доставка до пунктов 5Post.`
      ld = [org, { '@type': 'WebSite', '@id': abs('#site'), url: abs(), name: BRAND, inLanguage: 'ru-RU', publisher: { '@id': abs('#store') } }, listLd(products, 'Корма Wonderfur и Nateria')]
      break
    case 'catalog':
      title = pages.catalog.title + SFX
      desc = pages.catalog.desc
      ld = [crumbs([['Главная', ''], ['Каталог', pages.catalog.path]])]
      break
    case 'animal': {
      const a = animals[route.animal]
      title = `Товары ${a.of} — купить в Санкт-Петербурге${SFX}`
      desc = `Зоотовары ${a.of}: ${categories[route.animal].map((c) => c.name.toLowerCase()).join(', ')}. Бесплатная доставка до пунктов 5Post в СПб.`
      ld = [crumbs([['Главная', ''], [a.name, a.path]])]
      break
    }
    case 'cat': {
      const a = animals[route.animal], c = catOf(route.animal, route.cat), list = inCat(route.animal, route.cat)
      title = `${c.name} ${a.of} — купить в Санкт-Петербурге${SFX}`
      desc = list.length
        ? `${c.name} ${a.of}: ${[...new Set(list.map((x) => x.brand))].join(' и ')} — ${list.length} позиций от ${Math.min(...list.map(minPrice))} ₽. Бесплатная доставка до пунктов 5Post в СПб.`
        : `${c.name} ${a.of} — раздел скоро пополнится. Напишите, что ищете, — подскажем.`
      ld = [crumbs([['Главная', ''], [a.name, a.path], [c.name, catPath(route.animal, route.cat)]]), ...(list.length ? [listLd(list, `${c.name} ${a.of}`)] : [])]
      break
    }
    case 'product': {
      const a = animals[p.animal], c = catOf(p.animal, p.cat)
      const base = `${p.line}: ${p.short}`
      const tasty = p.short.includes(p.taste.split(' ')[0].slice(0, 5)) ? base : `${base}, ${p.taste}`
      title = `${(tasty + ' — купить в СПб').length <= 62 ? tasty : base} — купить в СПб`
      desc = `${p.name} ${p.line}. Цена от ${minPrice(p)} ₽, фасовки ${p.weights.map((w) => w.w).join(', ')}. Бесплатная доставка до пунктов 5Post в Санкт-Петербурге.`
      image = abs(`img/p/${p.id}.webp`)
      type = 'product'
      ld = [crumbs([['Главная', ''], [a.name, a.path], [c.name, catPath(p.animal, p.cat)], [`${p.line} ${p.short}`, productPath(p)]]), productLd(p)]
      break
    }
    case 'brands':
      title = pages.brands.title + SFX
      desc = pages.brands.desc
      ld = [crumbs([['Главная', ''], ['Бренды', pages.brands.path]])]
      break
    case 'brand': {
      const b = brands[route.brand], list = products.filter((x) => x.brand === b.name)
      title = `Корма ${b.name} для кошек и собак — купить в СПб${SFX}`
      desc = `${b.short} ${list.length} рецептов от ${Math.min(...list.map(minPrice))} ₽. Бесплатная доставка до пунктов 5Post в Санкт-Петербурге.`
      ld = [crumbs([['Главная', ''], ['Бренды', pages.brands.path], [b.name, brandPath(b)]]), listLd(list, `Корма ${b.name}`)]
      break
    }
    case 'blog':
      title = pages.blog.title + SFX
      desc = pages.blog.desc
      ld = [crumbs([['Главная', ''], ['Блог', pages.blog.path]])]
      break
    case 'post':
      title = `${post.title}${SFX}`
      desc = cut(post.text + ' ' + post.body[0], 160)
      image = abs(`img/p/${post.img}.webp`)
      type = 'article'
      ld = [crumbs([['Главная', ''], ['Блог', pages.blog.path], [post.title, `blog/${post.slug}/`]]),
        { '@type': 'Article', headline: post.title, description: post.text, image, inLanguage: 'ru-RU', author: { '@id': abs('#store') }, publisher: { '@id': abs('#store') }, mainEntityOfPage: abs(`blog/${post.slug}/`) }]
      break
    case 'page': {
      const pg = pages[route.page]
      title = `${pg.title}${SFX}`
      desc = pg.desc
      ld = [crumbs([['Главная', ''], [pg.title, pg.path]])]
      if (route.page === 'faq') ld.push({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
      if (route.page === 'contacts' || route.page === 'about') ld.push(org)
      if (route.page === 'privacy' || route.page === 'consent') robots = 'noindex, follow'
      break
    }
    case 'thanks':
      title = `Спасибо!${SFX}`
      desc = 'Заказ или заявка приняты.'
      robots = 'noindex, nofollow'
      break
    default:
      title = `Страница не найдена${SFX}`
      desc = 'Такой страницы нет. Перейдите в каталог зоомагазина.'
      robots = 'noindex, follow'
  }
  if (isEmptyRoute(route)) robots = 'noindex, follow'
  const canonical = route.type === '404' ? null : abs(route.path)
  return { title, desc, canonical, image, type, robots, ld: ld.length ? { '@context': 'https://schema.org', '@graph': ld } : null }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// HTML для <head> при пререндере
export function headHtml(h) {
  return [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.desc)}" />`,
    `<meta name="robots" content="${h.robots}" />`,
    h.canonical ? `<link rel="canonical" href="${h.canonical}" />` : '',
    `<meta property="og:type" content="${h.type}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="ru_RU" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.desc)}" />`,
    h.canonical ? `<meta property="og:url" content="${h.canonical}" />` : '',
    `<meta property="og:image" content="${h.image}" />`,
    h.ld ? `<script type="application/ld+json">${JSON.stringify(h.ld).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).join('\n    ')
}

// Обновление <head> при переходах внутри сайта
export function applyHead(h) {
  document.title = h.title
  const set = (sel, attr, val, make) => {
    let el = document.head.querySelector(sel)
    if (!el) { el = make(); document.head.appendChild(el) }
    el.setAttribute(attr, val)
  }
  const meta = (k, v, prop) => set(`meta[${prop ? 'property' : 'name'}="${k}"]`, 'content', v, () => { const m = document.createElement('meta'); m.setAttribute(prop ? 'property' : 'name', k); return m })
  meta('description', h.desc)
  meta('robots', h.robots)
  meta('og:type', h.type, true)
  meta('og:title', h.title, true)
  meta('og:description', h.desc, true)
  if (h.canonical) meta('og:url', h.canonical, true)
  meta('og:image', h.image, true)
  if (h.canonical) set('link[rel="canonical"]', 'href', h.canonical, () => { const l = document.createElement('link'); l.rel = 'canonical'; return l })
  else document.head.querySelector('link[rel="canonical"]')?.remove()
  let s = document.head.querySelector('script[type="application/ld+json"]')
  if (h.ld) {
    if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; document.head.appendChild(s) }
    s.textContent = JSON.stringify(h.ld)
  } else s?.remove()
}

export { img }
