import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from './ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';

interface VooConsolidado {
  id_voo: string;
  sla_geral: number;
  sla_ahl_ohd: number;
  sla_rampa: number;
  sla_limpeza: number;
  sla_safety: number;
  sla_media: number;
  detalhes_geral?: any[];
  detalhes_ahl?: any[];
  detalhes_rampa?: any[];
  detalhes_limpeza?: any[];
  detalhes_safety?: any;
}

interface VooConsolidadoCardProps {
  voo: VooConsolidado;
  isExpanded: boolean;
  onToggle: () => void;
}

export const VooConsolidadoCard: React.FC<VooConsolidadoCardProps> = ({ voo, isExpanded, onToggle }) => {
  const getStatusColor = (percentual: number) => {
    if (percentual >= 90) return 'text-[#0f172a] bg-slate-100 border border-slate-200';
    if (percentual >= 70) return 'text-amber-700 bg-amber-100 border border-amber-200';
    return 'text-rose-700 bg-rose-100 border border-rose-200';
  };

  const getCorGeral = (percentual: number) => {
    if (percentual >= 90) return 'text-[#0f172a]';
    if (percentual >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className={`rounded-xl border bg-white ${isExpanded ? 'border-slate-300 shadow-md' : 'border-slate-200'} hover:shadow-md transition-all cursor-pointer`} onClick={onToggle}>
      <div className="p-4">
        {/* Header do Card */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            <h3 className="text-lg font-bold text-slate-900">VOO {voo.id_voo}</h3>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold ${getStatusColor(voo.sla_media)}`}>
            Média: {voo.sla_media.toFixed(1)}%
          </div>
        </div>

        {/* Resumo Compacto - Sempre Visível */}
        <div className="grid grid-cols-5 gap-3">
          <SLABadge label="GERAL" valor={voo.sla_geral} />
          <SLABadge label="AHL/OHD" valor={voo.sla_ahl_ohd} />
          <SLABadge label="RAMPA" valor={voo.sla_rampa} />
          <SLABadge label="LIMPEZA" valor={voo.sla_limpeza} />
          <SLABadge label="SAFETY" valor={voo.sla_safety} />
        </div>

        {/* Detalhamento Expandido com Gráficos */}
        {isExpanded && voo.detalhes_geral && (
          <div className="mt-6 border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-12 gap-6" onClick={(e) => e.stopPropagation()}>
            <div className="col-span-1 md:col-span-6">
              <GraficoDetalhe titulo="GERAL" dados={voo.detalhes_geral} percentualGeral={voo.sla_geral} />
            </div>
            <div className="col-span-1 md:col-span-6">
              <GraficoDetalhe titulo="RAMPA" dados={voo.detalhes_rampa} percentualGeral={voo.sla_rampa} />
            </div>
            <div className="col-span-1 md:col-span-4">
              <GraficoDetalhe titulo="AHL E OHD" dados={voo.detalhes_ahl} percentualGeral={voo.sla_ahl_ohd} />
            </div>
            <div className="col-span-1 md:col-span-4">
              <GraficoDetalhe titulo="LIMPEZA" dados={voo.detalhes_limpeza} percentualGeral={voo.sla_limpeza} />
            </div>
            <div className="col-span-1 md:col-span-4 flex">
              <SafetyDisplay detalhes={voo.detalhes_safety} percentualGeral={voo.sla_safety} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de Gráfico de Barras Verticais
function GraficoDetalhe({ titulo, dados, percentualGeral }: any) {
  if (!dados) return null;
  const dadosGrafico = dados
    .filter((item: any) => typeof item.valor === 'number' && item.valor !== null)
    .map((item: any) => ({
      name: item.label.replace(/Check-?in/gi, 'CKI').replace(/Limpeza/gi, 'Limp.').replace(/Embarque/gi, 'Emb.'),
      valor: item.valor,
      meta: 95
    }));
  
  const getCorBarra = (valor: number) => {
    if (valor >= 90) return '#0f172a'; // Slate 900
    if (valor >= 70) return '#f59e0b'; // amber-600
    return '#ef4444'; // rose-600
  };

  const textC = percentualGeral >= 90 ? 'text-[#0f172a]' : percentualGeral >= 70 ? 'text-amber-600' : 'text-rose-600';
  
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col h-[400px] w-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{titulo}</h4>
        <span className={`text-xl font-bold ${textC}`}>
          {percentualGeral.toFixed(1)}%
        </span>
      </div>
      
      {dadosGrafico.length > 0 ? (
        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 25, right: 20, left: -25, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#64748b" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#64748b" 
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 400 }}
              ticks={[0, 25, 50, 75, 100]}
              width={40}
            />
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Performance']}
            />
            <ReferenceLine 
              y={95} 
              stroke="#e11d48" 
              strokeDasharray="3 3" 
              strokeWidth={2}
              label={{ 
                value: 'Meta 95%', 
                position: 'insideTopLeft', 
                fill: '#e11d48', 
                fontSize: 10, 
                fontWeight: 'bold',
                dy: -12
              }} 
            />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {dadosGrafico.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={getCorBarra(entry.valor)} />
              ))}
              <LabelList 
                dataKey="valor" 
                position="top" 
                formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                style={{ fill: '#0f172a', fontSize: '10px', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center text-slate-400 text-sm font-medium">
          Sem dados suficientes para o gráfico
        </div>
      )}
    </div>
  );
}

// Componente para Safety
function SafetyDisplay({ detalhes, percentualGeral }: any) {
  if (!detalhes) return null;
  const textC = percentualGeral >= 90 ? 'text-[#0f172a]' : percentualGeral >= 70 ? 'text-amber-600' : 'text-rose-600';
  const bgC = percentualGeral >= 90 ? 'bg-emerald-50' : percentualGeral >= 70 ? 'bg-amber-50' : 'bg-rose-50';
  
  return (
    <div className="rounded-xl p-6 border border-slate-200 shadow-sm bg-white h-[400px] w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">SAFETY</h4>
        <span className={`text-xl font-bold ${textC}`}>
          {percentualGeral.toFixed(1)}%
        </span>
      </div>
      <div className="flex flex-col gap-1 mt-4">
        <div className="text-lg font-semibold text-slate-700">
          {detalhes.itens_ok} de {detalhes.itens_total} itens em conformidade
        </div>
        {detalhes.avaliacao && detalhes.avaliacao !== 'N/A' && (
           <div className="text-sm font-medium text-slate-600 mt-2">
             Avaliação Limpeza: <span className="font-bold">{detalhes.avaliacao}</span>
           </div>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para os badges
function SLABadge({ label, valor }: { label: string; valor: number }) {
  const getColorClass = () => {
    if (valor >= 90) return 'text-[#0f172a]';
    if (valor >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getDotClass = () => {
    if (valor >= 90) return 'bg-[#0f172a]';
    if (valor >= 70) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${getDotClass()}`} />
      <div className="text-[10px] sm:text-xs font-black text-slate-500 mb-1 tracking-widest mt-1 uppercase">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold ${getColorClass()}`}>{valor.toFixed(1)}%</div>
    </div>
  );
}
