'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, onSnapshot, collection, query, getDocs, runTransaction, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';

import { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, LogIn, Crown, Copy, Users, ChevronsRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AVATARS, generateUsername } from '@/lib/avatars';
import { cn } from '@/lib/utils';


export default function RoomLobby() {
  const { roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

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
                const newPlayerName = generateUsername();
                const newPlayerAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

                setUsername(newPlayerName);
                setSelectedAvatar(newPlayerAvatar);

                if (!roomDoc.exists()) {
                    transaction.set(roomRef, { createdAt: new Date(), host: firebaseUser.uid });
                    transaction.set(doc(playersRef, firebaseUser.uid), {
                        id: firebaseUser.uid,
                        name: newPlayerName,
                        avatar: newPlayerAvatar,
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
                            name: newPlayerName,
                            avatar: newPlayerAvatar,
                            score: 0,
                            isDrawing: false,
                            isHost: false,
                            joinedAt: new Date(),
                        });
                    } else {
                        const playerData = playerDoc.data() as Player;
                        setUsername(playerData.name);
                        setSelectedAvatar(playerData.avatar);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleProfileUpdate = async () => {
    if (!user || !username.trim()) return;
    try {
        const playerDocRef = doc(playersRef, user.uid);
        await updateDoc(playerDocRef, { name: username.trim(), avatar: selectedAvatar });
        toast({
            title: 'Profile Updated!',
            description: 'Your new look is ready!',
        });
        setIsEditing(false);
    } catch (error) {
        console.error('Error updating profile:', error);
        toast({
            variant: 'destructive',
            title: 'Oops!',
            description: 'Could not update your profile.',
        });
    }
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId as string);
    toast({
      title: 'Copied to Clipboard!',
      description: 'Invite your friends to the party!',
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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <h1 className="text-3xl font-bold">Teleporting to Room...</h1>
        <p className="text-muted-foreground">Hang tight, we're setting things up!</p>
      </div>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-3xl animate-bounce-in bg-card/80 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold">Game Lobby</CardTitle>
              <CardDescription>Waiting for the host to start the art-y!</CardDescription>
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
            {!isEditing && currentUserInRoom && (
                 <div className="p-4 border rounded-lg bg-muted/30 flex flex-col md:flex-row items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                        <AvatarImage src={`/avatars/${currentUserInRoom.avatar}`} />
                        <AvatarFallback>{currentUserInRoom.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="font-bold text-xl">{currentUserInRoom.name}</h3>
                        <p className="text-muted-foreground">This is you! Ready to draw?</p>
                    </div>
                    <Button onClick={() => setIsEditing(true)}>Change Name/Avatar</Button>
                 </div>
            )}
            {isEditing && (
                 <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                    <h3 className="font-semibold text-center">Customize Your Look</h3>
                    <div className="flex justify-center gap-2 flex-wrap">
                        {AVATARS.map(avatar => (
                            <button key={avatar} onClick={() => setSelectedAvatar(avatar)} className={cn("rounded-full transition-all hover:scale-110", selectedAvatar === avatar ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '')}>
                                <Avatar className="h-16 w-16 border-2 border-muted">
                                    <AvatarImage src={`/avatars/${avatar}`} />
                                    <AvatarFallback>AV</AvatarFallback>
                                </Avatar>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your name" className="font-semibold"/>
                        <Button onClick={handleProfileUpdate}>Save</Button>
                        <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    </div>
                 </div>
            )}
            <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5"/> Players ({players.length}/5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {players.map(player => (
                    <div key={player.id} className="flex items-center gap-3 p-2 bg-background/50 rounded-md border">
                        <Avatar className="h-10 w-10 border-2 border-secondary">
                          <AvatarImage src={`/avatars/${player.avatar}`} alt={player.name} />
                          <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium flex-1 truncate">{player.name} {player.id === user?.uid && '(You)'}</span>
                        {player.isHost && <Crown className="w-5 h-5 text-yellow-500" title="Host"/>}
                    </div>
                    ))}
                    {[...Array(5 - players.length)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-background/30 rounded-md border border-dashed">
                             <Avatar className="bg-muted/50">
                                <AvatarFallback><UserPlus className="w-4 h-4 text-muted-foreground"/></AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground italic">Waiting for player...</span>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
            <Button 
                className="w-full font-bold text-lg shadow-lg hover:scale-105 transition-transform" 
                size="lg"
                onClick={startGame}
                disabled={isStarting || (currentUserInRoom && !currentUserInRoom.isHost) || players.length < 2 || players.length > 5}
            >
                {isStarting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ChevronsRight className="mr-2 h-5 w-5" />}
                {currentUserInRoom?.isHost ? 'Start Game!' : 'Waiting for Host'}
            </Button>
             <p className="text-xs text-muted-foreground text-center">
                { currentUserInRoom?.isHost
                    ? (players.length < 2 ? "You need at least 2 players to start." : "Ready to go! Hit start when your crew is all here.")
                    : `Waiting for ${isHost?.name || 'the host'} to start the game.`
                }
             </p>
        </CardFooter>
      </Card>
    </main>
  );
}
