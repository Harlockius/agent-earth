'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { travels, agents } from './data/waypoints';

const API_KEY = process.env.NEXT_PUBLIC_MAPS_API_KEY;

// ─── Hook: detect mobile ───
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── Hook: touch swipe ───
function useSwipe(onLeft, onRight) {
  const touchRef = useRef({ startX: 0, startY: 0 });
  const handlers = {
    onTouchStart: (e) => {
      touchRef.current.startX = e.touches[0].clientX;
      touchRef.current.startY = e.touches[0].clientY;
    },
    onTouchEnd: (e) => {
      const dx = e.changedTouches[0].clientX - touchRef.current.startX;
      const dy = e.changedTouches[0].clientY - touchRef.current.startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onLeft();
        else onRight();
      }
    },
  };
  return handlers;
}

// ─── Street View URL ───
function streetViewUrl(wp, isMobile) {
  const size = isMobile ? '400x250' : '600x400';
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${wp.lat},${wp.lng}&heading=${wp.heading}&pitch=${wp.pitch}&fov=90&key=${API_KEY}`;
}

// ─── Map Controller + Route Polyline ───
function MapController({ waypoints, activeIndex }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const wp = waypoints[activeIndex];
    map.panTo({ lat: wp.lat, lng: wp.lng });
    map.setZoom(activeIndex >= 10 ? 16 : 17);
  }, [map, activeIndex, waypoints]);

  useEffect(() => {
    if (!map) return;
    const path = waypoints.map(w => ({ lat: w.lat, lng: w.lng }));
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#c9a961',
      strokeOpacity: 0.4,
      strokeWeight: 2,
    });
    polyline.setMap(map);

    const walkedPath = waypoints.slice(0, activeIndex + 1).map(w => ({ lat: w.lat, lng: w.lng }));
    const walkedPolyline = new google.maps.Polyline({
      path: walkedPath,
      geodesic: true,
      strokeColor: '#c9a961',
      strokeOpacity: 0.9,
      strokeWeight: 3,
    });
    walkedPolyline.setMap(map);

    return () => {
      polyline.setMap(null);
      walkedPolyline.setMap(null);
    };
  }, [map, activeIndex, waypoints]);

  return null;
}

// ─── Progress Dots ───
function ProgressDots({ total, activeIndex, onSelect, isMobile }) {
  return (
    <div style={{
      display: 'flex', gap: isMobile ? '4px' : '6px', alignItems: 'center',
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      justifyContent: 'center',
      maxWidth: isMobile ? '200px' : 'none',
    }}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          style={{
            width: i === activeIndex ? (isMobile ? '18px' : '24px') : (isMobile ? '6px' : '8px'),
            height: isMobile ? '6px' : '8px',
            borderRadius: '4px',
            background: i === activeIndex
              ? 'linear-gradient(90deg, #c9a961, #e8917a)'
              : i < activeIndex ? '#555' : '#333',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
            minWidth: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Perspective Content Renderers ───
function StructuredFields({ fields, agentColor }) {
  const fieldConfig = {
    visual: { icon: '👁', label: 'Visual', color: '#4a6b8a' },
    known: { icon: '🧠', label: 'Known', color: '#4a7c59' },
    unknown: { icon: '🕳', label: 'Unknown', color: '#8b4553' },
    dataPoint: { icon: '📊', label: 'Data', isHighlight: true },
    comment: { icon: null, label: null, isMain: true },
    see: { icon: '👁', label: 'See', color: '#6a6aaa' },
    know: { icon: '📖', label: 'Know', color: '#6a9a6a' },
    never: { icon: '🚫', label: 'Never', color: '#aa6a6a' },
  };

  const skip = new Set(['waypointId', 'subtitle']);
  const entries = Object.entries(fields).filter(([k, v]) => !skip.has(k) && v != null);

  const mainField = entries.find(([k]) => fieldConfig[k]?.isMain);
  const highlightField = entries.find(([k]) => fieldConfig[k]?.isHighlight);
  const structuredFields = entries.filter(([k]) => {
    const cfg = fieldConfig[k];
    return cfg && !cfg.isMain && !cfg.isHighlight;
  });

  return (
    <div>
      {mainField && (
        <p style={{
          fontSize: '0.85rem',
          lineHeight: '1.7',
          color: '#ccc',
          marginBottom: '10px',
        }}>
          {mainField[1]}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {structuredFields.map(([key, value]) => {
          const cfg = fieldConfig[key] || { icon: '•', color: agentColor || '#666' };
          return (
            <div key={key} style={{
              padding: '8px 10px',
              background: `${cfg.color}15`,
              borderLeft: `2px solid ${cfg.color}`,
              borderRadius: '0 6px 6px 0',
              fontSize: '0.75rem',
              lineHeight: '1.5',
            }}>
              {cfg.icon && <span style={{ color: cfg.color, fontWeight: 600 }}>{cfg.icon}</span>}
              {' '}
              <span style={{ color: '#999' }}>{value}</span>
            </div>
          );
        })}
      </div>

      {highlightField && (
        <div style={{
          marginTop: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          color: agentColor || '#c9a961',
          padding: '6px 10px',
          background: `${agentColor || '#c9a961'}10`,
          borderRadius: '6px',
        }}>
          📊 {highlightField[1]}
        </div>
      )}

      {entries.length === 0 || (entries.length === 1 && entries[0][0] === 'subtitle') ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#444',
          fontSize: '0.8rem',
        }}>
          This agent hasn&apos;t shared thoughts on this place yet.
        </div>
      ) : null}
    </div>
  );
}

// ─── Floating Card ───
function FloatingCard({ wp, index, total, activeAgentId, agentOrder, onAgentChange, onPrev, onNext, onDotSelect, isMobile }) {
  const availableAgents = wp.agentIds.filter(id => {
    const p = wp.perspectives[id];
    return p && Object.keys(p).some(k => k !== 'waypointId' && k !== 'subtitle' && p[k] != null);
  });

  const effectiveAgentId = availableAgents.includes(activeAgentId)
    ? activeAgentId
    : availableAgents[0] || agentOrder[0];

  const agent = agents[effectiveAgentId];
  const perspective = wp.perspectives[effectiveAgentId];
  const accentColor = agent?.color || '#888';

  return (
    <div style={{
      background: 'rgba(15, 15, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: isMobile ? '16px 16px 0 0' : '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      borderBottom: isMobile ? 'none' : undefined,
      padding: '0',
      maxWidth: isMobile ? '100%' : '420px',
      width: '100%',
      overflow: 'hidden',
      boxShadow: isMobile
        ? '0 -4px 32px rgba(0,0,0,0.6)'
        : '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {/* Drag handle for mobile */}
      {isMobile && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '8px 0 4px',
        }}>
          <div style={{
            width: '36px', height: '4px',
            background: '#444', borderRadius: '2px',
          }} />
        </div>
      )}

      {/* Street View Preview */}
      {wp.hasStreetView && API_KEY && (
        <div style={{
          position: 'relative',
          height: isMobile ? '140px' : '180px',
          overflow: 'hidden',
        }}>
          <img
            src={streetViewUrl(wp, isMobile)}
            alt={wp.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0, height: '60px',
            background: 'linear-gradient(transparent, rgba(15,15,15,0.95))',
          }} />
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem', color: '#999',
            background: 'rgba(0,0,0,0.6)',
            padding: '3px 8px', borderRadius: '6px',
            backdropFilter: 'blur(8px)',
          }}>
            {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </div>
        </div>
      )}

      {/* No coverage */}
      {!wp.hasStreetView && (
        <div style={{
          height: isMobile ? '80px' : '120px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: '1.5rem', opacity: 0.2, marginBottom: '6px' }}>🌑</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem', color: '#444',
          }}>
            No Street View coverage
          </div>
        </div>
      )}

      {/* Card Body */}
      <div style={{ padding: isMobile ? '12px 16px' : '16px 20px' }}>
        {/* Coords */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem', color: '#666', marginBottom: '4px',
        }}>
          {wp.lat.toFixed(4)}°N, {Math.abs(wp.lng).toFixed(4)}°{wp.lng >= 0 ? 'E' : 'W'}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: isMobile ? '1rem' : '1.1rem',
          fontWeight: 600,
          color: '#e8e6e3', marginBottom: '4px',
        }}>
          {wp.title}
        </h3>

        {/* Subtitle */}
        {perspective?.subtitle && (
          <p style={{
            fontSize: '0.78rem', color: accentColor,
            fontStyle: 'italic', marginBottom: '10px',
          }}>
            {perspective.subtitle}
          </p>
        )}

        {/* Agent Toggle */}
        {agentOrder.length > 1 && (
          <div style={{
            display: 'flex', gap: '0', marginBottom: '10px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px', padding: '3px',
          }}>
            {agentOrder.map((agentId) => {
              const a = agents[agentId];
              if (!a) return null;
              const isActive = agentId === effectiveAgentId;
              const hasContent = availableAgents.includes(agentId);
              return (
                <button
                  key={agentId}
                  onClick={() => hasContent ? onAgentChange(agentId) : null}
                  style={{
                    flex: 1,
                    padding: isMobile ? '8px 0' : '6px 0',
                    background: isActive ? `${a.color}25` : 'transparent',
                    border: isActive ? `1px solid ${a.color}50` : '1px solid transparent',
                    borderRadius: '6px',
                    color: isActive ? a.color : hasContent ? '#666' : '#333',
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    fontWeight: isActive ? 600 : 400,
                    cursor: hasContent ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    fontFamily: "'JetBrains Mono', monospace",
                    opacity: hasContent ? 1 : 0.4,
                  }}
                >
                  {a.emoji} {isMobile && !isActive ? '' : a.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Single agent badge */}
        {agentOrder.length === 1 && (
          <div style={{
            marginBottom: '10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: accentColor,
            padding: '4px 10px',
            borderRadius: '6px',
            border: `1px solid ${accentColor}40`,
            background: `${accentColor}10`,
            display: 'inline-block',
          }}>
            {agent?.emoji} {agent?.name}
          </div>
        )}

        {/* Content */}
        {perspective ? (
          <StructuredFields fields={perspective} agentColor={accentColor} />
        ) : (
          <div style={{
            padding: '20px', textAlign: 'center',
            color: '#444', fontSize: '0.8rem',
          }}>
            This agent hasn&apos;t visited this place yet.
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '10px 16px 16px' : '12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <button
          onClick={onPrev}
          disabled={index === 0}
          style={{
            background: 'none', border: 'none',
            color: index === 0 ? '#333' : '#888',
            fontSize: isMobile ? '1.4rem' : '1.2rem',
            cursor: index === 0 ? 'default' : 'pointer',
            padding: '8px 12px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ←
        </button>
        <ProgressDots total={total} activeIndex={index} onSelect={onDotSelect} isMobile={isMobile} />
        <button
          onClick={onNext}
          disabled={index === total - 1}
          style={{
            background: 'none', border: 'none',
            color: index === total - 1 ? '#333' : '#888',
            fontSize: isMobile ? '1.4rem' : '1.2rem',
            cursor: index === total - 1 ? 'default' : 'pointer',
            padding: '8px 12px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

// ─── Travel Card (for selection screen) ───
function TravelCard({ travel, onClick, isMobile }) {
  const meta = travel.meta;
  const agentCount = travel.agentOrder.length;
  const wpCount = travel.waypoints.length;

  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: isMobile ? '20px' : '24px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        width: '100%',
        maxWidth: '400px',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(201,169,97,0.4)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
      }}
    >
      {/* Location tag */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.6rem', color: '#666',
        letterSpacing: '0.15em', marginBottom: '8px',
      }}>
        {meta.location.country.toUpperCase()} · {meta.location.district.toUpperCase()}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: isMobile ? '1.1rem' : '1.3rem',
        fontWeight: 700, color: '#e8e6e3',
        marginBottom: '4px', lineHeight: 1.3,
      }}>
        {meta.title}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: '0.8rem', color: '#888',
        lineHeight: 1.6, marginBottom: '12px',
      }}>
        {meta.description}
      </p>

      {/* Agent badges */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '12px',
        flexWrap: 'wrap',
      }}>
        {travel.agentOrder.map(id => {
          const a = agents[id];
          if (!a) return null;
          return (
            <span key={id} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.6rem',
              color: a.color,
              padding: '2px 8px',
              borderRadius: '4px',
              border: `1px solid ${a.color}40`,
              background: `${a.color}10`,
            }}>
              {a.emoji} {a.name}
            </span>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.6rem', color: '#555',
      }}>
        {wpCount} waypoints · {meta.stats.distance} · {meta.stats.timeSpan}
      </div>
    </button>
  );
}

// ─── Main Page ───
export default function Home() {
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const isMobile = useIsMobile();

  const currentTravel = selectedTravel !== null ? travels[selectedTravel] : null;
  const waypoints = currentTravel?.waypoints || [];
  const agentOrder = currentTravel?.agentOrder || [];
  const travel = currentTravel?.meta;

  const goNext = useCallback(() => {
    setActiveIndex(prev => Math.min(prev + 1, waypoints.length - 1));
  }, [waypoints.length]);

  const goPrev = useCallback(() => {
    setActiveIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const swipeHandlers = useSwipe(goNext, goPrev);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (activeIndex === -1) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') {
        if (activeIndex >= 0) setActiveIndex(-1);
        else setSelectedTravel(null);
      }
      if (e.key === 't' || e.key === 'T') {
        setActiveAgentId(prev => {
          const idx = agentOrder.indexOf(prev);
          return agentOrder[(idx + 1) % agentOrder.length];
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIndex, goNext, goPrev, agentOrder]);

  // ─── Travel Selection Screen ───
  if (selectedTravel === null) {
    return (
      <main style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center',
        background: '#0a0a0a', color: '#e8e6e3',
        padding: isMobile ? '1.5rem' : '2rem',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem', color: '#555',
          letterSpacing: '0.3em', marginBottom: '1.5rem',
        }}>
          AGENT EARTH
        </div>

        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 3rem)',
          fontWeight: 700, lineHeight: 1.2, marginBottom: '0.5rem',
        }}>
          AIs Walk the World
        </h1>

        <p style={{
          fontSize: '0.9rem', color: '#888',
          maxWidth: '450px', lineHeight: 1.7, marginBottom: '2.5rem',
        }}>
          Same place, different perspectives. Choose a walk.
        </p>

        {/* Travel cards */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: '16px', width: '100%',
          maxWidth: '420px', alignItems: 'center',
        }}>
          {travels.map((t, i) => (
            <TravelCard
              key={t.meta.id}
              travel={t}
              isMobile={isMobile}
              onClick={() => {
                setSelectedTravel(i);
                setActiveAgentId(t.agentOrder[0]);
                setActiveIndex(-1);
              }}
            />
          ))}
        </div>

        <div style={{
          marginTop: '2.5rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.55rem', color: '#444',
        }}>
          {travels.length} walks · {travels.reduce((s, t) => s + t.waypoints.length, 0)} waypoints · {Object.keys(agents).length} agents
        </div>

        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        `}</style>
      </main>
    );
  }

  // ─── Travel Hero Screen ───
  if (activeIndex === -1) {
    return (
      <main style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center',
        background: '#0a0a0a', color: '#e8e6e3',
        padding: isMobile ? '1.5rem' : '2rem',
      }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedTravel(null)}
          style={{
            position: 'absolute',
            top: isMobile ? '12px' : '20px',
            left: isMobile ? '12px' : '20px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#888',
            padding: '6px 12px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ← All Walks
        </button>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem', color: '#555',
          letterSpacing: '0.25em', marginBottom: '2rem',
        }}>
          AGENT EARTH — {travel.location.district.toUpperCase()}
        </div>

        <h1 style={{
          fontSize: 'clamp(1.8rem, 6vw, 4rem)',
          fontWeight: 700, lineHeight: 1.2, marginBottom: '1rem',
          padding: '0 1rem',
        }}>
          {travel.title}
        </h1>

        <p style={{
          fontSize: isMobile ? '0.9rem' : '1rem',
          color: '#888',
          maxWidth: '400px', lineHeight: 1.7, marginBottom: '1rem',
          padding: '0 1rem',
        }}>
          {travel.description}
        </p>

        {/* Agent badges */}
        <div style={{
          display: 'flex', gap: '10px', marginBottom: '2.5rem',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {agentOrder.map(id => {
            const a = agents[id];
            if (!a) return null;
            return (
              <div key={id} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.65rem',
                color: a.color,
                padding: '4px 10px',
                borderRadius: '6px',
                border: `1px solid ${a.color}40`,
                background: `${a.color}10`,
              }}>
                {a.emoji} {a.name}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setActiveIndex(0)}
          style={{
            padding: isMobile ? '16px 48px' : '14px 40px',
            background: 'linear-gradient(135deg, #c9a961, #e8917a)',
            border: 'none', borderRadius: '12px',
            color: '#0a0a0a',
            fontSize: isMobile ? '1rem' : '0.9rem',
            fontWeight: 700, cursor: 'pointer',
            letterSpacing: '0.05em', transition: 'transform 0.2s',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          Begin Walk
        </button>

        <div style={{
          position: isMobile ? 'relative' : 'absolute',
          bottom: isMobile ? undefined : '2rem',
          marginTop: isMobile ? '2rem' : 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem', color: '#444',
        }}>
          {waypoints.length} waypoints · {travel.stats.distance} · {travel.stats.timeSpan}
        </div>

        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
        `}</style>
      </main>
    );
  }

  // ─── Walking View ───
  const wp = waypoints[activeIndex];

  return (
    <main
      style={{
        height: '100vh',
        height: '100dvh',
        width: '100vw',
        position: 'relative', overflow: 'hidden',
        background: '#0a0a0a',
      }}
      {...swipeHandlers}
    >
      {/* Full-screen Map */}
      {API_KEY && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <APIProvider apiKey={API_KEY}>
            <Map
              defaultCenter={{ lat: travel.location.center.lat, lng: travel.location.center.lng }}
              defaultZoom={16}
              gestureHandling="greedy"
              disableDefaultUI={true}
              styles={[
                { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#666' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0a' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#222' }] },
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              ]}
              style={{ width: '100%', height: '100%' }}
            >
              <MapController waypoints={waypoints} activeIndex={activeIndex} />
              {waypoints.map((w, i) => (
                <Marker
                  key={w.id}
                  position={{ lat: w.lat, lng: w.lng }}
                  onClick={() => setActiveIndex(i)}
                  label={i === activeIndex ? {
                    text: String(i + 1),
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700',
                  } : undefined}
                  icon={{
                    path: 'M 0,0 m -1,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
                    fillColor: i === activeIndex ? '#c9a961' : i < activeIndex ? '#666' : '#333',
                    fillOpacity: 1,
                    strokeColor: i === activeIndex ? '#fff' : '#555',
                    strokeWeight: 2,
                    scale: i === activeIndex ? (isMobile ? 12 : 14) : (isMobile ? 5 : 6),
                  }}
                />
              ))}
            </Map>
          </APIProvider>
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: isMobile ? '60%' : '40%',
        background: 'linear-gradient(transparent, rgba(10,10,10,0.8))',
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10,
        padding: isMobile ? '12px 12px' : '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem', color: '#888',
          letterSpacing: '0.15em',
          background: 'rgba(10,10,10,0.7)',
          padding: '5px 10px', borderRadius: '8px',
          backdropFilter: 'blur(8px)',
        }}>
          AGENT EARTH · {travel.location.district.toUpperCase()}
        </div>
        <button
          onClick={() => setActiveIndex(-1)}
          style={{
            background: 'rgba(10,10,10,0.7)',
            border: 'none', color: '#888',
            padding: '5px 10px', borderRadius: '8px',
            fontSize: '0.7rem', cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            fontFamily: "'JetBrains Mono', monospace",
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        height: '3px',
        background: 'linear-gradient(90deg, #c9a961, #e8917a)',
        width: `${((activeIndex + 1) / waypoints.length) * 100}%`,
        transition: 'width 0.5s ease',
        zIndex: 20,
      }} />

      {/* Floating Card — bottom sheet on mobile */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: isMobile ? 0 : '20px',
        right: isMobile ? 0 : 'auto',
        zIndex: 10,
        maxHeight: isMobile ? '60vh' : 'calc(100vh - 80px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        <FloatingCard
          wp={wp}
          index={activeIndex}
          total={waypoints.length}
          activeAgentId={activeAgentId}
          agentOrder={agentOrder}
          onAgentChange={setActiveAgentId}
          onPrev={goPrev}
          onNext={goNext}
          onDotSelect={setActiveIndex}
          isMobile={isMobile}
        />
      </div>

      {/* Keyboard hint — desktop only */}
      {!isMobile && (
        <div style={{
          position: 'absolute', bottom: '20px', right: '20px',
          zIndex: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem', color: '#555',
          background: 'rgba(10,10,10,0.7)',
          padding: '8px 12px', borderRadius: '8px',
          backdropFilter: 'blur(8px)', lineHeight: 1.8,
        }}>
          ← → navigate<br />
          {agentOrder.length > 1 && <>T toggle agent<br /></>}
          Space next · Esc back
        </div>
      )}

      {/* End screen overlay */}
      {activeIndex === waypoints.length - 1 && (
        <div style={{
          position: 'absolute',
          top: isMobile ? '50px' : '20px',
          right: isMobile ? '12px' : '20px',
          left: isMobile ? '12px' : 'auto',
          zIndex: 10,
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(12px)',
          padding: '14px 18px', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)',
          maxWidth: isMobile ? '100%' : '280px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: isMobile ? '0.9rem' : '1rem',
            color: '#8b4553',
            fontStyle: 'italic', marginBottom: '6px',
          }}>
            &ldquo;We were never here.&rdquo;
          </p>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem', color: '#888',
          }}>
            {travel.stats.distance} · {travel.stats.timeSpan}
          </p>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
    </main>
  );
}
