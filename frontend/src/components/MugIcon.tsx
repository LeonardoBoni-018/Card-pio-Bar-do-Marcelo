/** Caneca de chopp, como no letreiro do bar. */
export function MugIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" focusable="false">
      <path d="M82 52h12a14 14 0 0 1 14 14v14a14 14 0 0 1-14 14H82" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M26 44h58v52a10 10 0 0 1-10 10H36a10 10 0 0 1-10-10z" fill="#ffb27a" stroke="#fff" strokeWidth="5" />
      <rect x="38" y="58" width="9" height="38" rx="4.5" fill="#fff" opacity=".75" />
      <rect x="56" y="58" width="9" height="38" rx="4.5" fill="#fff" opacity=".75" />
      <circle cx="36" cy="34" r="15" fill="#fff" />
      <circle cx="55" cy="26" r="18" fill="#fff" />
      <circle cx="74" cy="33" r="14" fill="#fff" />
      <circle cx="60" cy="40" r="12" fill="#fff" />
    </svg>
  )
}
