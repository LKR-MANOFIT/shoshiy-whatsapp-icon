# Shoshiy WhatsApp Icon

A tiny, **zero-dependency** floating **WhatsApp / Telegram** button you drop onto
any storefront with a single `<script>` tag. A visitor clicks it and lands in the
chat app with a **pre-filled message that's ready to send**. On a product page the
message is **dynamic** — it auto-detects the current product (name, price, URL)
and drops it into the text so you know exactly what the customer is asking about.

- 🟢 One script tag, no build step, no dependencies (~5 KB).
- 💬 Opens WhatsApp with a pre-written message the visitor just taps *Send* on.
- ✈️ Optional **Telegram** button too — show WhatsApp, Telegram, or both (stacked).
- 🛍️ Auto-fills product name / price / link on product detail pages.
- ⚙️ Configurable via `data-*` attributes or a JS config object.
- 📱 Works on desktop and mobile.

---

## Quick start

Add this once, just before `</body>`, on every page of the shop:

```html
<script
  src="https://cdn.jsdelivr.net/gh/LKR-MANOFIT/shoshiy-whatsapp-icon@main/src/shoshiy-whatsapp.js"
  data-phone="905551112233"
  data-message="Hello! 👋 I have a question."
  data-product-message="Hello! 👋 I'd like to order *{product}*{priceSuffix}.%0A{url}"
  data-label="Chat with us"
  defer></script>
```

- `data-phone` is the WhatsApp number — international format, digits only (country
  code first, no `+`, no spaces). Example: Turkey `905551112233`.
- That's it. The button appears bottom-right. On a product page the message is
  auto-filled with the product; everywhere else it uses `data-message`.

> **Minified build:** for production use the smaller minified file —
> `dist/shoshiy-whatsapp.min.js` (same API, ~9 KB). Swap `src/…` for `dist/…min.js`
> in the CDN URL, e.g.
> `https://cdn.jsdelivr.net/gh/LKR-MANOFIT/shoshiy-whatsapp-icon@main/dist/shoshiy-whatsapp.min.js`.
>
> **Self-hosting:** you don't have to use the CDN. Copy either
> `src/shoshiy-whatsapp.js` (readable) or `dist/shoshiy-whatsapp.min.js` (minified)
> onto your own server / theme assets and point `src` at it.

### WhatsApp + Telegram together

Set both `data-phone` and `data-telegram` to show two stacked buttons (Telegram
on top, WhatsApp in the corner). Either one alone works too — you need **at least
one** of the two.

```html
<script
  src="https://cdn.jsdelivr.net/gh/LKR-MANOFIT/shoshiy-whatsapp-icon@main/src/shoshiy-whatsapp.js"
  data-phone="905551112233"
  data-telegram="myshopusername"
  data-label="Message us"
  defer></script>
```

> **⚠️ Telegram pre-fill limitation.** Telegram does **not** let a link pre-fill
> the message for a direct person-to-person chat. So by default the Telegram
> button just **opens your chat** (`https://t.me/<username>`) with an empty
> compose box. If you'd rather have the product message pre-filled, set
> `data-telegram-share="true"` — this uses Telegram's *share* dialog, which
> carries the pre-filled text but asks the visitor to pick who to send it to.
> WhatsApp has no such limitation; its message is always pre-filled.
>
> `data-telegram` accepts a bare `@username`, a plain `username`, or a full
> `https://t.me/...` link (used verbatim — handy for group/channel/bot links).

---

## How the dynamic product message works

When the button is clicked on a product page, the widget reads the current
product from the page — in this order — and stops at the first match:

1. **Explicit override** — `window.ShoshiyWhatsApp.product = { name, price, currency, url, sku, brand }`
   (best for your own storefront: render it server-side into the page).
2. **JSON-LD** — a `<script type="application/ld+json">` block with
   `"@type": "Product"` (name, `offers.price`, `offers.priceCurrency`, `sku`,
   `brand`, `url`). This is what most themes already emit for SEO.
3. **Open Graph tags** — `og:title`, `product:price:amount`,
   `product:price:currency`, `og:url` (with `og:type` = `product`).

If none are present (e.g. the home page or a blog post) it falls back to the
plain `data-message`.

### Message placeholders

Use these in `data-message` / `data-product-message`:

