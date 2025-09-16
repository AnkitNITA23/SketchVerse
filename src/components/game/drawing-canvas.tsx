
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

const THROTTLE_MS = 50; // Send updates more frequently for smoother drawing

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

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);

    let lastPoint: DrawingPoint | null = null;
    let currentPathPoints: DrawingPoint[] = [];

    const strokePath = (pathPoints: DrawingPoint[]) => {
      if (pathPoints.length < 2 || !pathPoints[0].settings) return;
      
      const firstPoint = pathPoints[0];
      const scaledBrushSize = firstPoint.settings.brushSize * (canvas.width / 1000); // Scale brush size
      
      context.strokeStyle = firstPoint.settings.color;
      context.lineWidth = scaledBrushSize;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.globalCompositeOperation = firstPoint.settings.color === ERASER_COLOR ? 'destination-out' : 'source-over';
      
      context.beginPath();
      context.moveTo(firstPoint.coords!.x * canvas.width, firstPoint.coords!.y * canvas.height);

      for (let i = 1; i < pathPoints.length; i++) {
        const point = pathPoints[i];
        context.lineTo(point.coords!.x * canvas.width, point.coords!.y * canvas.height);
      }
      context.stroke();
    };

    initialPoints.forEach(point => {
      if (point.type === 'clear') {
        context.clearRect(0, 0, canvas.width, canvas.height);
        currentPathPoints = [];
        return;
      }

      if (!point.coords || !point.settings) return;

      if (point.type === 'start') {
        if (currentPathPoints.length > 0) {
          strokePath(currentPathPoints);
        }
        currentPathPoints = [point];
      } else if (point.type === 'draw') {
        currentPathPoints.push(point);
      } else if (point.type === 'end') {
        currentPathPoints.push(point);
        strokePath(currentPathPoints);
        currentPathPoints = [];
      }
      lastPoint = point;
    });

    if (currentPathPoints.length > 0) {
      strokePath(currentPathPoints);
    }
    
    // Reset composite operation
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
            redraw();
        }
    });
    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    redraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPoints]);

  const getCoords = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const event = e instanceof MouseEvent ? e : e.touches[0];
    if(!event) return null;
    
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
    if (!isDrawer || gameStatus !== 'playing') return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;
    
    setIsDrawing(true);

    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (context && canvas) {
        const scaledBrushSize = toolSettings.brushSize * (canvas.width / 1000);
        context.lineWidth = scaledBrushSize;
        context.strokeStyle = toolSettings.color;
        context.globalCompositeOperation = toolSettings.color === ERASER_COLOR ? 'destination-out' : 'source-over';
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(coords.x * canvas.width, coords.y * canvas.height);
    }
    
    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'start', coords, settings: toolSettings };
    onDraw(point);
  };

  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    
    sendBatchedPoints();
    const coords = getCoords(e.nativeEvent);
    if (coords) {
        const point: Omit<DrawingPoint, 'timestamp'> = { type: 'end', coords, settings: toolSettings };
        onDraw(point);
    }
    
    setIsDrawing(false);
    contextRef.current?.closePath();
    batchedPoints.current = [];
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const coords = getCoords(e.nativeEvent);
    if (!coords) return;

    // Draw locally for immediate feedback
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (context && canvas) {
        context.lineTo(coords.x * canvas.width, coords.y * canvas.height);
        context.stroke();
    }
    
    const point: Omit<DrawingPoint, 'timestamp'> = { type: 'draw', coords, settings: toolSettings };
    addPointToBatch(point);
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
            className={cn("absolute top-0 left-0 w-full h-full bg-transparent", isDrawer ? "cursor-crosshair" : "cursor-not-allowed")}
        />
        {gameStatus !== 'playing' && (
             <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg pointer-events-none">
                <p className="text-muted-foreground font-medium text-lg animate-pulse">
                    {gameStatus === 'ended' ? 'Game has ended!' : 'Waiting for the next round...'}
                </p>
            </div>
        )}
    </>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

    