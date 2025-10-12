'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export function PreviewWindow() {
  const { 
    playback, 
    setPlayback, 
    tracks, 
    assets, 
    textOverlays 
  } = useEditorStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentClipUrl, setCurrentClipUrl] = useState<string>('');
  const [currentClipType, setCurrentClipType] = useState<'video' | 'image' | null>(null);
  const [videoOpacity, setVideoOpacity] = useState<number>(1);

  const totalDuration = Math.max(
    ...tracks.flatMap(track => 
      track.clips.map(clip => clip.startTime + clip.duration)
    ),
    10
  );

  useEffect(() => {
    setPlayback({ duration: totalDuration });
  }, [totalDuration, setPlayback]);

  useEffect(() => {
    const videoTrack = tracks.find(t => t.id === 'video-track');
    if (!videoTrack) return;

    const currentClip = videoTrack.clips.find(
      clip => playback.currentTime >= clip.startTime && 
              playback.currentTime < clip.startTime + clip.duration
    );

    if (currentClip) {
      const asset = assets.find(a => a.id === currentClip.assetId);
      if (asset && asset.file) {
        const assetType = asset.type === 'image' ? 'image' : 'video';
        
        const clipElapsed = playback.currentTime - currentClip.startTime;
        const fadeIn = currentClip.fadeIn || 0;
        const fadeOut = currentClip.fadeOut || 0;
        let opacity = 1;
        
        if (fadeIn > 0 && clipElapsed < fadeIn) {
          opacity = clipElapsed / fadeIn;
        }
        if (fadeOut > 0 && clipElapsed > currentClip.duration - fadeOut) {
          const fadeOutProgress = (currentClip.duration - clipElapsed) / fadeOut;
          opacity = Math.min(opacity, fadeOutProgress);
        }
        
        setVideoOpacity(Math.max(0, Math.min(1, opacity)));
        
        if (currentClipUrl !== asset.url || currentClipType !== assetType) {
          setCurrentClipUrl(asset.url);
          setCurrentClipType(assetType);
          
          if (assetType === 'video' && videoRef.current) {
            videoRef.current.src = asset.url;
            const clipTime = playback.currentTime - currentClip.startTime + currentClip.trimStart;
            videoRef.current.currentTime = clipTime;
          } else if (assetType === 'image' && imageRef.current) {
            imageRef.current.src = asset.url;
          }
        } else if (assetType === 'video' && videoRef.current && asset) {
          const clipTime = playback.currentTime - currentClip.startTime + currentClip.trimStart;
          if (Math.abs(videoRef.current.currentTime - clipTime) > 0.1) {
            videoRef.current.currentTime = clipTime;
          }
        }
      }
    } else {
      setCurrentClipUrl('');
      setCurrentClipType(null);
      setVideoOpacity(1);
    }
  }, [playback.currentTime, tracks, assets, currentClipUrl, currentClipType]);

  useEffect(() => {
    const audioTrack = tracks.find(t => t.id === 'audio-track');
    if (!audioTrack || !audioRef.current) return;

    const currentAudioClip = audioTrack.clips.find(
      clip => playback.currentTime >= clip.startTime && 
              playback.currentTime < clip.startTime + clip.duration
    );

    if (currentAudioClip) {
      const asset = assets.find(a => a.id === currentAudioClip.assetId);
      
      const clipElapsed = playback.currentTime - currentAudioClip.startTime;
      const fadeIn = currentAudioClip.fadeIn || 0;
      const fadeOut = currentAudioClip.fadeOut || 0;
      let fadeMultiplier = 1;
      if (fadeIn > 0 && clipElapsed < fadeIn) {
        fadeMultiplier = clipElapsed / fadeIn;
      }
      if (fadeOut > 0 && clipElapsed > currentAudioClip.duration - fadeOut) {
        const fadeOutProgress = (currentAudioClip.duration - clipElapsed) / fadeOut;
        fadeMultiplier = Math.min(fadeMultiplier, fadeOutProgress);
      }
      fadeMultiplier = Math.max(0, Math.min(1, fadeMultiplier));
      
      if (asset && asset.url && audioRef.current.src !== asset.url) {
        audioRef.current.src = asset.url;
        const clipTime = playback.currentTime - currentAudioClip.startTime + currentAudioClip.trimStart;
        audioRef.current.currentTime = clipTime;
        const calculatedVolume = (currentAudioClip.volume / 100) * (audioTrack.volume / 100) * fadeMultiplier;
        audioRef.current.volume = Math.min(1.0, calculatedVolume);
        const speed = currentAudioClip.speed || 1;
        audioRef.current.playbackRate = isFinite(speed) ? speed : 1;
        audioRef.current.muted = audioTrack.muted;
        
        if (playback.isPlaying) {
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
      } else if (asset && audioRef.current.src === asset.url) {
        const clipTime = playback.currentTime - currentAudioClip.startTime + currentAudioClip.trimStart;
        if (Math.abs(audioRef.current.currentTime - clipTime) > 0.1) {
          audioRef.current.currentTime = clipTime;
        }
        const calculatedVolume = (currentAudioClip.volume / 100) * (audioTrack.volume / 100) * fadeMultiplier;
        audioRef.current.volume = Math.min(1.0, calculatedVolume);
        const speed = currentAudioClip.speed || 1;
        audioRef.current.playbackRate = isFinite(speed) ? speed : 1;
        audioRef.current.muted = audioTrack.muted;
        
        if (playback.isPlaying && audioRef.current.paused) {
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        } else if (!playback.isPlaying && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    } else if (audioRef.current.src) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [playback.currentTime, playback.isPlaying, tracks, assets]);

  useEffect(() => {
    if (playback.isPlaying) {
      const startTime = Date.now();
      const startCurrentTime = playback.currentTime;

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000 * playback.playbackSpeed;
        const newTime = startCurrentTime + elapsed;

        if (newTime >= totalDuration) {
          setPlayback({ currentTime: 0, isPlaying: false });
        } else {
          setPlayback({ currentTime: newTime });
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [playback.isPlaying, playback.playbackSpeed, totalDuration, setPlayback]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const textTrack = tracks.find(t => t.id === 'text-track');
    if (!textTrack) return;

    const activeTextClips = textTrack.clips.filter(
      clip => playback.currentTime >= clip.startTime && 
              playback.currentTime < clip.startTime + clip.duration
    );

    activeTextClips.forEach(clip => {
      const asset = assets.find(a => a.id === clip.assetId);
      if (!asset || !asset.textData) return;

      const overlay = asset.textData;
      const elapsed = playback.currentTime - clip.startTime;
      let opacity = 1;

      if (elapsed < overlay.fadeIn) {
        opacity = elapsed / overlay.fadeIn;
      }

      const timeUntilEnd = clip.startTime + clip.duration - playback.currentTime;
      if (timeUntilEnd < overlay.fadeOut) {
        opacity = Math.min(opacity, timeUntilEnd / overlay.fadeOut);
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `${overlay.fontSize}px ${overlay.fontFamily}`;
      ctx.fillStyle = overlay.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const x = (overlay.position.x / 100) * canvas.width;
      const y = (overlay.position.y / 100) * canvas.height;

      if (overlay.backgroundColor) {
        ctx.fillStyle = overlay.backgroundColor;
        const metrics = ctx.measureText(overlay.text);
        const padding = 10;
        ctx.fillRect(
          x - metrics.width / 2 - padding,
          y - overlay.fontSize / 2 - padding,
          metrics.width + padding * 2,
          overlay.fontSize + padding * 2
        );
      }

      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, x, y);
      ctx.restore();
    });
  }, [playback.currentTime, tracks, assets]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (playback.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
    setPlayback({ isPlaying: !playback.isPlaying });
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setPlayback({ currentTime: newTime, isPlaying: false });
  };

  const skipForward = () => {
    setPlayback({ currentTime: Math.min(playback.currentTime + 5, totalDuration) });
  };

  const skipBackward = () => {
    setPlayback({ currentTime: Math.max(playback.currentTime - 5, 0) });
  };

  const handleRestart = () => {
    setPlayback({ currentTime: 0, isPlaying: false });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Preview</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRestart}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipBackward}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayPause}>
              {playback.isPlaying ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="5" width="4" height="14" fill="currentColor" />
                  <rect x="14" y="5" width="4" height="14" fill="currentColor" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="8,5 8,19 19,12" />
                </svg>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={skipForward}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="relative flex-1 bg-black rounded overflow-hidden mb-3">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ 
              display: currentClipType === 'video' ? 'block' : 'none',
              opacity: videoOpacity 
            }}
            muted={false}
          />
          <img
            ref={imageRef}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ 
              display: currentClipType === 'image' ? 'block' : 'none',
              opacity: videoOpacity 
            }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
          <audio
            ref={audioRef}
            style={{ display: 'none' }}
          />
          {!currentClipUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <p className="text-sm">Add clips to the timeline to preview</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Slider
            value={[playback.currentTime]}
            min={0}
            max={totalDuration}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatTime(playback.currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

