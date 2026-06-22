// Endpoint seguro para la página de pago.
// El cliente en /pago NO está autenticado y las reglas de Firestore (bien
// configuradas) no le permiten leer ni actualizar 'orders'. Este endpoint se
// autentica como la CUENTA DE SERVICIO de Firebase (saltando las reglas de
// forma segura) para: (1) entregar el resumen de la orden validando el token,
// y (2) adjuntar el comprobante de pago.
//
// No usa firebase-admin (que requeriría npm install, deshabilitado en este
// proyecto): firma un JWT con el módulo nativo `crypto` y lo intercambia por
// un access token OAuth2, luego llama a la API REST de Firestore autenticado.
//
// PLANTILLA: requiere las env vars en Vercel:
//   FIREBASE_SERVICE_ACCOUNT  → JSON completo de la cuenta de servicio.
//   FIREBASE_PROJECT_ID       → id del proyecto (fallback: TU_PROYECTO).
// Opcionales: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (notificación al admin).
import crypto from 'crypto';

const PROJECT = process.env.FIREBASE_PROJECT_ID || 'TU_PROYECTO';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const PAID_STATUSES = ['paid_pending_verification', 'verified', 'preparing', 'shipped', 'delivered'];

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken() {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }));
    const unsigned = `${header}.${claim}`;
    const signature = b64url(crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key));
    const jwt = `${unsigned}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('No se pudo obtener access token');
    return data.access_token;
}

// --- Conversores entre JS y el formato tipado de la API REST de Firestore ---
const fromValue = (v) => {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
    if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
    return null;
};
const fromFields = (fields) => {
    const obj = {};
    for (const k in fields) obj[k] = fromValue(fields[k]);
    return obj;
};
const toValue = (v) => {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    return { stringValue: String(v) };
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ error: 'config_missing' });
    }

    try {
        const { action, orderNumber, token, receiptUrl } = req.body || {};
        if (!orderNumber || !token) return res.status(400).json({ error: 'missing_params' });

        const accessToken = await getAccessToken();
        const authHeaders = { Authorization: `Bearer ${accessToken}` };

        const r = await fetch(`${FIRESTORE}/orders/${encodeURIComponent(orderNumber)}`, { headers: authHeaders });
        if (r.status === 404) return res.status(404).json({ error: 'not_found' });
        if (!r.ok) return res.status(500).json({ error: 'firestore_error' });

        const doc = await r.json();
        const order = fromFields(doc.fields || {});

        // Validación del token: protege la orden contra accesos por adivinanza
        if (!order.paymentToken || order.paymentToken !== token) {
            return res.status(403).json({ error: 'invalid_token' });
        }

        if (action === 'get') {
            // Los datos de pago (paymentInfo) son white-label: viven en
            // settings/store y se editan desde el admin. Los leemos aquí porque
            // la página de pago no puede acceder a Firestore directamente.
            let paymentInfo = '';
            try {
                const s = await fetch(`${FIRESTORE}/settings/store`, { headers: authHeaders });
                if (s.ok) {
                    const sDoc = await s.json();
                    const store = fromFields(sDoc.fields || {});
                    paymentInfo = store.paymentInfo || '';
                }
            } catch { /* paymentInfo opcional */ }

            return res.status(200).json({
                order: {
                    orderNumber: order.orderNumber,
                    customerName: order.customer?.name || '',
                    items: (order.items || []).map(i => ({
                        title: i.title, selectedSize: i.selectedSize,
                        price: i.price, discountPrice: i.discountPrice,
                    })),
                    subtotal: order.subtotal,
                    discountCode: order.discountCode,
                    discountAmount: order.discountAmount,
                    shippingZone: order.shippingZone,
                    shippingCost: order.shippingCost,
                    total: order.total,
                    paymentInfo,
                    alreadyPaid: PAID_STATUSES.includes(order.status),
                }
            });
        }

        if (action === 'pay') {
            if (!receiptUrl) return res.status(400).json({ error: 'missing_receipt' });
            if (PAID_STATUSES.includes(order.status)) return res.status(200).json({ success: true, already: true });

            const mask = ['status', 'receiptUrl', 'seenByAdmin', 'paidAt']
                .map(f => `updateMask.fieldPaths=${f}`).join('&');
            const body = {
                fields: {
                    status: toValue('paid_pending_verification'),
                    receiptUrl: toValue(receiptUrl),
                    seenByAdmin: toValue(false),
                    paidAt: toValue(new Date().toISOString()),
                }
            };
            const u = await fetch(`${FIRESTORE}/orders/${encodeURIComponent(orderNumber)}?${mask}`, {
                method: 'PATCH',
                headers: { ...authHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!u.ok) return res.status(500).json({ error: 'update_failed' });

            // Notificación instantánea al admin por Telegram (best-effort, opcional)
            const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
            if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
                const msg = `*PAGO RECIBIDO*\n\nOrden: *#${order.orderNumber}*\n${order.customer?.name || ''}\nTotal: ${order.total}\n\nComprobante: ${receiptUrl}\n\n_Verifica el pago en el panel._`;
                try {
                    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
                    });
                } catch { /* no romper el flujo */ }
            }

            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'invalid_action' });
    } catch (e) {
        return res.status(500).json({ error: 'server_error' });
    }
}
