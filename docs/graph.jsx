// graph.jsx
// Force-directed overview graph of categories (hub nodes) and the terms filed
// under them. Related-term links draw faint connections across the web.
// Click a category hub to enter it; click a term to open its entry.

function GraphView({ entries, onSelectCategory, onSelectTerm }) {
  const wrapRef = React.useRef(null);
  const [dims, setDims] = React.useState({ w: 900, h: 600 });
  const [hover, setHover] = React.useState(null);
  const simRef = React.useRef({ nodes: [], links: [] });
  const [, force] = React.useReducer(x => x + 1, 0);
  const dragRef = React.useRef(null);
  const rafRef = React.useRef(null);

  const list = React.useMemo(() => Object.values(entries), [entries]);

  // Build graph model whenever entries change.
  React.useEffect(() => {
    const cats = Array.from(new Set(list.map(e => e.category)));
    const prev = {};
    for (const n of simRef.current.nodes) prev[n.id] = n;

    const cx = dims.w / 2, cy = dims.h / 2;
    const nodes = [];
    cats.forEach((c, i) => {
      const a = (i / Math.max(cats.length, 1)) * Math.PI * 2;
      const id = 'cat:' + c;
      nodes.push(prev[id] || {
        id, type: 'cat', label: c,
        x: cx + Math.cos(a) * 140, y: cy + Math.sin(a) * 140,
        vx: 0, vy: 0,
      });
    });
    list.forEach((e, i) => {
      const id = 'term:' + e.slug;
      const a = (i / Math.max(list.length, 1)) * Math.PI * 2;
      nodes.push(prev[id] || {
        id, type: 'term', label: e.term, slug: e.slug, category: e.category,
        x: cx + Math.cos(a) * 240 + (Math.random() - 0.5) * 30,
        y: cy + Math.sin(a) * 240 + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0,
      });
    });

    const byId = {}; nodes.forEach(n => byId[n.id] = n);
    const links = [];
    list.forEach(e => {
      const t = byId['term:' + e.slug];
      const c = byId['cat:' + e.category];
      if (t && c) links.push({ s: t, t: c, kind: 'member' });
    });
    // Related links (term <-> term) — match related names to existing entries.
    const bySlug = {}; list.forEach(e => { bySlug[e.slug] = e; });
    const nameToSlug = {}; list.forEach(e => { nameToSlug[e.term.toLowerCase()] = e.slug; });
    const seen = new Set();
    list.forEach(e => {
      (e.related || []).forEach(r => {
        const rs = nameToSlug[String(r).toLowerCase()] || (bySlug[window.slugify(r)] ? window.slugify(r) : null);
        if (!rs || rs === e.slug) return;
        const key = [e.slug, rs].sort().join('|');
        if (seen.has(key)) return;
        seen.add(key);
        const a = byId['term:' + e.slug], b = byId['term:' + rs];
        if (a && b) links.push({ s: a, t: b, kind: 'related' });
      });
    });

    simRef.current = { nodes, links, alpha: 1 };
  }, [list, dims.w, dims.h]);

  // Resize observer.
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Simulation loop.
  React.useEffect(() => {
    const tick = () => {
      const sim = simRef.current;
      const { nodes, links } = sim;
      const cx = dims.w / 2, cy = dims.h / 2;
      const n = nodes.length;
      if (n) {
        // Repulsion
        for (let i = 0; i < n; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < n; j++) {
            const b = nodes[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            let d2 = dx * dx + dy * dy || 0.01;
            let d = Math.sqrt(d2);
            const minD = 4;
            if (d < minD) d = minD;
            const rep = ((a.type === 'cat' || b.type === 'cat') ? 9000 : 3200) / (d * d);
            const fx = (dx / d) * rep, fy = (dy / d) * rep;
            a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
          }
        }
        // Springs
        for (const l of links) {
          const len = l.kind === 'member' ? 90 : 150;
          const k = l.kind === 'member' ? 0.04 : 0.012;
          let dx = l.t.x - l.s.x, dy = l.t.y - l.s.y;
          let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const f = (d - len) * k;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          l.s.vx += fx; l.s.vy += fy; l.t.vx -= fx; l.t.vy -= fy;
        }
        // Gravity + integrate
        for (const node of nodes) {
          if (dragRef.current && dragRef.current.id === node.id) { node.vx = 0; node.vy = 0; continue; }
          const g = node.type === 'cat' ? 0.012 : 0.006;
          node.vx += (cx - node.x) * g;
          node.vy += (cy - node.y) * g;
          node.vx *= 0.82; node.vy *= 0.82;
          node.x += node.vx; node.y += node.vy;
          const pad = 28;
          node.x = Math.max(pad, Math.min(dims.w - pad, node.x));
          node.y = Math.max(pad, Math.min(dims.h - pad, node.y));
        }
      }
      force();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dims.w, dims.h]);

  // Drag handling (pointer in svg coords).
  const svgPoint = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (node) => (e) => {
    e.stopPropagation();
    dragRef.current = { id: node.id, moved: false };
  };
  React.useEffect(() => {
    const move = (e) => {
      if (!dragRef.current) return;
      const p = svgPoint(e);
      const node = simRef.current.nodes.find(n => n.id === dragRef.current.id);
      if (node) { node.x = p.x; node.y = p.y; node.vx = 0; node.vy = 0; dragRef.current.moved = true; }
    };
    const up = (e) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (d && !d.moved) {
        const node = simRef.current.nodes.find(n => n.id === d.id);
        if (node) {
          if (node.type === 'cat') onSelectCategory(node.label);
          else onSelectTerm(node.slug);
        }
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [onSelectCategory, onSelectTerm]);

  const { nodes, links } = simRef.current;
  const hoverNeighbors = React.useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    for (const l of links) {
      if (l.s.id === hover) set.add(l.t.id);
      if (l.t.id === hover) set.add(l.s.id);
    }
    return set;
  }, [hover, links]);

  if (!list.length) {
    return (
      <div className="graph-empty">
        <div className="graph-empty-glyph">◍</div>
        <p>The map fills in as terms are filed.<br/>Push something to <code>queue.txt</code> to begin.</p>
      </div>
    );
  }

  return (
    <div className="graph-wrap" ref={wrapRef}>
      <svg width={dims.w} height={dims.h} className="graph-svg">
        <g>
          {links.map((l, i) => {
            const dim = hoverNeighbors && !(hoverNeighbors.has(l.s.id) && hoverNeighbors.has(l.t.id));
            return (
              <line key={i} x1={l.s.x} y1={l.s.y} x2={l.t.x} y2={l.t.y}
                className={'graph-link ' + l.kind + (dim ? ' is-dim' : '')} />
            );
          })}
        </g>
        <g>
          {nodes.map((node) => {
            const isCat = node.type === 'cat';
            const r = isCat ? 13 : 6;
            const dim = hoverNeighbors && !hoverNeighbors.has(node.id);
            return (
              <g key={node.id}
                 className={'graph-node ' + node.type + (dim ? ' is-dim' : '') + (hover === node.id ? ' is-hover' : '')}
                 transform={`translate(${node.x},${node.y})`}
                 onPointerDown={onDown(node)}
                 onPointerEnter={() => setHover(node.id)}
                 onPointerLeave={() => setHover(h => h === node.id ? null : h)}>
                <circle r={r} className="graph-dot" />
                <text className="graph-label" x={0} y={isCat ? r + 16 : r + 12}>
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="graph-legend">
        <span><i className="dot-cat"></i> Category</span>
        <span><i className="dot-term"></i> Term</span>
        <span><i className="dash-rel"></i> Related</span>
      </div>
    </div>
  );
}

Object.assign(window, { GraphView });
