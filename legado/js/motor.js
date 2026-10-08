/* Motor da periodização dinâmica (blocos curtos + ondulatória).
   plano = gerar(eventos, parâmetros, carga de referência). O plano não é uma planilha fixa: sempre que os eventos mudam,
   o motor refaz só o FUTURO (a semana corrente e as passadas ficam congeladas) e o técnico confirma o que muda.

   Este arquivo é puro (sem tela): recebe datas em milissegundos (UTC) e devolve a estrutura de semanas.
   Regras: classificação dos eventos A/B/C, janela W até o evento A, tabela de blocos, metas de carga por semana,
   B e C dentro do ciclo, conflitos de calendário e a ondulação dos dias da semana. */
(function () {
  const DIA = 864e5;
  const SEMANA = 7 * DIA;

  /* ---------- Parâmetros e tabela de blocos (editáveis) ---------- */

  const PARAMS = {
    baseline_weeks: 4,
    block_max_weeks: 4,
    deload_factor: 0.7,
    load_progression: { acumulacao: 0.1, transmutacao: 0.05 },
    realization_factors: { 1: [0.55], 2: [0.85, 0.55], 3: [1.0, 0.85, 0.55], 4: [1.0, 1.0, 0.85, 0.55] },
    transition_factor: 0.55,
    mini_taper_reduction: 0.2,
    mini_taper_days: 3,
    min_weeks_between_A: 6,
    b_before_a_min_days: 7,
    main_day_share: 0.4,
    manutencao_semanas: 12,
    sessoes_por_semana: 4,
    alertas: { load_above_target_pct: 15, load_below_target_pct: 25, load_spike_pct: 30, deload_max_pct_of_baseline: 85 },
  };

  // Semanas de acumulação, transmutação e realização para cada janela W (4.2 do documento).
  const TABELA = {
    1: [0, 0, 1], 2: [0, 0, 2], 3: [0, 1, 2], 4: [0, 2, 2], 5: [0, 3, 2], 6: [0, 4, 2],
    7: [2, 3, 2], 8: [3, 3, 2], 9: [3, 4, 2], 10: [4, 4, 2], 11: [4, 4, 3], 12: [4, 4, 4],
  };

  const BLOCOS = ['acumulacao', 'transmutacao', 'realizacao', 'manutencao', 'transicao'];
  const NIVEL_PESO = { Nacional: 5, Regional: 4, Estadual: 3, Aberto: 2, Amistoso: 1 };

  const mesclar = (base, extra) => {
    const out = JSON.parse(JSON.stringify(base));
    Object.keys(extra || {}).forEach((k) => {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && out[k] && typeof out[k] === 'object') out[k] = mesclar(out[k], extra[k]);
      else out[k] = extra[k];
    });
    return out;
  };
  const parametros = (extra) => mesclar(PARAMS, extra);

  /* ---------- Datas ---------- */

  const segundaDe = (t) => { const d = new Date(t); const dow = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - dow * DIA; };
  const domingoDe = (t) => segundaDe(t) + 6 * DIA;
  const semanasEntre = (a, b) => Math.round((segundaDe(b) - segundaDe(a)) / SEMANA);

  /* ---------- Blocos e fatores ---------- */

  // Janela W → [acumulação, transmutação, realização].
  function distribuicao(W, tabela) {
    const t = tabela || TABELA;
    if (W >= 13) return [W - 8, 4, 4];
    return (t[W] || [0, 0, Math.max(1, W)]).slice();
  }

  // Divide um bloco longo em mesociclos de 3 a 4 semanas (5 = 3+2; 6 = 3+3; 7 = 4+3).
  function dividir(n, max) {
    if (n <= 0) return [];
    const k = Math.ceil(n / max), base = Math.floor(n / k), extra = n % k;
    return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
  }

  // Fatores de carga de um mesociclo de n semanas. Subida por semana de carga e descarga na última.
  function fatoresMeso(bloco, n, P) {
    if (bloco === 'realizacao') return P.realization_factors[Math.min(4, Math.max(1, n))].slice();
    if (bloco === 'transicao') return Array.from({ length: n }, () => P.transition_factor);
    if (bloco === 'manutencao') return Array.from({ length: n }, (_, i) => ((i + 1) % 4 === 0 ? P.deload_factor : 1));
    const prog = P.load_progression[bloco] || 0;
    return Array.from({ length: n }, (_, i) => (n > 1 && i === n - 1 ? P.deload_factor : +(1 + prog * i).toFixed(4)));
  }

  // Sequência de tipos de dia para o número de sessões da semana (4.5).
  const SEQUENCIA = { 3: ['heavy', 'volume', 'power'], 4: ['heavy', 'volume', 'power', 'volume'], 5: ['heavy', 'volume', 'power', 'volume', 'recovery'] };
  // Dias da semana (0 = segunda) de cada sessão, com folga entre o dia de volume e o de potência.
  const DIAS_SESSAO = { 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5] };
  const DIA_PRINCIPAL = { acumulacao: 'volume', transmutacao: 'power', realizacao: 'power', manutencao: 'alternado', transicao: 'recovery' };

  /* ---------- Classificação dos eventos ---------- */

  // Normaliza os eventos do plano. B a 7 dias ou menos do A vira C; dois B com menos de 7 dias entre si ficam com o de maior nível.
  function classificar(eventos, P) {
    const conflitos = [];
    const ev = eventos.map((e) => ({ ...e, efetiva: e.prioridade }));
    const A = ev.filter((e) => e.efetiva === 'A' && e.status !== 'cancelled');
    ev.filter((e) => e.efetiva === 'B' && e.status !== 'cancelled').forEach((b) => {
      const perto = A.find((a) => a.inicio >= b.fim && a.inicio - b.fim <= P.b_before_a_min_days * DIA);
      if (perto) { b.efetiva = 'C'; conflitos.push({ tipo: 'b_perto_do_a', severidade: 'warning', evento: b.id, texto: `${b.nome} fica a menos de ${P.b_before_a_min_days} dias do evento A (${perto.nome}); vira treino-competição (C) para não atrapalhar o polimento.` }); }
    });
    const Bs = ev.filter((e) => e.efetiva === 'B' && e.status !== 'cancelled').sort((x, y) => x.inicio - y.inicio);
    for (let i = 0; i < Bs.length - 1; i++) {
      const x = Bs[i], y = Bs[i + 1];
      if (x.efetiva !== 'B' || y.inicio - x.fim >= 7 * DIA) continue;
      const px = NIVEL_PESO[x.nivel] || 0, py = NIVEL_PESO[y.nivel] || 0;
      const sai = py > px ? x : y;
      sai.efetiva = 'C';
      conflitos.push({ tipo: 'dois_b_proximos', severidade: 'warning', evento: sai.id, texto: `${x.nome} e ${y.nome} têm menos de 7 dias entre si; ${sai.nome} vira treino-competição (C).` });
    }
    // dois A muito próximos
    const As = ev.filter((e) => e.efetiva === 'A' && e.status !== 'cancelled').sort((x, y) => x.inicio - y.inicio);
    for (let i = 0; i < As.length - 1; i++) {
      const gap = semanasEntre(As[i].inicio, As[i + 1].inicio);
      if (gap < P.min_weeks_between_A) conflitos.push({ tipo: 'dois_a_proximos', severidade: 'critical', eventos: [As[i].id, As[i + 1].id], texto: `${As[i].nome} e ${As[i + 1].nome} (ambos A) ficam a ${gap} semanas um do outro, menos que as ${P.min_weeks_between_A} recomendadas. Rebaixe um deles para B ou aceite um ciclo curto (transição, transmutação e realização).` });
      else if (gap <= 9) conflitos.push({ tipo: 'a_proximos', severidade: 'info', eventos: [As[i].id, As[i + 1].id], texto: `${As[i].nome} e ${As[i + 1].nome} (A) ficam a ${gap} semanas: o segundo ciclo é reduzido, sem acumulação completa.` });
    }
    return { eventos: ev, conflitos };
  }

  /* ---------- Geração ---------- */

  /* entrada: { hoje, inicio, eventos:[{id,nome,inicio,fim,prioridade,status,nivel}], baseline, params,
                congelado:[semanas já aceitas], fimPlano }
     saída:  { semanas:[...todas], novas:[...só o futuro], conflitos, provisorio, sugestoes, janelas } */
  function gerar(entrada) {
    const P = parametros(entrada.params);
    const hoje = entrada.hoje;
    const congelado = (entrada.congelado || []).slice().sort((a, b) => a.inicio - b.inicio);
    const inicioPlano = segundaDe(entrada.inicio);
    // O que já começou fica como está.
    const limite = hoje >= inicioPlano ? domingoDe(hoje) : inicioPlano - DIA;
    const fixas = congelado.filter((s) => s.inicio <= limite);
    const { eventos, conflitos } = classificar(entrada.eventos || [], P);
    const validos = eventos.filter((e) => e.status !== 'cancelled' && e.fim > limite).sort((a, b) => a.inicio - b.inicio);
    const ancoras = validos.filter((e) => e.efetiva === 'A');

    let cursor = limite + DIA; // segunda-feira seguinte
    if (fixas.length) cursor = Math.max(cursor, fixas[fixas.length - 1].inicio + SEMANA);
    const novas = [];
    const janelas = [];
    let cicloIdx = fixas.length ? fixas[fixas.length - 1].ciclo : -1;
    let mesoIdx = fixas.reduce((m, s) => Math.max(m, s.mesoIdx != null ? s.mesoIdx : -1), -1);
    // O último ciclo congelado continua se o A dele ainda não passou.
    const cicloAberto = !!(fixas.length && ancoras.length && fixas[fixas.length - 1].ancora === ancoras[0].id);

    const mkSemana = (inicio, o) => ({ inicio, ciclo: o.ciclo, mesoIdx: o.mesoIdx, bloco: o.bloco, posMeso: o.pos, nMeso: o.n, tipoSemana: o.tipo, fator: +o.fator.toFixed(4), ancora: o.ancora || null, eventos: [] });

    ancoras.forEach((a, ai) => {
      const semAncora = segundaDe(a.inicio);
      const W = semanasEntre(cursor, semAncora) + 1;
      if (W < 1) {
        conflitos.push({ tipo: 'a_na_janela_congelada', severidade: 'critical', evento: a.id, texto: `${a.nome} cai numa semana que já começou; não há como planejar a preparação.` });
        return;
      }
      if (W <= 3) janelas.push({ evento: a.id, W, texto: `Só ${W} ${W === 1 ? 'semana' : 'semanas'} até ${a.nome}: a preparação será limitada. Trate o ciclo como manutenção e polimento.` });
      if (!(ai === 0 && cicloAberto)) cicloIdx += 1;
      const dist = distribuicao(W, entrada.tabela);
      const plano = [['acumulacao', dist[0]], ['transmutacao', dist[1]], ['realizacao', dist[2]]];
      let c = cursor;
      plano.forEach(([bloco, qtd]) => {
        dividir(qtd, P.block_max_weeks).forEach((n) => {
          mesoIdx += 1;
          const fat = fatoresMeso(bloco, n, P);
          for (let i = 0; i < n; i++) {
            const ehA = c === semAncora;
            const tipo = ehA ? 'taper' : fat[i] === P.deload_factor ? 'deload' : 'load';
            novas.push(mkSemana(c, { ciclo: cicloIdx, mesoIdx, bloco, pos: i, n, tipo, fator: fat[i], ancora: a.id }));
            c += SEMANA;
          }
        });
      });
      // Transição de uma semana depois do A.
      cursor = Math.max(c, segundaDe(a.fim) + SEMANA);
      mesoIdx += 1;
      novas.push(mkSemana(cursor, { ciclo: cicloIdx, mesoIdx, bloco: 'transicao', pos: 0, n: 1, tipo: 'transition', fator: P.transition_factor, ancora: a.id }));
      cursor += SEMANA;
    });

    const sugestoes = [];
    if (!ancoras.length) {
      // Sem A à frente: manutenção até aparecer um.
      cicloIdx += 1;
      const total = P.manutencao_semanas;
      dividir(total, P.block_max_weeks).forEach((n) => {
        mesoIdx += 1;
        const fat = fatoresMeso('manutencao', n, P);
        for (let i = 0; i < n; i++) {
          novas.push(mkSemana(cursor, { ciclo: cicloIdx, mesoIdx, bloco: 'manutencao', pos: i, n, tipo: fat[i] === P.deload_factor ? 'deload' : 'load', fator: fat[i], ancora: null }));
          cursor += SEMANA;
        }
      });
      const bs = validos.filter((e) => e.prioridade === 'B' || e.efetiva === 'B').sort((x, y) => (NIVEL_PESO[y.nivel] || 0) - (NIVEL_PESO[x.nivel] || 0) || x.inicio - y.inicio);
      sugestoes.push({ tipo: 'sem_a', texto: bs.length ? `Não há evento A à frente. Promova ${bs[0].nome} a A para o plano ganhar uma competição alvo.` : 'Não há evento A à frente. Cadastre a competição alvo para o plano deixar de ser só manutenção.', evento: bs[0] ? bs[0].id : null });
    }

    const todas = [...fixas, ...novas];
    // Eventos B e C dentro das semanas, com mini-polimento.
    const porSemana = new Map(todas.map((s) => [s.inicio, s]));
    validos.concat(eventos.filter((e) => e.status !== 'cancelled' && e.fim <= limite && e.fim >= (fixas[0] ? fixas[0].inicio : 0))).forEach((e) => {
      for (let t = segundaDe(e.inicio); t <= segundaDe(e.fim); t += SEMANA) {
        const s = porSemana.get(t);
        if (!s) continue;
        if (!s.eventos.some((x) => x.id === e.id)) s.eventos.push({ id: e.id, prioridade: e.efetiva, original: e.prioridade, status: e.status });
      }
    });
    novas.forEach((s) => {
      const b = s.eventos.find((e) => e.prioridade === 'B');
      if (b && s.tipoSemana !== 'taper' && s.tipoSemana !== 'transition' && s.tipoSemana !== 'deload') {
        const e = eventos.find((x) => x.id === b.id);
        s.miniPolimento = { evento: e.id, dias: Array.from({ length: P.mini_taper_days }, (_, i) => e.inicio - (P.mini_taper_days - i) * DIA), reducao: P.mini_taper_reduction, recuperacao: e.fim + DIA };
        if (s.tipoSemana === 'load') s.tipoSemana = 'mini_taper';
      }
    });
    const provisorio = validos.some((e) => e.status === 'provisional' && (e.efetiva === 'A' || e.efetiva === 'B'));
    if (provisorio) conflitos.push({ tipo: 'provisorio', severidade: 'info', texto: 'O plano depende de evento ainda provisório. Ao confirmar ou cancelar, o plano se refaz.' });

    return { semanas: todas, novas, conflitos, provisorio, sugestoes, janelas, parametros: P };
  }

  /* ---------- Diferença entre duas estruturas ---------- */

  const chaveSemana = (s) => [s.bloco, s.tipoSemana, s.fator, s.base || '', s.sess || '', s.ancora || '', s.ciclo, s.mesoIdx, JSON.stringify(s.miniPolimento || null), (s.eventos || []).map((e) => `${e.id}${e.prioridade}`).join(',')].join('|');

  // Compara a estrutura aceita com a proposta (só o futuro). Retorna as semanas que mudam, entram ou saem.
  function diferenca(antes, depois, hoje) {
    const limite = domingoDe(hoje);
    const a = new Map(antes.filter((s) => s.inicio > limite).map((s) => [s.inicio, s]));
    const d = new Map(depois.filter((s) => s.inicio > limite).map((s) => [s.inicio, s]));
    const itens = [];
    [...new Set([...a.keys(), ...d.keys()])].sort((x, y) => x - y).forEach((t) => {
      const x = a.get(t), y = d.get(t);
      if (x && y && chaveSemana(x) === chaveSemana(y)) return;
      itens.push({ inicio: t, antes: x || null, depois: y || null, tipo: !x ? 'entra' : !y ? 'sai' : 'muda' });
    });
    return itens;
  }

  /* ---------- Sessões da semana (ondulatória) ---------- */

  const ROTULO_DIA = { heavy: 'Pesado', volume: 'Volume', power: 'Potência', recovery: 'Recuperação', competition: 'Competição', off: 'Folga' };
  const TIPO_SESSAO = { heavy: 'fisico', volume: 'tatica', power: 'fisico', recovery: 'recuperacao' };
  const PSE_BASE = { heavy: 7, volume: 5, power: 6, recovery: 3 };
  const OBJ = {
    heavy: 'Força: poucas séries, carga alta',
    volume: 'Técnico-tático em volume, intensidade moderada',
    power: 'Potência de ataque e salto: ativação, pliometria, força-potência e ataques máximos',
    recovery: 'Regenerativo e mobilidade',
  };
  const arred5 = (v) => Math.max(20, Math.round(v / 5) * 5);

  /* Sessões de uma semana.
     semana: { inicio, bloco, tipoSemana, fator, alvoUA, miniPolimento?, eventos:[{id, prioridade}] }
     eventosPorId: id → { nome, inicio, fim }
     Dia de competição substitui o dia principal; os dias do mini-polimento ficam ~20% mais leves. */
  function sessoesDaSemana(semana, n, eventosPorId, params) {
    const P = parametros(params);
    const alvo = semana.alvoUA;
    const sessoes = [];
    const comp = [];
    (semana.eventos || []).forEach((e) => {
      const ev = eventosPorId[e.id];
      if (!ev) return;
      for (let t = Math.max(ev.inicio, semana.inicio); t <= Math.min(ev.fim, semana.inicio + 6 * DIA); t += DIA) comp.push({ dia: Math.round((t - semana.inicio) / DIA), nome: ev.nome, prioridade: e.prioridade });
    });
    const diasComp = new Set(comp.map((c) => c.dia));

    if (semana.bloco === 'transicao') {
      [[0, 'tecnica', 'Jogo livre e fundamentos', 60, 3], [2, 'fisico', 'Mobilidade e correção postural', 45, 4], [3, 'jogo', 'Jogos recreativos', 75, 4], [5, 'recuperacao', 'Atividade alternativa', 60, 2]]
        .forEach(([dia, tipo, obj, dur, pse]) => sessoes.push({ dia, turno: tipo === 'jogo' || tipo === 'tecnica' ? 'tarde' : 'manha', tipo, dur, pse, obj, diaTipo: tipo === 'recuperacao' ? 'recovery' : 'volume' }));
      return sessoes;
    }

    const num = Math.min(5, Math.max(3, n || P.sessoes_por_semana));
    const seq = SEQUENCIA[num].slice();
    const dias = DIAS_SESSAO[num].slice();
    // Dia principal da semana: recebe a maior parte da carga.
    const alvoPrincipal = DIA_PRINCIPAL[semana.bloco];
    let principal = alvoPrincipal;
    if (alvoPrincipal === 'alternado') principal = semana.posMeso % 2 === 0 ? 'heavy' : 'power';
    if (principal === 'recovery') principal = 'volume';
    let idxPrincipal = seq.indexOf(principal);
    if (idxPrincipal < 0) idxPrincipal = 1;
    // Realização: heavy só de manutenção (uma série curta); mantemos o dia, mas com menos peso.
    let cargaComp = 0;
    const livres = [];
    seq.forEach((tipoDia, i) => {
      const dia = dias[i];
      if (diasComp.has(dia)) return; // a competição ocupa o dia
      livres.push({ i, tipoDia, dia });
    });
    // Se a competição tirou o dia principal, o principal passa a ser o primeiro dia livre.
    comp.forEach((c) => { cargaComp += 120 * (c.prioridade === 'A' ? 8 : 7); });
    const sobra = Math.max(0, alvo - cargaComp);
    const pesos = livres.map((l) => (l.i === idxPrincipal && livres.some((x) => x.i === idxPrincipal) ? P.main_day_share : (1 - P.main_day_share) / Math.max(1, livres.length - 1)));
    const soma = pesos.reduce((a, b) => a + b, 0) || 1;
    const mini = new Set((semana.miniPolimento ? semana.miniPolimento.dias : []).map((t) => Math.round((t - semana.inicio) / DIA)));
    livres.forEach((l, k) => {
      let pse = PSE_BASE[l.tipoDia];
      if (semana.bloco === 'acumulacao' && l.tipoDia === 'volume') pse = 5;
      if (semana.bloco === 'realizacao' && l.tipoDia === 'heavy') pse = 6;
      const fatorDia = mini.has(l.dia) ? 1 - P.mini_taper_reduction : 1;
      const cargaDia = (sobra * pesos[k]) / soma * fatorDia;
      const dur = Math.min(150, arred5(cargaDia / pse));
      const tipo = l.tipoDia === 'volume' ? (k % 2 === 0 ? 'tatica' : 'tecnica') : TIPO_SESSAO[l.tipoDia];
      sessoes.push({ dia: l.dia, turno: tipo === 'fisico' || tipo === 'recuperacao' ? 'manha' : 'tarde', tipo, dur, pse, obj: OBJ[l.tipoDia], diaTipo: l.tipoDia, principal: l.i === idxPrincipal });
    });
    // Ajuste fino: se o teto de duração deixou a soma abaixo da meta, alonga as sessões (até 165 min) para chegar perto.
    const livresSess = sessoes.filter((x) => x.diaTipo !== 'competition');
    for (let volta = 0; volta < 3; volta++) {
      const somaLivre = livresSess.reduce((a, x) => a + x.dur * x.pse, 0);
      if (!somaLivre || somaLivre >= sobra * 0.97) break;
      const k = Math.min(1.25, sobra / somaLivre);
      livresSess.forEach((x) => { x.dur = Math.min(165, arred5(x.dur * k)); });
    }
    // Dia seguinte a um B: recuperação.
    if (semana.miniPolimento) {
      const rec = Math.round((semana.miniPolimento.recuperacao - semana.inicio) / DIA);
      const s = sessoes.find((x) => x.dia === rec);
      if (s) { s.tipo = 'recuperacao'; s.diaTipo = 'recovery'; s.pse = 3; s.obj = OBJ.recovery; s.dur = Math.min(s.dur, 60); }
    }
    comp.forEach((c) => sessoes.push({ dia: c.dia, turno: 'manha', tipo: 'competicao', dur: 120, pse: c.prioridade === 'A' ? 8 : 7, obj: c.nome, diaTipo: 'competition' }));
    return sessoes.sort((a, b) => a.dia - b.dia);
  }

  /* ---------- Alertas: planejado × executado (8 do documento) ---------- */

  // semanas: [{ inicio, tipoSemana, alvoUA, executado (UA por atleta ou null) }]; baseline em UA.
  function alertas(semanas, baseline, params) {
    const P = parametros(params);
    const A = P.alertas;
    const out = [];
    const feitas = semanas.filter((s) => s.executado != null);
    feitas.forEach((s, i) => {
      const dif = ((s.executado - s.alvoUA) / s.alvoUA) * 100;
      if (dif > A.load_above_target_pct) out.push({ inicio: s.inicio, tipo: 'acima_da_meta', severidade: 'warning', texto: `Carga ${Math.round(dif)}% acima da meta da semana.` });
      if (['deload', 'mini_taper', 'taper'].includes(s.tipoSemana) && baseline && s.executado > (A.deload_max_pct_of_baseline / 100) * baseline) {
        out.push({ inicio: s.inicio, tipo: s.tipoSemana === 'deload' ? 'descarga_sem_descarga' : 'polimento_sem_queda', severidade: 'warning', texto: s.tipoSemana === 'deload' ? 'Semana de descarga com carga acima de 85% da referência: não descarregou.' : 'Semana de polimento sem redução de carga.' });
      }
      const prev = feitas.slice(Math.max(0, i - 4), i);
      if (prev.length >= 2) {
        const m = prev.reduce((a, b) => a + b.executado, 0) / prev.length;
        if (m && ((s.executado - m) / m) * 100 > A.load_spike_pct) out.push({ inicio: s.inicio, tipo: 'pico_de_carga', severidade: 'warning', texto: `Pico: ${Math.round(((s.executado - m) / m) * 100)}% acima da média das semanas anteriores.` });
      }
      const ant = feitas[i - 1];
      if (ant && ((ant.executado - ant.alvoUA) / ant.alvoUA) * 100 < -A.load_below_target_pct && dif < -A.load_below_target_pct) {
        out.push({ inicio: s.inicio, tipo: 'abaixo_da_meta', severidade: 'info', texto: 'Carga mais de 25% abaixo da meta por duas semanas seguidas.' });
      }
    });
    return out;
  }

  // Baseline: média das últimas semanas executadas, ignorando descarga, transição e polimento.
  function baselineDe(semanas, params) {
    const P = parametros(params);
    const v = semanas.filter((s) => s.executado != null && s.tipoSemana === 'load').slice(-P.baseline_weeks).map((s) => s.executado);
    return v.length >= 2 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }

  window.Farol = window.Farol || {};
  window.Farol.motor = {
    PARAMS, TABELA, BLOCOS, ROTULO_DIA, NIVEL_PESO,
    parametros, distribuicao, dividir, fatoresMeso, classificar, gerar, diferenca, sessoesDaSemana, alertas, baselineDe,
    segundaDe, domingoDe, semanasEntre,
  };
})();
