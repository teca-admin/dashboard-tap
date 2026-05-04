import React, { useState } from 'react';
import { Tabs } from './components/ui';
import { PerformanceGeral } from './tabs/PerformanceGeral';
import { PerformanceAHL } from './tabs/PerformanceAHL';
import { PerformanceRampa } from './tabs/PerformanceRampa';
import { PerformanceLimpeza } from './tabs/PerformanceLimpeza';
import { Safety } from './tabs/Safety';
import { Consolidado } from './tabs/Consolidado';
import { RefreshCw } from 'lucide-react';
import { mutate } from 'swr';

const TABS = [
  'Consolidado',
  'Geral',
  'AHL e OHD',
  'Rampa',
  'Limpeza',
  'Safety'
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [vooId, setVooId] = useState<string>('');

  const handleRefresh = () => {
    // Invalidate SWR cache across all related keys globally by regex matching would be ideal, 
    // but simply triggering a global revalidate or specifying the likely keys works.
    mutate(
      key => typeof key === 'string' && key.startsWith('/api/sheets/metrics'),
      undefined,
      { revalidate: true }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-6 flex flex-col">
      <div className="w-full max-w-[1920px] mx-auto space-y-6">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <img 
              src="https://lh3.googleusercontent.com/d/1sNzDKhdh2zH8d8DoyqIjx8l5LzBEXN5g" 
              alt="WFS Logo" 
              className="h-8 object-contain"
            />
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Dashboard SLA TAP</h1>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">TAP Airlines</p>
            </div>
          </div>
          
          <div className="flex-1 w-full lg:w-auto overflow-x-auto lg:px-6">
            <Tabs selectedTab={activeTab} onChange={setActiveTab} options={TABS} className="mb-0 overflow-x-auto" />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
            <select 
              value={mes} 
              onChange={e => setMes(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-200 rounded text-[10px] font-semibold bg-white text-slate-700 h-8 focus:ring-2 focus:ring-rose-500 outline-none"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</option>
              ))}
            </select>
            
            <select 
              value={ano} 
              onChange={e => setAno(Number(e.target.value))}
              className="px-2 py-1.5 border border-slate-200 rounded text-[10px] font-semibold bg-white text-slate-700 h-8 focus:ring-2 focus:ring-rose-500 outline-none"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            
            <input 
              type="text" 
              placeholder="Voo (ID)" 
              value={vooId}
              onChange={e => setVooId(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded text-[10px] font-semibold bg-white text-slate-700 w-24 h-8 focus:ring-2 focus:ring-rose-500 outline-none"
            />
            
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer h-8 uppercase tracking-wider"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          <div className={activeTab === 'Consolidado' ? 'block' : 'hidden'}>
            <Consolidado mes={mes} ano={ano} />
          </div>
          <div className={activeTab === 'Geral' ? 'block' : 'hidden'}>
            <PerformanceGeral mes={mes} ano={ano} voo={vooId} />
          </div>
          <div className={activeTab === 'AHL e OHD' ? 'block' : 'hidden'}>
            <PerformanceAHL mes={mes} ano={ano} voo={vooId} />
          </div>
          <div className={activeTab === 'Rampa' ? 'block' : 'hidden'}>
            <PerformanceRampa mes={mes} ano={ano} voo={vooId} />
          </div>
          <div className={activeTab === 'Limpeza' ? 'block' : 'hidden'}>
            <PerformanceLimpeza mes={mes} ano={ano} voo={vooId} />
          </div>
          <div className={activeTab === 'Safety' ? 'block' : 'hidden'}>
            <Safety mes={mes} ano={ano} voo={vooId} />
          </div>
        </div>
        
      </div>
    </div>
  );
}

