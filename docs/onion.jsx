// onion.jsx
// Visualize the AI ecosystem as concentric onion layers based on entry relationships

function OnionView({ entries, onSelectTerm }) {
  const wrapRef = React.useRef(null);
  const [dims, setDims] = React.useState({ w: 900, h: 900 });
  const [hover, setHover] = React.useState(null);

  // Build onion layers based on relationship depth with more granularity
  const layers = React.useMemo(() => {
    if (!entries || Object.keys(entries).length === 0) return [];

    const list = Object.values(entries);

    // Count how many times each concept is referenced
    const relatedCount = {};
    const relatedBy = {};

    for (const entry of list) {
      if (!relatedBy[entry.slug]) relatedBy[entry.slug] = [];
      for (const relSlug of (entry.related || [])) {
        relatedCount[relSlug] = (relatedCount[relSlug] || 0) + 1;
        relatedBy[entry.slug].push(relSlug);
      }
    }

    // Layer assignment by category and importance hierarchy
    const layerAssignment = {};

    // Define category layer positions (semantic hierarchy)
    const categoryLayers = {
      'fundamentals': 0,           // Highest priority - core concepts
      'model-architectures': 1,    // Foundation models
      'inference-and-serving': 2,  // How to use them
      'tools-and-frameworks': 3,   // Tools built on top
      'security-and-safety': 4,    // Constraints and safety
    };

    // Within each category, sort by reference count for fine-grained layering
    const entriesByCategory = {};
    for (const entry of list) {
      const cat = entry.category;
      if (!entriesByCategory[cat]) entriesByCategory[cat] = [];
      entriesByCategory[cat].push(entry);
    }

    // Assign layers: category layer + fine-grained position within category
    for (const [cat, entries] of Object.entries(entriesByCategory)) {
      const baseLayer = categoryLayers[cat] || 2;

      // Sort by reference count within category
      const sorted = [...entries].sort((a, b) =>
        (relatedCount[b.slug] || 0) - (relatedCount[a.slug] || 0)
      );

      // Assign within category (split category into sublayers if many entries)
      const itemsPerSublayer = Math.ceil(sorted.length / 2);
      for (let i = 0; i < sorted.length; i++) {
        const sublayer = Math.floor(i / itemsPerSublayer);
        // Use fractional layers: e.g., category 0 uses 0.0, 0.5
        layerAssignment[sorted[i].slug] = baseLayer + (sublayer * 0.5);
      }
    }

    // Convert fractional layers to integers (0-5 range)
    const finalAssignment = {};
    const layerValues = Object.values(layerAssignment).sort((a, b) => a - b);
    const layerMap = {};
    let nextIntLayer = 0;
    for (const val of layerValues) {
      if (!layerMap[val]) {
        layerMap[val] = Math.min(nextIntLayer++, 5);
      }
    }
    for (const [slug, val] of Object.entries(layerAssignment)) {
      finalAssignment[slug] = layerMap[val];
    }

    // Group entries by final assigned layer
    const result = {};
    for (const entry of list) {
      const layer = finalAssignment[entry.slug] || 0;
      if (!result[layer]) result[layer] = [];
      result[layer].push({ ...entry, layer });
    }

    return result;
  }, [entries]);

  // Resize observer
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        setDims({ w: el.clientWidth, h: el.clientHeight });
      }
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // Initial measurement with delays to catch layout settling
    requestAnimationFrame(measure);
    setTimeout(measure, 50);
    setTimeout(measure, 150);
    setTimeout(measure, 400);

    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const cx = dims.w / 2, cy = dims.h / 2;
  const layerCount = Object.keys(layers).length;
  const maxRadius = Math.min(cx, cy) - 30;
  const minRadius = 20;

  if (!layerCount) {
    return (
      <div className="onion-empty">
        <div className="onion-empty-glyph">O</div>
        <p>The onion fills in as terms are filed.</p>
      </div>
    );
  }

  const layerColors = [
    'rgba(167, 139, 255, 0.08)',  // Violet
    'rgba(86, 200, 232, 0.08)',   // Cyan
    'rgba(232, 176, 75, 0.08)',   // Amber
  ];

  const layerFgColors = [
    'rgba(167, 139, 255, 0.6)',   // Violet foreground
    'rgba(86, 200, 232, 0.6)',    // Cyan foreground
    'rgba(232, 176, 75, 0.6)',    // Amber foreground
  ];

  const layerNames = [
    'Core Concepts',
    'Foundational Core',
    'Foundational Concepts',
    'Supporting Layer',
    'Related Concepts',
    'Peripheral Ideas',
  ];

  return (
    <div className="onion-wrap" ref={wrapRef}>
      <svg width="100%" height="100%" viewBox={`0 0 ${dims.w} ${dims.h}`} className="onion-svg" preserveAspectRatio="xMidYMid meet">
        {/* Draw layer background rings from outermost to innermost */}
        {Object.keys(layers).sort((a, b) => parseInt(b) - parseInt(a)).map((layerKey) => {
          const layer = parseInt(layerKey);
          const outerRadius = minRadius + (layer / layerCount) * (maxRadius - minRadius);
          const innerRadius = layer === 0 ? 0 : minRadius + ((layer - 1) / layerCount) * (maxRadius - minRadius);
          const color = layerColors[layer % layerColors.length];

          return (
            <g key={`layer-bg-${layer}`} className="onion-layer-bg">
              {/* Layer background ring */}
              <circle
                cx={cx}
                cy={cy}
                r={outerRadius}
                fill={color}
              />
              {/* Inner circle to create ring effect */}
              {layer > 0 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={innerRadius}
                  fill="var(--bg)"
                />
              )}
            </g>
          );
        })}

        {/* Draw layer boundaries and curved names */}
        {Object.keys(layers).sort((a, b) => parseInt(a) - parseInt(b)).map((layerKey) => {
          const layer = parseInt(layerKey);
          const outerRadius = minRadius + (layer / layerCount) * (maxRadius - minRadius);
          const innerRadius = layer === 0 ? 0 : minRadius + ((layer - 1) / layerCount) * (maxRadius - minRadius);
          const midRadius = (innerRadius + outerRadius) / 2;
          const layerName = layerNames[layer] || layerNames[layerNames.length - 1];

          return (
            <g key={`layer-boundary-${layer}`} className="onion-boundary">
              <circle
                cx={cx}
                cy={cy}
                r={outerRadius}
                className="onion-ring"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                opacity="0.4"
              />

              {/* Curved layer name inside ring at top */}
              <defs>
                <path
                  id={`layer-path-${layer}`}
                  d={`M ${cx - midRadius} ${cy} A ${midRadius} ${midRadius} 0 0 1 ${cx + midRadius} ${cy}`}
                  fill="none"
                />
              </defs>
              <text
                className="onion-layer-label-curved"
                fontSize="11"
                fontWeight="600"
                fill="var(--fg-faint)"
                opacity="0.6"
              >
                <textPath href={`#layer-path-${layer}`} startOffset="50%" textAnchor="middle">
                  {layerName}
                </textPath>
              </text>
            </g>
          );
        })}

        {/* Render layers with entries */}
        {Object.keys(layers).sort((a, b) => parseInt(a) - parseInt(b)).map((layerKey) => {
          const layer = parseInt(layerKey);
          const outerRadius = minRadius + (layer / layerCount) * (maxRadius - minRadius);
          const innerRadius = layer === 0 ? 0 : minRadius + ((layer - 1) / layerCount) * (maxRadius - minRadius);
          const midRadius = (innerRadius + outerRadius) / 2;
          const entries = layers[layerKey];
          const entryCount = entries.length;
          const layerName = layerNames[layer] || layerNames[layerNames.length - 1];

          return (
            <g key={`layer-${layer}`} className="onion-layer">
              {/* Entries on this layer */}
              {entries.map((entry, idx) => {
                const seed = parseInt(entry.slug.split('-').join(''), 36) % 10000;
                const seededRandom = Math.sin(seed + idx) * 10000 % 1;
                const angle = seededRandom * Math.PI * 2;
                const radiusVariance = (seededRandom - 0.5) * (outerRadius - innerRadius) * 0.4;
                const r = midRadius + radiusVariance;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                const isHovered = hover === entry.slug;
                const nodeRadius = isHovered ? 12 : 8;
                const layerFgColor = layerFgColors[layer % layerFgColors.length];

                return (
                  <g
                    key={entry.slug}
                    className={`onion-entry ${isHovered ? 'is-hover' : ''}`}
                    onMouseEnter={() => setHover(entry.slug)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onSelectTerm(entry.slug)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Connection line to center */}
                    {layer > 0 && (
                      <line
                        x1={cx}
                        y1={cy}
                        x2={x}
                        y2={y}
                        stroke="var(--accent)"
                        strokeWidth={isHovered ? 1.5 : 0.5}
                        opacity={isHovered ? 0.6 : 0.15}
                      />
                    )}

                    {/* Entry node background glow on hover */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r={nodeRadius + 4}
                        fill="var(--accent)"
                        opacity="0.15"
                      />
                    )}

                    {/* Entry node */}
                    <circle
                      cx={x}
                      cy={y}
                      r={nodeRadius}
                      fill={isHovered ? 'var(--accent)' : layerFgColor}
                      stroke="var(--bg)"
                      strokeWidth="2"
                      className="onion-node"
                    />

                    {/* Entry name label */}
                    <text
                      x={x}
                      y={y + nodeRadius + 16}
                      textAnchor="middle"
                      className="onion-entry-label"
                      fontSize="10"
                      fontWeight="500"
                      fill={isHovered ? 'var(--accent)' : layerFgColor}
                      pointerEvents="none"
                    >
                      {entry.term}
                    </text>

                    {/* Entry tooltip (show on hover) */}
                    {isHovered && (
                      <g>
                        <rect
                          x={x - 50}
                          y={y - 25}
                          width="100"
                          height="50"
                          rx="4"
                          fill="var(--panel)"
                          stroke="var(--border)"
                          strokeWidth="0.5"
                        />
                        <text
                          x={x}
                          y={y - 8}
                          textAnchor="middle"
                          className="onion-entry-name"
                          fontSize="10"
                          fontWeight="600"
                          fill="var(--fg)"
                        >
                          {entry.term}
                        </text>
                        <text
                          x={x}
                          y={y + 10}
                          textAnchor="middle"
                          className="onion-entry-cat"
                          fontSize="8"
                          fill="var(--accent)"
                        >
                          {entry.category}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

      </svg>
    </div>
  );
}

Object.assign(window, { OnionView });
