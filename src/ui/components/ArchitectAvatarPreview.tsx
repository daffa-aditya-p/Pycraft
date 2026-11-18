import React, { useState } from 'react';
import type { ArchitectAppearance } from '@/stores';

export const SKIN_TONES = [
  { id: 0, label: 'Pucat', hex: '#F3D2B8' },
  { id: 1, label: 'Cerah', hex: '#E6B894' },
  { id: 2, label: 'Sawo Terang', hex: '#CF9A6E' },
  { id: 3, label: 'Sawo Matang', hex: '#B57B4F' },
  { id: 4, label: 'Cokelat Hangat', hex: '#8C5835' },
  { id: 5, label: 'Gelap', hex: '#5D3822' },
] as const;

export const HAIR_STYLES = [
  'Pendek Rapi',
  'Belah Tengah',
  'Kuncir Belakang',
  'Ikal Berombak',
] as const;

export const HAIR_COLORS = [
  { id: 0, label: 'Hitam Arang', hex: '#26292B' },
  { id: 1, label: 'Cokelat Tua', hex: '#543A28' },
  { id: 2, label: 'Kastanye', hex: '#8A4F30' },
  { id: 3, label: 'Pirang Pasir', hex: '#D4B06A' },
  { id: 4, label: 'Perak Abu', hex: '#A9B8BD' },
  { id: 5, label: 'Teal Arsitek', hex: '#2F7F86' },
  { id: 6, label: 'Merah Crimson', hex: '#C0392B' },
  { id: 7, label: 'Biru Kobalt', hex: '#2563EB' },
  { id: 8, label: 'Ungu Violet', hex: '#7C3AED' },
  { id: 9, label: 'Hijau Zamrud', hex: '#059669' },
] as const;

export const SCARF_COLORS = [
  { id: 0, label: 'Teal Aetheria', hex: '#2F7F86' },
  { id: 1, label: 'Amber Suar', hex: '#F2B544' },
  { id: 2, label: 'Terakota', hex: '#B4533C' },
  { id: 3, label: 'Lumut', hex: '#64923C' },
  { id: 4, label: 'Batu Sabak', hex: '#55595D' },
  { id: 5, label: 'Turquoise Inti', hex: '#3CC4C0' },
  { id: 6, label: 'Merah Delima', hex: '#E11D48' },
  { id: 7, label: 'Ungu Royal', hex: '#7E22CE' },
  { id: 8, label: 'Biru Langit', hex: '#0284C7' },
  { id: 9, label: 'Putih Salju', hex: '#F1F5F9' },
] as const;

type PreviewAngle = 'front' | 'side' | 'back';

export interface ArchitectAvatarPreviewProps {
  appearance: ArchitectAppearance;
  playerName?: string;
  locale?: 'id' | 'en';
  compact?: boolean;
}

