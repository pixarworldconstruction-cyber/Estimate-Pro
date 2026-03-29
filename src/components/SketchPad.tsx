import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Group } from 'react-konva';
import { 
  Square, 
  Circle, 
  Type, 
  Eraser, 
  Download, 
  Share2, 
  Grid as GridIcon, 
  MousePointer2, 
  PenTool,
  Save,
  Trash2,
  Undo2
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const GRID_SIZE = 20;

export default function SketchPad() {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState<any[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [color, setColor] = useState('#10b981');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const isDrawing = useRef(false);
  const stageRef = useRef<any>(null);

  const handleMouseDown = (e: any) => {
    if (e.evt && e.evt.cancelable) e.evt.preventDefault();
    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    let x = pos.x;
    let y = pos.y;
    
    if (snapToGrid) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    setLines([...lines, { tool, points: [x, y], color, strokeWidth }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    if (e.evt && e.evt.cancelable) e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    let x = point.x;
    let y = point.y;
    
    if (snapToGrid && tool !== 'pen') {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([x, y]);

    setLines(lines.slice(0, -1).concat([lastLine]));
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleUndo = () => {
    setLines(lines.slice(0, -1));
  };

  const handleClear = () => {
    setLines([]);
  };

  const handleDownload = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'sketch.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    try {
      const uri = stageRef.current.toDataURL();
      const blob = await fetch(uri).then(res => res.blob());
      const file = new File([blob], 'sketch.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Sketch',
          text: 'Check out my construction sketch!'
        });
      } else if (navigator.share) {
        // Fallback to text/url share if files not supported
        await navigator.share({
          title: 'My Sketch',
          text: 'Check out my construction sketch!',
          url: window.location.href
        });
      } else {
        toast.error('Sharing is not supported on this browser');
      }
    } catch (err) {
      console.error('Share failed:', err);
      toast.error('Failed to share sketch');
    }
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const grid = [];
    for (let i = 0; i < 1000 / GRID_SIZE; i++) {
      grid.push(
        <Line
          key={`v-${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, 1000]}
          stroke="#f1f5f9"
          strokeWidth={1}
        />
      );
      grid.push(
        <Line
          key={`h-${i}`}
          points={[0, i * GRID_SIZE, 1000, i * GRID_SIZE]}
          stroke="#f1f5f9"
          strokeWidth={1}
        />
      );
    }
    return grid;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900 mb-2">Sketch Pad</h1>
          <p className="text-zinc-500">Draw site plans and quick engineering sketches.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownload} className="p-3 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 transition-all shadow-sm">
            <Download size={20} className="text-zinc-600" />
          </button>
          <button onClick={handleShare} className="p-3 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 transition-all shadow-sm">
            <Share2 size={20} className="text-zinc-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="bg-white rounded-[40px] shadow-sm border border-zinc-100 overflow-hidden relative group">
          <div className="absolute top-2 left-2 md:top-6 md:left-6 z-10 flex gap-1 md:gap-2 bg-white/80 backdrop-blur-md p-1 md:p-2 rounded-xl md:rounded-2xl border border-zinc-200 shadow-xl">
            {[
              { id: 'pen', icon: PenTool },
              { id: 'eraser', icon: Eraser },
              { id: 'rect', icon: Square },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${tool === t.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 hover:bg-zinc-100'}`}
              >
                <t.icon size={18} className="md:w-5 md:h-5" />
              </button>
            ))}
            <div className="w-px bg-zinc-200 mx-1" />
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${showGrid ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <GridIcon size={18} className="md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${snapToGrid ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <MousePointer2 size={18} className="md:w-5 md:h-5" />
            </button>
          </div>

          <div className="absolute top-2 right-2 md:top-6 md:right-6 z-10 flex gap-1 md:gap-2 bg-white/80 backdrop-blur-md p-1 md:p-2 rounded-xl md:rounded-2xl border border-zinc-200 shadow-xl">
            <button onClick={handleUndo} className="p-2 md:p-3 text-zinc-500 hover:bg-zinc-100 rounded-lg md:rounded-xl transition-all">
              <Undo2 size={18} className="md:w-5 md:h-5" />
            </button>
            <button onClick={handleClear} className="p-2 md:p-3 text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all">
              <Trash2 size={18} className="md:w-5 md:h-5" />
            </button>
          </div>

          <div className="cursor-crosshair bg-zinc-50">
            <Stage
              width={window.innerWidth > 1024 ? 800 : window.innerWidth - 48}
              height={600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                {/* Background Rect to ensure saved image has white background */}
                <Rect
                  x={0}
                  y={0}
                  width={2000}
                  height={2000}
                  fill="white"
                />
                {renderGrid()}
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      line.tool === 'eraser' ? 'destination-out' : 'source-over'
                    }
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stroke Color</label>
              <div className="grid grid-cols-5 gap-2">
                {['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#18181b'].map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-full aspect-square rounded-xl border-4 transition-all ${color === c ? 'border-primary scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stroke Width</label>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                <span>1px</span>
                <span>{strokeWidth}px</span>
                <span>20px</span>
              </div>
            </div>
          </div>

          <div className="bg-primary p-8 rounded-[32px] text-white space-y-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Save size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Drawing Mode</h3>
              <p className="text-white/70 text-sm">Snap to grid is {snapToGrid ? 'ON' : 'OFF'}. This helps in drawing perfectly straight lines for site plans.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
