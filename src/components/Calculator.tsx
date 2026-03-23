import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Delete, Divide, Equal, Minus, Plus, X, RotateCcw } from 'lucide-react';

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [formula, setFormula] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num);
  };

  const handleOperator = (op: string) => {
    setFormula(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const fullFormula = formula + display;
      // Using Function constructor as a safer alternative to eval for simple math
      // In a real app, use a math library like mathjs
      const result = new Function(`return ${fullFormula.replace(/x/g, '*').replace(/÷/g, '/')}`)();
      setDisplay(String(result));
      setFormula('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setFormula('');
  };

  const scientific = (fn: string) => {
    try {
      const val = parseFloat(display);
      let result = 0;
      switch (fn) {
        case 'sin': result = Math.sin(val); break;
        case 'cos': result = Math.cos(val); break;
        case 'tan': result = Math.tan(val); break;
        case 'sqrt': result = Math.sqrt(val); break;
        case 'log': result = Math.log10(val); break;
        case 'ln': result = Math.log(val); break;
        case 'pow': setFormula(display + ' ** '); setDisplay('0'); return;
      }
      setDisplay(String(result));
    } catch (e) {
      setDisplay('Error');
    }
  };

  const buttons = [
    { label: 'sin', action: () => scientific('sin'), type: 'sci' },
    { label: 'cos', action: () => scientific('cos'), type: 'sci' },
    { label: 'tan', action: () => scientific('tan'), type: 'sci' },
    { label: '√', action: () => scientific('sqrt'), type: 'sci' },
    { label: 'log', action: () => scientific('log'), type: 'sci' },
    { label: 'ln', action: () => scientific('ln'), type: 'sci' },
    { label: 'π', action: () => setDisplay(String(Math.PI)), type: 'sci' },
    { label: 'e', action: () => setDisplay(String(Math.E)), type: 'sci' },
    { label: 'x²', action: () => scientific('pow'), type: 'sci' },
    { label: 'abs', action: () => setDisplay(String(Math.abs(parseFloat(display)))), type: 'sci' },
    { label: 'C', action: clear, type: 'clear' },
    { label: '÷', action: () => handleOperator('÷'), type: 'op', icon: Divide },
    { label: '7', action: () => handleNumber('7'), type: 'num' },
    { label: '8', action: () => handleNumber('8'), type: 'num' },
    { label: '9', action: () => handleNumber('9'), type: 'num' },
    { label: 'x', action: () => handleOperator('x'), type: 'op', icon: X },
    { label: '4', action: () => handleNumber('4'), type: 'num' },
    { label: '5', action: () => handleNumber('5'), type: 'num' },
    { label: '6', action: () => handleNumber('6'), type: 'num' },
    { label: '-', action: () => handleOperator('-'), type: 'op', icon: Minus },
    { label: '1', action: () => handleNumber('1'), type: 'num' },
    { label: '2', action: () => handleNumber('2'), type: 'num' },
    { label: '3', action: () => handleNumber('3'), type: 'num' },
    { label: '+', action: () => handleOperator('+'), type: 'op', icon: Plus },
    { label: '0', action: () => handleNumber('0'), type: 'num', span: 2 },
    { label: '.', action: () => handleNumber('.'), type: 'num' },
    { label: '=', action: calculate, type: 'equal', icon: Equal },
  ];

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">Scientific Calculator</h1>
        <p className="text-zinc-500">Perform complex engineering calculations.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 p-8 rounded-[48px] shadow-2xl border border-zinc-800"
      >
        <div className="mb-8 p-6 bg-zinc-800/50 rounded-3xl text-right overflow-hidden">
          <div className="text-zinc-500 text-sm font-mono h-6 mb-1">{formula}</div>
          <div className="text-white text-5xl font-black tracking-tighter truncate">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`
                h-16 rounded-2xl flex items-center justify-center text-lg font-bold transition-all active:scale-95
                ${btn.span === 2 ? 'col-span-2' : ''}
                ${btn.type === 'num' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : ''}
                ${btn.type === 'op' ? 'bg-primary/10 text-primary hover:bg-primary/20' : ''}
                ${btn.type === 'sci' ? 'bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700 text-sm' : ''}
                ${btn.type === 'clear' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : ''}
                ${btn.type === 'equal' ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20' : ''}
              `}
            >
              {btn.icon ? <btn.icon size={20} /> : btn.label}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
