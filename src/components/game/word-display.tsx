import type { FC } from 'react';

interface WordDisplayProps {
  word: string;
  isDrawer: boolean;
  youGuessedIt?: boolean;
}

export const WordDisplay: FC<WordDisplayProps> = ({ word, isDrawer, youGuessedIt }) => {
  const display = (isDrawer || youGuessedIt) ? word : word.replace(/\w/g, '_');

  return (
    <div className="flex items-center justify-center p-2 rounded-lg bg-card border">
      <p className="text-xl lg:text-2xl font-bold tracking-[0.3em] text-center text-primary">
        {display.split('').join(' ')}
      </p>
    </div>
  );
};

    