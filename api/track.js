// Endpoint de tracking del lado del servidor.
// Captura la IP REAL del visitante (que el navegador no puede falsificar) y la
// convierte en un hash anónimo estable (ipHash). Así el admin puede contar
// usuarios únicos reales y carritos abandonados sin depender de localStorage,
// que el propio usuario puede borrar o evadir en modo incógnito.
//
// PLANTILLA: requiere las env vars FIREBASE_PROJECT_ID y FIREBASE_API_KEY en
// Vercel (con fallback a placeholders). TRACK_SALT es opcional.
import crypto from 'crypto';

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'TU_PROYECTO';
const API_KEY = process.env.FIREBASE_API_KEY || 'TU_FIREBASE_API_KEY';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
// Sal para el hash. Configurable por env var; con un fallback fijo para que el
// hash de una misma IP sea estable a lo largo del período (permite deduplicar).
const SALT = process.env.TRACK_SALT || 'kodia_analytics_v1';

// Convierte un valor JS al formato de campo de la API REST de Firestore.
const toValue = (v) => {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') {
        return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    }
    return { stringValue: String(v) };
};

const toFields = (obj) => {
    const fields = {};
    for (const [k, val] of Object.entries(obj)) {
        if (val === undefined) continue;
        fields[k] = toValue(val);
    }
    return fields;
};

// Endpoint público (sin auth): acotamos el daño posible. Solo se aceptan los
// tipos de evento conocidos, y los datos se sanitizan a escalares cortos para
// que no se pueda inflar/ensuciar la colección con documentos arbitrarios.
const ALLOWED_TYPES = new Set([
    'page_view', 'product_view', 'add_to_cart', 'whatsapp_click', 'checkout_started',
]);

const sanitizeData = (data) => {
    const clean = {};
    if (!data || typeof data !== 'object') return clean;
    let count = 0;
    for (const [k, v] of Object.entries(data)) {
        if (count >= 20) break;
        if (typeof k !== 'string' || k.length > 64) continue;
        if (typeof v === 'number' && Number.isFinite(v)) { clean[k] = v; count++; }
        else if (typeof v === 'boolean') { clean[k] = v; count++; }
        else if (typeof v === 'string') { clean[k] = v.slice(0, 500); count++; }
        // objetos/arrays se descartan
    }
    return clean;
};

const safeStr = (v, max) => (typeof v === 'string' ? v.slice(0, max) : null);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { type, data = {}, userId, sessionId } = req.body || {};
        // type es obligatorio y debe ser un evento conocido (no romper UX: 200).
        if (!type || !ALLOWED_TYPES.has(type)) {
            return res.status(200).json({ success: false });
        }

        // Vercel coloca la IP del cliente en x-forwarded-for (primer valor).
        const fwd = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
        const ip = String(fwd).split(',')[0].trim() || 'unknown';
        const ipHash = crypto.createHash('sha256').update(ip + SALT).digest('hex').slice(0, 24);

        const now = new Date();
        const doc = {
            type,
            ...sanitizeData(data),
            userId: safeStr(userId, 64),
            sessionId: safeStr(sessionId, 64),
            ipHash,
            timestamp: now.toISOString(),
            date: now.toISOString().split('T')[0],
        };

        await fetch(`${FIRESTORE}/analytics?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ fields: toFields(doc) }),
        });

        return res.status(200).json({ success: true });
    } catch (e) {
        // El tracking nunca debe romper la experiencia del usuario.
        return res.status(200).json({ success: false });
    }
}
