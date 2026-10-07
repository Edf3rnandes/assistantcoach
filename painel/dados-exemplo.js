/* Painel novo: dados de exemplo e a interface que as telas usam.
   As telas só conhecem as funções de `Painel.dados` (hoje, equipes, equipe, atletas, atleta, semana, registrar, plano...).
   Na integração, este arquivo é trocado por um adaptador que lê do motor de periodização, dos registros e do elenco que já existem;
   as telas não mudam. O que o técnico faz aqui (registrar treino, lesão, ficha) fica no navegador, só para a demonstração. */
(function () {
  const P = (window.Painel = window.Painel || {});
  const DIA = 86400000;
  const hoje = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); };
  const segunda = (t) => { const d = new Date(t); return t - ((d.getUTCDay() + 6) % 7) * DIA; };
  const iso = (t) => new Date(t).toISOString().slice(0, 10);

  /* ---------- Cadastro de exemplo ---------- */

  const EQUIPES = [
    { id: 'e1', nome: 'Base da manhã', faixas: ['Sub-15', 'Sub-17'], generos: 'masculino e feminino', cats: ['Sub-15 Masc', 'Sub-15 Fem', 'Sub-17 Masc', 'Sub-17 Fem'],
      fase: { nome: 'Acumulação', cor: '#2f7fa0' }, semana: 6, semanas: 24, alvo: { nome: 'Estadual', dias: 82 }, cargaAlvo: 1840,
      // dias de treino relativos a hoje (para a demonstração sempre mostrar um treino hoje)
      sessoes: [{ off: -2, tipo: 'Técnica', foco: 'Defesa', dur: 90, pse: 6, dia: 'volume' }, { off: 0, tipo: 'Tática', foco: 'Saída de rede', dur: 90, pse: 7, dia: 'pesado' }, { off: 1, tipo: 'Físico', foco: 'Membros inferiores', dur: 60, pse: 7, dia: 'potência' }, { off: 3, tipo: 'Jogo', foco: 'Treino-jogo', dur: 120, pse: 7, dia: 'pesado' }] },
    { id: 'e2', nome: 'Sub-21 da tarde', faixas: ['Sub-21'], generos: 'masculino', cats: ['Sub-21 Masc'],
      fase: { nome: 'Transmutação', cor: '#7e8f3a' }, semana: 14, semanas: 24, alvo: { nome: 'Brasileiro Sub-21', dias: 31 }, cargaAlvo: 2100,
      sessoes: [{ off: 0, tipo: 'Físico', foco: 'Pesado, na areia', dur: 60, pse: 7, dia: 'pesado' }, { off: 2, tipo: 'Técnica', foco: 'Saque e recepção', dur: 90, pse: 6, dia: 'volume' }, { off: 4, tipo: 'Jogo', foco: 'Treino-jogo', dur: 120, pse: 8, dia: 'potência' }] },
  ];
  const A = (id, eq, nome, faixa, genero, nasc, estado, acwr, pse, pres, extra) => ({ id, eq, nome, faixa, genero, nasc, estado, acwr, pse, pres, ...(extra || {}) });
  const ATLETAS = [
    A('a1', 'e1', 'Lucas Ribeiro', 'Sub-15', 'M', '2011-08-04', 'ok', 1.1, 6.5, 100, { altura: '172', mao: 'destro', telefone: '83999990001' }),
    A('a2', 'e1', 'Pedro Alves', 'Sub-17', 'M', '2009-03-12', 'atencao', 1.5, 8.0, 100, { motivo: 'Carga subiu rápido: PSE acima do alvo duas sessões seguidas', altura: '184', mao: 'destro', atestado: iso(hoje() + 18 * DIA) }),
    A('a3', 'e1', 'Alice Torres', 'Sub-15', 'F', '2011-01-19', 'ok', 0.9, 6.0, 100, { altura: '165', mao: 'destro', telefone: '83999990003', emergenciaNome: 'Marta Torres', emergenciaTel: '83999990033', alergias: 'nenhuma', atestado: iso(hoje() + 120 * DIA) }),
    A('a4', 'e1', 'Sofia Barreto', 'Sub-17', 'F', '2010-06-02', 'lesao', null, 5.5, 76, { situacao: { local: 'Tornozelo direito', texto: 'Entorse de grau 1', desde: iso(hoje() - 9 * DIA), retorno: iso(hoje() + 13 * DIA), conduta: 'Fisioterapia diária; sem salto nem corrida na areia' } }),
    A('a5', 'e1', 'Miguel Costa', 'Sub-17', 'M', '2009-11-23', 'ok', 1.2, 6.2, 95, { altura: '179' }),
    A('a6', 'e1', 'Júlia Rocha', 'Sub-15', 'F', '2011-04-30', 'ok', 1.0, 5.8, 100, {}),
    A('a7', 'e2', 'Rafael Souza', 'Sub-21', 'M', '2005-05-10', 'ok', 1.2, 5.5, 100, { altura: '188', mao: 'canhoto', telefone: '83999990007' }),
    A('a8', 'e2', 'Davi Cardoso', 'Sub-21', 'M', '2005-02-02', 'ok', 1.2, 5.5, 95, { altura: '181' }),
    A('a9', 'e2', 'Gabriel Santana', 'Sub-21', 'M', '2005-03-15', 'atencao', 1.4, 6.9, 90, { motivo: 'ACWR acima da faixa segura', altura: '186' }),
    A('a10', 'e2', 'Enzo Barbosa', 'Sub-21', 'M', '2004-12-01', 'ok', 1.1, 5.6, 90, {}),
  ];
  const EVENTOS = {
    e1: [{ prio: 'C', nome: 'Torneio amistoso', data: hoje() + 19 * DIA, status: 'Provisória' }, { prio: 'B', nome: 'Open Municipal', data: hoje() + 40 * DIA, status: 'Confirmada' }, { prio: 'A', nome: 'Estadual', data: hoje() + 82 * DIA, status: 'Confirmada' }],
    e2: [{ prio: 'B', nome: 'Etapa regional', data: hoje() + 12 * DIA, status: 'Confirmada' }, { prio: 'A', nome: 'Brasileiro Sub-21', data: hoje() + 31 * DIA, status: 'Confirmada' }],
  };
  const FASES = {
    e1: [{ nome: 'Acumulação', semanas: 8, cor: '#2f7fa0' }, { nome: 'Transmutação', semanas: 5, cor: '#7e8f3a' }, { nome: 'Realização', semanas: 3, cor: '#e08a1e' }, { nome: 'Polimento', semanas: 2, cor: '#d94f3d' }, { nome: 'Transição', semanas: 6, cor: '#6b8190' }],
    e2: [{ nome: 'Acumulação', semanas: 8, cor: '#2f7fa0' }, { nome: 'Transmutação', semanas: 6, cor: '#7e8f3a' }, { nome: 'Realização', semanas: 3, cor: '#e08a1e' }, { nome: 'Polimento', semanas: 2, cor: '#d94f3d' }, { nome: 'Transição', semanas: 5, cor: '#6b8190' }],
  };

  // O que cada fase pede: objetivo, fundamentos, como a carga se comporta e a onda semanal (100% = semana de referência).
  const FASE_INFO = {
    'Acumulação': { objetivo: 'Construir a base técnica e física com volume crescente: duas semanas de subida e uma de descarga.', regime: 'Volume sobe, intensidade moderada', fundamentos: ['Defesa', 'Saque', 'Bloqueio', 'Saída de rede'], onda: [100, 110, 115, 70] },
    'Transmutação': { objetivo: 'Transformar a base em potência e velocidade: a intensidade sobe e o volume cai.', regime: 'Intensidade sobe, volume cai', fundamentos: ['Ataque', 'Transição', 'Leitura de jogo', 'Cobertura'], onda: [90, 100, 108, 65] },
    'Realização': { objetivo: 'Treinar no ritmo da competição, com cargas curtas, específicas e parecidas com o jogo.', regime: 'Específico, sessões curtas', fundamentos: ['Sistema de jogo', 'Saque agressivo', 'Decisão sob pressão'], onda: [85, 95, 70] },
    'Polimento': { objetivo: 'Chegar descansado ao alvo: o volume cai bastante e a intensidade se mantém.', regime: 'Volume cai muito, intensidade fica', fundamentos: ['Saque', 'Ajustes finos', 'Rotina de jogo'], onda: [70, 55] },
    'Transição': { objetivo: 'Recuperar corpo e cabeça com atividade leve e livre, antes de recomeçar o ciclo.', regime: 'Atividade leve e livre', fundamentos: ['Prazer de jogar', 'Mobilidade', 'Outros esportes'], onda: [50, 40, 50, 40] },
  };
  // Itens de cada treino da semana (só peso do corpo, disco, cone e escada de agilidade).
  const ITENS = {
    'Técnica|Defesa': ['Defesa de costas e de lado', 'Posição de base com disco no chão', 'Defesa no ataque cruzado'],
    'Tática|Saída de rede': ['Saída de rede em duplas', 'Leitura do bloqueio, 6×8 bolas', 'Jogo condicionado de 3 toques'],
    'Físico|Membros inferiores': ['Agachamento com peso do corpo, 4×12', 'Escada de agilidade, 6 passagens', 'Saltos sobre cone, 5×6'],
    'Jogo|Treino-jogo': ['Aquecimento com escada, 10 min', 'Jogo a 21 pontos, 3 sets', 'Volta à calma e alongamento'],
    'Físico|Pesado, na areia': ['Avanço com salto, 4×8', 'Arrasto de disco, 6×15 m', 'Prancha com toque no cone, 3×30 s'],
    'Técnica|Saque e recepção': ['Saque flutuante, 40 bolas', 'Recepção em dupla com alvo no cone', 'Saque com meta de pontos'],
  };

  /* ---------- O que o técnico fez (fica no navegador) ---------- */

  const CH = 'ft.painel.exemplo.v1';
  let feito = { registros: {}, lesoes: {}, fichas: {} };
  try { const g = JSON.parse(localStorage.getItem(CH) || 'null'); if (g) feito = { ...feito, ...g }; } catch (e) { /* sem armazenamento */ }
  const gravar = () => { try { localStorage.setItem(CH, JSON.stringify(feito)); } catch (e) { /* ignora */ } };

  const idade = (nasc) => { if (!nasc) return null; const [y, m, d] = nasc.split('-').map(Number); const r = new Date(hoje()); let i = r.getUTCFullYear() - y; if (r.getUTCMonth() + 1 < m || (r.getUTCMonth() + 1 === m && r.getUTCDate() < d)) i--; return i; };
  const FICHA_CAMPOS = [['nasc', 'Nascimento'], ['altura', 'Altura'], ['mao', 'Mão dominante'], ['telefone', 'Telefone'], ['emergenciaNome', 'Contato de emergência'], ['alergias', 'Alergias'], ['atestado', 'Atestado médico']];

  function atletaCompleto(a0) {
    const a = { ...a0, ...(feito.fichas[a0.id] || {}) };
    const les = feito.lesoes[a0.id];
    if (les) { a.estado = 'lesao'; a.situacao = les; }
    if (a.liberado && !les) { a.estado = 'ok'; a.situacao = null; }
    a.idade = idade(a.nasc);
    const falta = FICHA_CAMPOS.filter(([k]) => !a[k]).map(([, n]) => n);
    a.fichaPct = Math.round((100 * (FICHA_CAMPOS.length - falta.length)) / FICHA_CAMPOS.length);
    a.fichaFalta = falta;
    return a;
  }

  /* ---------- Interface das telas ---------- */

  const sessoesDe = (eq) => {
    const seg = segunda(hoje());
    return eq.sessoes.map((s, i) => {
      const t = hoje() + s.off * DIA;
      const dow = Math.round((((t - seg) % (7 * DIA)) + 7 * DIA) % (7 * DIA) / DIA);
      const data = seg + dow * DIA; // dia da semana corrente que cai o treino
      const id = `${eq.id}-s${i}`;
      const reg = feito.registros[`${iso(data)}-${id}`] || null;
      const passado = data < hoje();
      return { id, equipe: eq.id, tipo: s.tipo, foco: s.foco, dur: s.dur, pse: s.pse, dia: s.dia, itens: ITENS[`${s.tipo}|${s.foco}`] || [], data, dow, reg, status: reg ? 'registrado' : data === hoje() ? 'hoje' : passado ? 'aguardando' : 'futuro' };
    }).sort((a, b) => a.data - b.data);
  };

  P.dados = {
    iso, hoje, idade,
    usuario: () => ({ nome: 'Carlos' }),
    equipes: () => EQUIPES.map((e) => ({ ...e, nAtletas: ATLETAS.filter((a) => a.eq === e.id).length })),
    equipe: (id) => { const e = EQUIPES.find((x) => x.id === id); return e ? { ...e, nAtletas: ATLETAS.filter((a) => a.eq === id).length } : null; },
    atletas: (eqId) => ATLETAS.filter((a) => a.eq === eqId).map(atletaCompleto),
    atleta: (id) => { const a = ATLETAS.find((x) => x.id === id); return a ? atletaCompleto(a) : null; },
    semana: (eqId) => {
      const eq = EQUIPES.find((e) => e.id === eqId);
      const ses = sessoesDe(eq);
      const feitas = ses.filter((s) => s.reg);
      const cargaFeita = feitas.reduce((t, s) => t + Math.round(s.reg.pse * s.dur * s.reg.presentes), 0);
      return { inicio: segunda(hoje()), sessoes: ses, cargaAlvo: eq.cargaAlvo, cargaFeita };
    },
    sessoesHoje: () => EQUIPES.flatMap((e) => sessoesDe(e).filter((s) => s.data === hoje()).map((s) => ({ ...s, equipeNome: e.nome }))),
    proximaSessao: () => {
      const todas = EQUIPES.flatMap((e) => sessoesDe(e).filter((s) => s.data > hoje()).map((s) => ({ ...s, equipeNome: e.nome }))).sort((a, b) => a.data - b.data);
      return todas[0] || null;
    },
    atencao: () => ATLETAS.map(atletaCompleto).filter((a) => a.estado !== 'ok').sort((a, b) => (a.estado === 'lesao' ? -1 : 0) - (b.estado === 'lesao' ? -1 : 0)),
    sessao: (id) => { const eq = EQUIPES.find((e) => id.startsWith(`${e.id}-`)); return eq ? sessoesDe(eq).find((s) => s.id === id) || null : null; },
    registrar: ({ sessaoId, presentes, pse, porAtleta }) => {
      const s = P.dados.sessao(sessaoId);
      feito.registros[`${iso(s.data)}-${sessaoId}`] = { presentes: presentes.length, ids: presentes, pse, porAtleta: porAtleta || {} };
      gravar();
    },
    registrarLesao: (atletaId, local) => { feito.lesoes[atletaId] = { local, texto: 'Registrado agora', desde: iso(hoje()), retorno: '', conduta: 'Avalie com o fisioterapeuta antes do próximo treino' }; gravar(); },
    liberarRetorno: (atletaId) => { delete feito.lesoes[atletaId]; feito.fichas[atletaId] = { ...(feito.fichas[atletaId] || {}), liberado: true }; gravar(); },
    salvarFicha: (atletaId, campos) => { feito.fichas[atletaId] = { ...(feito.fichas[atletaId] || {}), ...campos }; gravar(); },
    periodo: (eqId) => {
      const eq = EQUIPES.find((e) => e.id === eqId);
      const fases = FASES[eqId];
      const total = fases.reduce((t, f) => t + f.semanas, 0);
      const inicio = segunda(hoje()) - (eq.semana - 1) * 7 * DIA;
      let ini = 0;
      const blocos = fases.map((f, idx) => {
        const info = FASE_INFO[f.nome];
        const b = { idx, nome: f.nome, cor: f.cor, semanas: f.semanas, ini, inicio: inicio + ini * 7 * DIA, fim: inicio + (ini + f.semanas) * 7 * DIA - DIA, objetivo: info.objetivo, regime: info.regime, fundamentos: info.fundamentos };
        ini += f.semanas;
        b.estado = eq.semana - 1 >= b.ini + b.semanas ? 'concluido' : eq.semana - 1 >= b.ini ? 'andamento' : 'planejado';
        return b;
      });
      const fatorDe = (b, k) => FASE_INFO[b.nome].onda[k % FASE_INFO[b.nome].onda.length];
      const atualB = blocos.find((b) => b.estado === 'andamento');
      const ref = eq.cargaAlvo / (fatorDe(atualB, eq.semana - 1 - atualB.ini) / 100);
      const rit = [0.97, 1.03, 0.99, 1.05, 0.94, 1.01, 0.98];
      const semanas = [];
      blocos.forEach((b) => { for (let k = 0; k < b.semanas; k++) {
        const n = b.ini + k + 1, fator = fatorDe(b, k), planejado = Math.round((ref * fator) / 100 / 10) * 10;
        semanas.push({ n, bloco: b.idx, k, fator, descarga: fator <= 70, planejado, inicio: inicio + (n - 1) * 7 * DIA, atual: n === eq.semana, realizado: n < eq.semana ? Math.round((planejado * rit[n % rit.length]) / 10) * 10 : null });
      } });
      const eventos = EVENTOS[eqId].map((e) => ({ ...e, dias: Math.round((e.data - hoje()) / DIA), semana: Math.floor((e.data - inicio) / (7 * DIA)) + 1 })).sort((a, b) => a.data - b.data);
      return { total, semanaAtual: eq.semana, blocoAtual: atualB.idx, blocos, semanas, eventos, ref: Math.round(ref) };
    },
    plano: (eqId) => ({ fases: FASES[eqId], eventos: EVENTOS[eqId].map((e) => ({ ...e, dias: Math.round((e.data - hoje()) / DIA) })).sort((a, b) => a.data - b.data) }),
    zerarExemplo: () => { feito = { registros: {}, lesoes: {}, fichas: {} }; gravar(); },
  };
})();
