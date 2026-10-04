/* Dados da Análise: tudo calculado a partir dos registros de treino (presença, PSE e PSR de cada atleta) e dos treinos físicos feitos.
   As contas (carga, ACWR, monotonia, strain e as faixas do velocímetro) ficam em carga.js e estão descritas lá.
   - carga semanal = duração × PSE do treino de quadra (UA); a carga total soma o treino físico feito fora do microciclo;
   - ACWR e monotonia usam a carga total;
   - semáforo: regras simples e auditáveis, listadas na tela. A decisão final é sempre do profissional. */
(function () {
  const { media, clamp, dd } = window.Farol.util;
  const C = window.Farol.carga;
  const { registros: REG, elenco, dados, calendario: CAL } = window.Farol;
  const { ATLETAS } = elenco;

  const FAIXA_ACWR = { de: 0.8, ate: 1.3 };

  const desvio = C.desvio;

  // Índices das semanas já completas e registradas.
  const semanasCompletas = (plano) => plano.semanas.map((s, i) => (s.registro && s.registro.completo ? i : -1)).filter((i) => i >= 0);

  // Carga de cada dia da semana (seg a dom): quadra + treino físico.
  const cargasDiarias = (semana, id) => {
    const p = semana.registro.porAtleta[id];
    return p.diasQ.map((v, i) => v + p.diasF[i]);
  };

  // Série semanal da turma (média por atleta).
  function turma(plano) {
    const idx = semanasCompletas(plano);
    const semanas = idx.map((i) => {
      const s = plano.semanas[i];
      return { i, n: s.n, inicio: s.inicio, rotulo: `S${s.n}`, planejado: s.planejado, realizado: s.realizado, total: s.registro.realizadoTotal, pse: s.registro.pseMedio, psr: s.registro.psrMedio, pres: s.registro.presencaPct, pseAlvo: s.registro.pseAlvo, acwr: null };
    });
    const totais = semanas.map((w) => w.total);
    semanas.forEach((w, k) => {
      const r = C.acwr(totais, k);
      w.acwr = r ? r.valor : null;
      w.acwrBase = r ? r.base : 0;
      w.acwrProvisorio = r ? r.provisorio : false;
    });
    return semanas;
  }

  // Resumo por atleta: últimas semanas, ACWR, monotonia, strain, PSE/PSR, presença, tendência e semáforo.
  function atletas(plano) {
    const idx = semanasCompletas(plano);
    if (idx.length < 1) return [];
    const ult4 = idx.slice(-4);
    const ultIdx = idx[idx.length - 1];
    const semUlt = plano.semanas[ultIdx];
    const ultimas8 = idx.slice(-8);

    // dor relatada pelos próprios atletas nas sessões ainda sem registro do professor
    const dor = {};
    plano.semanas.forEach((s) => s.sessoes.forEach((ses) => {
      if (REG.estado(plano, s, ses) !== 'aguardando') return;
      const r = REG.respostas(plano, s, ses);
      Object.entries(r).forEach(([aid, q]) => { if (q.dor != null) dor[aid] = Math.max(dor[aid] || 0, q.dor); });
    }));

    return plano.atletas.map((id) => {
      const cargas = idx.map((i) => plano.semanas[i].registro.porAtleta[id].total);
      const k = cargas.length - 1;
      const info = C.acwr(cargas, k);
      const acwr = info ? info.valor : null;
      const dias = cargasDiarias(semUlt, id);
      const monotonia = C.monotonia(dias);
      const mono = monotonia != null ? +monotonia.toFixed(2) : null;
      const strain = mono != null ? Math.round(cargas[k] * mono) : null;
      const pUlt = semUlt.registro.porAtleta[id];

      const pse = [], psr = [], psrSem = [];
      let pres = 0, tot = 0;
      ult4.forEach((i) => {
        const p = plano.semanas[i].registro.porAtleta[id];
        pse.push(...p.pse); psr.push(...p.psr);
        psrSem.push(media(p.psr));
        pres += p.presencas; tot += p.sessoes;
      });
      const pseM = media(pse), psrM = media(psr), presPct = tot ? (100 * pres) / tot : null;
      const alvo = media(ult4.map((i) => plano.semanas[i].registro.pseAlvo).filter((v) => v != null));
      const psrOk = psrSem.filter((v) => v != null);
      const tendencia = psrOk.length >= 4 ? media(psrOk.slice(-2)) - media(psrOk.slice(0, 2)) : null;

      const motivos = [];
      const add = (nivel, texto) => motivos.push({ nivel, texto });
      const ac = info && info.confiavel ? acwr : null; // com menos de 3 semanas de base o número é só indicativo
      if (ac != null && ac > 1.5) add('crit', `ACWR alto (${ac.toLocaleString('pt-BR')}): carga subiu rápido demais`);
      else if (ac != null && ac > FAIXA_ACWR.ate) add('warn', `ACWR acima da faixa segura (${ac.toLocaleString('pt-BR')})`);
      else if (ac != null && ac < FAIXA_ACWR.de) add('warn', `ACWR baixo (${ac.toLocaleString('pt-BR')}): carga caiu`);
      if (psrM != null && psrM <= 5 && pseM != null && alvo != null && pseM - alvo >= 0.5) add('crit', 'PSR baixo e PSE acima do alvo');
      else if (psrM != null && psrM <= 5.5) add('warn', 'PSR baixo');
      if (presPct != null && presPct < 60) add('warn', 'Presença abaixo de 60%');
      if (mono != null && mono > 2) add('warn', 'Carga muito monótona na semana');
      if (dor[id] >= 3) add('crit', 'Relatou dor forte');
      else if (dor[id] === 2) add('warn', 'Relatou dor moderada');
      const nivel = motivos.some((m) => m.nivel === 'crit') ? 'crit' : motivos.length ? 'warn' : 'ok';

      return {
        id, nome: ATLETAS[id].nome, nivel, motivos,
        cargas8: ultimas8.map((i) => plano.semanas[i].registro.porAtleta[id].total),
        cargasQ8: ultimas8.map((i) => plano.semanas[i].registro.porAtleta[id].carga),
        rotulos8: ultimas8.map((i) => `S${plano.semanas[i].n}`),
        cargaUlt: cargas[k], cargaQuadraUlt: pUlt.carga, fisicaUlt: pUlt.fisica, acwr, acwrInfo: info, zona: C.zona(acwr), dias, monotonia: mono, strain, cargasTotais: cargas, pse: pseM, psr: psrM, pres: presPct, tendencia,
        psrSerie: psrSem,
      };
    });
  }

  // Minutos por tipo de sessão nas últimas 4 semanas completas.
  function mixSessoes(plano) {
    const idx = semanasCompletas(plano).slice(-4);
    const min = {};
    idx.forEach((i) => plano.semanas[i].sessoes.forEach((s) => { min[s.tipo] = (min[s.tipo] || 0) + s.dur; }));
    return min;
  }

  /* ---------- Competições ---------- */

  function competicoes() {
    const todas = CAL.lista();
    const realizadas = todas.filter((c) => CAL.passada(c));
    const futuras = todas.filter((c) => !CAL.passada(c));
    let v = 0, d = 0, duplas = 0;
    const linhas = [];
    realizadas.forEach((c) => {
      const p = CAL.plan(c.id);
      p.resultados.forEach((r) => {
        const dp = p.duplas.find((x) => x.id === r.duplaId);
        if (!dp) return;
        v += r.v || 0; d += r.d || 0; duplas++;
        linhas.push({ comp: c, dupla: dp, ...r });
      });
    });
    const melhor = linhas.find((l) => /camp|1º/i.test(l.colocacao || '')) || linhas.find((l) => /2º|vice/i.test(l.colocacao || '')) || null;
    const proximas = futuras.slice(0, 6).map((c) => {
      const p = CAL.plan(c.id);
      const t = CAL.orcamentoTotais(c.id);
      const qv = CAL.quemVai(c.id);
      const pessoas = qv.atletas.length + qv.equipe.length;
      return {
        comp: c,
        confirmadas: p.duplas.filter((x) => x.status === 'confirmada').length,
        previstas: p.duplas.filter((x) => x.status === 'prevista').length,
        prontidao: CAL.prontidao(c.id),
        previsto: t.previsto, porPessoa: pessoas ? t.previsto / pessoas : null,
      };
    });
    return { realizadas, linhas, v, d, duplas, aproveitamento: v + d ? (100 * v) / (v + d) : null, melhor, proximas };
  }

  window.Farol.analise = { FAIXA_ACWR, cargasDiarias, turma, atletas, mixSessoes, competicoes, semanasCompletas, desvio };
})();
