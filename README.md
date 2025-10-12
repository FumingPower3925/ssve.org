# Super Simple Video Editor (SSVE)

A simple, stylish, and powerful browser-based video editor for everyone. Perfect for editing family videos, creating simple presentations, or quick video edits.

## Features

- **Asset Management**: Upload and organize videos, images, and audio files
- **Timeline Editing**: Drag, trim, cut, and arrange clips on a 3-track timeline
  - Video/Photo Track: For visual content
  - Audio Track: Modify original audio (volume, mute, noise reduction)
  - Background Music Track: Add background music
- **Text Overlays**: Add text with fade-in/fade-out animations
- **Real-time Preview**: Watch your edits as you make them
- **Export**: Export to MP4 with multiple quality and resolution options
- **Project Management**: Save and load projects locally

## Getting Started

### Development

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun run build
```

## Usage

1. **Upload Files**: Drag and drop or click to upload videos, images, and audio
2. **Add to Timeline**: Drag assets from the library to the timeline
3. **Edit**: Trim clips by dragging edges, move clips by dragging them
4. **Adjust Audio**: Click track settings to adjust volume or enable noise reduction
5. **Add Text**: Use the "Add Text" button to insert text overlays
6. **Preview**: Click play to preview your video
7. **Export**: Choose quality and resolution, then export your video
8. **Save Project**: Save your work to continue later

## Keyboard Shortcuts

- `Space`: Play/Pause
- `Cmd/Ctrl+S`: Save project
- `Delete`: Delete selected clip
- `?`: Show help dialog

## Browser Compatibility

Works best on modern browsers that support:
- WebAssembly
- File System Access API
- HTML5 Video

Recommended browsers:
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

