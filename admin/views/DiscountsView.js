window.DiscountsView = ({ discountCodes, codeForm, setCodeForm, editingCodeId, setEditingCodeId,
    handleCodeSubmit, deleteCode, toggleCodeActive, isSaving }) => {

    const [formOpen, setFormOpen] = React.useState(false);
    const closeForm = () => setFormOpen(false);

    const cancelEdit = () => {
        setEditingCodeId(null);
        setCodeForm({ code: '', type: 'percent', value: '', expiryDate: '', usageLimit: '' });
        closeForm();
    };

    const renderForm = () => (
        <form onSubmit={(e) => { handleCodeSubmit(e); closeForm(); }} className="bg-zinc-950 h-max">
            {/* Mobile sheet header */}
            <div className="form-sheet-header flex items-center justify-between px-4 py-3 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                <h3 className="font-bebas text-2xl text-accent">{editingCodeId ? 'EDITAR CÓDIGO' : 'NUEVO CÓDIGO'}</h3>
                <div className="flex items-center gap-3">
                    {editingCodeId && <button type="button" onClick={cancelEdit} className="text-xs text-zinc-500 underline">Cancelar</button>}
                    <button type="button" onClick={closeForm} className="text-zinc-400 text-xl font-bold p-1 leading-none">✕</button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Desktop-only header (not shown in mobile sheet since sheet-header is above) */}
                <div className="hidden-in-sheet flex justify-between items-end border-b border-zinc-800 pb-4">
                    <h2 className="font-bebas text-3xl text-accent">{editingCodeId ? 'EDITAR CÓDIGO' : 'NUEVO CÓDIGO'}</h2>
                    {editingCodeId && <button type="button" onClick={cancelEdit} className="text-xs text-zinc-500 underline">Cancelar</button>}
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">CÓDIGO (ej: DESCUENTO20)</label>
                    <input required className="brutalist-input" placeholder="DESCUENTO20" value={codeForm.code} onChange={e => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })} />
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">TIPO DE DESCUENTO</label>
                    <select required className="brutalist-input" value={codeForm.type} onChange={e => setCodeForm({ ...codeForm, type: e.target.value })}>
                        <option value="percent">PORCENTAJE (%)</option>
                        <option value="fixed">MONTO FIJO</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">VALOR DEL DESCUENTO</label>
                    <input required type="number" min="1" className="brutalist-input" placeholder={codeForm.type === 'percent' ? '20 (= 20%)' : '100'} value={codeForm.value} onChange={e => setCodeForm({ ...codeForm, value: e.target.value })} />
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">FECHA DE EXPIRACIÓN (opcional)</label>
                    <input type="date" className="brutalist-input" value={codeForm.expiryDate} onChange={e => setCodeForm({ ...codeForm, expiryDate: e.target.value })} />
                </div>

                <div>
                    <label className="text-xs text-zinc-400 font-bold">LÍMITE DE USOS (0 = ilimitado)</label>
                    <input type="number" min="0" className="brutalist-input" placeholder="0" value={codeForm.usageLimit} onChange={e => setCodeForm({ ...codeForm, usageLimit: e.target.value })} />
                </div>

                <button type="submit" disabled={isSaving} className="brutalist-btn w-full flex items-center justify-center gap-2">
                    {isSaving && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>}
                    {editingCodeId ? 'ACTUALIZAR CÓDIGO' : 'CREAR CÓDIGO'}
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
                        <p className="text-[11px] text-zinc-500 font-mono">{discountCodes.length} código{discountCodes.length !== 1 ? 's' : ''} en total</p>
                    </div>

                    {discountCodes.length === 0 ? (
                        <div className="text-center py-20 text-zinc-600 font-bebas text-2xl tracking-widest border border-dashed border-zinc-800">NO HAY CÓDIGOS CREADOS</div>
                    ) : (
                        <div className="space-y-3">
                            {discountCodes.map(c => (
                                <div key={c.id} className={`bg-zinc-950 border p-4 flex flex-col gap-4 rounded-xl ${c.active ? 'border-zinc-800' : 'border-zinc-900 opacity-50'}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bebas text-2xl text-white">{c.code}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 ${c.active ? 'bg-green-900 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>{c.active ? 'ACTIVO' : 'INACTIVO'}</span>
                                        </div>
                                        <p className="text-zinc-400 text-xs font-mono">
                                            {c.type === 'percent' ? `${c.value}% de descuento` : `${fmtPrice(c.value)} de descuento`}
                                            {c.expiryDate && ` · Expira: ${c.expiryDate}`}
                                            {' · '}{c.usageLimit > 0 ? `${c.usageCount}/${c.usageLimit} usos` : `${c.usageCount} usos (ilimitado)`}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0 flex-wrap">
                                        <button onClick={() => toggleCodeActive(c.id, c.active)} className="brutalist-btn-outline px-3 py-2 text-xs">{c.active ? 'DESACTIVAR' : 'ACTIVAR'}</button>
                                        <button onClick={() => {
                                            setEditingCodeId(c.id);
                                            setCodeForm({ code: c.code, type: c.type, value: String(c.value), expiryDate: c.expiryDate || '', usageLimit: String(c.usageLimit) });
                                            setFormOpen(true);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }} className="brutalist-btn-outline px-3 py-2 text-xs">EDITAR</button>
                                        <button onClick={() => deleteCode(c.id)} className="px-3 py-2 text-xs border border-zinc-800 text-zinc-500 hover:bg-red-900 hover:text-white hover:border-red-800 transition-colors">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB — mobile only */}
            <button className="fab" onClick={() => { setEditingCodeId(null); setCodeForm({ code: '', type: 'percent', value: '', expiryDate: '', usageLimit: '' }); setFormOpen(true); }}>+</button>
        </div>
    );
};
