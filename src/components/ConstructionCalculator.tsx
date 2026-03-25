import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BrickWall, 
  PaintBucket, 
  Layers, 
  Zap, 
  Grid, 
  Gem, 
  DoorOpen, 
  Layout as Window, 
  Frame, 
  ChefHat, 
  Droplets,
  Calculator as CalcIcon,
  Info,
  IndianRupee
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

type ToolType = 'brick' | 'plaster' | 'paint' | 'gypsum' | 'electrical' | 'flooring' | 'stone' | 'doors' | 'windows' | 'frame' | 'kitchen' | 'plumbing';

interface Tool {
  id: ToolType;
  label: string;
  icon: any;
  featureId: string;
}

const TOOLS: Tool[] = [
  { id: 'brick', label: 'Brick Work', icon: BrickWall, featureId: 'calc-brick' },
  { id: 'plaster', label: 'Plastering', icon: PaintBucket, featureId: 'calc-plaster' },
  { id: 'paint', label: 'Wall Paint', icon: PaintBucket, featureId: 'calc-paint' },
  { id: 'gypsum', label: 'Gypsum', icon: Layers, featureId: 'calc-gypsum' },
  { id: 'electrical', label: 'Electrical', icon: Zap, featureId: 'calc-electrical' },
  { id: 'flooring', label: 'Flooring', icon: Grid, featureId: 'calc-flooring' },
  { id: 'stone', label: 'Stone Work', icon: Gem, featureId: 'calc-stone' },
  { id: 'doors', label: 'Doors', icon: DoorOpen, featureId: 'calc-doors' },
  { id: 'windows', label: 'Windows', icon: Window, featureId: 'calc-windows' },
  { id: 'frame', label: 'Frame Work', icon: Frame, featureId: 'calc-frame' },
  { id: 'kitchen', label: 'Kitchen', icon: ChefHat, featureId: 'calc-kitchen' },
  { id: 'plumbing', label: 'Plumbing', icon: Droplets, featureId: 'calc-plumbing' },
];

