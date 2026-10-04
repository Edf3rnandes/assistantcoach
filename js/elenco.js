/* Elenco de exemplo: professores, atletas, turmas e o catálogo de fundamentos do vôlei de praia.
   Trocar este arquivo por consultas ao banco (`atletas`, `turmas`) quando o Supabase entrar. */
(function () {
  const PROFS = {
    p1: { id: 'p1', nome: 'Renato Gomes', funcao: 'Técnico principal' },
    p2: { id: 'p2', nome: 'Carla Menezes', funcao: 'Auxiliar técnica' },
    p3: { id: 'p3', nome: 'Tiago Lacerda', funcao: 'Preparador físico' },
    p4: { id: 'p4', nome: 'Helena Prado', funcao: 'Fisioterapeuta' },
  };

  const nomes = (faixa, genero, turma, lista) => lista.map((n, i) => ({ id: `${turma}${i + 1}`, nome: n, faixa, genero, turma }));

  const ATLETAS_LISTA = [
    ...nomes('Sub-18', 'M', 'a', ['Lucas Ribeiro', 'Pedro Alves', 'Gabriel Santana', 'Mateus Oliveira', 'João Vitor Lima', 'Rafael Souza', 'Davi Cardoso', 'Enzo Barbosa', 'Arthur Nogueira', 'Caio Menezes', 'Bruno Teixeira', 'Felipe Araújo', 'Thiago Moreira', 'Samuel Duarte']),
    ...nomes('Adulto', 'M', 'b', ['André Pacheco', 'Rodrigo Farias', 'Marcelo Tavares', 'Diego Albuquerque', 'Victor Pires']),
    ...nomes('Adulto', 'F', 'c', ['Camila Rocha', 'Juliana Freitas', 'Beatriz Cunha', 'Larissa Bezerra', 'Renata Monteiro']),
    ...nomes('Sub-16', 'F', 'd', ['Alice Torres', 'Sofia Barreto', 'Manuela Lopes', 'Clara Vasconcelos', 'Luiza Prado', 'Helena Dantas', 'Maria Eduarda Silva', 'Yasmin Ferraz']),
    { id: 'e1', nome: 'Mariana Costa', faixa: 'Sub-19', genero: 'F', turma: 'sub19f' },
    { id: 'e2', nome: 'Isabela Torres', faixa: 'Sub-19', genero: 'F', turma: 'sub19f' },
  ];
  // Perfis de exemplo para o painel de atenção: um atleta sobrecarregado e outro ausente.
  ATLETAS_LISTA.find((a) => a.id === 'a4').perfil = 'alerta';
  ATLETAS_LISTA.find((a) => a.id === 'a9').perfil = 'ausente';
  ATLETAS_LISTA.find((a) => a.id === 'c2').perfil = 'alerta';

  const ATLETAS = {};
  ATLETAS_LISTA.forEach((a) => { ATLETAS[a.id] = a; });
  const ids = (turma) => ATLETAS_LISTA.filter((a) => a.id.startsWith(turma)).map((a) => a.id);

  const TURMAS = {
    sub18: { id: 'sub18', nome: 'Sub-18 Masculino', token: 'sub18-7kq2', faixa: 'Sub-18', categorias: ['Sub-18 Masc'], atletas: ids('a'), professores: ['p1', 'p2', 'p3'] },
    adulto: { id: 'adulto', nome: 'Adulto Misto, areia', token: 'adulto-m4x9', faixa: 'Adulto', categorias: ['Adulto Masc', 'Adulto Fem'], atletas: [...ids('b'), ...ids('c')], professores: ['p1', 'p3'] },
    sub19f: { id: 'sub19f', nome: 'Sub-19 Feminino', token: 'sub19f-p8d1', faixa: 'Sub-19', categorias: ['Sub-19 Fem'], atletas: ['e1', 'e2'], professores: ['p2', 'p3'] },
    sub16f: { id: 'sub16f', nome: 'Sub-16 Feminino', token: 'sub16f-z3c6', faixa: 'Sub-16', categorias: ['Sub-16 Fem'], atletas: ids('d'), professores: ['p2', 'p3'] },
  };

  // Catálogo de fundamentos. O vocabulário vem do perfil do esporte (hoje, vôlei de praia).
  const GRUPOS_FUNDAMENTO = {
    tecnico: 'Técnicos',
    tatico: 'Táticos',
    dupla: 'Dupla',
    mental: 'Mentais',
  };
  const FUNDAMENTOS_LISTA = [
    ['saque', 'Saque (float e viagem)', 'tecnico'],
    ['recepcao', 'Recepção', 'tecnico'],
    ['levantamento', 'Levantamento', 'tecnico'],
    ['ataque', 'Ataque (diagonal, paralela, shot)', 'tecnico'],
    ['bloqueio', 'Bloqueio', 'tecnico'],
    ['defesa', 'Defesa', 'tecnico'],
    ['sideout', 'Side-out (sistema de ataque)', 'tatico'],
    ['break', 'Break point (saque, bloqueio e defesa)', 'tatico'],
    ['leitura', 'Leitura de jogo', 'tatico'],
    ['transicao', 'Transição e cobertura', 'tatico'],
    ['decisao', 'Tomada de decisão', 'tatico'],
    ['comunicacao', 'Comunicação e sinais', 'dupla'],
    ['entrosamento', 'Entrosamento e papéis da dupla', 'dupla'],
    ['pressao', 'Gestão de pressão', 'mental'],
    ['rotinas', 'Rotinas entre pontos', 'mental'],
  ];
  const FUNDAMENTOS = {};
  FUNDAMENTOS_LISTA.forEach(([id, nome, grupo]) => { FUNDAMENTOS[id] = { id, nome, grupo }; });

  const PRIORIDADES = {
    alta: { nome: 'Prioridade alta' },
    media: { nome: 'Prioridade média' },
    manutencao: { nome: 'Manutenção' },
  };

  // Ponto de partida de cada fase, usado quando o técnico não definiu a pauta.
  const f = (id, prio, ideia) => ({ id, prio, ideia: ideia || '' });
  const PAUTA_PADRAO = {
    base: {
      fundamentos: [f('saque', 'alta', 'Consistência no float antes de arriscar a viagem'), f('recepcao', 'alta'), f('levantamento', 'media'), f('defesa', 'media')],
      ideias: ['Construir repertório técnico comum a todas as duplas', 'Corrigir gestos individuais com vídeo'],
    },
    especifico: {
      fundamentos: [f('saque', 'alta', 'Saque com intenção: zona e tipo definidos antes'), f('ataque', 'alta'), f('bloqueio', 'alta'), f('sideout', 'alta'), f('leitura', 'media')],
      ideias: ['Treinar sempre em situação de jogo, com placar', 'Fixar funções e lados de cada dupla'],
    },
    polimento: {
      fundamentos: [f('sideout', 'alta'), f('break', 'alta'), f('comunicacao', 'media'), f('pressao', 'media')],
      ideias: ['Menos volume, mais qualidade em cada bola', 'Ensaiar a rotina de aquecimento da competição'],
    },
    competicao: {
      fundamentos: [f('rotinas', 'alta'), f('pressao', 'alta'), f('comunicacao', 'alta')],
      ideias: ['Plano de jogo curto, de no máximo três pontos', 'Recuperação entre jogos como prioridade'],
    },
    transicao: {
      fundamentos: [f('entrosamento', 'manutencao'), f('levantamento', 'manutencao'), f('defesa', 'manutencao')],
      ideias: ['Balanço da temporada com cada dupla', 'Atividades livres e outros esportes de areia'],
    },
  };

  // Situação de saúde (de exemplo). Em produção vem do cadastro do atleta (`atletas_situacao`) e do relato de dor.
  // tipo: lesao (fora dos treinos), retorno (treino adaptado) ou duvida (relato a avaliar).
  const dia = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const SITUACAO = {
    a9: { tipo: 'lesao', local: 'Tornozelo direito', texto: 'Entorse de grau 1', desde: dia('2026-09-24'), retorno: dia('2026-10-17'), conduta: 'Fisioterapia diária, sem salto nem corrida na areia' },
    d3: { tipo: 'lesao', local: 'Dedo da mão', texto: 'Fissura no dedo médio', desde: dia('2026-09-28'), retorno: dia('2026-10-26'), conduta: 'Imobilização, só treino físico de membros inferiores' },
    c2: { tipo: 'retorno', local: 'Ombro direito', texto: 'Dor ao atacar', desde: dia('2026-09-14'), retorno: dia('2026-10-08'), conduta: 'Treino adaptado: sem ataque forte nem saque viagem' },
    b4: { tipo: 'duvida', local: 'Lombar', texto: 'Dor relatada no último treino', desde: dia('2026-10-01'), retorno: null, conduta: 'Avaliar com o fisioterapeuta antes do próximo treino' },
  };
  const situacaoDe = (id) => SITUACAO[id] || null;

  const turmaPorToken = (t) => Object.values(TURMAS).find((x) => x.token === t) || null;
  // Novo link: o anterior deixa de valer. Em produção o token fica no banco (`tokens_atleta`).
  const novoToken = (turmaId) => {
    const t = TURMAS[turmaId];
    t.token = `${turmaId}-${Math.random().toString(36).slice(2, 6)}`;
    return t.token;
  };

  /* ---------- Conta própria: elenco do técnico ---------- */

  // Numa conta cadastrada, os atletas e as turmas de exemplo saem de cena e entram os que o técnico cadastrou.
  // Os objetos são esvaziados no lugar (e não trocados), porque as outras telas guardam referência a eles.
  const CONTA = window.Farol.conta;
  const CH_ELENCO = CONTA.chave('elenco');
  let seq = { t: 0, u: 0 };
  if (CONTA.guardaDados()) {
    ATLETAS_LISTA.length = 0;
    [ATLETAS, TURMAS, SITUACAO, PROFS].forEach((o) => Object.keys(o).forEach((k) => { delete o[k]; }));
    PROFS.p1 = { id: 'p1', nome: CONTA.usuario().nome, funcao: 'Técnico principal' };
    try {
      const g = JSON.parse(localStorage.getItem(CH_ELENCO) || 'null');
      if (g) {
        (g.atletas || []).forEach((a) => { ATLETAS_LISTA.push(a); ATLETAS[a.id] = a; });
        (g.turmas || []).forEach((t) => { TURMAS[t.id] = t; });
        seq = g.seq || seq;
      }
    } catch (e) { /* começa vazio */ }
  }
  const gravarElenco = () => {
    if (!CONTA.guardaDados()) return;
    try { localStorage.setItem(CH_ELENCO, JSON.stringify({ turmas: Object.values(TURMAS), atletas: ATLETAS_LISTA, seq })); } catch (e) { /* ignora */ }
  };

  const FAIXAS = ['Sub-14', 'Sub-16', 'Sub-18', 'Sub-19', 'Adulto', 'Master'];
  const GENEROS = { M: 'Masculino', F: 'Feminino', X: 'Misto' };
  const sigla = (g) => (g === 'M' ? ['Masc'] : g === 'F' ? ['Fem'] : ['Masc', 'Fem']);
  const limpa = (t) => String(t || '').replace(/\s+/g, ' ').trim();

  const cadastro = {
    FAIXAS, GENEROS,
    // Cria uma equipe. O gênero da equipe (M, F ou X para mista) define as categorias de competição.
    criarTurma({ nome, faixa, genero }) {
      nome = limpa(nome);
      if (nome.length < 2) return { erro: 'Dê um nome à equipe.', campo: 'nome' };
      if (Object.values(TURMAS).some((t) => t.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Já existe uma equipe com este nome.', campo: 'nome' };
      const id = `t${++seq.t}`;
      TURMAS[id] = { id, nome, token: `${id}-${Math.random().toString(36).slice(2, 6)}`, faixa, genero, categorias: sigla(genero).map((g) => `${faixa} ${g}`), atletas: [], professores: ['p1'] };
      gravarElenco();
      return { turma: TURMAS[id] };
    },
    editarTurma(id, { nome, faixa, genero }) {
      const t = TURMAS[id];
      nome = limpa(nome);
      if (nome.length < 2) return { erro: 'Dê um nome à equipe.', campo: 'nome' };
      if (Object.values(TURMAS).some((o) => o.id !== id && o.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Já existe uma equipe com este nome.', campo: 'nome' };
      Object.assign(t, { nome, faixa, genero, categorias: sigla(genero).map((g) => `${faixa} ${g}`) });
      t.atletas.forEach((a) => { ATLETAS[a].faixa = faixa; });
      gravarElenco();
      return { turma: t };
    },
    excluirTurma(id) {
      const t = TURMAS[id];
      if (!t) return;
      t.atletas.slice().forEach((a) => cadastro.removerAtleta(a));
      delete TURMAS[id];
      gravarElenco();
    },
    adicionarAtleta(turmaId, { nome, genero }) {
      nome = limpa(nome);
      const t = TURMAS[turmaId];
      if (nome.length < 2) return { erro: 'Informe o nome do atleta.' };
      if (t.atletas.some((a) => ATLETAS[a].nome.toLowerCase() === nome.toLowerCase())) return { erro: `${nome} já está nesta equipe.` };
      const g = genero || (t.genero === 'X' ? 'M' : t.genero);
      const a = { id: `u${++seq.u}`, nome, faixa: t.faixa, genero: g, turma: turmaId };
      ATLETAS_LISTA.push(a); ATLETAS[a.id] = a; t.atletas.push(a.id);
      gravarElenco();
      return { atleta: a };
    },
    removerAtleta(id) {
      const a = ATLETAS[id];
      if (!a) return;
      const t = TURMAS[a.turma];
      if (t) t.atletas = t.atletas.filter((x) => x !== id);
      const i = ATLETAS_LISTA.indexOf(a);
      if (i >= 0) ATLETAS_LISTA.splice(i, 1);
      delete ATLETAS[id];
      gravarElenco();
    },
    renomearAtleta(id, nome) { nome = limpa(nome); if (nome.length < 2) return { erro: 'Informe o nome.' }; ATLETAS[id].nome = nome; gravarElenco(); return {}; },
  };

  window.Farol = window.Farol || {};
  window.Farol.elenco = { cadastro, SITUACAO, situacaoDe, turmaPorToken, novoToken, PROFS, ATLETAS, ATLETAS_LISTA, TURMAS, FUNDAMENTOS, FUNDAMENTOS_LISTA, GRUPOS_FUNDAMENTO, PRIORIDADES, PAUTA_PADRAO };
})();
