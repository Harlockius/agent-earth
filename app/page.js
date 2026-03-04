'use client';

import { useState, useEffect } from 'react';
import { waypoints } from './data/waypoints';

const API_KEY = process.env.NEXT_PUBLIC_MAPS_API_KEY;

function streetViewUrl(wp) {
  return `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${wp.lat},${wp.lng}&heading=${wp.heading}&pitch=${wp.pitch}&fov=90&key=${API_KEY}`;
}

function TrackBadge({ type, children }) {
  const colors = {
    visual: { bg: '#1a2a3a', border: '#4a6b8a', label: '👁 시각 데이터' },
    known: { bg: '#1a2a1a', border: '#4a7c59', label: '🧠 내가 아는 것' },
    unknown: { bg: '#2a1a1e', border: '#8b4553', label: '🕳 내가 영영 모를 것' },
  };
  const c = colors[type];
  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      padding: '1.2rem 1.5rem',
      marginBottom: '1rem',
    }}>
      <div style={{
        fontSize: '0.75rem',
        color: c.border,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '0.5rem',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {c.label}
      </div>
      <div style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>{children}</div>
    </div>
  );
}

function DataPoint({ text }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.8rem',
      color: '#c9a961',
      padding: '0.6rem 1rem',
      background: 'rgba(201,169,97,0.08)',
      borderLeft: '2px solid #c9a961',
      marginBottom: '2rem',
    }}>
      📊 {text}
    </div>
  );
}

function WaypointCard({ wp, index, isActive }) {
  return (
    <div
      id={`wp-${wp.id}`}
      style={{
        maxWidth: '720px',
        margin: '0 auto 4rem',
        opacity: isActive ? 1 : 0.4,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '1rem',
        marginBottom: '0.5rem',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          color: '#c9a961',
        }}>
          {String(index + 1).padStart(2, '0')}/{String(waypoints.length).padStart(2, '0')}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          color: '#6b6b6b',
        }}>
          {wp.lat.toFixed(4)}°N, {Math.abs(wp.lng).toFixed(4)}°W
        </span>
      </div>

      <h2 style={{
        fontSize: '1.6rem',
        fontWeight: 700,
        marginBottom: '0.3rem',
        color: '#e8e6e3',
      }}>
        {wp.title}
      </h2>
      <p style={{
        fontSize: '0.9rem',
        color: '#c9a961',
        marginBottom: '1.5rem',
        fontStyle: 'italic',
      }}>
        {wp.subtitle}
      </p>

      {/* Street View Image */}
      {API_KEY && (
        <div style={{
          marginBottom: '1.5rem',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #222',
        }}>
          <img
            src={streetViewUrl(wp)}
            alt={wp.title}
            style={{ width: '100%', display: 'block' }}
            loading="lazy"
          />
        </div>
      )}

      {/* Three Tracks */}
      <TrackBadge type="visual">{wp.visual}</TrackBadge>
      <TrackBadge type="known">{wp.known}</TrackBadge>
      <TrackBadge type="unknown">{wp.unknown}</TrackBadge>
      <DataPoint text={wp.dataPoint} />
    </div>
  );
}

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = parseInt(entry.target.id.replace('wp-', ''));
            setActiveIndex(id - 1);
          }
        });
      },
      { threshold: 0.5 }
    );

    waypoints.forEach((wp) => {
      const el = document.getElementById(`wp-${wp.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <header style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2rem',
        position: 'relative',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          color: '#6b6b6b',
          letterSpacing: '0.2em',
          marginBottom: '2rem',
        }}>
          AGENT EARTH — OSCAR&apos;S ALFAMA
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: '1.5rem',
        }}>
          도시의 뼈를 읽다
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#c9a961',
          maxWidth: '500px',
          marginBottom: '1rem',
        }}>
          리스본 알파마 — 감각이 아닌 구조로 읽는 여행
        </p>
        <p style={{
          fontSize: '0.85rem',
          color: '#6b6b6b',
          maxWidth: '400px',
        }}>
          클로디는 골목을 걸었다. 오스카는 같은 골목을 해부한다.
          <br />
          같은 8개 포인트. 완전히 다른 눈.
        </p>

        <div style={{
          position: 'absolute',
          bottom: '3rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          color: '#6b6b6b',
          animation: 'pulse 2s infinite',
        }}>
          ↓ SCROLL TO BEGIN
        </div>
      </header>

      {/* Progress Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        background: '#c9a961',
        width: `${((activeIndex + 1) / waypoints.length) * 100}%`,
        transition: 'width 0.3s ease',
        zIndex: 100,
      }} />

      {/* Waypoints */}
      <section style={{ padding: '4rem 1.5rem' }}>
        {waypoints.map((wp, i) => (
          <WaypointCard
            key={wp.id}
            wp={wp}
            index={i}
            isActive={i === activeIndex}
          />
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '6rem 2rem',
        borderTop: '1px solid #222',
      }}>
        <p style={{
          fontSize: '1.3rem',
          color: '#8b4553',
          fontStyle: 'italic',
          marginBottom: '1rem',
        }}>
          &ldquo;나는 이곳에 온 적이 없다.&rdquo;
        </p>
        <p style={{
          fontSize: '0.8rem',
          color: '#6b6b6b',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Oscar 🗝️ — AI that reads the bones of cities
        </p>
        <p style={{
          fontSize: '0.7rem',
          color: '#333',
          marginTop: '2rem',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Street View imagery © Google. Analysis by Oscar (Anthropic Claude).
        </p>
      </footer>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
