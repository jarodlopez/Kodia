const ITEMS_PER_PAGE = 12;

const ProductCard = ({ product, openProduct }) => (
    <div className="brutalist-card flex flex-col cursor-pointer" onClick={() => openProduct(product)}>
        <div className="relative w-full aspect-[4/5] bg-zinc-950 border-b border-zinc-800">
            <SmoothImage src={product.images?.[0]} width={600} className="absolute inset-0 w-full h-full object-cover" alt={`${product.title} – ${getBranding().brandName}`} />
            <div className="absolute top-2 left-2 bg-white text-black font-bebas px-2 py-0.5 text-sm z-10">{product.category}</div>
            {product.discountPrice && product.discountPrice > 0 && (
                <div className="absolute top-2 right-2 bg-accent text-black font-bebas px-2 py-0.5 text-sm z-10 animate-pulse">OFERTA</div>
            )}
        </div>
        <div className="p-4 flex flex-col flex-1">
            <h2 className="text-xl md:text-2xl font-bebas tracking-wide leading-tight mb-1">{product.title}</h2>
            {product.discountPrice && product.discountPrice > 0 ? (
                <div className="flex flex-col mt-auto pt-2">
                    <p className="text-zinc-500 line-through text-xs font-mono">{fmtPrice(product.price)}</p>
                    <p className="text-accent font-bold font-mono text-sm">{fmtPrice(product.discountPrice)}</p>
                </div>
            ) : (
                <p className="text-accent font-bold font-mono text-sm mt-auto pt-2">{fmtPrice(product.price)}</p>
            )}
        </div>
    </div>
);

const SectionHeader = ({ title, onViewAll }) => (
    <div className="flex items-center justify-between mb-6 pt-2">
        <h3 className="font-bebas text-2xl md:text-3xl flex items-center gap-3">
            <span className="w-6 h-[2px] bg-accent inline-block shrink-0"></span>
            {title}
        </h3>
        {onViewAll && (
            <button onClick={onViewAll} className="text-[11px] font-mono text-accent hover:text-white transition-colors tracking-widest whitespace-nowrap ml-4" style={{textShadow:'0 0 8px rgb(var(--accent-rgb) / 0.8)'}}>
                VER TODO →
            </button>
        )}
    </div>
);

const Pagination = ({ page, totalPages, setPage }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center gap-2 mt-8">
            <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === 1}
                className="font-bebas text-lg px-4 py-1.5 border border-zinc-800 text-zinc-500 hover:border-accent hover:text-accent disabled:opacity-30 transition-colors rounded-lg"
            >←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                    key={p}
                    onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`font-bebas text-lg w-9 h-9 border rounded-lg transition-colors ${p === page ? 'bg-accent border-accent text-black' : 'border-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-white'}`}
                >{p}</button>
            ))}
            <button
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={page === totalPages}
                className="font-bebas text-lg px-4 py-1.5 border border-zinc-800 text-zinc-500 hover:border-accent hover:text-accent disabled:opacity-30 transition-colors rounded-lg"
            >→</button>
        </div>
    );
};

