export type AssetType = 'video' | 'audio' | 'image' | 'text';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  file: File | null;
  url: string;
  duration?: number;
  thumbnail?: string;
  width?: number;
  height?: number;
  size: number;
  textData?: TextOverlay;
}

export type TrackType = 'video' | 'audio' | 'music';

export interface TimelineClip {
  id: string;
  assetId: string;
  trackId: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  muted?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  speed?: number;
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: TimelineClip[];
  volume: number;
  muted: boolean;
  noiseReduction?: boolean;
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  position: {
    x: number;
    y: number;
  };
  fadeIn: number;
  fadeOut: number;
}

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4k';
  quality: 'low' | 'medium' | 'high';
}

export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  playbackSpeed: number;
}

export interface Project {
  name: string;
  created: Date;
  lastModified: Date;
  tracks: Track[];
  textOverlays: TextOverlay[];
  exportSettings: ExportSettings;
}

export interface EditorState {
  assets: Asset[];
  tracks: Track[];
  textOverlays: TextOverlay[];
  playback: PlaybackState;
  selectedClipId: string | null;
  zoom: number;
  exportSettings: ExportSettings;
  projectName: string;
  
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  addClipToTrack: (trackId: string, assetId: string, startTime: number) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  selectClip: (clipId: string | null) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  addTextOverlay: (textOverlay: TextOverlay) => void;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  removeTextOverlay: (id: string) => void;
  setPlayback: (updates: Partial<PlaybackState>) => void;
  setZoom: (zoom: number) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setProjectName: (name: string) => void;
  loadProject: (project: Project) => void;
  resetProject: () => void;
}

