const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
export const BackIcon = () => (
  <svg {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const BagIcon = () => (
  <svg {...base}>
    <path d="M6 7h12l-1 13H7L6 7zM9 7a3 3 0 0 1 6 0" />
  </svg>
);
