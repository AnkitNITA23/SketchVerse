'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, getDocs, runTransaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';

import { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, LogIn, Crown, Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MOCK_CURRENT_USER_ID } from '@/lib/mock-data';


const generateUsername = () => `Player${Math.floor(Math.random() * 1000)}`;

export default function RoomLobby() {
  const { roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const roomRef = doc(db, 'rooms', roomId as string);
  const playersRef = collection(roomRef, 'players');

  const currentUserInRoom = players.find(p => p.id === user?.uid);
  const isHost = players.find(p => p.isHost);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);

                if (!roomDoc.exists()) {
                    transaction.set(roomRef, { createdAt: new Date(), host: firebaseUser.uid });
                    transaction.set(doc(playersRef, firebaseUser.uid), {
                        id: firebaseUser.uid,
                        name: generateUsername(),
                        score: 0,
                        isDrawing: false,
                        isHost: true,
                        joinedAt: new Date(),
                    });
                } else {
                    const playerDoc = await transaction.get(doc(playersRef, firebaseUser.uid));
                    if (!playerDoc.exists()) {
                        const playersSnapshot = await getDocs(playersRef);
                        if (playersSnapshot.size >= 5) {
                            throw new Error('Room is full');
                        }
                        transaction.set(doc(playersRef, firebaseUser.uid), {
                            id: firebaseUser.uid,
                            name: generateUsername(),
                            score: 0,
                            isDrawing: false,
                            isHost: false,
                            joinedAt: new Date(),
                        });
                    }
                }
            });
        } catch (error: any) {
            console.error('Error joining room:', error);
            toast({
                variant: 'destructive',
                title: 'Failed to join room',
                description: error.message === 'Room is full' ? 'This room is already full.' : 'The room may not exist or an error occurred.',
            });
            router.push('/');
        }
        
        setIsLoading(false);

      } else {
        await signInAnonymously(auth);
      }
    });

    return () => unsubscribe();
  }, [roomId]);
  
  useEffect(() => {
    if(!user) return;
    
    const q = query(collection(db, 'rooms', roomId as string, 'players'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const playersList = snapshot.docs.map(doc => doc.data() as Player);
      playersList.sort((a, b) => (a.joinedAt as any) - (b.joinedAt as any));
      setPlayers(playersList);
    });

    return () => unsubscribe();
  }, [user, roomId]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId as string);
    toast({
      title: 'Room ID Copied!',
      description: 'You can now share it with your friends.',
    });
  };

  const startGame = async () => {
    if (!currentUserInRoom?.isHost) {
        toast({ variant: "destructive", title: "Only the host can start the game."});
        return;
    }
    
    if (players.length < 2) {
        toast({ variant: "destructive", title: "Need at least 2 players to start."});
        return;
    }

    setIsStarting(true);
    // Here you would typically trigger a server action to set up the game state
    console.log("Starting game...");
    // For now, we'll just navigate to a placeholder game route
    router.push(`/game/${roomId}`);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <h1 className="text-2xl font-semibold">Joining Room...</h1>
        <p className="text-muted-foreground">Please wait while we connect you.</p>
      </div>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">Game Lobby</CardTitle>
              <CardDescription>Waiting for players to join...</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg font-mono tracking-widest">{roomId}</Badge>
              <Button size="icon" variant="outline" onClick={copyRoomId}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5"/> Players ({players.length}/5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {players.map(player => (
                    <div key={player.id} className="flex items-center gap-3 p-2 bg-background rounded-md border">
                        <Avatar>
                        <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium flex-1 truncate">{player.name} {player.id === user?.uid && '(You)'}</span>
                        {player.isHost && <Crown className="w-5 h-5 text-yellow-500" title="Host"/>}
                    </div>
                    ))}
                    {[...Array(5 - players.length)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-background/50 rounded-md border border-dashed">
                             <Avatar className="bg-muted">
                                <AvatarFallback><UserPlus className="w-4 h-4 text-muted-foreground"/></AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground italic">Waiting...</span>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
            <Button 
                className="w-full" 
                size="lg"
                onClick={startGame}
                disabled={isStarting || (currentUserInRoom && !currentUserInRoom.isHost) || players.length < 2 || players.length > 5}
            >
                {isStarting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                {currentUserInRoom?.isHost ? 'Start Game' : 'Waiting for Host'}
            </Button>
             <p className="text-xs text-muted-foreground">
                { currentUserInRoom?.isHost
                    ? (players.length < 2 ? "You need at least 2 players to start." : "You can start the game now.")
                    : `Waiting for ${isHost?.name || 'the host'} to start the game.`
                }
             </p>
        </CardFooter>
      </Card>
    </main>
  );
}
