import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

const baseSvgProps = (size: number, className?: string): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
  className,
  'aria-hidden': true,
});

export const IconPlay: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPause: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none" />
  </svg>
);

export const IconStop: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="6" y="6" width="12" height="12" fill="currentColor" stroke="none" />
  </svg>
);

export const IconReset: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <path d="M4 12a8 8 0 1 0 3-6.2" />
    <polyline points="4 4 4 9 9 9" />
  </svg>
);

export const IconHint: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M8 14c-1.5-1.2-2.5-3-2.5-5a6.5 6.5 0 1 1 13 0c0 2-1 3.8-2.5 5v2H8v-2z" />
  </svg>
);

export const IconCode: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polyline points="8 7 3 12 8 17" />
    <polyline points="16 7 21 12 16 17" />
    <line x1="13" y1="5" x2="11" y2="19" />
  </svg>
);

export const IconMenu: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

export const IconClose: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <line x1="5" y1="5" x2="19" y2="19" />
    <line x1="19" y1="5" x2="5" y2="19" />
  </svg>
);

export const IconBack: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="11 6 5 12 11 18" />
  </svg>
);

export const IconFullscreen: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polyline points="4 9 4 4 9 4" />
    <polyline points="15 4 20 4 20 9" />
    <polyline points="20 15 20 20 15 20" />
    <polyline points="9 20 4 20 4 15" />
  </svg>
);

export const IconExitFullscreen: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polyline points='9 4 9 9 4 9' />
    <polyline points='15 4 15 9 20 9' />
    <polyline points='20 15 15 15 15 20' />
    <polyline points='4 15 9 15 9 20' />
  </svg>
);

export const IconCamera: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="3" y="7" width="18" height="12" />
    <polygon points="8,7 10,4 14,4 16,7" />
    <rect x="9" y="10" width="6" height="6" />
  </svg>
);

export const IconRotateLeft: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <path d="M5 12a7 7 0 1 0 2-5" />
    <polyline points="5 4 5 9 10 9" />
  </svg>
);

export const IconRotateRight: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <path d="M19 12a7 7 0 1 1-2-5" />
    <polyline points="19 4 19 9 14 9" />
  </svg>
);

export const IconStepForward: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="5,5 15,12 5,19" fill="currentColor" stroke="none" />
    <rect x="16" y="5" width="3" height="14" fill="currentColor" stroke="none" />
  </svg>
);

export const IconStepBack: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="5" y="5" width="3" height="14" fill="currentColor" stroke="none" />
    <polygon points="19,5 9,12 19,19" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSkipNext: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="4,5 12,12 4,19" fill="currentColor" stroke="none" />
    <polygon points="12,5 20,12 12,19" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSkipPrev: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="20,5 12,12 20,19" fill="currentColor" stroke="none" />
    <polygon points="12,5 4,12 12,19" fill="currentColor" stroke="none" />
  </svg>
);

export const IconJump: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="6 11 12 5 18 11" />
  </svg>
);

export const IconInteract: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="4" y="4" width="16" height="16" />
    <rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polyline points="4 12 9 17 20 6" />
  </svg>
);

export const IconLock: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="5" y="11" width="14" height="9" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const IconSave: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="4,4 17,4 20,7 20,20 4,20" />
    <rect x="8" y="4" width="6" height="5" />
    <rect x="7" y="13" width="10" height="7" />
  </svg>
);

export const IconWarning: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="12,3 22,20 2,20" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <rect x="11" y="16" width="2" height="2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconJournal: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="5" y="4" width="14" height="16" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <line x1="12" y1="9" x2="16" y2="9" />
    <line x1="12" y1="13" x2="16" y2="13" />
  </svg>
);

export const IconKeyboard: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="3" y="6" width="18" height="12" />
    <line x1="6" y1="10" x2="8" y2="10" />
    <line x1="11" y1="10" x2="13" y2="10" />
    <line x1="16" y1="10" x2="18" y2="10" />
    <line x1="7" y1="14" x2="17" y2="14" />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <rect x="9" y="9" width="6" height="6" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </svg>
);


export const IconVolumeOn: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

export const IconVolumeMute: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

export const IconSpark: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9" fill="currentColor" stroke="none" />
  </svg>
);

export const IconFolder: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

export const IconMap: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="1,6 8,2 16,6 23,2 23,18 16,22 8,18 1,22" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

export const IconLayers: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polygon points="12,2 2,7 12,12 22,7" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);

export const IconTerminal: React.FC<IconProps> = ({ size = 20, className }) => (
  <svg {...baseSvgProps(size, className)}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);
