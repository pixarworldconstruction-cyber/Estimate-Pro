import React, { useState, useEffect } from 'react';
import { Ruler, Maximize, Box, Map as MapIcon } from 'lucide-react';
import { motion } from 'motion/react';

type Category = 'Length' | 'Area' | 'Volume' | 'Land (India)';

interface Unit {
  name: string;
  factor: number; // Factor to base unit (m, m2, m3, sqft)
}

const units: Record<Category, Unit[]> = {
  Length: [
    { name: 'm', factor: 1 },
    { name: 'ft', factor: 0.3048 },
    { name: 'in', factor: 0.0254 },
    { name: 'cm', factor: 0.01 },
    { name: 'mm', factor: 0.001 },
    { name: 'yd', factor: 0.9144 },
  ],
  Area: [
    { name: 'sqm', factor: 1 },
    { name: 'sqft', factor: 0.092903 },
    { name: 'sqin', factor: 0.00064516 },
    { name: 'sqyd', factor: 0.836127 },
    { name: 'Brass (Area)', factor: 9.2903 }, // 100 sqft
  ],
  Volume: [
    { name: 'cum', factor: 1 },
    { name: 'cft', factor: 0.0283168 },
    { name: 'Litre', factor: 0.001 },
    { name: 'Brass (Volume)', factor: 2.83168 }, // 100 cft
  ],
  'Land (India)': [
    { name: 'sqft', factor: 1 },
    { name: 'Guntha', factor: 1089 },
    { name: 'Acre', factor: 43560 },
    { name: 'Vigha (Gujarat)', factor: 17424 },
    { name: 'Bigha (UP)', factor: 27000 },
    { name: 'Hectare', factor: 107639 },
  ],
};

export default function UnitConverter() {
  const [category, setCategory] = useState<Category>('Length');
  const [fromUnit, setFromUnit] = useState(units['Length'][1].name); // ft
  const [toUnit, setToUnit] = useState(units['Length'][0].name); // m
  const [value, setValue] = useState<string>('1');
  const [result, setResult] = useState<number>(0);

  useEffect(() => {
    const catUnits = units[category];
    const from = catUnits.find((u) => u.name === fromUnit);
    const to = catUnits.find((u) => u.name === toUnit);

    if (from && to) {
      const val = parseFloat(value) || 0;
      const baseValue = val * from.factor;
      const converted = baseValue / to.factor;
      setResult(converted);
    }
  }, [category, fromUnit, toUnit, value]);

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    setFromUnit(units[cat][0].name);
    setToUnit(units[cat][1].name);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">Unit Conversion</h1>
        <p className="text-zinc-500">Convert between various construction and engineering units.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[40px] shadow-sm border border-zinc-100"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Category</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
              className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
            >
              {Object.keys(units).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">From</label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
            >
              {units[category].map((u) => (
                <option key={u.name} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">To</label>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
            >
              {units[category].map((u) => (
                <option key={u.name} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">Enter Value</label>
            <div className="relative">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-8 py-10 bg-zinc-50 border border-zinc-100 rounded-[32px] text-5xl font-black text-primary outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          <div className="bg-zinc-900 p-10 rounded-[40px] text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Converted Result</div>
              <div className="text-7xl font-black mb-2 truncate">
                {result.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </div>
              <div className="text-xl font-bold text-primary uppercase tracking-widest">{toUnit}</div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-5">
              {category === 'Length' && <Ruler size={240} />}
              {category === 'Area' && <Maximize size={240} />}
              {category === 'Volume' && <Box size={240} />}
              {category === 'Land (India)' && <MapIcon size={240} />}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100">
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-6">Common Conversions</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">1 Meter</span>
              <span className="font-black text-blue-900">3.28 Feet</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">1 Brass (Area)</span>
              <span className="font-black text-blue-900">100 Sqft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">1 Brass (Volume)</span>
              <span className="font-black text-blue-900">100 Cft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">1 Cubic Meter</span>
              <span className="font-black text-blue-900">35.31 Cft</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100">
          <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-6">Land Units (India)</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">1 Guntha</span>
              <span className="font-black text-emerald-900">1089 Sqft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">1 Acre</span>
              <span className="font-black text-emerald-900">40 Guntha</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">1 Acre</span>
              <span className="font-black text-emerald-900">43,560 Sqft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">1 Vigha (Gujarat)</span>
              <span className="font-black text-emerald-900">17,424 Sqft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
