// Globals disponibles desde index.html: React, db, IMGBB_API_KEY

// ============================================================
// SISTEMA DE MARCA (white-label) — toda la identidad de la
// tienda vive en Firestore (settings/store) y se edita desde el
// admin. Estos son los valores neutros de la plantilla.
// ============================================================
window.BRAND_DEFAULTS = {
    brandName: 'MI TIENDA',
    logoUrl: '',
    accentColor: '#ffffff',
    marqueeText: 'BIENVENIDO A NUESTRA TIENDA // ENVÍOS A TODO EL PAÍS //',
    whatsapp: '',            // sin número → se oculta el botón flotante
    currency: 'C$',
    variantLabel: 'TALLA',   // ropa: TALLA · ferretería: MEDIDA / PRESENTACIÓN
    cartTitle: 'TU CARRITO',
    orderPrefix: 'ORD',
};

// Módulos activables desde el Super Admin (settings/store.features)
window.DEFAULT_FEATURES = {
    heroSlider: true,
    discounts: true,
    banners: true,
    sizeGuide: true,
    whatsappFab: true,
    analytics: true,
};

window.DEFAULT_ZONES = [{ id: 'local', label: 'ENTREGA LOCAL', cost: 0 }];

let _brandCache = null;
window.getBranding = () => {
    if (_brandCache) return _brandCache;
    try { _brandCache = { ...window.BRAND_DEFAULTS, ...(JSON.parse(localStorage.getItem('kodia_branding')) || {}) }; }
    catch { _brandCache = { ...window.BRAND_DEFAULTS }; }
    return _brandCache;
};

window.getFeatures = (storeConfig) => ({ ...window.DEFAULT_FEATURES, ...(storeConfig?.features || {}) });

window.getZones = (storeConfig) =>
    (Array.isArray(storeConfig?.shippingZones) && storeConfig.shippingZones.length > 0)
        ? storeConfig.shippingZones
        : window.DEFAULT_ZONES;

const hexToRgbStr = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : '255 255 255';
};

const setAccentVars = (hex) => {
    const s = document.documentElement.style;
    s.setProperty('--accent', hex);
    s.setProperty('--accent-rgb', hexToRgbStr(hex));
};

// Aplica la marca del storeConfig (color como variables CSS) y la
// cachea en localStorage para que no haya "flash" en la próxima visita.
window.applyBranding = (storeConfig = {}) => {
    const branding = { ...window.BRAND_DEFAULTS, ...(storeConfig.branding || {}) };
    _brandCache = branding;
    setAccentVars(branding.accentColor);
    try { localStorage.setItem('kodia_branding', JSON.stringify(branding)); } catch {}
    return branding;
};

// Aplicar de inmediato la marca cacheada, antes del fetch a Firestore
setAccentVars(window.getBranding().accentColor);

window.fmtPrice = (n) => `${window.getBranding().currency} ${n}`;

// Logo del header: imagen si el cliente subió una, texto si no
window.BrandLogo = () => {
    const b = window.getBranding();
    return b.logoUrl
        ? <img src={b.logoUrl} alt={b.brandName} className="h-9 md:h-12 w-auto object-contain" draggable={false} />
        : <h1 className="neon-flicker text-3xl md:text-5xl font-bebas tracking-wider leading-none m-0">{b.brandName}</h1>;
};


// Identidad anónima del visitante para deduplicar usuarios únicos. El backend
// (/api/track) además captura el hash de la IP real, que es lo más confiable;
// estos IDs son un respaldo para navegadores que sí conservan storage.
window.getOrCreateUserId = () => {
    try {
        let uid = localStorage.getItem('kodia_uid');
        if (!uid) {
            uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
            localStorage.setItem('kodia_uid', uid);
        }
        return uid;
    } catch { return 'anon'; }
};

window.getOrCreateSessionId = () => {
    try {
        let sid = sessionStorage.getItem('kodia_sid');
        if (!sid) {
            sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
            sessionStorage.setItem('kodia_sid', sid);
        }
        return sid;
    } catch { return 'anon_s'; }
};

// Enviamos el evento al endpoint /api/track del servidor en lugar de escribir
// directo a Firestore: así el backend captura la IP REAL del visitante (que el
// navegador no puede falsificar) y la deduplica en usuarios únicos confiables.
// keepalive permite que el evento se envíe aunque la página esté navegando
// (clave para checkout_started justo antes de cambiar de página).
window.trackEvent = async (type, data = {}) => {
    try {
        await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                data,
                userId: window.getOrCreateUserId(),
                sessionId: window.getOrCreateSessionId(),
            }),
            keepalive: true,
        });
    } catch (e) { /* nunca interrumpir la UX por un error de tracking */ }
};

