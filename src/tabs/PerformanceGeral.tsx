import React from 'react';
import useSWR from 'swr';
import { MetricCard } from '../components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle, Popover, Dialog } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList, ComposedChart, Scatter } from 'recharts';
import { FileText, Database, X, Info } from 'lucide-react';

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    let errorMessage = `Erro ${r.status}`;
    try {
      const json = JSON.parse(text);
      if (json.error) errorMessage += `: ${json.error}`;
    } catch (e) {
      if (text.startsWith('<!DOCTYPE html>')) {
        errorMessage += ': Resposta HTML inesperada (Provável erro de rota no Vercel)';
      } else {
        errorMessage += `: ${text.substring(0, 100)}`;
      }
    }
    throw new Error(errorMessage);
  }
  return r.json();
};

const INDICATORS_INFO = {
  abertura: {
    title: 'ABERTURA DE CHECK-IN',
    banco: 'Abertura CHECK IN',
    meta: 'Garante que o atendimento aos passageiros comece no tempo previsto para evitar filas acumuladas.',
    resumo: 'Cálculo: Horário Real de Abertura - Meta (STD - 03:30h)',
    importancia: 'Mede o horário exato da primeira interação no sistema de check-in em relação ao horário planejado.'
  },
  fechamento: {
    title: 'FECHAMENTO DE CHECK-IN',
    banco: 'Fechamento CHECK IN',
    meta: 'Fundamental para o processamento final de documentos e liberação dos passageiros para o portão.',
    resumo: 'Cálculo: Horário Real de Fechamento - Meta (STD - 01:00h)',
    importancia: 'Mede o encerramento do atendimento no balcão respeitando o limite operacional antes do voo.'
  },
  embarque: {
    title: 'INÍCIO DO EMBARQUE',
    banco: 'Início Embarque',
    meta: 'Controla a pontualidade do fluxo de saída do terminal para a aeronave.',
    resumo: 'Cálculo: Horário de Início do Embarque - Meta (STD - 00:40h)',
    importancia: 'Mede o momento exato em que o primeiro passageiro atravessa o portão de embarque.'
  },
  ultimoPax: {
    title: 'ÚLTIMO PAX A BORDO',
    banco: 'Último PAX a bordo',
    meta: 'O indicador mais crítico para garantir que o Pushback ocorra sem atrasos no slot.',
    resumo: 'Cálculo: Horário do Último PAX - Meta (STD - 00:10h)',
    importancia: 'Mede o fechamento das portas da aeronave após o embarque do último passageiro.'
  },
  bags: {
    title: 'BAGS DE MÃO',
    banco: 'BAGS de Mão Atendidos',
    meta: 'Garante o conforto a bordo e evita atrasos por excesso de bagagem na cabine principal. Meta operacional de conformidade de 98%.',
    resumo: 'Cálculo: (Real / Meta 98%)',
    importancia: 'Mede a conformidade na quantidade de bagagens de mão despachadas no portão de embarque buscando atingir 98% de meta.'
  },
  cicloAtendimento: {
    title: 'CICLO ATENDIMENTO',
    banco: 'Vários campos (Abertura Check-in vs Último PAX)',
    meta: 'Essencial para dimensionar a produtividade da equipe de terra e garantir que o fluxo de passageiros não cause atrasos no STD.',
    resumo: 'Cálculo: Último PAX a bordo - Abertura de Check-in',
    importancia: 'Mede o tempo total de processamento dos passageiros desde o início do atendimento no balcão até o fechamento da aeronave.'
  },
  eficienciaEmbarque: {
    title: 'EFICIÊNCIA EMBARQUE',
    banco: 'Vários campos (Início Embarque vs Último PAX)',
    meta: 'Reflete a coordenação entre as equipes de portão e a agilidade no fluxo dos passageiros.',
    resumo: 'Cálculo: Último PAX a bordo - Início do Embarque',
    importancia: 'Mede o tempo líquido gasto para embarcar todos os passageiros no portão de embarque.'
  },
  eficienciaOperacional: {
    title: 'EFICIÊNCIA OPERACIONAL',
    banco: 'Vários campos (Pouso vs Pushback)',
    meta: 'Reflete a coordenação entre todas as áreas (Rampa, Limpeza, Catering e Tráfego) para liberar a aeronave no menor tempo possível.',
    resumo: 'Cálculo: Horário de Pushback - Horário de Pouso',
    importancia: 'Mede o turnaround completo da aeronave em solo (tempo de permanência entre a chegada e a partida).'
  }
};

