import React from 'react';
import useSettingsStore from '../../store/useSettingsStore';

/**
 * MuruganLogo — reusable brand logo component
 */
const sizes = {
  xs: { icon: 28, text1: '11px', text2: '8px' },
  sm: { icon: 34, text1: '13px', text2: '9px' },
  md: { icon: 40, text1: '15px', text2: '10px' },
  lg: { icon: 52, text1: '18px', text2: '11px' },
  xl: { icon: 68, text1: '22px', text2: '13px' },
};

const Logo = ({ size = 'md', variant = 'full', theme = 'dark' }) => {
  const settings = useSettingsStore((s) => s.settings);
  const s = sizes[size] || sizes.md;
  const textColor = theme === 'light' ? '#ffffff' : '#15803d';
  const subColor  = theme === 'light' ? 'rgba(255,255,255,0.75)' : '#6b7280';

  const rawLogo = settings?.websiteLogo || settings?.storeLogo || "/logo.png";
  const logoUrl = rawLogo.startsWith('http') || rawLogo.startsWith('data:') || rawLogo.startsWith('/logo.png')
    ? rawLogo
    : `http://localhost:5000${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`;

  let part1 = "Tiruchendur Murugan";
  let part2 = "Pazhamudhir Solai";
  
  if (settings?.websiteName) {
    const parts = settings.websiteName.split(' ');
    if (parts.length > 2) {
      part1 = parts.slice(0, 2).join(' ');
      part2 = parts.slice(2).join(' ');
    } else if (parts.length === 2) {
      part1 = parts[0];
      part2 = parts[1];
    } else {
      part1 = "";
      part2 = settings.websiteName;
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: `${s.icon * 0.28}px`, userSelect: 'none' }}>
      {/* ── Icon ── */}
      <img
        src={logoUrl}
        alt="Store Logo"
        style={{
          width: s.icon,
          height: s.icon,
          flexShrink: 0,
          objectFit: 'contain',
          borderRadius: '22%',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))'
        }}
      />

      {/* ── Wordmark ── */}
      {variant === 'full' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          {part1 && (
            <span style={{
              fontSize: s.text2,
              fontWeight: 600,
              color: subColor,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
            }}>
              {part1}
            </span>
          )}
          <span style={{
            fontSize: s.text1,
            fontWeight: 800,
            color: textColor,
            letterSpacing: '-0.02em',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            marginTop: '1px',
          }}>
            {part2}
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
