import React, { useState, useEffect, useRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Dialog = ({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full max-w-[424px] rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
};

export const Popover = ({ trigger, content }: { trigger: React.ReactNode, content: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-flex items-center justify-center" ref={ref}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 p-3 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl whitespace-nowrap">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm", className)}>
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>
    {children}
  </div>
);

export const CardTitle = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <h3 className={cn("text-base font-semibold leading-none tracking-tight text-slate-900", className)}>
    {children}
  </h3>
);

export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn("p-6 pt-0", className)}>
    {children}
  </div>
);

export const Tabs = ({ selectedTab, onChange, options, className }: { selectedTab: string, onChange: (v: string) => void, options: string[], className?: string }) => {
  return (
    <div className={cn("flex space-x-1 rounded-xl bg-slate-100 p-1 mb-6 w-full", className)}>
      {options.map(option => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "w-full rounded-lg py-2 text-sm font-bold leading-5 transition-all duration-200 outline-none ring-0",
            selectedTab === option
              ? "bg-rose-600 text-white shadow-lg shadow-rose-200/50 translate-y-[-1px] border-none"
              : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 border-none"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
};
