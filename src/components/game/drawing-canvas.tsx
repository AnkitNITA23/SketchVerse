'use client';

import type { FC } from 'react';
import React, { useRef, useEffect, useState, forwardRef } from 'react';
import type { ToolSettings, DrawingPoint } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  toolSettings: ToolSettings;
  isDrawer: boolean;
  initialPoints: DrawingPoint[];
  onDraw: (point: Omit<DrawingPoint, 'timestamp'>) => void;
  gameStatus: 'playing' | 'ended' | 'waiting';
}

// Throttle drawing events to avoid overwhelming Firestore
const THROTTLE_MS = 100;

export const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(({ toolSettings, isDrawer, initialPoints, onDraw, gameStatus }, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const lastDrawTime = useRef(0);
  const batchedPoints = useRef<Omit<DrawingPoint, 'timestamp'>[]>([]);

  const sendBatchedPoints = () => {
    if (batchedPoints.current.length > 0) {
      batchedPoints.current.forEach(p => onDraw(p));
      batchedPoints.current = [];
    }
  };

  const redraw = (points: DrawingPoint[]) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length === 0) return;

    let lastPoint: DrawingPoint | null = null;
    for (const point of points) {
        if (!point.coords || !point.settings) continue;

        context.strokeStyle = point.settings.color;
        context.lineWidth = point.settings.brushSize;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        
        // Use globalCompositeOperation for the eraser
        context.globalCompositeOperation = point.settings.color === 'hsl(222 84% 4.9%)' ? 'destination-out' : 'source-over';
        
        if (point.type === 'start') {
            context.beginPath();
            context.moveTo(point.coords.x * canvas.width, point.coords.y * canvas.height);
        } else if (point.type === 'draw' && lastPoint?.type !== 'end') {
            context.lineTo(point.coords.x * canvas.width, point.coords.y * canvas.height);
            context.stroke();
        } else if (point.type === 'end') {
            context.closePath();
        }
        lastPoint = point;
    }
    // Set composite operation back to default
    context.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const parent = canvas.parentElement;
    if(!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
            contextRef.current = canvas.getContext('2d');
            redraw(initialPoints);
        }
    });
    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redraw(initialPoints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPoints]);

  const getCoords = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const event = e instanceof MouseEvent ? e : e.touches[0];
    if(!event) return null;
    
    // Normalize coordinates to be between 0 and 1
    // This makes them independent of the canvas size and aspect ratio
    return { 
        x: (event.clientX - rect.left) / canvas.width, 
        y: (event.clientY - rect.top) / canvas.height
    };
  }
  
  const addPointToBatch = (point: Omit<DrawingPoint, 'timestamp'>) => {
    batchedPoints.current.push(point);
    const now = Date.now();
    if(now - lastDrawTime.current > THROTTLE_MS) {
        sendBatchedPoints();
        lastDrawTime.current = now;
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;

    setIsDrawing(true);
    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'start', coords, settings: toolSettings };
    onDraw(point); // Send start immediately
    redraw([...initialPoints, point]);
  };

  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;
    
    sendBatchedPoints(); // Send any remaining points
    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'end', coords, settings: toolSettings };
    onDraw(point);
    setIsDrawing(false);
    redraw([...initialPoints, ...batchedPoints.current, point]);
    batchedPoints.current = [];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;

    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'draw', coords, settings: toolSettings };
    addPointToBatch(point);
    
    // Draw locally for immediate feedback
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (context && canvas) {
        context.strokeStyle = toolSettings.color;
        context.lineWidth = toolSettings.brushSize;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.globalCompositeOperation = toolSettings.color === 'hsl(222 84% 4.9%)' ? 'destination-out' : 'source-over';
        context.lineTo(coords.x * canvas.width, coords.y * canvas.height);
        context.stroke();
    }
  };
  
  return (
    <>
        <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={finishDrawing}
            onMouseMove={draw}
            onMouseLeave={finishDrawing}
            onTouchStart={startDrawing}
            onTouchEnd={finishDrawing}
            onTouchMove={draw}
            className={cn("absolute top-0 left-0 w-full h-full bg-card rounded-lg border", isDrawer ? "cursor-crosshair" : "cursor-not-allowed")}
        />
        {gameStatus !== 'playing' && !isDrawer && (
             <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg pointer-events-none">
                <p className="text-muted-foreground font-medium">Waiting for the game to start...</p>
            </div>
        )}
    </>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
