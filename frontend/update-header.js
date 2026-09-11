const fs = require('fs');
const file = fs.readFileSync('components/layout/Header.tsx', 'utf8');

// replace imports
let newFile = file.replace(
  /import \{ Gem, ScanSearch, ShoppingBag, X \} from 'lucide-react'/,
  "import { Search, ScanSearch, ShoppingBag, X } from 'lucide-react'"
);

// replace mobile search panel
const searchPanelOld = `{/* ── Mobile Search Panel ─────────────────────── */}
      <div
        className={\`lg:hidden transition-all duration-300 ease-out overflow-hidden \${
          mobileSearchOpen
            ? 'max-h-[420px] opacity-100'
            : 'max-h-0 opacity-0 pointer-events-none'
        }\`}
        style={{
          background: CENTER_HEADER_BG,
          borderTop: mobileSearchOpen ? '1px solid var(--ivory-dark)' : 'none',
          transform: mobileSearchOpen ? 'translateY(0)' : 'translateY(-6px)',
        }}
      >
        <div className="px-4 pt-3 pb-4">
          {/* Panel header row */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] uppercase tracking-[2px] font-semibold"
              style={{ color: 'var(--muted)' }}
            >
              Search Products
            </span>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--ivory-dark)]"
              style={{ color: 'var(--burgundy)' }}
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
          {/* Full animated SearchBar */}
          <SearchBar ref={mobileSearchInputRef} />
        </div>
      </div>

      {/* Backdrop — closes search on outside tap */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-[99] lg:hidden"
          style={{ background: 'rgba(74, 15, 28, 0.15)' }}
          onClick={() => setMobileSearchOpen(false)}
          aria-hidden="true"
        />
      )}`;

const searchPanelNew = `{/* ── Search Panel (Mobile & Desktop) ─────────────────────── */}
      <div
        className={\`transition-all duration-300 ease-out overflow-hidden absolute w-full left-0 \${
          mobileSearchOpen
            ? 'max-h-[420px] opacity-100'
            : 'max-h-0 opacity-0 pointer-events-none'
        }\`}
        style={{
          background: CENTER_HEADER_BG,
          borderTop: mobileSearchOpen ? '1px solid var(--ivory-dark)' : 'none',
          transform: mobileSearchOpen ? 'translateY(0)' : 'translateY(-6px)',
          top: '100%',
          boxShadow: mobileSearchOpen ? '0 12px 40px rgba(82,0,1,0.08)' : 'none',
          zIndex: 101,
        }}
      >
        <div className="px-4 pt-3 pb-4 max-w-[1400px] mx-auto">
          {/* Panel header row */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[10px] uppercase tracking-[2px] font-semibold"
              style={{ color: 'var(--muted)' }}
            >
              Search Products
            </span>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--ivory-dark)]"
              style={{ color: 'var(--burgundy)' }}
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
          {/* Full animated SearchBar */}
          <div className="flex justify-center">
            <SearchBar ref={mobileSearchInputRef} />
          </div>
        </div>
      </div>

      {/* Backdrop — closes search on outside tap */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-[99]"
          style={{ background: 'rgba(74, 15, 28, 0.15)' }}
          onClick={() => setMobileSearchOpen(false)}
          aria-hidden="true"
        />
      )}`;

newFile = newFile.replace(searchPanelOld, searchPanelNew);

// Replace the desktop header logic
const lines = newFile.split('\n');
const startIdx = lines.findIndex(l => l.includes('{/* Desktop Top row */}'));
const endIdx = lines.findIndex(l => l.includes('</header>')) - 1;

if (startIdx === -1 || endIdx === -1) {
  console.log('Indices not found for desktop replacement', startIdx, endIdx);
  process.exit(1);
}

