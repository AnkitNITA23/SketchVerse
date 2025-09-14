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
    let currentPath: DrawingPoint[] = [];

    const drawPath = (path: DrawingPoint[]) => {
      if(path.length < 2) return;
      
      const firstPoint = path[0];
      context.strokeStyle = firstPoint.settings.color;
      context.lineWidth = firstPoint.settings.brushSize;
      
      context.beginPath();
      context.moveTo(firstPoint.coords.x, firstPoint.coords.y);

      path.forEach(p => {
        context.lineTo(p.coords.x, p.coords.y);
      });
      context.stroke();
    }
    
    points.forEach((p, index) => {
        if(p.type === 'clear') {
            context.clearRect(0, 0, canvas.width, canvas.height);
            currentPath = [];
            return;
        }

        if (p.type === 'start') {
            if(currentPath.length > 0) {
              drawPath(currentPath);
            }
            currentPath = [p];
        } else if (p.type === 'draw') {
             currentPath.push(p);
        } else if (p.type === 'end') {
            if(currentPath.length > 0) {
              currentPath.push(p);
              drawPath(currentPath);
            }
            currentPath = [];
        }

        if(index === points.length -1 && currentPath.length > 0) {
            drawPath(currentPath);
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

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (context) {
            context.lineCap = 'round';
            context.lineJoin = 'round';
            contextRef.current = context;
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
    
    return { 
        x: (event.clientX - rect.left), 
        y: (event.clientY - rect.top)
    };
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    e.preventDefault();
    const { x, y } = getCoords(e.nativeEvent);
    const pointData = { type: 'start' as const, coords: { x, y }, settings: toolSettings };
    onDraw(pointData);
    
    const context = contextRef.current;
    if(!context) return;
    context.strokeStyle = toolSettings.color;
    context.lineWidth = toolSettings.brushSize;
    context.beginPath();
    context.moveTo(x, y);

    setIsDrawing(true);
    lastPointRef.current = { x, y };
  };

  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawing) return;
    e.preventDefault();
    
    const context = contextRef.current;
    if(context) context.closePath();
    
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

    const context = contextRef.current;
    if(context) {
        context.lineTo(x, y);
        context.stroke();
    }
    
    onDraw({ type: 'draw', coords: { x, y }, settings: toolSettings });
    lastPointRef.current = { x, y };
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
