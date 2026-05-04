import { Router } from 'express';
import { fetchRawData } from '../services/googleSheets.js';
import { Voo } from '../types.js';

export const sheetsApiRouter = Router();

function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  let str = String(dateStr).trim();
  if (!str || str === 'N/A' || str.includes('Sem')) return null;

  // Check if it's just a time (HH:mm or HH:mm:ss)
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    const second = parts[2] ? parseInt(parts[2], 10) : 0;
    return new Date(1970, 0, 1, hour, minute, second);
  }

  const parts = str.split(/[\s/:-]+/);
  if (parts.length >= 3) {
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const hour = parts[3] ? parseInt(parts[3], 10) : 0;
      const minute = parts[4] ? parseInt(parts[4], 10) : 0;
      const second = parts[5] ? parseInt(parts[5], 10) : 0;
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day, hour, minute, second);
      }
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseNum(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const sanitized = String(val).replace(',', '.').replace(/[^\d.]/g, '');
  return parseFloat(sanitized) || 0;
}

async function getParsedVoos(): Promise<Voo[]> {
  const rows = await fetchRawData();
  // Header is at row index 0 (which is line 5 in sheets since we queried A5:CV)
  // Data starts at index 1
  const dataRows = rows.slice(1);

  return dataRows.map((row: any[]) => {
    return {
      id_voo: row[0] || '',
      horario_pouso: row[1] || '',
      horario_corte: row[2] || '', // Column C
      horario_pushback: row[3] || '',
      std: row[4] || '',
      etd: row[5] || '', // Column F
      pax_atendidos: parseNum(row[6]),
      
      abertura_checkin: row[7] || '',
      status_abertura_checkin: row[12] || '',
      fechamento_checkin: row[13] || '',
      status_fechamento_checkin: row[18] || '',
      inicio_embarque: row[19] || '',
      status_inicio_embarque: row[24] || '',
      ultimo_pax: row[26] || '',
      status_ultimo_pax: row[31] || '',
      meta_bags: parseNum(row[33]),
      bags_atendidos: parseNum(row[32]),
      bags_atendidos_raw: row[32] || '',
      status_bags: row[34] || '',

      horario_abertura_ahl: row[35] || '',
      status_abertura_ahl: row[40] || '',
      ahl_entregue: row[41] || '',
      status_entrega_ahl: row[46] || '',
      data_lista_conteudo: row[47] || '', 
      
      horario_abertura_ohd: row[48] || '', 
      status_abertura_ohd: row[53] || '',
      data_retorno_ohd: row[49] || '', 

      abertura_porao: row[50] || '', // Column AY (51st col, index 50)
      status_abertura_porao: row[55] || row[65] || '', // Fallback status
      descarga_bags: row[55] || '', // BD
      status_descarga_bags: row[60] || row[70] || '', // Fallback status
      descarga_cargas: row[60] || '', // BI
      status_descarga_cargas: row[65] || row[75] || '', // Fallback status
      carregamento_bags: row[65] || '', // BN
      status_carregamento_bags: row[70] || row[80] || '', // Fallback status
      carregamento_cargas: row[70] || '', // BS
      status_carregamento_cargas: row[75] || row[85] || '', // Fallback status
      primeira_bag_esteira: row[75] || '', // BX
      status_primeira_bag: row[80] || row[90] || '', // Fallback status
      ultima_bag_esteira: row[80] || '', // Col CC

      inicio_limpeza: row[82] || '', // Column CE
      termino_limpeza: row[84] || '', // Column CG
      status_limpeza: row[89] || '', // Col 90
      avaliacao_limpeza: row[89] || '', // Col 90 (CL)

      dano_aeronave: row[90] || '', // CM
      peso_balanceamento: row[91] || '', // CN
      procedimento_calco: row[92] || '', // CO
      procedimento_cones: row[93] || '', // CP
      gse_sem_preventiva: row[94] || '', // CQ
      carregamento_bag_safety: row[95] || '', // CR
      reabastecimento_pax: row[96] || '', // CS
      situacao_carregamento: row[97] || '', // CT
      situacao_notoc: row[98] || '', // CU
    };
  });
}

function filterByMonthYear(voos: Voo[], mes: number, ano: number, vooId?: string) {
  return voos.filter(v => {
    // If vooId is provided, just match it
    if (vooId) {
      return v.id_voo.toLowerCase().includes(vooId.toLowerCase());
    }
    const d = parseDate(v.horario_pouso);
    if (!d) return false;
    return d.getMonth() + 1 === mes && d.getFullYear() === ano;
  });
}

function formatDiff(startStr: string, endStr: string): string {
  if (!startStr || !endStr || startStr.includes('Sem') || endStr.includes('Sem')) return '--:--';
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start || !end) return '--:--';
  
  let diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // handle midnight cross
  
  const totalMins = Math.floor(diffMs / (1000 * 60));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// 1. GERAL
