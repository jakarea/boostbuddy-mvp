export function BoostBuddyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      fill="none"
    >
      <rect width="512" height="512" rx="118" fill="#0B0E10"/>
      <rect x="1.5" y="1.5" width="509" height="509" rx="116.5" fill="none" stroke="#23282C" strokeWidth="3"/>
      <g fill="#0F9BC0" opacity="0.20">
        <rect x="116" y="116" width="76" height="76" rx="17"/>
        <rect x="218" y="116" width="76" height="76" rx="17"/>
        <rect x="320" y="116" width="76" height="76" rx="17"/>
        <rect x="116" y="218" width="76" height="76" rx="17"/>
        <rect x="320" y="218" width="76" height="76" rx="17"/>
        <rect x="116" y="320" width="76" height="76" rx="17"/>
        <rect x="218" y="320" width="76" height="76" rx="17"/>
        <rect x="320" y="320" width="76" height="76" rx="17"/>
      </g>
      <rect x="218" y="218" width="76" height="76" rx="17" fill="#0F9BC0" opacity="0.55"/>
      <rect x="218" y="218" width="76" height="76" rx="17" fill="#12B4DE"/>
    </svg>
  );
}
