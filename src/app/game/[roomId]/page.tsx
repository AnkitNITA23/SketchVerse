'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2, Palette, Users, MessageSquare } from 'lucide-react';
import type { GameState, Player, Message, ToolSettings } from '@/lib/types';
import { getAiHintAction } from '@/app/actions';

import { Scoreboard } from '@/components/game/scoreboard';
import { DrawingCanvas } from '@/components/game/drawing-canvas';
import { ChatPanel } from '@/components/game/chat-panel';
import { Toolbar } from '@/components/game/toolbar';
import { WordDisplay } from '@/components/game/word-display';


// This is a placeholder. In a real app, this would be managed on the server.
const MOCK_GAME_STATE: GameState = {
  players: [
    { id: 'user-1', name: 'Van Gogh', score: 0, isDrawing: true, avatar: 'avatar-1.svg' },
    { id: 'user-2', name: 'Monet', score: 0, isDrawing: false, avatar: 'avatar-2.svg' },
  ],
  messages: [
      { id: '1', type: 'system', text: 'The game has started! Van Gogh is drawing.'}
  ],
  currentWord: 'Starry Night',
  turnEndsAt: Date.now() + 90000, // 90 seconds from now
};


export default function GameRoom() {
  const { roomId } = useParams();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState>(MOCK_GAME_STATE);
  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    color: '#FFFFFF',
    brushSize: 5,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // Handle user not being logged in - maybe redirect
        toast({ title: 'You need to be logged in!', variant: 'destructive' });
        // router.push('/');
      }
    });
    return unsubscribe;
  }, [toast]);

  // Game state listener
  useEffect(() => {
    if (!user || !roomId) return;
    setLoading(true);

    // In a real app, you'd listen to the actual game state from Firestore.
    // For now, we're just using mock data.
    const roomRef = doc(db, 'rooms', roomId as string);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if(docSnap.exists()) {
            // Here you would process the real game state from the document
            // For now, we'll just set our mock state
            setGameState(MOCK_GAME_STATE);
        } else {
            toast({ title: 'Room not found!', variant: 'destructive' });
            // router.push('/');
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, roomId, toast]);
  
  const handleSendMessage = (text: string) => {
    // This will be implemented to send a message to Firestore
    console.log('Sending message:', text);
    const newMsg: Message = { id: Date.now().toString(), text, type: 'guess', playerName: 'You', playerId: user?.uid };
    setGameState(prev => ({...prev, messages: [...prev.messages, newMsg]}));
  };

  const handleGetHint = async () => {
    const drawingDescription = "A swirly night sky with a big moon and a village."; // This would come from the drawer or AI analysis of the canvas
    const recentGuesses = gameState.messages.filter(m => m.type === 'guess').map(m => m.text);
    
    const hint = await getAiHintAction(drawingDescription, recentGuesses);
    
    const hintMsg: Message = { id: Date.now().toString(), text: hint, type: 'hint' };
    setGameState(prev => ({...prev, messages: [...prev.messages, hintMsg]}));
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
        <h1 className="text-3xl font-bold">Entering the Drawing Arena...</h1>
        <p className="text-muted-foreground">Get your virtual pencils ready!</p>
      </div>
    );
  }

  const currentUserPlayer = gameState.players.find(p => p.id === user?.uid) ?? gameState.players[0]; // Fallback for mock
  const isDrawer = currentUserPlayer.isDrawing;
  const youGuessedIt = false; // This would be part of the player's state

  return (
    <main className="grid grid-cols-1 lg:grid-cols-[250px_1fr_300px] grid-rows-[auto_1fr_auto] gap-4 p-4 h-screen max-h-screen overflow-hidden">
      <header className="lg:col-span-3 flex flex-col md:flex-row gap-4 justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">SketchVerse</h1>
        <WordDisplay word={gameState.currentWord} isDrawer={isDrawer} />
        <div className="text-lg font-bold">Round 1/5</div>
      </header>

      <aside className="hidden lg:flex flex-col gap-4 row-start-2">
        <Scoreboard players={gameState.players} />
      </aside>

      <div className="relative row-start-2 lg:col-start-2 bg-card rounded-lg border flex items-center justify-center">
        <DrawingCanvas ref={canvasRef} toolSettings={toolSettings} isDrawer={isDrawer} />
      </div>

      <aside className="flex flex-col gap-4 row-start-3 lg:row-start-2 lg:col-start-3">
        <ChatPanel
          messages={gameState.messages}
          turnEndsAt={gameState.turnEndsAt}
          isDrawer={isDrawer}
          isGuessed={youGuessedIt}
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
