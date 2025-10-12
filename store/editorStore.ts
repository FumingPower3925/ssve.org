import { create } from 'zustand';
import { 
  EditorState, 
  Asset, 
  Track, 
  TimelineClip, 
  TextOverlay, 
  PlaybackState,
  Project 
} from '@/types/editor';
import { generateId } from '@/lib/utils';

const initialPlaybackState: PlaybackState = {
  currentTime: 0,
  isPlaying: false,
  duration: 0,
  playbackSpeed: 1,
};

const createInitialTracks = (): Track[] => [
  {
    id: 'video-track',
    type: 'video',
    name: 'Image',
    clips: [],
    volume: 100,
    muted: false,
  },
  {
    id: 'audio-track',
    type: 'audio',
    name: 'Audio',
    clips: [],
    volume: 100,
    muted: false,
    noiseReduction: false,
  },
  {
    id: 'text-track',
    type: 'video',
    name: 'Text',
    clips: [],
    volume: 100,
    muted: false,
  },
];

export const useEditorStore = create<EditorState>((set, get) => ({
  assets: [],
  tracks: createInitialTracks(),
  textOverlays: [],
  playback: initialPlaybackState,
  selectedClipId: null,
  zoom: 50,
  exportSettings: {
    resolution: '1080p',
    quality: 'medium',
  },
  projectName: 'Untitled Project',

  addAsset: (asset: Asset) => {
    set((state) => ({
      assets: [...state.assets, asset],
    }));
  },

  removeAsset: (assetId: string) => {
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== assetId),
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.assetId !== assetId),
      })),
    }));
  },

  addClipToTrack: (trackId: string, assetId: string, startTime: number) => {
    const asset = get().assets.find((a) => a.id === assetId);
    if (!asset) return;

    const newClip: TimelineClip = {
      id: generateId(),
      assetId,
      trackId,
      startTime,
      duration: asset.duration || 5,
      trimStart: 0,
      trimEnd: asset.duration || 5,
      volume: 100,
      muted: false,
    };

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      ),
    }));
  },

  removeClip: (clipId: string) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== clipId),
      })),
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    }));
  },

  updateClip: (clipId: string, updates: Partial<TimelineClip>) => {
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) =>
          clip.id === clipId ? { ...clip, ...updates } : clip
        ),
      })),
    }));
  },

  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => {
    set((state) => {
      const clip = state.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === clipId);
      if (!clip) return state;

      return {
        tracks: state.tracks.map((track) => ({
          ...track,
          clips:
            track.id === newTrackId
              ? [...track.clips.filter((c) => c.id !== clipId), { ...clip, trackId: newTrackId, startTime: newStartTime }]
              : track.clips.filter((c) => c.id !== clipId),
        })),
      };
    });
  },

  splitClip: (clipId: string, splitTime: number) => {
    set((state) => {
      const track = state.tracks.find((t) => t.clips.some((c) => c.id === clipId));
      if (!track) return state;

      const clip = track.clips.find((c) => c.id === clipId);
      if (!clip) return state;

      const relativeTime = splitTime - clip.startTime;
      if (relativeTime <= 0 || relativeTime >= clip.duration) return state;

      const clip1: TimelineClip = {
        ...clip,
        duration: relativeTime,
        trimEnd: clip.trimStart + relativeTime,
      };

      const clip2: TimelineClip = {
        ...clip,
        id: generateId(),
        startTime: clip.startTime + relativeTime,
        duration: clip.duration - relativeTime,
        trimStart: clip.trimStart + relativeTime,
      };

      return {
        tracks: state.tracks.map((t) =>
          t.id === track.id
            ? {
                ...t,
                clips: t.clips.map((c) => (c.id === clipId ? clip1 : c)).concat(clip2),
              }
            : t
        ),
      };
    });
  },

  selectClip: (clipId: string | null) => {
    set({ selectedClipId: clipId });
  },

  updateTrack: (trackId: string, updates: Partial<Track>) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, ...updates } : track
      ),
    }));
  },

  addTextOverlay: (textOverlay: TextOverlay) => {
    set((state) => ({
      textOverlays: [...state.textOverlays, textOverlay],
    }));
  },

  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => {
    set((state) => ({
      textOverlays: state.textOverlays.map((overlay) =>
        overlay.id === id ? { ...overlay, ...updates } : overlay
      ),
    }));
  },

  removeTextOverlay: (id: string) => {
    set((state) => ({
      textOverlays: state.textOverlays.filter((overlay) => overlay.id !== id),
    }));
  },

  setPlayback: (updates: Partial<PlaybackState>) => {
    set((state) => ({
      playback: { ...state.playback, ...updates },
    }));
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(10, Math.min(200, zoom)) });
  },

  setExportSettings: (settings) => {
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
    }));
  },

  setProjectName: (name: string) => {
    set({ projectName: name });
  },

  loadProject: (project: Project) => {
    set({
      tracks: project.tracks,
      textOverlays: project.textOverlays,
      exportSettings: project.exportSettings,
      projectName: project.name,
      playback: initialPlaybackState,
      selectedClipId: null,
    });
  },

  resetProject: () => {
    set({
      assets: [],
      tracks: createInitialTracks(),
      textOverlays: [],
      playback: initialPlaybackState,
      selectedClipId: null,
      projectName: 'Untitled Project',
    });
  },
}));

