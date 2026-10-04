/* Dados de exemplo (mock) usados enquanto o backend (Supabase, schema `ft`) não está ligado.
   Quando a integração entrar, este arquivo é substituído por chamadas ao banco. As telas só
   conhecem a forma de dados abaixo e as funções de edição no fim do arquivo.

   Hierarquia:  plano (temporada) -> ciclos -> mesociclos (fases) -> microciclos (semanas) -> sessões.
   A carga planejada de uma semana é a soma das sessões (duração × PSE alvo), em UA.
   A carga realizada vem dos registros de treino (presença e PSE de cada atleta). */
(function () {
  const U = window.Farol.util;
  const { DIA, ms, iso, dd, HOJE, diaSemana, segunda } = U;
  const { TURMAS, PAUTA_PADRAO } = window.Farol.elenco;
  const CAL = window.Farol.calendario;
  const REG = window.Farol.registros;
  const COMPETICOES = CAL.COMPETICOES;

  const STATUS_TXT = { confirmed: 'confirmada', provisional: 'provisória', cancelled: 'cancelada', done: 'realizada' };

  const TIPOS_SESSAO = {
    tecnica: { nome: 'Técnica', cor: '--s-tecnica' },
    tatica: { nome: 'Tática', cor: '--s-tatica' },
    fisico: { nome: 'Físico', cor: '--s-fisico' },
    jogo: { nome: 'Jogo', cor: '--s-jogo' },
    recuperacao: { nome: 'Recuperação', curto: 'Recup.', cor: '--s-recuperacao' },
    competicao: { nome: 'Competição', curto: 'Compet.', cor: '--s-competicao' },
  };

  const TIPOS_MICRO = {
    // Semanas da periodização dinâmica
    load: { nome: 'Carga', desc: 'Semana de carga: sobe em relação à anterior dentro do bloco.' },
    deload: { nome: 'Descarga', desc: 'Última semana do bloco, a ~70% da carga de referência, para absorver o trabalho.' },
    mini_taper: { nome: 'Mini-polimento', desc: 'Semana com competição B: nos 3 dias antes a carga cai ~20% e o dia seguinte é de recuperação.' },
    taper: { nome: 'Polimento', desc: 'Semana do evento A: volume baixo, intensidade mantida.' },
    competition: { nome: 'Competição', desc: 'Semana de competição.' },
    transition: { nome: 'Transição', desc: 'Recuperação depois do evento A. Sem força pesada.' },
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
  // Blocos da periodização dinâmica (motor.js). Os textos seguem o documento de lógica.
  Object.assign(FASES, {
    acumulacao: { nome: 'Acumulação', cor: '--m-base', pse: [5, 6], foco: { forca: 55, potencia: 15, mobilidade: 30 }, objetivo: 'Constrói a base. Mais volume, intensidade moderada.' },
    transmutacao: { nome: 'Transmutação', cor: '--m-especifico', pse: [6, 8], foco: { forca: 35, potencia: 45, mobilidade: 20 }, objetivo: 'Transforma a base em potência e em gesto específico do jogo. A intensidade sobe e o volume cai um pouco.' },
    realizacao: { nome: 'Realização', cor: '--m-polimento', pse: [6, 8], foco: { forca: 15, potencia: 55, mobilidade: 30 }, objetivo: 'Prepara a competição. Mantém a intensidade, reduz o volume e termina no evento A.' },
    manutencao: { nome: 'Manutenção', cor: '--m-manutencao', pse: [5, 6], foco: { forca: 30, potencia: 35, mobilidade: 35 }, objetivo: 'Mantém o nível enquanto não há competição alvo definida.' },
  });
  FASES.transicao.objetivo = 'Recuperação depois do evento A: descanso ativo, mobilidade e correção de desequilíbrios.';
  const ORDEM_FASES = ['base', 'especifico', 'polimento', 'competicao', 'transicao'];

  /* ---------- Planos de exemplo ---------- */

  const b = (id, prio) => ({ id, prio });
  const BASE_SUB18 = {
    objetivo: 'Formar duplas fortes no side-out e confiáveis sob pressão, com saque como arma principal.',
    fundamentos: [b('saque', 'alta'), b('sideout', 'alta'), b('recepcao', 'alta'), b('bloqueio', 'media'), b('comunicacao', 'media'), b('pressao', 'media')],
    ideias: ['Toda dupla com um plano de saque claro', 'Treinar com placar em pelo menos duas sessões por semana', 'Vídeo curto de cada jogo para revisão na semana seguinte'],
  };

  const RAW_DEMO = [
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

  // Conta cadastrada: parte sem planos de exemplo e guarda os planos do técnico (inclusive as sessões editadas) neste aparelho.
  const CONTA = window.Farol.conta;
  const CH_PLANOS = CONTA.chave('planos');
  let RAW = RAW_DEMO;
  if (CONTA.guardaDados()) {
    RAW = [];
    try { RAW = JSON.parse(localStorage.getItem(CH_PLANOS) || '[]'); } catch (e) { RAW = []; }
  }
  const gravarPlanos = () => { if (CONTA.guardaDados()) { try { localStorage.setItem(CH_PLANOS, JSON.stringify(RAW)); } catch (e) { /* ignora */ } } };

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

  // Planos antigos (fases fixas): ciclos com fases escolhidas à mão.
  function montarLegado(raw, inicio) {
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

    return { todas, mesos, semanas, ciclos, n };
  }

  /* ---------- Planos da periodização dinâmica ---------- */
  // Estes planos guardam a estrutura de semanas aceita (`raw.motor.estrutura`), gerada pelo motor (motor.js) a partir dos
  // eventos com prioridade A, B ou C. Os ciclos, blocos e microciclos abaixo são derivados dela, no mesmo formato dos planos antigos.

  const eventosMotor = (raw) => Object.entries(raw.motor.prioridades || {}).map(([id, prioridade]) => {
    const c = COMPETICOES[id];
    return c ? { id, nome: c.nome, inicio: c.data, fim: CAL.fimDe(c), prioridade, status: c.status || 'confirmed', nivel: c.nivel } : null;
  }).filter(Boolean);

  const CAMPOS_SEMANA = ['inicio', 'ciclo', 'mesoIdx', 'bloco', 'posMeso', 'nMeso', 'tipoSemana', 'fator', 'ancora', 'eventos', 'miniPolimento', 'base', 'sess'];
  const enxuta = (w) => { const o = {}; CAMPOS_SEMANA.forEach((k) => { if (w[k] !== undefined) o[k] = JSON.parse(JSON.stringify(w[k])); }); return o; };

  function montarMotor(raw, inicio) {
    const Mo = window.Farol.motor;
    const m = raw.motor;
    const evs = eventosMotor(raw);
    const evPorId = {};
    evs.forEach((e) => { evPorId[e.id] = e; });
    const todas = evs.map((e) => ({ ...COMPETICOES[e.id], alvo: e.prioridade === 'A', prioridade: e.prioridade })).sort((a, b) => a.data - b.data);
    const est = (m.estrutura || []).slice().sort((a, b) => a.inicio - b.inicio);

    // Quantos mesociclos de cada bloco há em cada ciclo, para nomear "Acumulação 1/2".
    const ordemCiclo = [...new Set(est.map((w) => w.ciclo))];
    const ciOf = (w) => ordemCiclo.indexOf(w.ciclo);
    const contagem = {};
    const vistos = new Set();
    est.forEach((w) => { const k = `${ciOf(w)}|${w.bloco}`; if (!vistos.has(`${k}|${w.mesoIdx}`)) { vistos.add(`${k}|${w.mesoIdx}`); contagem[k] = (contagem[k] || 0) + 1; } });
    const posNoBloco = {};

    const mesos = [];
    const semanas = [];
    const ciclos = [];
    let mesoAtual = null;
    est.forEach((w, n) => {
      const ci = ciOf(w);
      const ini = w.inicio;
      if (!mesoAtual || mesoAtual.mesoIdx !== w.mesoIdx) {
        const fase = FASES[w.bloco];
        const kb = `${ci}|${w.bloco}`;
        posNoBloco[kb] = (posNoBloco[kb] || 0) + 1;
        const salva = m.pautas && m.pautas[ci] && m.pautas[ci][w.bloco];
        mesoAtual = {
          id: `${ci}-m${w.mesoIdx}`, mesoIdx: w.mesoIdx, tipo: w.bloco, nome: contagem[kb] > 1 ? `${fase.nome} ${posNoBloco[kb]}/${contagem[kb]}` : fase.nome,
          cor: fase.cor, fase, ciclo: ci, indice: mesos.length, semanaIni: n, semanas: 0,
          inicio: ini, fim: ini + 7 * DIA - DIA,
          pauta: copiar(salva || PAUTA_PADRAO[w.bloco]), pautaPropria: !!salva,
        };
        mesos.push(mesoAtual);
      }
      mesoAtual.semanas += 1;
      mesoAtual.fim = ini + 7 * DIA - DIA;

      const noPeriodo = todas.filter((q) => CAL.fimDe(q) >= ini && q.data < ini + 7 * DIA);
      const alvoUA = (w.base || m.baseline || 0) * w.fator;
      const editada = !!raw.sessoes[ini];
      // Semana que já começou: as sessões geradas ficam guardadas, para não mudarem quando o calendário ou os parâmetros mudarem.
      m.congeladas = m.congeladas || {};
      let sessoes;
      if (editada) sessoes = raw.sessoes[ini].map((x) => ({ ...x }));
      else if (m.congeladas[ini]) sessoes = m.congeladas[ini].map((x) => ({ ...x }));
      else {
        // O estado atual dos eventos vale para mostrar a competição; a estrutura (bloco, fator) segue a aceita.
        const eventos = noPeriodo.map((c) => { const guardado = (w.eventos || []).find((e) => e.id === c.id); return { id: c.id, prioridade: guardado ? guardado.prioridade : c.prioridade }; });
        sessoes = Mo.sessoesDaSemana({ ...w, eventos, alvoUA }, w.sess || m.sessoesSemana, evPorId, m.params).map((x, i) => ({ ...x, id: `${ini}:${i}` }));
        if (ini <= Mo.domingoDe(HOJE)) m.congeladas[ini] = sessoes.map((x) => ({ ...x }));
      }
      semanas.push({
        n: n + 1, idx: n, inicio: ini, ciclo: ci, meso: mesoAtual.id, mesoTipo: w.bloco,
        microTipo: w.tipoSemana, microAuto: w.tipoSemana, editada, sessoes, planejado: carga(sessoes),
        realizado: null, registro: null,
        descarga: w.tipoSemana === 'deload' || w.tipoSemana === 'transition',
        competicoes: noPeriodo,
        fator: w.fator, alvoUA, tipoSemana: w.tipoSemana, bloco: w.bloco, miniPolimento: w.miniPolimento || null,
        eventos: noPeriodo.map((c) => ({ id: c.id, prioridade: ((w.eventos || []).find((e) => e.id === c.id) || {}).prioridade || c.prioridade, original: c.prioridade })),
      });
    });

    ordemCiclo.forEach((cid, ci) => {
      const doCiclo = semanas.filter((s) => s.ciclo === ci);
      const ini = doCiclo[0].inicio, fim = doCiclo[doCiclo.length - 1].inicio + 7 * DIA - DIA;
      const ancoraId = (est.find((w) => ciOf(w) === ci && w.ancora) || {}).ancora;
      const alvo = todas.find((q) => q.id === ancoraId) || { id: null, nome: 'Sem competição alvo', data: fim, local: '', semAlvo: true, categorias: [] };
      ciclos.push({
        idx: ci, nome: `Ciclo ${ci + 1}`, alvo, semanaIni: doCiclo[0].idx, semanas: doCiclo.length, inicio: ini, fim,
        mesos: mesos.filter((q) => q.ciclo === ci),
        comps: todas.filter((q) => CAL.fimDe(q) >= ini && q.data < fim + DIA),
      });
    });
    return { todas, mesos, semanas, ciclos, n: est.length };
  }

  function montar(raw) {
    const inicio = ms(raw.inicio);
    const turma = TURMAS[raw.turma];
    const atletas = raw.atletas || (turma ? turma.atletas : []);
    const { todas, mesos, semanas, ciclos, n } = raw.motor ? montarMotor(raw, inicio) : montarLegado(raw, inicio);

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
      motor: raw.motor ? { baseline: raw.motor.baseline, sessoesSemana: raw.motor.sessoesSemana, prioridades: { ...raw.motor.prioridades }, params: raw.motor.params || {}, revisoes: raw.motor.revisoes || [] } : null,
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

  // A demonstração usa a periodização dinâmica: prioridades dos eventos e a estrutura gerada como se o plano tivesse sido criado no início.
  const DEMO_MOTOR = {
    sub18: { baseline: 2300, sessoes: 5, prioridades: { c0: 'C', c1: 'B', c2: 'A', c6: 'B', c5: 'A', c7: 'A' } },
    adulto: { baseline: 2400, sessoes: 5, prioridades: { c0: 'C', c1: 'B', c3: 'A', c8: 'A' } },
    mariana: { baseline: 1800, sessoes: 4, prioridades: { c0: 'C', c1: 'B', c4: 'A', c9: 'A' } },
  };
  function estruturaInicial(raw) {
    const ini = ms(raw.inicio);
    const r = window.Farol.motor.gerar({ hoje: ini - DIA, inicio: ini, eventos: eventosMotor(raw), baseline: raw.motor.baseline, params: raw.motor.params });
    return r.semanas.map((w) => enxuta({ ...w, base: raw.motor.baseline, sess: raw.motor.sessoesSemana }));
  }
  const instantaneoAjustes = (raw) => JSON.stringify({ b: raw.motor.baseline, s: raw.motor.sessoesSemana, p: raw.motor.params || {} });
  const instantaneoEventos = (raw) => eventosMotor(raw).map((e) => ({ id: e.id, inicio: e.inicio, fim: e.fim, prioridade: e.prioridade, status: e.status }));
  if (!CONTA.guardaDados()) {
    RAW.forEach((r) => {
      const d = DEMO_MOTOR[r.id];
      if (!d) return;
      r.motor = { baseline: d.baseline, sessoesSemana: d.sessoes, prioridades: d.prioridades, params: {}, pautas: {}, revisoes: [], estrutura: [] };
      r.motor.estrutura = estruturaInicial(r);
      r.motor.eventosAceitos = instantaneoEventos(r);
      r.motor.ajustesAceitos = instantaneoAjustes(r);
    });
  }

  const planos = RAW.map((r) => montar(r));
  const idx = (id) => RAW.findIndex((r) => r.id === id);
  const reconstruir = (id) => { const i = idx(id); planos[i] = montar(RAW[i]); gravarPlanos(); return planos[i]; };

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

  // Os ids das sessões criadas à mão (n1, n2…) continuam de onde pararam, para não repetir depois de recarregar.
  let contador = 0;
  RAW.forEach((r) => Object.values(r.sessoes || {}).forEach((l) => l.forEach((x) => { const m = /^n(\d+)$/.exec(x.id || ''); if (m) contador = Math.max(contador, Number(m[1])); })));

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
      gravarPlanos();
      return id;
    },


    /* ---------- Periodização dinâmica ---------- */

    // Cria a periodização a partir das prioridades dos eventos: { turma, nome, temporada, inicio, baseline, sessoesSemana, prioridades, base }
    criarPeriodizacao(cfg) {
      const turma = TURMAS[cfg.turma];
      const id = `p${RAW.length + 1}`;
      const raw = {
        id, turma: cfg.turma, mock: false, nome: cfg.nome || turma.nome, tipo: 'turma',
        temporada: cfg.temporada, inicio: iso(segunda(ms(cfg.inicio))), base: cfg.base || { objetivo: '', fundamentos: [], ideias: [] },
        ciclos: [], sessoes: {}, microTipos: {},
        motor: { baseline: cfg.baseline, sessoesSemana: cfg.sessoesSemana, prioridades: { ...cfg.prioridades }, params: cfg.params || {}, pautas: {}, revisoes: [], estrutura: [] },
      };
      raw.motor.estrutura = estruturaInicial(raw);
      raw.motor.eventosAceitos = instantaneoEventos(raw);
      raw.motor.ajustesAceitos = instantaneoAjustes(raw);
      RAW.push(raw);
      planos.push(montar(raw));
      gravarPlanos();
      return id;
    },

    // Prévia de uma estrutura sem criar nada (para o assistente).
    previaPeriodizacao(cfg) {
      const raw = { inicio: iso(segunda(ms(cfg.inicio))), motor: { baseline: cfg.baseline, sessoesSemana: cfg.sessoesSemana, prioridades: { ...cfg.prioridades }, params: cfg.params || {} } };
      const ini = ms(raw.inicio);
      return window.Farol.motor.gerar({ hoje: ini - DIA, inicio: ini, eventos: eventosMotor(raw), baseline: cfg.baseline, params: cfg.params });
    },

    // Define a prioridade (A, B ou C) de uma competição neste plano; null tira do plano.
    definirPrioridade(id, compId, prio) {
      const raw = RAW[idx(id)];
      if (prio) raw.motor.prioridades[compId] = prio; else delete raw.motor.prioridades[compId];
      return reconstruir(id);
    },

    salvarParametrosMotor(id, { baseline, sessoesSemana, params }) {
      const raw = RAW[idx(id)];
      if (baseline) raw.motor.baseline = baseline;
      if (sessoesSemana) raw.motor.sessoesSemana = sessoesSemana;
      if (params) raw.motor.params = params;
      raw.motor.ignorar = null;
      return reconstruir(id);
    },

    // O que mudou nos eventos desde a última estrutura aceita, em frases.
    mudancasEventos(id) {
      const raw = RAW[idx(id)];
      const antes = raw.motor.eventosAceitos || [];
      const agora = instantaneoEventos(raw);
      const nome = (eid) => (COMPETICOES[eid] ? COMPETICOES[eid].nome : eid);
      const out = [];
      agora.forEach((e) => {
        const a = antes.find((x) => x.id === e.id);
        if (!a) out.push(`Novo evento ${e.prioridade}: ${nome(e.id)} (${dd(e.inicio)})`);
        else {
          if (a.inicio !== e.inicio || a.fim !== e.fim) out.push(`${nome(e.id)} mudou de data: ${dd(a.inicio)} para ${dd(e.inicio)}`);
          if (a.prioridade !== e.prioridade) out.push(`${nome(e.id)} passou de ${a.prioridade} para ${e.prioridade}`);
          if (a.status !== e.status) out.push(`${nome(e.id)}: ${STATUS_TXT[a.status] || a.status} para ${STATUS_TXT[e.status] || e.status}`);
        }
      });
      antes.forEach((a) => { if (!agora.find((e) => e.id === a.id)) out.push(`${nome(a.id)} saiu do plano`); });
      return out;
    },

    // Avisos do calendário atual (conflitos, janela curta, sugestões), mesmo sem nada a mudar.
    avisos(id) {
      const raw = RAW[idx(id)];
      if (!raw || !raw.motor) return { conflitos: [], sugestoes: [], janelas: [], provisorio: false };
      const r = window.Farol.motor.gerar({ hoje: HOJE, inicio: ms(raw.inicio), eventos: eventosMotor(raw), baseline: raw.motor.baseline, params: raw.motor.params, congelado: raw.motor.estrutura });
      return { conflitos: r.conflitos, sugestoes: r.sugestoes, janelas: r.janelas, provisorio: r.provisorio };
    },

    // Alertas de planejado × executado de uma periodização.
    alertasPlano(id) {
      const plano = planos[idx(id)];
      const Mo = window.Farol.motor;
      const sem = plano.semanas.filter((w) => w.inicio + 6 * DIA < HOJE).map((w) => ({ inicio: w.inicio, tipoSemana: w.tipoSemana, alvoUA: w.alvoUA, executado: w.realizado }));
      return Mo.alertas(sem, plano.motor.baseline, plano.motor.params);
    },

    // Refaz o futuro com os eventos de agora e compara com o que está aceito. Nada muda até o técnico aceitar.
    proposta(id) {
      const raw = RAW[idx(id)];
      if (!raw || !raw.motor || !raw.motor.estrutura.length) return null;
      const Mo = window.Farol.motor;
      const plano = planos[idx(id)];
      const exec = plano.semanas.map((w) => ({ inicio: w.inicio, tipoSemana: w.tipoSemana, executado: w.realizado, alvoUA: w.alvoUA }));
      // O motor só refaz o futuro quando algo dispara: evento criado, movido, rebaixado ou cancelado; ajustes alterados;
      // ou a carga de referência calculada pelo que foi feito se afastou mais de 15% da usada no plano.
      const gatilhos = api.mudancasEventos(id);
      if (instantaneoAjustes(raw) !== raw.motor.ajustesAceitos) gatilhos.push('Os ajustes da periodização mudaram');
      const sug = Mo.baselineDe(exec.filter((w) => w.inicio <= Mo.domingoDe(HOJE)), raw.motor.params);
      let baseline = raw.motor.baseline;
      let trocaBase = null;
      if (sug && Math.abs(sug / baseline - 1) > 0.15) { baseline = Math.round(sug / 10) * 10; trocaBase = { de: raw.motor.baseline, para: baseline }; gatilhos.push(`A carga de referência mudou mais de 15%: de ${trocaBase.de} para ${trocaBase.para} UA`); }
      if (!gatilhos.length) return null;
      const r = Mo.gerar({ hoje: HOJE, inicio: ms(raw.inicio), eventos: eventosMotor(raw), baseline, params: raw.motor.params, congelado: raw.motor.estrutura });
      r.semanas.forEach((w) => { if (w.base == null) w.base = baseline; if (w.sess == null) w.sess = raw.motor.sessoesSemana; });
      const dif = Mo.diferenca(raw.motor.estrutura, r.semanas, HOJE);
      if (!dif.length) return null;
      const assinatura = JSON.stringify([dif.map((d) => [d.inicio, d.tipo, d.depois ? d.depois.fator : null, d.depois ? d.depois.bloco : null]), baseline]);
      if (raw.motor.ignorar === assinatura) return null;
      return { planoId: id, dif, semanas: r.semanas, baseline, trocaBase, gatilhos, conflitos: r.conflitos, sugestoes: r.sugestoes, janelas: r.janelas, provisorio: r.provisorio, assinatura };
    },

    aceitarProposta(id) {
      const raw = RAW[idx(id)];
      const p = api.proposta(id);
      if (!p) return planos[idx(id)];
      raw.motor.estrutura = p.semanas.map(enxuta);
      raw.motor.baseline = p.baseline;
      raw.motor.eventosAceitos = instantaneoEventos(raw);
      raw.motor.ajustesAceitos = instantaneoAjustes(raw);
      raw.motor.ignorar = null;
      raw.motor.congeladas = Object.fromEntries(Object.entries(raw.motor.congeladas || {}).filter(([t]) => Number(t) <= window.Farol.motor.domingoDe(HOJE)));
      raw.motor.revisoes = raw.motor.revisoes || [];
      raw.motor.revisoes.push({ versao: raw.motor.revisoes.length + 2, em: HOJE, status: 'aceita', gatilhos: p.gatilhos, semanas: p.dif.length });
      return reconstruir(id);
    },

    rejeitarProposta(id) {
      const raw = RAW[idx(id)];
      const p = api.proposta(id);
      if (!p) return planos[idx(id)];
      raw.motor.ignorar = p.assinatura;
      raw.motor.revisoes = raw.motor.revisoes || [];
      raw.motor.revisoes.push({ versao: raw.motor.revisoes.length + 2, em: HOJE, status: 'rejeitada', gatilhos: p.gatilhos, semanas: p.dif.length });
      return reconstruir(id);
    },

    ajustarFase(id, ciclo, indiceFase, delta) {
      const f = RAW[idx(id)].ciclos[ciclo].fases[indiceFase];
      f[1] = Math.min(12, Math.max(1, f[1] + delta));
      return reconstruir(id);
    },

    salvarPauta(id, ciclo, tipoFase, pauta) {
      const raw = RAW[idx(id)];
      if (raw.motor) {
        raw.motor.pautas = raw.motor.pautas || {};
        raw.motor.pautas[ciclo] = raw.motor.pautas[ciclo] || {};
        raw.motor.pautas[ciclo][tipoFase] = copiar(pauta);
        return reconstruir(id);
      }
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
