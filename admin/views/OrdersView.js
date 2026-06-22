const STATUS_CONFIG = {
    awaiting_payment_link: { label: 'ESPERA LINK',  color: 'text-cyan-400',    bg: 'bg-cyan-900/20 border-cyan-800'     },
    payment_link_sent:     { label: 'LINK ENVIADO', color: 'text-indigo-400',  bg: 'bg-indigo-900/20 border-indigo-800' },
    paid_pending_verification: { label: 'PENDIENTE',   color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800' },
    verified:                  { label: 'VERIFICADO',  color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-800'   },
    preparing:                 { label: 'PREPARANDO',  color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-800'},
    shipped:                   { label: 'ENVIADO',     color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800'},
    delivered:                 { label: 'ENTREGADO',   color: 'text-green-400',  bg: 'bg-green-900/20 border-green-800' },
    cancelled:                 { label: 'CANCELADO',   color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800'     },
};

const WA_MESSAGES = {
    verified:  (n, num) => `✅ Hola ${n}, tu orden *${num}* fue verificada y ya está en preparación. 🔥 ${window.__BRAND || ""}`,
    preparing: (n, num) => `📦 Hola ${n}, tu orden *${num}* está siendo preparada. ¡Pronto la recibirás!`,
    shipped:   (n, num) => `🚚 Hola ${n}, tu orden *${num}* ya está en camino. En breve llega a tu dirección.`,
    delivered: (n, num) => `🎉 Hola ${n}, tu orden *${num}* fue entregada. ¡Gracias por tu compra en ${window.__BRAND || "nuestra tienda"}! 🖤`,
    cancelled: (n, num) => `❌ Hola ${n}, tu orden *${num}* fue cancelada. Si tenés dudas, escribinos.`,
};

const StatusBadge = ({ status, small }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.paid_pending_verification;
    return (
        <span className={`font-bebas leading-none border rounded px-2 py-0.5 ${cfg.color} ${cfg.bg} ${small ? 'text-[10px]' : 'text-xs'}`}>
            {cfg.label}
        </span>
    );
};

window.OrdersView = ({ orders, filteredOrders, selectedOrder, setSelectedOrder,
    orderSearchQuery, setOrderSearchQuery, deleteOrder, formatDate, getPrice,
    markOrderSeen, updateOrderStatus }) => {

    const [generatingLink, setGeneratingLink] = React.useState(false);
    const [linkCopied, setLinkCopied] = React.useState(false);

    const openOrder = (order) => {
        setSelectedOrder(order);
        markOrderSeen(order.id);
        setLinkCopied(false);
    };

    const handleStatusChange = async (status) => {
        if (!selectedOrder || selectedOrder.status === status) return;
        await updateOrderStatus(selectedOrder.id, status);
    };

    const generatePaymentLink = async () => {
        if (!selectedOrder || generatingLink) return;
        setGeneratingLink(true);
        try {
            const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
            await db.collection("orders").doc(selectedOrder.id).update({
                paymentToken: token,
                status: 'payment_link_sent',
            });
            const updated = { ...selectedOrder, paymentToken: token, status: 'payment_link_sent' };
            setSelectedOrder(updated);
        } catch {}
        setGeneratingLink(false);
    };

    const copyLink = (link) => {
        navigator.clipboard.writeText(link).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        }).catch(() => {
            // fallback for older browsers
            const el = document.createElement('textarea');
            el.value = link;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        });
    };

    const getPaymentLink = (order) => order?.paymentToken
        ? `${window.location.origin}/pago/${order.orderNumber}?t=${order.paymentToken}`
        : null;

    const unseenCount = orders.filter(o => !o.seenByAdmin).length;

    return (
        <div className="view-animate bg-zinc-950 border border-zinc-900 min-h-[50vh] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-900">
                <input
                    type="text"
                    placeholder="Buscar por orden, cliente o teléfono..."
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    className="brutalist-input mt-0 text-xs py-2 flex-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                    {unseenCount > 0 && (
                        <span className="text-[11px] font-bold text-accent font-mono bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-full">
                            {unseenCount} nueva{unseenCount > 1 ? 's' : ''}
                        </span>
                    )}
                    <span className="text-[11px] text-zinc-600 font-mono">{filteredOrders.length} ord.</span>
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-zinc-700 font-bebas text-2xl tracking-widest">
                    {orderSearchQuery ? '— SIN RESULTADOS —' : '— SIN ÓRDENES AÚN —'}
                </div>
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="order-cards p-3">
                        {filteredOrders.map(order => {
                            const isNew = !order.seenByAdmin;
                            return (
                                <div
                                    key={order.id}
                                    className={`p-4 active:bg-zinc-800 transition-colors rounded-xl relative ${isNew ? 'bg-zinc-900 border border-accent/40' : 'bg-zinc-900 border border-zinc-800'}`}
                                    onClick={() => openOrder(order)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bebas text-lg text-white leading-none">{order.orderNumber}</span>
                                        <div className="flex items-center gap-2">
                                            {isNew && <span className="bg-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-full tracking-widest">NUEVA</span>}
                                            <StatusBadge status={order.status} small />
                                        </div>
                                    </div>
                                    <p className="text-zinc-300 text-xs font-mono mb-1">{order.customer?.name}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-zinc-600 text-[10px] font-mono">{formatDate(order.date)}</span>
                                        <span className="text-accent font-bold text-sm font-mono">{fmtPrice(order.total)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="order-table-wrap">
                        <table className="w-full text-left text-xs font-mono whitespace-nowrap">
                            <thead className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-950 border-b border-zinc-800">
                                <tr>
                                    <th className="px-4 py-3 font-bold">Estado</th>
                                    <th className="px-4 py-3 font-bold">No. Orden</th>
                                    <th className="px-4 py-3 font-bold">Fecha</th>
                                    <th className="px-4 py-3 font-bold">Cliente</th>
                                    <th className="px-4 py-3 font-bold">Zona</th>
                                    <th className="px-4 py-3 font-bold">Total</th>
                                    <th className="px-4 py-3 font-bold text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order, i) => {
                                    const isNew = !order.seenByAdmin;
                                    return (
                                        <tr key={order.id} className={`border-b border-zinc-900 transition-colors ${isNew ? 'bg-accent/5 hover:bg-accent/10' : (i % 2 === 0 ? 'bg-black hover:bg-zinc-900/60' : 'bg-zinc-950/40 hover:bg-zinc-900/60')}`}>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    {isNew && <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shrink-0" title="Nueva"></span>}
                                                    <StatusBadge status={order.status} small />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-white">{order.orderNumber}</td>
                                            <td className="px-4 py-3.5 text-zinc-500">{formatDate(order.date)}</td>
                                            <td className="px-4 py-3.5 text-zinc-300">{order.customer?.name}</td>
                                            <td className="px-4 py-3.5">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${order.shippingZone === 'Managua' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-700 text-white'}`}>{order.shippingZone}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-accent font-bold">{fmtPrice(order.total)}</td>
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex gap-1.5 justify-center">
                                                    <button onClick={() => openOrder(order)} className="px-3 py-1.5 text-[10px] font-bold bg-zinc-800 hover:bg-accent hover:text-black text-zinc-300 transition-colors rounded">VER</button>
                                                    <button onClick={() => deleteOrder(order.id)} className="px-2.5 py-1.5 text-[10px] border border-zinc-800 text-zinc-600 hover:bg-red-950 hover:text-red-400 hover:border-red-900 transition-colors rounded" title="Eliminar">✕</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ORDER DETAIL MODAL */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[350] bg-black/90 flex items-end justify-center backdrop-blur-sm" onClick={() => setSelectedOrder(null)} style={{ alignItems: 'flex-end' }}>
                    <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl max-h-[92vh] overflow-y-auto animate-slideUp flex flex-col shadow-2xl" onClick={e => e.stopPropagation()} style={{ borderRadius: '12px 12px 0 0' }}>
                        {/* Modal header */}
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                            <div>
                                <h2 className="font-bebas text-3xl text-accent leading-none">ORDEN {selectedOrder.orderNumber}</h2>
                                <p className="text-zinc-500 text-[10px] mt-0.5">{formatDate(selectedOrder.date)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => deleteOrder(selectedOrder.id)} className="text-xs border border-red-900 text-red-500 px-3 py-1.5 hover:bg-red-900 hover:text-white transition-colors rounded-lg">ELIMINAR</button>
                                <button onClick={() => setSelectedOrder(null)} className="text-zinc-400 hover:text-white font-bold text-xl w-8 h-8 flex items-center justify-center">✕</button>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            {/* Customer + products */}
                            <div className="p-5 border-b border-zinc-800">
                                <div className="mb-5 bg-black p-4 border border-zinc-800 rounded-xl">
                                    <p className="font-bold text-white mb-2 text-sm border-b border-zinc-800 pb-2">DATOS DEL CLIENTE</p>
                                    <p className="text-sm py-0.5"><span className="text-zinc-500">Nombre: </span>{selectedOrder.customer?.name}</p>
                                    <p className="text-sm py-0.5"><span className="text-zinc-500">Teléfono: </span>{selectedOrder.customer?.phone}</p>
                                    <p className="text-sm py-0.5"><span className="text-zinc-500">Dirección: </span>{selectedOrder.customer?.address}</p>
                                    <p className="text-sm py-0.5"><span className="text-zinc-500">Zona: </span><span className="text-accent font-bold">{selectedOrder.shippingZone}</span></p>
                                </div>

                                <div>
                                    <p className="font-bold text-white mb-3 text-sm border-b border-zinc-800 pb-2">PRODUCTOS COMPRADOS</p>
                                    <div className="space-y-3">
                                        {selectedOrder.items?.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 bg-black p-2 border border-zinc-900 rounded-xl">
                                                <img src={item.images?.[0]} className="w-12 h-16 object-cover border border-zinc-800 shrink-0 rounded-lg" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bebas text-lg leading-none truncate">{item.title}</p>
                                                    <p className="text-[10px] text-zinc-400 font-bold mt-1">TALLA: {item.selectedSize}{item.sku && ` | SKU: ${item.sku}`}</p>
                                                    <p className="text-accent font-bold text-xs mt-1">{fmtPrice(getPrice(item))}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-zinc-800 space-y-1 text-sm">
                                    <div className="flex justify-between text-zinc-400"><span>Subtotal:</span><span>{fmtPrice(selectedOrder.subtotal)}</span></div>
                                    {selectedOrder.discountAmount > 0 && (
                                        <div className="flex justify-between text-green-400 font-bold"><span>Descuento ({selectedOrder.discountCode}):</span><span>- {fmtPrice(selectedOrder.discountAmount)}</span></div>
                                    )}
                                    <div className="flex justify-between text-zinc-400"><span>Envío:</span><span>{fmtPrice(selectedOrder.shippingCost)}</span></div>
                                    <div className="flex justify-between text-white font-bold text-lg pt-2 mt-2 border-t border-zinc-800">
                                        <span>TOTAL PAGADO:</span><span className="text-accent">{fmtPrice(selectedOrder.total)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment link generator */}
                            {(selectedOrder.status === 'awaiting_payment_link' || selectedOrder.status === 'payment_link_sent') && (
                                <div className="p-5 border-b border-zinc-800 bg-cyan-950/10">
                                    <p className="font-bold text-white mb-3 text-sm border-b border-zinc-800 pb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full inline-block"></span>
                                        LINK DE PAGO
                                    </p>
                                    {getPaymentLink(selectedOrder) ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 bg-black border border-zinc-800 p-3 rounded-xl overflow-hidden">
                                                <span className="text-zinc-500 text-[10px] font-mono truncate flex-1">{getPaymentLink(selectedOrder)}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => copyLink(getPaymentLink(selectedOrder))}
                                                    className={`flex-1 py-2.5 text-xs font-bold transition-all rounded-xl border ${linkCopied ? 'bg-green-600 text-white border-green-600' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-accent hover:text-black hover:border-accent'}`}
                                                >
                                                    {linkCopied ? '✓ COPIADO' : '⎘ COPIAR LINK'}
                                                </button>
                                                {selectedOrder.customer?.phone && (
                                                    <a
                                                        href={`https://wa.me/505${selectedOrder.customer.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`🔐 Hola ${selectedOrder.customer.name}, aquí está tu link de pago para la orden *${selectedOrder.orderNumber}*:\n\n${getPaymentLink(selectedOrder)}\n\nEntra al link, revisa el resumen y sube el comprobante cuando hayas transferido. 🖤 ${window.__BRAND || ""}`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 py-2.5 text-xs font-bold text-center transition-all rounded-xl border bg-[#25D366] text-black border-[#25D366] hover:opacity-90"
                                                    >
                                                        ENVIAR POR WA
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-zinc-500 text-xs">Este cliente está esperando su link de pago. Genéralo y envíaselo por WhatsApp.</p>
                                            <button
                                                onClick={generatePaymentLink}
                                                disabled={generatingLink}
                                                className="brutalist-btn w-full py-3 text-base"
                                            >
                                                {generatingLink ? 'GENERANDO...' : '🔗 GENERAR LINK DE PAGO'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Order status management */}
                            <div className="p-5 border-b border-zinc-800">
                                <p className="font-bold text-white mb-3 text-sm border-b border-zinc-800 pb-2">ESTADO DE LA ORDEN</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleStatusChange(key)}
                                            className={`font-bebas text-base px-3 py-1.5 border transition-all rounded ${
                                                (selectedOrder.status || 'paid_pending_verification') === key
                                                    ? `${cfg.bg} ${cfg.color}`
                                                    : 'bg-transparent text-zinc-600 border-zinc-800 hover:border-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >{cfg.label}</button>
                                    ))}
                                </div>

                                {/* WhatsApp notification */}
                                {WA_MESSAGES[selectedOrder.status] && selectedOrder.customer?.phone && (
                                    <a
                                        href={`https://wa.me/505${selectedOrder.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(WA_MESSAGES[selectedOrder.status](selectedOrder.customer.name, selectedOrder.orderNumber))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-black font-bebas text-lg py-3 px-4 rounded-xl hover:opacity-90 transition-opacity"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        NOTIFICAR AL CLIENTE
                                    </a>
                                )}
                            </div>

                            {/* Receipt */}
                            <div className="p-5 bg-zinc-900 flex flex-col">
                                <p className="font-bold text-white mb-3 text-sm border-b border-zinc-800 pb-2">COMPROBANTE DE PAGO</p>
                                {selectedOrder.receiptUrl ? (
                                    <div className="border border-zinc-700 bg-black flex flex-col rounded-xl overflow-hidden">
                                        <a href={selectedOrder.receiptUrl} target="_blank" className="flex items-center justify-center p-2 hover:opacity-80 transition-opacity">
                                            <img src={selectedOrder.receiptUrl} className="max-h-64 w-full object-contain" />
                                        </a>
                                        <a href={selectedOrder.receiptUrl} target="_blank" className="bg-zinc-800 text-center py-2.5 text-xs font-bold hover:bg-accent hover:text-black transition-colors block border-t border-zinc-700">
                                            ABRIR IMAGEN COMPLETA ↗
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center border border-dashed border-zinc-700 text-zinc-500 text-sm p-8 rounded-xl">
                                        Sin comprobante adjunto
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
