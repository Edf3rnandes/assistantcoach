/* Dados da Análise: tudo calculado a partir dos registros de treino (presença, PSE e PSR de cada atleta).
   - carga semanal = soma de duração × PSE das sessões em que o atleta esteve presente (UA);
   - ACWR = carga da semana ÷ média das 4 últimas semanas (a faixa segura é de 0,8 a 1,3);
   - monotonia = média da carga diária ÷ desvio da carga diária na semana; strain = carga × monotonia;
   - semáforo: regras simples e auditáveis, listadas na tela. A decisão final é sempre do profissional. */
(function () {
  const { media, clamp, dd } = window.Farol.util;
  const { registros: REG, elenco, dados, calendario: CAL } = window.Farol;
  const { ATLETAS } = elenco;

  const FAIXA_ACWR = { de: 0.8, ate: 1.3 };

  const desvio = (v) => {
    if (v.length < 2) return 0;
    const m = media(v);
    return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length);
  };

  // Índices das semanas já completas e registradas.
  const semanasCompletas = (plano) => plano.semanas.map((s, i) => (s.registro && s.registro.completo ? i : -1)).filter((i) => i >= 0);

  function cargasDiarias(plano, semana, id) {
    const dias = [0, 0, 0, 0, 0, 0, 0];
    semana.sessoes.forEach((s) => {
      if (REG.estado(plano, semana, s) !== 'registrado') return;
      const reg = REG.obter(plano, semana, s);
      if (reg.presenca[id] === 'presente' && reg.pse[id] != null) dias[s.dia] += reg.duracao * reg.pse[id];
    });
    return dias;
  }

  // Série semanal da turma (média por atleta).
  function turma(plano) {
    const idx = semanasCompletas(plano);
    const semanas = idx.map((i) => {
      const s = plano.semanas[i];
      return { i, n: s.n, inicio: s.inicio, rotulo: `S${s.n}`, planejado: s.planejado, realizado: s.realizado, pse: s.registro.pseMedio, psr: s.registro.psrMedio, pres: s.registro.presencaPct, pseAlvo: s.registro.pseAlvo, acwr: null };
    });
    semanas.forEach((w, k) => {
      if (k < 3) return;
      const cron = media(semanas.slice(k - 3, k + 1).map((x) => x.realizado));
      w.acwr = cron ? +(w.realizado / cron).toFixed(2) : null;
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
      const cargas = idx.map((i) => plano.semanas[i].registro.porAtleta[id].carga);
      const k = cargas.length - 1;
      const cronica = k >= 3 ? media(cargas.slice(k - 3, k + 1)) : null;
      const acwr = cronica ? +(cargas[k] / cronica).toFixed(2) : null;
      const dias = cargasDiarias(plano, semUlt, id);
      const dsv = desvio(dias);
      const monotonia = dsv > 0 ? +(media(dias) / dsv).toFixed(2) : null;
      const strain = monotonia != null ? Math.round(cargas[k] * monotonia) : null;

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
      if (acwr != null && acwr > 1.5) add('crit', `ACWR alto (${acwr.toLocaleString('pt-BR')}): carga subiu rápido demais`);
      else if (acwr != null && acwr > FAIXA_ACWR.ate) add('warn', `ACWR acima da faixa segura (${acwr.toLocaleString('pt-BR')})`);
      else if (acwr != null && acwr < FAIXA_ACWR.de) add('warn', `ACWR baixo (${acwr.toLocaleString('pt-BR')}): carga caiu`);
      if (psrM != null && psrM <= 5 && pseM != null && alvo != null && pseM - alvo >= 0.5) add('crit', 'PSR baixo e PSE acima do alvo');
      else if (psrM != null && psrM <= 5.5) add('warn', 'PSR baixo');
      if (presPct != null && presPct < 60) add('warn', 'Presença abaixo de 60%');
      if (monotonia != null && monotonia > 2) add('warn', 'Carga muito monótona na semana');
      if (dor[id] >= 3) add('crit', 'Relatou dor forte');
      else if (dor[id] === 2) add('warn', 'Relatou dor moderada');
      const nivel = motivos.some((m) => m.nivel === 'crit') ? 'crit' : motivos.length ? 'warn' : 'ok';

      return {
        id, nome: ATLETAS[id].nome, nivel, motivos,
        cargas8: ultimas8.map((i) => plano.semanas[i].registro.porAtleta[id].carga),
        rotulos8: ultimas8.map((i) => `S${plano.semanas[i].n}`),
        cargaUlt: cargas[k], acwr, monotonia, strain, pse: pseM, psr: psrM, pres: presPct, tendencia,
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

  window.Farol.analise = { FAIXA_ACWR, turma, atletas, mixSessoes, competicoes, semanasCompletas, desvio };
})();
