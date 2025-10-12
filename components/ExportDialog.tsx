'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Download } from 'lucide-react';
import { exportVideo } from '@/lib/exportVideo';
import { ExportSettings } from '@/types/editor';

export function ExportDialog() {
  const { tracks, assets, textOverlays, exportSettings, setExportSettings, projectName } = useEditorStore();
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    try {
      const blob = await exportVideo(
        tracks,
        assets,
        textOverlays,
        exportSettings,
        (progressInfo) => {
          setProgress(progressInfo.progress);
          setProgressMessage(progressInfo.message);
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.href = url;
      a.download = `${sanitizedName}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setOpen(false);
    } catch (error) {
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const estimatedSizes = {
    '720p': { low: '50-100', medium: '100-200', high: '200-400' },
    '1080p': { low: '100-200', medium: '200-400', high: '400-800' },
    '4k': { low: '400-800', medium: '800-1500', high: '1500-3000' },
  };

  const estimatedSize = estimatedSizes[exportSettings.resolution][exportSettings.quality];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Download className="h-4 w-4 mr-2" />
          Export Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Choose your export settings and download your video.
          </DialogDescription>
        </DialogHeader>
        
        {!isExporting ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution</label>
              <Select
                value={exportSettings.resolution}
                onValueChange={(v: any) => setExportSettings({ resolution: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p (1280x720)</SelectItem>
                  <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                  <SelectItem value="4k">4K (3840x2160)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quality</label>
              <Select
                value={exportSettings.quality}
                onValueChange={(v: any) => setExportSettings({ quality: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Faster, Smaller File)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="high">High (Slower, Larger File)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">
                <span className="font-medium">Estimated file size:</span> {estimatedSize} MB per minute
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Actual size may vary based on content complexity
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {progressMessage}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

