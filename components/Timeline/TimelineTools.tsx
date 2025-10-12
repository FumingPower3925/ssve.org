'use client';

import React from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Button } from '@/components/ui/button';
import { Scissors, ChevronRight, ChevronLeft, Gauge } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

export function TimelineTools() {
  const { selectedClipId, splitClip, playback, updateClip, tracks } = useEditorStore();
  const [showSpeedDialog, setShowSpeedDialog] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);

  const selectedClip = tracks
    .flatMap(t => t.clips)
    .find(c => c.id === selectedClipId);

  const handleSplit = () => {
    if (selectedClipId) {
      splitClip(selectedClipId, playback.currentTime);
    }
  };

  const handleSpeedChange = () => {
    if (selectedClip) {
      const newDuration = (selectedClip.trimEnd - selectedClip.trimStart) / speed;
      updateClip(selectedClip.id, { duration: newDuration });
      setShowSpeedDialog(false);
    }
  };

  const handleTrimStart = () => {
    if (selectedClip && playback.currentTime >= selectedClip.startTime && playback.currentTime < selectedClip.startTime + selectedClip.duration) {
      const relativeTime = playback.currentTime - selectedClip.startTime;
      const newTrimStart = selectedClip.trimStart + relativeTime;
      const newDuration = selectedClip.duration - relativeTime;
      updateClip(selectedClip.id, {
        startTime: playback.currentTime,
        trimStart: newTrimStart,
        duration: newDuration,
      });
    }
  };

  const handleTrimEnd = () => {
    if (selectedClip && playback.currentTime >= selectedClip.startTime && playback.currentTime < selectedClip.startTime + selectedClip.duration) {
      const relativeTime = playback.currentTime - selectedClip.startTime;
      updateClip(selectedClip.id, {
        duration: relativeTime,
        trimEnd: selectedClip.trimStart + relativeTime,
      });
    }
  };

  return (
    <div className="flex items-center gap-1 border-r pr-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!selectedClip}
            onClick={handleSplit}
          >
            <Scissors className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Split at playhead</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={showSpeedDialog} onOpenChange={setShowSpeedDialog}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!selectedClip}
              >
                <Gauge className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Adjust speed</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Clip Speed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Speed: {speed.toFixed(2)}x</label>
                <span className="text-xs text-muted-foreground">
                  {speed < 1 ? 'Slower' : speed > 1 ? 'Faster' : 'Normal'}
                </span>
              </div>
              <Slider
                value={[speed]}
                min={0.25}
                max={4}
                step={0.25}
                onValueChange={(v) => setSpeed(v[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.25x</span>
                <span>1x</span>
                <span>4x</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Note: Speed changes affect duration. Audio pitch may be affected.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSpeedDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSpeedChange}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

