import { getFFmpeg, resetFFmpeg } from './ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { Asset, Track, TimelineClip, ExportSettings, TextOverlay } from '@/types/editor';

interface ExportProgress {
  phase: 'loading' | 'processing' | 'encoding' | 'complete';
  progress: number;
  message: string;
}

export async function exportVideo(
  tracks: Track[],
  assets: Asset[],
  textOverlays: TextOverlay[],
  settings: ExportSettings,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  try {
    onProgress?.({ phase: 'loading', progress: 0, message: 'Loading FFmpeg...' });
    const ffmpeg = await getFFmpeg();
    
    ffmpeg.on('log', ({ type, message }) => {
      console.log(`[FFmpeg ${type}]`, message);
    });
    
    ffmpeg.on('progress', ({ progress, time }) => {
      console.log(`FFmpeg progress: ${progress * 100}%, time: ${time}`);
      if (progress > 0) {
        onProgress?.({ 
          phase: 'encoding', 
          progress: 70 + (progress * 20), 
          message: `Encoding video... ${Math.round(progress * 100)}%` 
        });
      }
    });

    onProgress?.({ phase: 'loading', progress: 10, message: 'Loading font...' });
    let fontAvailable = false;
    try {
      try {
        await ffmpeg.readFile('font.ttf');
        fontAvailable = true;
        console.log('✓ Font already loaded');
      } catch (e) {
        console.log('Loading font from local file...');
        const fontResponse = await fetch('/font.ttf');
        if (!fontResponse.ok) {
          throw new Error('Failed to fetch font from local server');
        }
        const fontArrayBuffer = await fontResponse.arrayBuffer();
        const fontData = new Uint8Array(fontArrayBuffer);
        await ffmpeg.writeFile('font.ttf', fontData);
        fontAvailable = true;
        console.log('✓ Font loaded successfully');
      }
    } catch (fontError) {
      console.warn('⚠️ Failed to load font, text overlays will be skipped:', fontError);
      fontAvailable = false;
    }

    try {
      try {
        await ffmpeg.deleteFile('output.mp4');
        console.log('Cleaned up previous output.mp4');
      } catch (e) {
      }
    } catch (e) {
      console.log('Error during cleanup:', e);
    }

    onProgress?.({ phase: 'loading', progress: 20, message: 'Preparing assets...' });

    const resolutions = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4k': { width: 3840, height: 2160 },
    };
    const resolution = resolutions[settings.resolution];

    const crfValues = {
      'low': 28,
      'medium': 23,
      'high': 18,
    };
    const crf = crfValues[settings.quality];

    const videoTrack = tracks.find(t => t.id === 'video-track');
    const audioTrack = tracks.find(t => t.id === 'audio-track');
    const textTrack = tracks.find(t => t.id === 'text-track');
    
    if (!videoTrack || videoTrack.clips.length === 0) {
      throw new Error('No video clips found');
    }

    const missingAssets: string[] = [];
    videoTrack.clips.forEach(clip => {
      const asset = assets.find(a => a.id === clip.assetId);
      if (!asset) {
        missingAssets.push(`Video clip asset ${clip.assetId} not found`);
      } else if (!asset.file && asset.type !== 'text') {
        missingAssets.push(`Asset "${asset.name}" has no file`);
      }
    });
    
    if (audioTrack) {
      audioTrack.clips.forEach(clip => {
        const asset = assets.find(a => a.id === clip.assetId);
        if (!asset) {
          missingAssets.push(`Audio clip asset ${clip.assetId} not found`);
        } else if (!asset.file) {
          missingAssets.push(`Asset "${asset.name}" has no file`);
        }
      });
    }
    
    if (missingAssets.length > 0) {
      throw new Error('Missing assets:\n' + missingAssets.join('\n'));
    }

    onProgress?.({ phase: 'processing', progress: 30, message: 'Loading files...' });

    const allAssetIds = new Set<string>();
    videoTrack.clips.forEach(clip => {
      const asset = assets.find(a => a.id === clip.assetId);
      if (asset && asset.file) {
        allAssetIds.add(clip.assetId);
      }
    });
    if (audioTrack) {
      audioTrack.clips.forEach(clip => {
        const asset = assets.find(a => a.id === clip.assetId);
        if (asset && asset.file) {
          allAssetIds.add(clip.assetId);
        }
      });
    }

    for (const assetId of allAssetIds) {
      const asset = assets.find(a => a.id === assetId);
      if (!asset) {
        console.warn(`Asset ${assetId} not found`);
        continue;
      }
      if (!asset.file) {
        console.warn(`Asset ${asset.name} has no file object`);
        continue;
      }
      
      try {
        console.log(`Loading asset ${asset.name}, type: ${asset.type}, size: ${asset.file.size}`);
        const fileData = await fetchFile(asset.file);
        console.log(`Fetched file data, length: ${fileData.length}`);
        await ffmpeg.writeFile(`input_${assetId}`, fileData);
        console.log(`✓ Wrote file for asset ${asset.name}`);
      } catch (err) {
        console.error(`✗ Failed to write file for asset ${asset.name}:`, err);
        throw new Error(`Failed to load asset ${asset.name}: ${err}`);
      }
    }

    onProgress?.({ phase: 'processing', progress: 50, message: 'Building video...' });

    const sortedVideoClips = [...videoTrack.clips]
      .filter(clip => {
        const asset = assets.find(a => a.id === clip.assetId);
        return asset && asset.file;
      })
      .sort((a, b) => a.startTime - b.startTime);

    if (sortedVideoClips.length === 0) {
      throw new Error('No valid video/image clips found');
    }

    const filterParts: string[] = [];
    const videoInputs: string[] = [];

    for (let i = 0; i < sortedVideoClips.length; i++) {
      const clip = sortedVideoClips[i];
      const asset = assets.find(a => a.id === clip.assetId);
      if (!asset || !asset.file) continue;

      const isImage = asset.type === 'image';
      const fadeIn = clip.fadeIn || 0;
      const fadeOut = clip.fadeOut || 0;
      
      let filterChain = '';
      
      if (isImage) {
        const duration = clip.duration;
        const totalFrames = Math.ceil(duration * 30);
        filterChain = 
          `[${i}:v]loop=loop=${totalFrames}:size=1:start=0,` +
          `fps=30,` +
          `trim=duration=${duration},` +
          `setpts=PTS-STARTPTS,` +
          `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,` +
          `pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`;
      } else {
        const trimStart = clip.trimStart || 0;
        const trimEnd = clip.trimEnd || asset.duration || clip.duration;
        filterChain = 
          `[${i}:v]trim=start=${trimStart}:end=${trimEnd},` +
          `setpts=PTS-STARTPTS,` +
          `fps=30,` +
          `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,` +
          `pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`;
      }
      if (fadeIn > 0) {
        filterChain += `,fade=t=in:st=0:d=${fadeIn}`;
      }
      if (fadeOut > 0) {
        const fadeOutStart = clip.duration - fadeOut;
        filterChain += `,fade=t=out:st=${fadeOutStart}:d=${fadeOut}`;
      }
      
      filterChain += `[v${i}]`;
      filterParts.push(filterChain);
      videoInputs.push(`[v${i}]`);
    }

    const videoDuration = sortedVideoClips.reduce((total, clip) => {
      return Math.max(total, clip.startTime + clip.duration);
    }, 0);
    
    let audioDuration = 0;
    if (audioTrack && audioTrack.clips.length > 0) {
      audioTrack.clips.forEach(clip => {
        const asset = assets.find(a => a.id === clip.assetId);
        if (asset) {
          const trimStart = clip.trimStart || 0;
          const actualDuration = asset.duration || clip.duration;
          const availableDuration = actualDuration - trimStart;
          const clipEnd = clip.startTime + availableDuration;
          audioDuration = Math.max(audioDuration, clipEnd);
        }
      });
    }
    
    const videoOut = `${videoInputs.join('')}concat=n=${videoInputs.length}:v=1:a=0[vidout]`;
    filterParts.push(videoOut);
    
    if (audioDuration > videoDuration) {
      const extensionDuration = audioDuration - videoDuration;
      const fadeOutDuration = Math.min(1.0, extensionDuration);
      console.log(`Audio is ${extensionDuration}s longer than video. Fading to black and extending.`);
      filterParts.push(`color=c=black:s=${resolution.width}x${resolution.height}:d=${extensionDuration}:r=30[black]`);
      filterParts.push(`[vidout]fade=t=out:st=${videoDuration - fadeOutDuration}:d=${fadeOutDuration}[vidfaded]`);
      filterParts.push(`[vidfaded][black]concat=n=2:v=1:a=0[vidout]`);
    }

    if (fontAvailable && textTrack && textTrack.clips.length > 0) {
      console.log('Adding text overlays to video...');
      let currentLabel = '[vidout]';
      textTrack.clips.forEach((clip, idx) => {
        const asset = assets.find(a => a.id === clip.assetId);
        if (!asset || !asset.textData) return;
        
        const textData = asset.textData;
        const nextLabel = idx === textTrack.clips.length - 1 ? '[vout]' : `[text${idx}]`;
        
        const escapedText = textData.text
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/:/g, '\\:')
          .replace(/%/g, '\\%');
        
        const x = `(w*${textData.position.x/100})`;
        const y = `(h*${textData.position.y/100})`;
        
        const colorHex = textData.color.replace('#', '0x');
        
        filterParts.push(
          `${currentLabel}drawtext=fontfile=font.ttf:text='${escapedText}':` +
          `fontsize=${textData.fontSize}:fontcolor=${colorHex}:` +
          `x=${x}-text_w/2:y=${y}:` +
          `enable='between(t,${clip.startTime},${clip.startTime + clip.duration})'${nextLabel}`
        );
        
        currentLabel = nextLabel;
      });
    } else if (textTrack && textTrack.clips.length > 0 && !fontAvailable) {
      console.warn('⚠️ Text overlays skipped (font not available)');
      filterParts.push('[vidout]null[vout]');
    } else {
      filterParts.push('[vidout]null[vout]');
    }

    onProgress?.({ phase: 'encoding', progress: 70, message: 'Encoding video...' });

    const ffmpegArgs: string[] = [];

    for (let i = 0; i < sortedVideoClips.length; i++) {
      const clip = sortedVideoClips[i];
      const asset = assets.find(a => a.id === clip.assetId);
      if (asset && asset.file) {
        ffmpegArgs.push('-i', `input_${clip.assetId}`);
      }
    }

    let hasAudio = false;
    let audioFilterChain = '';
    if (audioTrack && audioTrack.clips.length > 0 && !audioTrack.muted) {
      const audioClip = audioTrack.clips[0];
      const audioAsset = assets.find(a => a.id === audioClip.assetId);
      if (audioAsset && audioAsset.file) {
        ffmpegArgs.push('-i', `input_${audioClip.assetId}`);
        hasAudio = true;
        const audioFilters: string[] = [];
        const trimStart = audioClip.trimStart || 0;
        const actualAudioDuration = audioAsset.duration || audioClip.duration;
        const availableDuration = actualAudioDuration - trimStart;
        const trimDuration = availableDuration;
        
        console.log(`Audio: trimStart=${trimStart}, actualDuration=${actualAudioDuration}, using=${trimDuration}s`);
        
        audioFilters.push(`atrim=start=${trimStart}:duration=${trimDuration}`);
        audioFilters.push(`asetpts=PTS-STARTPTS`);
        if (audioClip.fadeIn && audioClip.fadeIn > 0) {
          audioFilters.push(`afade=t=in:st=0:d=${audioClip.fadeIn}`);
        }
        if (audioClip.fadeOut && audioClip.fadeOut > 0) {
          const fadeOutStart = Math.max(0, trimDuration - audioClip.fadeOut);
          audioFilters.push(`afade=t=out:st=${fadeOutStart}:d=${audioClip.fadeOut}`);
        }
        const clipVolume = (audioClip.volume / 100) * (audioTrack.volume / 100);
        audioFilters.push(`volume=${Math.min(1.0, clipVolume)}`);
        
        if (audioFilters.length > 0) {
          audioFilterChain = audioFilters.join(',');
        }
      }
    }

    const filterString = filterParts.join(';');
    console.log('FFmpeg filter complex:', filterString);
    ffmpegArgs.push('-filter_complex', filterString);
    ffmpegArgs.push('-map', '[vout]');
    
    if (hasAudio) {
      ffmpegArgs.push('-map', `${sortedVideoClips.length}:a`);
      if (audioFilterChain) {
        ffmpegArgs.push('-af', audioFilterChain);
      }
    }

        ffmpegArgs.push('-r', '30');
        ffmpegArgs.push(
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', crf.toString(),
          '-pix_fmt', 'yuv420p'
        );
    
    if (hasAudio) {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
    }
    
    ffmpegArgs.push('-y', 'output.mp4');

    console.log('=== Starting FFmpeg Execution ===');
    console.log('FFmpeg command:', ['ffmpeg', ...ffmpegArgs].join(' '));
    
    try {
      await ffmpeg.exec(ffmpegArgs);
      console.log('✓ FFmpeg execution completed');
    } catch (execError) {
      console.error('✗ FFmpeg execution failed:', execError);
      throw new Error(`FFmpeg execution failed: ${execError}`);
    }

    onProgress?.({ phase: 'encoding', progress: 90, message: 'Finalizing...' });

    console.log('Listing files in FFmpeg filesystem...');
    try {
      const files = await ffmpeg.listDir('/');
      console.log('Files in FFmpeg FS:', files);
      const fileNames = files.map((f: any) => f.name || f.toString());
      console.log('File names:', fileNames);
    } catch (listError) {
      console.warn('Could not list files:', listError);
    }

    console.log('Reading output file...');
    try {
      const data = await ffmpeg.readFile('output.mp4');
      console.log('✓ Output file read, size:', data.length);
      const uint8Array = data as Uint8Array;
      const blob = new Blob([uint8Array.slice()], { type: 'video/mp4' });

      onProgress?.({ phase: 'complete', progress: 100, message: 'Export complete!' });

      return blob;
    } catch (readError) {
      console.error('✗ Failed to read output file:', readError);
      console.log('Trying alternate file paths...');
      const alternatePaths = ['/output.mp4', './output.mp4', 'tmp/output.mp4'];
      for (const path of alternatePaths) {
        try {
          console.log(`Trying path: ${path}`);
          const data = await ffmpeg.readFile(path);
          console.log(`✓ Found file at ${path}, size:`, data.length);
          const uint8Array = data as Uint8Array;
          const blob = new Blob([uint8Array.slice()], { type: 'video/mp4' });
          onProgress?.({ phase: 'complete', progress: 100, message: 'Export complete!' });
          return blob;
        } catch (e) {
          console.log(`✗ Not at ${path}`);
        }
      }
      
      throw new Error(`Failed to read output file: ${readError}`);
    }
  } catch (error) {
    console.error('Export error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    });
    resetFFmpeg();
    throw new Error('Failed to export video: ' + (error as Error).message);
  }
}
