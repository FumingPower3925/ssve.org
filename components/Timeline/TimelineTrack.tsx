'use client';

import React from 'react';
import { Track } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';
import { TimelineClip } from './TimelineClip';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface TimelineTrackProps {
  track: Track;
  zoom: number;
  onDrop: (e: React.DragEvent) => void;
}

export function TimelineTrack({ track, zoom, onDrop }: TimelineTrackProps) {
  const { updateTrack } = useEditorStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const toggleMute = () => {
    updateTrack(track.id, { muted: !track.muted });
  };

  const handleVolumeChange = (value: number[]) => {
    updateTrack(track.id, { volume: value[0] });
  };

  const toggleNoiseReduction = () => {
    if (track.type === 'audio') {
      updateTrack(track.id, { noiseReduction: !track.noiseReduction });
    }
  };

  return (
    <div className="flex items-stretch border-b hover:bg-muted/5">
      <div className="shrink-0 border-r p-2 flex flex-col justify-center bg-muted/10" style={{ width: '60px' }}>
        <div className="text-xs font-medium truncate">{track.name}</div>
        {track.id !== 'text-track' && (
          <div className="flex items-center gap-0.5 mt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={toggleMute}
            >
              {track.muted ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-1 text-xs">
                  {track.volume}%
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{track.name} Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Volume: {track.volume}%</label>
                    <Slider
                      value={[track.volume]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                    />
                  </div>
                  
                  {track.type === 'audio' && (
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Noise Reduction</label>
                      <Button
                        variant={track.noiseReduction ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleNoiseReduction}
                      >
                        {track.noiseReduction ? 'On' : 'Off'}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div
        className="relative h-12 bg-background"
        style={{ minWidth: '100%' }}
        onDrop={onDrop}
        onDragOver={handleDragOver}
      >
        {track.clips.map((clip) => (
          <TimelineClip key={clip.id} clip={clip} zoom={zoom} trackId={track.id} />
        ))}
      </div>
    </div>
  );
}

