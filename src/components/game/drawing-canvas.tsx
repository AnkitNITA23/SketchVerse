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

export const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(({ toolSettings, isDrawer, initialPoints, onDraw, gameStatus }, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const redraw = (points: DrawingPoint[]) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length === 0) return;

    let lastPoint: DrawingPoint | null = null;

    points.forEach((p) => {
        if(p.type === 'clear') {
            context.clearRect(0, 0, canvas.width, canvas.height);
            lastPoint = null;
            return;
        }

        if (!p.settings || !p.coords) return;

        context.strokeStyle = p.settings.color;
        context.lineWidth = p.settings.brushSize;

        if (p.type === 'start') {
            context.beginPath();
            context.moveTo(p.coords.x, p.coords.y);
        }
        
        if ((p.type === 'draw' || p.type === 'start') && lastPoint?.coords) {
             context.lineTo(p.coords.x, p.coords.y);
             context.stroke();
        }
        
        if (p.type === 'end') {
            context.closePath();
            lastPoint = null;
        } else {
            lastPoint = p;
        }
    });
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

            const context = canvas.getContext('2d');
            if (context) {
                context.lineCap = 'round';
                context.lineJoin = 'round';
                contextRef.current = context;
                redraw(initialPoints);
            }
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
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const event = e instanceof MouseEvent ? e : e.touches[0];
    if(!event) return { x: 0, y: 0};
    
    return { 
        x: (event.clientX - rect.left), 
        y: (event.clientY - rect.top)
    };
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    e.preventDefault();
    const { x, y } = getCoords(e.nativeEvent);
    onDraw({ type: 'start', coords: { x, y }, settings: toolSettings });
    setIsDrawing(true);
  };

  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    onDraw({ type: 'end', coords: { x: -1, y: -1 }, settings: toolSettings });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const { x, y } = getCoords(e.nativeEvent);
    onDraw({ type: 'draw', coords: { x, y }, settings: toolSettings });
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
        {!isDrawer && gameStatus === 'playing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent rounded-lg pointer-events-none">
                {/* This div is now transparent and doesn't block the view */}
            </div>
        )}
         {!isDrawer && gameStatus !== 'playing' && (
             <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
                <p className="text-muted-foreground font-medium">Waiting for the drawer...</p>
            </div>
        )}
    </>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';