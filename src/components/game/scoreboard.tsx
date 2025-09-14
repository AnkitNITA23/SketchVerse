import type { FC } from 'react';
import { Crown, Paintbrush } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Player } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScoreboardProps {
  players: Player[];
  currentDrawerId?: string;
}

export const Scoreboard: FC<ScoreboardProps> = ({ players, currentDrawerId }) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topPlayerId = sortedPlayers.length > 0 ? sortedPlayers[0].id : null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg">Scoreboard</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-2">
        <ul className="space-y-3">
          {sortedPlayers.map((player) => (
            <li key={player.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                   <AvatarImage src={`/avatars/${player.avatar}`} alt={player.name} />
                  <AvatarFallback className={cn("text-xs", player.id === currentDrawerId && "bg-primary text-primary-foreground")}>
                    {player.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{player.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {player.id === currentDrawerId && <Paintbrush className="h-4 w-4 text-primary" title="Drawing"/>}
                {player.id === topPlayerId && player.score > 0 && <Crown className="h-4 w-4 text-yellow-400" title="Leading"/>}
                <Badge variant={player.id === currentDrawerId ? 'default' : 'secondary'} className="font-mono text-sm">
                  {player.score}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

    