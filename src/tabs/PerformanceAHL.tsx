import React from 'react';
import useSWR from 'swr';
import { MetricCard } from '../components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { StatusBadge } from './PerformanceGeral';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, Scatter } from 'recharts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function PerformanceAHL({ mes, ano, voo }: { mes: number, ano: number, voo: string }) {
  const { data, error, isLoading } = useSWR(`/api/sheets/metrics/ahl-ohd?mes=${mes}&ano=${ano}&voo=${voo}`, fetcher, { refreshInterval: 300000 });

  const chartData = React.useMemo(() => {
    if (!data?.cards) return [];
    return [
      { name: 'AHL Abertura', value: data.cards.ahlAbertura === null ? 100 : data.cards.ahlAbertura, meta: 95, hasData: data.cards.ahlAbertura !== null },
      { name: 'AHL Entrega', value: data.cards.ahlEntrega === null ? 100 : data.cards.ahlEntrega, meta: 95, hasData: data.cards.ahlEntrega !== null },
      { name: 'AHL Lista', value: data.cards.ahlLista === null ? 100 : data.cards.ahlLista, meta: 95, hasData: data.cards.ahlLista !== null },
      { name: 'OHD Retorno', value: data.cards.ohdRetorno === null ? 100 : data.cards.ohdRetorno, meta: 95, hasData: data.cards.ohdRetorno !== null },
    ];
  }, [data?.cards]);

  const overallAverage = React.useMemo(() => {
    if (!data?.cards) return 0;
    const totalRelatos = data.cards.quantidadeAtingidos + data.cards.quantidadeAtrasos;
    if (totalRelatos === 0) return 100; // No incidents means 100% conformity
    return (data.cards.quantidadeAtingidos / totalRelatos) * 100;
  }, [data?.cards]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando dados...</div>;
  if (error) return <div className="p-8 text-center text-rose-600">Erro ao carregar dados.</div>;
  if (!data?.cards) return null;

  const { cards, table } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Voos no Mês" value={cards.totalVoos} />
        <MetricCard 
          title="Voos SLA Atingido" 
          value={cards.quantidadeAtingidos} 
          colorClass="text-emerald-600"
        />
        <MetricCard 
          title="Voos abaixo do SLA" 
          value={cards.quantidadeAtrasos} 
          colorClass="text-rose-600" 
        />
        <MetricCard 
          title="Percentual Geral" 
          value={`${overallAverage.toFixed(1)}%`} 
          colorClass={overallAverage >= 95 ? 'text-emerald-600' : 'text-rose-600'}
        />
      </div>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Conformidade AHL vs OHD vs Meta</CardTitle>
        </CardHeader>
        <CardContent className="h-[435px] p-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 40, right: 40, left: 40, bottom: 40 }}>
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
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Eficiência:</span>
                              <span className="text-[10px] font-black text-slate-800">{data.hasData ? `${data.value.toFixed(1)}%` : 'N/A (SEM DADOS)'}</span>
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
                    content={(props: any) => {
                      const { x, y, value, width, index } = props;
                      const hasData = chartData[index]?.hasData;
                      return (
                        <text 
                          x={x + width / 2} 
                          y={y - 10} 
                          fill="#0f172a" 
                          textAnchor="middle" 
                          fontSize={11} 
                          fontWeight="900"
                        >
                          {hasData ? `${value.toFixed(1)}%` : '--'}
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Scatter 
                  dataKey="meta" 
                  name="Meta (%)" 
                  fill="#e11d48"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload.hasData) return null; // Don't show meta line if no data? Or show it? User said "não tem como medir"
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

          {/* Gap Indicators */}
          <div className="bg-white border-t border-slate-100 px-10 py-4">
            <div className="grid grid-cols-4 gap-4">
              {chartData.map((item, idx) => {
                const gap = item.value - item.meta;
                const isPositive = gap >= 0;
                const hasData = (item as any).hasData;

                return (
                  <div key={idx} className="flex flex-col items-center space-y-3">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">GAP DE META</span>
                    
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-sm ${!hasData ? 'bg-slate-50 text-slate-400' : isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {!hasData ? '0.0%' : `${isPositive ? '+' : ''}${gap.toFixed(1)}%`}
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${!hasData ? 'bg-slate-300' : isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        {!hasData ? '-' : isPositive ? '✓' : '▲'}
                      </div>
                    </div>

                    <div className="text-center space-y-0.5">
                      <p className="text-[10px] font-black text-slate-700 uppercase">REAL: {hasData ? `${item.value.toFixed(1)}%` : 'N/A'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">META: {item.meta}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-none shadow-xl">
        <CardHeader className="bg-white border-b border-slate-50 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-800 text-lg uppercase tracking-wider font-extrabold">Detalhamento de Voos - AHL e OHD</CardTitle>
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
                  <th className="px-2 py-5 text-center border-r border-slate-200/50">AHL Abert.</th>
                  <th className="px-2 py-5 text-center border-r border-slate-200/50">AHL Entrega</th>
                  <th className="px-2 py-5 text-center border-r border-slate-200/50">AHL Lista Solicitada</th>
                  <th className="px-2 py-5 text-center">OHD Retorno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {table.map((row: any, i: number) => (
                  <tr key={i} className="group hover:bg-slate-50/30 transition-colors">
                    {/* ID Voo / STD / Data */}
                    <td className="px-6 py-6 border-r border-slate-50 bg-slate-50/10 group-hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-stretch gap-6 h-full text-left">
                        {/* Operational Metadata Grid */}
                        <div className="flex-1 flex flex-col justify-center gap-3">
                           {/* Flight ID and Date Section */}
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                                 <span className="text-[6px] font-black text-slate-400 uppercase leading-none mb-0.5">VOO</span>
                                 <span className="text-[12px] font-black text-indigo-600 leading-none">{row.id_voo}</span>
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Data do Voo</span>
                                 <span className="text-[13px] font-black text-slate-800 leading-none">{row.data_chegada?.split(' ')[0]}</span>
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
                              <div className="flex flex-col p-2 px-3 bg-slate-50/50">
                                 <span className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-1 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-300" /> HORÁRIO DE POUSO
                                 </span>
                                 <span className="text-[14px] font-bold text-slate-400 tabular-nums leading-none">
                                    {row.data_chegada?.split(' ')[1] || 'N/A'}
                                 </span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50">
                      <StatusBadge 
                        status={row.ahl_abertura} 
                        detail={row.ahl_abertura_info} 
                        meta={row.ahl_abertura_meta}
                        perc={row.ahl_abertura_perc}
                        vooId={row.id_voo} 
                        horario_corte={row.horario_corte}
                        indicatorName="AHL Abertura" 
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50">
                      <StatusBadge 
                        status={row.ahl_entrega} 
                        detail={row.ahl_entrega_info} 
                        meta={row.ahl_entrega_meta}
                        perc={row.ahl_entrega_perc}
                        vooId={row.id_voo} 
                        horario_corte={row.horario_corte}
                        indicatorName="AHL Entrega" 
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50">
                      <StatusBadge 
                        status={row.ahl_lista} 
                        detail={row.ahl_lista_info} 
                        meta={row.ahl_lista_meta}
                        perc={row.ahl_lista_perc}
                        vooId={row.id_voo} 
                        horario_abertura_ahl={row.ahl_abertura_info}
                        indicatorName="AHL Lista (72H)" 
                      />
                    </td>
                    <td className="px-2 py-6 text-center">
                      <StatusBadge 
                        status={row.ohd_retorno} 
                        detail={row.ohd_retorno_info} 
                        meta={row.ohd_retorno_meta}
                        perc={row.ohd_retorno_perc}
                        vooId={row.id_voo} 
                        horario_abertura_ohd={row.ohd_abertura_info}
                        indicatorName="OHD Retorno (5 Dias)" 
                      />
                    </td>
                  </tr>
                ))}
                {table.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest bg-slate-50/50">
                      Nenhum registro AHL/OHD encontrado no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
