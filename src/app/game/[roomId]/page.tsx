'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { GameState, Player, Message, ToolSettings, DrawingPoint, Game } from '@/lib/types';
import { getAiHintAction } from '@/app/actions';

import { Scoreboard } from '@/components/game/scoreboard';
import { DrawingCanvas } from '@/components/game/drawing-canvas';
import { ChatPanel } from '@/components/game/chat-panel';
import { Toolbar } from '@/components/game/toolbar';
import { WordDisplay } from '@/components/game/word-display';
import { GameEndDialog } from '@/components/game/game-end-dialog';

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

  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    color: '#FFFFFF',
    brushSize: 5,
  });

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

  // Game and Players state listener
  useEffect(() => {
    if (!user || !roomId) return;

    const gameDocRef = doc(db, 'rooms', roomId as string, 'game', 'gameState');
    const playersColRef = collection(db, 'rooms', roomId as string, 'players');

    const unsubGame = onSnapshot(gameDocRef, (docSnap) => {
        if(docSnap.exists()) {
            setGame(docSnap.data() as Game);
        } else {
            // Maybe game ended or hasn't started
            // toast({ title: 'Game not found!', variant: 'destructive' });
            // router.push(`/room/${roomId}`);
        }
        setLoading(false);
    });
    
    const unsubPlayers = onSnapshot(query(playersColRef, orderBy('joinedAt')), (snapshot) => {
        const playersList = snapshot.docs.map(doc => doc.data() as Player);
        setPlayers(playersList);
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
    
    const qMessages = query(messagesColRef, orderBy('timestamp'));
    const qDrawing = query(drawingColRef, orderBy('timestamp'));

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
  
  const handleSendMessage = async (text: string) => {
    if (!user || !roomId || !text.trim()) return;

    const newMsg = { 
        text: text.trim(), 
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
  };

  const handleGetHint = async () => {
    if (!game) return;
    const drawingDescription = "A player's drawing"; // In a more advanced version, this could come from canvas analysis
    const recentGuesses = messages.filter(m => m.type === 'guess').map(m => m.text);
    
    const hint = await getAiHintAction(drawingDescription, recentGuesses);
    
    const hintMsg = { 
        text: hint, 
        type: 'hint' as const,
        timestamp: serverTimestamp()
    };
    await addDoc(collection(db, 'rooms', roomId as string, 'messages'), hintMsg);
  };

  const handleClearCanvas = async () => {
    if (!roomId) return;
    // For simplicity, we send a "clear" command. A more robust implementation would delete documents.
    const clearPoint: DrawingPoint = {
        type: 'clear',
        timestamp: serverTimestamp()
    }
    await addDoc(collection(db, 'rooms',roomId as string, 'drawingPoints'), clearPoint);
  };
  
  const handleDraw = async (point: Omit<DrawingPoint, 'timestamp'>) => {
    if (!roomId) return;
    await addDoc(collection(db, 'rooms', roomId as string, 'drawingPoints'), {
        ...point,
        timestamp: serverTimestamp(),
    });
  }

  if (loading || !game || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <h1 className="text-3xl font-bold">Entering the Drawing Arena...</h1>
        <p className="text-muted-foreground">Get your virtual pencils ready!</p>
      </div>
    );
  }

  const currentUserPlayer = players.find(p => p.id === user.uid);
  const isDrawer = game.currentDrawerId === user.uid;
  const youGuessedIt = game.correctGuessers?.includes(user.uid);
  const turnEndsAt = (game.turnEndsAt as any)?.toDate().getTime() || Date.now() + 90000;

  return (
    <main className="grid grid-cols-1 lg:grid-cols-[250px_1fr_300px] grid-rows-[auto_1fr_auto] gap-4 p-4 h-screen max-h-screen overflow-hidden">
      {game.status === 'ended' && <GameEndDialog players={players} onPlayAgain={() => router.push('/')} />}
      <header className="lg:col-span-3 flex flex-col md:flex-row gap-4 justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">SketchVerse</h1>
        <WordDisplay word={game.currentWord} isDrawer={isDrawer} />
        <div className="text-lg font-bold">Round {game.round}/5</div>
      </header>

      <aside className="hidden lg:flex flex-col gap-4 row-start-2">
        <Scoreboard players={players} currentDrawerId={game.currentDrawerId} />
      </aside>

      <div className="relative row-start-2 lg:col-start-2 bg-card rounded-lg border flex items-center justify-center">
        <DrawingCanvas 
            toolSettings={toolSettings} 
            isDrawer={isDrawer} 
            initialPoints={drawingPoints}
            onDraw={handleDraw}
        />
      </div>

      <aside className="flex flex-col gap-4 row-start-3 lg:row-start-2 lg:col-start-3">
        <ChatPanel
          messages={messages}
          turnEndsAt={turnEndsAt}
          isDrawer={isDrawer}
          isGuessed={youGuessedIt || false}
          onSendMessage={handleSendMessage}
          onGetHint={handleGetHint}
        />
      </aside>

      <footer className="lg:col-start-2 flex items-center justify-center row-start-4 lg:row-start-3">
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
    </main>
  );
}

    