// onion.jsx
// Visualize the AI ecosystem as concentric onion layers based on entry relationships

function OnionView({ entries, onSelectTerm }) {
  const wrapRef = React.useRef(null);
  const [dims, setDims] = React.useState({ w: 900, h: 900 });
  const [hover, setHover] = React.useState(null);

  // Build onion layers based on relationship depth
  const layers = React.useMemo(() => {
    if (!entries || Object.keys(entries).length === 0) return [];

    const list = Object.values(entries);

    // Find core concepts (mentioned as related in many entries, or foundational)
    const relatedCount = {};
    const relatedBy = {};

    for (const entry of list) {
      if (!relatedBy[entry.slug]) relatedBy[entry.slug] = [];
      for (const relSlug of (entry.related || [])) {
        relatedCount[relSlug] = (relatedCount[relSlug] || 0) + 1;
        relatedBy[entry.slug].push(relSlug);
      }
    }

    // Sort entries by how many times they're referenced (core at center)
    const entriesByImportance = [...list].sort((a, b) =>
      (relatedCount[b.slug] || 0) - (relatedCount[a.slug] || 0)
    );

    // Assign layers based on reference depth and relationships with more granularity
    const layerAssignment = {};
    const processed = new Set();

    // Layer 0: Most referenced entries (the core) - smaller core
    const coreThreshold = Math.max(1, Math.ceil(list.length * 0.08));
    for (let i = 0; i < Math.min(coreThreshold, entriesByImportance.length); i++) {
      layerAssignment[entriesByImportance[i].slug] = 0;
      processed.add(entriesByImportance[i].slug);
    }

    // Assign remaining entries to layers based on connection distance and reference frequency
    const buildLayers = () => {
      let currentLayer = 1;
      let lastProcessedCount = processed.size;

      while (processed.size < list.length && currentLayer < 6) {
        const entriesToAdd = [];

        for (const entry of list) {
          if (processed.has(entry.slug)) continue;

          // Check if connected to previous layer
          const connectedToLayer = (entry.related || []).some(slug =>
            layerAssignment[slug] === currentLayer - 1
          ) || (Object.keys(relatedBy).some(slug =>
            relatedBy[slug].includes(entry.slug) &&
            layerAssignment[slug] === currentLayer - 1
          ));

          // Also consider reference count for more granular layering
          const refCount = relatedCount[entry.slug] || 0;
          const isHighlyReferenced = refCount >= (Math.max(...Object.values(relatedCount || {})) * 0.3);

          if (connectedToLayer) {
            // Highly referenced items stay in earlier layers
            if (isHighlyReferenced && currentLayer > 1 && currentLayer < 4) {
              entriesToAdd.push({ entry, priority: refCount });
            } else {
              layerAssignment[entry.slug] = currentLayer;
              processed.add(entry.slug);
            }
          }
        }

        // Add high-priority entries to current layer
        entriesToAdd.sort((a, b) => b.priority - a.priority);
        for (const { entry } of entriesToAdd) {
          if (!processed.has(entry.slug)) {
            layerAssignment[entry.slug] = currentLayer;
            processed.add(entry.slug);
          }
        }

        if (processed.size === lastProcessedCount) {
          // No new entries connected, assign remaining to next layer
          for (const entry of list) {
            if (!processed.has(entry.slug)) {
              layerAssignment[entry.slug] = currentLayer;
              processed.add(entry.slug);
            }
          }
          break;
        }

        lastProcessedCount = processed.size;
        currentLayer++;
      }
    };

    buildLayers();

    // Group entries by layer
    const result = {};
    for (const entry of list) {
      const layer = layerAssignment[entry.slug] || 0;
      if (!result[layer]) result[layer] = [];
      result[layer].push({ ...entry, layer });
    }

    return result;
  }, [entries]);

  // Resize observer
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
    'rgba(167, 139, 255, 0.08)',  // Core - violet
    'rgba(86, 200, 232, 0.06)',   // Layer 1 - cyan
    'rgba(232, 176, 75, 0.06)',   // Layer 2 - amber
    'rgba(95, 208, 163, 0.06)',   // Layer 3 - emerald
    'rgba(167, 139, 255, 0.04)',  // Layer 4+ - faded violet
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
      <svg width={dims.w} height={dims.h} className="onion-svg">
        {/* Draw layer background rings from outermost to innermost */}
        {Object.keys(layers).sort((a, b) => parseInt(b) - parseInt(a)).map((layerKey) => {
          const layer = parseInt(layerKey);
          const outerRadius = minRadius + (layer / layerCount) * (maxRadius - minRadius);
          const innerRadius = layer === 0 ? 0 : minRadius + ((layer - 1) / layerCount) * (maxRadius - minRadius);
          const color = layerColors[layer] || layerColors[layerColors.length - 1];

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

        {/* Draw layer boundaries */}
        {Object.keys(layers).sort((a, b) => parseInt(a) - parseInt(b)).map((layerKey) => {
          const layer = parseInt(layerKey);
          const radius = minRadius + (layer / layerCount) * (maxRadius - minRadius);

          return (
            <g key={`layer-boundary-${layer}`} className="onion-boundary">
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                className="onion-ring"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                opacity="0.4"
              />
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
              {/* Layer name label */}
              <text
                x={layer === 0 ? cx : cx + Math.cos(Math.PI / 4) * midRadius - 30}
                y={layer === 0 ? cy + 5 : cy + Math.sin(Math.PI / 4) * midRadius - 10}
                textAnchor={layer === 0 ? 'middle' : 'start'}
                className="onion-layer-label"
                fontSize={layer === 0 ? '14' : '11'}
                fill={layer === 0 ? 'var(--accent)' : 'var(--fg-faint)'}
                fontWeight={layer === 0 ? '700' : '600'}
                opacity={layer === 0 ? 1 : 0.7}
              >
                {layerName}
              </text>

              {/* Entries on this layer */}
              {entries.map((entry, idx) => {
                const angle = (idx / entryCount) * Math.PI * 2;
                const x = cx + Math.cos(angle) * midRadius;
                const y = cy + Math.sin(angle) * midRadius;
                const isHovered = hover === entry.slug;
                const nodeRadius = isHovered ? 12 : 8;

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
                      fill={isHovered ? 'var(--accent)' : 'var(--fg-dim)'}
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
                      fill={isHovered ? 'var(--accent)' : 'var(--fg-dim)'}
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

        {/* Legend */}
        <g className="onion-legend" transform={`translate(${dims.w - 150}, 20)`}>
          <text x="0" y="0" fontSize="11" fontWeight="600" fill="var(--fg-dim)">
            Onion Layers
          </text>
          <text x="0" y="16" fontSize="9" fill="var(--fg-faint)">
            Center: Core concepts
          </text>
          <text x="0" y="28" fontSize="9" fill="var(--fg-faint)">
            Outward: Related terms
          </text>
        </g>
      </svg>
    </div>
  );
}

Object.assign(window, { OnionView });
