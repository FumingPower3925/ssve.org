'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type } from 'lucide-react';
import { TextOverlay } from '@/types/editor';
import { generateId } from '@/lib/utils';

export function TextOverlayDialog() {
  const { addTextOverlay, playback, addAsset, addClipToTrack } = useEditorStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('Your text here');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [position, setPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [duration, setDuration] = useState(5);
  const [fadeIn, setFadeIn] = useState(0.5);
  const [fadeOut, setFadeOut] = useState(0.5);

  const handleAdd = () => {
    const positionMap = {
      top: { x: 50, y: 15 },
      center: { x: 50, y: 50 },
      bottom: { x: 50, y: 85 },
    };

    const textOverlay: TextOverlay = {
      id: generateId(),
      text,
      startTime: playback.currentTime,
      duration,
      fontSize,
      fontFamily: 'Arial, sans-serif',
      color,
      backgroundColor: backgroundColor || undefined,
      position: positionMap[position],
      fadeIn,
      fadeOut,
    };

    addTextOverlay(textOverlay);

    const textAsset: any = {
      id: textOverlay.id,
      name: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
      type: 'text',
      file: null,
      url: '',
      duration: duration,
      size: 0,
      textData: textOverlay,
    };

    addAsset(textAsset);

    addClipToTrack('text-track', textOverlay.id, playback.currentTime);

    setOpen(false);
    setText('Your text here');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Type className="h-4 w-4 mr-2" />
          Add Text
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Text Overlay</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Text</label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Font Size: {fontSize}px</label>
              <Slider
                value={[fontSize]}
                min={16}
                max={120}
                step={1}
                onValueChange={(v) => setFontSize(v[0])}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration: {duration}s</label>
              <Slider
                value={[duration]}
                min={1}
                max={30}
                step={0.5}
                onValueChange={(v) => setDuration(v[0])}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Position</label>
            <Select value={position} onValueChange={(v: any) => setPosition(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Color</label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Background</label>
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="Transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fade In: {fadeIn}s</label>
              <Slider
                value={[fadeIn]}
                min={0}
                max={3}
                step={0.1}
                onValueChange={(v) => setFadeIn(v[0])}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fade Out: {fadeOut}s</label>
              <Slider
                value={[fadeOut]}
                min={0}
                max={3}
                step={0.1}
                onValueChange={(v) => setFadeOut(v[0])}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Text</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

