/* Dados de exemplo (mock) usados enquanto o backend (Supabase, schema `ft`) não está ligado.
   Quando a integração entrar, este arquivo é substituído por chamadas ao banco. As telas só
   conhecem a forma de dados abaixo e as funções de edição no fim do arquivo.

   Hierarquia:  plano (temporada) -> ciclos -> mesociclos (fases) -> microciclos (semanas) -> sessões.
   A carga planejada de uma semana é a soma das sessões (duração × PSE alvo), em UA.
   A carga realizada vem dos registros de treino (presença e PSE de cada atleta). */
(function () {
  const U = window.Farol.util;
  const { DIA, ms, iso, HOJE, diaSemana, segunda } = U;
  const { TURMAS, PAUTA_PADRAO } = window.Farol.elenco;
  const CAL = window.Farol.calendario;
  const REG = window.Farol.registros;
  const COMPETICOES = CAL.COMPETICOES;

  const TIPOS_SESSAO = {
    tecnica: { nome: 'Técnica', cor: '--s-tecnica' },
    tatica: { nome: 'Tática', cor: '--s-tatica' },
    fisico: { nome: 'Físico', cor: '--s-fisico' },
    jogo: { nome: 'Jogo', cor: '--s-jogo' },
    recuperacao: { nome: 'Recuperação', curto: 'Recup.', cor: '--s-recuperacao' },
    competicao: { nome: 'Competição', curto: 'Compet.', cor: '--s-competicao' },
  };

  const TIPOS_MICRO = {
    ordinario: { nome: 'Ordinário', desc: 'Carga de rotina, com progressão normal.' },
    choque: { nome: 'Choque', desc: 'Carga alta e concentrada para provocar adaptação.' },
    recuperacao: { nome: 'Recuperação', desc: 'Carga reduzida para aliviar a fadiga acumulada.' },
    preCompetitivo: { nome: 'Pré-competitivo', desc: 'Volume baixo, intensidade mantida e ensaio das rotinas de jogo.' },
    competitivo: { nome: 'Competitivo', desc: 'Semana de jogos: treino leve e recuperação entre as partidas.' },
  };

  const TURNOS = [
    { id: 'manha', nome: 'Manhã' },
    { id: 'tarde', nome: 'Tarde' },
    { id: 'noite', nome: 'Noite' },
  ];
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // Modelo de cada fase. `f` é a fração do pico de carga no início e no fim da fase.
  const FASES = {
    base: {
      nome: 'Base', cor: '--m-base', f: [0.62, 0.86], pse: [5, 6],
      foco: { forca: 55, potencia: 15, mobilidade: 30 },
      objetivo: 'Construir capacidade de trabalho e força geral. Volume cresce semana a semana, com intensidade controlada.',
    },
    especifico: {
      nome: 'Específico', cor: '--m-especifico', f: [0.9, 0.8], pse: [6, 8],
      foco: { forca: 35, potencia: 45, mobilidade: 20 },
      objetivo: 'Converter a força em potência e velocidade de salto. O volume cai aos poucos e a intensidade sobe.',
    },
    polimento: {
      nome: 'Polimento', cor: '--m-polimento', f: [0.6, 0.45], pse: [6, 7],
      foco: { forca: 20, potencia: 55, mobilidade: 25 },
      objetivo: 'Reduzir volume mantendo a intensidade, para o atleta chegar descansado e rápido à competição.',
    },
    competicao: {
      nome: 'Competição', cor: '--m-competicao', f: [0.5, 0.42], pse: [7, 9],
      foco: { forca: 15, potencia: 40, mobilidade: 45 },
      objetivo: 'Manter prontidão e recuperar entre jogos. Treino físico curto e de baixa fadiga.',
    },
    transicao: {
      nome: 'Transição', cor: '--m-transicao', f: [0.32, 0.26], pse: [3, 4],
      foco: { forca: 25, potencia: 5, mobilidade: 70 },
      objetivo: 'Descanso ativo, mobilidade e correção de desequilíbrios antes do próximo ciclo.',
    },
  };
  const ORDEM_FASES = ['base', 'especifico', 'polimento', 'competicao', 'transicao'];

  /* ---------- Planos de exemplo ---------- */

  const b = (id, prio) => ({ id, prio });
  const BASE_SUB18 = {
    objetivo: 'Formar duplas fortes no side-out e confiáveis sob pressão, com saque como arma principal.',
    fundamentos: [b('saque', 'alta'), b('sideout', 'alta'), b('recepcao', 'alta'), b('bloqueio', 'media'), b('comunicacao', 'media'), b('pressao', 'media')],
    ideias: ['Toda dupla com um plano de saque claro', 'Treinar com placar em pelo menos duas sessões por semana', 'Vídeo curto de cada jogo para revisão na semana seguinte'],
  };

  const RAW = [
    {
      id: 'sub18', turma: 'sub18', mock: true, nome: 'Sub-18 Masculino', tipo: 'turma',
      temporada: 'Temporada 2026/27', inicio: '2026-08-03', pico: 3200, base: BASE_SUB18,
      ciclos: [
        { nome: 'Ciclo 1', alvo: 'c2', competicoes: ['c0', 'c1', 'c2'], fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 3], ['transicao', 3]] },
        { nome: 'Ciclo 2', alvo: 'c5', competicoes: ['c6', 'c5'], fases: [['base', 5], ['especifico', 6], ['polimento', 2], ['competicao', 3], ['transicao', 2]] },
        { nome: 'Ciclo 3', alvo: 'c7', competicoes: ['c7'], fases: [['base', 4], ['especifico', 5], ['polimento', 2], ['competicao', 2]] },
      ],
    },
    {
      id: 'adulto', turma: 'adulto', mock: true, nome: 'Adulto Misto, areia', tipo: 'turma',
      temporada: 'Temporada 2026/27', inicio: '2026-08-10', pico: 3600,
      base: {
        objetivo: 'Manter o nível competitivo no circuito aberto com carga controlada, respeitando a rotina de trabalho dos atletas.',
        fundamentos: [b('ataque', 'alta'), b('defesa', 'alta'), b('leitura', 'media'), b('entrosamento', 'media')],
        ideias: ['Treinos curtos e intensos nos dias úteis', 'Jogos-treino aos sábados'],
      },
      ciclos: [
        { nome: 'Ciclo 1', alvo: 'c3', competicoes: ['c0', 'c1', 'c3'], fases: [['base', 5], ['especifico', 5], ['polimento', 2], ['competicao', 2], ['transicao', 3]] },
        { nome: 'Ciclo 2', alvo: 'c8', competicoes: ['c8'], fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 3], ['transicao', 3]] },
      ],
    },
    {
      id: 'mariana', turma: 'sub19f', atletas: ['e1'], mock: true, nome: 'Mariana Costa', tipo: 'atleta',
      temporada: 'Temporada 2026/27', inicio: '2026-08-24', pico: 2700,
      base: {
        objetivo: 'Chegar à seletiva com saque agressivo e bloqueio de leitura, em dupla com Isabela.',
        fundamentos: [b('saque', 'alta'), b('bloqueio', 'alta'), b('leitura', 'media'), b('entrosamento', 'alta')],
        ideias: ['Trabalho específico de ombro e tronco para o saque viagem'],
      },
      ciclos: [
        { nome: 'Ciclo 1', alvo: 'c4', competicoes: ['c0', 'c1', 'c4'], fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 2], ['transicao', 2]] },
        { nome: 'Ciclo 2', alvo: 'c9', competicoes: ['c9'], fases: [['base', 5], ['especifico', 6], ['polimento', 2], ['competicao', 2], ['transicao', 2]] },
      ],
    },
  ].map((p) => ({ sessoes: {}, microTipos: {}, ...p }));

  /* ---------- Modelos de semana ---------- */

  const S = (dia, turno, tipo, dur, pse, obj) => ({ dia, turno, tipo, dur, pse, obj });

  function modeloOrdinario(tipoFase, choque) {
    const esp = tipoFase === 'especifico';
    const p = (base, extra) => base + (esp ? extra : 0) + (choque ? 1 : 0);
    const lista = [
      S(0, 'tarde', 'tecnica', 120, p(5, 0), 'Fundamentos: saque e recepção'),
      S(1, 'manha', 'fisico', 75, p(6, 1), esp ? 'Potência e saltos' : 'Força geral'),
      S(1, 'tarde', 'tatica', 120, p(5, 1), 'Sistemas de jogo e leitura de bloqueio'),
      S(2, 'tarde', 'tecnica', 120, p(5, 0), 'Defesa e cobertura'),
      S(3, 'manha', 'fisico', 75, p(6, 1), esp ? 'Velocidade e pliometria' : 'Força e estabilidade'),
      S(3, 'tarde', 'tatica', 120, p(6, 1), 'Side-out e transição'),
      S(4, 'tarde', 'jogo', 120, p(6, 1), esp ? 'Simulação de jogo com pontuação' : 'Jogos reduzidos com placar'),
      S(5, 'manha', 'recuperacao', 60, 3, 'Mobilidade e regenerativo'),
    ];
    if (choque) lista.push(S(5, 'tarde', 'jogo', 120, 7, 'Sets completos contra outra dupla'));
    return lista;
  }

  // Dias da semana (0 a 6) cobertos por competições.
  function diasDeJogo(compsSemana, ini) {
    const dias = new Set();
    compsSemana.forEach((c) => {
      for (let t = Math.max(c.data, ini); t <= Math.min(CAL.fimDe(c), ini + 6 * DIA); t += DIA) dias.add((t - ini) / DIA);
    });
    return [...dias].sort((x, y) => x - y);
  }

  function modelo(micro, tipoFase, compsSemana, ini) {
    switch (micro) {
      case 'recuperacao':
        if (tipoFase === 'transicao') {
          return [
            S(0, 'tarde', 'tecnica', 60, 3, 'Jogo livre e fundamentos'),
            S(2, 'manha', 'fisico', 45, 4, 'Mobilidade e correção postural'),
            S(3, 'tarde', 'jogo', 75, 4, 'Jogos recreativos'),
            S(5, 'manha', 'recuperacao', 60, 2, 'Atividade alternativa'),
          ];
        }
        return [
          S(0, 'tarde', 'tecnica', 90, 4, 'Fundamentos em ritmo leve'),
          S(1, 'manha', 'fisico', 45, 4, 'Mobilidade e core'),
          S(2, 'tarde', 'tecnica', 75, 4, 'Saque e recepção sem pressão'),
          S(3, 'manha', 'recuperacao', 60, 3, 'Regenerativo e alongamento'),
          S(4, 'tarde', 'jogo', 75, 5, 'Jogos livres'),
        ];
      case 'preCompetitivo':
        return [
          S(0, 'tarde', 'tatica', 90, 6, 'Sistemas e rotinas de jogo'),
          S(1, 'manha', 'fisico', 45, 5, 'Ativação e potência leve'),
          S(1, 'tarde', 'tatica', 90, 6, 'Leitura de bloqueio e cobertura'),
          S(2, 'tarde', 'tecnica', 75, 5, 'Saque e recepção sob pressão'),
          S(3, 'tarde', 'jogo', 60, 6, 'Jogos curtos de alta intensidade'),
          S(4, 'manha', 'recuperacao', 45, 3, 'Regenerativo'),
        ];
      case 'competitivo': {
        const jogos = diasDeJogo(compsSemana, ini);
        if (!jogos.length) {
          return [
            S(0, 'tarde', 'tecnica', 75, 5, 'Fundamentos em volume baixo'),
            S(1, 'tarde', 'tatica', 75, 6, 'Plano de jogo'),
            S(2, 'manha', 'recuperacao', 45, 3, 'Regenerativo'),
            S(3, 'tarde', 'tatica', 60, 5, 'Rotinas de saque e recepção'),
          ];
        }
        const nome = compsSemana[0].nome;
        const antes = [
          S(0, 'tarde', 'tecnica', 75, 5, 'Ajustes finais de fundamentos'),
          S(1, 'tarde', 'tatica', 75, 6, 'Plano de jogo e adversários'),
          S(2, 'manha', 'recuperacao', 45, 3, 'Regenerativo'),
          S(3, 'tarde', 'tatica', 60, 5, 'Ativação e rotinas de saque'),
        ].filter((s) => s.dia < jogos[0]);
        return antes.concat(jogos.map((d) => S(d, 'manha', 'competicao', 120, 7, nome)));
      }
      default:
        return modeloOrdinario(tipoFase, micro === 'choque');
    }
  }

  const arred5 = (v) => Math.max(20, Math.round(v / 5) * 5);

  // Cria as sessões da semana e escala as durações para chegar perto da carga alvo da fase.
  function gerarSessoes(micro, tipoFase, compsSemana, alvo, ini) {
    const lista = modelo(micro, tipoFase, compsSemana, ini);
    const fixas = lista.filter((s) => s.tipo === 'competicao');
    const moveis = lista.filter((s) => s.tipo !== 'competicao');
    const cargaFixa = fixas.reduce((a, s) => a + s.dur * s.pse, 0);
    const cargaMovel = moveis.reduce((a, s) => a + s.dur * s.pse, 0);
    const restante = alvo - cargaFixa;
    if (restante > 200 && cargaMovel > 0) {
      const k = Math.min(1.5, Math.max(0.6, restante / cargaMovel));
      moveis.forEach((s) => { s.dur = arred5(s.dur * k); });
    }
    return lista.map((s, i) => ({ ...s, id: `${ini}:${i}` }));
  }

  const carga = (sessoes) => sessoes.reduce((a, s) => a + s.dur * s.pse, 0);
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Montagem do plano ---------- */

  function montar(raw) {
    const inicio = ms(raw.inicio);
    const turma = TURMAS[raw.turma];
    const atletas = raw.atletas || (turma ? turma.atletas : []);
    const todas = [];
    raw.ciclos.forEach((c) => c.competicoes.forEach((id) => {
      if (!todas.find((x) => x.id === id)) todas.push({ ...COMPETICOES[id], alvo: raw.ciclos.some((q) => q.alvo === id) });
    }));
    todas.sort((a, b) => a.data - b.data);

    const mesos = [];
    const semanas = [];
    const ciclos = [];
    let n = 0;

    raw.ciclos.forEach((c, ci) => {
      const cicloIni = n;
      const mesosCiclo = [];
      c.fases.forEach(([tipo, qtd], fi) => {
        const fase = FASES[tipo];
        const salvaPauta = c.pautas && c.pautas[tipo];
        const meso = {
          id: `${ci}-${tipo}`, tipo, nome: fase.nome, cor: fase.cor, fase, ciclo: ci, indice: fi,
          semanaIni: n, semanas: qtd,
          inicio: inicio + n * 7 * DIA,
          fim: inicio + (n + qtd) * 7 * DIA - DIA,
          pauta: copiar(salvaPauta || PAUTA_PADRAO[tipo]),
          pautaPropria: !!salvaPauta,
        };
        for (let k = 0; k < qtd; k++, n++) {
          const ini = inicio + n * 7 * DIA;
          const t = qtd === 1 ? 0 : k / (qtd - 1);
          const alvoBase = raw.pico * (fase.f[0] + (fase.f[1] - fase.f[0]) * t);
          const compsSemana = todas.filter((q) => CAL.fimDe(q) >= ini && q.data < ini + 7 * DIA);
          const compsProxima = todas.filter((q) => q.data >= ini + 7 * DIA && q.data < ini + 14 * DIA);

          let auto = 'ordinario';
          if (tipo === 'transicao') auto = 'recuperacao';
          else if (tipo === 'competicao') auto = 'competitivo';
          else if (tipo === 'polimento') auto = 'preCompetitivo';
          else if (compsSemana.length) auto = 'competitivo';
          else if (compsProxima.length) auto = 'preCompetitivo';
          else if (qtd >= 5 && k === 3 && (tipo === 'base' || tipo === 'especifico')) auto = 'recuperacao';
          else if (tipo === 'especifico' && k === 2) auto = 'choque';

          const microTipo = raw.microTipos[ini] || auto;
          const editada = !!raw.sessoes[ini];
          const alvoCarga = alvoBase * (microTipo === 'recuperacao' && (tipo === 'base' || tipo === 'especifico') ? 0.75 : 1);
          const sessoes = editada
            ? raw.sessoes[ini].map((s) => ({ ...s }))
            : gerarSessoes(microTipo, tipo, compsSemana, alvoCarga, ini);

          semanas.push({
            n: n + 1, idx: n, inicio: ini, ciclo: ci, meso: meso.id, mesoTipo: tipo,
            microTipo, microAuto: auto, editada, sessoes, planejado: carga(sessoes),
            realizado: null, registro: null,
            descarga: microTipo === 'recuperacao',
            competicoes: compsSemana,
          });
        }
        mesosCiclo.push(meso);
        mesos.push(meso);
      });

      const fim = inicio + n * 7 * DIA - DIA;
      ciclos.push({
        idx: ci, nome: c.nome, alvo: todas.find((q) => q.id === c.alvo),
        semanaIni: cicloIni, semanas: n - cicloIni,
        inicio: inicio + cicloIni * 7 * DIA, fim,
        mesos: mesosCiclo,
        comps: c.competicoes.map((id) => todas.find((q) => q.id === id)).sort((a, b) => a.data - b.data),
      });
    });

    mesos.forEach((m) => {
      const sem = semanas.slice(m.semanaIni, m.semanaIni + m.semanas);
      m.mediaPlanejada = sem.reduce((a, s) => a + s.planejado, 0) / sem.length;
      m.picoPlanejado = Math.max(...sem.map((s) => s.planejado));
      m.competicoes = todas.filter((c) => CAL.fimDe(c) >= m.inicio && c.data < m.fim + DIA);
    });

    ciclos.forEach((c) => {
      const sem = semanas.slice(c.semanaIni, c.semanaIni + c.semanas);
      c.mediaPlanejada = sem.reduce((a, s) => a + s.planejado, 0) / sem.length;
      c.estado = HOJE > c.fim + DIA - 1 ? 'concluido' : HOJE >= c.inicio ? 'andamento' : 'planejado';
    });

    const semanaAtual = semanas.findIndex((s) => HOJE >= s.inicio && HOJE < s.inicio + 7 * DIA);
    const plano = {
      id: raw.id, nome: raw.nome, tipo: raw.tipo, mock: !!raw.mock, turma: raw.turma, temporada: raw.temporada, pico: raw.pico,
      detalhe: raw.tipo === 'atleta' ? `Individual · ${turma ? turma.faixa : ''}` : `Turma · ${atletas.length} atletas`,
      atletas, professores: turma ? turma.professores : [],
      base: raw.base || { objetivo: '', fundamentos: [], ideias: [] },
      inicioMs: inicio, fimMs: inicio + n * 7 * DIA - DIA,
      ciclos, mesos, semanas, comps: todas,
      semanaAtual,
      cicloAtual: semanaAtual >= 0 ? semanas[semanaAtual].ciclo : -1,
      mesoAtual: semanaAtual >= 0 ? semanas[semanaAtual].meso : null,
    };

    // Registros de treino alimentam a carga realizada.
    semanas.forEach((s) => {
      s.registro = REG.resumoSemana(plano, s);
      s.realizado = s.registro.realizado == null ? null : Math.round(s.registro.realizado / 10) * 10;
    });
    return plano;
  }

  const planos = RAW.map((r) => montar(r));
  const idx = (id) => RAW.findIndex((r) => r.id === id);
  const reconstruir = (id) => { const i = idx(id); planos[i] = montar(RAW[i]); return planos[i]; };

  /* ---------- Cálculos para criar um plano ---------- */

  // Distribui as fases para que o ciclo termine na semana da competição alvo.
  function distribuirAteAlvo(inicioMs, alvoMs, transicao = 2) {
    const W = Math.floor((segunda(alvoMs) - segunda(inicioMs)) / (7 * DIA)) + 1;
    if (W < 4) return null;
    const comp = W >= 14 ? 3 : 2;
    const pol = W >= 8 ? 2 : 1;
    const resto = W - comp - pol;
    const base = Math.max(1, Math.round(resto * 0.45));
    const esp = Math.max(1, resto - base);
    const fases = [['base', base], ['especifico', esp], ['polimento', pol], ['competicao', comp]];
    if (transicao) fases.push(['transicao', transicao]);
    return fases;
  }

  // Datas de cada ciclo, encadeados a partir do início do plano.
  function cronograma(inicioIso, ciclos) {
    let t = segunda(ms(inicioIso));
    return ciclos.map((c) => {
      const sem = c.fases.reduce((a, f) => a + f[1], 0);
      const r = { inicio: t, fim: t + sem * 7 * DIA - DIA, semanas: sem };
      t += sem * 7 * DIA;
      return r;
    });
  }

  /* ---------- Edição ---------- */

  let contador = 0;

  function sessoesParaEditar(id, semana) {
    const raw = RAW[idx(id)];
    return raw.sessoes[semana.inicio] ? raw.sessoes[semana.inicio] : semana.sessoes.map((s) => ({ ...s }));
  }

  function ordenar(lista) {
    const ordemTurno = { manha: 0, tarde: 1, noite: 2 };
    lista.sort((a, c) => a.dia - c.dia || ordemTurno[a.turno] - ordemTurno[c.turno]);
    return lista;
  }

  const api = {
    HOJE, DIA, FASES, ORDEM_FASES, COMPETICOES, TIPOS_SESSAO, TIPOS_MICRO, TURNOS, DIAS,
    planos,
    plano: (id) => planos[idx(id)],
    distribuirAteAlvo, cronograma,
    recarregar() { RAW.forEach((r, i) => { planos[i] = montar(r); }); },

    turmasSemPlano: () => Object.values(TURMAS).filter((t) => !RAW.some((r) => r.turma === t.id && r.tipo === 'turma')),

    criarPlano(cfg) {
      const turma = TURMAS[cfg.turma];
      const crono = cronograma(cfg.inicio, cfg.ciclos);
      const id = `p${RAW.length + 1}`;
      const ciclos = cfg.ciclos.map((c, i) => {
        const comps = CAL.lista().filter((q) => q.data >= crono[i].inicio && q.data <= crono[i].fim + DIA - 1 && q.categorias.some((k) => turma.categorias.includes(k))).map((q) => q.id);
        if (c.alvo && !comps.includes(c.alvo)) comps.push(c.alvo);
        return { nome: c.nome, alvo: c.alvo, competicoes: comps, fases: c.fases, pautas: c.pautas || {} };
      });
      RAW.push({
        id, turma: cfg.turma, mock: false, nome: cfg.nome || turma.nome, tipo: 'turma',
        temporada: cfg.temporada, inicio: iso(segunda(ms(cfg.inicio))), pico: cfg.pico,
        base: cfg.base, ciclos, sessoes: {}, microTipos: {},
      });
      planos.push(montar(RAW[RAW.length - 1]));
      return id;
    },

    ajustarFase(id, ciclo, indiceFase, delta) {
      const f = RAW[idx(id)].ciclos[ciclo].fases[indiceFase];
      f[1] = Math.min(12, Math.max(1, f[1] + delta));
      return reconstruir(id);
    },

    salvarPauta(id, ciclo, tipoFase, pauta) {
      const c = RAW[idx(id)].ciclos[ciclo];
      c.pautas = c.pautas || {};
      c.pautas[tipoFase] = copiar(pauta);
      return reconstruir(id);
    },

    salvarBase(id, base) {
      RAW[idx(id)].base = copiar(base);
      return reconstruir(id);
    },

    salvarSessao(id, semana, sessao) {
      const lista = sessoesParaEditar(id, semana);
      const i = lista.findIndex((s) => s.id === sessao.id);
      if (i >= 0) lista[i] = { ...lista[i], ...sessao };
      else lista.push({ ...sessao, id: `n${++contador}` });
      RAW[idx(id)].sessoes[semana.inicio] = ordenar(lista);
      return reconstruir(id);
    },

    removerSessao(id, semana, sessaoId) {
      const lista = sessoesParaEditar(id, semana).filter((s) => s.id !== sessaoId);
      REG.remover(planos[idx(id)], { id: sessaoId });
      RAW[idx(id)].sessoes[semana.inicio] = lista;
      return reconstruir(id);
    },

    definirMicroTipo(id, semana, tipo) {
      const raw = RAW[idx(id)];
      if (!tipo || tipo === semana.microAuto) delete raw.microTipos[semana.inicio];
      else raw.microTipos[semana.inicio] = tipo;
      return reconstruir(id);
    },

    copiarSemana(id, de, para) {
      const raw = RAW[idx(id)];
      raw.sessoes[para.inicio] = de.sessoes
        .filter((s) => s.tipo !== 'competicao')
        .map((s) => ({ ...s, id: `n${++contador}` }));
      raw.microTipos[para.inicio] = de.microTipo;
      return reconstruir(id);
    },

    restaurarSemana(id, semana) {
      const raw = RAW[idx(id)];
      delete raw.sessoes[semana.inicio];
      delete raw.microTipos[semana.inicio];
      return reconstruir(id);
    },

    registrarTreino(id, semana, sessao, reg) {
      REG.salvar(planos[idx(id)], semana, sessao, reg);
      return reconstruir(id);
    },
  };

  window.Farol = window.Farol || {};
  window.Farol.dados = api;
})();
