import React, { useState, useEffect } from 'react';
import { Ruler, Maximize, Box, Map as MapIcon, ArrowRightLeft, Copy, Check, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t, formatNumber } = useLanguage();
  const [category, setCategory] = useState<Category>('Length');
  const [fromUnit, setFromUnit] = useState(units['Length'][1].name); // ft
  const [toUnit, setToUnit] = useState(units['Length'][0].name); // m
  const [value, setValue] = useState<string>('1');
  const [result, setResult] = useState<number>(0);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(result.toFixed(4));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">{t('converter')}</h1>
        <p className="text-zinc-500">{t('converter_desc')}</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-zinc-100"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">{t('category')}</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
              className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
            >
              {Object.keys(units).map((cat) => (
                <option key={cat} value={cat}>{t(cat)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">{t('from')}</label>
            <div className="flex gap-2">
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="flex-1 px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              >
                {units[category].map((u) => (
                  <option key={u.name} value={u.name}>{u.name}</option>
                ))}
              </select>
              <button 
                onClick={swapUnits}
                className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-900 hover:text-white transition-all"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">{t('to')}</label>
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
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-4">{t('enter_value')}</label>
            <div className="relative">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-6 md:px-8 py-4 md:py-6 bg-zinc-50 border border-zinc-100 rounded-[20px] md:rounded-[24px] text-xl md:text-3xl font-black text-primary outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          <div className="bg-zinc-900 p-6 md:p-8 rounded-[24px] md:rounded-[32px] text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">{t('converted_result')}</div>
              <div className="text-3xl md:text-5xl font-black mb-2 truncate">
                {formatNumber(result.toLocaleString(undefined, { maximumFractionDigits: 4 }))}
              </div>
              <div className="text-lg md:text-xl font-bold text-primary uppercase tracking-widest">{toUnit}</div>
              
              <button
                onClick={handleCopy}
                className="mt-8 flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? t('copied') : t('copy')}
              </button>
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
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-6">{t('common_conversions')}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">{formatNumber(1)} {t('Length') === 'Length' ? 'Meter' : t('Length')}</span>
              <span className="font-black text-blue-900">{formatNumber(3.28)} {t('Length') === 'Length' ? 'Feet' : t('Length')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">{formatNumber(1)} Brass (Area)</span>
              <span className="font-black text-blue-900">{formatNumber(100)} Sqft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">{formatNumber(1)} Brass (Volume)</span>
              <span className="font-black text-blue-900">{formatNumber(100)} Cft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800">{formatNumber(1)} Cubic Meter</span>
              <span className="font-black text-blue-900">{formatNumber(35.31)} Cft</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100">
          <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest mb-6">{t('land_units')}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">{formatNumber(1)} Guntha</span>
              <span className="font-black text-emerald-900">{formatNumber(1089)} Sqft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">{formatNumber(1)} Acre</span>
              <span className="font-black text-emerald-900">{formatNumber(40)} Guntha</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">{formatNumber(1)} Acre</span>
              <span className="font-black text-emerald-900">{formatNumber(43560)} Sqft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-800">{formatNumber(1)} Vigha (Gujarat)</span>
              <span className="font-black text-emerald-900">{formatNumber(17424)} Sqft</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-50 p-8 rounded-[32px] border border-zinc-100 flex items-start gap-6">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-500 shadow-sm shrink-0">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-zinc-900 mb-2">{t('did_you_know')}</h3>
          <p className="text-zinc-600 font-medium leading-relaxed">
            {t('brass_info')}
          </p>
        </div>
      </div>
    </div>
  );
}
