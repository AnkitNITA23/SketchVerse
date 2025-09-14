'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gamepad2, Pencil, Users } from 'lucide-react';

const createRoom = async () => {
  // A real implementation would call a server action or API route
  // to create a unique room ID in Firebase.
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="flex items-center gap-4 mb-8">
        <Gamepad2 className="text-primary h-12 w-12" />
        <h1 className="text-5xl font-bold tracking-tighter text-foreground">
          SketchVerse
        </h1>
      </div>
      <p className="max-w-xl text-center text-lg text-muted-foreground mb-12">
        Unleash your inner artist in a real-time multiplayer drawing and guessing game. Create a room, invite your friends, and let the fun begin!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="flex flex-col">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                <Pencil className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Create a New Room</CardTitle>
            <CardDescription>Start a new game and invite your friends to join.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            <Button
              size="lg"
              onClick={handleCreateRoom}
              disabled={isCreating || isJoining}
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Join an Existing Room</CardTitle>
            <CardDescription>Enter a room code to jump into a game with friends.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4 w-full max-w-sm">
              <Input
                type="text"
                placeholder="Enter Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={6}
              />
              <Button type="submit" size="lg" disabled={isCreating || isJoining || !roomCode.trim()}>
                {isJoining ? 'Joining...' : 'Join Room'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <footer className="mt-16 text-sm text-muted-foreground">
        <p>Built with Next.js, Firebase, and a sprinkle of AI magic ✨</p>
      </footer>
    </main>
  );
}
