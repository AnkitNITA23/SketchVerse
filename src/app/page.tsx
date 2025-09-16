'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Pencil, Users, Wand2 } from 'lucide-react';
import { Doodles } from '@/components/doodles';

const createRoom = async () => {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  return roomId;
};

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    const roomId = await createRoom();
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      setIsJoining(true);
      router.push(`/room/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 overflow-hidden relative">
        <Doodles />
      <div className="text-center mb-12 z-10 animate-bounce-in">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary">
          SketchVerse
        </h1>
        <p className="max-w-2xl mx-auto mt-4 text-lg text-muted-foreground">
            Where your silly doodles become legendary masterpieces. <br/> Draw, guess, and laugh your heart out with friends!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl z-10">
        <Card className="flex flex-col bg-card/80 backdrop-blur-sm border-primary/20 animate-bounce-in transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2" style={{animationDelay: '0.2s'}}>
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4 border-2 border-primary/30">
                <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Create a New Game</CardTitle>
            <CardDescription>Start a party and invite your friends to the fun zone.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            <Button
              size="lg"
              onClick={handleCreateRoom}
              disabled={isCreating || isJoining}
              className="font-bold text-lg shadow-lg shadow-primary/20 hover:scale-105 transition-transform hover:shadow-xl hover:shadow-primary/30"
            >
              {isCreating ? 'Summoning a Room...' : 'Create Room'}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col bg-card/80 backdrop-blur-sm border-secondary/20 animate-bounce-in transition-all duration-300 hover:border-secondary/40 hover:shadow-2xl hover:shadow-secondary/20 hover:-translate-y-2" style={{animationDelay: '0.4s'}}>
          <CardHeader className="text-center">
            <div className="mx-auto bg-secondary/10 p-4 rounded-full w-fit mb-4 border-2 border-secondary/30">
                <Users className="h-8 w-8 text-secondary" />
            </div>
            <CardTitle className="text-2xl font-bold">Join the Shenanigans</CardTitle>
            <CardDescription>Got a secret code? Jump into an existing game.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4 w-full max-w-sm">
              <Input
                type="text"
                placeholder="ENTER SECRET CODE"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="text-center text-xl tracking-widest font-black"
                maxLength={6}
              />
              <Button variant="secondary" type="submit" size="lg" disabled={isCreating || isJoining || !roomCode.trim()} className="font-bold text-lg shadow-lg shadow-secondary/20 hover:scale-105 transition-transform hover:shadow-xl hover:shadow-secondary/30">
                {isJoining ? 'Crashing the Party...' : 'Join Room'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <footer className="mt-16 text-sm text-muted-foreground z-10">
        <p>Built with love ❤️ by Ankit Kumar</p>
      </footer>
    </main>
  );
}
