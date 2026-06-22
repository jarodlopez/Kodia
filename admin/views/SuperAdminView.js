// Vista exclusiva para super admins (settings/platform.superAdmins).
// Controla: módulos visibles de la tienda/admin, roles y usuarios del panel.
window.SuperAdminView = ({ platform, savePlatform, storeConfig, saveConfigPatch, showToast, currentEmail }) => {
    const FEATURES = [
        { id: 'heroSlider',  label: 'Portadas (Hero)',      desc: 'Slider de imágenes en la página principal.' },
        { id: 'discounts',   label: 'Códigos de descuento', desc: 'Cupones en carrito/checkout y su vista en el admin.' },
        { id: 'banners',     label: 'Pop-ups',              desc: 'Banners emergentes en la tienda y su vista en el admin.' },
        { id: 'sizeGuide',   label: 'Guía de medidas',      desc: 'Botón "guía de medidas" en el producto (útil en ropa, innecesario en ferretería).' },
        { id: 'whatsappFab', label: 'Botón de WhatsApp',    desc: 'Botón flotante de contacto en la tienda.' },
        { id: 'analytics',   label: 'Analytics',            desc: 'Vista de estadísticas en el admin.' },
    ];
    const ALL_VIEWS = [
        ['INVENTORY', 'Inventario'], ['DESIGN', 'Diseño'], ['ORDERS', 'Órdenes'],
        ['DISCOUNTS', 'Descuentos'], ['BANNERS', 'Pop-ups'], ['ANALYTICS', 'Analytics'],
    ];

    const features = { heroSlider: true, discounts: true, banners: true, sizeGuide: true, whatsappFab: true, analytics: true, ...(storeConfig.features || {}) };
    const roles = platform?.roles || {};
    const users = platform?.users || [];
    const superAdmins = platform?.superAdmins || [];

    const [newRole, setNewRole] = React.useState('');
    const [newUser, setNewUser] = React.useState({ email: '', role: '' });
    const [newSuper, setNewSuper] = React.useState('');

    const toggleFeature = async (id) => {
        try {
            await saveConfigPatch({ features: { ...features, [id]: !features[id] } });
            showToast(`Módulo ${features[id] ? 'desactivado' : 'activado'}.`);
        } catch (e) { showToast('Error: ' + e.message, 'error'); }
    };

    const addRole = async () => {
        const name = newRole.trim().toUpperCase();
        if (!name || roles[name]) return;
        await savePlatform({ roles: { ...roles, [name]: [] } });
        setNewRole('');
        showToast(`Rol "${name}" creado.`);
    };

    const toggleRoleView = async (role, viewId) => {
        const current = roles[role] || [];
        const next = current.includes(viewId) ? current.filter(v => v !== viewId) : [...current, viewId];
        await savePlatform({ roles: { ...roles, [role]: next } });
    };

    const removeRole = async (role) => {
        if (!window.confirm(`¿Eliminar el rol "${role}"? Los usuarios asignados quedarán con acceso completo.`)) return;
        const nextRoles = { ...roles };
        delete nextRoles[role];
        await savePlatform({ roles: nextRoles, users: users.map(u => u.role === role ? { ...u, role: '' } : u) });
        showToast(`Rol "${role}" eliminado.`);
    };

    const addUser = async () => {
        const email = newUser.email.trim().toLowerCase();
        if (!email || users.some(u => u.email === email)) return;
        await savePlatform({ users: [...users, { email, role: newUser.role }] });
        setNewUser({ email: '', role: '' });
        showToast('Usuario añadido. Crea su cuenta (correo y contraseña) en Firebase Console → Authentication.');
    };

    const setUserRole = async (email, role) => {
        await savePlatform({ users: users.map(u => u.email === email ? { ...u, role } : u) });
    };

    const removeUser = async (email) => {
        if (!window.confirm(`¿Quitar a ${email} del panel?`)) return;
        await savePlatform({ users: users.filter(u => u.email !== email) });
    };

    const addSuper = async () => {
        const email = newSuper.trim().toLowerCase();
        if (!email || superAdmins.includes(email)) return;
        await savePlatform({ superAdmins: [...superAdmins, email] });
        setNewSuper('');
        showToast('Super admin añadido.');
    };

    const removeSuper = async (email) => {
        if (superAdmins.length === 1) return showToast('Debe quedar al menos un super admin.', 'error');
        if (email === currentEmail && !window.confirm('Estás por quitarte a vos mismo como super admin. ¿Continuar?')) return;
        await savePlatform({ superAdmins: superAdmins.filter(e => e !== email) });
    };

    return (
        <div className="view-animate flex flex-col gap-6">

            {/* MÓDULOS */}
            <div className="border border-zinc-800 p-5 bg-zinc-950 rounded-2xl">
                <h2 className="font-bebas text-3xl text-accent mb-1">MÓDULOS DE LA TIENDA</h2>
                <p className="text-xs text-zinc-400 mb-5">Activa solo lo que este cliente necesita. Lo que apagues desaparece de la tienda pública y del panel.</p>
                <div className="grid md:grid-cols-2 gap-3">
                    {FEATURES.map(f => (
                        <div key={f.id} className="flex items-start justify-between gap-4 border border-zinc-800 bg-black p-4 rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-white">{f.label}</p>
                                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{f.desc}</p>
                            </div>
                            <button
                                onClick={() => toggleFeature(f.id)}
                                className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${features[f.id] ? 'bg-accent' : 'bg-zinc-800'}`}
                                aria-label={`Alternar ${f.label}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${features[f.id] ? 'left-6' : 'left-0.5'}`}></span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ROLES */}
            <div className="border border-zinc-800 p-5 bg-zinc-950 rounded-2xl">
                <h2 className="font-bebas text-3xl text-accent mb-1">ROLES</h2>
                <p className="text-xs text-zinc-400 mb-5">Define qué vistas del panel ve cada rol. Un usuario sin rol asignado ve todo (excepto esta vista).</p>
                <div className="flex gap-2 mb-5">
                    <input
                        type="text" placeholder="NOMBRE DEL ROL (Ej: VENDEDOR)"
                        className="brutalist-input flex-1 mt-0"
                        value={newRole}
                        onChange={e => setNewRole(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && addRole()}
                    />
                    <button onClick={addRole} className="brutalist-btn px-5 py-2 text-sm whitespace-nowrap">+ CREAR</button>
                </div>
                {Object.keys(roles).length === 0 ? (
                    <p className="text-zinc-600 text-sm font-mono italic py-4 text-center">No hay roles. Crea uno arriba.</p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(roles).map(([role, views]) => (
                            <div key={role} className="border border-zinc-800 bg-black p-4 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-bebas text-xl text-white">{role}</p>
                                    <button onClick={() => removeRole(role)} className="text-red-500 text-xs font-bold px-2 py-1 hover:bg-red-950 rounded">ELIMINAR</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_VIEWS.map(([id, label]) => (
                                        <button
                                            key={id}
                                            onClick={() => toggleRoleView(role, id)}
                                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${views.includes(id) ? 'bg-accent text-black border-accent' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
                                        >{label}</button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* USUARIOS */}
            <div className="border border-zinc-800 p-5 bg-zinc-950 rounded-2xl">
                <h2 className="font-bebas text-3xl text-accent mb-1">USUARIOS DEL PANEL</h2>
                <p className="text-xs text-zinc-400 mb-5">
                    Asigna un rol a cada correo. <span className="text-zinc-300">Importante:</span> la cuenta de acceso (correo + contraseña)
                    se crea en Firebase Console → Authentication; aquí solo se define qué puede ver.
                </p>
                <div className="flex flex-col md:flex-row gap-2 mb-5">
                    <input
                        type="email" placeholder="correo@ejemplo.com"
                        className="brutalist-input flex-1 mt-0"
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    />
                    <select className="brutalist-input md:w-48 mt-0 text-xs" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                        <option value="">SIN ROL (acceso completo)</option>
                        {Object.keys(roles).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={addUser} className="brutalist-btn px-5 py-2 text-sm whitespace-nowrap">+ AÑADIR</button>
                </div>
                <div className="space-y-2">
                    {users.map(u => (
                        <div key={u.email} className="flex items-center gap-3 border border-zinc-800 bg-black p-3 rounded-xl">
                            <p className="flex-1 text-sm font-mono text-zinc-200 truncate">{u.email}</p>
                            <select className="brutalist-input w-44 mt-0 text-xs" value={u.role} onChange={e => setUserRole(u.email, e.target.value)}>
                                <option value="">SIN ROL (todo)</option>
                                {Object.keys(roles).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <button onClick={() => removeUser(u.email)} className="text-red-500 font-bold px-2 py-1 hover:bg-red-950 rounded shrink-0">✕</button>
                        </div>
                    ))}
                    {users.length === 0 && <p className="text-zinc-600 text-sm font-mono italic py-4 text-center">Sin usuarios asignados.</p>}
                </div>
            </div>

            {/* SUPER ADMINS */}
            <div className="border border-zinc-800 p-5 bg-zinc-950 rounded-2xl">
                <h2 className="font-bebas text-3xl text-accent mb-1">SUPER ADMINS</h2>
                <p className="text-xs text-zinc-400 mb-5">Tienen acceso total, incluida esta vista. Normalmente: el equipo de la agencia.</p>
                <div className="flex gap-2 mb-5">
                    <input
                        type="email" placeholder="correo@agencia.com"
                        className="brutalist-input flex-1 mt-0"
                        value={newSuper}
                        onChange={e => setNewSuper(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSuper()}
                    />
                    <button onClick={addSuper} className="brutalist-btn px-5 py-2 text-sm whitespace-nowrap">+ AÑADIR</button>
                </div>
                <div className="space-y-2">
                    {superAdmins.map(email => (
                        <div key={email} className="flex items-center gap-3 border border-zinc-800 bg-black p-3 rounded-xl">
                            <span className="text-accent text-xs">★</span>
                            <p className="flex-1 text-sm font-mono text-zinc-200 truncate">{email}{email === currentEmail && <span className="text-zinc-600 ml-2">(vos)</span>}</p>
                            <button onClick={() => removeSuper(email)} className="text-red-500 font-bold px-2 py-1 hover:bg-red-950 rounded shrink-0">✕</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