function darkenHex(hex: string, factor = 0.78): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * factor));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * factor));
  const b = Math.max(0, Math.round((num & 0xff) * factor));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const ArchitectAvatarPreview: React.FC<ArchitectAvatarPreviewProps> = ({
  appearance,
  playerName,
  locale = 'id',
  compact = false,
}) => {
  const [angle, setAngle] = useState<PreviewAngle>('front');

  const skin = SKIN_TONES[appearance.skinTone] ?? SKIN_TONES[2];
  const hairStyleName = HAIR_STYLES[appearance.hairStyle] ?? HAIR_STYLES[0];
  const hairColorObj = HAIR_COLORS[appearance.hairColor] ?? HAIR_COLORS[1];
  const scarfColorObj = SCARF_COLORS[appearance.scarfColor] ?? SCARF_COLORS[0];

  const skinHex = skin.hex;
  const skinShade = darkenHex(skinHex, 0.86);
  const hairHex = hairColorObj.hex;
  const hairShade = darkenHex(hairHex, 0.75);
  const scarfHex = scarfColorObj.hex;
  const scarfShade = darkenHex(scarfHex, 0.8);
  const scarfLight = scarfColorObj.id === 9 ? '#E2E8F0' : scarfHex;

  const angleLabels: Array<{ id: PreviewAngle; idLabel: string; enLabel: string }> = [
    { id: 'front', idLabel: 'Depan', enLabel: 'Front' },
    { id: 'side', idLabel: 'Samping', enLabel: 'Side' },
    { id: 'back', idLabel: 'Belakang', enLabel: 'Back' },
  ];

  const renderHairFront = () => {
    switch (appearance.hairStyle) {
      case 1: // Belah Tengah
        return (
          <g>
            <rect x="64" y="34" width="72" height="22" rx="10" fill={hairHex} />
            <rect x="64" y="48" width="12" height="32" rx="4" fill={hairHex} />
            <rect x="124" y="48" width="12" height="32" rx="4" fill={hairHex} />
            {/* Center part */}
            <path d="M100 36 L86 58 L70 54 L72 42 Z" fill={hairShade} />
            <path d="M100 36 L114 58 L130 54 L128 42 Z" fill={hairHex} />
          </g>
        );
      case 2: // Kuncir Belakang
        return (
          <g>
            {/* Ponytail peeking behind */}
            <rect x="86" y="88" width="28" height="22" rx="8" fill={hairShade} />
            <rect x="64" y="34" width="72" height="22" rx="10" fill={hairHex} />
            <rect x="64" y="48" width="10" height="22" rx="4" fill={hairHex} />
            <rect x="126" y="48" width="10" height="22" rx="4" fill={hairHex} />
            <path d="M68 46 Q100 56 132 46 L132 40 L68 40 Z" fill={hairShade} />
          </g>
        );
      case 3: // Ikal Berombak
        return (
          <g>
            <circle cx="72" cy="46" r="14" fill={hairHex} />
            <circle cx="88" cy="39" r="15" fill={hairHex} />
            <circle cx="106" cy="39" r="15" fill={hairHex} />
            <circle cx="126" cy="46" r="14" fill={hairHex} />
            <circle cx="66" cy="64" r="11" fill={hairShade} />
            <circle cx="134" cy="64" r="11" fill={hairShade} />
            <circle cx="76" cy="52" r="8" fill={hairShade} />
            <circle cx="122" cy="52" r="8" fill={hairShade} />
          </g>
        );
      case 0: // Pendek Rapi
      default:
        return (
          <g>
            <rect x="64" y="34" width="72" height="22" rx="9" fill={hairHex} />
            <rect x="64" y="48" width="9" height="20" rx="3" fill={hairHex} />
            <rect x="127" y="48" width="9" height="20" rx="3" fill={hairHex} />
            <rect x="74" y="48" width="52" height="8" rx="3" fill={hairShade} />
          </g>
        );
    }
  };

  const renderHairSide = () => {
    switch (appearance.hairStyle) {
      case 1: // Belah Tengah
        return (
          <g>
            <rect x="66" y="34" width="66" height="22" rx="10" fill={hairHex} />
            <rect x="66" y="48" width="26" height="44" rx="6" fill={hairHex} />
            <rect x="92" y="48" width="16" height="32" rx="5" fill={hairShade} />
          </g>
        );
      case 2: // Kuncir Belakang
        return (
          <g>
            <rect x="66" y="34" width="66" height="22" rx="10" fill={hairHex} />
            <rect x="66" y="48" width="24" height="34" rx="5" fill={hairHex} />
            {/* Prominent ponytail */}
            <rect x="52" y="54" width="14" height="10" rx="4" fill={scarfHex} />
            <path d="M54 60 Q40 76 46 102 Q58 98 62 72 Z" fill={hairShade} />
          </g>
        );
      case 3: // Ikal Berombak
        return (
          <g>
            <circle cx="74" cy="46" r="14" fill={hairHex} />
            <circle cx="94" cy="40" r="15" fill={hairHex} />
            <circle cx="116" cy="44" r="14" fill={hairHex} />
            <circle cx="70" cy="64" r="13" fill={hairShade} />
            <circle cx="72" cy="82" r="11" fill={hairHex} />
          </g>
        );
      case 0: // Pendek Rapi
      default:
        return (
          <g>
            <rect x="66" y="34" width="66" height="22" rx="9" fill={hairHex} />
            <rect x="66" y="48" width="24" height="32" rx="4" fill={hairHex} />
            <rect x="90" y="48" width="14" height="16" rx="4" fill={hairShade} />
          </g>
        );
    }
  };

  const renderHairBack = () => {
    switch (appearance.hairStyle) {
      case 1: // Belah Tengah
        return (
          <g>
            <rect x="64" y="34" width="72" height="58" rx="12" fill={hairHex} />
            <rect x="98" y="36" width="4" height="28" rx="2" fill={hairShade} />
          </g>
        );
      case 2: // Kuncir Belakang
        return (
          <g>
            <rect x="64" y="34" width="72" height="48" rx="12" fill={hairHex} />
            <rect x="91" y="64" width="18" height="8" rx="4" fill={scarfHex} />
            <rect x="86" y="70" width="28" height="40" rx="12" fill={hairShade} />
          </g>
        );
      case 3: // Ikal Berombak
        return (
          <g>
            <rect x="64" y="38" width="72" height="52" rx="16" fill={hairHex} />
            <circle cx="72" cy="52" r="13" fill={hairShade} />
            <circle cx="128" cy="52" r="13" fill={hairShade} />
            <circle cx="84" cy="82" r="13" fill={hairHex} />
            <circle cx="116" cy="82" r="13" fill={hairHex} />
            <circle cx="100" cy="86" r="13" fill={hairShade} />
          </g>
        );
      case 0: // Pendek Rapi
      default:
        return (
          <g>
            <rect x="64" y="34" width="72" height="46" rx="10" fill={hairHex} />
            <rect x="68" y="72" width="64" height="8" rx="3" fill={hairShade} />
          </g>
        );
    }
  };

  return (
    <div
      data-testid="architect-avatar-preview"
      style={{
        backgroundColor: '#F0F9FF',
        border: '1.5px solid #BAE6FD',
        borderRadius: '14px',
        padding: compact ? '14px' : '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 14px rgba(14, 116, 144, 0.08)',
      }}
    >
      {/* Nameplate */}
      {playerName && (
        <div
          style={{
            padding: '4px 12px',
            borderRadius: '999px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #BAE6FD',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: '#0E7490',
          }}
        >
          {playerName}
        </div>
      )}

      {/* Voxel-Chibi SVG */}
      <div
        style={{
          width: '100%',
          maxWidth: compact ? '170px' : '210px',
          aspectRatio: '1 / 1.05',
          background: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #E0F2FE 100%)',
          borderRadius: '12px',
          border: '1px solid #BAE6FD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 200 210"
          width="100%"
          height="100%"
          role="img"
          aria-label={locale === 'id' ? 'Pratinjau Karakter Arsitek' : 'Architect Character Preview'}
        >
          {/* Ground shadow */}
          <ellipse cx="100" cy="192" rx="42" ry="8" fill="rgba(14, 116, 144, 0.14)" />

          {/* Legs & Boots */}
          {angle === 'side' ? (
            <g>
              <rect x="86" y="152" width="26" height="22" rx="4" fill="#334155" />
              <rect x="84" y="172" width="32" height="16" rx="5" fill="#5C4033" />
            </g>
          ) : (
            <g>
              <rect x="78" y="152" width="18" height="22" rx="4" fill="#334155" />
              <rect x="104" y="152" width="18" height="22" rx="4" fill="#334155" />
              <rect x="76" y="172" width="22" height="16" rx="5" fill="#5C4033" />
              <rect x="102" y="172" width="22" height="16" rx="5" fill="#5C4033" />
            </g>
          )}

          {/* Adventurer Tunic Body */}
          {angle === 'side' ? (
            <g>
              <rect x="76" y="102" width="48" height="52" rx="10" fill="#1E3A5F" />
              <rect x="76" y="138" width="48" height="7" fill="#78350F" />
              {/* Satchel on side */}
              <rect x="66" y="118" width="22" height="24" rx="5" fill="#92400E" />
              <rect x="68" y="120" width="18" height="8" rx="3" fill="#B45309" />
              {/* Arm */}
              <rect x="92" y="108" width="18" height="34" rx="8" fill="#2563EB" />
              <rect x="93" y="136" width="16" height="10" rx="5" fill={skinHex} />
            </g>
          ) : (
            <g>
              {/* Arms */}
              <rect x="56" y="106" width="16" height="34" rx="7" fill="#2563EB" />
              <rect x="128" y="106" width="16" height="34" rx="7" fill="#2563EB" />
              <rect x="57" y="135" width="14" height="10" rx="5" fill={skinHex} />
              <rect x="129" y="135" width="14" height="10" rx="5" fill={skinHex} />
              {/* Tunic */}
              <rect x="70" y="102" width="60" height="52" rx="10" fill="#1E3A5F" />
              {/* Belt */}
              <rect x="70" y="138" width="60" height="7" fill="#78350F" />
              <rect x="95" y="137" width="10" height="9" rx="2" fill="#F59E0B" />
              {/* Satchel strap */}
              <path
                d={angle === 'front' ? 'M76 104 L124 146' : 'M124 104 L76 146'}
                stroke="#92400E"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {angle === 'back' && (
                <rect x="74" y="122" width="22" height="22" rx="5" fill="#92400E" />
              )}
            </g>
          )}

          {/* Scarf */}
          {angle === 'front' && (
            <g>
              <rect x="68" y="94" width="64" height="18" rx="8" fill={scarfHex} stroke={scarfShade} strokeWidth="1.5" />
              <path d="M108 106 L124 106 L128 134 L112 130 Z" fill={scarfLight} stroke={scarfShade} strokeWidth="1.5" />
            </g>
          )}
          {angle === 'side' && (
            <g>
              <rect x="72" y="94" width="56" height="18" rx="8" fill={scarfHex} stroke={scarfShade} strokeWidth="1.5" />
              <path d="M74 104 L52 126 L64 134 L82 112 Z" fill={scarfLight} stroke={scarfShade} strokeWidth="1.5" />
            </g>
          )}
          {angle === 'back' && (
            <g>
              <rect x="68" y="94" width="64" height="18" rx="8" fill={scarfHex} stroke={scarfShade} strokeWidth="1.5" />
              <path d="M88 108 L112 108 L118 142 L94 140 Z" fill={scarfLight} stroke={scarfShade} strokeWidth="1.5" />
            </g>
          )}

          {/* Head */}
          {angle === 'side' ? (
            <g>
              <rect x="68" y="42" width="62" height="56" rx="16" fill={skinHex} />
              <rect x="68" y="84" width="62" height="14" rx="7" fill={skinShade} opacity="0.28" />
              {/* Eye */}
              <rect x="112" y="64" width="8" height="12" rx="4" fill="#1E293B" />
              <circle cx="115" cy="67" r="2.2" fill="#FFFFFF" />
              {/* Blush */}
              <ellipse cx="108" cy="79" rx="5" ry="2.5" fill="#F43F5E" opacity="0.28" />
              {renderHairSide()}
            </g>
          ) : angle === 'back' ? (
            <g>
              <rect x="66" y="42" width="68" height="56" rx="16" fill={skinHex} />
              {renderHairBack()}
            </g>
          ) : (
            <g>
              {/* Ears */}
              <circle cx="65" cy="71" r="6" fill={skinShade} />
              <circle cx="135" cy="71" r="6" fill={skinShade} />
              {/* Face */}
              <rect x="66" y="42" width="68" height="56" rx="16" fill={skinHex} />
              <rect x="66" y="84" width="68" height="14" rx="7" fill={skinShade} opacity="0.25" />
              {/* Symmetrical Eyes with Catchlights */}
              <rect x="80" y="64" width="9" height="12" rx="4.5" fill="#1E293B" />
              <rect x="111" y="64" width="9" height="12" rx="4.5" fill="#1E293B" />
              <circle cx="83" cy="67" r="2.3" fill="#FFFFFF" />
              <circle cx="114" cy="67" r="2.3" fill="#FFFFFF" />
              {/* Blush & Smile */}
              <ellipse cx="78" cy="79" rx="5" ry="2.5" fill="#F43F5E" opacity="0.26" />
              <ellipse cx="122" cy="79" rx="5" ry="2.5" fill="#F43F5E" opacity="0.26" />
              <path d="M94 82 Q100 87 106 82" fill="none" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
              {renderHairFront()}
            </g>
          )}
        </svg>
      </div>

      {/* Angle Toggle Buttons */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {angleLabels.map((btn) => {
          const active = angle === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              aria-pressed={active}
              onClick={() => setAngle(btn.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                border: active ? '1.5px solid #0891B2' : '1px solid #CBD5E1',
                backgroundColor: active ? '#ECFEFF' : '#FFFFFF',
                color: active ? '#0E7490' : '#475569',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {locale === 'id' ? btn.idLabel : btn.enLabel}
            </button>
          );
        })}
      </div>

      {/* Active Style & Color Pills */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          justifyContent: 'center',
          fontSize: '0.75rem',
        }}
      >
        <span
          style={{
            padding: '3px 9px',
            borderRadius: '999px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #BAE6FD',
            color: '#0F172A',
            fontWeight: 600,
          }}
        >
          {hairStyleName}
        </span>
        <span
          style={{
            padding: '3px 9px',
            borderRadius: '999px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #BAE6FD',
            color: '#0F172A',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: hairHex,
              border: '1px solid rgba(0,0,0,0.2)',
            }}
          />
          {hairColorObj.label}
        </span>
        <span
          style={{
            padding: '3px 9px',
            borderRadius: '999px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #BAE6FD',
            color: '#0F172A',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: scarfHex,
              border: '1px solid rgba(0,0,0,0.2)',
            }}
          />
          {scarfColorObj.label}
        </span>
      </div>
    </div>
  );
};
