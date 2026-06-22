const SITE_URL = window.location.origin;

function updateMetaTags(product, category, storeConfig, categoryFallbackImg) {
    const b = getBranding();
    const DEFAULT_META = {
        title: `${b.brandName} | Tienda Online`,
        description: `${b.brandName} – Tienda online con entregas a todo el país.`,
        image: b.logoUrl || '',
        url: SITE_URL + '/',
    };
    let meta;
    if (product) {
        meta = {
            title: `${product.title} – ${b.brandName}`,
            description: (product.description || '').slice(0, 155) ||
                `${product.title} en ${b.brandName}.`,
            image: product.images?.[0] || DEFAULT_META.image,
            url: `${SITE_URL}/producto/${product.id}`,
        };
    } else if (category && category !== 'ALL') {
        meta = {
            title: `Colección ${category} – ${b.brandName}`,
            description: `Descubrí la colección ${category} de ${b.brandName}.`,
            image: storeConfig?.categoryCovers?.[category] || categoryFallbackImg || DEFAULT_META.image,
            url: `${SITE_URL}/?category=${encodeURIComponent(category)}`,
        };
    } else {
        meta = DEFAULT_META;
    }

    document.title = meta.title;
    const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
    setMeta('meta[name="description"]', 'content', meta.description);
    setMeta('link[rel="canonical"]', 'href', meta.url);
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:image"]', 'content', meta.image);
    setMeta('meta[property="og:url"]', 'content', meta.url);
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);
    setMeta('meta[name="twitter:image"]', 'content', meta.image);

    const existing = document.getElementById('product-jsonld');
    if (existing) existing.remove();
}

// Permite limpiar el caché añadiendo ?refresh=1 a la URL
if (new URLSearchParams(window.location.search).get('refresh') === '1') {
    try { localStorage.removeItem('kodia_store_cache'); } catch {}
}

