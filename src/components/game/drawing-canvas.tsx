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
}

export const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(({ toolSettings, isDrawer, initialPoints, onDraw }, ref) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number, y: number } | null>(null);

  const redraw = (points: DrawingPoint[]) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);

    let lastSettings = { color: '#000', brushSize: 5 };
    
    points.forEach((p) => {
        if(p.type === 'clear') {
            context.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        
        const { x, y, type } = p.coords;

        if (p.settings.color !== lastSettings.color) {
            context.strokeStyle = p.settings.color;
            lastSettings.color = p.settings.color;
        }
        if (p.settings.brushSize !== lastSettings.brushSize) {
            context.lineWidth = p.settings.brushSize;
            lastSettings.brushSize = p.settings.brushSize;
        }

        if (type === 'start') {
            context.beginPath();
            context.moveTo(x, y);
        } else if (type === 'draw') {
            context.lineTo(x, y);
            context.stroke();
        } else {
            context.closePath();
        }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const parent = canvas.parentElement;
    if(!parent) return;

    const resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        
        const currentDrawing = contextRef.current?.getImageData(0,0,canvas.width, canvas.height);

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const context = canvas.getContext('2d');
        if (context) {
            context.scale(dpr, dpr);
            context.lineCap = 'round';
            contextRef.current = context;
            if(currentDrawing) {
                // This is a simplified redraw on resize. For perfect scaling, one would need to scale the drawing commands.
                redraw(initialPoints);
            }
        }
    });

    resizeObserver.observe(parent);

    return () => resizeObserver.disconnect();
  }, [initialPoints]); // Should not depend on tool settings

  useEffect(() => {
    redraw(initialPoints);
  }, [initialPoints]);


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
    const event = e instanceof MouseEvent ? e : e.touches[0];
    if(!event) return { x: 0, y: 0};
    
    const dpr = window.devicePixelRatio || 1;
    return { 
        x: (event.clientX - rect.left) * dpr, 
        y: (event.clientY - rect.top) * dpr 
    };
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    e.preventDefault();
    const { x, y } = getCoords(e.nativeEvent);
    onDraw({ type: 'start', coords: { x, y }, settings: toolSettings });
    setIsDrawing(true);
    lastPointRef.current = { x, y };
  };

  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    lastPointRef.current = null;
    onDraw({ type: 'end', coords: { x: -1, y: -1 }, settings: toolSettings }); // Dummy coords
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const { x, y } = getCoords(e.nativeEvent);
    if(lastPointRef.current && (Math.abs(lastPointRef.current.x - x) < 2 && Math.abs(lastPointRef.current.y - y) < 2)){
        return; // Debounce points that are too close
    }
    onDraw({ type: 'draw', coords: { x, y }, settings: toolSettings });
    lastPointRef.current = { x, y };
  };
  
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

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

    