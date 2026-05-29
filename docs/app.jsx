// app.jsx — AI Wiki shell: sidebar, search, entry views, queue feed, push bar.

const { useState, useEffect, useMemo, useRef, useCallback } = React;
const { useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider, TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton } = window;
const { useWiki, GraphView, OnionView } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "look": "aurora",
  "accent": "#ff8c42",
  "density": "regular",
  "fontScale": 100,
  "monoTerms": false,
  "showHubLabels": true
}/*EDITMODE-END*/;

const ACCENTS = {
  orange: '#ff8c42', cyan: '#56c8e8', amber: '#e8b04b', emerald: '#5fd0a3',
};

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return ''; }
}

// ---- small presentational bits ----------------------------------------
function StatusDot({ status }) {
  return <span className={'st-dot st-' + status} />;
}

function QueueFeed({ log, processing, onClear }) {
  const ordered = useMemo(() => log.slice().reverse(), [log]);
  return (
    <div className="qfeed">
      <div className="qfeed-head">
        <div className="qfeed-title">
          <span className={'pulse' + (processing ? ' on' : '')} />
          queue.txt
        </div>
        <button className="link-btn" onClick={onClear} title="Clear the activity feed">clear</button>
      </div>
      {!ordered.length && <div className="qfeed-empty">No pushes yet. Append a line to <code>queue.txt</code> and reload, or push a term below.</div>}
      <div className="qfeed-list">
        {ordered.map(item => (
          <div key={item.key} className={'qfeed-item is-' + item.status}>
            <StatusDot status={item.status} />
            <div className="qfeed-body">
              <div className="qfeed-term">{item.term}</div>
              <div className="qfeed-meta">
                {item.status === 'queued' && 'queued'}
                {item.status === 'researching' && 'researching...'}
                {item.status === 'filed' && <>filed - <span className="qfeed-cat">{item.category}</span></>}
                {item.status === 'error' && <span className="qfeed-err">error: {item.error}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ---- sidebar -----------------------------------------------------------
function Sidebar({ catMap, view, go, query, setQuery, results }) {
  const [expandedCats, setExpandedCats] = useState({});

  const toggleCategory = (cat) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Layer order matching onion visualization
  const layerOrder = [
    'fundamentals',
    'model-architectures',
    'inference-and-serving',
    'tools-and-frameworks',
    'security-and-safety',
  ];

  const catLabels = {
    'fundamentals': 'Fundamentals',
    'model-architectures': 'Model Architectures',
    'inference-and-serving': 'Inference & Serving',
    'tools-and-frameworks': 'Tools & Frameworks',
    'security-and-safety': 'Security & Safety',
  };

  const layerColors = [
    'rgba(167, 139, 255, 0.8)',  // Violet
    'rgba(86, 200, 232, 0.8)',   // Cyan
    'rgba(232, 176, 75, 0.8)',   // Amber
  ];

  const getCategoryColor = (slug) => {
    const idx = layerOrder.indexOf(slug);
    if (idx === -1) return 'rgba(150, 150, 150, 0.5)';
    return layerColors[idx % layerColors.length];
  };

  const sortedCats = Object.keys(catMap).sort((a, b) => {
    const aIdx = layerOrder.indexOf(a);
    const bIdx = layerOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => go({ type: 'onion' })}>
        <div className="brand-mark">◑</div>
        <div className="brand-text">
          <div className="brand-name">AI&nbsp;Wiki</div>
          <div className="brand-sub">a self-filing encyclopedia</div>
        </div>
      </div>

      <div className="search">
        <input value={query} onChange={e => setQuery(e.target.value)}
               placeholder="Search terms..." spellCheck={false} />
        {query && (
          <div className="search-results">
            {results.length === 0 && <div className="search-none">no matches</div>}
            {results.map(e => (
              <button key={e.slug} className="search-hit" onClick={() => { go({ type: 'term', slug: e.slug }); setQuery(''); }}>
                <span className="search-hit-term">{e.term}</span>
                <span className="search-hit-cat">{e.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="nav">
        <button className={'nav-top' + (view.type === 'onion' ? ' active' : '')} onClick={() => go({ type: 'onion' })}>
          <span className="nav-ico">O</span> Onion layers
        </button>
        <button className={'nav-top' + (view.type === 'overview' ? ' active' : '')} onClick={() => go({ type: 'overview' })}>
          <span className="nav-ico">O</span> Overview map
        </button>
        <div className="nav-section-label">Layers</div>
        <div className="nav-cats">
          {sortedCats.map(cat => (
            <div key={cat} className="nav-cat">
              <div className="nav-cat-header">
                <button className={'nav-cat-head' + (view.type === 'category' && view.name === cat ? ' active' : '')}
                        onClick={() => go({ type: 'category', name: cat })}>
                  <span className="nav-cat-dot" style={{ backgroundColor: getCategoryColor(cat) }} />
                  <span className="nav-cat-name">{catLabels[cat] || cat}</span>
                  <span className="nav-cat-count">{catMap[cat].length}</span>
                </button>
                <button className="nav-cat-toggle" onClick={() => toggleCategory(cat)} title="Toggle category">
                  <span className={'nav-cat-arrow' + (expandedCats[cat] ? ' expanded' : '')}>▶</span>
                </button>
              </div>
              {expandedCats[cat] && (
                <div className="nav-terms">
                  {catMap[cat].map(e => (
                    <button key={e.slug}
                            className={'nav-term' + (view.type === 'term' && view.slug === e.slug ? ' active' : '')}
                            onClick={() => go({ type: 'term', slug: e.slug })}>
                      {e.term}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {Object.keys(catMap).length === 0 && <div className="nav-empty">No entries filed yet.</div>}
        </div>
      </nav>

    </aside>
  );
}

// ---- entry views -------------------------------------------------------
function RelatedChips({ related, entryBySlug, onOpen }) {
  if (!related || !related.length) return null;
  return (
    <div className="related">
      <div className="field-label">Related</div>
      <div className="chips">
        {related.map((slug, i) => {
          const entry = entryBySlug[slug];
          if (entry) {
            return <button key={i} className="chip is-link" onClick={() => onOpen(slug)}>{entry.term}</button>;
          }
          return <button key={i} className="chip is-ghost" disabled title="Not filed yet. Add to queue.txt to research.">{slug}</button>;
        })}
      </div>
    </div>
  );
}

function Breadcrumb({ trail }) {
  return (
    <nav className="crumbs">
      {trail.map((c, i) => (
        <span key={i} className="crumb-seg">
          {c.onClick
            ? <button className="crumb" onClick={c.onClick}>{c.label}</button>
            : <span className="crumb is-current">{c.label}</span>}
          {i < trail.length - 1 && <span className="crumb-sep">/</span>}
        </span>
      ))}
    </nav>
  );
}

function TermView({ entry, entryBySlug, go }) {
  if (!entry) return null;
  return (
    <article className="term">
      <Breadcrumb trail={[
        { label: 'O Map', onClick: () => go({ type: 'overview' }) },
        { label: entry.category, onClick: () => go({ type: 'category', name: entry.category }) },
        { label: entry.term },
      ]} />
      <div className="term-head">
        <button className="cat-tag" onClick={() => go({ type: 'category', name: entry.category })}>{entry.category}</button>
        <h1 className="term-title">{entry.term}</h1>
      </div>
      <div className="tldr">
        <div className="field-label">TLDR</div>
        <p>{entry.tldr}</p>
      </div>
      {entry.significance && (
        <section className="sig">
          <div className="field-label">Why it matters</div>
          <p>{entry.significance}</p>
        </section>
      )}
      <RelatedChips related={entry.related} entryBySlug={entryBySlug}
                    onOpen={(slug) => go({ type: 'term', slug })} />
      {entry.references && entry.references.length > 0 && (
        <section className="references">
          <div className="field-label">References</div>
          <div className="refs-list">
            {entry.references.map((ref, i) => (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" className="ref-link">
                {ref.title}
                <span className="ref-icon">↗</span>
              </a>
            ))}
          </div>
        </section>
      )}
      <div className="term-foot">
        <span>Filed {fmtDate(entry.firstSeen)}</span>
        <span className="term-foot-src">researched via Claude - pushed via queue.txt</span>
      </div>
    </article>
  );
}

function CategoryView({ name, items, go }) {
  return (
    <div className="catview">
      <Breadcrumb trail={[
        { label: 'O Map', onClick: () => go({ type: 'overview' }) },
        { label: name },
      ]} />
      <div className="catview-head">
        <div className="field-label">Category</div>
        <h1>{name}</h1>
        <p className="catview-count">{items.length} term{items.length === 1 ? '' : 's'} filed here</p>
      </div>
      <div className="card-grid">
        {items.map(e => (
          <button key={e.slug} className="entry-card" onClick={() => go({ type: 'term', slug: e.slug })}>
            <h3>{e.term}</h3>
            <p>{e.tldr}</p>
            <span className="entry-card-go">Read -></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewView({ entries, catMap, go, processing, showHubLabels }) {
  const total = Object.keys(entries).length;
  const cats = Object.keys(catMap).length;
  return (
    <div className="overview">
      <div className="overview-head">
        <div>
          <h1>The map</h1>
          <p className="overview-sub">Every term the wiki has researched, drawn by the category it was filed under and the concepts it connects to. Drag nodes to explore - click a hub to enter a category - click a term to read it.</p>
        </div>
        <div className="overview-stats">
          <div className="stat"><span className="stat-num">{total}</span><span className="stat-lbl">terms</span></div>
          <div className="stat"><span className="stat-num">{cats}</span><span className="stat-lbl">categories</span></div>
        </div>
      </div>
      <div className={'graph-host' + (showHubLabels ? '' : ' hide-term-labels')}>
        <GraphView entries={entries}
                   onSelectCategory={(name) => go({ type: 'category', name })}
                   onSelectTerm={(slug) => go({ type: 'term', slug })} />
      </div>
    </div>
  );
}

// ---- root --------------------------------------------------------------
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const wiki = useWiki();
  const { entries, log, processing, pushTerms, syncQueue, resetAll, clearLog } = wiki;
  const [view, setView] = useState({ type: 'onion' });
  const [query, setQuery] = useState('');

  const go = useCallback((v) => { setView(v); window.scrollTo(0, 0); }, []);

  // Load entries on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      await syncQueue();
    })();
    return () => { alive = false; };
  }, [syncQueue]);

  // Derived structures
  const list = useMemo(() => Object.values(entries), [entries]);
  const catMap = useMemo(() => {
    const m = {};
    for (const e of list) {
      const catSlug = e.category;
      (m[catSlug] = m[catSlug] || []).push(e);
    }
    for (const k in m) m[k].sort((a, b) => a.term.localeCompare(b.term));
    return m;
  }, [list]);
  const entryBySlug = entries;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return list.filter(e => e.term.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.tldr || '').toLowerCase().includes(q)).slice(0, 8);
  }, [query, list]);

  const accent = t.accent;
  const rootStyle = {
    '--accent': accent,
    '--font-scale': (t.fontScale / 100),
  };

  let main;
  if (view.type === 'overview') {
    main = <OverviewView entries={entries} catMap={catMap} go={go} processing={processing} showHubLabels={t.showHubLabels} />;
  } else if (view.type === 'onion') {
    main = <OnionView entries={entries} onSelectTerm={(slug) => go({ type: 'term', slug })} />;
  } else if (view.type === 'category') {
    main = <CategoryView name={view.name} items={catMap[view.name] || []} go={go} />;
  } else if (view.type === 'term') {
    const entry = entries[view.slug];
    main = entry
      ? <TermView entry={entry} entryBySlug={entryBySlug} go={go} />
      : <div className="missing">That term is not filed. <button className="link-btn" onClick={() => go({ type: 'overview' })}>Back to the map</button></div>;
  }

  return (
    <div className="app" data-look={t.look} data-density={t.density} data-mono={t.monoTerms ? 'on' : 'off'} style={rootStyle}>
      <Sidebar catMap={catMap} view={view} go={go}
               query={query} setQuery={setQuery} results={results} />
      <main className="main">
        <div className="main-inner">{main}</div>
      </main>

      <TweaksPanel>
        <TweakSection label="Look" />
        <TweakRadio label="Theme" value={t.look} options={['aurora', 'signal', 'ember']}
                    onChange={(v) => setTweak('look', v)} />
        <TweakColor label="Accent" value={t.accent}
                    options={[ACCENTS.orange, ACCENTS.cyan, ACCENTS.amber, ACCENTS.emerald]}
                    onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={['compact', 'regular', 'comfy']}
                    onChange={(v) => setTweak('density', v)} />
        <TweakSlider label="Font size" value={t.fontScale} min={85} max={120} step={5} unit="%"
                     onChange={(v) => setTweak('fontScale', v)} />
        <TweakToggle label="Monospace term names" value={t.monoTerms}
                     onChange={(v) => setTweak('monoTerms', v)} />
        <TweakToggle label="Show all map labels" value={t.showHubLabels}
                     onChange={(v) => setTweak('showHubLabels', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