window.HomeView = ({ storeConfig, filteredProducts, products, activeCategory, setActiveCategory, categories, searchQuery, setSearchQuery, openProduct }) => {
    const [currentHeroSlide, setCurrentHeroSlide] = React.useState(0);
    const [page, setPage] = React.useState(1);

    React.useEffect(() => { setPage(1); }, [activeCategory, searchQuery]);

    React.useEffect(() => {
        if (!storeConfig.heroSlides || storeConfig.heroSlides.length <= 1) return;
        const timer = setInterval(() => setCurrentHeroSlide(prev => (prev + 1) % storeConfig.heroSlides.length), 5000);
        return () => clearInterval(timer);
    }, [storeConfig.heroSlides]);

    const isInStock = (product) => {
        const sb = product.stockBySizes;
        if (!sb || Object.keys(sb).length === 0) return true;
        return Object.values(sb).some(qty => Number(qty) > 0);
    };

    const allVisible = products.filter(isInStock);
    const visibleFiltered = filteredProducts.filter(isInStock);
    const isFiltered = activeCategory !== 'ALL' || searchQuery.trim() !== '';

    // Sort by createdAt desc, fall back to doc id (Firestore IDs are roughly chronological)
    const sortByRecent = (arr) => [...arr].sort((a, b) => {
        const da = a.createdAt || a.id;
        const db_ = b.createdAt || b.id;
        return db_ > da ? 1 : db_ < da ? -1 : 0;
    });

    const latestProducts = sortByRecent(allVisible).slice(0, 4);

    // Rotate which category appears first based on day of week
    const managedCats = categories.filter(c => c !== 'ALL');
    const offset = managedCats.length > 0 ? new Date().getDay() % managedCats.length : 0;
    const rotatedCats = [...managedCats.slice(offset), ...managedCats.slice(0, offset)];

    const totalPages = Math.ceil(visibleFiltered.length / ITEMS_PER_PAGE);
    const paginatedProducts = visibleFiltered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="animate-slideUp pb-20">

            {/* HERO SLIDER */}
            {getFeatures(storeConfig).heroSlider !== false && storeConfig.heroSlides && storeConfig.heroSlides.length > 0 && (
                <div className="relative w-full h-[50vh] md:h-[70vh] bg-surface overflow-hidden border-b-2 border-zinc-900">
                    {storeConfig.heroSlides.map((slide, index) => (
                        <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentHeroSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10"></div>
                            <SmoothImage src={slide.image} width={1600} className="w-full h-full object-cover scale-105" alt={slide.title ? `${getBranding().brandName} – ${slide.title}` : getBranding().brandName} eager={index === 0} />
                            <div className="absolute bottom-10 left-4 md:left-12 z-20">
                                <p className="text-accent font-mono text-xs md:text-sm tracking-[0.3em] mb-2">{slide.subtitle}</p>
                                <h2 className="text-5xl md:text-8xl font-bebas text-white leading-none mb-6">{slide.title}</h2>
                                <button
                                    onClick={() => {
                                        if (slide.categoryTarget) setActiveCategory(slide.categoryTarget);
                                        window.scrollTo({ top: window.innerHeight * 0.7, behavior: 'smooth' });
                                    }}
                                    className="brutalist-btn px-8 py-3"
                                >{slide.cta || 'VER COLECCIÓN'}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* BARRA DE CATEGORÍAS Y BÚSQUEDA */}
            {products.length > 0 && (
                <div className="px-4 md:px-8 py-4 border-b border-zinc-900 sticky top-[72px] bg-black/95 z-30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex overflow-x-auto no-scrollbar gap-2 items-center w-full md:w-auto">
                        <span className="text-zinc-500 font-bold text-xs tracking-widest mr-2 whitespace-nowrap">CATEGORÍAS:</span>
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`brutalist-btn-outline px-4 py-1 text-xs whitespace-nowrap ${activeCategory === cat ? 'active' : ''}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="BUSCAR PRENDA..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white px-4 py-2 text-xs outline-none focus:border-accent transition-colors pr-8 rounded-xl"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <main className="p-4 md:p-8">
                {isFiltered ? (
                    visibleFiltered.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <span className="text-4xl mb-4">🛸</span>
                            <h3 className="font-bebas text-3xl text-zinc-600">NO SE ENCONTRÓ NADA</h3>
                            <p className="text-zinc-500 text-xs mt-2">Intenta buscar con otra palabra clave.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                                {paginatedProducts.map(product => (
                                    <ProductCard key={product.id} product={product} openProduct={openProduct} />
                                ))}
                            </div>
                            <Pagination page={page} totalPages={totalPages} setPage={setPage} />
                        </>
                    )
                ) : (
                    allVisible.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <span className="text-4xl mb-4">🛸</span>
                            <h3 className="font-bebas text-3xl text-zinc-600">SIN PRODUCTOS AÚN</h3>
                        </div>
                    ) : (
                        <div className="space-y-2">

                            {/* Últimas novedades */}
                            {latestProducts.length > 0 && (
                                <section className="pb-10">
                                    <SectionHeader title="ÚLTIMAS NOVEDADES" />
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                                        {latestProducts.map(product => (
                                            <ProductCard key={product.id} product={product} openProduct={openProduct} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Sección por colección — orden rotado por día */}
                            {rotatedCats.map(cat => {
                                const catProducts = allVisible.filter(p => p.category === cat).slice(0, 4);
                                if (catProducts.length === 0) return null;
                                return (
                                    <section key={cat} className="border-t border-zinc-900 pt-10 pb-10">
                                        <SectionHeader title={cat} onViewAll={() => setActiveCategory(cat)} />
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                                            {catProducts.map(product => (
                                                <ProductCard key={product.id} product={product} openProduct={openProduct} />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}

                        </div>
                    )
                )}
            </main>
        </div>
    );
};
