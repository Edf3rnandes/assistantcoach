/* Registro do treino: o que de fato aconteceu numa sessão planejada no microciclo.
   Cada registro pertence a uma sessão (e, por ela, à turma e ao plano) e guarda, por atleta,
   presença, PSE (esforço percebido, 1 a 10) e PSR (recuperação percebida, 0 a 10, onde 10 é totalmente recuperado).
   Nos planos de exemplo, as sessões antigas ganham registros gerados; as recentes aguardam o professor. */
(function () {
  const { DIA, HOJE, hash, clamp, media } = window.Farol.util;
  const { ATLETAS, TURMAS } = window.Farol.elenco;

  const store = {}; // registros salvos pelo professor
  const cache = {}; // registros de exemplo já gerados
  const chave = (plano, s) => `${plano.id}|${s.id}`;
  const dataSessao = (semana, s) => semana.inicio + s.dia * DIA;

  // registrado: tem registro · aguardando: já aconteceu e falta lançar · futuro · semregistro: antigo e sem lançamento
  function estado(plano, semana, s) {
    if (store[chave(plano, s)]) return 'registrado';
    const d = dataSessao(semana, s);
    if (d > HOJE) return 'futuro';
    if (plano.mock && d <= HOJE - 3 * DIA) return 'registrado';
    if (d >= HOJE - 7 * DIA) return 'aguardando';
    return 'semregistro';
  }

  function gerar(plano, semana, s) {
    const k = `${chave(plano, s)}|${s.dur}|${s.pse}`;
    if (cache[k]) return cache[k];
    const presenca = {}, pse = {}, psr = {};
    const recente = semana.idx >= plano.semanaAtual - 2;

    plano.atletas.forEach((id) => {
      const a = ATLETAS[id];
      const r1 = hash(k + id + 'p'), r2 = hash(k + id + 'e'), r3 = hash(k + id + 'r');
      let falta = r1 > 0.93;
      if (a.perfil === 'ausente' && recente && semana.idx >= plano.semanaAtual - 1) falta = r1 < 0.55;
      if (falta) {
        presenca[id] = r1 > 0.97 || a.perfil === 'ausente' ? 'falta' : 'justificada';
        return;
      }
      presenca[id] = 'presente';
      const sobrecarga = a.perfil === 'alerta' && recente ? 1.6 : 0;
      pse[id] = clamp(Math.round(s.pse + (r2 - 0.5) * 2.2 + sobrecarga), 1, 10);
      psr[id] = clamp(Math.round(7.4 - 0.4 * (pse[id] - 5) + (r3 - 0.5) * 2.6 - (a.perfil === 'alerta' && recente ? 2.6 : 0)), 1, 10);
    });

    const meso = plano.mesos.find((m) => m.id === semana.meso);
    const fundamentos = ['tecnica', 'tatica', 'jogo'].includes(s.tipo) && meso
      ? meso.pauta.fundamentos.filter((f) => f.prio === 'alta').slice(0, 2).map((f) => f.id) : [];

    cache[k] = {
      sessaoId: s.id, origem: 'exemplo', duracao: s.dur,
      professores: (TURMAS[plano.turma] ? TURMAS[plano.turma].professores : ['p1']).slice(0, 2),
      fundamentos, notas: '', presenca, pse, psr, notasAtleta: {},
    };
    return cache[k];
  }

  function obter(plano, semana, s) {
    const salvo = store[chave(plano, s)];
    if (salvo) return salvo;
    return estado(plano, semana, s) === 'registrado' ? gerar(plano, semana, s) : null;
  }

  function resumoSessao(plano, reg) {
    const ids = plano.atletas;
    const presentes = ids.filter((id) => reg.presenca[id] === 'presente');
    const pses = presentes.map((id) => reg.pse[id]).filter((v) => v != null);
    const psrs = presentes.map((id) => reg.psr[id]).filter((v) => v != null);
    const carga = (id) => (reg.presenca[id] === 'presente' && reg.pse[id] != null ? reg.duracao * reg.pse[id] : 0);
    return {
      presentes: presentes.length, total: ids.length,
      pseMedio: media(pses), psrMedio: media(psrs),
      psrPendentes: presentes.length - psrs.length,
      cargaMedia: media(ids.map(carga)),
      carga,
    };
  }

  function resumoSemana(plano, semana) {
    const porAtleta = {};
    plano.atletas.forEach((id) => { porAtleta[id] = { sessoes: 0, presencas: 0, pse: [], psr: [], carga: 0 }; });
    const cont = { registrado: 0, aguardando: 0, futuro: 0, semregistro: 0 };
    let planejadoParcial = 0, durTotal = 0, pseAlvoSoma = 0;
    const pses = [], psrs = [];
    let presencas = 0, possiveis = 0;

    semana.sessoes.forEach((s) => {
      const st = estado(plano, semana, s);
      cont[st]++;
      if (st !== 'registrado') return;
      const reg = obter(plano, semana, s);
      const r = resumoSessao(plano, reg);
      planejadoParcial += s.dur * s.pse;
      durTotal += s.dur;
      pseAlvoSoma += s.dur * s.pse;
      plano.atletas.forEach((id) => {
        const p = porAtleta[id];
        p.sessoes++;
        if (reg.presenca[id] === 'presente') {
          p.presencas++;
          if (reg.pse[id] != null) p.pse.push(reg.pse[id]);
          if (reg.psr[id] != null) p.psr.push(reg.psr[id]);
        }
        p.carga += r.carga(id);
      });
      if (r.pseMedio != null) pses.push(r.pseMedio);
      if (r.psrMedio != null) psrs.push(r.psrMedio);
      presencas += r.presentes;
      possiveis += r.total;
    });

    const realizadoParcial = cont.registrado ? media(plano.atletas.map((id) => porAtleta[id].carga)) : null;
    const completo = cont.registrado > 0 && !cont.aguardando && !cont.futuro && !cont.semregistro;
    return {
      registradas: cont.registrado, aguardando: cont.aguardando, futuras: cont.futuro, semRegistro: cont.semregistro,
      completo, realizado: completo ? realizadoParcial : null,
      realizadoParcial, planejadoParcial,
      pseMedio: media(pses), psrMedio: media(psrs),
      pseAlvo: durTotal ? pseAlvoSoma / durTotal : null,
      presencaPct: possiveis ? Math.round((presencas / possiveis) * 100) : null,
      porAtleta,
    };
  }

  function salvar(plano, semana, s, reg) {
    store[chave(plano, s)] = { ...reg, sessaoId: s.id, origem: 'professor' };
    return store[chave(plano, s)];
  }

  function remover(plano, s) { delete store[chave(plano, s)]; }


  /* ---------- Respostas dos atletas (link único da turma) ---------- */

  // Cada atleta responde por si: se foi ao treino, PSE, PSR e dor. O professor aproveita isso no registro.
  // Em produção, a resposta vai ao banco identificada pelo token da turma e pelo atleta escolhido.
  const auto = {};
  const autoCache = {};
  const DOR = { 0: 'Sem dor', 1: 'Dor leve', 2: 'Dor moderada', 3: 'Dor forte' };

  function respostasExemplo(plano, semana, s) {
    const k = `${chave(plano, s)}|${s.dur}|${s.pse}`;
    if (autoCache[k]) return autoCache[k];
    const out = {};
    const antiga = dataSessao(semana, s) < HOJE;
    if (plano.mock && estado(plano, semana, s) === 'aguardando' && antiga) {
      plano.atletas.forEach((id) => {
        const a = ATLETAS[id];
        if (id === 'a1') return; // o atleta da demonstração ainda tem treinos para responder
        const r1 = hash(k + id + 'ar'), r2 = hash(k + id + 'ae'), r3 = hash(k + id + 'ap'), r4 = hash(k + id + 'ad');
        if (r1 > 0.68) return;
        if (a.perfil === 'ausente' && r1 < 0.4) { out[id] = { faltou: true }; return; }
        const sobrecarga = a.perfil === 'alerta' ? 1.6 : 0;
        const pse = clamp(Math.round(s.pse + (r2 - 0.5) * 2.2 + sobrecarga), 1, 10);
        out[id] = {
          faltou: false, pse,
          psr: clamp(Math.round(7.4 - 0.4 * (pse - 5) + (r3 - 0.5) * 2.6 - (a.perfil === 'alerta' ? 2.6 : 0)), 0, 10),
          dor: a.perfil === 'alerta' ? 2 : r4 > 0.88 ? 1 : 0,
          sono: r1 > 0.62 ? null : clamp(Math.round(3.7 + (r3 - 0.5) * 2.2 - (a.perfil === 'alerta' ? 1.6 : 0)), 1, 5),
          disp: r1 > 0.62 ? null : clamp(Math.round(3.5 + (r2 - 0.5) * 1.8 - (a.perfil === 'alerta' ? 1.4 : 0)), 1, 5),
        };
      });
    }
    autoCache[k] = out;
    return out;
  }

  const respostas = (plano, semana, s) => ({ ...respostasExemplo(plano, semana, s), ...(auto[chave(plano, s)] || {}) });

  function responder(plano, s, atletaId, resp) {
    const k = chave(plano, s);
    auto[k] = auto[k] || {};
    auto[k][atletaId] = { ...resp, em: HOJE };
  }

  const resumoRespostas = (plano, semana, s) => ({ n: Object.keys(respostas(plano, semana, s)).length, total: plano.atletas.length });

  window.Farol = window.Farol || {};
  window.Farol.registros = { respostas, responder, resumoRespostas, DOR, estado, obter, salvar, remover, resumoSessao, resumoSemana, dataSessao };
})();
