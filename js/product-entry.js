const PROD_CACHE_KEY = 'kodia_store_cache';
const PROD_CACHE_TTL = 20 * 60 * 1000;

if (new URLSearchParams(window.location.search).get('refresh') === '1') {
    try { localStorage.removeItem(PROD_CACHE_KEY); } catch {}
}

function ProductApp() {
    const { useState, useEffect } = React;

    const [product, setProduct] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [storeConfig, setStoreConfig] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [selectedSize, setSelectedSize] = useState('');
    const [mainImageIndex, setMainImageIndex] = useState(0);
    const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [isCartOpen, setIsCartOpen] = useState(false);

    const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('kodia_cart')) || []; } catch { return []; } });
    const [shippingZone, setShippingZone] = useState('');
    const [discountCodes, setDiscountCodes] = useState([]);
    const [discountInput, setDiscountInput] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountError, setDiscountError] = useState('');

    useEffect(() => { localStorage.setItem('kodia_cart', JSON.stringify(cart)); }, [cart]);

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

    useEffect(() => {
        const productId = window.location.pathname.replace(/^\/producto\//, '');
        if (!productId) { window.location.replace('/'); return; }

        const load = async () => {
            setIsLoading(true);
            try {
                const snap = await db.collection("products").doc(productId).get();
                if (!snap.exists) { setNotFound(true); setIsLoading(false); return; }
                const prod = { id: snap.id, ...snap.data() };
                if (!prod.title) { setNotFound(true); setIsLoading(false); return; }
                setProduct(prod);
                document.title = `${prod.title} – ${getBranding().brandName}`;

                let conf = {}, codes = [], prods = [];
                try {
                    const raw = localStorage.getItem(PROD_CACHE_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Date.now() - parsed.ts < PROD_CACHE_TTL) {
                            conf = parsed.config || {};
                            codes = parsed.codes || [];
                            prods = parsed.products || [];
                        }
                    }
                } catch {}

                if (!Object.keys(conf).length) {
                    const confSnap = await db.collection("settings").doc("store").get();
                    conf = confSnap.exists ? confSnap.data() : {};
                }
                if (!codes.length) {
                    const codesSnap = await db.collection("discountCodes").get();
                    codes = codesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                }
                if (!prods.length) {
                    const relSnap = await db.collection("products").limit(20).get();
                    prods = relSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                }

                setStoreConfig(conf);
                applyBranding(conf);
                setDiscountCodes(codes);
                setAllProducts(prods);
                trackEvent('product_view', { productId: prod.id, productTitle: prod.title, category: prod.category || '' });
            } catch (e) { console.error(e); setNotFound(true); }
            setIsLoading(false);
        };
        load();
    }, []);

    if (isLoading) return (
        <div className="flex items-center justify-center h-screen bg-black">
            <p className="font-bebas text-4xl md:text-6xl text-zinc-800 animate-pulse">CARGANDO SISTEMA...</p>
        </div>
    );

    if (notFound) return (
        <div className="flex flex-col items-center justify-center h-screen bg-black gap-6">
            <p className="font-bebas text-5xl text-zinc-600">PRODUCTO NO ENCONTRADO</p>
            <button onClick={() => window.location.href = '/'} className="brutalist-btn px-8 py-3 text-xl">VOLVER AL INICIO</button>
        </div>
    );

    const addToCart = (prod) => {
        if (!selectedSize && prod.sizes?.length > 0) return alert(`SELECCIONA UNA ${getBranding().variantLabel} PARA CONTINUAR`);
        const sizeToSave = selectedSize || 'ÚNICA';
        setCart([...cart, { ...prod, selectedSize: sizeToSave, cartId: Date.now() }]);
        setToastMsg(`AGREGADO: ${prod.title}`);
        setTimeout(() => setToastMsg(''), 3000);
        trackEvent('add_to_cart', { productId: prod.id, productTitle: prod.title, price: getPrice(prod) });
    };

    const openProduct = (p) => { window.location.href = `/producto/${p.id}`; };
    const closeProduct = () => { window.history.length > 1 ? window.history.back() : window.location.href = '/'; };

    return (
        <div className="min-h-screen relative flex flex-col text-sm bg-black">
            <Toast message={toastMsg} isVisible={!!toastMsg} />

            <div className="marquee-container font-bebas text-lg tracking-[0.2em] z-50">
                <div className="marquee-content animate-marquee">{getBranding().marqueeText}</div>
            </div>

            <header className="px-4 md:px-8 py-4 flex justify-between items-center border-b border-zinc-900 bg-black/95 backdrop-blur-md sticky top-0 z-40">
                <div className="cursor-pointer" onClick={() => window.location.href = '/'}>
                    <BrandLogo />
                </div>
                <button onClick={() => setIsCartOpen(true)} className="relative p-2 hover:text-accent transition-colors" aria-label="Abrir carrito">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    {cart.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-accent text-black text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                            {cart.length > 9 ? '9+' : cart.length}
                        </span>
                    )}
                </button>
            </header>

            <div className="flex-1 w-full max-w-[1440px] mx-auto">
                <ProductDetailView
                    selectedProduct={product}
                    closeProduct={closeProduct}
                    products={allProducts}
                    openProduct={openProduct}
                    addToCart={addToCart}
                    selectedSize={selectedSize}
                    setSelectedSize={setSelectedSize}
                    mainImageIndex={mainImageIndex}
                    setMainImageIndex={setMainImageIndex}
                    setIsSizeModalOpen={setIsSizeModalOpen}
                    storeConfig={storeConfig}
                />
            </div>

            <footer className="py-4 text-center border-t border-zinc-900/50">
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, letterSpacing: '0.08em' }} className="text-[10px] text-zinc-700">
                    powered by <span className="text-zinc-500">Kodialabs</span>
                </p>
            </footer>

            <SizeModal isSizeModalOpen={isSizeModalOpen} setIsSizeModalOpen={setIsSizeModalOpen} storeConfig={storeConfig} />

            <MiniCart
                isCartOpen={isCartOpen}
                setIsCartOpen={setIsCartOpen}
                cart={cart}
                setCart={setCart}
                discountInput={discountInput}
                setDiscountInput={setDiscountInput}
                appliedDiscount={appliedDiscount}
                applyDiscount={applyDiscount}
                removeDiscount={removeDiscount}
                discountError={discountError}
                discountAmount={discountAmount}
                cartSubtotal={cartSubtotal}
                cartTotal={cartTotal}
                currentShippingCost={currentShippingCost}
                shippingZone={activeZone?.id}
                setShippingZone={setShippingZone}
                storeConfig={storeConfig}
            />

            <WhatsAppFab product={product} selectedSize={selectedSize} storeConfig={storeConfig} />

            <button
                onClick={() => setIsCartOpen(true)}
                aria-label="Ver carrito"
                className={`fixed bottom-6 right-4 z-[100] flex items-center gap-2 bg-accent text-black font-bebas text-lg rounded-full transition-all duration-300 ${cart.length > 0 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                style={{ padding: '0.7rem 1.4rem 0.7rem 1.1rem', boxShadow: '0 4px 28px rgb(var(--accent-rgb) / 0.55), 0 2px 8px rgba(0,0,0,0.5)' }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {cart.length} {cart.length === 1 ? 'ARTÍCULO' : 'ARTÍCULOS'}
            </button>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ProductApp />);
