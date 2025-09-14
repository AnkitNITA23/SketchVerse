'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useReducer, useCallback, useMemo } from 'react';
import { GameState, Message, Player, ToolSettings } from '@/lib/types';
import { MOCK_GAME_STATE, MOCK_CURRENT_USER_ID, MOCK_WORD_LIST } from '@/lib/mock-data';
import { getAiHintAction } from '@/app/actions';

import { Scoreboard } from '@/components/game/scoreboard';
import { DrawingCanvas } from '@/components/game/drawing-canvas';
import { Toolbar } from '@/components/game/toolbar';
import { ChatPanel } from '@/components/game/chat-panel';
import { WordDisplay } from '@/components/game/word-display';
import { Button } from '@/components/ui/button';
import { Gamepad2, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GameAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_HINT'; payload: string }
  | { type: 'SET_WORD_GUESSED'; payload: { playerId: string; playerName: string } }
  | { type: 'START_NEW_ROUND' };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_HINT': {
      const hintMessage: Message = {
        id: `hint-${Date.now()}`,
        type: 'hint',
        text: action.payload,
      };
      return { ...state, messages: [...state.messages, hintMessage] };
    }
    case 'SET_WORD_GUESSED': {
      const drawer = state.players.find(p => p.isDrawing);
      const guesser = state.players.find(p => p.id === action.payload.playerId);

      const updatedPlayers = state.players.map(p => {
        if (p.id === drawer?.id) return { ...p, score: p.score + 15 };
        if (p.id === guesser?.id) return { ...p, score: p.score + 10 };
        return p;
      });

      const systemMessage: Message = {
        id: `guess-${Date.now()}`,
        type: 'system',
        text: `${action.payload.playerName} guessed the word!`,
      };

      return {
        ...state,
        players: updatedPlayers,
        messages: [...state.messages, systemMessage],
      };
    }
    case 'START_NEW_ROUND': {
      const currentDrawerIndex = state.players.findIndex(p => p.isDrawing);
      const nextDrawerIndex = (currentDrawerIndex + 1) % state.players.length;
      
      const updatedPlayers = state.players.map((p, index) => ({
        ...p,
        isDrawing: index === nextDrawerIndex,
      }));
      
      return {
        ...MOCK_GAME_STATE,
        players: updatedPlayers,
        currentWord: MOCK_WORD_LIST[Math.floor(Math.random() * MOCK_WORD_LIST.length)],
        turnEndsAt: Date.now() + 90000,
        messages: [{
          id: `new-round-${Date.now()}`,
          type: 'system',
          text: `New round! ${updatedPlayers.find(p => p.isDrawing)?.name} is drawing.`
        }]
      };
    }
    default:
      return state;
  }
};

const InitializingScreen: FC = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="rounded-full bg-primary/20 p-4">
            <div className="rounded-full bg-primary/20 p-6">
                <Gamepad2 className="w-16 h-16 text-primary" />
            </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
            SketchVerse is loading...
        </h1>
        <p className="max-w-md text-muted-foreground">
            Get your virtual pencils ready! We're setting up the canvas for your masterpiece.
        </p>
    </div>
);


export default function Home() {
  const [gameState, dispatch] = useReducer(gameReducer, MOCK_GAME_STATE);
  const [toolSettings, setToolSettings] = useState<ToolSettings>({ color: '#FFFFFF', brushSize: 5 });
  const [isClient, setIsClient] = useState(false);
  const [isGuessed, setIsGuessed] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const currentUser = useMemo(() => gameState.players.find(p => p.id === MOCK_CURRENT_USER_ID), [gameState.players]);
  const isDrawer = useMemo(() => currentUser?.isDrawing, [currentUser]);

  const handleSendMessage = useCallback((text: string) => {
    if (!currentUser || isDrawer || isGuessed) return;

    const isCorrect = text.trim().toLowerCase() === gameState.currentWord.toLowerCase();
    
    const message: Message = {
      id: `msg-${Date.now()}`,
      playerId: currentUser.id,
      playerName: currentUser.name,
      text: text,
      type: 'guess',
    };

    dispatch({ type: 'ADD_MESSAGE', payload: message });

    if (isCorrect) {
      dispatch({ type: 'SET_WORD_GUESSED', payload: { playerId: currentUser.id, playerName: currentUser.name } });
      setIsGuessed(true);
      toast({
        title: "You got it!",
        description: `The word was "${gameState.currentWord}".`,
        action: <PartyPopper className="text-primary" />,
      });
    }
  }, [currentUser, isDrawer, gameState.currentWord, toast, isGuessed]);

  const handleGetHint = useCallback(async () => {
    if (isDrawer) return;
    const recentGuesses = gameState.messages
      .filter(m => m.type === 'guess')
      .slice(-5)
      .map(m => m.text);
      
    const hint = await getAiHintAction(gameState.currentWord, recentGuesses);
    dispatch({ type: 'SET_HINT', payload: hint });
  }, [isDrawer, gameState.messages, gameState.currentWord]);

  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const startNewRound = () => {
    dispatch({ type: 'START_NEW_ROUND' });
    setIsGuessed(false);
    handleClearCanvas();
  };

  if (!isClient) {
    return (
        <main className="flex items-center justify-center min-h-screen bg-background p-4">
            <InitializingScreen />
        </main>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
            <Gamepad2 className="text-primary w-6 h-6"/>
            <h1 className="text-xl font-bold tracking-tighter">SketchVerse</h1>
        </div>
        <WordDisplay word={gameState.currentWord} isDrawer={!!isDrawer} />
        <Button onClick={startNewRound} variant="outline" size="sm">New Round</Button>
      </header>
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        <aside className="lg:col-span-2 flex flex-col gap-4">
          <Scoreboard players={gameState.players} />
        </aside>
        <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-video w-full">
                <DrawingCanvas ref={canvasRef} toolSettings={toolSettings} isDrawer={!!isDrawer} />
            </div>
            {isDrawer && <Toolbar toolSettings={toolSettings} onSettingsChange={setToolSettings} onClear={handleClearCanvas}/>}
        </div>
        <aside className="lg:col-span-3 flex flex-col">
          <ChatPanel 
            messages={gameState.messages}
            turnEndsAt={gameState.turnEndsAt}
            isDrawer={!!isDrawer}
            onSendMessage={handleSendMessage}
            onGetHint={handleGetHint}
            isGuessed={isGuessed}
          />
        </aside>
      </main>
    </div>
  );
}
