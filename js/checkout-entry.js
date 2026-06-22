// Globals disponibles desde checkout.html: React, ReactDOM, db, firebase, IMGBB_API_KEY
// Utils: getPrice, optimizeImg, trackEvent, Toast, compressImage, SmoothImage
//
// Checkout en dos pasos: el cliente confirma su pedido (queda en estado
// 'awaiting_payment_link') y envía el resumen por WhatsApp. El admin genera un
// link de pago seguro desde el panel y se lo manda; el cliente paga y sube el
// comprobante en /pago/. La marca, zonas y WhatsApp vienen de settings/store.

function CheckoutApp() {
    const { useState, useEffect } = React;

    const [cart] = useState(() => {
        try { return JSON.parse(localStorage.getItem('kodia_cart')) || []; } catch { return []; }
    });
    const [meta] = useState(() => {
        try { return JSON.parse(localStorage.getItem('kodia_checkout_meta')) || {}; } catch { return {}; }
    });

    const [storeConfig, setStoreConfig] = useState(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('kodia_store_cache'));
            if (parsed && Date.now() - parsed.ts < 20 * 60 * 1000) return parsed.config || {};
        } catch {}
        return {};
    });
    const [shippingZone, setShippingZone] = useState(meta.shippingZone || '');
    const [appliedDiscount, setAppliedDiscount] = useState(meta.appliedDiscount || null);
    const [discountCodes, setDiscountCodes] = useState([]);
    const [discountInput, setDiscountInput] = useState('');
    const [discountError, setDiscountError] = useState('');

    const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState(null);

    useEffect(() => {
        db.collection("discountCodes").get().then(snap => {
            setDiscountCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }).catch(() => {});
        // Config de tienda (marca, zonas) — del cache o de Firestore
        if (Object.keys(storeConfig).length) { applyBranding(storeConfig); return; }
        db.collection("settings").doc("store").get().then(doc => {
            const conf = doc.exists ? doc.data() : {};
            setStoreConfig(conf);
            applyBranding(conf);
        }).catch(() => {});
    }, []);

    const branding = getBranding();
    const features = getFeatures(storeConfig);
    const zones = getZones(storeConfig);
    const activeZone = zones.find(z => z.id === shippingZone) || zones[0];
    const currentShippingCost = activeZone ? Number(activeZone.cost) : 0;
    const cartSubtotal = cart.reduce((a, b) => a + getPrice(b), 0);
    const discountAmount = appliedDiscount
        ? (appliedDiscount.type === 'percent'
            ? Math.round(cartSubtotal * appliedDiscount.value / 100)
            : Math.min(appliedDiscount.value, cartSubtotal))
        : 0;
    const cartTotal = cartSubtotal - discountAmount + (cart.length > 0 ? currentShippingCost : 0);

    const applyDiscount = () => {
        setDiscountError('');
        const code = discountInput.toUpperCase().trim();
        const found = discountCodes.find(c => c.code === code && c.active);
        if (!found) { setDiscountError('CÓDIGO INVÁLIDO O INACTIVO'); return; }
        if (found.expiryDate && new Date(found.expiryDate) < new Date()) { setDiscountError('CÓDIGO EXPIRADO'); return; }
        if (found.usageLimit > 0 && found.usageCount >= found.usageLimit) { setDiscountError('CÓDIGO SIN USOS DISPONIBLES'); return; }
        setAppliedDiscount(found);
    };
    const removeDiscount = () => { setAppliedDiscount(null); setDiscountInput(''); setDiscountError(''); };

    const syncToHubSpot = async (orderData) => {
        try {
            const detalles = orderData.items.map(i => `${i.title} (${branding.variantLabel}: ${i.selectedSize})`).join(' | ');
            await fetch('/api/hubspot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderNumber: orderData.orderNumber,
                    name: orderData.customer.name,
                    phone: orderData.customer.phone,
                    address: `${orderData.customer.address} (${orderData.shippingZone})`,
                    total: orderData.total,
                    orderDetails: detalles
                })
            });
        } catch { /* no interrumpir UX */ }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cart.length === 0 || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const orderNum = `${branding.orderPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
            const shippingZoneLabel = activeZone ? activeZone.label : '';
            const order = {
                orderNumber: orderNum,
                customer: formData,
                items: cart,
                subtotal: cartSubtotal,
                discountCode: appliedDiscount?.code || null,
                discountAmount,
                shippingZone: shippingZoneLabel,
                shippingCost: currentShippingCost,
                total: cartTotal,
                date: new Date().toISOString(),
                status: 'awaiting_payment_link',
                seenByAdmin: false,
                paymentToken: null,
            };
            await db.collection("orders").doc(orderNum).set(order);
            trackEvent('checkout_started', { itemCount: cart.length, subtotal: cartSubtotal });
            syncToHubSpot(order);

            if (appliedDiscount) {
                db.collection("discountCodes").doc(appliedDiscount.id).update({
                    usageCount: firebase.firestore.FieldValue.increment(1)
                });
            }

            let m = `🛒 *NUEVO PEDIDO: #${orderNum}*\n\n`;
            m += `👤 *${formData.name}*  |  📱 ${formData.phone}\n`;
            m += `📍 ${formData.address} (${shippingZoneLabel})\n\n`;
            m += `*ARTÍCULOS:*\n`;
            cart.forEach(i => { m += `▪️ ${i.title} (${i.selectedSize}) — ${fmtPrice(getPrice(i))}\n`; });
            m += `\n*Subtotal:* ${fmtPrice(cartSubtotal)}`;
            if (discountAmount > 0) m += `\n*Descuento (${appliedDiscount.code}):* - ${fmtPrice(discountAmount)}`;
            m += `\n*Envío:* ${fmtPrice(currentShippingCost)}`;
            m += `\n*TOTAL:* ${fmtPrice(cartTotal)}`;
            m += `\n\n_📌 Genera el link de pago desde el admin y envíaselo al cliente._`;

            // El número de WhatsApp del negocio viene de settings/store.branding.
            const waUrl = branding.whatsapp
                ? `https://wa.me/${branding.whatsapp}?text=${encodeURIComponent(m)}`
                : '';

            localStorage.removeItem('kodia_cart');
            localStorage.removeItem('kodia_checkout_meta');

            setConfirmedOrder({
                orderNumber: orderNum,
                total: cartTotal,
                waUrl
            });
        } catch {
            alert("Ocurrió un error. Verifica tu conexión e intenta de nuevo.");
        }
        setIsSubmitting(false);
    };

    // --- Carrito vacío ---
    if (cart.length === 0 && !confirmedOrder) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-8">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                <h1 className="font-bebas text-4xl text-zinc-600">CARRITO VACÍO</h1>
                <p className="text-zinc-500 text-sm">No hay artículos para pagar.</p>
                <a href="/" className="brutalist-btn px-10 py-4 text-xl">← VOLVER A LA TIENDA</a>
            </div>
        );
    }

    // --- Pedido confirmado ---
    if (confirmedOrder) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md border border-accent bg-black rounded-2xl overflow-hidden shadow-[0_8px_40px_rgb(var(--accent-rgb)/0.35)]">
                    <div className="bg-accent px-6 py-4 flex items-center gap-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                        <h2 className="font-bebas text-3xl text-black tracking-widest">PEDIDO REGISTRADO</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="border border-zinc-800 bg-zinc-950 p-4 text-center rounded-xl">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Tu número de orden</p>
                            <p className="font-bebas text-4xl text-accent tracking-widest">{confirmedOrder.orderNumber}</p>
                        </div>
                        <div className="flex items-start gap-3 border border-yellow-800/40 p-4 bg-yellow-950/20 rounded-xl">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 shrink-0 animate-pulse"></span>
                            <div>
                                <p className="text-white font-bold text-sm mb-1">SIGUIENTE PASO</p>
                                <p className="text-zinc-400 text-xs leading-relaxed">Envianos el resumen por WhatsApp. Te responderemos con un <strong className="text-white">link seguro</strong> para realizar tu pago sin complicaciones.</p>
                            </div>
                        </div>
                        {confirmedOrder.waUrl && (
                        <a href={confirmedOrder.waUrl} target="_blank" rel="noopener noreferrer"
                            className="brutalist-btn w-full py-4 text-xl flex justify-center items-center gap-3">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                            ENVIAR POR WHATSAPP
                        </a>
                        )}
                        <a href="/" className="block w-full py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-600 rounded-xl text-center">
                            VOLVER A LA TIENDA
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // --- Formulario principal ---
    return (
        <div className="min-h-screen bg-black text-white">
            <header className="px-4 md:px-8 py-4 flex justify-between items-center border-b border-zinc-900 bg-black/95 backdrop-blur-md sticky top-0 z-40">
                <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold tracking-widest">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    TIENDA
                </a>
                <h1 className="font-bebas text-2xl tracking-widest">CONFIRMAR PEDIDO</h1>
                <div className="w-20"></div>
            </header>

            <div className="max-w-5xl mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                    {/* Resumen del pedido */}
                    <div className="space-y-4 md:sticky md:top-24">
                        <h2 className="font-bebas text-xl text-zinc-500 tracking-widest border-b border-zinc-800 pb-3">RESUMEN DEL PEDIDO</h2>
                        <div className="space-y-3">
                            {cart.map(item => (
                                <div key={item.cartId} className="flex gap-3 border border-zinc-800 p-3 bg-zinc-950 rounded-xl">
                                    <img src={optimizeImg(item.images?.[0], 120)} onError={(e) => { if (item.images?.[0] && e.target.src !== item.images[0]) e.target.src = item.images[0]; }} className="w-14 h-16 object-cover border border-zinc-900 shrink-0 rounded-lg" decoding="async" draggable={false} alt={item.title} />
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bebas text-lg leading-none text-zinc-100 line-clamp-2">{item.title}</p>
                                        <p className="text-xs text-zinc-500 mt-1 font-bold">{branding.variantLabel}: {item.selectedSize}</p>
                                        {item.discountPrice && item.discountPrice > 0 ? (
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="text-accent text-sm font-bold">{fmtPrice(item.discountPrice)}</span>
                                                <span className="text-zinc-600 text-[10px] line-through">{fmtPrice(item.price)}</span>
                                            </div>
                                        ) : (
                                            <p className="text-accent text-sm mt-1 font-bold">{fmtPrice(item.price)}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Descuento */}
                        {features.discounts !== false && (
                        <div className="border border-zinc-800 p-4 bg-zinc-950 rounded-xl">
                            <p className="text-[10px] text-zinc-500 mb-3 font-bold uppercase tracking-widest">CÓDIGO DE DESCUENTO</p>
                            {appliedDiscount ? (
                                <div className="flex items-center justify-between bg-accent/10 border border-accent p-3 rounded-lg">
                                    <div>
                                        <span className="text-accent font-bebas text-xl">{appliedDiscount.code}</span>
                                        <span className="text-green-400 text-xs ml-3">
                                            {appliedDiscount.type === 'percent' ? `${appliedDiscount.value}% OFF` : `${fmtPrice(appliedDiscount.value)} OFF`}
                                        </span>
                                    </div>
                                    <button type="button" onClick={removeDiscount} className="text-zinc-500 hover:text-white text-xs font-bold">✕ QUITAR</button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input type="text" placeholder="INGRESA TU CÓDIGO" value={discountInput} onChange={e => setDiscountInput(e.target.value.toUpperCase())} className="flex-1 bg-black border border-zinc-800 p-3 text-white text-sm outline-none focus:border-accent transition-colors font-mono tracking-widest rounded-lg" />
                                    <button type="button" onClick={applyDiscount} className="px-4 bg-zinc-800 hover:bg-accent hover:text-black text-white text-xs font-bold transition-colors border border-zinc-700 whitespace-nowrap rounded-lg">APLICAR</button>
                                </div>
                            )}
                            {discountError && <p className="text-red-500 text-xs mt-2 font-mono">{discountError}</p>}
                        </div>
                        )}

                        {/* Zona de envío */}
                        <div>
                            <p className="text-[10px] text-zinc-500 mb-2 font-bold uppercase tracking-widest">ZONA DE ENVÍO</p>
                            <div className="flex gap-2 flex-wrap">
                                {zones.map(zone => (
                                    <button key={zone.id} type="button" onClick={() => setShippingZone(zone.id)} className={`flex-1 min-w-[40%] py-3 text-xs font-bold transition-all rounded-xl border-2 ${activeZone?.id === zone.id ? 'bg-accent text-black border-accent' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>
                                        {zone.label}<br /><span className="font-mono font-normal">{fmtPrice(zone.cost)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="bg-zinc-950 border border-zinc-800 p-4 font-mono text-sm rounded-xl">
                            <div className="flex justify-between mb-2 text-zinc-400"><span>SUBTOTAL</span><span>{fmtPrice(cartSubtotal)}</span></div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between mb-2 text-green-400 font-bold">
                                    <span>DESCUENTO ({appliedDiscount.code})</span><span>- {fmtPrice(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between mb-2 text-zinc-400"><span>ENVÍO ({activeZone?.label || ''})</span><span>{fmtPrice(currentShippingCost)}</span></div>
                            <div className="flex justify-between pt-3 border-t border-zinc-800 items-end mt-2">
                                <span className="font-bebas text-lg text-white">TOTAL</span>
                                <span className="font-bebas text-3xl text-accent leading-none">{fmtPrice(cartTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Datos de entrega */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <h2 className="font-bebas text-xl text-zinc-500 tracking-widest border-b border-zinc-800 pb-3">DATOS DE ENTREGA</h2>
                        <input required type="text" placeholder="NOMBRE COMPLETO"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="w-full bg-black border border-zinc-800 p-3 text-white outline-none focus:border-accent transition-colors rounded-xl" />
                        <input required type="tel" placeholder="TELÉFONO (Ej: 8888 8888)"
                            value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-black border border-zinc-800 p-3 text-white outline-none focus:border-accent transition-colors rounded-xl" />
                        <textarea required placeholder="DIRECCIÓN EXACTA"
                            value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
                            className="w-full bg-black border border-zinc-800 p-3 text-white outline-none focus:border-accent h-24 resize-none transition-colors rounded-xl"></textarea>

                        <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-xl flex items-start gap-3">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <p className="text-zinc-400 text-xs leading-relaxed">Al confirmar, te contactaremos por WhatsApp y te enviaremos un <strong className="text-white">link seguro de pago</strong>. No necesitas subir nada ahora.</p>
                        </div>

                        <button type="submit" disabled={isSubmitting}
                            className="brutalist-btn w-full py-4 text-xl flex justify-center items-center gap-3">
                            {isSubmitting ? (
                                <span className="animate-pulse">REGISTRANDO PEDIDO...</span>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                    CONFIRMAR PEDIDO →
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<CheckoutApp />);
