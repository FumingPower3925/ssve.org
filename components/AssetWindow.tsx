'use client';

import React, { useCallback, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Upload, X, Video, Music, Image as ImageIcon, Type } from 'lucide-react';
import { Asset, AssetType } from '@/types/editor';
import { generateId, formatFileSize, formatTime } from '@/lib/utils';

export function AssetWindow() {
  const { assets, addAsset, removeAsset } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'all' | AssetType>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      const asset = await processFile(file);
      if (asset) {
        addAsset(asset);
      }
    }
    setShowUploadDialog(false);
  }, [addAsset]);

  const handleAddTextClick = () => {
    setShowUploadDialog(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const filteredAssets = assets.filter(asset => 
    activeTab === 'all' ? true : asset.type === activeTab
  );

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('assetId', asset.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Assets</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col px-4">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-4">
            <div className="grid grid-cols-4 gap-2 pb-4">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onRemove={() => removeAsset(asset.id)}
                  onDragStart={(e) => handleDragStart(e, asset)}
                />
              ))}
              {filteredAssets.length === 0 && (
                <div className="col-span-4 text-center text-sm text-muted-foreground py-8">
                  No assets yet. Click the upload button to get started!
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {showUploadDialog && (
          <div className="absolute inset-0 bg-background/95 flex items-center justify-center z-50">
            <div className="max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Upload Assets</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowUploadDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <label htmlFor="file-upload">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Video, Audio, or Images
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  multiple
                  accept="video/*,audio/*,image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssetCard({ 
  asset, 
  onRemove, 
  onDragStart 
}: { 
  asset: Asset; 
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const Icon = asset.type === 'video' ? Video : 
               asset.type === 'audio' ? Music : 
               asset.type === 'text' ? Type : ImageIcon;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="relative group border rounded overflow-hidden hover:border-primary cursor-move transition-colors"
    >
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
      
      {asset.thumbnail ? (
        <img src={asset.thumbnail} alt={asset.name} className="w-full h-16 object-cover" />
      ) : (
        <div className="w-full h-16 bg-muted flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      
      <div className="p-1 bg-card">
        <p className="text-xs truncate font-medium">{asset.name}</p>
        {asset.duration && (
          <p className="text-xs text-muted-foreground">{formatTime(asset.duration)}</p>
        )}
      </div>
    </div>
  );
}

async function processFile(file: File): Promise<Asset | null> {
  const type: AssetType = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('audio/')
    ? 'audio'
    : file.type.startsWith('image/')
    ? 'image'
    : 'video';

  const url = URL.createObjectURL(file);
  const asset: Asset = {
    id: generateId(),
    name: file.name,
    type,
    file,
    url,
    size: file.size,
  };

  if (type === 'video') {
    const video = document.createElement('video');
    video.src = url;
    
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        asset.duration = video.duration;
        asset.width = video.videoWidth;
        asset.height = video.videoHeight;
        
        video.currentTime = Math.min(1, video.duration / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          asset.thumbnail = canvas.toDataURL();
        }
        resolve(null);
      };
    });
  } else if (type === 'audio') {
    const audio = document.createElement('audio');
    audio.src = url;
    await new Promise((resolve) => {
      audio.onloadedmetadata = () => {
        asset.duration = audio.duration;
        resolve(null);
      };
    });
  } else if (type === 'image') {
    const img = document.createElement('img');
    img.src = url;
    await new Promise((resolve) => {
      img.onload = () => {
        asset.width = img.width;
        asset.height = img.height;
        asset.thumbnail = url;
        asset.duration = 5;
        resolve(null);
      };
    });
  }

  return asset;
}

