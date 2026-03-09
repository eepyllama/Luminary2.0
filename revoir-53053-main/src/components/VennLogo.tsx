export function VennLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left circle */}
      <circle 
        cx="35" 
        cy="50" 
        r="28" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
        opacity="0.8"
      />
      
      {/* Right circle */}
      <circle 
        cx="65" 
        cy="50" 
        r="28" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
        opacity="0.8"
      />
      
      {/* Top circle */}
      <circle 
        cx="50" 
        cy="30" 
        r="28" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
        opacity="0.8"
      />
      
      {/* Center dot for intersection */}
      <circle 
        cx="50" 
        cy="43" 
        r="4" 
        fill="currentColor"
      />
    </svg>
  );
}
