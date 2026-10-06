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

  // Blocos da periodização dinâmica usam as pautas das fases correspondentes.
  PAUTA_PADRAO.acumulacao = PAUTA_PADRAO.base;
  PAUTA_PADRAO.transmutacao = PAUTA_PADRAO.especifico;
  PAUTA_PADRAO.realizacao = PAUTA_PADRAO.polimento;
  PAUTA_PADRAO.manutencao = PAUTA_PADRAO.base;

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
        Object.values(TURMAS).forEach((t) => { if (t.faixas && t.generos) return; t.faixas = t.faixas || [t.faixa]; t.generos = t.generos || (t.genero === 'X' ? ['M', 'F'] : [t.genero || 'M']); });
        seq = g.seq || seq;
      }
    } catch (e) { /* começa vazio */ }
  }
  const gravarElenco = () => {
    if (!CONTA.guardaDados()) return;
    try { localStorage.setItem(CH_ELENCO, JSON.stringify({ turmas: Object.values(TURMAS), atletas: ATLETAS_LISTA, seq })); } catch (e) { /* ignora */ }
  };

  /* ---------- Faixas, gêneros e categorias ---------- */

  // Uma equipe é o grupo que treina junto e pode reunir mais de uma faixa (Sub-15 e Sub-17) e os dois gêneros.
  // Cada atleta tem a própria faixa e o próprio gênero; as categorias de competição da equipe vêm do cruzamento das duas listas.
  const FAIXAS = ['Sub-13', 'Sub-15', 'Sub-17', 'Sub-19', 'Sub-21', 'Adulto', 'Master'];
  const GENEROS = { M: 'Masculino', F: 'Feminino' };
  const SIGLA = { M: 'Masc', F: 'Fem' };
  const ORDEM_FAIXA = (f) => idadeLimite(f);
  // Idade máxima da faixa (Sub-17 = 17). Adulto e Master não têm teto. Quem é de uma faixa pode jogar na própria categoria e acima, nunca abaixo.
  function idadeLimite(faixa) {
    const m = /^Sub-(\d+)/.exec(faixa || '');
    return m ? Number(m[1]) : faixa === 'Master' ? 200 : 99;
  }
  // A faixa sai do ano de nascimento: idade que o atleta completa no ano da competição (ano menos ano de nascimento).
  // Sub-N vai até N anos; acima de 21 é Adulto. Master é sempre escolhido à mão.
  function anoAtual() { return new Date(window.Farol.util.HOJE).getUTCFullYear(); }
  function faixaPorNascimento(nasc, ano) {
    const idade = (ano || anoAtual()) - Number(String(nasc).slice(0, 4));
    for (const n of [13, 15, 17, 19, 21]) if (idade <= n) return `Sub-${n}`;
    return 'Adulto';
  }
  // Idade completa em uma data (ms). Sem data de referência, hoje.
  function idadeEm(nasc, ref) {
    const [y, m, d] = String(nasc).split('-').map(Number);
    const r = new Date(ref == null ? window.Farol.util.HOJE : ref);
    let i = r.getUTCFullYear() - y;
    if (r.getUTCMonth() + 1 < m || (r.getUTCMonth() + 1 === m && r.getUTCDate() < d)) i--;
    return i;
  }
  const nascimentoValido = (iso) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false;
    const [y, m, d] = iso.split('-').map(Number);
    const t = Date.UTC(y, m - 1, d);
    const dt = new Date(t);
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && t <= window.Farol.util.HOJE && y >= 1940 && idadeEm(iso) >= 6;
  };
  // Faixa do atleta no ano dado (ou hoje): com data de nascimento ela é calculada; sem data, vale a escolhida.
  const faixaDe = (a, ano) => (a.nascimento && a.faixa !== 'Master' ? faixaPorNascimento(a.nascimento, ano) : a.faixa);
  // Campos da ficha do atleta, além de nome, faixa, gênero e nascimento.
  const CAMPOS_FICHA = ['altura', 'mao', 'posicao', 'telefone', 'responsavel', 'responsavelTel', 'emergenciaNome', 'emergenciaTel', 'alergias', 'atestado', 'obs'];
  const categoriasDe = (faixas, generos) => faixas.flatMap((f) => generos.map((g) => `${f} ${SIGLA[g]}`));
  const rotuloLista = (v) => (v.length <= 1 ? (v[0] || '') : `${v.slice(0, -1).join(', ')} e ${v[v.length - 1]}`);
  const rotuloGeneros = (g) => (g.length === 2 ? 'Masculino e feminino' : g[0] === 'F' ? 'Feminino' : 'Masculino');

  // Equipes de exemplo e antigas: completa faixas e gêneros a partir do que já tinham.
  const normalizar = (t) => {
    const membros = t.atletas.map((a) => ATLETAS[a]).filter(Boolean);
    if (!t.faixas || !t.faixas.length) t.faixas = [...new Set(membros.map((a) => a.faixa).concat(t.faixa ? [t.faixa] : []))].sort((x, y) => idadeLimite(x) - idadeLimite(y));
    if (!t.generos || !t.generos.length) t.generos = ['M', 'F'].filter((g) => membros.some((a) => a.genero === g));
    if (!t.generos.length) t.generos = t.genero === 'F' ? ['F'] : ['M'];
    t.faixa = t.faixas[0];
    t.genero = t.generos.length === 2 ? 'X' : t.generos[0];
    return t;
  };
  ATLETAS_LISTA.forEach((a) => { if (a.nascimento && a.faixa !== 'Master') a.faixa = faixaPorNascimento(a.nascimento); });
  Object.values(TURMAS).forEach(normalizar);

  const limpa = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  const ordenaFaixas = (l) => l.slice().sort((x, y) => idadeLimite(x) - idadeLimite(y));

  const cadastro = {
    FAIXAS, GENEROS, idadeLimite, faixaPorNascimento, faixaDe, idadeEm, nascimentoValido, CAMPOS_FICHA, categoriasDe, rotuloLista, rotuloGeneros,
    rotuloEquipe: (t) => `${t.faixas.join(' + ')} · ${rotuloGeneros(t.generos).toLowerCase()}`,
    // Cria uma equipe com uma ou mais faixas e um ou dois gêneros.
    criarTurma({ nome, faixas, generos }) {
      nome = limpa(nome);
      if (nome.length < 2) return { erro: 'Dê um nome à equipe.', campo: 'nome' };
      if (!faixas || !faixas.length) return { erro: 'Marque ao menos uma faixa.', campo: 'faixas' };
      if (!generos || !generos.length) return { erro: 'Marque ao menos um gênero.', campo: 'generos' };
      if (Object.values(TURMAS).some((t) => t.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Já existe uma equipe com este nome.', campo: 'nome' };
      const id = `t${++seq.t}`;
      const fx = ordenaFaixas(faixas);
      TURMAS[id] = normalizar({ id, nome, token: `${id}-${Math.random().toString(36).slice(2, 6)}`, faixas: fx, generos: generos.slice(), categorias: categoriasDe(fx, generos), atletas: [], professores: ['p1'] });
      gravarElenco();
      return { turma: TURMAS[id] };
    },
    editarTurma(id, { nome, faixas, generos }) {
      const t = TURMAS[id];
      nome = limpa(nome);
      if (nome.length < 2) return { erro: 'Dê um nome à equipe.', campo: 'nome' };
      if (!faixas || !faixas.length) return { erro: 'Marque ao menos uma faixa.', campo: 'faixas' };
      if (!generos || !generos.length) return { erro: 'Marque ao menos um gênero.', campo: 'generos' };
      if (Object.values(TURMAS).some((o) => o.id !== id && o.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Já existe uma equipe com este nome.', campo: 'nome' };
      const presos = t.atletas.map((a) => ATLETAS[a]).filter((a) => !faixas.includes(a.faixa) || !generos.includes(a.genero));
      if (presos.length) return { erro: `${presos.slice(0, 3).map((a) => a.nome.split(' ')[0]).join(', ')}${presos.length > 3 ? ' e outros' : ''} ainda ${presos.length === 1 ? 'está' : 'estão'} numa faixa ou gênero que você desmarcou. Mude ou remova ${presos.length === 1 ? 'o atleta' : 'os atletas'} antes.`, campo: 'faixas' };
      const fx = ordenaFaixas(faixas);
      Object.assign(t, { nome, faixas: fx, generos: generos.slice(), categorias: categoriasDe(fx, generos) });
      normalizar(t);
      gravarElenco();
      return { turma: t };
    },
    // Salva a equipe e os atletas de uma vez (criar ou editar). `atletas`: [{ id?, nome, faixa, genero }]; `removidos`: ids.
    salvarEquipe({ id, nome, faixas, generos, atletas, removidos }) {
      nome = limpa(nome);
      if (nome.length < 2) return { erro: 'Dê um nome à equipe.', campo: 'nome' };
      if (!faixas || !faixas.length) return { erro: 'Marque ao menos uma faixa.', campo: 'faixas' };
      if (!generos || !generos.length) return { erro: 'Marque ao menos um gênero.', campo: 'generos' };
      if (Object.values(TURMAS).some((o) => o.id !== id && o.nome.toLowerCase() === nome.toLowerCase())) return { erro: 'Já existe uma equipe com este nome.', campo: 'nome' };
      (atletas || []).forEach((a) => { if (a.nascimento) { if (!nascimentoValido(a.nascimento)) a.nascimento = ''; else if (a.faixa !== 'Master') a.faixa = faixaPorNascimento(a.nascimento); } });
      // Quem tem data de nascimento traz a própria faixa: se a equipe ainda não a tem, ela entra.
      faixas = [...new Set([...faixas, ...(atletas || []).filter((a) => a.nascimento).map((a) => a.faixa)])];
      const fora = (atletas || []).filter((a) => !faixas.includes(a.faixa) || !generos.includes(a.genero));
      if (fora.length) return { erro: `${fora.slice(0, 3).map((a) => a.nome.split(' ')[0]).join(', ')} ${fora.length === 1 ? 'está' : 'estão'} numa faixa ou gênero que não é da equipe. Ajuste ${fora.length === 1 ? 'o atleta' : 'os atletas'} ou marque a faixa e o gênero.`, campo: 'faixas' };
      const fx = ordenaFaixas(faixas);
      let t;
      if (id) {
        t = TURMAS[id];
        Object.assign(t, { nome, faixas: fx, generos: generos.slice(), categorias: categoriasDe(fx, generos) });
        (removidos || []).forEach((a) => cadastro.removerAtleta(a));
      } else {
        const novo = `t${++seq.t}`;
        t = TURMAS[novo] = { id: novo, nome, token: `${novo}-${Math.random().toString(36).slice(2, 6)}`, faixas: fx, generos: generos.slice(), categorias: categoriasDe(fx, generos), atletas: [], professores: ['p1'] };
      }
      normalizar(t);
      (atletas || []).forEach((a) => {
        if (a.id && ATLETAS[a.id]) Object.assign(ATLETAS[a.id], { nome: limpa(a.nome), faixa: a.faixa, genero: a.genero, nascimento: a.nascimento || '' });
        else { const n = { id: `u${++seq.u}`, nome: limpa(a.nome), faixa: a.faixa, genero: a.genero, nascimento: a.nascimento || '', turma: t.id }; ATLETAS_LISTA.push(n); ATLETAS[n.id] = n; t.atletas.push(n.id); }
      });
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
    // Atleta com faixa e gênero próprios (padrão: a primeira faixa e o primeiro gênero da equipe).
    adicionarAtleta(turmaId, { nome, genero, faixa }) {
      nome = limpa(nome);
      const t = TURMAS[turmaId];
      if (nome.length < 2) return { erro: 'Informe o nome do atleta.' };
      if (t.atletas.some((a) => ATLETAS[a].nome.toLowerCase() === nome.toLowerCase())) return { erro: `${nome} já está nesta equipe.` };
      const g = t.generos.includes(genero) ? genero : t.generos[0];
      const f = t.faixas.includes(faixa) ? faixa : t.faixas[0];
      const a = { id: `u${++seq.u}`, nome, faixa: f, genero: g, turma: turmaId };
      ATLETAS_LISTA.push(a); ATLETAS[a.id] = a; t.atletas.push(a.id);
      gravarElenco();
      return { atleta: a };
    },
    atualizarAtleta(id, patch) {
      const a = ATLETAS[id];
      if (!a) return { erro: 'Atleta não encontrado.' };
      const t = cadastro.turmaDe(id);
      const { nome, genero, faixa, nascimento } = patch;
      if (nome != null) { const n = limpa(nome); if (n.length < 2) return { erro: 'Informe o nome.', campo: 'nome' }; a.nome = n; }
      if (genero && t.generos.includes(genero)) a.genero = genero;
      if (faixa && t.faixas.includes(faixa)) a.faixa = faixa;
      if (nascimento != null) {
        if (nascimento === '') a.nascimento = '';
        else if (!nascimentoValido(nascimento)) return { erro: 'Confira a data de nascimento.', campo: 'nascimento' };
        else {
          a.nascimento = nascimento;
          if (a.faixa !== 'Master') {
            a.faixa = faixaPorNascimento(nascimento);
            if (!t.faixas.includes(a.faixa)) { t.faixas = ordenaFaixas([...t.faixas, a.faixa]); t.categorias = categoriasDe(t.faixas, t.generos); normalizar(t); }
          }
        }
      }
      CAMPOS_FICHA.forEach((k) => { if (patch[k] != null) a[k] = limpa(patch[k]); });
      gravarElenco();
      return {};
    },
    removerAtleta(id) {
      const a = ATLETAS[id];
      if (!a) return;
      const t = cadastro.turmaDe(id);
      if (t) t.atletas = t.atletas.filter((x) => x !== id);
      const i = ATLETAS_LISTA.indexOf(a);
      if (i >= 0) ATLETAS_LISTA.splice(i, 1);
      delete ATLETAS[id];
      gravarElenco();
    },
    // Filtros para montar duplas: todos, por equipe ou por gênero.
    filtrosAtletas() {
      return [{ v: 'todas', n: 'Todas as equipes' }, ...Object.values(TURMAS).map((t) => ({ v: `eq:${t.id}`, n: t.nome })), { v: 'g:M', n: 'Só masculino' }, { v: 'g:F', n: 'Só feminino' }];
    },
    atletasPor(filtro) {
      if (!filtro || filtro === 'todas') return ATLETAS_LISTA.slice();
      if (filtro.startsWith('eq:')) return (TURMAS[filtro.slice(3)] ? TURMAS[filtro.slice(3)].atletas : []).map((id) => ATLETAS[id]).filter(Boolean);
      if (filtro.startsWith('g:')) return ATLETAS_LISTA.filter((a) => a.genero === filtro.slice(2));
      return ATLETAS_LISTA.slice();
    },
    // "Sub-17 Masc" → { faixa: 'Sub-17', tipo: 'Masc' }; "Adulto Misto" → { faixa: 'Adulto', tipo: 'Misto' }.
    parseCategoria(cat) { const m = /^(.*)\s(Masc|Fem|Misto)$/.exec(cat || ''); return m ? { faixa: m[1], tipo: m[2] } : { faixa: cat, tipo: null }; },
    // Quem é de uma faixa joga na própria categoria e acima (um Sub-17 joga o Sub-21), nunca abaixo. Master só para Master.
    podeJogar(a, cat, ano) {
      const c = cadastro.parseCategoria(cat);
      const fa = faixaDe(a, ano);
      if (c.faixa === 'Master') return fa === 'Master' ? { ok: true, acima: false } : { ok: false, motivo: `${a.nome} não é Master e não pode jogar a categoria ${cat}.` };
      if (idadeLimite(fa) > idadeLimite(c.faixa)) return { ok: false, motivo: `${a.nome} é ${fa} e não pode jogar numa categoria mais nova (${cat}).` };
      if (c.tipo === 'Masc' && a.genero !== 'M') return { ok: false, motivo: `${a.nome} é do gênero feminino e a categoria é masculina (${cat}).` };
      if (c.tipo === 'Fem' && a.genero !== 'F') return { ok: false, motivo: `${a.nome} é do gênero masculino e a categoria é feminina (${cat}).` };
      return { ok: true, acima: idadeLimite(fa) < idadeLimite(c.faixa) };
    },
    // Retorna a frase de erro ou '' se a dupla serve para a categoria.
    validarDupla(idA, idB, cat, ano) {
      const a = ATLETAS[idA], b = ATLETAS[idB];
      if (!a || !b || a === b) return 'Escolha dois atletas diferentes para a dupla.';
      for (const x of [a, b]) { const r = cadastro.podeJogar(x, cat, ano); if (!r.ok) return r.motivo; }
      if (cadastro.parseCategoria(cat).tipo === 'Misto' && a.genero === b.genero) return 'Na categoria mista, a dupla precisa de um atleta e uma atleta.';
      return '';
    },
    turmaDe(id) { return Object.values(TURMAS).find((t) => t.atletas.includes(id)) || null; },
    renomearAtleta(id, nome) { return cadastro.atualizarAtleta(id, { nome }); },
  };

  window.Farol = window.Farol || {};
  window.Farol.elenco = { cadastro, SITUACAO, situacaoDe, turmaPorToken, novoToken, PROFS, ATLETAS, ATLETAS_LISTA, TURMAS, FUNDAMENTOS, FUNDAMENTOS_LISTA, GRUPOS_FUNDAMENTO, PRIORIDADES, PAUTA_PADRAO };
})();
