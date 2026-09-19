/*!
 * Shoshiy WhatsApp Icon — a zero-dependency floating WhatsApp button.
 *
 * Drop one <script> tag onto any site. It renders a floating WhatsApp button;
 * clicking it opens WhatsApp with a pre-filled message that is ready to send.
 * On a product page it auto-detects the current product (JSON-LD or Open Graph)
 * and injects the product name / price / URL into the message.
 *
 * Config via data-* attributes on the <script> tag, or a `window.ShoshiyWhatsApp`
 * object defined BEFORE this script loads. See README.md.
 *
 * License: MIT.
 */
(function () {
  "use strict";

  // Idempotent — never inject twice even if the tag is included more than once.
  if (window.__shoshiyWhatsAppLoaded) return;
  window.__shoshiyWhatsAppLoaded = true;

  // The <script> element that loaded us (for reading data-* config).
  var SCRIPT =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName("script");
      return all[all.length - 1];
    })();

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  var DEFAULTS = {
    phone: "", // REQUIRED — international format, digits only (e.g. 905551112233)
    // Message used on non-product pages.
    message: "Hello! 👋 I have a question.",
    // Message used on product detail pages. Placeholders: {product} {price}
    // {url} {sku} {brand} {title}. Missing values resolve to an empty string.
    productMessage: "Hello! 👋 I'd like to order *{product}*{priceSuffix}.\n{url}",
    position: "bottom-right", // bottom-right | bottom-left
    color: "#25D366", // WhatsApp green
    size: 60, // button diameter in px
    label: "", // optional text shown next to the icon (e.g. "Chat with us")
    greeting: "", // optional speech-bubble shown once on load (e.g. "Need help?")
    greetingDelay: 1500, // ms before the greeting bubble appears
    offsetX: 20, // px from the horizontal edge
    offsetY: 20, // px from the bottom edge
    zIndex: 2147483000,
    currency: "", // fallback currency label if the page doesn't expose one
    detectProduct: true // set false to always use `message`
  };

  function readDataConfig(el) {
    var cfg = {};
    if (!el || !el.dataset) return cfg;
    var d = el.dataset;
    var strs = [
      "phone",
      "message",
      "productMessage",
      "position",
      "color",
      "label",
      "greeting",
      "currency"
    ];
    strs.forEach(function (k) {
      if (d[k] != null && d[k] !== "") cfg[k] = d[k];
    });
    var nums = ["size", "offsetX", "offsetY", "zIndex", "greetingDelay"];
    nums.forEach(function (k) {
      if (d[k] != null && d[k] !== "") {
        var n = parseInt(d[k], 10);
        if (!isNaN(n)) cfg[k] = n;
      }
    });
    if (d.detectProduct != null) cfg.detectProduct = d.detectProduct !== "false";
    return cfg;
  }

  var userCfg =
    window.ShoshiyWhatsApp && typeof window.ShoshiyWhatsApp === "object"
      ? window.ShoshiyWhatsApp
      : {};

  // Precedence: hard defaults < data-* on the tag < window.ShoshiyWhatsApp.
  var cfg = assign({}, DEFAULTS, readDataConfig(SCRIPT), userCfg);

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var key in src) {
        if (Object.prototype.hasOwnProperty.call(src, key)) target[key] = src[key];
      }
    }
    return target;
  }

  // ---------------------------------------------------------------------------
  // Product detection (dynamic data)
  // ---------------------------------------------------------------------------

  function str(v) {
    return v == null ? "" : String(v).trim();
  }

  function normalizeProduct(p) {
    if (!p) return null;
    var out = {
      name: str(p.name),
      price: str(p.price),
      currency: str(p.currency),
      url: str(p.url),
      sku: str(p.sku),
      brand: str(p.brand),
      image: str(p.image)
    };
    return out.name || out.price ? out : null;
  }

  function meta(prop) {
    var el =
      document.querySelector('meta[property="' + prop + '"]') ||
      document.querySelector('meta[name="' + prop + '"]');
    return el ? el.getAttribute("content") : null;
  }

  // Walk a JSON-LD graph and return the first node that is a Product.
  function findProductNode(node) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        var found = findProductNode(node[i]);
        if (found) return found;
      }
      return null;
    }
    if (Array.isArray(node["@graph"])) {
      var g = findProductNode(node["@graph"]);
      if (g) return g;
    }
    var t = node["@type"];
    if (t === "Product" || (Array.isArray(t) && t.indexOf("Product") >= 0)) {
      return node;
    }
    return null;
  }

  function fromJsonLd() {
    var nodes = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    for (var i = 0; i < nodes.length; i++) {
      var data;
      try {
        data = JSON.parse(nodes[i].textContent);
      } catch (e) {
        continue;
      }
      var product = findProductNode(data);
      if (!product) continue;
      var offers = product.offers;
      if (Array.isArray(offers)) offers = offers[0];
      offers = offers || {};
      var brand = product.brand;
      if (brand && typeof brand === "object") brand = brand.name;
      var image = product.image;
      if (Array.isArray(image)) image = image[0];
      return normalizeProduct({
        name: product.name,
        sku: product.sku,
        brand: brand,
        price: offers.price,
        currency: offers.priceCurrency,
        url: product.url || offers.url || location.href,
        image: image
      });
    }
    return null;
  }

  function fromOpenGraph() {
    var type = meta("og:type");
    var price = meta("product:price:amount") || meta("og:price:amount");
    var title = meta("og:title");
    // Only treat this as a product page if OG says so or a price is present.
    if (type !== "product" && !price) return null;
    return normalizeProduct({
      name: title,
      price: price,
      currency: meta("product:price:currency") || meta("og:price:currency"),
      url: meta("og:url") || location.href,
      image: meta("og:image")
    });
  }

  // Resolved at CLICK time so single-page-app navigation stays accurate.
  function detectProduct() {
    if (cfg.detectProduct === false) return null;
    // Explicit override wins — a storefront can set this server-side.
    if (window.ShoshiyWhatsApp && window.ShoshiyWhatsApp.product) {
      return normalizeProduct(window.ShoshiyWhatsApp.product);
    }
    return fromJsonLd() || fromOpenGraph();
  }

  function buildMessage() {
    var product = detectProduct();
    var template = product ? cfg.productMessage : cfg.message;
    var priceLabel = "";
    if (product && product.price) {
      var cur = product.currency || cfg.currency;
      priceLabel = product.price + (cur ? " " + cur : "");
    }
    var vars = {
      product: (product && product.name) || document.title || "",
      title: document.title || "",
      url: (product && product.url) || location.href,
      price: priceLabel,
      priceSuffix: priceLabel ? " (" + priceLabel + ")" : "",
      sku: (product && product.sku) || "",
      brand: (product && product.brand) || ""
    };
    return template.replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m;
    });
  }

  function openChat() {
    var phone = str(cfg.phone).replace(/[^\d]/g, "");
    if (!phone) {
      // Fail loud in the console, silent for the visitor.
      if (window.console) {
        console.warn(
          "[Shoshiy WhatsApp] No phone number configured — set data-phone."
        );
      }
      return;
    }
    var url =
      "https://wa.me/" + phone + "?text=" + encodeURIComponent(buildMessage());
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  var WA_ICON =
    '<svg viewBox="0 0 32 32" width="60%" height="60%" fill="#fff" aria-hidden="true">' +
    '<path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.73 6.4L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.62h.01c7.06 0 12.8-5.74 12.8-12.8s-5.75-12.7-12.81-12.7zm0 23.02h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4 1.05 1.07-3.9-.25-.4a10.56 10.56 0 0 1-1.62-5.63c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.5 1.11 7.51 3.12a10.55 10.55 0 0 1 3.11 7.52c0 5.86-4.77 10.62-10.64 10.62zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55l-.6-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.64s1.13 3.06 1.29 3.27c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.51 1.8.66.76.24 1.44.21 1.98.13.6-.09 1.89-.77 2.16-1.52.27-.75.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37z"/>' +
    "</svg>";

  function injectStyles() {
    if (document.getElementById("shoshiy-wa-styles")) return;
    var side = cfg.position === "bottom-left" ? "left" : "right";
    var css =
      "" +
      ".shoshiy-wa-wrap{position:fixed;bottom:" +
      cfg.offsetY +
      "px;" +
      side +
      ":" +
      cfg.offsetX +
      "px;z-index:" +
      cfg.zIndex +
      ";display:flex;align-items:center;gap:10px;flex-direction:" +
      (side === "left" ? "row" : "row-reverse") +
      ";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
      ".shoshiy-wa-btn{width:" +
      cfg.size +
      "px;height:" +
      cfg.size +
      "px;border-radius:50%;background:" +
      cfg.color +
      ";border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:transform .15s ease,box-shadow .15s ease;padding:0}" +
      ".shoshiy-wa-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.3)}" +
      ".shoshiy-wa-btn:focus-visible{outline:3px solid rgba(37,211,102,.5);outline-offset:2px}" +
      ".shoshiy-wa-label{background:#fff;color:#111;padding:8px 12px;border-radius:20px;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.15);white-space:nowrap}" +
      ".shoshiy-wa-bubble{position:absolute;bottom:" +
      (cfg.size + 14) +
      "px;" +
      side +
      ":0;background:#fff;color:#111;padding:10px 14px;border-radius:14px;font-size:14px;max-width:220px;box-shadow:0 4px 16px rgba(0,0,0,.18);opacity:0;transform:translateY(6px);transition:opacity .25s ease,transform .25s ease;pointer-events:none}" +
      ".shoshiy-wa-bubble.show{opacity:1;transform:translateY(0)}" +
      "@media (prefers-reduced-motion:reduce){.shoshiy-wa-btn,.shoshiy-wa-bubble{transition:none}}";
    var style = document.createElement("style");
    style.id = "shoshiy-wa-styles";
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  function render() {
    injectStyles();

    var wrap = document.createElement("div");
    wrap.className = "shoshiy-wa-wrap";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shoshiy-wa-btn";
    btn.setAttribute("aria-label", cfg.label || "Chat on WhatsApp");
    btn.innerHTML = WA_ICON;
    btn.addEventListener("click", openChat);

    wrap.appendChild(btn);

    if (cfg.label) {
      var label = document.createElement("span");
      label.className = "shoshiy-wa-label";
      label.textContent = cfg.label; // textContent → no HTML injection
      wrap.appendChild(label);
    }

    if (cfg.greeting) {
      var bubble = document.createElement("div");
      bubble.className = "shoshiy-wa-bubble";
      bubble.textContent = cfg.greeting;
      wrap.appendChild(bubble);
      setTimeout(function () {
        bubble.classList.add("show");
      }, cfg.greetingDelay);
      // Hide the greeting once the button is used.
      btn.addEventListener("click", function () {
        bubble.classList.remove("show");
      });
    }

    document.body.appendChild(wrap);
  }

  // Public API — lets a host page reconfigure / re-open programmatically.
  window.ShoshiyWhatsApp = assign(userCfg, {
    open: openChat,
    config: cfg
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
