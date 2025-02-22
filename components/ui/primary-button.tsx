'use client';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function PrimaryButton({ children, fullWidth = false, ...props }: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`h-[60px] ${
        props.disabled 
          ? 'bg-brand-blue/50 cursor-not-allowed border-brand-blue/50 text-brand-yellow/70'
          : 'bg-brand-blue hover:bg-brand-blue/90 border-brand-blue text-brand-yellow'
      } border-2 rounded-[10px] font-eyebrow text-lg px-8 transition-colors ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {children}
    </button>
  );
}
