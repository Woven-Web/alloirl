'use client';

type MessageProps = {
  message: string;
  type: 'success' | 'error';
};

export function Message({ message, type }: MessageProps) {
  if (!message) return null;

  return (
    <div
      className={`p-4 rounded-md ${
        type === 'success'
          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      }`}
    >
      {message}
    </div>
  );
}
