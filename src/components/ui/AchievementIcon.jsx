// One small stroke icon per achievement family (replaces emoji so the set matches the rest of the UI).
const PATHS = {
  lib: <><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" /></>,
  ep: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5 3.5-5 3.5z" /></>,
  films: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4" /></>,
  series: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 21h8M12 18v3" /></>,
  anime: <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />,
  manga: <><path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" /><path d="M6 18a2 2 0 0 1 2-2h10" /></>,
  game: <><rect x="3" y="8" width="18" height="9" rx="4" /><path d="M8 10.5v4M6 12.5h4M16 11.5h.01M18 13.5h.01" /></>,
  book: <path d="M7 3h10v18l-5-3.5L7 21z" />,
  rate: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  diverse: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
}

export const achievementFamily = (id) => {
  const k = id.split('_')[0]
  return PATHS[k] ? k : 'diverse'
}

export default function AchievementIcon({ id, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[achievementFamily(id)]}
    </svg>
  )
}
