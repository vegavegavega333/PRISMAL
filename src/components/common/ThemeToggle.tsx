import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sun, Moon, Laptop } from 'lucide-react';
import { ThemeMode } from '../../types';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', compact = false }) => {
  const { themeMode, setThemeMode } = useApp();

  const modes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Chiaro', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'dark', label: 'Scuro', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'system', label: 'Sistema', icon: <Laptop className="w-3.5 h-3.5" /> },
  ];

  if (compact) {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}>
        {modes.map(mode => {
          const isActive = themeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setThemeMode(mode.id)}
              title={`Tema: ${mode.label}`}
              className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {mode.icon}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 ${className}`}>
      {modes.map(mode => {
        const isActive = themeMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setThemeMode(mode.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isActive
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {mode.icon}
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
