window.SizeModal = ({ isSizeModalOpen, setIsSizeModalOpen, storeConfig }) => {
    if (!isSizeModalOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setIsSizeModalOpen(false)}>
            <div className="relative max-w-3xl w-full border border-zinc-800 bg-[#0a0a0a] p-6 animate-slideUp overflow-y-auto max-h-[90vh] rounded-2xl" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsSizeModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white font-bebas text-2xl">✕</button>
                <h3 className="font-bebas text-3xl text-accent mb-6">GUÍA DE MEDIDAS</h3>
                {storeConfig.sizeGuide ? (
                    <img src={optimizeImg(storeConfig.sizeGuide, 1400)} onError={(e) => { if (storeConfig.sizeGuide && e.target.src !== storeConfig.sizeGuide) e.target.src = storeConfig.sizeGuide; }} className="w-full h-auto border border-zinc-800" decoding="async" draggable={false} alt="Guía de medidas" />
                ) : (
                    <p className="text-zinc-500">Guía no disponible temporalmente.</p>
                )}
            </div>
        </div>
    );
};

window.ProductDetailView = ({ selectedProduct, closeProduct, products, openProduct, setIsSizeModalOpen, addToCart, selectedSize, setSelectedSize, mainImageIndex, setMainImageIndex, storeConfig }) => (
    <div className="animate-slideUp pb-32 md:pb-20 p-4 md:p-8">

        {/* BREADCRUMB */}
        <div className="flex gap-2 text-xs text-zinc-500 mb-6 font-mono uppercase">
            <span className="cursor-pointer hover:text-white" onClick={closeProduct}>INICIO</span> / <span className="text-accent">{selectedProduct.title}</span>
        </div>

        {/* GALERÍA + INFO */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-12 lg:gap-20 mb-10">
            <div className="w-full md:w-[55%] flex flex-col-reverse md:flex-row gap-4">
                {selectedProduct.images?.length > 1 && (
                    <div className="flex md:flex-col gap-3 overflow-x-auto no-scrollbar md:w-24 shrink-0">
                        {selectedProduct.images.map((img, idx) => (
                            <button key={idx} onClick={() => setMainImageIndex(idx)} className={`w-20 h-24 md:w-full shrink-0 border-2 rounded-lg overflow-hidden ${mainImageIndex === idx ? 'border-accent' : 'border-zinc-800'}`}>
                                <SmoothImage src={img} width={200} className="w-full h-full object-cover" alt={`${selectedProduct.title} – imagen ${idx + 1}`} />
                            </button>
                        ))}
                    </div>
                )}
                <div className="w-full border border-zinc-800 bg-zinc-950 relative rounded-xl overflow-hidden">
                    <SmoothImage src={selectedProduct.images?.[mainImageIndex]} width={900} className="w-full h-auto aspect-[4/5] object-cover" alt={`${selectedProduct.title} – ${getBranding().brandName}`} eager />
                </div>
            </div>

            <div className="w-full md:w-[45%] flex flex-col">
                <p className="text-accent font-mono text-sm tracking-widest mb-2 font-bold uppercase">{selectedProduct.category}</p>
                <h2 className="text-5xl md:text-7xl font-bebas mb-2 leading-none tracking-wide">{selectedProduct.title}</h2>

                {selectedProduct.sku && (
                    <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase mb-4 border-b border-zinc-800 pb-4">
                        SKU: <span className="text-white">{selectedProduct.sku}</span>
                    </p>
                )}

                <div className="flex items-end gap-4 mb-8">
                    {selectedProduct.discountPrice && selectedProduct.discountPrice > 0 ? (
                        <>
                            <span className="text-4xl md:text-5xl font-mono text-accent font-bold">{fmtPrice(selectedProduct.discountPrice)}</span>
                            <span className="text-xl md:text-2xl font-mono text-zinc-500 line-through mb-1">{fmtPrice(selectedProduct.price)}</span>
                        </>
                    ) : (
                        <span className="text-4xl md:text-5xl font-mono text-white">{fmtPrice(selectedProduct.price)}</span>
                    )}
                </div>

                <p className="text-zinc-400 mb-8 leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>

                {selectedProduct.details && selectedProduct.details.length > 0 && (
                    <ul className="mb-8 space-y-2 border-t border-zinc-900 pt-6">
                        {selectedProduct.details.map((detail, idx) => (
                            <li key={idx} className="flex gap-3 text-zinc-300">
                                <span className="text-accent">—</span> {detail}
                            </li>
                        ))}
                    </ul>
                )}

                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                    <div className="mb-8 border-t border-zinc-900 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-xs text-zinc-500 tracking-widest">SELECCIONA {getBranding().variantLabel}</p>
                            {getFeatures(storeConfig).sizeGuide !== false && storeConfig.sizeGuide && (
                                <button onClick={() => setIsSizeModalOpen(true)} className="text-accent text-xs underline decoration-accent/50 hover:text-white transition-colors">GUÍA DE MEDIDAS</button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {selectedProduct.sizes.map(size => {
                                const sb = selectedProduct.stockBySizes;
                                const isSoldOut = sb && sb[size] !== undefined && sb[size] !== '' && Number(sb[size]) <= 0;
                                return (
                                    <button
                                        key={size}
                                        onClick={() => !isSoldOut && setSelectedSize(size)}
                                        disabled={isSoldOut}
                                        className={`font-bebas text-2xl w-14 h-14 border-2 rounded-xl transition-all relative ${isSoldOut ? 'border-zinc-900 text-zinc-700 cursor-not-allowed line-through' : selectedSize === size ? 'bg-accent border-accent text-black scale-110' : 'border-zinc-800 text-zinc-400 hover:border-accent hover:text-white'}`}
                                        title={isSoldOut ? 'Agotado' : size}
                                    >
                                        {size}
                                        {isSoldOut && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-red-600 font-mono whitespace-nowrap font-bold">AGOT.</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button onClick={() => addToCart(selectedProduct)} className="brutalist-btn w-full py-4 text-2xl font-bebas flex justify-center items-center gap-3 mt-auto">
                    <span>＋</span> AÑADIR AL CARRITO
                </button>
            </div>
        </div>

        {/* PRODUCTOS SIMILARES */}
        {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).length > 0 && (
            <div className="mb-12 border-t border-zinc-900 pt-10">
                <h3 className="font-bebas text-3xl md:text-4xl mb-6 flex items-center gap-4">
                    <span className="w-8 h-[2px] bg-accent"></span> PRODUCTOS SIMILARES
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 4).map(item => (
                        <div key={item.id} className="brutalist-card cursor-pointer group flex flex-col" onClick={() => openProduct(item)}>
                            <div className="relative w-full aspect-[4/5] bg-zinc-950 border-b border-zinc-800 overflow-hidden">
                                <img src={optimizeImg(item.images?.[0], 600)} onError={(e) => { if (item.images?.[0] && e.target.src !== item.images[0]) e.target.src = item.images[0]; }} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={`${item.title} – ${getBranding().brandName}`} loading="lazy" decoding="async" draggable={false} />
                                {item.discountPrice && item.discountPrice > 0 && (
                                    <div className="absolute top-2 right-2 bg-accent text-black font-bebas px-2 py-0.5 text-xs z-10">OFERTA</div>
                                )}
                            </div>
                            <div className="p-3 flex flex-col flex-1">
                                <p className="font-bebas text-lg truncate leading-none mb-1">{item.title}</p>
                                <p className="text-accent text-xs font-bold font-mono mt-auto">{fmtPrice(getPrice(item))}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ESTO PUEDE INTERESARTE */}
        {products.filter(p => p.category !== selectedProduct.category).length > 0 && (
            <div className="mb-10">
                <h3 className="font-bebas text-3xl md:text-4xl mb-6 flex items-center gap-4 text-zinc-500">
                    <span className="w-8 h-[2px] bg-zinc-500"></span> ESTO PUEDE INTERESARTE
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {products.filter(p => p.category !== selectedProduct.category).sort(() => 0.5 - Math.random()).slice(0, 4).map(item => (
                        <div key={item.id} className="brutalist-card cursor-pointer grayscale hover:grayscale-0 transition-all duration-300 flex flex-col" onClick={() => openProduct(item)}>
                            <div className="relative w-full aspect-[4/5] bg-zinc-950 border-b border-zinc-800">
                                <img src={optimizeImg(item.images?.[0], 600)} onError={(e) => { if (item.images?.[0] && e.target.src !== item.images[0]) e.target.src = item.images[0]; }} className="absolute inset-0 w-full h-full object-cover" alt={`${item.title} – ${getBranding().brandName}`} loading="lazy" decoding="async" draggable={false} />
                            </div>
                            <div className="p-3 flex flex-col flex-1">
                                <p className="font-bebas text-lg truncate text-zinc-300 leading-none mb-1">{item.title}</p>
                                <p className="text-zinc-600 text-[10px] uppercase font-mono mt-auto">{item.category}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);
