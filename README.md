# Kodia Shop — Plantilla white-label de tienda online

Plantilla de e-commerce lista para clonar por cliente: **React 18 (vía CDN) +
Firebase Firestore + Vercel**. Sin framework de build pesado: el JSX se
pre-compila a bundles con esbuild y el CSS de Tailwind se genera estático, así
que el navegador del cliente **no** compila nada en runtime.

Toda la identidad y el comportamiento de la tienda (marca, color, moneda,
zonas de envío, datos de pago, módulos activos, roles) se configuran **desde el
admin**, sin tocar código. Se adapta a cualquier rubro (ropa, ferretería,
cosméticos, etc.).

> **Para poner en marcha una tienda nueva, seguí [`TEMPLATE.md`](./TEMPLATE.md)** —
> tiene el paso a paso de Firebase, ImgBB, placeholders, SEO, Vercel y reglas de
> seguridad (estas últimas son **obligatorias** antes de producción).

## Estructura

```
index.html                 → vitrina (carga dist/styles.css y dist/app.js)
product.html               → detalle de producto (ruta /producto/:id)
checkout.html              → checkout
pago.html                  → página de pago segura (ruta /pago/:id)
admin/index.html           → panel de administración (ruta /admin)
admin/views/               → vistas del panel (Inventario, Órdenes, Diseño…)
admin/admin-panel.js       → shell + estado del admin
js/                        → código fuente de la tienda (se edita aquí)
  firebase-init.js         → init de Firebase + llaves de la tienda
  utils.js                 → helpers compartidos (branding, precios, tracking)
  App.js                   → componente raíz de la vitrina
  components/              → Home, ProductDetail, Cart, PopupBanner, OrderConfirmModal
  *-entry.js               → bootstraps de product / checkout / pago
src/input.css              → directivas Tailwind + estilos propios
tailwind.config.js         → tema (colores, fuentes, animaciones)
build.js                   → compila js/ y admin/ → dist/*
dist/                      → SALIDA del build (se commitea; lo sirve Vercel)
api/                       → funciones serverless de Vercel
  track.js                 → tracking server-side (analytics anónimos por IP)
  payment.js               → entrega/actualiza órdenes vía cuenta de servicio
  hubspot.js               → sync opcional a HubSpot + aviso por Telegram
middleware.js              → SEO dinámico por producto (Edge Middleware)
firestore.rules            → reglas de seguridad (desplegar — ver TEMPLATE.md)
firebase.json              → config de Firebase CLI
vercel.json                → rewrites de rutas y desactivación del build en Vercel
```

## Cómo trabajar

1. Editás los archivos en `js/`, `admin/` y/o estilos en `src/input.css`.
2. Antes de subir, regenerás el build:

   ```bash
   npm install   # solo la primera vez
   npm run build
   ```

   Esto produce `dist/styles.css` (CSS minificado) y los bundles JS
   (`app.js`, `product.js`, `checkout.js`, `pago.js`, `admin-views.js`,
   `admin-panel.js`) transpilados y minificados.
3. Commiteás **tanto los fuentes (`js/`, `admin/`, `src/`) como `dist/`** y subís.

> Importante: si editás los fuentes pero **no** corrés `npm run build`, la web
> seguirá mostrando la versión anterior (la de `dist/`).

### Atajos

- `npm run build:css` → solo el CSS
- `npm run build:js`  → solo el JS

## Imágenes (optimización automática)

No requiere acción manual:

- **Al subir** (desde la web o el admin): la imagen se comprime y redimensiona
  en el navegador a WebP (~1400px, calidad 82%) antes de mandarla a ImgBB.
  Una foto de varios MB suele quedar en ~150-250 KB. Ver `compressImage`.
- **Al mostrar**: las imágenes de ImgBB se sirven vía `wsrv.nl` (sobre
  Cloudflare), que las convierte a WebP y las redimensiona al ancho que pide
  cada lugar de la web. Si el proxy fallara, cada imagen cae automáticamente a
  su URL original de ImgBB (`onError`). Ver `optimizeImg` en `js/utils.js`.
