'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TimelineClip as TimelineClipType } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface TimelineClipProps {
  clip: TimelineClipType;
  zoom: number;
  trackId: string;
}

export function TimelineClip({ clip, zoom, trackId }: TimelineClipProps) {
  const { 
    updateClip, 
    removeClip, 
    selectClip, 
    selectedClipId, 
    assets,
    splitClip,
    playback,
    tracks 
  } = useEditorStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0, duration: 0 });
  const clipRef = useRef<HTMLDivElement>(null);

  const asset = assets.find(a => a.id === clip.assetId);
  const isSelected = selectedClipId === clip.id;

  const track = tracks.find(t => t.id === trackId);
  const otherClips = track?.clips.filter(c => c.id !== clip.id) || [];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    selectClip(clip.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, startTime: clip.startTime, duration: clip.duration });
  };

  const handleResizeLeftStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectClip(clip.id);
    setIsResizingLeft(true);
    setDragStart({ x: e.clientX, startTime: clip.startTime, duration: clip.duration });
  };

  const handleResizeRightStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectClip(clip.id);
    setIsResizingRight(true);
    setDragStart({ x: e.clientX, startTime: clip.startTime, duration: clip.duration });
  };

  const snapToPosition = (time: number, snapThreshold = 0.5): number => {
    for (const otherClip of otherClips) {
      if (Math.abs(time - otherClip.startTime) < snapThreshold) {
        return otherClip.startTime;
      }
      const otherEnd = otherClip.startTime + otherClip.duration;
      if (Math.abs(time - otherEnd) < snapThreshold) {
        return otherEnd;
      }
    }
    return time;
  };

  const wouldOverlap = (startTime: number, duration: number): boolean => {
    const endTime = startTime + duration;
    for (const otherClip of otherClips) {
      const otherEnd = otherClip.startTime + otherClip.duration;
      if (startTime < otherEnd && endTime > otherClip.startTime) {
        return true;
      }
    }
    return false;
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - dragStart.x;
    const deltaTime = deltaX / zoom;

    if (Math.abs(deltaX) < 3) return;

    if (isDragging) {
      let newStartTime = Math.max(0, dragStart.startTime + deltaTime);
      newStartTime = snapToPosition(newStartTime);
      if (!wouldOverlap(newStartTime, clip.duration)) {
        updateClip(clip.id, { startTime: newStartTime });
      }
    } else if (isResizingLeft) {
      let newStartTime = Math.max(0, dragStart.startTime + deltaTime);
      const newDuration = dragStart.startTime + dragStart.duration - newStartTime;
      const newTrimStart = clip.trimStart + (newStartTime - dragStart.startTime);
      
      if (newDuration > 0.5 && newTrimStart >= 0) {
        newStartTime = snapToPosition(newStartTime);
        const finalDuration = dragStart.startTime + dragStart.duration - newStartTime;
        const finalTrimStart = clip.trimStart + (newStartTime - dragStart.startTime);
        
        if (!wouldOverlap(newStartTime, finalDuration)) {
          updateClip(clip.id, {
            startTime: newStartTime,
            duration: finalDuration,
            trimStart: finalTrimStart,
          });
        }
      }
    } else if (isResizingRight) {
      const newDuration = Math.max(0.5, dragStart.duration + deltaTime);
      const maxDuration = (asset?.duration || dragStart.duration) - clip.trimStart;
      const finalDuration = Math.min(newDuration, maxDuration);
      const newTrimEnd = clip.trimStart + finalDuration;
      
      if (!wouldOverlap(clip.startTime, finalDuration)) {
        updateClip(clip.id, {
          duration: finalDuration,
          trimEnd: newTrimEnd,
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizingLeft(false);
    setIsResizingRight(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeClip(clip.id);
  };

  const handleSplit = (e: React.MouseEvent) => {
    e.stopPropagation();
    splitClip(clip.id, playback.currentTime);
  };

  useEffect(() => {
    if (isDragging || isResizingLeft || isResizingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizingLeft, isResizingRight, dragStart, clip]);

  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeClip(clip.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, clip.id, removeClip]);

  return (
    <div
      ref={clipRef}
      className={cn(
        'absolute top-1 bottom-1 rounded border-2 cursor-move overflow-hidden group',
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        asset?.type === 'video' ? 'bg-blue-500/20' : 
        asset?.type === 'audio' ? 'bg-green-500/20' : 'bg-purple-500/20'
      )}
      style={{
        left: `${clip.startTime * zoom}px`,
        width: `${clip.duration * zoom}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/50"
        onMouseDown={handleResizeLeftStart}
      />

      <div className="px-2 py-1 flex flex-col justify-center h-full pointer-events-none">
        <div className="text-xs font-medium truncate">{asset?.name}</div>
        {clip.muted && (
          <div className="text-xs text-muted-foreground">Muted</div>
        )}
      </div>

      {isSelected && (
        <div className="absolute top-1 right-1 flex gap-1 pointer-events-auto">
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="text-xs bg-background border rounded px-1 hover:bg-accent"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings className="h-3 w-3" />
              </button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>Clip Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Volume: {clip.volume}%</Label>
                  <Slider
                    value={[clip.volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(val) => updateClip(clip.id, { volume: val[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Fade In: {clip.fadeIn || 0}s</Label>
                  <Slider
                    value={[clip.fadeIn || 0]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueChange={(val) => updateClip(clip.id, { fadeIn: val[0] })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Fade Out: {clip.fadeOut || 0}s</Label>
                  <Slider
                    value={[clip.fadeOut || 0]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueChange={(val) => updateClip(clip.id, { fadeOut: val[0] })}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <button
            className="text-xs bg-background border rounded px-1 hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
          >
            ✕
          </button>
        </div>
      )}

      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/50"
        onMouseDown={handleResizeRightStart}
      />
    </div>
  );
}

