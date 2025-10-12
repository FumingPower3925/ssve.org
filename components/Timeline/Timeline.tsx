'use client';

import React, { useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrack } from './TimelineTrack';
import { TimelineTools } from './TimelineTools';

export function Timeline() {
  const { tracks, zoom, setZoom, playback, setPlayback, addClipToTrack } = useEditorStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const time = x / zoom;
    if (time >= 0) {
      setPlayback({ currentTime: time, isPlaying: false });
    }
  };

  const handlePlayheadDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
  };

  const handlePlayheadDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingPlayhead || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const time = Math.max(0, x / zoom);
    setPlayback({ currentTime: time, isPlaying: false });
  };

  const handlePlayheadDragEnd = () => {
    setIsDraggingPlayhead(false);
  };

  const handleDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('assetId');
    if (!assetId || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const time = Math.max(0, x / zoom);

    addClipToTrack(trackId, assetId, time);
  };

  React.useEffect(() => {
    if (isDraggingPlayhead) {
      window.addEventListener('mouseup', handlePlayheadDragEnd);
      return () => window.removeEventListener('mouseup', handlePlayheadDragEnd);
    }
  }, [isDraggingPlayhead]);

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Timeline</h3>
          <TimelineTools />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="flex-1 overflow-auto relative"
        onMouseMove={isDraggingPlayhead ? handlePlayheadDrag : undefined}
      >
        <div className="sticky top-0 z-10 bg-background">
          <TimelineRuler zoom={zoom} duration={playback.duration} onClick={handleTimelineClick} />
        </div>

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
          style={{ left: `${60 + playback.currentTime * zoom}px` }}
        >
          <div
            className="absolute -top-0 -left-2 w-4 h-4 bg-primary cursor-ew-resize pointer-events-auto"
            style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
            onMouseDown={handlePlayheadDragStart}
          />
        </div>

        <div className="space-y-1 pb-4 bg-background" style={{ minWidth: `calc(60px + ${Math.max(playback.duration * zoom, 2000)}px)` }}>
          {tracks.map((track) => (
            <TimelineTrack
              key={track.id}
              track={track}
              zoom={zoom}
              onDrop={(e) => handleDrop(e, track.id)}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

