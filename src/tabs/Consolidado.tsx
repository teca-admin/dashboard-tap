import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { VooConsolidadoCard } from '../components/VooConsolidadoCard';
import { AlertCircle, PlaneTakeoff, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Props {
  mes: number;
  ano: number;
}

export function Consolidado({ mes, ano }: Props) {
  const [vooExpandido, setVooExpandido] = useState<string | null>(null);

  const { data, error, isLoading } = useSWR(
    `/api/sheets/metrics/consolidado?mes=${mes}&ano=${ano}`,
    fetcher,
    { refreshInterval: 300000 } // 5 minutes
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200 flex flex-col items-center justify-center">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="font-semibold">Erro ao carregar os dados consolidados.</p>
        <p className="text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  const voos = data?.voos || [];
  
  if (voos.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        <p className="font-semibold text-lg">Nenhum voo encontrado no período.</p>
        <p className="text-sm mt-1">Selecione outro mês/ano no menu superior.</p>
      </div>
    );
  }

  const mediaMes = data?.media_mes || 0;
  const totalVoos = data?.total_voos || 0;
  const voosAcima = data?.voos_acima_sla || 0;
  const voosAbaixo = data?.voos_abaixo_sla || 0;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        <MetricCard 
          title="Total de Voos" 
          value={totalVoos.toString()}
          icon={<PlaneTakeoff className="w-5 h-5 text-slate-700" />}
        />
        
        <MetricCard 
          title="Média SLA Geral" 
          value={`${mediaMes.toFixed(1)}%`}
          icon={<TrendingUp className={`w-5 h-5 ${mediaMes >= 90 ? 'text-[#0f172a]' : typeof mediaMes === 'number' && mediaMes >= 70 ? 'text-amber-500' : 'text-rose-600'}`} />}
        />
        
        <MetricCard 
          title="Voos Atingindo SLA" 
          value={voosAcima.toString()}
          icon={<CheckCircle className="w-5 h-5 text-[#0f172a]" />}
        />
        
        <MetricCard 
          title="Voos Abaixo do SLA" 
          value={voosAbaixo.toString()}
          icon={<XCircle className="w-5 h-5 text-rose-600" />}
        />
      </div>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h2 className="text-xl font-bold text-slate-800">Detalhamento por Voo</h2>
        <div className="text-sm font-medium text-slate-500">
          Mostrando {voos.length} {voos.length === 1 ? 'voo' : 'voos'}
        </div>
      </div>

      {/* Lista de Voos */}
      <div className="space-y-4">
        {voos.map((voo: any) => (
          <VooConsolidadoCard 
            key={voo.id_voo}
            voo={voo}
            isExpanded={vooExpandido === voo.id_voo}
            onToggle={() => setVooExpandido(
              vooExpandido === voo.id_voo ? null : voo.id_voo
            )}
          />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: any) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 shadow-sm rounded-xl bg-slate-50 border border-slate-100">
          {icon}
        </div>
        <div>
          <div className="text-[10px] font-black tracking-widest uppercase text-slate-500 mb-1">{title}</div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
