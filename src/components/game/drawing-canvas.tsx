
'use client';

import type { FC } from 'react';
import React, { useRef, useEffect, useState, forwardRef, useCallback } from 'react';
import type { ToolSettings, DrawingPoint } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  
  const lastDrawTime = useRef(0);
  const batchedPoints = useRef<Omit<DrawingPoint, 'timestamp'>[]>([]);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);

  const getCanvasBackgroundColor = (canvas: HTMLCanvasElement | null): string => {
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        return getComputedStyle(parent).getPropertyValue('--card').trim();
      }
    }
    // Fallback based on your globals.css
    return 'hsl(222 84% 4.9%)';
  };

  const redraw = useCallback((canvas: HTMLCanvasElement | null, pointsToDraw: DrawingPoint[]) => {
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
      const isErasing = point.settings.color === getCanvasBackgroundColor(canvas);

      context.lineWidth = scaledBrushSize;
      context.strokeStyle = point.settings.color;
      context.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
      context.lineCap = 'round';
      context.lineJoin = 'round';

      const x = point.coords.x * canvas.width;
      const y = point.coords.y * canvas.height;

      if ((point.type === 'start' || point.type === 'end') && lastPoint?.type !== 'draw') {
        if (!isErasing) {
          context.beginPath();
          context.arc(x, y, scaledBrushSize/2, 0, 2*Math.PI);
          context.fillStyle = point.settings.color;
          context.fill();
        }
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
  }, []);
  
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
  }, [initialPoints, redraw]);
  
  // Redraw main canvas when points update
  useEffect(() => {
    redraw(canvasRef.current, initialPoints);
  }, [initialPoints, redraw]);

  const getCoords = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const event = e instanceof MouseEvent ? e : e.touches[0];
    if(!event) return null;
    
    let x = (event.clientX - rect.left) / rect.width;
    let y = (event.clientY - rect.top) / rect.height;

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

    const currentToolSettings = { ...toolSettings, color: toolSettings.color === 'ERASER' ? getCanvasBackgroundColor(localCanvasRef.current) : toolSettings.color };

    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'start', coords, settings: currentToolSettings };
    onDraw(point);
    
    // Also draw starting point on local canvas
    const localCtx = localCanvasRef.current?.getContext('2d');
    const localCanvas = localCanvasRef.current;
    if(localCtx && localCanvas) {
      const scaledBrushSize = currentToolSettings.brushSize * (localCanvas.width / 1000);
      const isErasing = currentToolSettings.color === getCanvasBackgroundColor(localCanvas);

      localCtx.lineWidth = scaledBrushSize;
      localCtx.strokeStyle = currentToolSettings.color;
      localCtx.fillStyle = currentToolSettings.color;
      localCtx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
      localCtx.lineCap = 'round';
      localCtx.lineJoin = 'round';

      if (!isErasing) {
        localCtx.beginPath();
        localCtx.arc(coords.x * localCanvas.width, coords.y * localCanvas.height, scaledBrushSize/2, 0, 2 * Math.PI);
        localCtx.fill();
      }
    }
  };

  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    
    batchedPoints.current.forEach(p => onDraw(p));
    batchedPoints.current = [];

    const coords = getCoords(e.nativeEvent);
    const currentToolSettings = { ...toolSettings, color: toolSettings.color === 'ERASER' ? getCanvasBackgroundColor(localCanvasRef.current) : toolSettings.color };

    if (coords) {
        const point: Omit<DrawingPoint, 'timestamp'> = { type: 'end', coords, settings: currentToolSettings };
        onDraw(point);
    }
    
    setIsDrawing(false);
    lastPointRef.current = null;

    setTimeout(() => {
        const localCtx = localCanvasRef.current?.getContext('2d');
        if (localCtx) {
            localCtx.clearRect(0, 0, localCanvasRef.current!.width, localCanvasRef.current!.height);
        }
        redraw(canvasRef.current, initialPoints);
    }, THROTTLE_MS + 10);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;
    
    const localCtx = localCanvasRef.current?.getContext('2d');
    const localCanvas = localCanvasRef.current;
    const currentToolSettings = { ...toolSettings, color: toolSettings.color === 'ERASER' ? getCanvasBackgroundColor(localCanvas) : toolSettings.color };

    if (localCtx && localCanvas && lastPointRef.current) {
        const scaledBrushSize = currentToolSettings.brushSize * (localCanvas.width / 1000);
        const isErasing = currentToolSettings.color === getCanvasBackgroundColor(localCanvas);
        
        localCtx.lineWidth = scaledBrushSize;
        localCtx.strokeStyle = currentToolSettings.color;
        localCtx.lineCap = 'round';
        localCtx.lineJoin = 'round';
        localCtx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        
        localCtx.beginPath();
        localCtx.moveTo(lastPointRef.current.x * localCanvas.width, lastPointRef.current.y * localCanvas.height);
        localCtx.lineTo(coords.x * localCanvas.width, coords.y * localCanvas.height);
        localCtx.stroke();
    }
    lastPointRef.current = coords;

    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'draw', coords, settings: currentToolSettings };
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

    