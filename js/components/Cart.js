window.MiniCart = ({
    isCartOpen, setIsCartOpen,
    cart, setCart,
    discountInput, setDiscountInput,
    appliedDiscount, applyDiscount, removeDiscount,
    discountError,
    discountAmount, cartSubtotal, cartTotal, currentShippingCost,
    shippingZone, setShippingZone,
    storeConfig,
}) => {
    if (!isCartOpen) return null;

    const branding = getBranding();
    const features = getFeatures(storeConfig);
    const zones = getZones(storeConfig);

    const handleGoToCheckout = () => {
        localStorage.setItem('kodia_checkout_meta', JSON.stringify({ shippingZone, appliedDiscount }));
        window.location.href = '/checkout';
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="bg-[#050505] w-full md:w-[420px] h-full border-l border-zinc-800 shadow-2xl flex flex-col animate-slideUp md:rounded-l-2xl overflow-hidden">

                <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-black shrink-0">
                    <h2 className="font-bebas text-3xl tracking-widest flex items-center gap-3">
                        <span className="w-2.5 h-2.5 bg-accent inline-block rounded-full"></span>
                        {branding.cartTitle}
                    </h2>
                    <button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-accent text-xl leading-none p-1">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                            <p className="font-bebas text-2xl tracking-widest">CARRITO VACÍO</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">

                            {/* Items */}
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <div key={item.cartId} className="flex gap-3 border border-zinc-800 p-3 bg-black relative rounded-xl">
                                        <img src={optimizeImg(item.images?.[0], 160)} onError={(e) => { if (item.images?.[0] && e.target.src !== item.images[0]) e.target.src = item.images[0]; }} className="w-16 h-20 object-cover border border-zinc-900 shrink-0 rounded-lg" decoding="async" draggable={false} alt={item.title} />
                                        <div className="flex-1 pt-1 overflow-hidden">
                                            <p className="font-bebas text-lg pr-6 leading-none text-zinc-100 line-clamp-2">{item.title}</p>
                                            <p className="text-xs text-zinc-500 mt-1 font-bold tracking-wider">{branding.variantLabel}: {item.selectedSize}</p>
                                            {item.discountPrice && item.discountPrice > 0 ? (
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-accent text-sm font-bold">{fmtPrice(item.discountPrice)}</span>
                                                    <span className="text-zinc-600 text-[10px] line-through">{fmtPrice(item.price)}</span>
                                                </div>
                                            ) : (
                                                <p className="text-accent text-sm mt-1 font-bold">{fmtPrice(item.price)}</p>
                                            )}
                                        </div>
                                        <button onClick={() => setCart(cart.filter(i => i.cartId !== item.cartId))} className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 p-1.5 leading-none">✕</button>
                                    </div>
                                ))}
                            </div>

                            {/* Discount code */}
                            {features.discounts !== false && (
                            <div className="border border-zinc-800 p-4 bg-zinc-950 rounded-xl">
                                <p className="text-[10px] text-zinc-500 mb-3 font-bold uppercase tracking-widest">CÓDIGO DE DESCUENTO</p>
                                {appliedDiscount ? (
                                    <div className="flex items-center justify-between bg-accent/10 border border-accent p-3 rounded-lg">
                                        <div>
                                            <span className="text-accent font-bebas text-xl">{appliedDiscount.code}</span>
                                            <span className="text-green-400 text-xs font-mono ml-3">
                                                {appliedDiscount.type === 'percent' ? `${appliedDiscount.value}% OFF` : `${fmtPrice(appliedDiscount.value)} OFF`}
                                            </span>
                                        </div>
                                        <button type="button" onClick={removeDiscount} className="text-zinc-500 hover:text-white text-xs font-bold">✕ QUITAR</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="INGRESA TU CÓDIGO"
                                            value={discountInput}
                                            onChange={e => setDiscountInput(e.target.value.toUpperCase())}
                                            className="flex-1 bg-black border border-zinc-800 p-3 text-white text-sm outline-none focus:border-accent transition-colors font-mono tracking-widest rounded-lg"
                                        />
                                        <button type="button" onClick={applyDiscount} className="px-4 bg-zinc-800 hover:bg-accent hover:text-black text-white text-xs font-bold transition-colors border border-zinc-700 whitespace-nowrap rounded-lg">APLICAR</button>
                                    </div>
                                )}
                                {discountError && <p className="text-red-500 text-xs mt-2 font-mono">{discountError}</p>}
                            </div>
                            )}

                            {/* Shipping zone */}
                            <div>
                                <p className="text-[10px] text-zinc-500 mb-2 font-bold uppercase tracking-widest">ZONA DE ENVÍO</p>
                                <div className="flex gap-2 flex-wrap">
                                    {zones.map(zone => (
                                        <button key={zone.id} type="button" onClick={() => setShippingZone(zone.id)} className={`flex-1 min-w-[40%] py-3 text-xs font-bold transition-all rounded-xl border-2 ${shippingZone === zone.id ? 'bg-accent text-black border-accent' : 'bg-transparent text-zinc-500 border-zinc-800'}`}>
                                            {zone.label}<br /><span className="font-mono font-normal">{fmtPrice(zone.cost)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-zinc-950 border border-zinc-800 p-4 font-mono text-sm rounded-xl">
                                <div className="flex justify-between mb-2 text-zinc-400"><span>SUBTOTAL</span><span>{fmtPrice(cartSubtotal)}</span></div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between mb-2 text-green-400 font-bold">
                                        <span>DESCUENTO ({appliedDiscount.code})</span>
                                        <span>- {fmtPrice(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between mb-2 text-zinc-400"><span>ENVÍO</span><span>{fmtPrice(currentShippingCost)}</span></div>
                                <div className="flex justify-between pt-3 border-t border-zinc-800 items-end mt-2">
                                    <span className="font-bebas text-lg text-white">TOTAL</span>
                                    <span className="font-bebas text-3xl text-accent leading-none">{fmtPrice(cartTotal)}</span>
                                </div>
                            </div>

                            {/* Go to checkout */}
                            <button onClick={handleGoToCheckout} className="brutalist-btn w-full py-4 text-xl flex items-center justify-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                                PROCEDER AL CHECKOUT
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