sheetsApiRouter.get('/metrics/geral', async (req, res) => {
  try {
    const mes = parseInt(req.query.mes as string, 10);
    const ano = parseInt(req.query.ano as string, 10);
    const vooId = req.query.voo as string;

    const allVoos = await getParsedVoos();
    const voos = filterByMonthYear(allVoos, mes, ano, vooId);

    const totalVoos = voos.length;
    
    let aberturaConformes = 0;
    let fechamentoConformes = 0;
    let embarqueConformes = 0;
    let ultimoPaxConformes = 0;
    let bagsConformes = 0;
    let countAtrasos = 0;
    let totalPax = 0;

    let totalUltimoPaxPerc = 0;

    const tableData = voos.map(v => {
      totalPax += v.pax_atendidos;

      // Meta Abertura Check-in: STD - 03:30:00 (210 min)
      let metaAberturaTime = '--:--';
      let isAbertura = v.status_abertura_checkin === 'Conforme'; 
      let aberturaPerc = isAbertura ? 100 : 0;

      if (v.std) {
        const std = parseDate(v.std);
        const real = parseDate(v.abertura_checkin);
        if (std) {
          const goal = new Date(std.getTime() - 210 * 60 * 1000); 
          metaAberturaTime = `${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (real) {
            const delayMinutes = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              aberturaPerc = 100;
              isAbertura = true;
            } else {
              aberturaPerc = Math.max(0, 100 - delayMinutes);
              isAbertura = false;
            }
          }
        }
      }
      
      const stdObj = parseDate(v.std);
      
      // Meta Fechamento Check-in: STD - 01:00:00 (60 min)
      let metaFechamentoTime = '--:--';
      let isFechamento = v.status_fechamento_checkin === 'Conforme';
      let fechamentoPerc = isFechamento ? 100 : 0;

      if (stdObj) {
        const goal = new Date(stdObj.getTime() - 60 * 60 * 1000); 
        metaFechamentoTime = `${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
        
        const real = parseDate(v.fechamento_checkin);
        if (real) {
          const delayMinutes = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
          if (delayMinutes <= 0) {
            fechamentoPerc = 100;
            isFechamento = true;
          } else {
            fechamentoPerc = Math.max(0, 100 - delayMinutes);
            isFechamento = false;
          }
        }
      }

      // Meta Início Embarque: STD - 00:40:00 (40 min before)
      let metaEmbarqueTime = '--:--';
      let isEmbarque = v.status_inicio_embarque === 'Conforme';
      let embarquePerc = isEmbarque ? 100 : 0;
      if (stdObj) {
        const goal = new Date(stdObj.getTime() - 40 * 60 * 1000);
        metaEmbarqueTime = `${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
        const real = parseDate(v.inicio_embarque);
        if (real) {
          const delayMinutes = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
          if (delayMinutes <= 0) {
            embarquePerc = 100;
            isEmbarque = true;
          } else {
            embarquePerc = Math.max(0, 100 - delayMinutes);
            isEmbarque = false;
          }
        }
      }

      // Meta Último PAX: STD - 00:10:00 (10 min before)
      let metaUltimoPaxTime = '--:--';
      let isUltimoPax = v.status_ultimo_pax === 'Conforme';
      let ultimoPaxPerc = 0; // Default to 0 instead of binary isUltimoPax ? 100 : 0

      if (stdObj) {
        const goal = new Date(stdObj.getTime() - 10 * 60 * 1000);
        metaUltimoPaxTime = `${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
        const real = parseDate(v.ultimo_pax);
        if (real) {
          const delayMinutes = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
          if (delayMinutes <= 0) {
            ultimoPaxPerc = 100;
            isUltimoPax = true;
          } else {
            ultimoPaxPerc = Math.max(0, 100 - delayMinutes);
            isUltimoPax = false;
          }
        } else if (v.status_ultimo_pax === 'Conforme') {
          // Fallback if status says Conforme but time is missing/invalid
          ultimoPaxPerc = 100;
          isUltimoPax = true;
        }
      }

      // New logic for Bags: Atendidos >= Meta
      let bagsPerc = 100;
      let isBags = true;
      let metaBagsCalc = v.meta_bags;

      if (metaBagsCalc > 0) {
        bagsPerc = Math.min(100, Math.round((v.bags_atendidos / metaBagsCalc) * 100));
        isBags = v.bags_atendidos >= metaBagsCalc;
      } else {
        bagsPerc = 100;
        isBags = true;
      }

      if (isAbertura) aberturaConformes++;
      if (isFechamento) fechamentoConformes++;
      if (isEmbarque) embarqueConformes++;
      if (isUltimoPax) ultimoPaxConformes++;
      totalUltimoPaxPerc += ultimoPaxPerc;
      if (isBags) bagsConformes++;

      const isAtraso = (!isAbertura || !isFechamento || !isEmbarque || !isUltimoPax || !isBags);
      if (isAtraso) countAtrasos++;

      return {
        id_voo: v.id_voo,
        data: v.horario_pouso,
        std: v.std,
        pax: v.pax_atendidos,
        abertura: !v.abertura_checkin ? 'N/A' : (isAbertura ? 'Conforme' : 'Não Conforme'),
        abertura_info: v.abertura_checkin || '',
        abertura_meta: `META: ${metaAberturaTime}`,
        abertura_perc: aberturaPerc, 
        fechamento: !v.fechamento_checkin ? 'N/A' : (isFechamento ? 'Conforme' : 'Não Conforme'),
        fechamento_info: v.fechamento_checkin || '',
        fechamento_meta: `META: ${metaFechamentoTime}`,
        fechamento_perc: fechamentoPerc,
        embarque: !v.inicio_embarque ? 'N/A' : (isEmbarque ? 'Conforme' : 'Não Conforme'),
        embarque_info: v.inicio_embarque || '',
        embarque_meta: `META: ${metaEmbarqueTime}`,
        embarque_perc: embarquePerc,
        ultimo_pax: !v.ultimo_pax ? 'N/A' : (isUltimoPax ? 'Conforme' : 'Não Conforme'),
        ultimo_pax_info: v.ultimo_pax || '',
        ultimo_pax_meta: `META: ${metaUltimoPaxTime}`,
        ultimo_pax_perc: ultimoPaxPerc,
        bags: !v.bags_atendidos_raw ? 'N/A' : (isBags ? 'Conforme' : 'Não Conforme'),
        bags_info: String(v.bags_atendidos),
        bags_meta: metaBagsCalc === 0 ? 'META: ISENTO' : `META: ${metaBagsCalc}`,
        bags_perc: bagsPerc,
        bags_pax: v.pax_atendidos, // Pass pax to help logic display
        cicloAtendimento: formatDiff(v.abertura_checkin, v.ultimo_pax), 
        eficienciaEmbarque: formatDiff(v.inicio_embarque, v.ultimo_pax),
        eficienciaOperacional: formatDiff(v.horario_pouso, v.horario_pushback),
        resultadoFinal: !isAtraso ? 'Conforme' : 'Não Conforme'
      };
    });

    const percAbertura = totalVoos ? ((aberturaConformes / totalVoos) * 100) : 0;
    const percFechamento = totalVoos ? ((fechamentoConformes / totalVoos) * 100) : 0;
    const percEmbarque = totalVoos ? ((embarqueConformes / totalVoos) * 100) : 0;
    const percUltimoPax = totalVoos ? (totalUltimoPaxPerc / totalVoos) : 0;
    const percBags = totalVoos ? ((bagsConformes / totalVoos) * 100) : 0;
    
    // Grafico distribuicao dias
    const porDia: Record<string, {total: number, conformes: number}> = {};
    tableData.forEach(t => {
      const d = parseDate(t.data);
      if (d) {
        const dia = d.getDate().toString().padStart(2, '0');
        if (!porDia[dia]) porDia[dia] = { total: 0, conformes: 0 };
        porDia[dia].total++;
        if (t.resultadoFinal === 'Conforme') porDia[dia].conformes++;
      }
    });
    
    const linhaEvolucao = Object.entries(porDia).map(([dia, stats]) => ({
      dia,
      pontualidade: stats.total ? (stats.conformes / stats.total) * 100 : 0
    })).sort((a,b) => a.dia.localeCompare(b.dia));

    res.json({
      cards: {
        totalVoos,
        totalPax,
        pontualidadeGeral: totalVoos ? ((percAbertura + percFechamento + percEmbarque + percUltimoPax + percBags) / 5) : 0,
        quantidadeAtrasos: countAtrasos,
        percAbertura,
        percFechamento,
        percEmbarque,
        percUltimoPax,
        percBags
      },
      charts: {
        linhaEvolucao,
        comparacaoMetas: [
          { name: 'Abertura CKIN', value: percAbertura, meta: 98 },
          { name: 'Fechamento CKIN', value: percFechamento, meta: 98 },
          { name: 'Embarque', value: percEmbarque, meta: 95 },
          { name: 'Último PAX', value: percUltimoPax, meta: 95 },
          { name: 'Bags', value: percBags, meta: 70 }
        ],
        pizzaConformes: [
          { name: 'Conformes', value: totalVoos - countAtrasos },
          { name: 'Não Conformes', value: countAtrasos }
        ]
      },
      table: tableData
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper for AHL/OHD
function calculaManualAHL_OHD(voos: Voo[]) {
  return voos.map(v => {
    // AHL Abertura (2h after Corte)
    let ahl_abertura_status = 'N/A';
    let ahl_abertura_meta = '--:--';
    let ahl_abertura_perc = 0;
    
    if (v.horario_corte && v.horario_abertura_ahl) {
      const corte = parseDate(v.horario_corte);
      const abertura = parseDate(v.horario_abertura_ahl);
      if (corte) {
        const goal = new Date(corte.getTime() + 2 * 60 * 60 * 1000);
        ahl_abertura_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
        
        if (abertura) {
          let diffMs = abertura.getTime() - corte.getTime();
          if (diffMs < 0 && diffMs > -24 * 60 * 60 * 1000) {
            diffMs += 24 * 60 * 60 * 1000; // midnight cross
          }
          
          const diffHrs = diffMs / (1000 * 60 * 60);
          const delayMinutes = Math.floor((abertura.getTime() - goal.getTime()) / (60 * 1000));
          
          if (delayMinutes <= 0) {
            ahl_abertura_perc = 100;
            ahl_abertura_status = 'Conforme';
          } else {
            ahl_abertura_perc = Math.max(0, 100 - delayMinutes);
            ahl_abertura_status = 'Não Conforme';
          }
        }
      }
    } else if (!v.horario_abertura_ahl) {
      ahl_abertura_status = 'N/A';
      ahl_abertura_perc = 0;
    } else {
      ahl_abertura_status = v.status_abertura_ahl || 'N/A';
      ahl_abertura_perc = ahl_abertura_status === 'Conforme' ? 100 : 0;
    }

    // AHL Entrega (2h after Corte)
    let ahl_entrega_status = 'N/A';
    let ahl_entrega_meta = '--:--';
    let ahl_entrega_perc = 0;
    
    if (v.horario_corte && v.ahl_entregue) {
      const corte = parseDate(v.horario_corte);
      const entrega = parseDate(v.ahl_entregue);
      if (corte) {
        const goal = new Date(corte.getTime() + 2 * 60 * 60 * 1000);
        ahl_entrega_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
        
        if (entrega) {
          const delayMinutes = Math.floor((entrega.getTime() - goal.getTime()) / (60 * 1000));
          if (delayMinutes <= 0) {
            ahl_entrega_perc = 100;
            ahl_entrega_status = 'Conforme';
          } else {
            ahl_entrega_perc = Math.max(0, 100 - delayMinutes);
            ahl_entrega_status = 'Não Conforme';
          }
        }
      }
    } else if (!v.ahl_entregue) {
      ahl_entrega_status = 'N/A';
      ahl_entrega_perc = 0;
    } else {
      ahl_entrega_status = v.status_entrega_ahl || 'N/A';
      ahl_entrega_perc = ahl_entrega_status === 'Conforme' ? 100 : 0;
    }

    // Lista de conteudo (72h apos abertura)
    let lista_status = 'N/A';
    let ahl_lista_meta = '--:--';
    let ahl_lista_perc = 0;

    if (v.horario_abertura_ahl && v.data_lista_conteudo) {
      const abertura = parseDate(v.horario_abertura_ahl);
      const lista = parseDate(v.data_lista_conteudo);
      if (abertura) {
        const goal = new Date(abertura.getTime() + 72 * 60 * 60 * 1000);
        ahl_lista_meta = `META: ${goal.toLocaleDateString('pt-BR')}`;
        
        if (lista) {
          const delayMinutes = Math.floor((lista.getTime() - goal.getTime()) / (60 * 1000));
          if (delayMinutes <= 0) {
            ahl_lista_perc = 100;
            lista_status = 'Conforme';
          } else {
            ahl_lista_perc = Math.max(0, 100 - delayMinutes);
            lista_status = 'Não Conforme';
          }
        }
      }
    } else if (!v.data_lista_conteudo) {
      lista_status = 'N/A';
      ahl_lista_perc = 0;
    } else {
      lista_status = 'Não Conforme';
      ahl_lista_perc = 0;
    }

    // Retorno OHD (5 dias)
    let retorno_ohd = 'N/A';
    let ohd_retorno_meta = '--:--';
    let ohd_retorno_perc = 0;

    if (v.horario_abertura_ohd && v.data_retorno_ohd) {
      const abertura = parseDate(v.horario_abertura_ohd);
      const retorno = parseDate(v.data_retorno_ohd);
      if (abertura) {
        const goal = new Date(abertura.getTime() + 5 * 24 * 60 * 60 * 1000);
        ohd_retorno_meta = `META: ${goal.toLocaleDateString('pt-BR')}`;
        
        if (retorno) {
          const delayMinutes = Math.floor((retorno.getTime() - goal.getTime()) / (60 * 1000));
          if (delayMinutes <= 0) {
            ohd_retorno_perc = 100;
            retorno_ohd = 'Conforme';
          } else {
            ohd_retorno_perc = Math.max(0, 100 - delayMinutes);
            retorno_ohd = 'Não Conforme';
          }
        }
      }
    } else if (!v.data_retorno_ohd) {
      retorno_ohd = 'N/A';
      ohd_retorno_perc = 0;
    }

    return {
      id_voo: v.id_voo,
      std: v.std,
      data_chegada: v.horario_pouso,
      horario_corte: v.horario_corte,
      ahl_abertura: ahl_abertura_status,
      ahl_abertura_info: v.horario_abertura_ahl || '',
      ahl_abertura_meta: ahl_abertura_meta,
      ahl_abertura_perc: ahl_abertura_perc,
      ahl_entrega: ahl_entrega_status,
      ahl_entrega_info: v.ahl_entregue || '',
      ahl_entrega_meta: ahl_entrega_meta,
      ahl_entrega_perc: ahl_entrega_perc,
      ahl_lista: lista_status,
      ahl_lista_info: v.data_lista_conteudo || '',
      ahl_lista_meta: ahl_lista_meta,
      ahl_lista_perc: ahl_lista_perc,
      ohd_abertura: !v.horario_abertura_ohd ? 'N/A' : (v.status_abertura_ohd || 'N/A'),
      ohd_abertura_info: v.horario_abertura_ohd || '',
      ohd_retorno: retorno_ohd,
      ohd_retorno_info: v.data_retorno_ohd || '',
      ohd_retorno_meta: ohd_retorno_meta,
      ohd_retorno_perc: ohd_retorno_perc
    };
  });
}

// 2. AHL OHD
sheetsApiRouter.get('/metrics/ahl-ohd', async (req, res) => {
  try {
    const mes = parseInt(req.query.mes as string, 10);
    const ano = parseInt(req.query.ano as string, 10);
    const vooId = req.query.voo as string;

    const allVoos = await getParsedVoos();
    let voos = filterByMonthYear(allVoos, mes, ano, vooId);
    // Remove filter that excludes flights without AHL/OHD records
    // voos = voos.filter(v => v.horario_abertura_ahl || v.horario_abertura_ohd);
    
    const tableData = calculaManualAHL_OHD(voos);

    const countStatus = (key: keyof typeof tableData[0], val: string) => tableData.filter(t => t[key] === val).length;
    const validCount = (key: keyof typeof tableData[0]) => tableData.filter(t => t[key] !== 'N/A').length;

    const aAbertura = validCount('ahl_abertura');
    const aEntrega = validCount('ahl_entrega');
    const aLista = validCount('ahl_lista');
    const oRetorno = validCount('ohd_retorno');

    const totalVoos = tableData.length;
    let quantidadeAtrasos = 0;
    let quantidadeAtingidos = 0;
    
    tableData.forEach(row => {
      const isAtraso = 
        row.ahl_abertura === 'Não Conforme' || 
        row.ahl_entrega === 'Não Conforme' || 
        row.ahl_lista === 'Não Conforme' || 
        row.ohd_retorno === 'Não Conforme';
      
      const isConforme = 
        row.ahl_abertura === 'Conforme' || 
        row.ahl_entrega === 'Conforme' || 
        row.ahl_lista === 'Conforme' || 
        row.ohd_retorno === 'Conforme';

      if (isAtraso) {
        quantidadeAtrasos++;
      } else if (isConforme) {
        // Only if it has at least one 'Conforme' and NO 'Não Conforme'
        quantidadeAtingidos++;
      }
    });

    const cards = {
      totalVoos,
      quantidadeAtrasos,
      quantidadeAtingidos,
      ahlAbertura: aAbertura ? (countStatus('ahl_abertura', 'Conforme') / aAbertura) * 100 : null,
      ahlEntrega: aEntrega ? (countStatus('ahl_entrega', 'Conforme') / aEntrega) * 100 : null,
      ahlLista: aLista ? (countStatus('ahl_lista', 'Conforme') / aLista) * 100 : null,
      ohdRetorno: oRetorno ? (countStatus('ohd_retorno', 'Conforme') / oRetorno) * 100 : null,
    };

    res.json({ cards, table: tableData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. RAMPA
sheetsApiRouter.get('/metrics/rampa', async (req, res) => {
  try {
    const mes = parseInt(req.query.mes as string, 10);
    const ano = parseInt(req.query.ano as string, 10);
    const vooId = req.query.voo as string;

    const allVoos = await getParsedVoos();
    const voos = filterByMonthYear(allVoos, mes, ano, vooId);

    const tableData = voos.map(v => {
      // New logic for Abertura Porão (AY vs C + 2 min)
      let abertura_porao_status = 'N/A';
      let abertura_porao_meta = '--:--';
      let abertura_porao_perc = 0;

      if (v.horario_corte && v.abertura_porao) {
        const corte = parseDate(v.horario_corte);
        const abertura = parseDate(v.abertura_porao);
        if (corte) {
          const goal = new Date(corte.getTime() + 2 * 60 * 1000); // 2 minutes
          abertura_porao_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (abertura) {
            const delayMinutes = Math.floor((abertura.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              abertura_porao_perc = 100;
              abertura_porao_status = 'Conforme';
            } else {
              abertura_porao_perc = Math.max(0, 100 - delayMinutes);
              abertura_porao_status = 'Não Conforme';
            }
          }
        }
      }

      // New logic for Descarga Bags (BD vs C + 15 min)
      let descarga_bags_status = 'N/A';
      let descarga_bags_meta = '--:--';
      let descarga_bags_perc = 0;

      if (v.horario_corte && v.descarga_bags) {
        const corte = parseDate(v.horario_corte);
        const descarga = parseDate(v.descarga_bags);
        if (corte) {
          const goal = new Date(corte.getTime() + 15 * 60 * 1000); // 15 minutes
          descarga_bags_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (descarga) {
            const delayMinutes = Math.floor((descarga.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              descarga_bags_perc = 100;
              descarga_bags_status = 'Conforme';
            } else {
              descarga_bags_perc = Math.max(0, 100 - delayMinutes);
              descarga_bags_status = 'Não Conforme';
            }
          }
        }
      }

      // New logic for Descarga Cargas (BI vs C + 25 min)
      let descarga_cargas_status = 'N/A';
      let descarga_cargas_meta = '--:--';
      let descarga_cargas_perc = 0;

      if (v.horario_corte && v.descarga_cargas) {
        const corte = parseDate(v.horario_corte);
        const descarga_c = parseDate(v.descarga_cargas);
        if (corte) {
          const goal = new Date(corte.getTime() + 25 * 60 * 1000); // 25 minutes
          descarga_cargas_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (descarga_c) {
            const delayMinutes = Math.floor((descarga_c.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              descarga_cargas_perc = 100;
              descarga_cargas_status = 'Conforme';
            } else {
              descarga_cargas_perc = Math.max(0, 100 - delayMinutes);
              descarga_cargas_status = 'Não Conforme';
            }
          }
        }
      }

      // New logic for Carregamento Bags (BN vs E + 5 min)
      let carregamento_bags_status = 'N/A';
      let carregamento_bags_meta = '--:--';
      let carregamento_bags_perc = 0;

      if (v.std && v.carregamento_bags) {
        const std = parseDate(v.std);
        const carr_bags = parseDate(v.carregamento_bags);
        if (std) {
          const goal = new Date(std.getTime() + 5 * 60 * 1000); // 5 minutes
          carregamento_bags_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (carr_bags) {
            const delayMinutes = Math.floor((carr_bags.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              carregamento_bags_perc = 100;
              carregamento_bags_status = 'Conforme';
            } else {
              carregamento_bags_perc = Math.max(0, 100 - delayMinutes);
              carregamento_bags_status = 'Não Conforme';
            }
          }
        }
      }

      // New logic for Carregamento Cargas (BS vs E + 15 min)
      let carregamento_cargas_status = 'N/A';
      let carregamento_cargas_meta = '--:--';
      let carregamento_cargas_perc = 0;

      if (v.std && v.carregamento_cargas) {
        const std = parseDate(v.std);
        const carr_cargas = parseDate(v.carregamento_cargas);
        if (std) {
          const goal = new Date(std.getTime() + 15 * 60 * 1000); // 15 minutes
          carregamento_cargas_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (carr_cargas) {
            const delayMinutes = Math.floor((carr_cargas.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              carregamento_cargas_perc = 100;
              carregamento_cargas_status = 'Conforme';
            } else {
              carregamento_cargas_perc = Math.max(0, 100 - delayMinutes);
              carregamento_cargas_status = 'Não Conforme';
            }
          }
        }
      }

      // New logic for Primeira Bag (BX vs C + 15 min)
      let primeira_bag_status = 'N/A';
      let primeira_bag_meta = '--:--';
      let primeira_bag_perc = 0;

      if (v.horario_corte && v.primeira_bag_esteira) {
        const corte = parseDate(v.horario_corte);
        const p_bag = parseDate(v.primeira_bag_esteira);
        if (corte) {
          const goal = new Date(corte.getTime() + 15 * 60 * 1000); // 15 minutes
          primeira_bag_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (p_bag) {
            const delayMinutes = Math.floor((p_bag.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              primeira_bag_perc = 100;
              primeira_bag_status = 'Conforme';
            } else {
              primeira_bag_perc = Math.max(0, 100 - delayMinutes);
              primeira_bag_status = 'Não Conforme';
            }
          }
        }
      }

      // New logic for Última Bag (CC vs C + 25 min)
      let ultima_bag_status = 'N/A';
      let ultima_bag_meta = '--:--';
      let ultima_bag_perc = 0;

      if (v.horario_corte && v.ultima_bag_esteira) {
        const corte = parseDate(v.horario_corte);
        const u_bag = parseDate(v.ultima_bag_esteira);
        if (corte) {
          const goal = new Date(corte.getTime() + 25 * 60 * 1000); // 25 minutes
          ultima_bag_meta = `META: ${String(goal.getHours()).padStart(2, '0')}:${String(goal.getMinutes()).padStart(2, '0')}:${String(goal.getSeconds()).padStart(2, '0')}`;
          
          if (u_bag) {
            const delayMinutes = Math.floor((u_bag.getTime() - goal.getTime()) / (60 * 1000));
            if (delayMinutes <= 0) {
              ultima_bag_perc = 100;
              ultima_bag_status = 'Conforme';
            } else {
              ultima_bag_perc = Math.max(0, 100 - delayMinutes);
              ultima_bag_status = 'Não Conforme';
            }
          }
        }
      }

      return {
        id_voo: v.id_voo,
        data: v.horario_pouso,
        horario_corte: v.horario_corte,
        std: v.std,
        abertura_porao: !v.abertura_porao ? 'N/A' : abertura_porao_status,
        abertura_porao_info: v.abertura_porao || '',
        abertura_porao_meta: abertura_porao_meta,
        abertura_porao_perc: abertura_porao_perc,
        descarga_bags: !v.descarga_bags ? 'N/A' : descarga_bags_status,
        descarga_bags_info: v.descarga_bags || '',
        descarga_bags_meta: descarga_bags_meta,
        descarga_bags_perc: descarga_bags_perc,
        descarga_cargas: !v.descarga_cargas ? 'N/A' : descarga_cargas_status,
        descarga_cargas_info: v.descarga_cargas || '',
        descarga_cargas_meta: descarga_cargas_meta,
        descarga_cargas_perc: descarga_cargas_perc,
        carregamento_bags: !v.carregamento_bags ? 'N/A' : carregamento_bags_status,
        carregamento_bags_info: v.carregamento_bags || '',
        carregamento_bags_meta: carregamento_bags_meta,
        carregamento_bags_perc: carregamento_bags_perc,
        carregamento_cargas: !v.carregamento_cargas ? 'N/A' : carregamento_cargas_status,
        carregamento_cargas_info: v.carregamento_cargas || '',
        carregamento_cargas_meta: carregamento_cargas_meta,
        carregamento_cargas_perc: carregamento_cargas_perc,
        primeira_bag: !v.primeira_bag_esteira ? 'N/A' : primeira_bag_status,
        primeira_bag_info: v.primeira_bag_esteira || '',
        primeira_bag_meta: primeira_bag_meta,
        primeira_bag_perc: primeira_bag_perc,
        ultima_bag: !v.ultima_bag_esteira ? 'N/A' : ultima_bag_status,
        ultima_bag_info: v.ultima_bag_esteira || '',
        ultima_bag_meta: ultima_bag_meta,
        ultima_bag_perc: ultima_bag_perc
      };
    });

    const countStatus = (key: keyof typeof tableData[0], val: string) => tableData.filter(t => t[key] === val).length;
    const validCount = (key: keyof typeof tableData[0]) => tableData.filter(t => t[key] !== 'N/A').length;

    const p = (k: keyof typeof tableData[0]) => validCount(k) ? (countStatus(k, 'Conforme') / validCount(k)) * 100 : 0;

    const totalVoos = tableData.length;
    let quantidadeAtrasos = 0;
    let quantidadeAtingidos = 0;

    tableData.forEach(row => {
      const isAtraso = 
        row.abertura_porao === 'Não Conforme' || 
        row.descarga_bags === 'Não Conforme' || 
        row.descarga_cargas === 'Não Conforme' || 
        row.carregamento_bags === 'Não Conforme' || 
        row.carregamento_cargas === 'Não Conforme' || 
        row.primeira_bag === 'Não Conforme' || 
        row.ultima_bag === 'Não Conforme';

      const isConforme = 
        row.abertura_porao === 'Conforme' || 
        row.descarga_bags === 'Conforme' || 
        row.descarga_cargas === 'Conforme' || 
        row.carregamento_bags === 'Conforme' || 
        row.carregamento_cargas === 'Conforme' || 
        row.primeira_bag === 'Conforme' || 
        row.ultima_bag === 'Conforme';

      if (isAtraso) {
        quantidadeAtrasos++;
      } else if (isConforme) {
        quantidadeAtingidos++;
      }
    });

    res.json({
      cards: {
        totalVoos,
        quantidadeAtingidos,
        quantidadeAtrasos,
        aberturaPorao: p('abertura_porao'),
        descargaBags: p('descarga_bags'),
        descargaCargas: p('descarga_cargas'),
        carregamentoBags: p('carregamento_bags'),
        carregamentoCargas: p('carregamento_cargas'),
        primeiraBag: p('primeira_bag'),
        ultimaBag: p('ultima_bag')
      },
      table: tableData
    });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. LIMPEZA
sheetsApiRouter.get('/metrics/limpeza', async (req, res) => {
  try {
    const mes = parseInt(req.query.mes as string, 10);
    const ano = parseInt(req.query.ano as string, 10);
    const vooId = req.query.voo as string;

    const allVoos = await getParsedVoos();
    const voos = filterByMonthYear(allVoos, mes, ano, vooId);

    let temposTotal = 0;
    let countTempos = 0;
    const avaliacoes: Record<string, number> = {};

    const tableData = voos.map(v => {
      let tempoMin = 0;
      if (v.inicio_limpeza && v.termino_limpeza) {
        const i = parseDate(v.inicio_limpeza);
        const t = parseDate(v.termino_limpeza);
        if (i && t) {
          tempoMin = (t.getTime() - i.getTime()) / (1000 * 60);
          if (tempoMin < 0 && tempoMin > -1440) {
            tempoMin += 24 * 60; // crossed midnight
          }
          temposTotal += tempoMin;
          countTempos++;
        }
      }

      // NOVO: Cálculo de Conformidade de Início (Corte + 12min)
      let statusInicio = 'N/A';
      if (v.horario_corte && v.inicio_limpeza) {
        const corte = parseDate(v.horario_corte);
        const inicio = parseDate(v.inicio_limpeza);
        if (corte && inicio) {
          const diffInic = (inicio.getTime() - corte.getTime()) / (1000 * 60);
          statusInicio = (diffInic >= -1440 && diffInic <= 12) ? 'Conforme' : 'Não Conforme';
        }
      }

      if (v.avaliacao_limpeza) {
        avaliacoes[v.avaliacao_limpeza] = (avaliacoes[v.avaliacao_limpeza] || 0) + 1;
      }

      return {
        id_voo: v.id_voo,
        data: v.horario_pouso,
        horario_corte: v.horario_corte,
        inicio_limpeza: v.inicio_limpeza,
        termino_limpeza: v.termino_limpeza,
        tempo_decorrido: Math.round(tempoMin),
        status: !v.inicio_limpeza || !v.termino_limpeza ? 'N/A' : (tempoMin <= 15 && tempoMin > 0 ? 'Conforme' : 'Não Conforme'),
        status_inicio: statusInicio,
        avaliacao: v.avaliacao_limpeza,
        std: v.std || ''
      };
    });

    const conformesCount = tableData.filter(t => t.status === 'Conforme').length;
    const naoConformesCount = tableData.filter(t => t.status === 'Não Conforme').length;
    const conformesInicio = tableData.filter(t => t.status_inicio === 'Conforme').length;

    res.json({
      cards: {
        totalVoos: tableData.length,
        quantidadeAtingidos: conformesCount,
        quantidadeAtrasos: naoConformesCount,
        tempoAte15min: tableData.length ? (conformesCount / tableData.length) * 100 : 0,
        perfInicio: tableData.length ? (conformesInicio / tableData.length) * 100 : 0,
        mediaTempoLimpeza: countTempos ? (temposTotal / countTempos) : 0,
        avaliacoes
      },
      table: tableData
    });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. SAFETY
sheetsApiRouter.get('/metrics/safety', async (req, res) => {
  try {
    const mes = parseInt(req.query.mes as string, 10);
    const ano = parseInt(req.query.ano as string, 10);
    const vooId = req.query.voo as string;

    const allVoos = await getParsedVoos();
    const voos = filterByMonthYear(allVoos, mes, ano, vooId);
    
    // Default to 'Conforme' if empty, since safe by default implies no report
    const val = (s: string) => (s || 'Conforme');

    const tableData = voos.map(v => {
      const keys = [
        val(v.dano_aeronave),
        val(v.peso_balanceamento),
        val(v.procedimento_calco),
        val(v.procedimento_cones),
        val(v.gse_sem_preventiva),
        val(v.carregamento_bag_safety),
        val(v.reabastecimento_pax),
        val(v.situacao_carregamento),
        val(v.situacao_notoc),
      ];
      
      return {
        id_voo: v.id_voo,
        data: v.horario_pouso,
        std: v.std || '',
        dano: keys[0],
        peso: keys[1],
        calco: keys[2],
        cones: keys[3],
        gse: keys[4],
        bag: keys[5],
        reabastecimento: keys[6],
        situacao: keys[7],
        notoc: keys[8],
        resultadoGeral: keys.every(k => k === 'Conforme') ? 'Conforme' : 'Não Conforme'
      };
    });

    const ncRate = (key: keyof typeof tableData[0]) => {
      const nc = tableData.filter(t => t[key] === 'Não Conforme').length;
      return tableData.length ? (nc / tableData.length) * 100 : 0;
    };

    const conformesCount = tableData.filter(t => t.resultadoGeral === 'Conforme').length;
    const naoConformesCount = tableData.filter(t => t.resultadoGeral === 'Não Conforme').length;

    res.json({
      cards: {
        totalVoos: tableData.length,
        quantidadeAtingidos: conformesCount,
        quantidadeAtrasos: naoConformesCount,
        dano: ncRate('dano'),
        peso: ncRate('peso'),
        calco: ncRate('calco'),
        cones: ncRate('cones'),
        gse: ncRate('gse'),
        bag: ncRate('bag'),
        reabastecimento: ncRate('reabastecimento'),
        situacao: ncRate('situacao'),
        notoc: ncRate('notoc'),
      },
      table: tableData
    });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. CONSOLIDADO
sheetsApiRouter.get('/metrics/consolidado', async (req, res) => {
  try {
    const mes = parseInt(req.query.mes as string, 10);
    const ano = parseInt(req.query.ano as string, 10);

    const allVoos = await getParsedVoos();
    const voos = filterByMonthYear(allVoos, mes, ano);

    const voosData = voos.map(v => {
      // --- GERAL ---
      let aberturaGeralOk = false;
      let aberturaPerc = 0;
      if (v.std) {
        const std = parseDate(v.std);
        const real = parseDate(v.abertura_checkin);
        if (std) {
          const goal = new Date(std.getTime() - 210 * 60 * 1000); 
          if (real) {
            const delay = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
            aberturaPerc = delay <= 0 ? 100 : Math.max(0, 100 - delay);
            aberturaGeralOk = delay <= 0;
          }
        }
      }
      
      let fechamentoGeralOk = false;
      let fechamentoPerc = 0;
      if (v.std) {
        const std = parseDate(v.std);
        const real = parseDate(v.fechamento_checkin);
        if (std) {
          const goal = new Date(std.getTime() - 60 * 60 * 1000); 
          if (real) {
            const delay = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
            fechamentoPerc = delay <= 0 ? 100 : Math.max(0, 100 - delay);
            fechamentoGeralOk = delay <= 0;
          }
        }
      }

      let embarqueGeralOk = false;
      let embarquePerc = 0;
      if (v.std) {
        const std = parseDate(v.std);
        const real = parseDate(v.inicio_embarque);
        if (std) {
          const goal = new Date(std.getTime() - 40 * 60 * 1000);
          if (real) {
            const delay = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
            embarquePerc = delay <= 0 ? 100 : Math.max(0, 100 - delay);
            embarqueGeralOk = delay <= 0;
          }
        }
      }

      let ultimoGeralOk = false;
      let ultimoPerc = 0;
      if (v.std) {
        const std = parseDate(v.std);
        const real = parseDate(v.ultimo_pax);
        if (std) {
          const goal = new Date(std.getTime() - 10 * 60 * 1000);
          if (real) {
            const delay = Math.floor((real.getTime() - goal.getTime()) / (60 * 1000));
            ultimoPerc = delay <= 0 ? 100 : Math.max(0, 100 - delay);
            ultimoGeralOk = delay <= 0;
          } else if (v.status_ultimo_pax === 'Conforme') {
            ultimoPerc = 100;
            ultimoGeralOk = true;
          }
        }
      }

      let bagsPerc = 100;
      let bagsOk = true;
      if (v.meta_bags > 0) {
        bagsPerc = Math.min(100, Math.round((v.bags_atendidos / v.meta_bags) * 100));
        bagsOk = v.bags_atendidos >= v.meta_bags;
      }
      
      const sla_geral = (aberturaPerc + fechamentoPerc + embarquePerc + ultimoPerc + bagsPerc) / 5;

      // --- AHL/OHD ---
      let ahlAberturaOk = false, ahlAberturaPerc = 0, hasAhlAbertura = false;
      if (v.horario_corte && v.horario_abertura_ahl) {
        hasAhlAbertura = true;
        const c = parseDate(v.horario_corte);
        const a = parseDate(v.horario_abertura_ahl);
        if (c && a) {
          let diffMs = a.getTime() - c.getTime();
          if (diffMs < 0 && diffMs > -24 * 3600000) diffMs += 24 * 3600000;
          const goalMs = 2 * 3600000;
          const delay = Math.floor((diffMs - goalMs) / 60000);
          ahlAberturaPerc = delay <= 0 ? 100 : Math.max(0, 100 - delay);
          ahlAberturaOk = delay <= 0;
        }
      } else if (!v.horario_abertura_ahl) {
        // null => N/A
      } else {
        hasAhlAbertura = true;
        ahlAberturaOk = v.status_abertura_ahl === 'Conforme';
        ahlAberturaPerc = ahlAberturaOk ? 100 : 0;
      }

      let ahlEntregaOk = false, ahlEntregaPerc = 0, hasAhlEntrega = false;
      if (v.horario_corte && v.ahl_entregue) {
        hasAhlEntrega = true;
        const c = parseDate(v.horario_corte);
        const e = parseDate(v.ahl_entregue);
        if (c && e) {
          const goal = new Date(c.getTime() + 2 * 3600000);
          const delay = Math.floor((e.getTime() - goal.getTime()) / 60000);
          ahlEntregaPerc = delay <= 0 ? 100 : Math.max(0, 100 - Math.max(0, delay));
          ahlEntregaOk = delay <= 0;
        }
      } else if (!v.ahl_entregue) {
      } else {
        hasAhlEntrega = true;
        ahlEntregaOk = v.status_entrega_ahl === 'Conforme';
        ahlEntregaPerc = ahlEntregaOk ? 100 : 0;
      }

      let ahlListaOk = false, ahlListaPerc = 0, hasAhlLista = false;
      if (v.horario_abertura_ahl && v.data_lista_conteudo) {
        hasAhlLista = true;
        const a = parseDate(v.horario_abertura_ahl);
        const l = parseDate(v.data_lista_conteudo);
        if (a && l) {
          const goal = new Date(a.getTime() + 72 * 3600000);
          const delay = Math.floor((l.getTime() - goal.getTime()) / 60000);
          ahlListaPerc = delay <= 0 ? 100 : Math.max(0, 100 - Math.max(0, delay));
          ahlListaOk = delay <= 0;
        }
      }

      let ohdRetornoOk = false, ohdRetornoPerc = 0, hasOhdRetorno = false;
      if (v.horario_abertura_ohd && v.data_retorno_ohd) {
        hasOhdRetorno = true;
        const a = parseDate(v.horario_abertura_ohd);
        const r = parseDate(v.data_retorno_ohd);
        if (a && r) {
          const goal = new Date(a.getTime() + 5 * 24 * 3600000);
          const delay = Math.floor((r.getTime() - goal.getTime()) / 60000);
          ohdRetornoPerc = delay <= 0 ? 100 : Math.max(0, 100 - delay);
          ohdRetornoOk = delay <= 0;
        }
      }

      let ahlDenom = 0; let ahlSum = 0;
      if (hasAhlAbertura) { ahlDenom++; ahlSum += ahlAberturaPerc; }
      if (hasAhlEntrega) { ahlDenom++; ahlSum += ahlEntregaPerc; }
      if (hasAhlLista) { ahlDenom++; ahlSum += ahlListaPerc; }
      if (hasOhdRetorno) { ahlDenom++; ahlSum += ohdRetornoPerc; }
      const sla_ahl_ohd = ahlDenom > 0 ? ahlSum / ahlDenom : 100;

      // --- RAMPA ---
      const delayMins = (start: string|null|undefined, end: string|null|undefined, minOffset: number) => {
        const s = parseDate(start); const e = parseDate(end);
        if (s && e) {
          const goal = new Date(s.getTime() + minOffset * 60000);
          return Math.floor((e.getTime() - goal.getTime()) / 60000);
        }
        return null;
      }
      const calcRampa = (start: string|null|undefined, end: string|null|undefined, min: number) => {
        const d = delayMins(start, end, min);
        if (d === null) return { ok: false, perc: 0, has: false };
        return { ok: d <= 0, perc: d <= 0 ? 100 : Math.max(0, 100 - d), has: true };
      }

      const rAbPorao = calcRampa(v.horario_corte, v.abertura_porao, 2);
      const rDescBags = calcRampa(v.horario_corte, v.descarga_bags, 15);
      const rDescCargas = calcRampa(v.horario_corte, v.descarga_cargas, 25);
      const rCarrBags = calcRampa(v.std, v.carregamento_bags, 5);
      const rCarrCargas = calcRampa(v.std, v.carregamento_cargas, 15);
      const rPriBag = calcRampa(v.horario_corte, v.primeira_bag_esteira, 15);
      const rUltBag = calcRampa(v.horario_corte, v.ultima_bag_esteira, 25);

      let rDenom = 0; let rSum = 0;
      if (v.abertura_porao) { rDenom++; rSum += rAbPorao.perc; }
      if (v.descarga_bags) { rDenom++; rSum += rDescBags.perc; }
      if (v.descarga_cargas) { rDenom++; rSum += rDescCargas.perc; }
      if (v.carregamento_bags) { rDenom++; rSum += rCarrBags.perc; }
      if (v.carregamento_cargas) { rDenom++; rSum += rCarrCargas.perc; }
      if (v.primeira_bag_esteira) { rDenom++; rSum += rPriBag.perc; }
      if (v.ultima_bag_esteira) { rDenom++; rSum += rUltBag.perc; }
      const sla_rampa = rDenom > 0 ? rSum / rDenom : 100;

      // --- LIMPEZA ---
      let limpTempo = 0;
      if (v.inicio_limpeza && v.termino_limpeza) {
        const i = parseDate(v.inicio_limpeza);
        const t = parseDate(v.termino_limpeza);
        if (i && t) {
          limpTempo = (t.getTime() - i.getTime()) / 60000;
          if (limpTempo < 0 && limpTempo > -1440) limpTempo += 1440;
        }
      }
      
      let statusInicioOk = false;
      let diffInic = 0;
      if (v.horario_corte && v.inicio_limpeza) {
        const c = parseDate(v.horario_corte);
        const i = parseDate(v.inicio_limpeza);
        if (c && i) {
          diffInic = (i.getTime() - c.getTime()) / 60000;
          statusInicioOk = (diffInic >= -1440 && diffInic <= 12);
        }
      }

      const percLimpTempo = (v.inicio_limpeza && v.termino_limpeza) ? (limpTempo <= 15 ? 100 : Math.max(0, 100 - (limpTempo - 15))) : 100;
      const percLimpInicio = (v.horario_corte && v.inicio_limpeza) ? (diffInic <= 12 ? 100 : Math.max(0, 100 - Math.max(0, diffInic - 12))) : 100;
      let lDenom = 0; let lSum = 0;
      if (v.inicio_limpeza && v.termino_limpeza) { lDenom++; lSum += percLimpTempo; }
      if (v.horario_corte && v.inicio_limpeza) { lDenom++; lSum += percLimpInicio; }
      const sla_limpeza = lDenom > 0 ? lSum / lDenom : 100;

      // --- SAFETY ---
      const valSafe = (s: string) => s || 'Conforme';
      const itens = [
        valSafe(v.dano_aeronave),
        valSafe(v.peso_balanceamento),
        valSafe(v.procedimento_calco),
        valSafe(v.procedimento_cones),
        valSafe(v.gse_sem_preventiva),
        valSafe(v.carregamento_bag_safety),
        valSafe(v.reabastecimento_pax),
        valSafe(v.situacao_carregamento),
        valSafe(v.situacao_notoc),
      ];
      const itensOk = itens.filter(i => i === 'Conforme').length;
      const sla_safety = (itensOk / 9) * 100;

      const sla_media = (sla_geral + sla_ahl_ohd + sla_rampa + sla_limpeza + sla_safety) / 5;

      return {
        id_voo: v.id_voo,
        sla_geral: sla_geral,
        sla_ahl_ohd: sla_ahl_ohd,
        sla_rampa: sla_rampa,
        sla_limpeza: sla_limpeza,
        sla_safety: sla_safety,
        sla_media: sla_media,
        detalhes_geral: [
          { label: 'Abertura CKIN', valor: aberturaPerc, status: aberturaGeralOk ? 'OK' : 'CRITICO' },
          { label: 'Fechamento CKIN', valor: fechamentoPerc, status: fechamentoGeralOk ? 'OK' : 'CRITICO' },
          { label: 'Início Embarque', valor: embarquePerc, status: embarqueGeralOk ? 'OK' : 'CRITICO' },
          { label: 'Último PAX', valor: ultimoPerc, status: ultimoGeralOk ? 'OK' : 'CRITICO' },
          { label: 'Bags', valor: bagsPerc, status: bagsOk ? 'OK' : 'CRITICO' }
        ],
        detalhes_ahl: [
          { label: 'Abertura AHL', valor: hasAhlAbertura ? ahlAberturaPerc : null, status: ahlAberturaOk ? 'OK' : 'CRITICO' },
          { label: 'Entrega AHL', valor: hasAhlEntrega ? ahlEntregaPerc : null, status: ahlEntregaOk ? 'OK' : 'CRITICO' },
          { label: 'Lista Conteúdo', valor: hasAhlLista ? ahlListaPerc : null, status: ahlListaOk ? 'OK' : 'CRITICO' },
          { label: 'Retorno OHD', valor: hasOhdRetorno ? ohdRetornoPerc : null, status: ohdRetornoOk ? 'OK' : 'CRITICO' }
        ],
        detalhes_rampa: [
          { label: 'Abertura Porão', valor: v.abertura_porao ? rAbPorao.perc : null, status: rAbPorao.ok ? 'OK' : 'CRITICO' },
          { label: 'Descarga Bags', valor: v.descarga_bags ? rDescBags.perc : null, status: rDescBags.ok ? 'OK' : 'CRITICO' },
          { label: 'Descarga Cargas', valor: v.descarga_cargas ? rDescCargas.perc : null, status: rDescCargas.ok ? 'OK' : 'CRITICO' },
          { label: 'Carregamento Bags', valor: v.carregamento_bags ? rCarrBags.perc : null, status: rCarrBags.ok ? 'OK' : 'CRITICO' },
          { label: 'Carregamento Cargas', valor: v.carregamento_cargas ? rCarrCargas.perc : null, status: rCarrCargas.ok ? 'OK' : 'CRITICO' },
          { label: 'Primeira Bag', valor: v.primeira_bag_esteira ? rPriBag.perc : null, status: rPriBag.ok ? 'OK' : 'CRITICO' },
          { label: 'Última Bag', valor: v.ultima_bag_esteira ? rUltBag.perc : null, status: rUltBag.ok ? 'OK' : 'CRITICO' }
        ],
        detalhes_limpeza: [
          { label: 'Início Limpeza', valor: v.horario_corte && v.inicio_limpeza ? percLimpInicio : null, status: statusInicioOk ? 'OK' : 'CRITICO' },
          { label: 'Tempo Limpeza', valor: v.inicio_limpeza && v.termino_limpeza ? percLimpTempo : null, status: limpTempo <= 15 ? 'OK' : 'CRITICO' }
        ],
        detalhes_safety: {
          conformidade_geral: sla_safety,
          itens_ok: itensOk,
          itens_total: 9,
          avaliacao: v.avaliacao_limpeza || 'N/A'
        }
      };
    });

    const total_voos = voosData.length;
    let sumMedia = 0;
    let voos_acima_sla = 0;
    
    voosData.forEach(v => {
      sumMedia += v.sla_media;
      if (v.sla_media >= 90) voos_acima_sla++;
    });

    const media_mes = total_voos ? sumMedia / total_voos : 0;
    const voos_abaixo_sla = total_voos - voos_acima_sla;

    return res.json({
      voos: voosData,
      total_voos,
      media_mes,
      voos_acima_sla,
      voos_abaixo_sla
    });

  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});
