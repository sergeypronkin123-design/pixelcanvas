import { useCanvasStore } from '@/stores/canvasStore';
import { useAuthStore } from '@/stores/authStore';
import { MousePointer2, Pencil, Eraser, ImagePlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef } from 'react';
import { api } from '@/lib/api';

const PALETTE = [
  '#ffffff', '#c0c0c0', '#808080', '#000000',
  '#ff0000', '#ff6600', '#ffaa00', '#ffff00',
  '#00ff00', '#00ff88', '#00ffff', '#00aaff',
  '#0066ff', '#8b5cf6', '#ff00aa', '#ff0066',
  '#8b4513', '#ff8888', '#88ff88', '#8888ff',
];

export function DrawToolbar() {
  const { tool, setTool, drawColor, setDrawColor, selectedBlock } = useCanvasStore();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBlock || selectedBlock.owner_id !== user?.id) return;

    const img = new window.Image();
    const reader = new FileReader();

    reader.onload = (ev) => {
      img.onload = () => {
        // Create a 10x10 canvas to resize the image
        const canvas = document.createElement('canvas');
        canvas.width = selectedBlock.width;
        canvas.height = selectedBlock.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, selectedBlock.width, selectedBlock.height);
        const imageData = ctx.getImageData(0, 0, selectedBlock.width, selectedBlock.height);

        const pixels: { local_x: number; local_y: number; color: string }[] = [];
        const worldPixels: { x: number; y: number; color: string }[] = [];

        for (let y = 0; y < selectedBlock.height; y++) {
          for (let x = 0; x < selectedBlock.width; x++) {
            const i = (y * selectedBlock.width + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            if (a < 128) continue; // Skip transparent pixels

            const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
            pixels.push({ local_x: x, local_y: y, color: hex });
            worldPixels.push({ x: selectedBlock.x + x, y: selectedBlock.y + y, color: hex });
          }
        }

        // Update local state immediately
        useCanvasStore.getState().updatePixels(worldPixels);

        // Send to server in batches
        const batchSize = 50;
        for (let i = 0; i < pixels.length; i += batchSize) {
          const batch = pixels.slice(i, i + batchSize);
          api.drawPixels(selectedBlock.id, batch).catch(console.error);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isOwner = user && selectedBlock && selectedBlock.owner_id === user.id;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass rounded-2xl px-4 py-3 flex items-center gap-3"
    >
      {/* Tools */}
      <div className="flex gap-1 pr-3 border-r border-canvas-border">
        <ToolButton icon={<MousePointer2 size={18} />} active={tool === 'select'} onClick={() => setTool('select')} label="Select & Pan" />
        <ToolButton icon={<Pencil size={18} />} active={tool === 'pencil'} onClick={() => setTool('pencil')} label="Draw Pixel" />
        <ToolButton icon={<Eraser size={18} />} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Erase" />
        {isOwner && (
          <ToolButton
            icon={<ImagePlus size={18} />}
            active={false}
            onClick={() => fileInputRef.current?.click()}
            label="Upload Image"
          />
        )}
      </div>

      {/* Color palette */}
      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
        {PALETTE.map((color) => (
          <button
            key={color}
            onClick={() => { setDrawColor(color); setTool('pencil'); }}
            className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110
              ${drawColor === color && tool === 'pencil' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Custom color */}
      <div className="pl-3 border-l border-canvas-border">
        <label className="relative cursor-pointer">
          <div
            className="w-8 h-8 rounded-lg border-2 border-canvas-border hover:border-canvas-muted transition-all"
            style={{ backgroundColor: drawColor }}
          />
          <input
            type="color"
            value={drawColor}
            onChange={(e) => { setDrawColor(e.target.value); setTool('pencil'); }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </motion.div>
  );
}

function ToolButton({ icon, active, onClick, label }: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2.5 rounded-xl transition-all
        ${active
          ? 'bg-neon-amber/20 text-neon-amber shadow-[0_0_12px_rgba(255,170,0,0.15)]'
          : 'text-canvas-muted hover:text-canvas-text hover:bg-canvas-elevated'}`}
    >
      {icon}
    </button>
  );
}
