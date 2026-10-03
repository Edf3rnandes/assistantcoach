/* Dados de exemplo (mock) usados enquanto o backend (Supabase, schema `ft`) não está ligado.
   Quando a integração entrar, este arquivo é substituído por chamadas ao banco. As telas só
   conhecem a forma de dados abaixo e as funções de edição no fim do arquivo.

   Hierarquia:  plano (temporada) -> ciclos -> mesociclos (fases) -> microciclos (semanas) -> sessões.
   A carga de uma semana é sempre a soma das suas sessões (duração × PSE alvo), em UA. */
(function () {
  const DIA = 864e5;

  const ms = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const dd = (t) => {
    const x = new Date(t);
    return String(x.getUTCDate()).padStart(2, '0') + '/' + String(x.getUTCMonth() + 1).padStart(2, '0');
  };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mes = (t) => MESES[new Date(t).getUTCMonth()];
  const ano = (t) => new Date(t).getUTCFullYear();
  const num = (v) => Math.round(v).toLocaleString('pt-BR');
  const diaSemana = (t) => (new Date(t).getUTCDay() + 6) % 7; // 0 = segunda

  // "Hoje" fixo para a demonstração ficar estável.
  const HOJE = ms('2026-10-03');

  // Competições do calendário (`competicoes`). Nomes de exemplo.
  const COMPETICOES = {
    c1: { id: 'c1', nome: 'Paraibano de Areia, etapa 1', data: ms('2026-10-17') },
    c2: { id: 'c2', nome: 'Circuito Nordestino Sub-18, final', data: ms('2026-11-28') },
    c3: { id: 'c3', nome: 'Open João Pessoa Adulto', data: ms('2026-11-14') },
    c4: { id: 'c4', nome: 'Seletiva Brasileiro Sub-19', data: ms('2026-12-05') },
    c5: { id: 'c5', nome: 'Campeonato Brasileiro Sub-18', data: ms('2027-04-10') },
    c6: { id: 'c6', nome: 'Paraibano de Areia, etapa 2', data: ms('2027-02-13') },
    c7: { id: 'c7', nome: 'Circuito Nordestino Sub-18, abertura', data: ms('2027-07-17') },
    c8: { id: 'c8', nome: 'Open Nordeste Adulto', data: ms('2027-04-03') },
    c9: { id: 'c9', nome: 'Brasileiro Sub-19, final', data: ms('2027-04-10') },
  };

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

  /* ---------- Planos de exemplo ---------- */

  const RAW = [
    {
      id: 'sub18', nome: 'Sub-18 Masculino', tipo: 'turma', detalhe: 'Turma · 14 atletas',
      temporada: 'Temporada 2026/27', inicio: '2026-08-03', pico: 3200,
      ciclos: [
        { nome: 'Ciclo 1', alvo: 'c2', competicoes: ['c1', 'c2'], fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 3], ['transicao', 3]] },
        { nome: 'Ciclo 2', alvo: 'c5', competicoes: ['c6', 'c5'], fases: [['base', 5], ['especifico', 6], ['polimento', 2], ['competicao', 3], ['transicao', 2]] },
        { nome: 'Ciclo 3', alvo: 'c7', competicoes: ['c7'], fases: [['base', 4], ['especifico', 5], ['polimento', 2], ['competicao', 2]] },
      ],
    },
    {
      id: 'adulto', nome: 'Adulto Misto, areia', tipo: 'turma', detalhe: 'Turma · 10 atletas',
      temporada: 'Temporada 2026/27', inicio: '2026-08-10', pico: 3600,
      ciclos: [
        { nome: 'Ciclo 1', alvo: 'c3', competicoes: ['c1', 'c3'], fases: [['base', 5], ['especifico', 5], ['polimento', 2], ['competicao', 2], ['transicao', 3]] },
        { nome: 'Ciclo 2', alvo: 'c8', competicoes: ['c8'], fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 3], ['transicao', 3]] },
      ],
    },
    {
      id: 'mariana', nome: 'Mariana Costa', tipo: 'atleta', detalhe: 'Individual · Sub-19',
      temporada: 'Temporada 2026/27', inicio: '2026-08-24', pico: 2700,
      ciclos: [
        { nome: 'Ciclo 1', alvo: 'c4', competicoes: ['c1', 'c4'], fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 2], ['transicao', 2]] },
        { nome: 'Ciclo 2', alvo: 'c9', competicoes: ['c9'], fases: [['base', 5], ['especifico', 6], ['polimento', 2], ['competicao', 2], ['transicao', 2]] },
      ],
    },
  ].map((p) => ({ ...p, sessoes: {}, microTipos: {} }));

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

  function modelo(micro, tipoFase, compsSemana) {
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
        if (!compsSemana.length) {
          return [
            S(0, 'tarde', 'tecnica', 75, 5, 'Fundamentos em volume baixo'),
            S(1, 'tarde', 'tatica', 75, 6, 'Plano de jogo'),
            S(2, 'manha', 'recuperacao', 45, 3, 'Regenerativo'),
            S(3, 'tarde', 'tatica', 60, 5, 'Rotinas de saque e recepção'),
          ];
        }
        const primeiro = Math.min(...compsSemana.map((c) => diaSemana(c.data)));
        const base = [
          S(0, 'tarde', 'tecnica', 75, 5, 'Ajustes finais de fundamentos'),
          S(1, 'tarde', 'tatica', 75, 6, 'Plano de jogo e adversários'),
          S(2, 'manha', 'recuperacao', 45, 3, 'Regenerativo'),
          S(3, 'tarde', 'tatica', 60, 5, 'Ativação e rotinas de saque'),
        ].filter((s) => s.dia < primeiro);
        const jogos = [];
        compsSemana.forEach((c) => {
          const d = diaSemana(c.data);
          jogos.push(S(d, 'manha', 'competicao', 180, 8, c.nome));
          if (d === 5) jogos.push(S(6, 'manha', 'competicao', 180, 8, c.nome));
        });
        return base.concat(jogos);
      }
      default:
        return modeloOrdinario(tipoFase, micro === 'choque');
    }
  }

  const arred5 = (v) => Math.max(20, Math.round(v / 5) * 5);

  // Cria as sessões da semana e escala as durações para chegar perto da carga alvo da fase.
  function gerarSessoes(micro, tipoFase, compsSemana, alvo, chave) {
    const lista = modelo(micro, tipoFase, compsSemana);
    const fixas = lista.filter((s) => s.tipo === 'competicao');
    const moveis = lista.filter((s) => s.tipo !== 'competicao');
    const cargaFixa = fixas.reduce((a, s) => a + s.dur * s.pse, 0);
    const cargaMovel = moveis.reduce((a, s) => a + s.dur * s.pse, 0);
    const restante = alvo - cargaFixa;
    if (restante > 200 && cargaMovel > 0) {
      const k = Math.min(1.5, Math.max(0.6, restante / cargaMovel));
      moveis.forEach((s) => { s.dur = arred5(s.dur * k); });
    }
    return lista.map((s, i) => ({ ...s, id: `${chave}:${i}` }));
  }

  const ruido = (i, s) => 0.9 + 0.2 * (0.5 + 0.5 * Math.sin(i * 12.9898 + s * 78.233));
  const carga = (sessoes) => sessoes.reduce((a, s) => a + s.dur * s.pse, 0);

  /* ---------- Montagem do plano ---------- */

  function montar(raw, seed) {
    const inicio = ms(raw.inicio);
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
        const meso = {
          id: `${ci}-${tipo}`, tipo, nome: fase.nome, cor: fase.cor, fase, ciclo: ci, indice: fi,
          semanaIni: n, semanas: qtd,
          inicio: inicio + n * 7 * DIA,
          fim: inicio + (n + qtd) * 7 * DIA - DIA,
        };
        for (let k = 0; k < qtd; k++, n++) {
          const ini = inicio + n * 7 * DIA;
          const t = qtd === 1 ? 0 : k / (qtd - 1);
          const alvoBase = raw.pico * (fase.f[0] + (fase.f[1] - fase.f[0]) * t);
          const compsSemana = todas.filter((q) => q.data >= ini && q.data < ini + 7 * DIA);
          const compsProxima = todas.filter((q) => q.data >= ini + 7 * DIA && q.data < ini + 14 * DIA);

          let auto = 'ordinario';
          if (tipo === 'transicao') auto = 'recuperacao';
          else if (tipo === 'competicao') auto = 'competitivo';
          else if (tipo === 'polimento') auto = 'preCompetitivo';
          else if (compsSemana.length) auto = 'competitivo';
          else if (compsProxima.length) auto = 'preCompetitivo';
          else if (qtd >= 5 && k === 3 && (tipo === 'base' || tipo === 'especifico')) auto = 'recuperacao';
          else if (tipo === 'especifico' && (k === 1 || k === 2)) auto = 'choque';

          const microTipo = raw.microTipos[ini] || auto;
          const editada = !!raw.sessoes[ini];
          const alvoCarga = alvoBase * (microTipo === 'recuperacao' && (tipo === 'base' || tipo === 'especifico') ? 0.75 : 1);
          const sessoes = editada
            ? raw.sessoes[ini].map((s) => ({ ...s }))
            : gerarSessoes(microTipo, tipo, compsSemana, alvoCarga, ini);
          const planejado = carga(sessoes);
          const passada = ini + 6 * DIA < HOJE;

          semanas.push({
            n: n + 1, idx: n, inicio: ini, ciclo: ci, meso: meso.id, mesoTipo: tipo,
            microTipo, microAuto: auto, editada, sessoes, planejado,
            realizado: passada ? Math.round((planejado * ruido(n, seed)) / 10) * 10 : null,
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
        comps: c.competicoes.map((id) => todas.find((q) => q.id === id)),
      });
    });

    mesos.forEach((m) => {
      const sem = semanas.slice(m.semanaIni, m.semanaIni + m.semanas);
      m.mediaPlanejada = sem.reduce((a, s) => a + s.planejado, 0) / sem.length;
      m.picoPlanejado = Math.max(...sem.map((s) => s.planejado));
      m.competicoes = todas.filter((c) => c.data >= m.inicio && c.data < m.fim + DIA);
    });

    ciclos.forEach((c) => {
      const sem = semanas.slice(c.semanaIni, c.semanaIni + c.semanas);
      c.mediaPlanejada = sem.reduce((a, s) => a + s.planejado, 0) / sem.length;
      c.estado = HOJE > c.fim + DIA - 1 ? 'concluido' : HOJE >= c.inicio ? 'andamento' : 'planejado';
    });

    const semanaAtual = semanas.findIndex((s) => HOJE >= s.inicio && HOJE < s.inicio + 7 * DIA);
    return {
      id: raw.id, nome: raw.nome, tipo: raw.tipo, detalhe: raw.detalhe, temporada: raw.temporada, pico: raw.pico,
      inicioMs: inicio, fimMs: inicio + n * 7 * DIA - DIA,
      ciclos, mesos, semanas, comps: todas,
      semanaAtual,
      cicloAtual: semanaAtual >= 0 ? semanas[semanaAtual].ciclo : -1,
      mesoAtual: semanaAtual >= 0 ? semanas[semanaAtual].meso : null,
    };
  }

  const planos = RAW.map((r, i) => montar(r, i + 1));
  const idx = (id) => RAW.findIndex((r) => r.id === id);
  const reconstruir = (id) => { const i = idx(id); planos[i] = montar(RAW[i], i + 1); return planos[i]; };

  /* ---------- Edição ---------- */

  let contador = 0;

  // Semana editada guarda a lista completa de sessões; as demais continuam geradas pelo modelo.
  function sessoesParaEditar(id, semana) {
    const raw = RAW[idx(id)];
    return raw.sessoes[semana.inicio] ? raw.sessoes[semana.inicio] : semana.sessoes.map((s) => ({ ...s }));
  }

  function ordenar(lista) {
    const ordemTurno = { manha: 0, tarde: 1, noite: 2 };
    lista.sort((a, b) => a.dia - b.dia || ordemTurno[a.turno] - ordemTurno[b.turno]);
    return lista;
  }

  const api = {
    planos,
    plano: (id) => planos[idx(id)],

    // Soma ou subtrai semanas de uma fase de um ciclo.
    ajustarFase(id, ciclo, indiceFase, delta) {
      const f = RAW[idx(id)].ciclos[ciclo].fases[indiceFase];
      const nova = Math.min(12, Math.max(1, f[1] + delta));
      if (nova === f[1]) return reconstruir(id);
      f[1] = nova;
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
      RAW[idx(id)].sessoes[semana.inicio] = lista;
      return reconstruir(id);
    },

    definirMicroTipo(id, semana, tipo) {
      const raw = RAW[idx(id)];
      if (!tipo || tipo === semana.microAuto) delete raw.microTipos[semana.inicio];
      else raw.microTipos[semana.inicio] = tipo;
      // Mudar o tipo refaz a semana pelo modelo, a menos que o técnico já a tenha editado.
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
  };

  window.Farol = window.Farol || {};
  window.Farol.dados = Object.assign({ HOJE, DIA, FASES, COMPETICOES, TIPOS_SESSAO, TIPOS_MICRO, TURNOS, DIAS }, api);
  window.Farol.util = { DIA, ms, dd, mes, ano, num, diaSemana };
})();
