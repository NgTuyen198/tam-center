'use client';

export default function SupportNavButton({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-support'))}
      className={className}
    >
      {children}
    </button>
  );
}