| Placeholder      | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| `{product}`      | Product name (falls back to the page title)                  |
| `{price}`        | Price + currency, e.g. `199 TRY` (empty if unknown)          |
| `{priceSuffix}`  | ` (199 TRY)` — the price wrapped in parentheses, or empty    |
| `{url}`          | Product URL (or the current page URL)                        |
| `{sku}`          | Product SKU (if exposed)                                     |
| `{brand}`        | Brand name (if exposed)                                      |
| `{title}`        | The page `<title>`                                           |

A missing value resolves to an empty string, so templates never show `{price}`
literally. Use `%0A` for a line break inside a `data-*` attribute.

---

## Configuration

Every option can be set as a `data-*` attribute on the script tag, **or** on a
`window.ShoshiyWhatsApp` object defined *before* the script loads. Precedence:
defaults → `data-*` → `window.ShoshiyWhatsApp`.

You need **at least one** of `phone` / `telegram`.

| Option            | `data-*`               | Default                                          | Notes |
| ----------------- | ---------------------- | ------------------------------------------------ | ----- |
| `phone`           | `data-phone`           | — (none)                                          | WhatsApp number, digits only, country code first |
| `telegram`        | `data-telegram`        | — (none)                                          | Telegram `@username`, `username`, or `https://t.me/...` link |
| `telegramShare`   | `data-telegram-share`  | `false`                                          | `true` = share dialog with pre-filled text (see note above) |
| `message`         | `data-message`         | `Hello! 👋 I have a question.`                    | Non-product pages |
| `productMessage`  | `data-product-message` | `Hello! 👋 I'd like to order *{product}*{priceSuffix}.\n{url}` | Product pages |
| `position`        | `data-position`        | `bottom-right`                                   | `bottom-right` \| `bottom-left` |
| `color`           | `data-color`           | `#25D366`                                         | WhatsApp button background |
| `telegramColor`   | `data-telegram-color`  | `#229ED9`                                         | Telegram button background |
| `size`            | `data-size`            | `60`                                             | Button diameter (px) |
| `label`           | `data-label`           | — (none)                                          | Text shown beside the primary (corner) icon |
| `greeting`        | `data-greeting`        | — (none)                                          | One-time speech bubble on load |
| `greetingDelay`   | `data-greeting-delay`  | `1500`                                           | ms before the bubble shows |
| `offsetX`         | `data-offset-x`        | `20`                                             | px from horizontal edge |
| `offsetY`         | `data-offset-y`        | `20`                                             | px from bottom |
| `currency`        | `data-currency`        | — (none)                                          | Fallback currency label |
| `detectProduct`   | `data-detect-product`  | `true`                                           | `false` = always use `message` |
| `zIndex`          | `data-z-index`         | `2147483000`                                      | Stacking order |

### JS config example

```html
<script>
  window.ShoshiyWhatsApp = {
    phone: "905551112233",
    telegram: "myshopusername",
    label: "Sipariş için tıkla",
    greeting: "Merhaba! Yardımcı olabilir miyiz? 👋",
    productMessage: "Merhaba, *{product}* ürününü sipariş etmek istiyorum.%0A{url}",
    // Optional: feed the product yourself instead of relying on page metadata.
    product: { name: "Kırmızı Elbise", price: "499", currency: "TRY", url: location.href }
  };
</script>
<script src="/assets/shoshiy-whatsapp.js" defer></script>
```

### Programmatic open

Trigger a chat from your own code (e.g. a custom "Order" button):

```js
window.ShoshiyWhatsApp.open();            // primary channel (WhatsApp if set, else Telegram)
window.ShoshiyWhatsApp.open("whatsapp");  // force WhatsApp
window.ShoshiyWhatsApp.open("telegram");  // force Telegram
```

---

## Using it on a Shopinger storefront

Shopinger themes already emit JSON-LD / Open Graph product metadata, so the
widget picks up the current product automatically. Add the script tag to the
theme layout (or inject it through the platform storefront runtime) with the
shop's WhatsApp number. For the most reliable result on your own platform, have
the storefront render `window.ShoshiyWhatsApp.product` server-side on product
pages — that skips metadata scraping entirely.

---

## Demo

Open `demo/index.html` (a normal page) and `demo/product.html` (a page with
JSON-LD + Open Graph product data) in a browser to see the default vs. dynamic
message. Set your own number at the top of each file first.

---

## Build

The committed `dist/shoshiy-whatsapp.min.js` is generated from
`src/shoshiy-whatsapp.js`. To rebuild after editing the source:

```bash
npm install   # one-time, pulls esbuild
npm run build
```

## License

MIT — see [LICENSE](LICENSE).
