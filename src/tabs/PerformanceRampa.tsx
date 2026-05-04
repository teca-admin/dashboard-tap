import React from 'react';
import useSWR from 'swr';
import { MetricCard } from '../components/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { StatusBadge } from './PerformanceGeral';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, Scatter } from 'recharts';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function PerformanceRampa({ mes, ano, voo }: { mes: number, ano: number, voo: string }) {
  const { data, error, isLoading } = useSWR(`/api/sheets/metrics/rampa?mes=${mes}&ano=${ano}&voo=${voo}`, fetcher, { refreshInterval: 300000 });

  const overallAverage = React.useMemo(() => {
    if (!data?.cards) return 0;
    const { aberturaPorao, descargaBags, descargaCargas, carregamentoBags, carregamentoCargas, primeiraBag, ultimaBag } = data.cards;
    return (aberturaPorao + descargaBags + descargaCargas + carregamentoBags + carregamentoCargas + primeiraBag + ultimaBag) / 7;
  }, [data?.cards]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Carregando dados...</div>;
  if (error) return <div className="p-8 text-center text-rose-600">Erro ao carregar dados.</div>;
  if (!data?.cards) return null;

  const { cards, table } = data;

  const chartData = [
    { name: 'Abertura Porão', value: cards.aberturaPorao, meta: 95 },
    { name: 'Descarga Bags', value: cards.descargaBags, meta: 95 },
    { name: 'Descarga Cargas', value: cards.descargaCargas, meta: 95 },
    { name: 'Carr. Bags', value: cards.carregamentoBags, meta: 95 },
    { name: 'Carr. Cargas', value: cards.carregamentoCargas, meta: 95 },
    { name: '1ª Bag', value: cards.primeiraBag, meta: 98 },
    { name: 'Última Bag', value: cards.ultimaBag, meta: 98 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total de Voos no Mês" value={cards.totalVoos} />
        <MetricCard 
          title="Voos SLA Atingido" 
          value={cards.quantidadeAtingidos} 
          colorClass="text-emerald-600"
        />
        <MetricCard 
          title="Voos Abaixo do SLA" 
          value={cards.quantidadeAtrasos} 
          colorClass="text-rose-600"
        />
        <MetricCard 
          title="Percentual Geral" 
          value={`${overallAverage.toFixed(1)}%`} 
          colorClass={overallAverage >= 95 ? 'text-emerald-600' : 'text-rose-600'}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-tighter">Performance de Rampa vs Meta</CardTitle>
        </CardHeader>
        <CardContent className="h-[435px] p-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis hide domain={[0, 115]} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 4 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 leading-none">{data.name}</p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Eficiência:</span>
                              <span className="text-[10px] font-black text-slate-800">{data.value.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Meta (SLA):</span>
                              <span className="text-[10px] font-black text-slate-400">{data.meta}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  content={() => (
                    <div className="flex justify-end gap-4 mb-6">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Meta (%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-900" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Value</span>
                      </div>
                    </div>
                  )}
                />
                <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 0, 0]} barSize={40}>
                  <LabelList 
                    dataKey="value" 
                    position="top" 
                    content={(props: any) => {
                      const { x, y, value, width } = props;
                      return (
                        <text 
                          x={x + width / 2} 
                          y={y - 10} 
                          fill="#0f172a" 
                          textAnchor="middle" 
                          fontSize={11} 
                          fontWeight="900"
                        >
                          {`${value.toFixed(1)}%`}
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
                    const { cx, cy } = props;
                    return (
                      <line 
                        x1={cx - 28} 
                        x2={cx + 28} 
                        y1={cy} 
                        y2={cy} 
                        stroke="#ef4444" 
                        strokeWidth={2.5} 
                        strokeDasharray="4 2"
                      />
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gap Indicators */}
          <div className="bg-white border-t border-slate-100 px-4 py-4">
            <div className="grid grid-cols-7 gap-2">
              {chartData.map((item, idx) => {
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
                  <div className="flex flex-col items-center">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black text-slate-700 uppercase">Detalhamento de Voos - Rampa</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">CONFORME</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">NÃO CONFORME</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                  <th className="px-4 py-5 text-center border-r border-slate-200/50">Porão Abert.</th>
                  <th className="px-4 py-5 text-center border-r border-slate-200/50">Descarga Bags</th>
                  <th className="px-4 py-5 text-center border-r border-slate-200/50">Descarga Cargas</th>
                  <th className="px-4 py-5 text-center border-r border-slate-200/50">Carr. Bags</th>
                  <th className="px-4 py-5 text-center border-r border-slate-200/50">Carr. Cargas</th>
                  <th className="px-4 py-5 text-center border-r border-slate-200/50">1ª Bag</th>
                  <th className="px-4 py-5 text-center">Ultima Bag</th>
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
                              <div className="flex flex-col p-2 px-3 bg-slate-50/50">
                                 <span className="text-[7px] font-black text-slate-400 uppercase flex items-center gap-1 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-slate-300" /> HORÁRIO DE POUSO
                                 </span>
                                 <span className="text-[14px] font-bold text-slate-400 tabular-nums leading-none">
                                    {row.data?.split(' ')[1] || 'N/A'}
                                 </span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50 text-center">
                      <StatusBadge 
                        status={row.abertura_porao} 
                        detail={row.abertura_porao_info} 
                        meta={row.abertura_porao_meta}
                        perc={row.abertura_porao_perc}
                        vooId={row.id_voo} 
                        horario_corte={row.horario_corte}
                        indicatorName="Abertura do Porão" 
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50 text-center">
                      <StatusBadge 
                        status={row.descarga_bags} 
                        detail={row.descarga_bags_info} 
                        meta={row.descarga_bags_meta}
                        perc={row.descarga_bags_perc}
                        vooId={row.id_voo} 
                        horario_corte={row.horario_corte}
                        indicatorName="Descarga Bags" 
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50 text-center">
                      <StatusBadge 
                        status={row.descarga_cargas} 
                        detail={row.descarga_cargas_info} 
                        meta={row.descarga_cargas_meta}
                        perc={row.descarga_cargas_perc}
                        vooId={row.id_voo} 
                        horario_corte={row.horario_corte}
                        indicatorName="Descarga Cargas" 
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50 text-center">
                      <StatusBadge 
                        status={row.carregamento_bags} 
                        detail={row.carregamento_bags_info} 
                        meta={row.carregamento_bags_meta}
                        perc={row.carregamento_bags_perc}
                        vooId={row.id_voo} 
                        std={row.std}
                        indicatorName="Carr. Bags" 
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50 text-center">
                      <StatusBadge 
                        status={row.carregamento_cargas} 
                        detail={row.carregamento_cargas_info} 
                        meta={row.carregamento_cargas_meta}
                        perc={row.carregamento_cargas_perc}
                        vooId={row.id_voo} 
                        std={row.std}
                        indicatorName="Carr. Cargas" 
                      />
                    </td>
                    <td className="px-2 py-6 border-r border-slate-50 text-center">
                      <StatusBadge 
                        status={row.primeira_bag} 
                        detail={row.primeira_bag_info} 
                        meta={row.primeira_bag_meta}
                        perc={row.primeira_bag_perc}
                        vooId={row.id_voo} 
                        horario_corte={row.horario_corte}
                        indicatorName="1ª Bag Esteira" 
                      />
                    </td>
                    <td className="px-2 py-6 text-center">
                      <StatusBadge 
                        status={row.ultima_bag} 
                        detail={row.ultima_bag_info} 
                        meta={row.ultima_bag_meta}
                        perc={row.ultima_bag_perc}
                        vooId={row.id_voo} 
                        horario_corte={row.horario_corte}
                        indicatorName="Última Bag" 
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
