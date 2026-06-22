export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { name, phone, address, total, orderNumber, orderDetails } = req.body;
    
    // Sacamos las llaves secretas de Vercel
    const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!HUBSPOT_TOKEN) {
        return res.status(500).json({ error: 'Falta el token de configuración en Vercel' });
    }

    try {
        // 1. GUARDAR EN HUBSPOT (El CRM)
        const hubspotResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    firstname: name,
                    phone: phone,
                    address: address, 
                    lifecyclestage: "customer",
                    numero_de_orden: orderNumber,
                    detalles_del_pedido: orderDetails,
                    total_gastado: total.toString()
                }
            })
        });

        if (!hubspotResponse.ok) {
            console.error("Fallo enviando a HubSpot");
        }

        // 2. ENVIAR NOTIFICACIÓN A TELEGRAM
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const mensajeTelegram = `🚨 *NUEVA ORDEN EN MI TIENDA* 🚨\n\n👤 *Cliente:* ${name}\n📱 *Tel:* ${phone}\n📍 *Zona/Dir:* ${address}\n\n🛒 *Pedido:* ${orderDetails}\n\n💰 *Total:* ${total}\n📦 *Orden:* #${orderNumber}`;
            
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: mensajeTelegram,
                    parse_mode: 'Markdown'
                })
            });
        }

        return res.status(200).json({ success: true, message: '¡Lead guardado y notificado!' });
        
    } catch (error) {
        console.error("Error en API:", error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
 
