window.OrderConfirmModal = ({ order, onClose }) => {
    if (!order) return null;
    return (
        <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md border border-accent bg-black animate-slideUp shadow-[0_8px_40px_rgb(var(--accent-rgb)/0.35)] rounded-2xl overflow-hidden">

                {/* Cabecera */}
                <div className="bg-accent px-6 py-4 flex items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                    <h2 className="font-bebas text-3xl text-black tracking-widest leading-none">ORDEN CONFIRMADA</h2>
                </div>

                <div className="p-6">
                    {/* Número de orden */}
                    <div className="border border-zinc-800 bg-zinc-950 p-4 mb-6 text-center rounded-xl">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Tu número de orden</p>
                        <p className="font-bebas text-4xl text-accent tracking-widest">#{order.orderNumber}</p>
                    </div>

                    {/* Estado */}
                    <div className="flex items-start gap-3 mb-6 border border-zinc-800 p-4 bg-zinc-950 rounded-xl">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 shrink-0 animate-pulse"></span>
                        <div>
                            <p className="text-white font-bold text-sm mb-1">EN PROCESO DE VERIFICACIÓN</p>
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                Recibimos tu comprobante. Verificaremos tu pago y te contactaremos por WhatsApp en un máximo de 24 horas para coordinar la entrega.
                            </p>
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="text-xs font-mono text-zinc-500 mb-6 space-y-1 border-t border-zinc-900 pt-4">
                        <div className="flex justify-between"><span>Cliente:</span><span className="text-white">{order.customer.name}</span></div>
                        <div className="flex justify-between"><span>Envío:</span><span className="text-white">{order.shippingZone}</span></div>
                        <div className="flex justify-between text-accent font-bold text-sm mt-2 pt-2 border-t border-zinc-900">
                            <span>TOTAL:</span><span>NIO {order.total}</span>
                        </div>
                    </div>

                    {/* Botón WhatsApp */}
                    <a
                        href={order.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="brutalist-btn w-full py-4 text-xl flex justify-center items-center gap-3 mb-3"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                        ENVIAR ORDEN POR WHATSAPP
                    </a>

                    <button
                        onClick={onClose}
                        className="w-full py-3 text-xs font-bold tracking-widest text-zinc-500 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-600 rounded-xl"
                    >
                        CERRAR Y VOLVER A LA TIENDA
                    </button>
                </div>
            </div>
        </div>
    );
};
