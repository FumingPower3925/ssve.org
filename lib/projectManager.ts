import { Project } from '@/types/editor';
import { useEditorStore } from '@/store/editorStore';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function base64ToFile(base64: string, name: string, type?: string): Promise<File> {
  const response = await fetch(base64);
  const blob = await response.blob();
  const fileType = type || blob.type || 'application/octet-stream';
  return new File([blob], name, { type: fileType });
}

export async function saveProject(): Promise<void> {
  const state = useEditorStore.getState();

  const assetsWithData = await Promise.all(
    state.assets.map(async (asset) => ({
      ...asset,
      fileData: asset.file ? await fileToBase64(asset.file) : undefined,
      fileType: asset.file ? asset.file.type : undefined,
      file: undefined as any,
      url: undefined as any,
    }))
  );

  const project: any = {
    name: state.projectName,
    created: new Date(),
    lastModified: new Date(),
    tracks: state.tracks,
    textOverlays: state.textOverlays,
    exportSettings: state.exportSettings,
    assets: assetsWithData,
  };

  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '-')}.ssve`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function loadProject(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const project = JSON.parse(json);

        if (project.assets && project.assets.length > 0) {
          const restoredAssets = await Promise.all(
            project.assets.map(async (asset: any) => {
              if (asset.fileData) {
                try {
                  const file = await base64ToFile(asset.fileData, asset.name, asset.fileType);
                  const url = URL.createObjectURL(file);
                  let thumbnail = asset.thumbnail;
                  if (asset.type === 'image') {
                    thumbnail = url;
                  } else if (asset.type === 'video' && !thumbnail) {
                    try {
                      const video = document.createElement('video');
                      video.src = url;
                      video.crossOrigin = 'anonymous';
                      await new Promise<void>((resolve) => {
                        video.onloadeddata = () => {
                          const canvas = document.createElement('canvas');
                          canvas.width = 120;
                          canvas.height = 80;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            video.currentTime = Math.min(1, video.duration || 0);
                            video.onseeked = () => {
                              ctx.drawImage(video, 0, 0, 120, 80);
                              thumbnail = canvas.toDataURL('image/jpeg');
                              resolve();
                            };
                          } else {
                            resolve();
                          }
                        };
                        video.onerror = () => {
                          console.warn('Failed to load video for thumbnail');
                          resolve();
                        };
                      });
                    } catch (err) {
                      console.warn('Failed to generate thumbnail:', err);
                    }
                  }
                  
                  return {
                    ...asset,
                    file,
                    url,
                    thumbnail,
                    fileData: undefined,
                    fileType: undefined,
                  };
                } catch (err) {
                  console.error('Failed to restore asset:', asset.name, err);
                  return null;
                }
              }
              return asset;
            })
          );
          project.assets = restoredAssets.filter((asset: any) => asset !== null);
        }
        
        resolve(project);
      } catch (error) {
        reject(new Error('Invalid project file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

