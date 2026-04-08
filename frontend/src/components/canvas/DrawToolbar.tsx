import { useCanvasStore } from '@/stores/canvasStore';
import { MousePointer2, Pencil, Eraser } from 'lucide-react';
import { motion } from 'framer-motion';

const PALETTE = [
  '#ffffff', '#c0c0c0', '#808080', '#000000',
  '#ff0000', '#ff6600', '#ffaa00', '#ffff00',
  '#00ff00', '#00ff88', '#00ffff', '#00aaff',
  '#0066ff', '#8b5cf6', '#ff00aa', '#ff0066',
  '#8b4513', '#ff8888', '#88ff88', '#8888ff',
];

export function DrawToolbar() {
  const { tool, setTool, drawColor, setDrawColor } = useCanvasStore();

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass rounded-2xl px-4 py-3 flex items-center gap-3"
    >
      {/* Tools */}
      <div className="flex gap-1 pr-3 border-r border-canvas-border">
        <ToolButton icon={<MousePointer2 size={18} />} active={tool === 'select'} onClick={() => setTool('select')} label="Select" />
        <ToolButton icon={<Pencil size={18} />} active={tool === 'pencil'} onClick={() => setTool('pencil')} label="Draw" />
        <ToolButton icon={<Eraser size={18} />} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Erase" />
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
          ? 'bg-neon-cyan/20 text-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.15)]'
          : 'text-canvas-muted hover:text-canvas-text hover:bg-canvas-elevated'}`}
    >
      {icon}
    </button>
  );
}
