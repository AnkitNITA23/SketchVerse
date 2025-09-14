'use client';

import type { FC } from 'react';
import { Paintbrush, Eraser, Trash2, Brush } from 'lucide-react';
import type { ToolSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface ToolbarProps {
  toolSettings: ToolSettings;
  onSettingsChange: (settings: ToolSettings) => void;
  onClear: () => void;
}

const COLORS = ['#FFFFFF', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#64748B', '#000000'];

export const Toolbar: FC<ToolbarProps> = ({ toolSettings, onSettingsChange, onClear }) => {
  
  const eraserColor = useMemo(() => {
    // This is a trick to get the background color of the canvas
    // In a real app, this should be handled more elegantly e.g. via CSS variables
    if (typeof window !== 'undefined') {
        const style = window.getComputedStyle(document.body);
        const cardColor = style.getPropertyValue('--card');
        if (cardColor) return `hsl(${cardColor.trim()})`;
    }
    return 'hsl(222 84% 4.9%)'; // Fallback to the default dark card color
  }, []);

  const isEraser = toolSettings.color === eraserColor;

  const handleColorChange = (color: string) => {
    onSettingsChange({ ...toolSettings, color });
  };

  const handleBrushSizeChange = (size: number[]) => {
    onSettingsChange({ ...toolSettings, brushSize: size[0] });
  };

  const handleEraser = () => {
    onSettingsChange({ ...toolSettings, color: eraserColor });
  };
  
  return (
    <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-card border">
      <div className="flex items-center gap-1">
        {COLORS.map((color) => (
          <Button
            key={color}
            variant="outline"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-full border-2',
              toolSettings.color === color && !isEraser && 'border-primary ring-2 ring-primary'
            )}
            style={{ backgroundColor: color }}
            onClick={() => handleColorChange(color)}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Brush className="w-5 h-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-4">
          <div className="space-y-4">
            <label className="text-sm font-medium">Brush Size</label>
            <Slider
              value={[toolSettings.brushSize]}
              onValueChange={handleBrushSizeChange}
              max={50}
              step={1}
              min={1}
            />
          </div>
        </PopoverContent>
      </Popover>

      <Button 
        variant="outline" 
        size="icon" 
        className={cn("h-9 w-9", isEraser && 'bg-primary/10')} 
        onClick={handleEraser}
      >
        <Eraser className="w-5 h-5" />
      </Button>
      <Button variant="destructive" size="icon" className="h-9 w-9" onClick={onClear}>
        <Trash2 className="w-5 h-5" />
      </Button>
    </div>
  );
};

    