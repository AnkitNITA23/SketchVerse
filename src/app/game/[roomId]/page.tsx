
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, runTransaction, Timestamp, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import type { Game, Player, Message, ToolSettings, DrawingPoint, RoundScore } from '@/lib/types';
import { getAiHintAction } from '@/app/actions';
import { MOCK_WORD_LIST } from '@/lib/mock-data';

import { Scoreboard } from '@/components/game/scoreboard';
import { DrawingCanvas } from '@/components/game/drawing-canvas';
import { ChatPanel } from '@/components/game/chat-panel';
import { Toolbar } from '@/components/game/toolbar';
import { WordDisplay } from '@/components/game/word-display';
import { GameEndDialog } from '@/components/game/game-end-dialog';
import { RoundEndDialog } from '@/components/game/round-end-dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const TURN_DURATION = 90; // 90 seconds
const TOTAL_ROUNDS = 5;

export default function GameRoom() {
  const { roomId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [drawingPoints, setDrawingPoints] = useState<DrawingPoint[]>([]);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  
  const [lastRoundScores, setLastRoundScores] = useState<RoundScore[]>([]);
  const [showRoundEndDialog, setShowRoundEndDialog] = useState(false);
  const previousPlayersRef = useRef<Player[]>([]);

  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    color: '#FFFFFF',
    brushSize: 5,
  });

  const isHost = players.find(p => p.id === user?.uid)?.isHost;
  const turnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        toast({ title: 'You need to be logged in!', variant: 'destructive' });
        router.push('/');
      }
    });
    return unsubscribe;
  }, [toast, router]);

   const calculateRoundScores = useCallback((currentPlayers: Player[]) => {
    const previousPlayers = previousPlayersRef.current;
    if (previousPlayers.length === 0) return [];
    
    const scores: RoundScore[] = currentPlayers.map(player => {
        const prevPlayer = previousPlayers.find(p => p.id === player.id);
        const scoreChange = player.score - (prevPlayer?.score || 0);
        return {
            playerId: player.id,
            playerName: player.name,
            avatar: player.avatar,
            points: scoreChange,
        };
    }).filter(rs => rs.points > 0).sort((a, b) => b.points - a.points);
    
    return scores;
  }, []);
  
  const startNextTurn = useCallback(async () => {
    if (!isHost || !roomId) return;
    
    // First, show round scores
    const currentPlayersSnapshot = await getDocs(query(collection(db, 'rooms', roomId as string, 'players'), orderBy('joinedAt')));
    const currentPlayers = currentPlayersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));
    const roundScores = calculateRoundScores(currentPlayers);
    if (roundScores.length > 0) {
        setLastRoundScores(roundScores);
        setShowRoundEndDialog(true);
    }
    
    try {
        await runTransaction(db, async (transaction) => {
            const gameDocRef = doc(db, 'rooms', roomId as string, 'game', 'gameState');
            const playersColRef = collection(db, 'rooms', roomId as string, 'players');
            
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) throw new Error("Game not found!");
            
            const currentPlayersSnapshot = await getDocs(query(playersColRef, orderBy('joinedAt')));
            const currentPlayers = currentPlayersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));

            let { round, currentDrawerId } = gameDoc.data() as Game;

            const currentDrawerIndex = currentPlayers.findIndex(p => p.id === currentDrawerId);
            const nextDrawerIndex = (currentDrawerIndex + 1) % currentPlayers.length;
            const nextDrawer = currentPlayers[nextDrawerIndex];

            // If we've looped back to the first player, a round has passed
            if (nextDrawerIndex <= currentDrawerIndex) {
                round++;
            }
            
            if (round > TOTAL_ROUNDS) {
                 transaction.update(gameDocRef, { status: 'ended' });
                 return;
            }

            const newWord = MOCK_WORD_LIST[Math.floor(Math.random() * MOCK_WORD_LIST.length)];

            transaction.update(gameDocRef, {
                currentWord: newWord,
                currentDrawerId: nextDrawer.id,
                round: round,
                turnEndsAt: Timestamp.fromMillis(Date.now() + TURN_DURATION * 1000),
                correctGuessers: []
            });
        });

        const batch = writeBatch(db);
        const drawingPointsCollection = collection(db, 'rooms', roomId as string, 'drawingPoints');
        const clearPoint: DrawingPoint = { type: 'clear', timestamp: serverTimestamp() };
        batch.set(doc(drawingPointsCollection), clearPoint);

        const playersColRef = collection(db, 'rooms', roomId as string, 'players');
        const updatedPlayersSnapshot = await getDocs(query(playersColRef, orderBy('joinedAt')));
        const updatedPlayers = updatedPlayersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
        previousPlayersRef.current = updatedPlayers; // Update ref for next calculation

        const gameDocRef = doc(db, 'rooms', roomId as string, 'game', 'gameState');
        const gameDoc = await getDoc(gameDocRef);
        const { currentDrawerId } = gameDoc.data() as Game;
        const nextDrawer = updatedPlayers.find(p => p.id === currentDrawerId);
        
        const messagesCollection = collection(db, 'rooms', roomId as string, 'messages');
        const systemMessage = {
            text: `${nextDrawer?.name} is now drawing!`,
            type: 'system' as const,
            timestamp: serverTimestamp()
        };
        batch.set(doc(messagesCollection), systemMessage);
        
        await batch.commit();

    } catch (error) {
        console.error("Error starting next turn:", error);
        toast({ title: "Couldn't start the next turn.", variant: 'destructive'});
    }
  }, [isHost, roomId, toast, calculateRoundScores]);

  // Game and Players state listener
  useEffect(() => {
    if (!user || !roomId) return;

    const gameDocRef = doc(db, 'rooms', roomId as string, 'game', 'gameState');
    const playersColRef = collection(db, 'rooms', roomId as string, 'players');

    const unsubGame = onSnapshot(gameDocRef, (docSnap) => {
        if(docSnap.exists()) {
            const gameData = docSnap.data() as Game;
            if (gameData.status === 'playing') {
                setGame(gameData);
            } else if (gameData.status === 'ended') {
                setGame(gameData);
            }
        } else {
            toast({ title: 'Game has ended', description: 'Returning to the lobby.' });
            router.push(`/room/${roomId}`);
            setGame(null);
        }
        setLoading(false);
    });
    
    const unsubPlayers = onSnapshot(query(playersColRef, orderBy('score', 'desc')), (snapshot) => {
        const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Player));
        setPlayers(playersList);
         if (previousPlayersRef.current.length === 0) {
            previousPlayersRef.current = playersList;
        }
    });

    return () => {
        unsubGame();
        unsubPlayers();
    };
  }, [user, roomId, router, toast]);

  // Messages and Drawing listeners
  useEffect(() => {
    if (!roomId) return;
    const messagesColRef = collection(db, 'rooms', roomId as string, 'messages');
    const drawingColRef = collection(db, 'rooms', roomId as string, 'drawingPoints');
    
    const qMessages = query(messagesColRef, orderBy('timestamp', 'asc'));
    const qDrawing = query(drawingColRef, orderBy('timestamp', 'asc'));

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
        const messageList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(messageList);
    });
    
    const unsubDrawing = onSnapshot(qDrawing, (snapshot) => {
        const points = snapshot.docs.map(doc => doc.data() as DrawingPoint);
        setDrawingPoints(points);
    });

    return () => {
        unsubMessages();
        unsubDrawing();
    }
  }, [roomId]);
  
  // Timer check effect
  useEffect(() => {
    if (turnTimeoutRef.current) {
        clearTimeout(turnTimeoutRef.current);
    }

    if (game?.status !== 'playing' || showRoundEndDialog) return;

    if (game?.turnEndsAt && isHost) {
        const turnEndTime = (game.turnEndsAt as Timestamp).toMillis();
        const now = Date.now();
        const delay = turnEndTime - now;

        if (delay > 0) {
            turnTimeoutRef.current = setTimeout(() => {
                startNextTurn();
            }, delay);
        } else if (delay <= 0) {
            startNextTurn();
        }
    }
    return () => {
        if(turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
    }
  }, [game?.turnEndsAt, game?.status, isHost, startNextTurn, showRoundEndDialog]);

  const handleSendMessage = async (text: string) => {
    if (!user || !roomId || !text.trim() || !game || game.status !== 'playing' || game.currentDrawerId === user.uid) return;

    const guessText = text.trim();
    const isCorrect = guessText.toLowerCase() === game.currentWord.toLowerCase();
    
    if (isCorrect) {
        // You can't guess your own word
        if (game.correctGuessers.includes(user.uid)) return;

        try {
            let allGuessed = false;
            await runTransaction(db, async (transaction) => {
                const gameDocRef = doc(db, 'rooms', roomId as string, 'game', 'gameState');
                const playerDocRef = doc(db, 'rooms', roomId as string, 'players', user.uid);
                const drawerDocRef = doc(db, 'rooms', roomId as string, 'players', game.currentDrawerId);

                const gameDoc = await transaction.get(gameDocRef);
                const playerDoc = await transaction.get(playerDocRef);
                const drawerDoc = await transaction.get(drawerDocRef);

                if (!gameDoc.exists() || !playerDoc.exists() || !drawerDoc.exists()) throw new Error("Game or player not found");
                
                const gameData = gameDoc.data();
                if (gameData.correctGuessers?.includes(user.uid)) return; // Already guessed

                const turnEndTime = (gameData.turnEndsAt as Timestamp).toMillis();
                const timeTaken = Date.now();
                const timeRemaining = Math.max(0, turnEndTime - timeTaken);
                const basePoints = 50; 
                const timeBonus = Math.floor((timeRemaining / (TURN_DURATION * 1000)) * 50);

                const guesserPoints = basePoints + timeBonus;
                const drawerPoints = 25; // Points for each correct guess
                
                transaction.update(playerDocRef, { score: (playerDoc.data()?.score || 0) + guesserPoints });
                transaction.update(drawerDocRef, { score: (drawerDoc.data()?.score || 0) + drawerPoints });
                
                const updatedCorrectGuessers = [...(gameData.correctGuessers || []), user.uid];
                transaction.update(gameDocRef, { correctGuessers: updatedCorrectGuessers });

                const correctMsg = { 
                    text: `${playerDoc.data()?.name} guessed the word!`, 
                    type: 'correct' as const, 
                    playerId: user.uid,
                    playerName: playerDoc.data()?.name || 'Anonymous',
                    timestamp: serverTimestamp()
                };
                const messagesCollection = collection(db, 'rooms', roomId as string, 'messages');
                transaction.set(doc(messagesCollection), correctMsg);

                // Check if all non-drawers have guessed
                const playersSnapshot = await getDocs(collection(db, 'rooms', roomId as string, 'players'));
                const nonDrawerPlayersCount = playersSnapshot.docs.filter(p => p.id !== game.currentDrawerId).length;
                if (updatedCorrectGuessers.length >= nonDrawerPlayersCount) {
                    allGuessed = true;
                }
            });
            // After successful transaction, host checks if turn should end
            if (isHost && allGuessed) {
               if(turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
               await startNextTurn();
            }
        } catch (error) {
            console.error("Error processing correct guess: ", error);
            toast({ title: 'Error processing guess', variant: 'destructive' });
        }
    } else {
        // Just a regular guess
        const newMsg = { 
            text: guessText, 
            type: 'guess' as const, 
            playerId: user.uid,
            playerName: players.find(p => p.id === user.uid)?.name || 'Anonymous',
            timestamp: serverTimestamp()
        };
        try {
            await addDoc(collection(db, 'rooms', roomId as string, 'messages'), newMsg);
        } catch (error) {
            console.error("Error sending message: ", error);
            toast({ title: 'Error sending message', variant: 'destructive' });
        }
    }
  };

  const handleGetHint = async () => {
    if (!game) return;
    const drawingDescription = "A player's drawing";
    const recentGuesses = messages.filter(m => m.type === 'guess').slice(-5).map(m => m.text);
    
    const hint = await getAiHintAction(drawingDescription, recentGuesses);
    
    const hintMsg = { 
        text: hint, 
        type: 'hint' as const,
        timestamp: serverTimestamp()
    };
    try {
        await addDoc(collection(db, 'rooms', roomId as string, 'messages'), hintMsg);
    } catch(error) {
        toast({title: "Couldn't get a hint right now.", variant: 'destructive'})
    }
  };

  const handleClearCanvas = async () => {
    if (!roomId || !user || game?.currentDrawerId !== user.uid) return;
    const clearPoint: DrawingPoint = {
        type: 'clear',
        timestamp: serverTimestamp()
    }
    await addDoc(collection(db, 'rooms',roomId as string, 'drawingPoints'), clearPoint);
  };
  
  const handleDraw = async (point: Omit<DrawingPoint, 'timestamp'>) => {
    if (!roomId || !user || game?.currentDrawerId !== user.uid) return;
    await addDoc(collection(db, 'rooms', roomId as string, 'drawingPoints'), {
        ...point,
        timestamp: serverTimestamp(),
    });
  }

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <h1 className="text-3xl font-bold">Entering the Drawing Arena...</h1>
        <p className="text-muted-foreground">Get your virtual pencils ready!</p>
      </div>
    );
  }

  if (!game) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <h1 className="text-3xl font-bold">Waiting for game to start...</h1>
        <p className="text-muted-foreground">The host is setting things up!</p>
      </div>
    );
  }
  
  const isDrawer = game.currentDrawerId === user.uid;
  const youGuessedIt = !!game.correctGuessers?.includes(user.uid);
  const turnEndsAt = game.turnEndsAt ? (game.turnEndsAt as Timestamp).toMillis() : Date.now() + (TURN_DURATION * 1000);

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden bg-background text-foreground">
        {game.status === 'ended' && <GameEndDialog players={players} onPlayAgain={() => router.push('/')} />}
        {showRoundEndDialog && (
            <RoundEndDialog 
                scores={lastRoundScores} 
                onClose={() => setShowRoundEndDialog(false)}
            />
        )}
        
        <header className="flex flex-col sm:flex-row gap-2 justify-between items-center p-2 border-b">
            <h1 className="text-xl md:text-2xl font-bold text-primary">SketchVerse</h1>
            <WordDisplay word={game.currentWord} isDrawer={isDrawer} youGuessedIt={youGuessedIt} />
            <div className="text-base md:text-lg font-bold">Round {game.round}/{TOTAL_ROUNDS}</div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] min-h-0">
            {/* Main content: Canvas and Toolbar */}
            <div className="flex flex-col min-h-0">
                <div className="relative flex-1 bg-card rounded-lg border m-2">
                    <DrawingCanvas 
                        toolSettings={toolSettings} 
                        isDrawer={isDrawer} 
                        initialPoints={drawingPoints}
                        onDraw={handleDraw}
                        gameStatus={game.status}
                    />
                </div>
                <footer className="flex items-center justify-center p-2">
                    {isDrawer ? (
                        <Toolbar 
                            toolSettings={toolSettings} 
                            onSettingsChange={setToolSettings} 
                            onClear={handleClearCanvas}
                        />
                    ) : (
                        <p className="text-muted-foreground">Guess what the drawing is!</p>
                    )}
                </footer>
            </div>

            {/* Sidebar: Scoreboard and Chat */}
            <aside className="w-full lg:w-[320px] flex flex-col gap-2 p-2 border-l bg-background/50">
                <Collapsible open={isScoreboardOpen} onOpenChange={setIsScoreboardOpen} className="lg:hidden">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                            Scoreboard
                            <ChevronsRight className={cn("transition-transform", isScoreboardOpen && "rotate-90")}/>
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <Scoreboard players={players} currentDrawerId={game.currentDrawerId} />
                    </CollapsibleContent>
                </Collapsible>

                <div className="hidden lg:block">
                  <Scoreboard players={players} currentDrawerId={game.currentDrawerId} />
                </div>
                
                <ChatPanel
                  messages={messages}
                  turnEndsAt={turnEndsAt}
                  isDrawer={isDrawer}
                  isGuessed={youGuessedIt || false}
                  onSendMessage={handleSendMessage}
                  onGetHint={handleGetHint}
                />
            </aside>
        </div>
    </main>
  );
}

    