// The Jilu "J" mark (same drawing as public/favicon.svg). Decorative: pair it with the wordmark text.
export default function BrandMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="jilu-mark" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b6dff" />
          <stop offset="1" stopColor="#ff5c8a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#jilu-mark)" />
      <path d="M38 15v22a9 9 0 0 1-9 9h-1a8 8 0 0 1-8-8" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
