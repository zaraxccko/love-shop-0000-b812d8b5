# LoveShop — Полная техническая документация

> Документ для разработчика / AI-ассистента (Gemini), который будет поддерживать проект.
> Содержит: архитектуру, все механики работы Mini App и Telegram-бота, схему БД,
> REST API, описание сторов фронта и пошаговый деплой на VPS.

---

## 📑 Оглавление

1. [Обзор проекта](#1-обзор-проекта)
2. [Архитектура и стек](#2-архитектура-и-стек)
3. [Структура репозитория](#3-структура-репозитория)
4. [Бизнес-механики (что умеет приложение)](#4-бизнес-механики)
5. [Telegram-бот: команды и нотификации](#5-telegram-бот)
6. [Авторизация и роли](#6-авторизация-и-роли)
7. [Схема базы данных (Prisma)](#7-схема-бд)
8. [REST API — полная спецификация](#8-rest-api)
9. [Фронтенд — сторы и страницы](#9-фронтенд)
10. [Криптоплатежи и курсы](#10-криптоплатежи)
11. [Загрузка фото подтверждений](#11-загрузка-фото)
12. [Переменные окружения](#12-переменные-окружения)
13. [Деплой на VPS — шаг за шагом](#13-деплой-на-vps)
14. [Обновление, бэкапы, мониторинг](#14-обновление-и-бэкапы)
15. [Безопасность](#15-безопасность)
16. [Траблшутинг](#16-траблшутинг)

---

## 1. Обзор проекта

**LoveShop** — Telegram Mini App (WebApp) магазин с криптооплатой, баланс-кошельком,
геолокацией (страна → город → район), вариантами товаров, доставкой/самовывозом
(«закладки» — `prikop / klad / magnit`), админ-панелью и широковещательными рассылками.

**Состав:**
- **Frontend** — React 18 + Vite + Tailwind, открывается как Telegram WebApp.
- **Backend** — Fastify + Prisma + PostgreSQL.
- **Telegram-бот** — `node-telegram-bot-api`, long-polling, в одном процессе с API.
- **Деплой** — Docker Compose на одном VPS, статика фронта раздаётся nginx.

---

## 2. Архитектура и стек

```
┌────────────────────────┐        ┌──────────────────────┐
│ Telegram client        │        │ @BotFather bot       │
│ (WebApp кнопка/Menu)   │◀──────▶│  long-polling        │
└──────────┬─────────────┘        └─────────┬────────────┘
           │ HTTPS                           │
           ▼                                 ▼
┌────────────────────────────────────────────────────┐
│ nginx (443) на VPS                                 │
│  ├─ /            → /var/www/shop  (статика Vite)   │
│  ├─ /api/        → 127.0.0.1:3000 (Fastify)        │
│  └─ /uploads/    → 127.0.0.1:3000 /uploads/        │
└──────────┬─────────────────────────────────────────┘
           │ docker network
           ▼
┌────────────────────────┐    ┌────────────────────┐
│ api (Node.js 20)       │◀──▶│ postgres:16-alpine │
│  Fastify + Prisma      │    │  volume: pgdata    │
│  + Telegram bot        │    └────────────────────┘
│  volume: uploads       │
└────────────────────────┘
```

### Технологии

| Слой | Что используется |
|------|------------------|
| Frontend | React 18, Vite 5, TypeScript, TailwindCSS, Zustand (state), shadcn/ui, sonner (toasts) |
| Backend | Node.js 20, Fastify 4, Prisma 5, Zod (валидация), `@fastify/jwt`, `@fastify/multipart` |
| БД | PostgreSQL 16 (через Docker) |
| Bot | `node-telegram-bot-api` (long-polling), `p-queue` (rate-limit) |
| DevOps | Docker, Docker Compose, nginx, Let's Encrypt (certbot) |
| Внешние API | CoinGecko (курсы крипты, без ключа) |

---

## 3. Структура репозитория

```
loveshop/
├── src/                            # Frontend
│   ├── pages/
│   │   ├── Index.tsx               # главная (бутстрап сессии, роутинг экранов)
│   │   ├── Admin.tsx               # админ-панель
│   │   └── NotFound.tsx
│   ├── components/shop/            # экраны Mini App
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── ProductCard.tsx / ProductSheet.tsx
│   │   ├── CartSheet.tsx / StickyCartBar.tsx
│   │   ├── DepositPage.tsx         # пополнение баланса
│   │   ├── OrderPaymentPage.tsx    # оплата активного заказа
│   │   ├── AccountPage.tsx         # личный кабинет
│   │   ├── CryptoAmountCard.tsx    # USD ⇄ крипта по курсу
│   │   ├── LocationPicker.tsx
│   │   ├── CategoryPills.tsx
│   │   ├── CaptchaGate.tsx
│   │   ├── SplashLanguage.tsx
│   │   └── admin/
│   │       ├── AnalyticsTab.tsx
│   │       ├── BroadcastTab.tsx
│   │       └── ImageCropper.tsx
│   ├── store/                      # Zustand-сторы
│   │   ├── session.ts              # JWT, /me
│   │   ├── auth.ts                 # тонкая обёртка над session (isAdmin)
│   │   ├── account.ts              # баланс, депозиты, заказы
│   │   ├── catalog.ts              # товары, категории, CRUD
│   │   ├── cart.ts                 # локальная корзина + резерв
│   │   ├── location.ts             # страна/город
│   │   └── captcha.ts              # антибот-гейт
│   ├── lib/
│   │   ├── api.ts                  # fetch-клиент + типы (Auth/Catalog/Deposits/Orders/Admin)
│   │   ├── cryptoRates.ts          # CoinGecko, кэш в sessionStorage
│   │   ├── telegram.ts             # хук useTelegram, haptic, BackButton
│   │   ├── i18n.ts                 # ru/en
│   │   ├── format.ts               # formatTHB и т.п.
│   │   └── loc.ts                  # выбор языка из LocalizedString
│   ├── data/
│   │   ├── locations.ts            # страны/города/районы
│   │   └── mockProducts.ts         # фолбэк, если бэк недоступен
│   ├── types/shop.ts               # CartLine, Product, Variant
│   ├── index.css                   # дизайн-токены (HSL)
│   └── main.tsx
│
├── backend/                        # Backend
│   ├── src/
│   │   ├── index.ts                # Fastify bootstrap
│   │   ├── env.ts                  # парсинг .env
│   │   ├── db.ts                   # Prisma client
│   │   ├── bot.ts                  # Telegram bot + broadcast/notifyAdmins
│   │   ├── auth/
│   │   │   ├── telegram.ts         # HMAC-валидация initData
│   │   │   └── middleware.ts       # requireAuth, requireAdmin
│   │   └── routes/
│   │       ├── auth.ts             # POST /auth/telegram
│   │       ├── me.ts               # GET /me
│   │       ├── catalog.ts          # GET /catalog, /categories
│   │       ├── deposits.ts         # POST/GET /deposits/*
│   │       ├── orders.ts           # POST/GET /orders/*
│   │       └── admin.ts            # /admin/*, /broadcast
│   ├── prisma/schema.prisma
│   ├── Dockerfile
│   ├── docker-compose.yml          # postgres + api
│   ├── nginx.conf.example
│   └── .env.example
│
├── README.md                       # короткая инструкция
├── DOCUMENTATION.md                # этот файл
└── .env.example                    # VITE_API_URL
```

---

## 4. Бизнес-механики

### 4.1 Сценарий «обычный пользователь»

1. Открывает бота в Telegram → жмёт Menu Button («🛒 Магазин») → грузится WebApp.
2. **Сплеш-экран выбора языка** (`SplashLanguage`) — ru/en, сохраняется локально.
3. **Captcha-гейт** (`CaptchaGate`) — простая антибот-проверка.
4. **Выбор локации** (`LocationPicker`) — страна → город → (район — опционально).
5. **Главная** — Hero с featured-товаром, плитка категорий, грид карточек товаров,
   отфильтрованных под выбранный город/район.
6. **Карточка товара** (`ProductSheet`) — выбор варианта (граммы), цена в USD/THB,
   кнопка «В корзину».
7. **Корзина** (`CartSheet`) — список линий, переключатель «Доставка/Самовывоз»,
   адрес (если доставка), таймер резерва (`reservedAt + RESERVATION_MS`).
8. **Checkout** (`Index.tsx → handleCheckout`):
   - если баланса не хватает → редирект на `DepositPage` с подсказкой суммы;
   - если хватает → `Orders.create()`, баланс списывается транзакцией на бэке,
     корзина очищается, открывается `AccountPage`.
9. **Личный кабинет** (`AccountPage`):
   - профиль (Telegram имя/аватар/ID),
   - баланс + кнопка «Пополнить»,
   - активная корзина с таймером,
   - история депозитов (5 последних),
   - история заказов (5 последних, с фото-подтверждением и текстом от магазина).

### 4.2 Сценарий «пополнение баланса»

`DepositPage`:
1. Юзер вводит сумму USD и выбирает крипту (USDT/TRX/BTC/SOL/TON).
2. `CryptoAmountCard` пересчитывает по курсу CoinGecko (USDT всегда 1:1).
3. POST `/api/deposits` → создаётся запись со статусом `pending` + адресом из бэка.
4. Юзер видит адрес и сумму к оплате в крипте, копирует, переводит.
5. Жмёт «Я оплатил» → POST `/api/deposits/:id/paid` → статус `awaiting`,
   админу уходит уведомление в Telegram.
6. Админ в админке жмёт «Подтвердить» → `confirmed`, баланс юзера +amount,
   юзеру приходит сообщение в бот.

### 4.3 Сценарий «оплата заказа»

После checkout заказ создаётся со статусом `awaiting` и баланс уже списан.
В `OrderPaymentPage` юзер видит состав, итог и при необходимости опять
криптореквизиты (если магазин просит подтверждение перевода — тут UI можно
адаптировать).

Когда товар «положен» — админ в админке нажимает «Подтвердить»:
- грузит **фото-закладку** + текст-комментарий (multipart),
- статус заказа → `completed`,
- юзеру в бот уходит фото с подписью и в `AccountPage` появляется блок
  «Сообщение от магазина».

### 4.4 Сценарий «администратор»

Админ — это юзер, у которого `tg_id` есть в `ADMIN_TG_IDS` (env бэка).
Никаких хардкодов на фронте. После логина в `me.isAdmin === true` появляется
кнопка перехода в `AdminPage`:

- **Awaiting** — список ожидающих депозитов и заказов.
- **History** — история операций с пагинацией.
- **Products CRUD** — создание/редактирование/удаление товаров и вариантов.
- **Analytics** — KPI (юзеров, заказов, выручка, депозитов).
- **Broadcast** — массовая рассылка (всем / активным / неактивным),
  поддерживает текст + картинку + inline-кнопку. Логируется в `broadcast_log`.

### 4.5 Локации и витрина

`src/data/locations.ts` — справочник «страна → город → районы». Каждый
товар хранит:
- `cities: string[]` — белый список городов (пусто = везде),
- `variants[].pricesByCountry: { [countrySlug]: priceUSD }`,
- `variants[].stashes: [{ districtSlug, type }]` — где лежит закладка,
- `variants[].districts: string[]` — для доставки.

Фильтрация в `Index.tsx → cityProducts`: товар показан, если он разрешён в
этом городе и хотя бы один его вариант имеет цену для страны и подходит по
району.

---

## 5. Telegram-бот

Файл: `backend/src/bot.ts`. Запускается автоматически при старте API
(`import "./bot.js"` в `index.ts`).

### 5.1 Команды

| Команда | Что делает |
|---------|------------|
| `/start` | Отправляет сообщение с inline-кнопкой `web_app: { url: WEBAPP_URL }`. |

Никаких других команд не зарегистрировано — бот используется как «канал доставки»
сообщений (нотификации, рассылки) и для запуска WebApp.

### 5.2 Нотификации (бот → админу)

`notifyAdmins(text)` — рассылает HTML-сообщение всем `ADMIN_TG_IDS`:

- `💰 Новая заявка на пополнение` — когда юзер нажал «Я оплатил» в депозите.
- `🛒 Новый заказ` — после успешного `POST /orders` (с балансом >= total).

### 5.3 Нотификации (бот → юзеру)

- `✅ Пополнение зачислено` — после `POST /admin/deposits/:id/confirm`.
- `❌ Пополнение отклонено` — после `POST /admin/deposits/:id/cancel`.
- `✅ Заказ подтверждён` — после `POST /admin/orders/:id/confirm`,
  если приложено фото — отправляется через `sendPhoto` с подписью.
- `❌ Заказ отклонён, баланс возвращён` — после `cancel`.

### 5.4 Broadcast (массовая рассылка)

`broadcast({ recipients, text, imageUrl?, button? })`:
- Очередь `p-queue({ concurrency: 1, intervalCap: 25, interval: 1000 })` —
  держим под лимитом Telegram (~30 msg/sec глобально).
- Ретраи на `429` с уважением `retry_after`.
- На `403` (юзер заблокировал бота) и `400` — пропускаем без ретрая.
- Результат пишется в `broadcast_log` (`sentCount` / `failedCount`).

Запуск: `POST /api/broadcast` из админки (асинхронно, эндпоинт сразу
возвращает `{ queued, logId }`).

---

## 6. Авторизация и роли

### 6.1 Логин (Telegram WebApp initData)

1. Frontend в `Index.tsx` берёт `window.Telegram.WebApp.initData`.
2. POST `/api/auth/telegram` с этим `initData`.
3. Backend (`backend/src/auth/telegram.ts`):
   - парсит query-string,
   - вычисляет `secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN)`,
   - проверяет, что `hash` совпадает с `HMAC_SHA256(secret_key, data_check_string)`,
   - проверяет, что `auth_date` не старше 24 часов.
4. Если ок — `prisma.user.upsert` + выдаётся **JWT (30 дней)** с payload `{ tgId }`.
5. Фронт сохраняет токен в `localStorage["loveshop-token"]` (`tokenStore`).

### 6.2 Middleware

- `requireAuth` — `app.jwt.verify(req)` → подгружает `req.user.tgId: bigint`.
- `requireAdmin` — `requireAuth` + проверка `isAdminTgId(tgId)` (по `ADMIN_TG_IDS`).

`is_admin` в БД синхронизируется при логине, но **источник истины — env**.
Это исключает privilege escalation через прямой UPDATE в БД.

### 6.3 Превью без Telegram

Если фронт открыт в обычном браузере (нет `tg.initData`) — `loginWithInitData`
не вызывается. Если в `localStorage` есть старый токен — `refreshMe` подтянет
профиль. Иначе работают только публичные эндпоинты (`/catalog`).

---

## 7. Схема БД

`backend/prisma/schema.prisma` — 6 моделей:

### User
| Поле | Тип | Описание |
|------|-----|----------|
| `tgId` | `BigInt` PK | Telegram user ID |
| `username`, `firstName`, `lastName`, `photoUrl` | `String?` | Из Telegram |
| `lang` | `String` | "ru" / "en" |
| `citySlug` | `String?` | Сохранённый выбор города |
| `balanceUSD` | `Float` | Кошелёк |
| `isAdmin` | `Boolean` | Зеркало `ADMIN_TG_IDS` |
| `createdAt`, `updatedAt` | `DateTime` | |

### Product
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `cuid` PK | |
| `name`, `description` | `Json` | `LocalizedString { ru, en }` |
| `category` | `String` | |
| `priceTHB` | `Float` | Витринная цена (для отображения) |
| `thcMg`, `cbdMg` | `Int?` | |
| `weight` | `String?` | |
| `inStock` | `Int` | |
| `gradient`, `emoji`, `imageUrl`, `featured`, `badge` | UI-поля | |
| `cities`, `districts` | `String[]` | Белые списки |

### Variant (1 product → N variants)
| Поле | Тип |
|------|-----|
| `slug` | `String` (`"1g"`, `"3g"`...) |
| `grams` | `Float` |
| `pricesByCountry` | `Json` `{ [countrySlug]: priceUSD }` |
| `stashes` | `Json` `[{ districtSlug, type: "prikop"|"klad"|"magnit" }]` |
| `districts` | `String[]` |

### Deposit
| Поле | Тип |
|------|-----|
| `id` | `cuid` PK |
| `userTgId` | `BigInt` FK |
| `amountUSD`, `crypto`, `address` | |
| `status` | enum `pending → awaiting → confirmed/cancelled` |
| `paidAt`, `confirmedAt`, `createdAt` | |

### Order
| Поле | Тип |
|------|-----|
| `id` | `cuid` PK |
| `userTgId` | `BigInt` FK |
| `totalUSD` | `Float` |
| `items` | `Json` (snapshot `CartLine[]`) |
| `delivery`, `deliveryAddress` | |
| `status` | enum `awaiting → paid → in_delivery → completed/cancelled` |
| `crypto`, `payAddress` | |
| `confirmPhotoUrl`, `confirmText`, `confirmedAt` | Сообщение от магазина |

### BroadcastLog
| Поле | Тип |
|------|-----|
| `id`, `segment`, `text`, `imageUrl`, `button`, `sentCount`, `failedCount`, `createdAt` | |

---

## 8. REST API

Базовый префикс: **`/api`**. Все защищённые ручки требуют
`Authorization: Bearer <jwt>`.

### Auth

| Метод | Путь | Body | Ответ |
|-------|------|------|-------|
| POST | `/auth/telegram` | `{ initData: string }` | `{ token, user: MeUser }` |
| GET | `/me` | — | `MeUser` |

`MeUser`:
```ts
{
  tgId: string;          // BigInt as string
  username?, firstName?, lastName?, photoUrl?: string;
  lang: "ru" | "en";
  citySlug?: string | null;
  balanceUSD: number;
  isAdmin: boolean;
}
```

### Catalog (public)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/catalog?city=slug` | Все товары (если `?city=` — фильтр по `cities`) |
| GET | `/categories` | Уникальные категории |

### Deposits (auth)

| Метод | Путь | Body | Ответ |
|-------|------|------|-------|
| POST | `/deposits` | `{ amountUSD, crypto: "USDT"|"TRX"|"BTC"|"SOL"|"TON" }` | `Deposit` (status `pending`, address подставлен на бэке) |
| POST | `/deposits/:id/paid` | — | `Deposit` (status `awaiting`), плюс нотификация админам |
| POST | `/deposits/:id/cancel` | — | `Deposit` (status `cancelled`) |
| GET | `/deposits/me` | — | `Deposit[]` (последние 100) |

### Orders (auth)

| Метод | Путь | Body | Ответ |
|-------|------|------|-------|
| POST | `/orders` | `{ totalUSD, items: CartLine[], delivery, deliveryAddress?, crypto?, payAddress? }` | `Order` или `402 insufficient_balance` |
| GET | `/orders/me` | — | `Order[]` (последние 100) |

### Admin (auth + ADMIN_TG_IDS)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/admin/awaiting` | `{ orders, deposits }` ждущие подтверждения |
| GET | `/admin/history?limit=&offset=` | История подтверждённых/отменённых |
| POST | `/admin/deposits/:id/confirm` | `confirmed` + баланс юзера +amount |
| POST | `/admin/deposits/:id/cancel` | `cancelled` |
| POST | `/admin/orders/:id/confirm` | **multipart**: `photo` (file), `text` (string) |
| POST | `/admin/orders/:id/cancel` | возврат баланса если был списан |
| POST | `/admin/products` | создать товар (см. zod-схему в `admin.ts`) |
| PUT | `/admin/products/:id` | заменяет варианты целиком |
| DELETE | `/admin/products/:id` | каскадно удаляет варианты |
| GET | `/admin/analytics` | `{ users, ordersTotal, ordersRevenue, depositsTotal, depositsAmount }` |
| POST | `/broadcast` | `{ segment, text, image?, button? }` → `{ queued, logId }` |

### Health

| Метод | Путь | Ответ |
|-------|------|-------|
| GET | `/api/health` | `{ ok: true, ts }` |

---

## 9. Фронтенд

### Сторы (Zustand)

| Стор | Persist | Источник истины | Что хранит |
|------|---------|-----------------|------------|
| `session` | только токен через `tokenStore` | бэк (`/me`) | `user`, `loading`, `error` |
| `auth` | — | алиас `session` | `isAdmin`, `logout` |
| `account` | **нет** | бэк (`/deposits/me`, `/orders/me`, `/me`) | `balanceUSD`, `deposits`, `orders` |
| `catalog` | **нет** (был, удалён) | бэк (`/catalog`, `/categories`) | `products`, `categories` |
| `cart` | да (UI) | локально | линии, доставка/адрес, `cartId`, `reservedAt` |
| `location` | да (UI) | локально | страна/город |
| `captcha` | да (UI) | локально | флаг прохождения |
| `i18n` | да (UI) | локально | язык |

**Важно:** `persist` оставлен только для UI-состояния и JWT.
Все бизнес-данные (баланс, заказы, депозиты, товары) — read-only зеркало бэка,
обновляется через `hydrate()`.

### Бутстрап (`Index.tsx`)

```ts
useEffect(() => {
  const initData = tg?.initData;
  if (initData) {
    loginWithInitData(initData).then(() => hydrateAccount());
  } else {
    refreshMe().then(() => hydrateAccount());
  }
  hydrateCatalog();
}, [tg?.initData]);
```

### Защита от падений

`useAccount.hydrate()` оборачивает каждый запрос в `.catch(() => null)` и
`Array.isArray(...)` перед `set` — даже если бэк временно недоступен,
страница ЛК откроется с пустыми списками вместо runtime-error.

---

## 10. Криптоплатежи

Файл: `src/lib/cryptoRates.ts`.

- Источник: **CoinGecko API** (`/simple/price`, без ключа).
- Кэш: `sessionStorage`, TTL = 60 сек.
- USDT всегда `1.0` USD (fallback для стейбла).
- При ошибке сети — возвращается последний кэшированный курс или `null`.

`CryptoAmountCard` показывает:
- сумму в USD,
- сумму в крипте (`amountUSD / rate`),
- адрес кошелька (захардкожен на бэке, см. `CRYPTO_ADDRESSES` в `deposits.ts`),
- обе суммы и адрес кликабельны для копирования.

**Адреса кошельков** должны меняться **только** в `backend/src/routes/deposits.ts`
(и для отображения — в `src/store/account.ts → CRYPTO_LIST`). Клиент адрес
изменить не может — бэк подставляет своё значение при создании депозита.

---

## 11. Загрузка фото

При подтверждении заказа админ загружает фото через multipart
(`POST /admin/orders/:id/confirm`):

1. Файл сохраняется в `UPLOAD_DIR` (`/data/uploads` внутри контейнера,
   docker volume `uploads`) с именем `{ts}_{random}.{ext}`.
2. Поле `confirmPhotoUrl` пишется как `${PUBLIC_UPLOAD_URL}/{filename}`.
3. Nginx раздаёт `/uploads/` напрямую (быстрее, чем через Node).
4. Бот отправляет это же фото юзеру с подписью.

Лимит размера — 10 MB (`bodyLimit` в Fastify + `multipart.limits.fileSize`).

---

## 12. Переменные окружения

### Backend (`backend/.env`)

| Переменная | Пример | Описание |
|------------|--------|----------|
| `DATABASE_URL` | `postgresql://appuser:changeme@postgres:5432/shopdb?schema=public` | Postgres из docker-compose |
| `PORT` | `3000` | API порт |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | `https://your-domain.com` | Откуда фронт. Несколько — через запятую. `*` для дева |
| `JWT_SECRET` | `openssl rand -hex 32` | 32+ символа |
| `TELEGRAM_BOT_TOKEN` | `123:ABC...` | От @BotFather |
| `ADMIN_TG_IDS` | `8044243116,123456` | Telegram ID админов |
| `WEBAPP_URL` | `https://your-domain.com` | URL фронта (для `/start` кнопки) |
| `UPLOAD_DIR` | `/data/uploads` | Путь внутри контейнера |
| `PUBLIC_UPLOAD_URL` | `https://your-domain.com/uploads` | Публичный URL загрузок |

### Frontend (`.env` в корне)

| Переменная | Пример |
|------------|--------|
| `VITE_API_URL` | `https://your-domain.com/api` |

---

## 13. Деплой на VPS

### Требования
- Ubuntu 22.04+ / Debian 12
- Свободные порты 80, 443
- Домен с A-записью на IP сервера
- Telegram-бот ([@BotFather](https://t.me/BotFather)) и его токен
- Telegram ID админа ([@userinfobot](https://t.me/userinfobot))

### Шаг 1. Установить Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Шаг 2. Склонировать проект
```bash
git clone <your-repo> /srv/loveshop
cd /srv/loveshop
```

### Шаг 3. Поднять бэк
```bash
cd backend
cp .env.example .env
nano .env   # заполнить переменные (см. таблицу выше)

docker compose up -d --build
docker compose logs -f api   # проверь "API listening on :3000" и "/start"-handler
```

Миграции Prisma применяются автоматически в CMD контейнера.

### Шаг 4. Собрать фронт
```bash
cd /srv/loveshop
echo "VITE_API_URL=https://your-domain.com/api" > .env
npm ci
npm run build
sudo mkdir -p /var/www/shop
sudo cp -r dist/* /var/www/shop/
```

### Шаг 5. Nginx + SSL
```bash
sudo cp backend/nginx.conf.example /etc/nginx/sites-available/shop
sudo sed -i 's/your-domain.com/REAL-DOMAIN.com/g' /etc/nginx/sites-available/shop
sudo ln -s /etc/nginx/sites-available/shop /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d REAL-DOMAIN.com
```

### Шаг 6. Привязать WebApp в боте
В @BotFather: `/mybots → твой бот → Bot Settings → Menu Button → Configure menu button`
и вставь `https://REAL-DOMAIN.com`.

### Готово
Открывай бота в Telegram, жми «🛒 Магазин» — приложение работает.

---

## 14. Обновление и бэкапы

### Обновление кода
```bash
cd /srv/loveshop
git pull

# бэк (миграции применятся в CMD)
cd backend && docker compose up -d --build

# фронт
cd .. && npm ci && npm run build
sudo cp -r dist/* /var/www/shop/
```

### Бэкап Postgres (cron)
```bash
sudo crontab -e
# каждый день в 03:00:
0 3 * * * docker exec backend-postgres-1 pg_dump -U appuser shopdb | gzip > /srv/backups/shop_$(date +\%F).sql.gz
```

### Восстановление
```bash
gunzip -c /srv/backups/shop_2026-04-22.sql.gz | docker exec -i backend-postgres-1 psql -U appuser -d shopdb
```

### Логи
```bash
docker compose logs -f api          # API + бот
docker compose logs -f postgres     # БД
sudo tail -f /var/log/nginx/error.log
```

---

## 15. Безопасность

| Угроза | Митигация |
|--------|-----------|
| Подделка `tg_id` юзером | HMAC-валидация `initData` с `BOT_TOKEN` (24ч TTL) |
| Privilege escalation в админа | `is_admin` определяется **только** по `ADMIN_TG_IDS` env, не через UPDATE |
| Подмена крипто-адреса клиентом | Адреса захардкожены в `backend/src/routes/deposits.ts` |
| Race на списание баланса | `prisma.$transaction` на `POST /orders` |
| Спам в бот | `p-queue` 25 msg/sec + ретраи на `429` |
| Утечка JWT_SECRET | Только в `.env` бэка, никогда в коде / git |
| CORS | Whitelist через `CORS_ORIGIN`, `credentials: true` |
| XSS в каталог | Все строки из БД проходят через React (auto-escape) |
| Большие загрузки | `bodyLimit: 10MB`, `multipart.limits.fileSize: 10MB`, `client_max_body_size 15M` в nginx |

---

## 16. Траблшутинг

| Симптом | Что проверить |
|---------|---------------|
| **Личный кабинет пустой** | Бэк недоступен → запросы возвращают HTML вместо JSON. Проверь `docker compose ps` и `nginx -t`. Фронт защищён — крашиться не будет. |
| **Бот не отвечает на `/start`** | `docker compose logs api \| grep -i bot`. Проверь `TELEGRAM_BOT_TOKEN`. |
| **WebApp не открывается из бота** | `WEBAPP_URL` должен быть HTTPS и совпадать с тем, что в @BotFather. |
| **`login failed` в WebApp** | `BOT_TOKEN` на бэке отличается от токена бота, через который открыт WebApp. |
| **CORS ошибки** | Добавь домен фронта в `CORS_ORIGIN` (через запятую можно несколько). |
| **Не приходят фото подтверждений** | `nginx → /uploads/` должен раздавать ту же папку, что docker volume `uploads`. |
| **`products.filter is not a function`** | Старый кэш каталога в `localStorage`. В сторе уже стоит чистка legacy ключей при загрузке. |
| **Депозит не подтверждается** | Status должен быть `awaiting` или `pending`. Если `cancelled` — нужно создавать новый. |
| **Баланс не списался** | Смотри логи `/api/orders` — если `insufficient_balance`, фронт показал тост, заказ не создан. |
| **Миграции не применились** | `docker compose exec api npx prisma migrate deploy` вручную. |

---

## 📚 Полезные ссылки

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram WebApp validation](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- [Prisma docs](https://www.prisma.io/docs)
- [Fastify docs](https://www.fastify.io/docs/latest/)
- [CoinGecko API](https://www.coingecko.com/en/api/documentation)

---

_Версия документа: 2026-04-22._
