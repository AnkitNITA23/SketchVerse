'use client';

import type { FC } from 'react';
import React, { useRef, useEffect, useState, forwardRef } from 'react';
import type { ToolSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  toolSettings: ToolSettings;
  isDrawer: boolean;
}

export const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(({ toolSettings, isDrawer }, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const parent = canvas.parentElement;
    if(!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const context = canvas.getContext('2d');
        if (context) {
            context.scale(dpr, dpr);
            context.lineCap = 'round';
            context.strokeStyle = toolSettings.color;
            context.lineWidth = toolSettings.brushSize;
            contextRef.current = context;
        }
    });

    resizeObserver.observe(parent);

    return () => resizeObserver.disconnect();
  }, [toolSettings.color, toolSettings.brushSize]);

  useEffect(() => {
    if (contextRef.current) {
        contextRef.current.strokeStyle = toolSettings.color;
        contextRef.current.lineWidth = toolSettings.brushSize;
    }
  }, [toolSettings]);

  const getCoords = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e instanceof MouseEvent) {
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    if (e.touches[0]) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: 0, y: 0 };
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const context = contextRef.current;
    if (!context) return;
    const { x, y } = getCoords(e.nativeEvent);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (!isDrawer) return;
    const context = contextRef.current;
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    const context = contextRef.current;
    if (!context) return;
    const { x, y } = getCoords(e.nativeEvent);
    context.lineTo(x, y);
    context.stroke();
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
        {!isDrawer && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
                <p className="text-muted-foreground font-medium">Waiting for the drawer...</p>
            </div>
        )}
    </>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
