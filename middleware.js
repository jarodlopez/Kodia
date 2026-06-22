const BRAND = 'MI TIENDA'; // PLANTILLA: nombre de la marca para meta tags de bots
const BOT_UA = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingbot/i;
const SITE = 'https://mitienda.vercel.app'; // PLANTILLA: dominio del cliente
const PROJECT = 'TU_PROYECTO';
const API_KEY = 'TU_FIREBASE_API_KEY';
const FALLBACK_IMG = '';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

export const config = { matcher: ['/', '/producto/:path*'] };

export default async function middleware(request) {
  const url = new URL(request.url);

  // Detect product ID — from clean URL (/producto/ID) or legacy query (?product=ID)
  const pathProduct = url.pathname.startsWith('/producto/')
    ? url.pathname.replace('/producto/', '')
    : null;
  const productId = pathProduct || url.searchParams.get('product');
  const categoryId = url.searchParams.get('category');

  if (!productId && !categoryId) return;

  // Real user → pass through, let React handle it
  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return;

  const h = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const buildHtml = (meta) => `<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>${h(meta.title)}</title>
<meta name="description" content="${h(meta.desc)}">
<link rel="canonical" href="${meta.url}">
<meta property="og:type" content="${meta.type || 'website'}">
<meta property="og:url" content="${meta.url}">
<meta property="og:title" content="${h(meta.title)}">
<meta property="og:description" content="${h(meta.desc)}">
<meta property="og:image" content="${h(meta.image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1500">
<meta property="og:site_name" content="${BRAND}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${h(meta.title)}">
<meta name="twitter:description" content="${h(meta.desc)}">
<meta name="twitter:image" content="${h(meta.image)}">
</head><body></body></html>`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    let meta;

    if (productId) {
      const res = await fetch(`${FIRESTORE}/products/${productId}?key=${API_KEY}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return;

      const { fields: f = {} } = await res.json();
      const title = f.title?.stringValue || BRAND;
      const rawDesc = f.description?.stringValue || '';
      const desc = rawDesc.slice(0, 155) ||
        `${title} en ${BRAND}.`;
      const imgArr = f.images?.arrayValue?.values || [];
      const image = imgArr[0]?.stringValue || FALLBACK_IMG;
      const productUrl = pathProduct
        ? `${SITE}/producto/${productId}`
        : `${SITE}/?product=${productId}`;

      meta = { title: `${title} – ${BRAND}`, desc, image, url: productUrl, type: 'product' };

    } else {
      const res = await fetch(`${FIRESTORE}/settings/store?key=${API_KEY}`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return;

      const { fields: f = {} } = await res.json();
      const covers = f.categoryCovers?.mapValue?.fields || {};
      const decodedCat = decodeURIComponent(categoryId);
      let image = covers[decodedCat]?.stringValue;

      if (!image) {
        try {
          const qRes = await fetch(`${FIRESTORE}:runQuery?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'products' }],
                where: { fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: { stringValue: decodedCat } } },
                limit: 1,
              },
            }),
          });
          if (qRes.ok) {
            const rows = await qRes.json();
            const imgArr = rows[0]?.document?.fields?.images?.arrayValue?.values || [];
            image = imgArr[0]?.stringValue;
          }
        } catch { /* ignore */ }
      }

      image = image || FALLBACK_IMG;

      meta = {
        title: `Colección ${decodedCat} – ${BRAND}`,
        desc: `Descubrí la colección ${decodedCat} de ${BRAND}.`,
        image,
        url: `${SITE}/?category=${categoryId}`,
        type: 'website',
      };
    }

    return new Response(buildHtml(meta), {
      headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-store' },
    });

  } catch {
    return;
  }
}
