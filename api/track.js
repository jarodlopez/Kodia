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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { type, data = {}, userId, sessionId } = req.body || {};
        if (!type) return res.status(400).json({ error: 'type requerido' });

        // Vercel coloca la IP del cliente en x-forwarded-for (primer valor).
        const fwd = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
        const ip = String(fwd).split(',')[0].trim() || 'unknown';
        const ipHash = crypto.createHash('sha256').update(ip + SALT).digest('hex').slice(0, 24);

        const now = new Date();
        const doc = {
            type,
            ...data,
            userId: userId || null,
            sessionId: sessionId || null,
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
