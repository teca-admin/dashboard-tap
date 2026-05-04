const fs = require('fs');
const filepath = 'server/api/sheets.ts';
let code = fs.readFileSync(filepath, 'utf-8');

const consolidadoCode = `
// 6. CONSOLIDADO
sheetsApiRouter.get('/metrics/consolidado', async (req, res) => {
  try {
    const mes = parseInt(req.query.mes as string, 10);
    const ano = parseInt(req.query.ano as string, 10);

    const allVoos = await getParsedVoos();
    const voos = filterByMonthYear(allVoos, mes, ano);

    // To compute percentages, we map each voo and replicate the logic of each tab
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
          const goal = new Date(c.getTime() + 2 * 3600000);
          const delay = Math.floor((a.getTime() - goal.getTime()) / 60000);
          ahlAberturaPerc = delay <= 0 ? 100 : Math.max(0, 100 - Math.max(0, delay));
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
      const delayMins = (start, end, minOffset) => {
        const s = parseDate(start); const e = parseDate(end);
        if (s && e) {
          const goal = new Date(s.getTime() + minOffset * 60000);
          return Math.floor((e.getTime() - goal.getTime()) / 60000);
        }
        return null;
      }
      const calcRampa = (start, end, min) => {
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
      let limpDescOk = false;
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
      const percLimpInicio = (v.horario_corte && v.inicio_limpeza) ? (diffInic <= 12 ? 100 : Math.max(0, 100 - (diffInic - 12))) : 100;
      const sla_limpeza = ((v.inicio_limpeza && v.termino_limpeza ? percLimpTempo : 100) + (v.horario_corte && v.inicio_limpeza ? percLimpInicio : 100)) / 2;

      // --- SAFETY ---
      const val = (s: string) => s || 'Conforme';
      const itens = [
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
`;

code = code + '\n' + consolidadoCode;
fs.writeFileSync(filepath, code);
console.log('Appended consolidado route to end of file');
