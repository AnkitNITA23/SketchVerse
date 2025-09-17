
'use client';

import type { FC } from 'react';
import React, { useRef, useEffect, useState, forwardRef } from 'react';
import type { ToolSettings, DrawingPoint } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ERASER_COLOR } from './toolbar';

interface DrawingCanvasProps {
  toolSettings: ToolSettings;
  isDrawer: boolean;
  initialPoints: DrawingPoint[];
  onDraw: (point: Omit<DrawingPoint, 'timestamp'>) => void;
  gameStatus: 'playing' | 'ended' | 'waiting';
}

const THROTTLE_MS = 50;

export const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(({ toolSettings, isDrawer, initialPoints, onDraw, gameStatus }, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;
  const localCanvasRef = useRef<HTMLCanvasElement>(null); // For immediate drawing feedback
  
  const [isDrawing, setIsDrawing] = useState(false);
  
  const lastDrawTime = useRef(0);
  const batchedPoints = useRef<Omit<DrawingPoint, 'timestamp'>[]>([]);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);

  const redraw = (canvas: HTMLCanvasElement | null, pointsToDraw: DrawingPoint[]) => {
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);

    let lastPoint: DrawingPoint | null = null;

    pointsToDraw.forEach(point => {
      if (point.type === 'clear') {
        context.clearRect(0, 0, canvas.width, canvas.height);
        lastPoint = null;
        return;
      }

      if (!point.coords || !point.settings) return;
      
      const scaledBrushSize = point.settings.brushSize * (canvas.width / 1000);
      context.lineWidth = scaledBrushSize;
      context.strokeStyle = point.settings.color;
      context.globalCompositeOperation = point.settings.color === ERASER_COLOR ? 'destination-out' : 'source-over';
      context.lineCap = 'round';
      context.lineJoin = 'round';

      const x = point.coords.x * canvas.width;
      const y = point.coords.y * canvas.height;

      if ((point.type === 'start' || point.type === 'end') && lastPoint?.type !== 'draw') {
        context.beginPath();
        context.arc(x, y, scaledBrushSize/2, 0, 2*Math.PI);
        context.fillStyle = point.settings.color;
        context.fill();
      } else if(lastPoint && lastPoint.coords) {
         context.beginPath();
         context.moveTo(lastPoint.coords.x * canvas.width, lastPoint.coords.y * canvas.height);
         context.lineTo(x, y);
         context.stroke();
      }
      
      if (point.type === 'end') {
          lastPoint = null;
      } else {
          lastPoint = point;
      }
    });

    context.globalCompositeOperation = 'source-over';
  };
  
  // Resize handler
  useEffect(() => {
    const mainCanvas = canvasRef.current;
    const localCanvas = localCanvasRef.current;
    if (!mainCanvas || !localCanvas) return;
    
    const parent = mainCanvas.parentElement;
    if(!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            mainCanvas.width = width;
            mainCanvas.height = height;
            localCanvas.width = width;
            localCanvas.height = height;
            redraw(mainCanvas, initialPoints);
        }
    });
    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPoints]); // Redraw with initialPoints when canvas resizes
  
  // Redraw main canvas when points update
  useEffect(() => {
    redraw(canvasRef.current, initialPoints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPoints]);

  const getCoords = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const event = e instanceof MouseEvent ? e : e.touches[0];
    if(!event) return null;
    
    // Normalize coordinates to be between 0 and 1
    let x = (event.clientX - rect.left) / rect.width;
    let y = (event.clientY - rect.top) / rect.height;

    // Clamp coordinates to prevent drawing outside the canvas
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    
    return { x, y };
  }
  
  const addPointToBatch = (point: Omit<DrawingPoint, 'timestamp'>) => {
    batchedPoints.current.push(point);
    const now = Date.now();
    if(now - lastDrawTime.current > THROTTLE_MS) {
        batchedPoints.current.forEach(p => onDraw(p));
        batchedPoints.current = [];
        lastDrawTime.current = now;
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || gameStatus !== 'playing') return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;
    
    setIsDrawing(true);
    lastPointRef.current = coords;

    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'start', coords, settings: toolSettings };
    onDraw(point);
    
    // Also draw starting point on local canvas
    const localCtx = localCanvasRef.current?.getContext('2d');
    const localCanvas = localCanvasRef.current;
    if(localCtx && localCanvas) {
      const scaledBrushSize = toolSettings.brushSize * (localCanvas.width / 1000);
      localCtx.lineWidth = scaledBrushSize;
      localCtx.strokeStyle = toolSettings.color;
      localCtx.fillStyle = toolSettings.color;
      localCtx.globalCompositeOperation = toolSettings.color === ERASER_COLOR ? 'destination-out' : 'source-over';
      localCtx.lineCap = 'round';
      localCtx.lineJoin = 'round';

      localCtx.beginPath();
      localCtx.arc(coords.x * localCanvas.width, coords.y * localCanvas.height, scaledBrushSize/2, 0, 2 * Math.PI);
      localCtx.fill();
    }
  };

  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    
    // Send any remaining points
    batchedPoints.current.forEach(p => onDraw(p));
    batchedPoints.current = [];

    const coords = getCoords(e.nativeEvent);
    if (coords) {
        const point: Omit<DrawingPoint, 'timestamp'> = { type: 'end', coords, settings: toolSettings };
        onDraw(point);
    }
    
    setIsDrawing(false);
    lastPointRef.current = null;

    // Clear the local canvas after drawing is done to prevent artifacts
    setTimeout(() => {
        const localCtx = localCanvasRef.current?.getContext('2d');
        if (localCtx) {
            localCtx.clearRect(0, 0, localCanvasRef.current!.width, localCanvasRef.current!.height);
        }
    }, THROTTLE_MS + 10);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;
    
    // Draw on the local canvas for immediate feedback
    const localCtx = localCanvasRef.current?.getContext('2d');
    const localCanvas = localCanvasRef.current;

    if (localCtx && localCanvas && lastPointRef.current) {
        const scaledBrushSize = toolSettings.brushSize * (localCanvas.width / 1000);
        localCtx.lineWidth = scaledBrushSize;
        localCtx.strokeStyle = toolSettings.color;
        localCtx.lineCap = 'round';
        localCtx.lineJoin = 'round';
        localCtx.globalCompositeOperation = toolSettings.color === ERASER_COLOR ? 'destination-out' : 'source-over';
        
        localCtx.beginPath();
        localCtx.moveTo(lastPointRef.current.x * localCanvas.width, lastPointRef.current.y * localCanvas.height);
        localCtx.lineTo(coords.x * localCanvas.width, coords.y * localCanvas.height);
        localCtx.stroke();
    }
    lastPointRef.current = coords;

    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'draw', coords, settings: toolSettings };
    addPointToBatch(point);
  };
  
  return (
    <>
        {/* The main canvas that shows the synchronized state */}
        <canvas
            ref={canvasRef}
            className={cn("absolute top-0 left-0 w-full h-full bg-transparent")}
        />
        {/* A second canvas for the drawer's immediate input */}
        <canvas
            ref={localCanvasRef}
            onMouseDown={startDrawing}
            onMouseUp={finishDrawing}
            onMouseMove={draw}
            onMouseLeave={finishDrawing}
            onTouchStart={startDrawing}
            onTouchEnd={finishDrawing}
            onTouchMove={draw}
            className={cn("absolute top-0 left-0 w-full h-full bg-transparent", isDrawer ? "cursor-crosshair" : "cursor-not-allowed", !isDrawer && gameStatus === 'playing' && 'hidden')}
        />
        {gameStatus !== 'playing' && (
             <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg pointer-events-none">
                <p className="text-muted-foreground font-medium text-lg animate-pulse">
                    {gameStatus === 'ended' ? 'Game has ended!' : 'Waiting for the next round...'}
                </p>
            </div>
        )}
         {!isDrawer && gameStatus === 'playing' && (
             <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">
            </div>
        )}
    </>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