export default function ConstructionCalculator() {
  const { company } = useAuth();
  
  // Filter tools based on company features
  const availableTools = TOOLS.filter(tool => 
    company?.features?.includes(tool.featureId) || 
    !company?.features?.some(f => f.startsWith('calc-')) // If no specific calc features are set, show all if construction-calc is enabled
  );

  const [activeTool, setActiveTool] = useState<ToolType>(availableTools[0]?.id || 'brick');

  useEffect(() => {
    if (availableTools.length > 0 && !availableTools.find(t => t.id === activeTool)) {
      setActiveTool(availableTools[0].id);
    }
  }, [availableTools, activeTool]);
  const [specs, setSpecs] = useState<any>({
    length: 10,
    height: 10,
    width: 10,
    thickness: '9" (Double Brick)',
    thicknessMM: 12,
    mixRatio: '1:6',
    plasterType: 'Internal Wall Plaster',
    tileSize: '2x2 (24"x24")',
    stoneType: 'Granite (Standard)',
    points: {
      lightFan: 0,
      amp6: 0,
      amp15: 0,
      ac: 0,
      geyser: 0,
      exhaust: 0,
      tv: 0,
      internet: 0
    },
    doors: { material: 'Teak Wood' },
    windows: { material: 'Aluminum' },
    frameNos: 1,
    frameSizeRft: 15,
    frameKnobs: 2,
    dedoArea: 40,
    plumbingPoints: 3,
    bathrooms: 1,
    kitchens: 1,
    extraPoints: 2,
    kitchenType: 'L-Shape',
    kitchenLength: 10,
    countertopMaterial: 'Granite'
  });
  const [benchmarks, setBenchmarks] = useState<any>({
    laborRate: 25,
    materialRate: 150,
    rates: {
      lightFan: { labor: 250, material: 600 },
      amp6: { labor: 300, material: 800 },
      amp15: { labor: 600, material: 1500 },
      ac: { labor: 800, material: 2500 },
      geyser: { labor: 500, material: 1200 },
      exhaust: { labor: 300, material: 700 },
      tv: { labor: 400, material: 900 },
      internet: { labor: 400, material: 1000 }
    }
  });

  const [results, setResults] = useState<any>({
    primary: { value: 0, label: '' },
    secondary: { value: 0, label: '' },
    tertiary: { value: 0, label: '' },
    quaternary: { value: 0, label: '' },
    laborCost: 0,
    materialCost: 0,
    total: 0
  });

  useEffect(() => {
    let labor = 0;
    let material = 0;
    let res: any = {
      primary: { value: 0, label: '' },
      secondary: { value: 0, label: '' },
      tertiary: { value: 0, label: '' },
      quaternary: { value: 0, label: '' },
    };

    const area = specs.length * (specs.height || specs.width || 1);

    if (activeTool === 'brick') {
      const thicknessInFeet = specs.thickness.includes('9"') ? 0.75 : 0.375;
      const volume = area * thicknessInFeet;
      const bricksCount = Math.ceil(volume * 13.5);
      const mortarVolume = volume * 0.3;
      const dryMortar = mortarVolume * 1.33;
      const cementVolume = dryMortar / 7;
      const sandVolume = (dryMortar / 7) * 6;
      const cementBags = Math.ceil(cementVolume / 1.25);
      
      res.primary = { value: bricksCount, label: 'Bricks' };
      res.secondary = { value: cementBags, label: 'Cement Bags' };
      res.tertiary = { value: Math.round(sandVolume), label: 'Sand CFT' };
      
      labor = volume * benchmarks.laborRate;
      material = (bricksCount * 10) + (cementBags * 400) + (sandVolume * 60);
    } else if (activeTool === 'plaster') {
      const thicknessInFeet = specs.thicknessMM / 304.8;
      const volume = area * thicknessInFeet;
      const dryMortar = volume * 1.33;
      const cementVolume = dryMortar / 5;
      const cementBags = Math.ceil(cementVolume / 1.25);
      
      res.primary = { value: area.toFixed(1), label: 'SQFT Area' };
      res.secondary = { value: cementBags, label: 'Cement Bags' };
      
      labor = area * benchmarks.laborRate;
      material = (cementBags * 400) + (area * 5); // approx sand/other
    } else if (activeTool === 'paint' || activeTool === 'gypsum') {
      res.primary = { value: area.toFixed(1), label: 'Calculated Area' };
      labor = area * benchmarks.laborRate;
      material = area * benchmarks.materialRate;
    } else if (activeTool === 'electrical') {
      const totalPts = Object.values(specs.points).reduce((a: any, b: any) => a + b, 0) as number;
      res.primary = { value: totalPts, label: 'Total Pts' };
      res.secondary = { value: Math.ceil(totalPts * 0.4), label: '1.0 SQMM (Coils)' };
      res.tertiary = { value: Math.ceil(totalPts * 0.2), label: '1.5 SQMM (Coils)' };
      res.quaternary = { value: Math.ceil(totalPts * 0.1), label: '2.5 SQMM (Coils)' };
      
      labor = (specs.points.lightFan * benchmarks.rates.lightFan.labor) +
              (specs.points.amp6 * benchmarks.rates.amp6.labor) +
              (specs.points.amp15 * benchmarks.rates.amp15.labor) +
              (specs.points.ac * benchmarks.rates.ac.labor) +
              (specs.points.geyser * benchmarks.rates.geyser.labor) +
              (specs.points.exhaust * benchmarks.rates.exhaust.labor) +
              (specs.points.tv * benchmarks.rates.tv.labor) +
              (specs.points.internet * benchmarks.rates.internet.labor);
      material = (specs.points.lightFan * benchmarks.rates.lightFan.material) +
                 (specs.points.amp6 * benchmarks.rates.amp6.material) +
                 (specs.points.amp15 * benchmarks.rates.amp15.material) +
                 (specs.points.ac * benchmarks.rates.ac.material) +
                 (specs.points.geyser * benchmarks.rates.geyser.material) +
                 (specs.points.exhaust * benchmarks.rates.exhaust.material) +
                 (specs.points.tv * benchmarks.rates.tv.material) +
                 (specs.points.internet * benchmarks.rates.internet.material);
    } else if (activeTool === 'flooring' || activeTool === 'stone') {
      res.primary = { value: area.toFixed(1), label: 'Calculated Area' };
      labor = area * benchmarks.laborRate;
      material = area * benchmarks.materialRate;
    } else if (activeTool === 'doors' || activeTool === 'windows') {
      res.primary = { value: area.toFixed(1), label: 'Calculated Area' };
      res.secondary = { value: specs[activeTool].material, label: 'Material' };
      labor = area * benchmarks.laborRate;
      material = area * benchmarks.materialRate;
    } else if (activeTool === 'frame') {
      const totalRft = specs.frameNos * specs.frameSizeRft;
      const totalKnobs = specs.frameNos * specs.frameKnobs;
      res.primary = { value: totalRft, label: 'Total Rft' };
      res.secondary = { value: totalKnobs, label: 'Total Knobs' };
      labor = totalRft * benchmarks.laborRate;
      material = (totalRft * benchmarks.materialRate) + (totalKnobs * 150); // 150 per knob
    } else if (activeTool === 'kitchen') {
      const multiplier = specs.kitchenType === 'Straight' ? 1 : specs.kitchenType === 'L-Shape' ? 1.5 : 2;
      const platformRft = specs.kitchenLength * multiplier;
      res.primary = { value: platformRft.toFixed(1), label: 'Platform Rft' };
      res.secondary = { value: specs.dedoArea, label: 'Dedo SQFT' };
      labor = platformRft * 1200 + (specs.dedoArea * 40);
      material = platformRft * 3500 + (specs.dedoArea * 80);
    } else if (activeTool === 'plumbing') {
      const totalPts = specs.bathrooms * 4 + specs.kitchens * 2 + specs.extraPoints;
      res.primary = { value: totalPts, label: 'Total Pts' };
      res.secondary = { value: totalPts * 12, label: 'Pipe Ft' };
      labor = totalPts * benchmarks.laborRate;
      material = totalPts * benchmarks.materialRate;
    }

    setResults({
      ...res,
      laborCost: Math.round(labor),
      materialCost: Math.round(material),
      total: Math.round(labor + material)
    });
  }, [specs, benchmarks, activeTool]);

  const renderSpecs = () => {
    switch (activeTool) {
      case 'brick':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Length (FT)</label>
              <input type="number" value={specs.length} onChange={e => setSpecs({ ...specs, length: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Height (FT)</label>
              <input type="number" value={specs.height} onChange={e => setSpecs({ ...specs, height: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Wall Thickness</label>
              <select value={specs.thickness} onChange={e => setSpecs({ ...specs, thickness: e.target.value })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                <option>9" (Double Brick)</option>
                <option>4.5" (Single Brick)</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Mix Ratio</label>
              <select value={specs.mixRatio} onChange={e => setSpecs({ ...specs, mixRatio: e.target.value })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                <option>1:4</option>
                <option>1:6</option>
                <option>1:8</option>
              </select>
            </div>
          </div>
        );
      case 'plaster':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Plaster Type</label>
              <select value={specs.plasterType} onChange={e => setSpecs({ ...specs, plasterType: e.target.value })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                <option>Internal Wall Plaster (12mm)</option>
                <option>External Wall Plaster (20mm)</option>
                <option>Ceiling Plaster (6mm)</option>
                <option>Rough Plaster</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Length (FT)</label>
              <input type="number" value={specs.length} onChange={e => setSpecs({ ...specs, length: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Height (FT)</label>
              <input type="number" value={specs.height} onChange={e => setSpecs({ ...specs, height: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Thickness (MM)</label>
              <input type="number" value={specs.thicknessMM} onChange={e => setSpecs({ ...specs, thicknessMM: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
        );
      case 'paint':
      case 'gypsum':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Length / Height (FT)</label>
              <input type="number" value={specs.length} onChange={e => setSpecs({ ...specs, length: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Width (FT)</label>
              <input type="number" value={specs.width} onChange={e => setSpecs({ ...specs, width: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
        );
      case 'doors':
      case 'windows':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Length / Height (FT)</label>
              <input type="number" value={specs.length} onChange={e => setSpecs({ ...specs, length: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Width (FT)</label>
              <input type="number" value={specs.width} onChange={e => setSpecs({ ...specs, width: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Material Type</label>
              <select 
                value={specs[activeTool].material} 
                onChange={e => setSpecs({ ...specs, [activeTool]: { ...specs[activeTool], material: e.target.value } })} 
                className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              >
                {activeTool === 'doors' ? (
                  <>
                    <option>Teak Wood</option>
                    <option>Flush Door</option>
                    <option>PVC Door</option>
                    <option>Plywood</option>
                  </>
                ) : (
                  <>
                    <option>Aluminum</option>
                    <option>UPVC</option>
                    <option>Wood</option>
                    <option>Steel</option>
                  </>
                )}
              </select>
            </div>
          </div>
        );
      case 'electrical':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Light / Fan Points (NOS)</label>
              <input type="number" value={specs.points.lightFan} onChange={e => setSpecs({ ...specs, points: { ...specs.points, lightFan: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">6 Amp Points (NOS)</label>
              <input type="number" value={specs.points.amp6} onChange={e => setSpecs({ ...specs, points: { ...specs.points, amp6: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">15 Amp Points (NOS)</label>
              <input type="number" value={specs.points.amp15} onChange={e => setSpecs({ ...specs, points: { ...specs.points, amp15: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">A.C. Points (NOS)</label>
              <input type="number" value={specs.points.ac} onChange={e => setSpecs({ ...specs, points: { ...specs.points, ac: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Geyser Points (NOS)</label>
              <input type="number" value={specs.points.geyser} onChange={e => setSpecs({ ...specs, points: { ...specs.points, geyser: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Exhaust Points (NOS)</label>
              <input type="number" value={specs.points.exhaust} onChange={e => setSpecs({ ...specs, points: { ...specs.points, exhaust: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">TV Points (NOS)</label>
              <input type="number" value={specs.points.tv} onChange={e => setSpecs({ ...specs, points: { ...specs.points, tv: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Internet Points (NOS)</label>
              <input type="number" value={specs.points.internet} onChange={e => setSpecs({ ...specs, points: { ...specs.points, internet: parseInt(e.target.value) || 0 } })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
        );
      case 'flooring':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Length / Height (FT)</label>
              <input type="number" value={specs.length} onChange={e => setSpecs({ ...specs, length: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Width (FT)</label>
              <input type="number" value={specs.width} onChange={e => setSpecs({ ...specs, width: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Tile Size (Market Standard)</label>
              <select value={specs.tileSize} onChange={e => setSpecs({ ...specs, tileSize: e.target.value })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                <option>1x1 (12"x12")</option>
                <option>2x2 (24"x24")</option>
                <option>1x2 (12"x24")</option>
                <option>2x4 (24"x48")</option>
                <option>32"x32"</option>
                <option>4'x2' (GVT/PGVT)</option>
                <option>8'x4' (Slab)</option>
                <option>Wooden Plank (8"x40")</option>
                <option>6"x24" (Plank)</option>
                <option>12"x18" (Wall)</option>
                <option>10"x15" (Wall)</option>
                <option>12"x12" (Parking)</option>
                <option>16"x16" (Parking)</option>
                <option>Custom Size</option>
              </select>
            </div>
          </div>
        );
      case 'stone':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Length / Height (FT)</label>
              <input type="number" value={specs.length} onChange={e => setSpecs({ ...specs, length: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Width (FT)</label>
              <input type="number" value={specs.width} onChange={e => setSpecs({ ...specs, width: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Stone / Granite Type</label>
              <select value={specs.stoneType} onChange={e => setSpecs({ ...specs, stoneType: e.target.value })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                <option>Granite (Standard)</option>
                <option>Granite (Black Galaxy)</option>
                <option>Granite (Tan Brown)</option>
                <option>Granite (Rajasthan Black)</option>
                <option>Granite (P-White)</option>
                <option>Marble (Indian White)</option>
                <option>Marble (Italian)</option>
                <option>Marble (Makrana)</option>
                <option>Kota Stone</option>
                <option>Sandstone</option>
                <option>Quartz</option>
                <option>Kadappa</option>
                <option>Dholpur Stone</option>
              </select>
            </div>
          </div>
        );
      case 'frame':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">No. of Frames</label>
              <input type="number" value={specs.frameNos} onChange={e => setSpecs({ ...specs, frameNos: parseInt(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Size (Running Foot)</label>
              <input type="number" value={specs.frameSizeRft} onChange={e => setSpecs({ ...specs, frameSizeRft: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Knobs per Frame</label>
              <input type="number" value={specs.frameKnobs} onChange={e => setSpecs({ ...specs, frameKnobs: parseInt(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
        );
      case 'kitchen':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Kitchen Type</label>
              <select value={specs.kitchenType} onChange={e => setSpecs({ ...specs, kitchenType: e.target.value })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                <option>Straight</option>
                <option>L-Shape</option>
                <option>U-Shape</option>
                <option>Parallel</option>
                <option>Island</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Countertop Material</label>
              <select value={specs.kitchenMaterial} onChange={e => setSpecs({ ...specs, kitchenMaterial: e.target.value })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all">
                <option>Granite</option>
                <option>Quartz</option>
                <option>Marble</option>
                <option>Nano White</option>
                <option>Kalinga Stone</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Main Length (FT)</label>
              <input type="number" value={specs.kitchenLength} onChange={e => setSpecs({ ...specs, kitchenLength: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Dedo Area (SQFT)</label>
              <input type="number" value={specs.dedoArea} onChange={e => setSpecs({ ...specs, dedoArea: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
        );
      case 'plumbing':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Bathrooms (NOS)</label>
              <input type="number" value={specs.bathrooms} onChange={e => setSpecs({ ...specs, bathrooms: parseInt(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Kitchens (NOS)</label>
              <input type="number" value={specs.kitchens} onChange={e => setSpecs({ ...specs, kitchens: parseInt(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Extra Points</label>
              <input type="number" value={specs.extraPoints} onChange={e => setSpecs({ ...specs, extraPoints: parseInt(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderBenchmarks = () => {
    if (activeTool === 'electrical') {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">Light / Fan Point Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.lightFan.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, lightFan: { ...benchmarks.rates.lightFan, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.lightFan.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, lightFan: { ...benchmarks.rates.lightFan, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">6 Amp Socket Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.amp6.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, amp6: { ...benchmarks.rates.amp6, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.amp6.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, amp6: { ...benchmarks.rates.amp6, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">15 Amp Power Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.amp15.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, amp15: { ...benchmarks.rates.amp15, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.amp15.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, amp15: { ...benchmarks.rates.amp15, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">A.C. Point Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.ac.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, ac: { ...benchmarks.rates.ac, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.ac.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, ac: { ...benchmarks.rates.ac, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">Geyser Point Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.geyser.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, geyser: { ...benchmarks.rates.geyser, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.geyser.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, geyser: { ...benchmarks.rates.geyser, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">Exhaust Point Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.exhaust.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, exhaust: { ...benchmarks.rates.exhaust, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.exhaust.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, exhaust: { ...benchmarks.rates.exhaust, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">TV Point Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.tv.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, tv: { ...benchmarks.rates.tv, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.tv.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, tv: { ...benchmarks.rates.tv, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary ml-4">Internet Point Rates</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={benchmarks.rates.internet.labor} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, internet: { ...benchmarks.rates.internet, labor: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Labor" />
                <input type="number" value={benchmarks.rates.internet.material} onChange={e => setBenchmarks({ ...benchmarks, rates: { ...benchmarks.rates, internet: { ...benchmarks.rates.internet, material: parseFloat(e.target.value) || 0 } } })} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-xs font-bold" placeholder="Material" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Labor Rate (₹ / SQFT)</label>
          <input type="number" value={benchmarks.laborRate} onChange={e => setBenchmarks({ ...benchmarks, laborRate: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Material Rate (₹ / SQFT)</label>
          <input type="number" value={benchmarks.materialRate} onChange={e => setBenchmarks({ ...benchmarks, materialRate: parseFloat(e.target.value) || 0 })} className="w-full px-8 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 no-print">
        {availableTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base",
              activeTool === tool.id 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-100"
            )}
          >
            <tool.icon size={16} className="md:w-[18px] md:h-[18px]" />
            {tool.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 md:gap-8">
        <div className="space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-zinc-100 shadow-sm space-y-6 md:space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                <CalcIcon size={20} />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-900">Project Specifications</h2>
            </div>
            {renderSpecs()}
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-zinc-100 shadow-sm space-y-6 md:space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <IndianRupee size={20} />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-900">Market Cost Benchmarks</h2>
            </div>
            {renderBenchmarks()}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-[32px] md:rounded-[40px] p-6 md:p-8 text-white flex flex-col h-full shadow-2xl shadow-zinc-900/40">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 md:mb-8">Engineering Quantities</div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
            {results.primary.label && (
              <div className="bg-white p-3 md:p-4 rounded-[20px] md:rounded-[24px] text-center">
                <div className="text-xl md:text-2xl font-black text-zinc-900 mb-1">{results.primary.value}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{results.primary.label}</div>
              </div>
            )}
            {results.secondary.label && (
              <div className="bg-white p-3 md:p-4 rounded-[20px] md:rounded-[24px] text-center">
                <div className="text-xl md:text-2xl font-black text-zinc-900 mb-1">{results.secondary.value}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{results.secondary.label}</div>
              </div>
            )}
            {results.tertiary.label && (
              <div className="bg-white p-3 md:p-4 rounded-[20px] md:rounded-[24px] text-center">
                <div className="text-xl md:text-2xl font-black text-zinc-900 mb-1">{results.tertiary.value}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{results.tertiary.label}</div>
              </div>
            )}
            {results.quaternary.label && (
              <div className="bg-white p-3 md:p-4 rounded-[20px] md:rounded-[24px] text-center">
                <div className="text-xl md:text-2xl font-black text-zinc-900 mb-1">{results.quaternary.value}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{results.quaternary.label}</div>
              </div>
            )}
          </div>

          <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
            <div className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-[16px] md:rounded-[20px] border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Labor</span>
              <span className="text-base md:text-lg font-bold">₹{results.laborCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-[16px] md:rounded-[20px] border border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Material</span>
              <span className="text-base md:text-lg font-bold">₹{results.materialCost.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="bg-primary p-4 md:p-6 rounded-[24px] md:rounded-[32px] shadow-xl shadow-primary/20">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">Estimated Grand Total</div>
              <div className="text-2xl md:text-3xl font-black">₹{results.total.toLocaleString()}</div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-4 rounded-[32px] bg-white text-zinc-900 font-bold uppercase tracking-widest text-[10px] hover:bg-zinc-100 transition-all border border-zinc-200 no-print"
            >
              Download Estimate (PDF)
            </button>
          </div>

          <div className="mt-8 flex gap-3 p-6 bg-white/5 rounded-[24px] border border-white/10">
            <Info className="text-zinc-500 shrink-0" size={18} />
            <p className="text-[10px] leading-relaxed text-zinc-500 uppercase font-bold tracking-wider">
              * Note: Estimates include material wastage factors (approx 10-15%). Final site measurements prevail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}