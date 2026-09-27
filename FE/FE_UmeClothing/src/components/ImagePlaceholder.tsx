export default function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-1/3 w-1/3 max-h-24 max-w-24">
        <path d="M8 3 4 6l2 3 2-1v13h8V8l2 1 2-3-4-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3Z" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
