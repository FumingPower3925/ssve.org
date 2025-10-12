'use client';

import React, { useEffect, useState } from 'react';
import { AssetWindow } from '@/components/AssetWindow';
import { PreviewWindow } from '@/components/PreviewWindow';
import { Timeline } from '@/components/Timeline/Timeline';
import { ExportDialog } from '@/components/ExportDialog';
import { TextOverlayDialog } from '@/components/TextOverlayDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Save, Upload, HelpCircle } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { saveProject, loadProject } from '@/lib/projectManager';

export default function Home() {
  const { projectName, loadProject: loadProjectToStore, resetProject, setProjectName } = useEditorStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(projectName);

  const handleSaveProjectName = () => {
    if (editedName.trim()) {
      setProjectName(editedName.trim());
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    setEditedName(projectName);
  }, [projectName]);

  useEffect(() => {
    setShowWelcome(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        setShowHelp(true);
      }
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        const { playback, setPlayback } = useEditorStore.getState();
        setPlayback({ isPlaying: !playback.isPlaying });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadProjectToStore]);

  const handleLoadProject = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ssve';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const project = await loadProject(file);
        const store = useEditorStore.getState();
        if (project.assets) {
          project.assets.forEach((asset: any) => {
            store.addAsset(asset);
          });
        }
        loadProjectToStore(project);
      } catch (error) {
        alert('Failed to load project: ' + (error as Error).message);
      }
    };
    input.click();
  };

  const handleNewProject = () => {
    if (confirm('Start a new project? Any unsaved changes will be lost.')) {
      resetProject();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(0, 65%, 55%)' }}>
            Super Simple Video Editor
          </h1>
          {isEditingName ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSaveProjectName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveProjectName();
                if (e.key === 'Escape') {
                  setEditedName(projectName);
                  setIsEditingName(false);
                }
              }}
              className="w-48 h-8"
              autoFocus
            />
          ) : (
            <div 
              className="text-sm text-muted-foreground cursor-pointer hover:text-foreground px-2 py-1 rounded hover:bg-accent"
              onClick={() => setIsEditingName(true)}
            >
              {projectName}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button variant="outline" size="sm" onClick={handleNewProject}>
            New
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoadProject}>
            <Upload className="h-4 w-4 mr-2" />
            Load
          </Button>
          <Button variant="outline" size="sm" onClick={saveProject}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <TextOverlayDialog />
          <ExportDialog />
        </div>
      </header>

      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
        <div className="h-full">
          <AssetWindow />
        </div>

        <div className="h-full">
          <PreviewWindow />
        </div>
      </div>

      <div className="h-80 border-t p-4">
        <Timeline />
      </div>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to Super Simple Video Editor!</DialogTitle>
            <DialogDescription>
              A simple and powerful video editor for everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Getting Started:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Upload your videos, images, and audio files</li>
                <li>Drag them to the timeline to arrange them</li>
                <li>Trim, cut, and adjust clips as needed</li>
                <li>Add text overlays and background music</li>
                <li>Preview your video and export when ready!</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Tips:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Press Space to play/pause</li>
                <li>Press Cmd/Ctrl+S to save your project</li>
                <li>Press ? to see keyboard shortcuts</li>
              </ul>
            </div>
          </div>
          <Button onClick={() => setShowWelcome(false)}>Get Started</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts & Help</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-3">
              <h4 className="font-medium">Playback</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Play/Pause</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Space</kbd>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Project</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Save Project</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Cmd/Ctrl+S</kbd>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Editing</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delete Clip</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Delete</kbd>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Timeline</h4>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  • Drag clips to move them<br />
                  • Drag clip edges to trim<br />
                  • Click track settings for volume
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowHelp(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

