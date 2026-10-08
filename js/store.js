/* Dados do técnico: ficam no navegador (localStorage) com exportar e importar em arquivo.
   É aqui que um servidor entra no lugar, sem mexer nas telas. */
(function (AC) {
  const CHAVE = 'assistantcoach.v1';
  const VERSAO = 1;

  const vazio = () => ({
    versao: VERSAO,
    atletas: [],
    periodizacoes: [],
    treinos: [],
    exercicios: AC.cat.EXERCICIOS.map((e) => ({ ...e, id: uid() })),
    planosFisicos: [],
  });

  function uid() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  const ATLETA_PADRAO = { sexo: '', acao: '', lado: '', nascimento: '', contato: '', responsavel: '', consentimento: '', obs: '', parceiroId: null, ativo: true };

  /* Completa campos novos e converte a função antiga ("Bloqueadora") em ação e sexo. */
  function normalizar(e) {
    e.atletas = (e.atletas || []).map((a) => {
      const n = { ...ATLETA_PADRAO, ...a };
      if (a.funcao !== undefined) {
        const f = String(a.funcao).toLowerCase();
        if (!n.acao) n.acao = /bloq/.test(f) ? 'bloqueio' : /def/.test(f) ? 'defesa' : '';
        if (!n.sexo && /(ora|a)$/.test(f.trim()) && !/sem fun/.test(f)) n.sexo = 'F';
        else if (!n.sexo && /(or)$/.test(f.trim())) n.sexo = 'M';
        delete n.funcao;
      }
      return n;
    });
    e.periodizacoes = (e.periodizacoes || []).map((p) => ({ equipe: '', categorias: [], diasTreino: [], duracaoPadrao: 90, ...p }));
    return e;
  }

  let estado;
  let semArmazenamento = false;

  function carregar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) {
        const e = JSON.parse(bruto);
        if (e && e.versao === VERSAO) return normalizar(Object.assign(vazio(), e));
      }
    } catch (err) { semArmazenamento = true; }
    return vazio();
  }

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); semArmazenamento = false; }
    catch (err) { semArmazenamento = true; }
  }

  estado = carregar();

  const por = (lista, id) => lista.find((x) => x.id === id) || null;

  function exportar() {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `assistente-treinador-${AC.calc.hojeISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importar(texto) {
    const e = JSON.parse(texto);
    if (!e || e.versao !== VERSAO || !Array.isArray(e.atletas) || !Array.isArray(e.treinos) || !Array.isArray(e.periodizacoes)) {
      throw new Error('Este arquivo não é um backup do assistente.');
    }
    estado = normalizar(Object.assign(vazio(), e));
    salvar();
  }

  function apagarTudo() { estado = vazio(); salvar(); }

  AC.store = {
    uid,
    get e() { return estado; },
    get semArmazenamento() { return semArmazenamento; },
    salvar,
    exportar,
    importar,
    apagarTudo,
    substituir(novo) { estado = normalizar(Object.assign(vazio(), novo)); salvar(); },
    atleta: (id) => por(estado.atletas, id),
    perio: (id) => por(estado.periodizacoes, id),
    treino: (id) => por(estado.treinos, id),
    plano: (id) => por(estado.planosFisicos, id),
    exercicio: (id) => por(estado.exercicios, id),
    /* Atletas ativos; com uma periodização, só os das categorias da equipe dela. */
    ativos: (perio) => {
      const ativos = estado.atletas.filter((a) => a.ativo !== false);
      return perio ? AC.calc.daEquipe(perio, ativos, new Date().getFullYear()) : ativos;
    },
    /* Periodização que contém a data (ou a mais recente que já começou). */
    perioDaData(data) {
      const ps = estado.periodizacoes;
      return ps.find((p) => data >= p.inicio && data <= (p.fim || '9999-12-31')) ||
        [...ps].filter((p) => p.inicio <= data).sort((a, b) => b.inicio.localeCompare(a.inicio))[0] || null;
    },
  };
})((window.AC = window.AC || {}));