function GuidanceDialog({ 
  type, 
  trigger 
}: { 
  type: keyof typeof INDICATORS_INFO, 
  trigger: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const info = INDICATORS_INFO[type];

  return (
    <>
      <div className="cursor-pointer group/header" onClick={() => setIsOpen(true)}>
        {trigger}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="bg-[#004282] px-10 py-10 text-white relative rounded-t-[20px] text-left">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-1">Dicionário de Métricas de Fluxo</p>
            <h2 className="text-2xl font-bold uppercase tracking-tight leading-none">{info.title}</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="absolute top-8 right-8 w-10 h-10 bg-white/10 hover:bg-white/20 flex items-center justify-center rounded-full transition-all group/close"
          >
            <X className="w-5 h-5 text-white group-hover/close:scale-110 transition-transform" />
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white overflow-hidden text-left">
          <div className="px-10 py-10 space-y-10">
            {/* O QUE É */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">O que é?</p>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                {info.importancia}
              </p>
            </div>

            {/* FÓRMULA */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Fórmula de Cálculo</p>
              <div className="bg-[#f8fafc] border border-slate-100 p-6 rounded-2xl">
                <p className="text-[13px] font-bold text-[#004282] font-mono tracking-tight">
                  {info.resumo.replace('Cálculo: ', '')}
                </p>
              </div>
            </div>

            {/* IMPORTÂNCIA */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Importância Estratégica</p>
              <p className="text-[13px] font-bold text-slate-500 italic leading-relaxed">
                "{info.meta}"
              </p>
            </div>
          </div>

          {/* Footer Area */}
          <div className="bg-[#f8fafc] px-10 py-7 flex justify-end border-t border-slate-100 rounded-b-[20px]">
            <button 
              onClick={() => setIsOpen(false)} 
              className="bg-[#0f172a] text-white px-10 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function PerformanceGeral({ mes, ano, voo }: { mes: number, ano: number, voo: string }) {
  const { data, error, isLoading } = useSWR(`/api/sheets/metrics/geral?mes=${mes}&ano=${ano}&voo=${voo}`, fetcher, { refreshInterval: 300000 });

  const table = data?.table;

  // Calculate weighted average for indicators
  const indicatorsForWeighted = ['Abertura CKIN', 'Fechamento CKIN', 'Embarque', 'Último PAX', 'Bags'];
  const indicatorMappingShort: Record<string, string> = {
    'abertura': 'Abertura CKIN',
    'fechamento': 'Fechamento CKIN',
    'embarque': 'Embarque',
    'ultimo_pax': 'Último PAX',
    'bags': 'Bags'
  };

  const weightedComparacaoMetas = React.useMemo(() => {
    if (!table || !Array.isArray(table)) return [];
    
    return Object.entries(indicatorMappingShort).map(([key, label]) => {
      let totalPerc = 0;
      let count = 0;
      let fixedMeta = 0;

      // Map keys to their default SLAs
      const defaultSLAs: Record<string, number> = {
        'abertura': 98,
        'fechamento': 98,
        'embarque': 95,
        'ultimo_pax': 95,
        'bags': 98
      };

      table.forEach((row: any) => {
        const percRaw = row[`${key}_perc`];
        const perc = typeof percRaw === 'string' ? parseFloat(percRaw.replace(',', '.')) : percRaw;

        if (typeof perc === 'number' && !isNaN(perc)) {
          totalPerc += perc;
          count++;
        }
      });

      // Override fixedMeta for Bags or use defaultSLAs
      fixedMeta = key === 'bags' ? 98 : defaultSLAs[key] || 90;

      const value = count > 0 ? totalPerc / count : 0;

      return {
        name: label,
        value: value,
        meta: fixedMeta
      };
    });
  }, [table]);

  const overallWeightedAverage = React.useMemo(() => {
    if (weightedComparacaoMetas.length === 0) return 0;
    const sum = weightedComparacaoMetas.reduce((acc, curr) => acc + curr.value, 0);
    return sum / weightedComparacaoMetas.length;
  }, [weightedComparacaoMetas]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando dados...</div>;
  if (error) return <div className="p-8 text-center text-rose-600 font-bold bg-rose-50 rounded-xl m-4 border border-rose-100">{error.message}</div>;
  if (!data?.cards) return null;

  const { cards } = data;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Voos no Mês" value={cards.totalVoos} />
        <MetricCard 
          title="Voos SLA Atingido" 
          value={cards.totalVoos - cards.quantidadeAtrasos} 
          colorClass="text-emerald-600"
        />
        <MetricCard 
          title="Voos abaixo do SLA" 
          value={cards.quantidadeAtrasos} 
          colorClass="text-rose-600" 
        />
        <MetricCard 
          title="Percentual Geral" 
          value={`${overallWeightedAverage.toFixed(1)}%`} 
          colorClass={overallWeightedAverage >= 95 ? 'text-emerald-600' : 'text-rose-600'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Performance vs Meta por Indicador (Média Ponderada)</CardTitle>
          </CardHeader>
          <CardContent className="h-[435px] p-0 flex flex-col">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weightedComparacaoMetas} margin={{ top: 40, right: 40, left: 40, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={10} 
                    tick={{ fill: '#94a3b8', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={15} 
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg">
                            <p className="text-[10px] font-black text-slate-800 mb-2 uppercase">{data.name}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Eficiência (Ponderada):</span>
                                <span className="text-[10px] font-black text-slate-800">{data.value.toFixed(1)}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Meta (SLA):</span>
                                <span className="text-[10px] font-black text-rose-500">{data.meta}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={45}>
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      formatter={(val: number) => `${val.toFixed(1)}%`} 
                      style={{ fill: '#0f172a', fontSize: 11, fontWeight: '900' }} 
                      offset={10} 
                    />
                  </Bar>
                  <Scatter 
                    dataKey="meta" 
                    name="Meta (%)" 
                    fill="#e11d48"
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      return (
                        <line 
                          x1={cx - 28} 
                          y1={cy} 
                          x2={cx + 28} 
                          y2={cy} 
                          stroke="#e11d48" 
                          strokeWidth={3} 
                          strokeLinecap="round"
                        />
                      );
                    }} 
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ 
                      fontSize: '9px', 
                      fontWeight: '500', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      paddingBottom: '20px',
                      color: '#94a3b8'
                    }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Gap Indicators - Re-styling to match exact user request image */}
            <div className="bg-white border-t border-slate-100 px-10 py-4">
              <div className="grid grid-cols-5 gap-4">
                {weightedComparacaoMetas.map((item, idx) => {
                  const gap = item.value - item.meta;
                  const isPositive = gap >= 0;
                  return (
                    <div key={idx} className="flex flex-col items-center space-y-3">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">GAP DE META</span>
                      
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-sm ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isPositive ? '+' : ''}{gap.toFixed(1)}%
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                          {isPositive ? '✓' : '▲'}
                        </div>
                      </div>

                      <div className="text-center space-y-0.5">
                        <p className="text-[10px] font-black text-slate-700 uppercase">REAL: {item.value.toFixed(1)}%</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">META: {item.meta}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-none shadow-xl">
        <CardHeader className="bg-white border-b border-slate-50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-800 text-lg uppercase tracking-wider font-extrabold">Atendimentos Individuais</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Exibindo {table.length} voos com base no filtro selecionado acima</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Conforme</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Não Conforme</span>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-slate-500 uppercase font-bold bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5 text-left border-r border-slate-200/50 bg-slate-100/30">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-black text-slate-700 tracking-wider">IDENTIFICAÇÃO</span>
                      <span className="text-[8px] font-bold text-slate-400 tracking-[0.2em]">VOO / DATA / HORÁRIOS</span>
                    </div>
                  </th>
                  <th className="px-2 py-5 text-center border-r border-slate-200/50">
                    <GuidanceDialog type="abertura" trigger={
                      <div className="flex flex-col items-center gap-1">
                        <span>Abertura Check-in</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded-full tracking-tighter">SLA: 98%</span>
                      </div>
                    } />
                  </th>
                  <th className="px-2 py-5 text-center border-r border-slate-200/50">
                    <GuidanceDialog type="fechamento" trigger={
                      <div className="flex flex-col items-center gap-1">
                        <span>Fechamento Check-in</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded-full tracking-tighter">SLA: 98%</span>
                      </div>
                    } />
                  </th>
                  <th className="px-2 py-5 text-center border-r border-slate-200/50">
                    <GuidanceDialog type="embarque" trigger={
                      <div className="flex flex-col items-center gap-1">
                        <span>Início do Embarque</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded-full tracking-tighter">SLA: 95%</span>
                      </div>
                    } />
                  </th>
                  <th className="px-2 py-5 text-center border-r border-slate-200/50">
                    <GuidanceDialog type="ultimoPax" trigger={
                      <div className="flex flex-col items-center gap-1">
                        <span>Último Pax a Bordo</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded-full tracking-tighter">SLA: 95%</span>
                      </div>
                    } />
                  </th>
                  <th className="px-2 py-5 text-center">
                    <GuidanceDialog type="bags" trigger={
                      <div className="flex flex-col items-center gap-1">
                        <span>Bags de Mão</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded-full tracking-tighter">SLA: 70%</span>
                      </div>
                    } />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {table.map((row: any, i: number) => (
                  <tr key={i} className="group hover:bg-slate-50/30 transition-colors">
                    {/* ID Voo / STD / Data */}
                    <td className="px-6 py-6 border-r border-slate-50 bg-slate-50/10 group-hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-stretch gap-6 h-full text-left">
                        {/* 1. Operational Metadata Grid */}
                        <div className="flex-1 flex flex-col justify-center gap-3">
                           {/* Flight ID and Date Section */}
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                                 <span className="text-[6px] font-black text-slate-400 uppercase leading-none mb-0.5">VOO</span>
                                 <span className="text-[12px] font-black text-indigo-600 leading-none">{row.id_voo}</span>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Data do Voo</span>
                                 <span className="text-[13px] font-black text-slate-800 leading-none">{row.data?.split(' ')[0]}</span>
                              </div>
                           </div>

                           {/* Horizontal Timing Card */}
                           <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100 bg-white/80 rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                              <div className="flex flex-col p-2 px-3">
                                 <span className="text-[7px] font-black text-indigo-500 uppercase flex items-center gap-1 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-indigo-500" /> STD
                                 </span>
                                 <span className="text-[14px] font-black text-slate-700 tabular-nums leading-none">
                                    {row.std?.match(/\d{1,2}:\d{2}(:\d{2})?/) ? row.std.match(/\d{1,2}:\d{2}(:\d{2})?/)[0] : row.std}
                                 </span>
                              </div>
                              <div className="flex flex-col p-2 px-3">
                                 <span className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-1 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-300" /> HORÁRIO DE POUSO
                                 </span>
                                 <span className="text-[14px] font-bold text-slate-400 tabular-nums leading-none">
                                    {row.data?.match(/\d{1,2}:\d{2}(:\d{2})?/) 
                                      ? row.data.match(/\d{1,2}:\d{2}(:\d{2})?/)[0] 
                                      : (row.std?.match(/\d{1,2}:\d{2}(:\d{2})?/) ? row.std.match(/\d{1,2}:\d{2}(:\d{2})?/)[0] : '--:--')}
                                 </span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </td>

                    {/* Indicators */}
                    <td className="px-2 py-6 border-r border-slate-50">
                      <StatusBadge 
                        detail={row.abertura_info} 
                        perc={row.abertura_perc} 
                        meta={row.abertura_meta} 
                        status={row.abertura} 
                        vooId={row.id_voo}
                        std={row.std}
                        v_etd={row.v_etd}
                        indicatorName="Abertura de Check-in"
                        sheetColumnName="Abertura Check-IN"
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50">
                      <StatusBadge 
                        detail={row.fechamento_info} 
                        perc={row.fechamento_perc} 
                        meta={row.fechamento_meta} 
                        status={row.fechamento}
                        vooId={row.id_voo}
                        std={row.std}
                        indicatorName="Fechamento de Check-in"
                        sheetColumnName="Fechamento Check-IN"
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50">
                      <StatusBadge 
                        detail={row.embarque_info} 
                        perc={row.embarque_perc} 
                        meta={row.embarque_meta} 
                        status={row.embarque}
                        vooId={row.id_voo}
                        std={row.std}
                        indicatorName="Início do Embarque"
                        sheetColumnName="Início Embarque"
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50">
                      <StatusBadge 
                        detail={row.ultimo_pax_info} 
                        perc={row.ultimo_pax_perc} 
                        meta={row.ultimo_pax_meta} 
                        status={row.ultimo_pax}
                        vooId={row.id_voo}
                        std={row.std}
                        indicatorName="Último PAX a Bordo"
                        sheetColumnName="Último PAX a bordo"
                      />
                    </td>
                    <td className="px-2 py-6 text-center">
                      <StatusBadge 
                        detail={row.bags_info} 
                        perc={row.bags_perc} 
                        meta={row.bags_meta} 
                        status={row.bags}
                        vooId={row.id_voo}
                        std={row.std}
                        indicatorName="Bags de Mão"
                        sheetColumnName="BAGS de Mão Atendidos"
                        pax={row.pax}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Define extractTime as a pure function outside the component
const extractTime = (str?: string | null) => {
  if (!str || str === 'N/A') return str || '--:--';
  const match = str.match(/\d{1,2}:\d{2}(:\d{2})?/);
  return match ? match[0] : str;
}

export function StatusBadge({ 
  status, 
  detail, 
  perc, 
  meta, 
  vooId,
  std,
  horario_corte,
  horario_abertura_ahl,
  horario_abertura_ohd,
  v_etd,
  indicatorName,
  sheetColumnName,
  inicio_limpeza,
  pax
}: { 
  status: string, 
  detail?: string, 
  perc?: number, 
  meta?: string, 
  vooId?: string,
  std?: string,
  horario_corte?: string,
  horario_abertura_ahl?: string,
  horario_abertura_ohd?: string,
  v_etd?: string,
  indicatorName?: string,
  sheetColumnName?: string,
  inicio_limpeza?: string,
  pax?: number
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (!status) return null;
  const isConforme = status.toLowerCase() === 'conforme' || status.toLowerCase() === 'sim' || status.toLowerCase() === 'excelente';
  const isNA = status.toLowerCase() === 'n/a';
  
  const textColorClass = isNA ? 'text-slate-300' : isConforme ? 'text-emerald-500' : 'text-rose-500';
  const dotColorClass = isNA ? 'bg-slate-200' : isConforme ? 'bg-emerald-500' : 'bg-rose-500';
  const percBgClass = isNA ? 'bg-slate-50' : isConforme ? 'bg-emerald-50' : 'bg-rose-50';
  
  const timeMatch = detail?.match(/\d{1,2}:\d{2}(:\d{2})?/);
  let displayTime = timeMatch ? timeMatch[0] : (detail === '' || !detail ? '--:--' : detail);

  if ((indicatorName === 'AHL Lista (72H)' || indicatorName === 'OHD Retorno (5 Dias)') && detail && detail.includes('/')) {
    const parts = detail.split(' ');
    if (parts[0].includes('/')) displayTime = parts[0];
  }
  
  // Format meta to show only time if date is present
  let displayMeta = meta || '';
  if (displayMeta.includes(' ')) {
    if (indicatorName === 'AHL Lista (72H)' || indicatorName === 'OHD Retorno (5 Dias)') {
      const parts = displayMeta.replace('META: ', '').split(' ');
      displayMeta = displayMeta.startsWith('META:') ? `META: ${parts[0]}` : parts[0];
    } else if (displayMeta.includes(':')) {
      const parts = displayMeta.split(' ');
      if (displayMeta.startsWith('META:')) {
        displayMeta = `META: ${parts[parts.length - 1]}`;
      } else {
        displayMeta = parts[parts.length - 1];
      }
    }
  }

  // Fallback for simple display (if no meta/perc provided - used in other tabs)
  const isDetailed = (meta !== undefined && perc !== undefined) || (indicatorName === 'Início Limpeza' || indicatorName === 'Tempo de Limpeza');

  if (!isDetailed) {
    const simpleTextColor = isNA ? 'text-slate-300' : isConforme ? 'text-emerald-600' : 'text-rose-600';

    return (
      <>
        <button 
          onClick={() => setIsOpen(true)}
          className={`inline-flex flex-col items-center justify-center p-2 rounded-lg transition-colors hover:bg-slate-100 cursor-pointer w-full mx-auto min-w-[90px]`}
        >
          <span className={`text-xs sm:text-sm font-bold ${simpleTextColor} text-center leading-tight`}>
            {displayTime}
          </span>
          <div className="w-full flex items-center justify-center gap-1 mt-1.5 px-2">
            <div className={`h-[3px] w-full max-w-[40px] rounded-full ${isNA ? 'bg-slate-100' : isConforme ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-wider text-center">
            {status || 'N/A'}
          </span>
        </button>
        <DetailDialog 
          isOpen={isOpen} 
          setIsOpen={setIsOpen} 
          indicatorName={indicatorName} 
          vooId={vooId} 
          isConforme={isConforme} 
          detail={detail} 
          status={status} 
          meta={meta} 
          displayTime={displayTime} 
          perc={perc} 
          std={std}
          v_etd={v_etd}
          horario_corte={horario_corte}
          horario_abertura_ahl={horario_abertura_ahl}
          horario_abertura_ohd={horario_abertura_ohd}
          sheetColumnName={sheetColumnName}
          inicio_limpeza={inicio_limpeza}
          pax={pax}
        />
      </>
    );
  }

  // Calculate meta if not provided for specific indicators
  let finalDisplayMeta = displayMeta;
  if (!finalDisplayMeta || finalDisplayMeta === '--:--') {
    if (indicatorName === 'Início Limpeza' && horario_corte) {
      try {
        const time = horario_corte.includes(' ') ? horario_corte.split(' ')[1] : horario_corte;
        const [h, m] = time.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          let objM = m + 12;
          let objH = h;
          if (objM >= 60) {
            objH += Math.floor(objM / 60);
            objM = objM % 60;
          }
          if (objH >= 24) objH = objH % 24;
          finalDisplayMeta = `META: ${String(objH).padStart(2, '0')}:${String(objM).padStart(2, '0')}`;
        }
      } catch (e) {}
    } else if (indicatorName === 'Tempo de Limpeza') {
      finalDisplayMeta = 'META: 15 min';
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center p-2 w-full hover:bg-white hover:shadow-2xl hover:shadow-slate-200/80 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group/cell hover:-translate-y-1 hover:scale-[1.05] active:scale-95 border border-transparent hover:border-slate-100 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/30 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
        <div className="flex items-center justify-center gap-1.5 w-full mb-1 sm:px-2 relative z-10">
          <span className={`text-base sm:text-lg font-black leading-none ${textColorClass} tracking-tight group-hover/cell:scale-110 transition-transform duration-300`}>
            {displayTime}
          </span>
          {!isNA && (
            <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${percBgClass} ${textColorClass} border border-current/20 shadow-sm`}>
              {perc !== undefined ? `${perc}%` : (isConforme ? '100%' : '0%')}
            </span>
          )}
        </div>
        
        {/* Horizontal line with dot */}
        <div className="relative w-full h-[1.5px] bg-slate-100 my-2 max-w-[80%] mx-auto">
          {!isNA && (
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ring-2 ring-white ${dotColorClass}`} />
          )}
        </div>
        
        <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-full border border-slate-100 group-hover/cell:border-slate-200 transition-colors">
          {finalDisplayMeta}
        </span>
      </button>

      <DetailDialog 
        isOpen={isOpen} 
        setIsOpen={setIsOpen} 
        indicatorName={indicatorName} 
        vooId={vooId} 
        isConforme={isConforme} 
        detail={detail} 
        status={status} 
        meta={meta} 
        displayTime={displayTime} 
        perc={perc} 
        std={std}
        horario_corte={horario_corte}
        horario_abertura_ahl={horario_abertura_ahl}
        horario_abertura_ohd={horario_abertura_ohd}
        v_etd={v_etd}
        sheetColumnName={sheetColumnName}
        inicio_limpeza={inicio_limpeza}
        pax={pax}
      />
    </>
  );
}

function DetailDialog({ 
  isOpen, 
  setIsOpen, 
  indicatorName, 
  vooId, 
  isConforme, 
  detail, 
  status, 
  meta, 
  displayTime, 
  perc,
  std,
  horario_corte,
  horario_abertura_ahl,
  horario_abertura_ohd,
  v_etd,
  sheetColumnName,
  inicio_limpeza,
  pax
}: any) {
  // Logic formatting
  let rawMeta = meta?.replace('META: ', '') || '--:--';
  
  if (indicatorName === 'Início Limpeza' && horario_corte) {
    try {
      const time = horario_corte.includes(' ') ? horario_corte.split(' ')[1] : horario_corte;
      const [h, m] = time.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        let objM = m + 12;
        let objH = h;
        if (objM >= 60) {
          objH += Math.floor(objM / 60);
          objM = objM % 60;
        }
        if (objH >= 24) objH = objH % 24;
        rawMeta = `${String(objH).padStart(2, '0')}:${String(objM).padStart(2, '0')}`;
      }
    } catch (e) {}
  }

  if (indicatorName === 'Tempo de Limpeza') {
    rawMeta = '15 min';
  }

  if (rawMeta.includes(' ')) {
    const parts = rawMeta.split(' ');
    if (indicatorName === 'AHL Lista (72H)' || indicatorName === 'OHD Retorno (5 Dias)') {
      rawMeta = parts[0];
    } else if (rawMeta.includes(':')) {
      rawMeta = parts[parts.length - 1]; 
    }
  }
  
  let logicText = null;
  if (indicatorName && indicatorName === 'Bags Atendidos') {
    logicText = `Real (${detail}) vs Meta de Atendimento (98%). Performance calculada sobre a meta de conformidade e itens coletados.`;
  } else if (indicatorName && indicatorName === 'Descarga Bags') {
    logicText = `Realizado (${displayTime}) vs Objetivo (Corte + 15 min: ${rawMeta}). O Descarregamento deve ocorrer em até 15 minutos após o horário de corte anti-colisão.`;
  } else if (indicatorName && indicatorName === 'Descarga Cargas') {
    logicText = `Realizado (${displayTime}) vs Objetivo (Corte + 25 min: ${rawMeta}). O Descarregamento de Cargas deve ocorrer em até 25 minutos após o horário de corte anti-colisão.`;
  } else if (indicatorName && indicatorName === 'Carr. Bags') {
    logicText = `Realizado (${displayTime}) vs Objetivo (STD + 5 min: ${rawMeta}). O Carregamento de Bagagens deve ocorrer em até 5 minutos após o horário de Previsão Decolagem (STD).`;
  } else if (indicatorName && indicatorName === 'Carr. Cargas') {
    logicText = `Realizado (${displayTime}) vs Objetivo (STD + 15 min: ${rawMeta}). O Carregamento de Cargas deve ocorrer em até 15 minutos após o horário de Previsão Decolagem (STD).`;
  } else if (indicatorName && indicatorName === '1ª Bag Esteira') {
    logicText = `Realizado (${displayTime}) vs Objetivo (Corte + 15 min: ${rawMeta}). A primeira bagagem na esteira deve ocorrer em até 15 minutos após o horário de corte anti-colisão.`;
  } else if (indicatorName && indicatorName === 'Última Bag') {
    logicText = `Realizado (${displayTime}) vs Objetivo (Corte + 25 min: ${rawMeta}). A última bagagem na esteira deve ocorrer em até 25 minutos após o horário de corte anti-colisão.`;
  } else if (indicatorName && indicatorName.includes('AHL Lista (72H)')) {
    logicText = `Realizado (${displayTime}) vs Objetivo (${rawMeta}). Meta: Horário Abertura AHL + 72 horas. Performance: 100% se pontual. Se atraso: 100 - (Minutos de Atraso).`;
  } else if (indicatorName && indicatorName === 'OHD Retorno (5 Dias)') {
    logicText = `Realizado (${displayTime}) vs Objetivo (${rawMeta}). Meta: Horário Abertura OHD + 05 dias. Performance: 100% se pontual. Se atraso: 100 - (Minutos de Atraso).`;
  } else if (indicatorName && (indicatorName.includes('AHL Abertura') || indicatorName.includes('AHL Entrega'))) {
    logicText = `Realizado (${displayTime}) vs Objetivo (${rawMeta}). Meta: Horário de Corte + 2 horas. Performance: 100% se pontual. Se atraso: 100 - (Minutos de Atraso).`;
  } else if (indicatorName && indicatorName.includes('Abertura')) {
    logicText = `Meta: STD - 210 min. Realizado (${displayTime}) vs Objetivo (${rawMeta}). Performance: 100% se pontual. Se atraso: 100 - (Minutos de Atraso).`;
  } else if (indicatorName && indicatorName.includes('Fechamento')) {
    logicText = `Meta: STD - 60 min. Realizado (${displayTime}) vs Objetivo (${rawMeta}). Performance: 100% se pontual. Se atraso: 100 - (Minutos de Atraso).`;
  } else if (indicatorName && indicatorName.includes('Embarque')) {
    logicText = `Meta: STD - 40 min. Realizado (${displayTime}) vs Objetivo (${rawMeta}). Performance: 100% se pontual. Se atraso: 100 - (Minutos de Atraso).`;
  } else if (indicatorName && indicatorName.includes('Último PAX')) {
    logicText = `Meta: STD - 10 min. Realizado (${displayTime}) vs Objetivo (${rawMeta}). Performance: 100% se pontual. Se atraso: 100 - (Minutos de Atraso).`;
  } else if (indicatorName && indicatorName.includes('Abertura do Porão')) {
    logicText = `Realizado (${displayTime}) vs Objetivo (Corte + 2 min: ${rawMeta}). Abertura deve ocorrer em até 2 minutos após o horário de corte anti-colisão.`;
  } else if (indicatorName && indicatorName === 'Início Limpeza') {
    logicText = `Real (${displayTime}) vs Meta (${rawMeta}). Meta baseada em Horário de corte (${extractTime(horario_corte)}) + 12 minutos.`;
  } else if (indicatorName && indicatorName === 'Tempo de Limpeza') {
    logicText = `Real (${detail?.replace('Tempo Decorrido: ', '')}) vs Meta (${rawMeta}). O tempo de limpeza (Término - Início) deve ser de no máximo 15 minutos.`;
  } else {
    let diffText = '';
    try {
      if (std && rawMeta !== '--:--') {
        const stdTime = std.includes(' ') ? std.split(' ')[1] : std;
        const [stdH, stdM] = stdTime.split(':').map(Number);
        const [metaH, metaM] = rawMeta.split(':').map(Number);
        const stdMinutes = stdH * 60 + stdM;
        const metaMinutes = metaH * 60 + metaM;
        let diff = stdMinutes - metaMinutes;
        if (diff < 0) diff += 1440;
        if (diff > 0) {
          if (diff >= 60) {
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            diffText = `- ${h}h${m > 0 ? ` ${m}min` : ''}`;
          } else {
            diffText = `- ${diff} min`;
          }
        }
      }
    } catch (e) {
      diffText = '';
    }
    logicText = `Real (${detail}) vs Meta (${rawMeta}). Meta baseada em STD (${std}) ${diffText}.`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Header */}
      <div className="bg-[#004282] px-4 py-4 text-white relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mb-0">Rastreabilidade Operacional</p>
            <h2 className="text-sm font-black uppercase tracking-tight leading-none">Voo {vooId} • {indicatorName}</h2>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          className="absolute top-4 right-4 w-6 h-6 bg-white/10 hover:bg-white/20 flex items-center justify-center rounded-full transition-all"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      </div>

      <div className="p-0 bg-white text-[10px]">
        {/* KPI Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <div className="px-3 py-3 text-center bg-slate-50/30">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {indicatorName === 'Tempo de Limpeza' ? 'Tempo Decorrido' : 'Realizado'}
            </p>
            <p className={`text-base font-black tabular-nums ${isConforme ? 'text-emerald-500' : 'text-rose-500'}`}>
              {indicatorName === 'Bags Atendidos' ? detail : (displayTime?.replace('Tempo Decorrido: ', '') || displayTime)}
            </p>
          </div>
          <div className="px-3 py-3 text-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Objetivo</p>
            <p className="text-base font-black tabular-nums text-slate-700">{rawMeta}</p>
          </div>
          <div className="px-3 py-3 text-center bg-slate-50/30 flex flex-col items-center justify-center">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {indicatorName === 'Início Limpeza' || indicatorName === 'Tempo de Limpeza' ? 'Avaliação de limpeza' : 'Avaliação'}
            </p>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-base font-black uppercase tracking-wider ${isConforme ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
               {perc !== undefined ? `${perc}%` : (isConforme ? '100%' : '0%')}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Lógica */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
               <Info className="w-3 h-3 text-indigo-500" />
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Lógica do BI</p>
            </div>
            <div className="bg-indigo-50/30 border border-indigo-100/50 p-2.5 rounded-lg">
              <p className="text-[11px] font-bold text-slate-600 leading-snug italic">
                "{logicText}"
              </p>
            </div>
          </div>

          {/* Dados Brutos */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
               <Database className="w-3 h-3 text-emerald-500" />
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Dados no Banco</p>
            </div>
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-[11px] table-fixed">
                <thead className="bg-[#f8fafc] border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-4 font-black text-slate-400 uppercase text-left w-[65%]">Campo</th>
                    <th className="px-4 py-4 font-black text-slate-400 uppercase text-right w-[35%]">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {indicatorName === 'Bags Atendidos' ? (
                    <>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">PAX Atendidos</td>
                        <td className="px-4 py-3.5 font-black text-slate-700 text-right">{pax}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">Meta proporcional</td>
                        <td className="px-4 py-3.5 font-black text-slate-700 text-right">{rawMeta}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">{indicatorName}</td>
                        <td className="px-4 py-3.5 font-black text-indigo-600 text-right">{detail}</td>
                      </tr>
                    </>
                  ) : indicatorName === 'AHL Lista (72H)' ? (
                    <>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">Horário Abertura AHL</td>
                        <td className="px-4 py-3.5 font-black text-slate-700 text-right">{extractTime(horario_abertura_ahl)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">{indicatorName} Real</td>
                        <td className="px-4 py-3.5 font-black text-indigo-600 text-right">{displayTime}</td>
                      </tr>
                    </>
                  ) : (indicatorName === 'Início Limpeza' || indicatorName === 'AHL Abertura' || indicatorName === 'AHL Entrega' || indicatorName === 'Abertura do Porão' || indicatorName === 'Descarga Bags' || indicatorName === 'Descarga Cargas' || indicatorName === '1ª Bag Esteira' || indicatorName === 'Última Bag') ? (
                    <>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">Horário de corte</td>
                        <td className="px-4 py-3.5 font-black text-slate-700 text-right">{extractTime(horario_corte)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">{indicatorName} Real</td>
                        <td className="px-4 py-3.5 font-black text-indigo-600 text-right">{displayTime}</td>
                      </tr>
                    </>
                  ) : indicatorName === 'OHD Retorno (5 Dias)' ? (
                    <>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">Horário Abertura OHD</td>
                        <td className="px-4 py-3.5 font-black text-slate-700 text-right">{extractTime(horario_abertura_ohd)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">{indicatorName} Real</td>
                        <td className="px-4 py-3.5 font-black text-indigo-600 text-right">{displayTime}</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">Horário de corte</td>
                        <td className="px-4 py-3.5 font-black text-slate-700 text-right">{extractTime(std)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3.5 font-bold text-slate-500 text-left">{indicatorName} Real</td>
                        <td className="px-4 py-3.5 font-black text-indigo-600 text-right">{displayTime}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8fafc] px-10 py-5 flex justify-end border-t border-slate-100">
          <button 
            onClick={() => setIsOpen(false)} 
            className="bg-[#0f172a] text-white px-10 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
          >
            Confirmado
          </button>
        </div>
      </div>
    </Dialog>
  );
}
