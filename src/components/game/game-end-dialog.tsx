import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import type { Player } from '@/lib/types';
import { Scoreboard } from './scoreboard';

interface GameEndDialogProps {
  players: Player[];
  onPlayAgain: () => void;
}

export function GameEndDialog({ players, onPlayAgain }: GameEndDialogProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
            <Trophy className="w-8 h-8 text-yellow-400" />
            Game Over!
          </DialogTitle>
          <DialogDescription className="text-center">
            {winner ? `Congratulations to ${winner.name} for winning the game!` : 'Good game, everyone!'}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
            <h3 className="font-bold text-center mb-2">Final Scores</h3>
            <Scoreboard players={players} />
        </div>
        <DialogFooter>
          <Button onClick={onPlayAgain} className="w-full">Play Again</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    