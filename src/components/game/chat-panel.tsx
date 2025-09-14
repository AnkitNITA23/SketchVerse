'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Send, MessageSquareText, BrainCircuit, Bot } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  messages: Message[];
  turnEndsAt: number;
  isDrawer: boolean;
  isGuessed: boolean;
  onSendMessage: (text: string) => void;
  onGetHint: () => void;
}

const Timer: FC<{ turnEndsAt: number }> = ({ turnEndsAt }) => {
  const totalDuration = 90; // 90 seconds
  const [timeLeft, setTimeLeft] = useState(totalDuration);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const remaining = Math.round((turnEndsAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [turnEndsAt]);
  
  const progress = (timeLeft / totalDuration) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-muted-foreground">Time Left</span>
        <span className="text-sm font-mono font-semibold">{timeLeft}s</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

export const ChatPanel: FC<ChatPanelProps> = ({ messages, turnEndsAt, isDrawer, isGuessed, onSendMessage, onGetHint }) => {
  const [guess, setGuess] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && !isDrawer && !isGuessed) {
      onSendMessage(guess.trim());
      setGuess('');
    }
  };

  return (
    <Card className="flex flex-col h-full w-full">
      <CardHeader>
        <Timer turnEndsAt={turnEndsAt} />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex items-start gap-3 text-sm',
                  msg.type === 'system' && 'justify-center',
                  msg.type === 'hint' && 'justify-center'
                )}
              >
                {msg.type === 'guess' && (
                  <>
                    <Avatar className="w-8 h-8 border">
                      <AvatarFallback className="text-xs">{msg.playerName?.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{msg.playerName}</p>
                      <p className="text-muted-foreground">{msg.text}</p>
                    </div>
                  </>
                )}
                {msg.type === 'system' && (
                  <p className="text-xs text-accent text-center italic p-2 bg-muted/50 rounded-lg">
                    <MessageSquareText className="inline-block w-4 h-4 mr-2" />
                    {msg.text}
                  </p>
                )}
                {msg.type === 'hint' && (
                  <p className="text-xs text-primary text-center italic p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <BrainCircuit className="inline-block w-4 h-4 mr-2" />
                    {msg.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 flex-col gap-2">
         {!isDrawer && (
             <Button variant="outline" size="sm" className="w-full" onClick={onGetHint}>
                <Lightbulb className="mr-2 h-4 w-4" />
                Get a Hint from AI
             </Button>
         )}
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <Input
            type="text"
            placeholder={isDrawer ? "You're the drawer!" : isGuessed ? "You guessed it!" : "Type your guess..."}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={isDrawer || isGuessed}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isDrawer || isGuessed || !guess.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};
