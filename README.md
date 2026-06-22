# Kodia Shop — Plantilla de tienda online

Tienda streetwear — React 18 (vía CDN) + Firebase Firestore. Sin framework
de build pesado: el JSX se pre-compila a un solo archivo con esbuild y el CSS
de Tailwind se genera estático. El navegador del cliente ya **no** compila nada.

## Estructura

```
index.html                 → shell HTML (carga dist/styles.css y dist/app.js)
admin.html                 → panel de administración
js/                        → código fuente (se edita aquí)
  utils.js                 → helpers compartidos
  App.js                   → componente raíz + estado + handlers
  components/              → HomeView, ProductDetail, Cart, PopupBanner, OrderConfirmModal
src/input.css              → directivas Tailwind + estilos propios
tailwind.config.js         → tema (colores, fuentes, animaciones)
build.js                   → compila js/ → dist/app.js
dist/                      → SALIDA del build (se commitea; lo sirve Vercel)
api/hubspot.js             → función serverless de Vercel
```

## Cómo trabajar

1. Editás los archivos en `js/` y/o estilos en `src/input.css`.
2. Antes de subir, regenerás el build:

   ```bash
   npm install   # solo la primera vez
   npm run build
   ```

   Esto produce `dist/styles.css` (CSS minificado) y `dist/app.js`
   (JSX transpilado y minificado).
3. Commiteás **tanto los fuentes (`js/`, `src/`) como `dist/`** y subís.

> Importante: si editás `js/` o `src/` pero **no** corrés `npm run build`,
> la web seguirá mostrando la versión anterior (la de `dist/`).

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
  cada lugar de la web. Esto también optimiza las imágenes ya subidas, sin
  re-subir nada. Si el proxy fallara, cada imagen cae automáticamente a su URL
  original de ImgBB (`onError`). Ver `optimizeImg` en `js/utils.js`.
