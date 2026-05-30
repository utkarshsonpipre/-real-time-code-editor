// Minimal inline SVG icons (stroke = currentColor so CSS controls the color).
const S = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Files = () => (
  <svg {...S}>
    <path d="M8 3h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M4 7v12a2 2 0 0 0 2 2h9" opacity="0.5" />
  </svg>
);

export const Chat = () => (
  <svg {...S}>
    <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
  </svg>
);

export const Run = () => (
  <svg {...S}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

export const Users = () => (
  <svg {...S}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="3.5" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.5a4 4 0 0 1 0 7" />
  </svg>
);

export const Settings = () => (
  <svg {...S}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 5.4 15H5a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 6.6 8.1L6.5 8a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H12a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V11a2 2 0 1 1 0 4h-.1z" />
  </svg>
);

export const Sparkle = () => (
  <svg {...S}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
  </svg>
);

export const Upload = () => (
  <svg {...S}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M12 4v12" />
  </svg>
);

export const Download = () => (
  <svg {...S}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

export const Send = () => (
  <svg {...S}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export const Share = () => (
  <svg {...S}>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </svg>
);

export const Copy = () => (
  <svg {...S}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" opacity="0.6" />
  </svg>
);

export const Leave = () => (
  <svg {...S}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);
