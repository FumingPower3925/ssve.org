'use client';

import React from 'react';
import { formatTime } from '@/lib/utils';

interface TimelineRulerProps {
  zoom: number;
  duration: number;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function TimelineRuler({ zoom, duration, onClick }: TimelineRulerProps) {
  const intervals = [];
  const interval = zoom > 100 ? 1 : zoom > 50 ? 5 : zoom > 20 ? 10 : 30;
  
  for (let i = 0; i <= duration; i += interval) {
    intervals.push(i);
  }

  const minWidth = Math.max(duration * zoom, 2000);

  return (
    <div 
      className="h-8 border-b bg-muted/30 flex items-end cursor-pointer relative"
      onClick={onClick}
      style={{ minWidth: `calc(60px + ${minWidth}px)` }}
    >
      <div className="w-15 shrink-0 border-r bg-muted/30" style={{ width: '60px' }} />
      <div className="relative h-full bg-muted/30" style={{ minWidth: `${minWidth}px` }}>
        {intervals.map((time) => (
          <div
            key={time}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${time * zoom}px` }}
          >
            <div className="h-2 w-px bg-border" />
            <span className="text-xs text-muted-foreground mt-0.5">
              {formatTime(time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