const desktopReplacement = `      {/* Desktop Single-Row Header */}
      <div
        className="hidden lg:flex max-w-[1400px] mx-auto px-8 py-3 items-center justify-between gap-5 relative"
      >
        {/* Logo (Left) */}
        <div className="flex-shrink-0 w-64">
          <Link href="/" className="flex items-center justify-start no-underline">
            <Image
              src={LOGO_SRC}
              alt={LOGO_ALT}
              width={1400}
              height={520}
              priority
              sizes="190px"
              className="h-12 w-auto max-w-[170px] object-contain"
            />
          </Link>
        </div>

        {/* Main Nav (Center) */}
        <nav className="flex-1 flex items-center justify-center gap-6 xl:gap-10 whitespace-nowrap">
          {megaMenuData.map(cat => (
            <div 
              key={cat.label}
              className="group/mainnav h-full"
              onMouseEnter={() => {
                if (cat.subCategories && cat.subCategories.length > 0 && !activeSubcats[cat.label]) {
                  setActiveSubcats(prev => ({ ...prev, [cat.label]: cat.subCategories![0].name }));
                }
              }}
            >
              <div className="h-full">
                <Link
                  href={cat.href}
                  className={\`\${
                    cat.isSale ? 'text-[var(--gold)]' : 'text-[var(--burgundy)]'
                  } px-2 xl:px-3 py-3 text-[12px] xl:text-[13px] tracking-widest uppercase font-semibold no-underline inline-block transition-colors hover:text-[var(--burgundy-light)]\`}
                >
                  {cat.label}
                </Link>
              </div>

              {/* Mega Menu Dropdown */}
              {cat.subCategories && (
                <div className="absolute top-full left-0 w-full bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)] border-t-2 border-[var(--gold)] z-[200] opacity-0 invisible translate-y-3 pointer-events-none group-hover/mainnav:opacity-100 group-hover/mainnav:visible group-hover/mainnav:translate-y-0 group-hover/mainnav:pointer-events-auto transition-all duration-300 overflow-hidden before:absolute before:inset-0 before:pointer-events-none before:bg-[url('/borderdesign/flower-motif.png')] before:bg-[length:500px] before:bg-[position:110%_120%] before:bg-no-repeat before:opacity-[0.03] transform-gpu">
                  <div className="max-w-[1400px] mx-auto flex h-[480px] relative z-10">
                    
                    {/* Left Column: Subcategories */}
                    <div className="w-[300px] flex-shrink-0 border-r border-[var(--ivory-dark)] bg-[var(--ivory)] py-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {cat.subCategories.map(sub => {
                        const currentActive = activeSubcats[cat.label] || cat.subCategories![0].name;
                        return (
                        <div
                          key={sub.name}
                          onMouseEnter={() => setActiveSubcats(prev => ({ ...prev, [cat.label]: sub.name }))}
                          className={\`px-8 py-3.5 cursor-pointer transition-all duration-300 flex justify-between items-center border-b border-[var(--ivory-dark)]/50 last:border-0 \${
                            currentActive === sub.name 
                              ? 'bg-white text-[var(--burgundy-dark)] shadow-[inset_4px_0_0_var(--gold)]' 
                              : 'text-[var(--charcoal)] hover:text-[var(--burgundy)] hover:bg-white/80'
                          }\`}
                        >
                          <span className={\`text-[12.5px] uppercase \${currentActive === sub.name ? 'font-bold' : 'font-bold opacity-90'}\`} style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.08em' }}>
                            {sub.name}
                          </span>
                          {sub.directLink ? (
                             <span className="text-[10px] uppercase tracking-widest text-[var(--gold)] font-bold">View</span>
                          ) : (
                             <span className={\`text-[18px] font-bold transition-transform duration-300 \${currentActive === sub.name ? 'text-[var(--gold)] translate-x-1' : 'text-[var(--muted)]'}\`}>›</span>
                          )}
                        </div>
                      )})}
                    </div>

                    {/* Right Column: Products Grid */}
                    <div className="flex-1 bg-gradient-to-br from-[var(--ivory)]/40 to-white relative p-10 overflow-hidden" style={{ scrollbarWidth: 'thin' }}>
                      <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-[0.06] transform translate-x-12 -translate-y-12 bg-[url('/borderdesign/flower-motif.png')] bg-contain bg-no-repeat pointer-events-none z-0"></div>
                      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.06] transform -translate-x-12 translate-y-12 bg-[url('/borderdesign/flower-motif.png')] bg-contain bg-no-repeat pointer-events-none z-0"></div>
                      
                      <div className="relative z-10 h-full overflow-y-auto pr-4 scrollbar-thin">
                        {(() => {
                          const currentActive = activeSubcats[cat.label] || cat.subCategories![0].name;
                          const activeSubcatData = cat.subCategories!.find(s => s.name === currentActive);
                          if (!activeSubcatData) return null;
                          
                          if (activeSubcatData.directLink) {
                            return (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center px-10 relative group/banner rounded-xl border border-[var(--ivory-dark)] bg-white/60 shadow-sm backdrop-blur-sm hover:bg-white/80 transition-colors duration-500">
                            <div className="w-16 h-16 mb-6 relative transition-transform duration-700 group-hover/banner:-translate-y-2 group-hover/banner:scale-110 flex items-center justify-center">
                              <div className="absolute inset-0 bg-[var(--gold)] blur-xl opacity-30 rounded-full animate-pulse"></div>
                              <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 animate-[spin_15s_linear_infinite]">
                                <defs>
                                  <linearGradient id="gold-grad-emblem" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="var(--gold)" />
                                    <stop offset="50%" stopColor="var(--gold-light)" />
                                    <stop offset="100%" stopColor="var(--gold)" />
                                  </linearGradient>
                                </defs>
                                <path d="M50 5 L54 42 L95 50 L54 58 L50 95 L46 58 L5 50 L46 42 Z" fill="url(#gold-grad-emblem)" opacity="0.95" />
                                <path d="M50 5 L54 42 L95 50 L54 58 L50 95 L46 58 L5 50 L46 42 Z" fill="url(#gold-grad-emblem)" opacity="0.75" transform="rotate(45 50 50)" />
                                <circle cx="50" cy="50" r="5" fill="var(--ivory)" />
                                <circle cx="50" cy="50" r="2" fill="var(--burgundy)" />
                              </svg>
                            </div>
                            <h3 className="text-4xl font-bold mb-3 z-10 transition-transform duration-500 group-hover/banner:-translate-y-1" style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--burgundy)' }}>
                              {activeSubcatData.name}
                            </h3>
                            <p className="text-[14px] text-[var(--muted)] font-medium mb-8 z-10 max-w-md leading-relaxed" style={{ fontFamily: '"DM Sans", sans-serif' }}>
                              Experience the epitome of luxury and tradition. Explore our handpicked collection of <strong className="text-[var(--burgundy)]">{activeSubcatData.name}</strong> tailored perfectly for you.
                            </p>
                            <Link href={filteredCollectionHref(cat.href, activeSubcatData.name)} className="z-10 px-10 py-3.5 bg-[var(--burgundy)] text-white text-[12px] font-bold tracking-[0.2em] uppercase hover:bg-[var(--burgundy-light)] transition-all duration-300 no-underline shadow-[0_4px_15px_rgba(107,26,42,0.3)] hover:shadow-[0_6px_20px_rgba(107,26,42,0.4)] hover:-translate-y-1 rounded-sm">
                              Explore Collection
                            </Link>
                          </div>
                            )
                          } else {
                            return (
                          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 min-h-full flex flex-col">
                            <h3 className="text-[30px] font-bold mb-8 pb-4 border-b border-[var(--ivory-dark)] flex items-center gap-4" style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--burgundy)' }}>
                              <span className="w-10 h-[2px] bg-[var(--gold)] inline-block"></span>
                              {activeSubcatData.name}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-5 pb-6">
                              {activeSubcatData.products?.map((prod, i) => (
                                <Link 
                                  key={\`\${prod.name}-\${i}\`} 
                                  href={filteredCollectionHref(cat.href, prod.name)}
                                  className="text-[14px] text-[var(--charcoal)] hover:text-[var(--burgundy-dark)] transition-all duration-300 flex items-center gap-2.5 no-underline group/link hover:translate-x-1.5 py-1"
                                  style={{ animationDelay: \`\${i * 20}ms\` }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ivory-dark)] group-hover/link:bg-[var(--gold)] transition-colors duration-300 group-hover/link:shadow-[0_0_8px_var(--gold)]"></span>
                                  <span className="font-semibold group-hover/link:font-bold" style={{ fontFamily: '"DM Sans", sans-serif', letterSpacing: '0.03em' }}>{prod.name}</span>
                                  {prod.isHot && <span title="Hot Selling" className="text-[13px] animate-pulse drop-shadow-md ml-auto mr-2">🔥</span>}
                                </Link>
                              ))}
                            </div>
                          </div>
                            )
                          }
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Actions (Right) */}
        <div className="flex items-center justify-end gap-1 md:gap-2 w-64">
          {/* Search Icon */}
          <button
            type="button"
            aria-label="Toggle search"
            onClick={() => setMobileSearchOpen(prev => !prev)}
            className={\`action-item group flex flex-col items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-lg border-none bg-transparent transition-all duration-300 hover:scale-105 active:scale-95\`}
          >
            <Search
              size={22}
              strokeWidth={1.8}
              className={\`transition-colors duration-300 \${mobileSearchOpen ? 'text-[var(--burgundy-dark)]' : 'text-[var(--burgundy)] group-hover:text-[var(--burgundy-dark)]'}\`}
            />
          </button>

          <LoginDropdown />

          <Link href="/cart" className="action-item group relative flex flex-col items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-lg border-none bg-transparent transition-all duration-300 hover:scale-105 active:scale-95 no-underline">
            <ShoppingBag
              size={22}
              strokeWidth={1.8}
              className="transition-colors duration-300 text-[var(--burgundy)] group-hover:text-[var(--burgundy-dark)]"
            />
            <span className="heritage-count-badge top-1.5 right-1.5 md:right-2 animate-badge-pulse">
              2
            </span>
          </Link>
        </div>
      </div>`;

lines.splice(startIdx, endIdx - startIdx, desktopReplacement);
fs.writeFileSync('components/layout/Header.tsx', lines.join('\n'), 'utf8');
console.log('Successfully updated Header.tsx!');
