window.InventoryView = ({ products, formData, setFormData, editingId, setEditingId,
    handleProductSubmit, handleProductImage, isSaving, uniqueCategories,
    filteredInventory, inventoryFilter, setInventoryFilter, fetchProducts, db, variantLabel = 'TALLA' }) => {

    const [formOpen, setFormOpen] = React.useState(false);
    const closeForm = () => setFormOpen(false);

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({ title: '', sku: '', price: '', discountPrice: '', category: '', description: '', details: '', sizes: [], stockBySizes: {}, stock: '', images: [] });
        closeForm();
    };

    const renderForm = () => (
        <form onSubmit={(e) => { handleProductSubmit(e); closeForm(); }} className="space-y-4 bg-zinc-950 h-max">
            {/* Mobile sheet header — sticky at top inside sheet */}
            <div className="form-sheet-header flex items-center justify-between px-4 py-3 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                <h3 className="font-bebas text-2xl text-accent">{editingId ? 'EDITAR PRENDA' : 'NUEVA PRENDA'}</h3>
                <div className="flex items-center gap-3">
                    {editingId && <button type="button" onClick={cancelEdit} className="text-xs text-zinc-500 underline">Cancelar</button>}
                    <button type="button" onClick={closeForm} className="text-zinc-400 text-xl font-bold p-1 leading-none">✕</button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Desktop header (only visible in desk-form, not in sheet since sheet-header covers it) */}
                <div className="hidden-in-sheet flex justify-between items-end border-b border-zinc-800 pb-4">
                    <h2 className="font-bebas text-3xl text-accent">{editingId ? 'EDITAR PRENDA' : 'NUEVA PRENDA'}</h2>
                    {editingId && <button type="button" onClick={cancelEdit} className="text-xs text-zinc-500 underline">Cancelar Edición</button>}
                </div>

                <input required placeholder="TÍTULO (Ej: OVERSIZED TEE BLACK)" className="brutalist-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value.toUpperCase() })} />

                <div className="flex gap-2">
                    <input placeholder="SKU (Opcional)" className="brutalist-input" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })} />
                    <select required className="brutalist-input text-xs" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                        <option value="" disabled>CATEGORÍA...</option>
                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex gap-2 bg-black p-2 border border-zinc-800">
                    <div className="w-1/2">
                        <label className="text-[10px] text-zinc-500 font-bold block mb-1">PRECIO BASE</label>
                        <input required type="number" className="brutalist-input mt-0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                    </div>
                    <div className="w-1/2">
                        <label className="text-[10px] text-accent font-bold block mb-1">PRECIO DESCUENTO</label>
                        <input type="number" placeholder="Opcional" className="brutalist-input mt-0" value={formData.discountPrice} onChange={e => setFormData({ ...formData, discountPrice: e.target.value })} />
                    </div>
                </div>

                <textarea required placeholder="DESCRIPCIÓN DEL PRODUCTO" className="brutalist-input h-20 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                <textarea placeholder="DETALLES TÉCNICOS (UNO POR LÍNEA)" className="brutalist-input h-20 resize-none" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} />

                <div className="border-t border-zinc-800 pt-4">
                    <p className="text-xs text-zinc-500 mb-2 font-bold tracking-widest">{variantLabel}S DISPONIBLES (opcional)</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {['S', 'M', 'L', 'XL', 'XXL', 'ÚNICA'].map(s => (
                            <button key={s} type="button" onClick={() => {
                                const newSizes = formData.sizes.includes(s) ? formData.sizes.filter(x => x !== s) : [...formData.sizes, s];
                                const newStock = { ...formData.stockBySizes };
                                if (!newSizes.includes(s)) delete newStock[s];
                                setFormData(p => ({ ...p, sizes: newSizes, stockBySizes: newStock }));
                            }} className={`px-4 py-2 font-bebas text-lg transition-colors border rounded-lg ${formData.sizes.includes(s) ? 'bg-accent border-accent text-black' : 'border-zinc-700 text-zinc-400 hover:text-white'}`}>{s}</button>
                        ))}
                    </div>
                    {formData.sizes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] text-zinc-500 font-bold tracking-widest">STOCK POR {variantLabel} <span className="text-zinc-600 font-normal normal-case">(vacío = sin límite)</span></p>
                            {formData.sizes.map(s => {
                                const val = formData.stockBySizes?.[s];
                                const isOut = val !== undefined && val !== '' && Number(val) === 0;
                                return (
                                    <div key={s} className="flex items-center gap-2">
                                        <span className={`w-14 text-center py-1.5 rounded-lg shrink-0 border flex flex-col items-center justify-center gap-0.5 ${isOut ? 'bg-red-950 border-red-900 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}>
                                            <span className="font-bebas text-base leading-none">{s}</span>
                                            {isOut && <span className="text-[8px] font-mono font-bold leading-none">AGOT.</span>}
                                        </span>
                                        <div className="flex-1 relative">
                                            <input
                                                type="number" min="0"
                                                placeholder="Sin límite"
                                                className="brutalist-input mt-0 w-full text-sm"
                                                value={val ?? ''}
                                                onChange={e => setFormData(p => ({ ...p, stockBySizes: { ...p.stockBySizes, [s]: e.target.value === '' ? '' : Number(e.target.value) } }))}
                                            />
                                            {!isOut && val !== '' && val !== undefined && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-mono pointer-events-none">uds</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="border border-zinc-700 bg-black p-4">
                    <p className="text-xs text-zinc-500 mb-2 font-bold">FOTOGRAFÍAS</p>
                    <input type="file" multiple accept="image/*" onChange={handleProductImage} className="text-xs w-full mb-3 text-zinc-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700" />
                    <div className="flex flex-wrap gap-2">
                        {formData.images.map((img, i) => <img key={i} src={img} className="w-16 h-20 object-cover border border-zinc-600" />)}
                        {formData.images.length > 0 && <button type="button" onClick={() => setFormData({ ...formData, images: [] })} className="text-accent font-bold text-xs underline mt-2 w-full text-left">Eliminar fotos y subir otras</button>}
                    </div>
                </div>

                <button type="submit" disabled={isSaving} className="brutalist-btn w-full flex items-center justify-center gap-2">
                    {isSaving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                    {editingId ? 'ACTUALIZAR PRENDA' : 'AÑADIR AL CATÁLOGO'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="view-animate">
            {/* Mobile form sheet */}
            <div className={`form-sheet ${formOpen ? 'is-open' : ''}`}>
                {renderForm()}
            </div>

            <div className="flex gap-6">
                {/* Desktop sidebar form */}
                <div className="desk-form border border-zinc-800 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
                    {renderForm()}
                </div>

                {/* List */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="bg-black border border-zinc-800 p-4 mb-4 flex flex-wrap gap-2 items-center rounded-xl">
                        <span className="text-xs text-zinc-500 font-bold mr-2">FILTRAR:</span>
                        <button onClick={() => setInventoryFilter('TODAS')} className={`brutalist-btn-outline px-3 py-1 ${inventoryFilter === 'TODAS' ? 'active' : ''}`}>TODAS</button>
                        {uniqueCategories.map(cat => (
                            <button key={cat} onClick={() => setInventoryFilter(cat)} className={`brutalist-btn-outline px-3 py-1 ${inventoryFilter === cat ? 'active' : ''}`}>{cat}</button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                        {filteredInventory.map(p => (
                            <div key={p.id} className="border border-zinc-800 flex flex-col bg-zinc-950 relative group rounded-xl overflow-hidden">
                                <div className="relative bg-black border-b border-zinc-800 overflow-hidden" style={{ aspectRatio: '4/5' }}>
                                    <img src={p.images?.[0]} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    {p.discountPrice && p.discountPrice > 0 && (
                                        <span className="absolute top-2 right-2 bg-accent text-black text-[10px] font-bold px-2 py-1">OFERTA</span>
                                    )}
                                    <span className="absolute top-2 left-2 bg-white text-black text-[10px] font-bold px-2 py-1">{p.category}</span>
                                </div>
                                <div className="p-3 flex-1 flex flex-col">
                                    <p className="font-bebas text-xl truncate leading-none mb-1">{p.title}</p>
                                    {p.sku && <p className="text-[10px] text-zinc-500 mb-1">SKU: {p.sku}</p>}
                                    {p.stockBySizes && Object.keys(p.stockBySizes).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-1.5">
                                            {Object.entries(p.stockBySizes).map(([sz, qty]) => (
                                                <span key={sz} className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${qty <= 0 ? 'bg-red-950 text-red-400' : qty <= 2 ? 'bg-yellow-950 text-yellow-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                                    {sz}:{qty <= 0 ? '✕' : qty}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-auto">
                                        {p.discountPrice && p.discountPrice > 0 ? (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-accent font-mono text-xs font-bold">{fmtPrice(p.discountPrice)}</span>
                                                <span className="text-zinc-600 font-mono text-[10px] line-through">{fmtPrice(p.price)}</span>
                                            </div>
                                        ) : (
                                            <p className="text-white font-mono text-xs font-bold">{fmtPrice(p.price)}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex border-t border-zinc-800">
                                    <button onClick={() => {
                                        setEditingId(p.id);
                                        setFormData({ title: p.title || '', sku: p.sku || '', price: p.price || '', discountPrice: p.discountPrice || '', category: p.category || '', description: p.description || '', details: (p.details || []).join('\n'), sizes: p.sizes || [], stockBySizes: p.stockBySizes || {}, stock: p.stock || '', images: p.images || [] });
                                        setFormOpen(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }} className="flex-1 text-xs text-zinc-400 py-2 hover:bg-zinc-800 transition-colors border-r border-zinc-800">EDITAR</button>
                                    <button onClick={async () => {
                                        if (window.confirm('¿Seguro que quieres borrar esta prenda?')) {
                                            await db.collection('products').doc(p.id).delete(); fetchProducts();
                                        }
                                    }} className="flex-1 text-xs text-red-500 font-bold py-2 hover:bg-red-900 transition-colors">ELIMINAR</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {filteredInventory.length === 0 && (
                        <p className="text-center text-zinc-600 py-10 font-bebas text-2xl tracking-widest">NO HAY PRENDAS EN ESTA CATEGORÍA</p>
                    )}
                </div>
            </div>

            {/* FAB — mobile only */}
            <button className="fab" onClick={() => { setEditingId(null); setFormData({ title: '', sku: '', price: '', discountPrice: '', category: '', description: '', details: '', sizes: [], stockBySizes: {}, stock: '', images: [] }); setFormOpen(true); }}>+</button>
        </div>
    );
};
