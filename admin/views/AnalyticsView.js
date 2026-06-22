window.AnalyticsView = ({ analyticsEvents, analyticsRange, setAnalyticsRange,
    analyticsLoading, orders, fetchAnalytics, fetchOrders }) => {

    const now = new Date();
    const days = parseInt(analyticsRange);
    const rangeStart = new Date(now.getTime() - days * 86400000);

    const evts = analyticsEvents.filter(e => new Date(e.timestamp) >= rangeStart);
    const filteredOrders = orders.filter(o => new Date(o.date) >= rangeStart);

    const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const avgTicket = filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0;
    const pageViews = evts.filter(e => e.type === 'page_view').length;
    const productViews = evts.filter(e => e.type === 'product_view').length;
    const cartAdds = evts.filter(e => e.type === 'add_to_cart').length;
    const checkoutsStarted = evts.filter(e => e.type === 'checkout_started').length;
    const ordersCompleted = filteredOrders.length;

    const funnelSteps = [
        { label: 'VISITAS', value: pageViews },
        { label: 'VIO PRODUCTO', value: productViews },
        { label: 'AL CARRITO', value: cartAdds },
        { label: 'INICIÓ PAGO', value: checkoutsStarted },
        { label: 'COMPLETÓ ORDEN', value: ordersCompleted },
    ];
    const funnelMax = funnelSteps[0].value || 1;

    const salesByDay = {};
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('es-NI', { day: '2-digit', month: '2-digit' });
        salesByDay[key] = { label, orders: 0, revenue: 0 };
    }
    filteredOrders.forEach(o => {
        const day = (o.date || '').split('T')[0];
        if (salesByDay[day]) { salesByDay[day].orders++; salesByDay[day].revenue += Number(o.total) || 0; }
    });
    const chartDays = Object.values(salesByDay);
    const maxRevenue = Math.max(...chartDays.map(d => d.revenue), 1);

    const productSales = {};
    filteredOrders.forEach(o => {
        (o.items || []).forEach(item => {
            const k = item.title || 'Desconocido';
            if (!productSales[k]) productSales[k] = { title: k, count: 0, revenue: 0 };
            productSales[k].count++;
            productSales[k].revenue += Number(item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price) || 0;
        });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.count - a.count).slice(0, 5);
    const maxCount = topProducts[0]?.count || 1;

    const catViews = {};
    evts.filter(e => e.type === 'product_view' && e.category).forEach(e => {
        catViews[e.category] = (catViews[e.category] || 0) + 1;
    });
    const topCats = Object.entries(catViews).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const managua = filteredOrders.filter(o => o.shippingZone === 'Managua').length;
    const deptos = filteredOrders.filter(o => o.shippingZone !== 'Managua').length;
    const zoneTotal = managua + deptos || 1;

    // Identidad del visitante: la IP (hash) es lo más confiable porque la captura
    // el servidor y no se puede falsificar. Caemos a userId/sessionId para eventos
    // antiguos que aún no tengan ipHash.
    const idOf = (e) => e.ipHash || e.userId || e.sessionId;

    // Usuarios únicos: identidades distintas en el período (1 por IP real)
    const uniqueUsers = new Set(evts.map(idOf).filter(Boolean)).size;

    // Carritos abandonados: identidades con add_to_cart pero sin checkout_started
    const cartIds = new Set(evts.filter(e => e.type === 'add_to_cart').map(idOf).filter(Boolean));
    const checkoutIds = new Set(evts.filter(e => e.type === 'checkout_started').map(idOf).filter(Boolean));
    const abandonedCarts = [...cartIds].filter(id => !checkoutIds.has(id)).length;
    const cartAbandonRate = cartIds.size > 0 ? ((abandonedCarts / cartIds.size) * 100).toFixed(0) : 0;

    // Productos más abandonados (agregados al carrito por quienes no iniciaron pago)
    const abandonedProductCounts = {};
    evts.filter(e => e.type === 'add_to_cart' && !checkoutIds.has(idOf(e)))
        .forEach(e => {
            const k = e.productTitle || 'Desconocido';
            abandonedProductCounts[k] = (abandonedProductCounts[k] || 0) + 1;
        });
    const topAbandonedProducts = Object.entries(abandonedProductCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxAbandoned = topAbandonedProducts[0]?.[1] || 1;

    const kpiCards = [
        { label: 'INGRESOS TOTALES', value: `${fmtPrice(totalRevenue.toLocaleString())}`, sub: `${ordersCompleted} órdenes`, color: 'text-accent' },
        { label: 'TICKET PROMEDIO', value: `${fmtPrice(avgTicket.toLocaleString())}`, sub: 'por orden', color: 'text-white' },
        { label: 'VISITAS', value: pageViews.toLocaleString(), sub: `en ${days} día${days > 1 ? 's' : ''}`, color: 'text-white' },
        { label: 'USUARIOS ÚNICOS', value: uniqueUsers.toLocaleString(), sub: 'identificados', color: 'text-white' },
        { label: 'CARRITOS ABANDONADOS', value: abandonedCarts.toLocaleString(), sub: `${cartAbandonRate}% tasa abandono`, color: abandonedCarts > 0 ? 'text-yellow-400' : 'text-white' },
        { label: 'TASA DE COMPRA', value: pageViews > 0 ? `${((ordersCompleted / pageViews) * 100).toFixed(1)}%` : '—', sub: 'visita → orden', color: 'text-white' },
    ];

    return (
        <div className="view-animate space-y-6">
            {/* Header + period selector */}
            <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5">
                <div>
                    <h2 className="font-bebas text-4xl text-white">ANALYTICS</h2>
                    <p className="text-zinc-500 text-xs mt-1">Tráfico, ventas y conversiones</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-500 font-bold">PERÍODO:</span>
                    {[['1', 'HOY'], ['7', '7 DÍAS'], ['30', '30 DÍAS']].map(([v, l]) => (
                        <button key={v} onClick={() => setAnalyticsRange(v)} className={`font-bebas text-lg px-4 py-1 border transition-colors ${analyticsRange === v ? 'bg-accent text-black border-accent' : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-white hover:text-white'}`}>{l}</button>
                    ))}
                    <button onClick={() => { fetchAnalytics(); fetchOrders(); }} className="ml-1 text-zinc-500 hover:text-white text-xl" title="Actualizar">↻</button>
                </div>
            </div>

            {analyticsLoading ? (
                <div className="text-center py-20 font-bebas text-3xl text-accent animate-pulse">CARGANDO DATOS...</div>
            ) : (
                <>
                    {/* KPI Cards: 2 cols on mobile, 4 on desktop */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }} className="kpi-grid">
                        {kpiCards.map((kpi, i) => (
                            <div key={i} className={`bg-zinc-950 border p-4 rounded-xl ${kpi.label === 'CARRITOS ABANDONADOS' && abandonedCarts > 0 ? 'border-yellow-500/40 bg-yellow-950/20' : 'border-zinc-800'}`}>
                                <p className="text-[9px] text-zinc-500 font-bold tracking-widest mb-2 uppercase leading-tight">{kpi.label}</p>
                                <p className={`font-bebas text-3xl ${kpi.color} leading-none mb-1`}>{kpi.value}</p>
                                <p className="text-zinc-600 text-xs">{kpi.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Funnel */}
                    <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl overflow-hidden">
                        <h3 className="font-bebas text-2xl text-white mb-5 flex items-center gap-3"><span className="w-6 h-[2px] bg-accent inline-block"></span> EMBUDO DE CONVERSIÓN</h3>
                        <div className="space-y-3">
                            {funnelSteps.map((step, i) => {
                                const pct = Math.round((step.value / funnelMax) * 100);
                                const dropPct = i > 0 && funnelSteps[i - 1].value > 0
                                    ? ((1 - step.value / funnelSteps[i - 1].value) * 100).toFixed(0)
                                    : null;
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-zinc-600 font-mono text-xs w-4 shrink-0">{i + 1}</span>
                                                <span className="font-bebas text-base text-white leading-none truncate">{step.label}</span>
                                                {dropPct !== null && Number(dropPct) > 0 && (
                                                    <span className="text-[9px] text-red-400 font-mono bg-red-900/20 px-1.5 py-0.5 border border-red-900 shrink-0">↓{dropPct}%</span>
                                                )}
                                            </div>
                                            <span className="font-bebas text-xl text-accent shrink-0 ml-2">{step.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-5 bg-zinc-900 border border-zinc-800 relative overflow-hidden">
                                            <div className="h-full bg-accent transition-all duration-700" style={{ width: `${pct}%`, opacity: 1 - i * 0.1 }}></div>
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">{pct}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Abandoned Carts Detail */}
                    <div className={`border p-5 rounded-2xl overflow-hidden ${abandonedCarts > 0 ? 'bg-yellow-950/10 border-yellow-500/30' : 'bg-zinc-950 border-zinc-800'}`}>
                        <h3 className="font-bebas text-2xl text-white mb-1 flex items-center gap-3">
                            <span className="w-6 h-[2px] bg-yellow-500 inline-block"></span> CARRITOS ABANDONADOS
                            {abandonedCarts > 0 && (
                                <span className="ml-auto font-bebas text-3xl text-yellow-400">{abandonedCarts}</span>
                            )}
                        </h3>
                        <p className="text-zinc-500 text-xs mb-4">Sesiones que agregaron productos al carrito pero no completaron el pago</p>
                        {topAbandonedProducts.length === 0 ? (
                            <p className="text-zinc-600 font-bebas text-xl text-center py-6">SIN CARRITOS ABANDONADOS EN ESTE PERÍODO</p>
                        ) : (
                            <div className="space-y-3">
                                {topAbandonedProducts.map(([title, count], i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-yellow-500 font-bebas text-xl w-5 text-center shrink-0">{i + 1}</span>
                                                <span className="text-zinc-300 text-xs font-mono truncate">{title}</span>
                                            </div>
                                            <span className="font-bebas text-lg text-yellow-400 shrink-0 ml-2">{count} {count === 1 ? 'vez' : 'veces'}</span>
                                        </div>
                                        <div className="h-1.5 bg-zinc-900">
                                            <div className="h-full bg-yellow-500/70" style={{ width: `${Math.round((count / maxAbandoned) * 100)}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                                <p className="text-zinc-600 text-[10px] mt-3 pt-3 border-t border-zinc-800">
                                    {cartIds.size} {cartIds.size === 1 ? 'usuario' : 'usuarios'} agregó al carrito · {abandonedCarts} sin iniciar pago ({cartAbandonRate}% abandono)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Daily sales chart */}
                    <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl overflow-hidden">
                        <h3 className="font-bebas text-2xl text-white mb-5 flex items-center gap-3"><span className="w-6 h-[2px] bg-accent inline-block"></span> VENTAS DIARIAS</h3>
                        {chartDays.every(d => d.revenue === 0) ? (
                            <p className="text-zinc-600 text-center py-10 font-bebas text-xl">SIN DATOS DE VENTAS EN ESTE PERÍODO</p>
                        ) : (
                            <div className="flex items-end gap-1 overflow-x-auto" style={{ height: '10rem' }}>
                                {chartDays.map((d, i) => {
                                    const barH = Math.max(Math.round((d.revenue / maxRevenue) * 100), d.revenue > 0 ? 4 : 0);
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-1 flex-1 group cursor-default" style={{ minWidth: '24px' }} title={`${d.label}: ${fmtPrice(d.revenue)} (${d.orders} órdenes)`}>
                                            {d.revenue > 0 && <span className="text-[9px] text-zinc-600 group-hover:text-accent font-mono">{d.orders}</span>}
                                            <div className="w-full bg-accent group-hover:bg-white transition-colors" style={{ height: `${barH}%` }}></div>
                                            <span className="text-[9px] text-zinc-600 group-hover:text-white font-mono">{d.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Top products + zones + categories */}
                    <div className="space-y-6">
                        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl overflow-hidden">
                            <h3 className="font-bebas text-2xl text-white mb-4 flex items-center gap-3"><span className="w-6 h-[2px] bg-accent inline-block"></span> TOP PRODUCTOS VENDIDOS</h3>
                            {topProducts.length === 0 ? (
                                <p className="text-zinc-600 font-bebas text-xl text-center py-10">SIN VENTAS EN ESTE PERÍODO</p>
                            ) : (
                                <div className="space-y-3">
                                    {topProducts.map((p, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-accent font-bebas text-xl w-5 text-center shrink-0">{i + 1}</span>
                                                    <span className="text-white text-xs font-mono truncate">{p.title}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                                    <span className="text-zinc-500 text-xs font-mono">{fmtPrice(p.revenue.toLocaleString())}</span>
                                                    <span className="text-accent font-bebas text-lg">{p.count} uds.</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-zinc-900">
                                                <div className="h-full bg-accent" style={{ width: `${Math.round((p.count / maxCount) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl overflow-hidden">
                            <h3 className="font-bebas text-2xl text-white mb-4 flex items-center gap-3"><span className="w-6 h-[2px] bg-accent inline-block"></span> ZONAS DE ENVÍO</h3>
                            {ordersCompleted === 0 ? (
                                <p className="text-zinc-600 font-bebas text-lg text-center py-4">SIN DATOS</p>
                            ) : (
                                <div className="space-y-3">
                                    {[['MANAGUA', managua], ['DEPARTAMENTOS', deptos]].map(([label, count]) => (
                                        <div key={label}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-mono text-zinc-400">{label}</span>
                                                <span className="font-bebas text-white text-lg leading-none">{count} <span className="text-zinc-500 text-xs">({Math.round((count / zoneTotal) * 100)}%)</span></span>
                                            </div>
                                            <div className="h-3 bg-zinc-900">
                                                <div className="h-full bg-accent" style={{ width: `${Math.round((count / zoneTotal) * 100)}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl overflow-hidden">
                            <h3 className="font-bebas text-2xl text-white mb-4 flex items-center gap-3"><span className="w-6 h-[2px] bg-accent inline-block"></span> CATEGORÍAS VISTAS</h3>
                            {topCats.length === 0 ? (
                                <p className="text-zinc-600 font-bebas text-lg text-center py-4">SIN DATOS</p>
                            ) : (
                                <div className="space-y-2">
                                    {topCats.map(([cat, cnt], i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <span className="font-mono text-zinc-400 truncate">{cat}</span>
                                            <span className="font-bebas text-accent text-lg ml-2 shrink-0">{cnt}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
