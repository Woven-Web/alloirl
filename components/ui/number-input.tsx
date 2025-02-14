'use client';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  fullWidth?: boolean;
}

export function NumberInput({ fullWidth = false, ...props }: NumberInputProps) {
  return (
    <div className="relative flex-1">
      <input
        type="number"
        {...props}
        className={`h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center w-full focus:outline-none focus:ring-0 pr-[4.5rem]`}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-blue font-eyebrow text-lg pointer-events-none">
        votes
      </span>
    </div>
  );
}
