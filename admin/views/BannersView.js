window.BannersView = ({ popupBanners, bannerForm, setBannerForm, editingBannerId, setEditingBannerId,
    handleBannerSubmit, handleBannerImageUpload, deleteBanner, toggleBannerActive, isSaving }) => {

    const [formOpen, setFormOpen] = React.useState(false);
    const closeForm = () => setFormOpen(false);

    const cancelEdit = () => {
        setEditingBannerId(null);
        setBannerForm({ title: '', subtitle: '', ctaText: '', active: true, image: '' });
        closeForm();
    };

    const renderForm = () => (
        <form onSubmit={(e) => { handleBannerSubmit(e); closeForm(); }} className="bg-zinc-950 h-max">
            {/* Mobile sheet header */}
            <div className="form-sheet-header flex items-center justify-between px-4 py-3 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                <h3 className="font-bebas text-2xl text-accent">{editingBannerId ? 'EDITAR BANNER' : 'NUEVO BANNER'}</h3>
                <div className="flex items-center gap-3">
                    {editingBannerId && <button type="button" onClick={cancelEdit} className="text-xs text-zinc-500 underline">Cancelar</button>}
                    <button type="button" onClick={closeForm} className="text-zinc-400 text-xl font-bold p-1 leading-none">✕</button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Desktop-only header */}
                <div className="hidden-in-sheet flex justify-between items-end border-b border-zinc-800 pb-4">
                    <h2 className="font-bebas text-3xl text-accent">{editingBannerId ? 'EDITAR BANNER' : 'NUEVO BANNER'}</h2>
                    {editingBannerId && <button type="button" onClick={cancelEdit} className="text-xs text-zinc-500 underline">Cancelar</button>}
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">IMAGEN DEL BANNER *</label>
                    {bannerForm.image && <img src={bannerForm.image} className="w-full h-32 object-cover border border-zinc-800 mb-2 mt-2" />}
                    <label className={`block w-full text-center py-3 text-xs font-bold cursor-pointer border border-dashed ${isSaving ? 'border-zinc-700 text-zinc-600' : 'border-zinc-600 text-zinc-400 hover:border-accent hover:text-accent'} transition-colors`}>
                        {isSaving ? 'SUBIENDO...' : (bannerForm.image ? 'CAMBIAR IMAGEN' : '+ SUBIR IMAGEN')}
                        <input type="file" accept="image/*" className="hidden" onChange={handleBannerImageUpload} disabled={isSaving} />
                    </label>
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">TÍTULO (opcional)</label>
                    <input className="brutalist-input" placeholder="NUEVA COLECCIÓN" value={bannerForm.title} onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })} />
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">SUBTEXTO (opcional)</label>
                    <input className="brutalist-input" placeholder="Disponible por tiempo limitado" value={bannerForm.subtitle} onChange={e => setBannerForm({ ...bannerForm, subtitle: e.target.value })} />
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">TEXTO DEL BOTÓN (opcional)</label>
                    <input className="brutalist-input" placeholder="VER COLECCIÓN" value={bannerForm.ctaText} onChange={e => setBannerForm({ ...bannerForm, ctaText: e.target.value })} />
                </div>

                <div className="flex items-center gap-3 border border-zinc-800 p-3">
                    <span className="text-xs text-zinc-400 font-bold flex-1">MOSTRAR EN TIENDA</span>
                    <button type="button" onClick={() => setBannerForm(p => ({ ...p, active: !p.active }))} className={`w-12 h-6 rounded-full transition-colors relative ${bannerForm.active ? 'bg-accent' : 'bg-zinc-700'}`}>
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${bannerForm.active ? 'translate-x-7' : 'translate-x-1'}`}></span>
                    </button>
                </div>

                <button type="submit" disabled={isSaving} className="brutalist-btn w-full flex items-center justify-center gap-2">
                    {isSaving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                    {editingBannerId ? 'ACTUALIZAR BANNER' : 'GUARDAR BANNER'}
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
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-5">
                        <p className="text-[11px] text-zinc-500 font-mono">Solo se muestra 1 banner activo a la vez (el más reciente)</p>
                    </div>

                    {popupBanners.length === 0 ? (
                        <div className="text-center py-20 text-zinc-600 font-bebas text-2xl tracking-widest border border-dashed border-zinc-800">NO HAY BANNERS CREADOS</div>
                    ) : (
                        <div className="space-y-4">
                            {popupBanners.map(b => (
                                <div key={b.id} className={`bg-zinc-950 border flex flex-col gap-4 rounded-xl overflow-hidden ${b.active ? 'border-zinc-800' : 'border-zinc-900 opacity-50'}`}>
                                    <img src={b.image} className="w-full h-40 object-cover shrink-0" />
                                    <div className="flex flex-col flex-1 px-4 pb-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bebas text-xl text-white">{b.title || '(Sin título)'}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 ${b.active ? 'bg-green-900 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>{b.active ? 'ACTIVO' : 'INACTIVO'}</span>
                                        </div>
                                        {b.subtitle && <p className="text-zinc-500 text-xs mb-1">{b.subtitle}</p>}
                                        {b.ctaText && <p className="text-accent text-xs font-bold">CTA: {b.ctaText}</p>}
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            <button onClick={() => toggleBannerActive(b.id, b.active)} className="brutalist-btn-outline px-3 py-2 text-xs">{b.active ? 'DESACTIVAR' : 'ACTIVAR'}</button>
                                            <button onClick={() => {
                                                setEditingBannerId(b.id);
                                                setBannerForm({ title: b.title, subtitle: b.subtitle || '', ctaText: b.ctaText, active: b.active, image: b.image });
                                                setFormOpen(true);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }} className="brutalist-btn-outline px-3 py-2 text-xs">EDITAR</button>
                                            <button onClick={() => deleteBanner(b.id)} className="px-3 py-2 text-xs border border-zinc-800 text-zinc-500 hover:bg-red-900 hover:text-white hover:border-red-800 transition-colors">✕</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB — mobile only */}
            <button className="fab" onClick={() => { setEditingBannerId(null); setBannerForm({ title: '', subtitle: '', ctaText: '', active: true, image: '' }); setFormOpen(true); }}>+</button>
        </div>
    );
};
