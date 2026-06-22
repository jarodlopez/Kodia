window.PopupBanner = ({ isPopupVisible, setIsPopupVisible, popupBanners }) => {
    if (!isPopupVisible || !popupBanners.length) return null;
    const banner = popupBanners[0];
    return (
        <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsPopupVisible(false)}>
            <div className="relative max-w-md w-full border border-accent bg-black animate-slideUp shadow-[0_8px_40px_rgb(var(--accent-rgb)/0.35)] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <button onClick={() => setIsPopupVisible(false)} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-accent text-white font-bold text-xl transition-colors leading-none rounded-full border border-zinc-700">✕</button>
                <img src={optimizeImg(banner.image, 800)} onError={(e) => { if (banner.image && e.target.src !== banner.image) e.target.src = banner.image; }} className="w-full object-cover max-h-[55vh]" alt={banner.title || getBranding().brandName} decoding="async" draggable={false} />
                {(banner.title || banner.subtitle || banner.ctaText) && (
                    <div className="p-6 text-center">
                        {banner.title && <h2 className="font-bebas text-4xl text-white leading-none mb-2">{banner.title}</h2>}
                        {banner.subtitle && <p className="text-zinc-400 text-sm mb-4">{banner.subtitle}</p>}
                        {banner.ctaText && (
                            <button onClick={() => setIsPopupVisible(false)} className="brutalist-btn px-8 py-3 text-lg">{banner.ctaText}</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