// Comprime y redimensiona una imagen en el navegador ANTES de subirla.
// Convierte a WebP (~1400px máx, calidad 82%) — una foto de varios MB
// suele bajar a ~150-250 KB. Si algo falla, devuelve el archivo original.
window.compressImage = async (file, { maxDim = 1400, quality = 0.82 } = {}) => {
    try {
        if (!file || !file.type || !file.type.startsWith('image/')) return file;
        // Los GIF (posible animación) y SVG (vectorial) se dejan tal cual.
        if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = dataUrl;
        });

        let { width, height } = img;
        if (!width || !height) return file;
        if (width > maxDim || height > maxDim) {
            const scale = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
        if (!blob || blob.size >= file.size) return file; // si no ayuda, mantener original

        const baseName = (file.name || 'imagen').replace(/\.[^.]+$/, '');
        return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
    } catch (e) {
        return file; // ante cualquier error, subir el original
    }
};

window.uploadToImgBB = async (file) => {
    const optimized = await window.compressImage(file);
    const fd = new FormData();
    fd.append("image", optimized);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error("Error subiendo imagen a ImgBB");
};

// Sirve las imágenes de ImgBB a través de wsrv.nl (sobre Cloudflare):
// las convierte a WebP y las redimensiona al ancho necesario, on-the-fly.
// Optimiza también las imágenes ya subidas, sin re-subir nada.
// Si la URL no es de ImgBB (data:, relativa, etc.) se deja intacta.
//
// El ancho pedido se normaliza a pocos tamaños fijos (600/1200/1600) para
// que todas las vistas compartan la MISMA URL por imagen: la miniatura del
// carrito reutiliza la variante ya descargada en el grid en lugar de
// generar una nueva en frío en el proxy.
window.optimizeImg = (url, width) => {
    if (!url || typeof url !== 'string') return url;
    if (!/^https?:\/\/i\.ibb\.co\//i.test(url)) return url;
    const clean = url.replace(/^https?:\/\//i, '');
    const bucket = width ? (width <= 600 ? 600 : width <= 1200 ? 1200 : 1600) : 0;
    const w = bucket ? `&w=${bucket}` : '';
    // &we = no agrandar imágenes más chicas que el ancho pedido
    // &il = WebP progresivo: se ve algo borroso de inmediato en vez de nada
    return `https://wsrv.nl/?url=${encodeURIComponent(clean)}${w}&output=webp&q=82&we&il`;
};

window.getPrice = (product) =>
    product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.price;

// Botón flotante de WhatsApp. Si recibe un producto, el mensaje lleva su
// detalle (título, variante elegida, precio y link); si no, un saludo genérico.
// Se oculta si la tienda no configuró número o el módulo está desactivado.
window.WhatsAppFab = ({ product, selectedSize, storeConfig }) => {
    const b = getBranding();
    if (!b.whatsapp || getFeatures(storeConfig).whatsappFab === false) return null;
    const lines = product
        ? [
            `Hola ${b.brandName} 👋 Me interesa este producto:`,
            '',
            `*${product.title}*`,
            selectedSize ? `${b.variantLabel}: ${selectedSize}` : null,
            `Precio: ${fmtPrice(getPrice(product))}`,
            `${window.location.origin}/producto/${product.id}`,
        ].filter(l => l !== null)
        : [`Hola ${b.brandName} 👋 Quiero más información sobre sus productos.`];
    const href = `https://wa.me/${b.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escribinos por WhatsApp"
            onClick={() => trackEvent('whatsapp_click', product ? { productId: product.id, productTitle: product.title } : {})}
            className="fixed bottom-6 left-4 z-[100] w-[52px] h-[52px] rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: '#25D366', boxShadow: '0 4px 20px rgba(37,211,102,0.45), 0 2px 8px rgba(0,0,0,0.5)' }}
        >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#000">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
        </a>
    );
};

window.Toast = ({ message, isVisible }) => (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-accent text-black font-bebas px-6 py-3 text-xl border-2 border-black flex items-center gap-3 shadow-[4px_4px_0_white]">
            <span className="text-2xl">✓</span> {message}
        </div>
    </div>
);

// width (opcional): ancho objetivo en px para que el proxy redimensione.
// Si el proxy fallara, onError cae automáticamente a la URL original.
window.SmoothImage = ({ src, className, alt, eager, width }) => (
    <img
        src={window.optimizeImg(src, width)}
        data-fallback={src}
        className={`img-fade ${className}`}
        onLoad={(e) => e.target.classList.add('img-loaded')}
        onError={(e) => {
            const original = e.target.dataset.fallback;
            if (original && e.target.src !== original) {
                e.target.src = original;
            }
        }}
        alt={alt || window.getBranding().brandName}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
    />
);
