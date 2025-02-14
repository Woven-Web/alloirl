'use client';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function PrimaryButton({ children, fullWidth = false, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`h-[60px] bg-brand-blue hover:bg-brand-blue/90 border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-yellow px-8 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {children}
    </button>
  );
}
