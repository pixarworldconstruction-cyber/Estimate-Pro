import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: 'bg-red-50',
      text: 'text-red-500',
      button: 'bg-red-500 hover:bg-red-600',
      icon: Trash2
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-500',
      button: 'bg-amber-500 hover:bg-amber-600',
      icon: AlertTriangle
    },
    info: {
      bg: 'bg-blue-50',
      text: 'text-blue-500',
      button: 'bg-blue-500 hover:bg-blue-600',
      icon: AlertTriangle
    }
  };

  const config = colors[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl scale-in-center">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto", config.bg, config.text)}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-zinc-900">{title}</h3>
          <p className="text-zinc-500 text-sm">{message}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn("flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all", config.button)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
