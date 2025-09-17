
'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Award, Star } from 'lucide-react';
import type { RoundScore } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface RoundEndDialogProps {
  scores: RoundScore[];
  onClose: () => void;
}

export function RoundEndDialog({ scores, onClose }: RoundEndDialogProps) {

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-close after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  if (scores.length === 0) {
    return null; // Don't show if no one scored
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md animate-bounce-in">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
            <Star className="w-8 h-8 text-yellow-400 animate-wiggle" />
            Round Summary
          </DialogTitle>
          <DialogDescription className="text-center">
            Here's how everyone did this round!
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 max-h-60 overflow-y-auto pr-2 space-y-3">
            {scores.map((score, index) => (
                <div key={score.playerId} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-muted/50 border border-border/50">
                    <div className='flex items-center gap-3'>
                        <Avatar className='h-10 w-10 border-2 border-primary/50'>
                             <AvatarImage src={`/avatars/${score.avatar}`} alt={score.playerName} />
                             <AvatarFallback>{score.playerName.substring(0,2)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{score.playerName}</div>
                    </div>
                    <div className='flex items-center gap-2'>
                        {index === 0 && <Award className='w-5 h-5 text-yellow-400' />}
                        <Badge variant="secondary" className="font-mono text-base">+{score.points}</Badge>
                    </div>
                </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

    