function StoreApp() {
    const { useState, useEffect } = React;

    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [storeConfig, setStoreConfig] = useState({ heroSlides: [] });
    const [isLoading, setIsLoading] = useState(true);

    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const [isCartOpen, setIsCartOpen] = useState(false);

    const [shippingZone, setShippingZone] = useState('');
    const [discountCodes, setDiscountCodes] = useState([]);
    const [discountInput, setDiscountInput] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountError, setDiscountError] = useState('');

    const [popupBanners, setPopupBanners] = useState([]);
    const [isPopupVisible, setIsPopupVisible] = useState(false);

    const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('kodia_cart')) || []; } catch { return []; } });
    useEffect(() => { localStorage.setItem('kodia_cart', JSON.stringify(cart)); }, [cart]);

    const [hasPendingOrder] = useState(() => !!localStorage.getItem('kodia_pending_order'));

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
        const CACHE_KEY = 'kodia_store_cache';
        const CACHE_TTL = 20 * 60 * 1000;

        const loadFromCache = () => {
            try {
                const raw = localStorage.getItem(CACHE_KEY);
                if (!raw) return null;
                const { ts, products, config, codes, banners } = JSON.parse(raw);
                if (Date.now() - ts > CACHE_TTL) return null;
                return { products, config, codes, banners };
            } catch { return null; }
        };

        const saveToCache = (products, config, codes, banners) => {
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), products, config, codes, banners }));
            } catch {}
        };

        const fetchData = async () => {
            setIsLoading(true);
            if (!sessionStorage.getItem('kodia_session')) {
                sessionStorage.setItem('kodia_session', '1');
                trackEvent('page_view');
            }
            try {
                const cached = loadFromCache();
                if (cached) {
                    setProducts(cached.products); setFilteredProducts(cached.products);
                    setStoreConfig(cached.config);
                    applyBranding(cached.config);
                    setDiscountCodes(cached.codes);
                    if (cached.banners.length > 0) {
                        setPopupBanners(cached.banners);
                        setTimeout(() => setIsPopupVisible(true), 2000);
                    }
                    checkDynamicLink(cached.products, cached.config);
                } else {
                    const prodSnap = await db.collection("products").get();
                    const items = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setProducts(items); setFilteredProducts(items);

                    const confSnap = await db.collection("settings").doc("store").get();
                    const confData = confSnap.exists ? confSnap.data() : {};
                    setStoreConfig(confData);
                    applyBranding(confData);

                    const codesSnap = await db.collection("discountCodes").get();
                    const codes = codesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setDiscountCodes(codes);

                    const bannersSnap = await db.collection("popupBanners").get();
                    const activeBanners = bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(b => b.active);
                    if (activeBanners.length > 0) {
                        setPopupBanners(activeBanners);
                        setTimeout(() => setIsPopupVisible(true), 2000);
                    }

                    saveToCache(items, confData, codes, activeBanners);
                    checkDynamicLink(items, confData);
                }
            } catch (error) { console.error("Error conectando al sistema", error); }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    useEffect(() => {
        let result = [...products];
        if (activeCategory !== 'ALL') result = result.filter(p => p.category === activeCategory);
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toUpperCase();
            result = result.filter(p =>
                p.title.toUpperCase().includes(query) ||
                (p.sku && p.sku.toUpperCase().includes(query)) ||
                (p.category && p.category.toUpperCase().includes(query))
            );
        }
        setFilteredProducts(result);
    }, [activeCategory, searchQuery, products]);

    const checkDynamicLink = (items, conf = {}) => {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('product');
        const categoryParam = params.get('category');
        if (productId) {
            // Redirect legacy ?product=ID links to the new product page
            window.location.replace(`/producto/${productId}`);
        } else if (categoryParam) {
            setActiveCategory(categoryParam);
            const fallbackImg = items.find(p => p.category === categoryParam)?.images?.[0];
            updateMetaTags(null, categoryParam, conf, fallbackImg);
        }
    };

    const openProduct = (product) => {
        window.location.href = `/producto/${product.id}`;
    };

    const openCategory = (cat) => {
        setActiveCategory(cat);
        if (cat === 'ALL') {
            window.history.pushState(null, '', window.location.pathname);
            updateMetaTags(null);
        } else {
            window.history.pushState(null, '', `?category=${encodeURIComponent(cat)}`);
            const fallbackImg = products.find(p => p.category === cat)?.images?.[0];
            updateMetaTags(null, cat, storeConfig, fallbackImg);
        }
    };

    const productCats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const managedCats = storeConfig.categories || [];
    const orderedCats = managedCats.length > 0
        ? [...managedCats, ...productCats.filter(c => !managedCats.includes(c))]
        : productCats;
    const categories = ['ALL', ...orderedCats];

    return (
        <div className="min-h-screen relative flex flex-col text-sm bg-black">
            {getFeatures(storeConfig).banners !== false && (
                <PopupBanner isPopupVisible={isPopupVisible} setIsPopupVisible={setIsPopupVisible} popupBanners={popupBanners} />
            )}

            <div className="marquee-container font-bebas text-lg tracking-[0.2em] z-50">
                <div className="marquee-content animate-marquee">{getBranding().marqueeText}</div>
            </div>

            <header className="px-4 md:px-8 py-4 flex justify-between items-center border-b border-zinc-900 bg-black/95 backdrop-blur-md sticky top-0 z-40">
                <div className="cursor-pointer" onClick={() => { setActiveCategory('ALL'); window.history.pushState(null, '', '/'); updateMetaTags(null); }}>
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
                    {hasPendingOrder && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                        </span>
                    )}
                </button>
            </header>

            <div className="flex-1 w-full max-w-[1440px] mx-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[70vh] bg-black">
                        <p className="text-4xl md:text-6xl font-bebas text-zinc-800 animate-pulse">CARGANDO SISTEMA...</p>
                    </div>
                ) : (
                    <HomeView
                        storeConfig={storeConfig}
                        filteredProducts={filteredProducts}
                        products={products}
                        activeCategory={activeCategory}
                        setActiveCategory={openCategory}
                        categories={categories}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        openProduct={openProduct}
                    />
                )}
            </div>

            <footer className="py-4 text-center border-t border-zinc-900/50">
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, letterSpacing: '0.08em' }} className="text-[10px] text-zinc-700">
                    powered by <span className="text-zinc-500">Kodialabs</span>
                </p>
            </footer>

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

            <WhatsAppFab storeConfig={storeConfig} />

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
root.render(<StoreApp />);
