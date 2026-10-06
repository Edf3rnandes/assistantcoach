/* Shell do painel do profissional: barra de navegação fixa embaixo e roteamento por hash (#treinos-periodizacao).
   Cada tela é uma função registrada em Farol.views[rota](elemento). */
(function () {
  const ICONS = {
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    halter: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    graf: '<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
    corpo: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11h8M9 21l3-6 3 6"/>',
    chama: '<path d="M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-3.5 2-6 5-10z"/>',
    prato: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    pulso: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5"/>',
    bola: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    teste: '<path d="M10 3h4M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    quadro: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M7 9l3 6 4-8 3 4"/>',
    versus: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    mais: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    placar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M7 9h2M15 9h2"/>',
    cruz: '<rect x="9" y="3" width="6" height="18" rx="1.5"/><rect x="3" y="9" width="18" height="6" rx="1.5"/>',
    casa: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  };
  const icon = (nome, t = 18) =>
    `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[nome]}</svg>`;

  // `pronta` indica se a tela já foi construída; as demais mostram o que entra nela.
  const GRUPOS = [
    { titulo: 'Início', itens: [{ id: 'inicio', nome: 'Início', icone: 'casa', pronta: true }, { id: 'equipe', nome: 'Equipe', icone: 'pessoas', pronta: true, oculta: true }, { id: 'equipes-nova', nome: 'Nova equipe', icone: 'pessoas', pronta: true, oculta: true }, { id: 'equipes-editar', nome: 'Editar equipe', icone: 'pessoas', pronta: true, oculta: true }, { id: 'saude', nome: 'Saúde do elenco', icone: 'cruz', pronta: true, oculta: true }, { id: 'ficha', nome: 'Ficha do atleta', icone: 'pessoas', pronta: true, oculta: true }] },
    {
      titulo: 'Já existe',
      itens: [
        { id: 'ex-atletas', nome: 'Atletas e turmas', icone: 'pessoas', existente: true },
        { id: 'ex-sessoes', nome: 'Sessões de quadra', icone: 'bola', existente: true },
        { id: 'ex-testes', nome: 'Testes físicos', icone: 'teste', existente: true },
      ],
    },
    {
      titulo: 'Planejamento',
      itens: [
        { id: 'treinos-periodizacao', nome: 'Periodização', icone: 'cal', pronta: true },
        { id: 'atleta-previa', nome: 'Prévia do atleta', icone: 'pessoas', pronta: true, oculta: true },
        { id: 'planejamento-competicoes', nome: 'Competições', icone: 'placar', pronta: true },
        { id: 'treinos-microciclo', nome: 'Resposta da semana', icone: 'pulso', pronta: true, oculta: true },
      ],
    },
    {
      titulo: 'Treino',
      itens: [
        {
          id: 'treino-registro', nome: 'Registro do treino', icone: 'mic', pronta: true,
          resumo: '', bullets: [], tabelas: [],
        },
        {
          id: 'treino-quadro', nome: 'Quadro técnico', icone: 'quadro', pronta: true,
          resumo: 'Quadra de areia para desenhar posições, deslocamentos e ações, em sequência de quadros.',
          bullets: [
            'Quadra 16 × 8 m com rede, dois jogadores por lado, bola, setas de deslocamento, passe e ataque.',
            'Sequência de quadros (passo a passo) que roda como animação.',
            'Salvar como jogada ou exercício e reutilizar na biblioteca, no registro e no scout.',
            'Funciona com dedo ou caneta em tablet.',
          ],
          tabelas: ['jogadas'],
        },
        { id: 'treinos-biblioteca', nome: 'Exercícios e prescrição', icone: 'halter', pronta: true, oculta: true },
      ],
    },
    {
      titulo: 'Análise',
      itens: [
        {
          id: 'analise', nome: 'Carga', icone: 'pulso', pronta: true,
          resumo: '', bullets: [], tabelas: [],
        },
      ],
    },
  ];

  const ROTAS = {};
  GRUPOS.forEach((g) => g.itens.forEach((i) => { ROTAS[i.id] = i; }));
  const PADRAO = 'inicio';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // A barra tem só quatro portas. Quadro, registro, saúde e scout moram dentro delas (equipe, sessão e jogos).
  const BARRA = [
    { id: 'inicio', rotulo: 'Início' },
    { id: 'treinos-periodizacao', rotulo: 'Periodização' },
    { id: 'analise', rotulo: 'Carga', icone: 'pulso' },
  ];
  // Telas que não aparecem na barra acendem o item a que pertencem.
  const PAI = {
    'equipes-nova': 'inicio', 'equipes-editar': 'inicio', saude: 'inicio', ficha: 'inicio',
    equipe: 'treinos-periodizacao', 'treino-registro': 'treinos-periodizacao', 'treinos-microciclo': 'treinos-periodizacao', 'treino-quadro': 'treinos-periodizacao',
    'treinos-biblioteca': 'treinos-periodizacao', 'atleta-previa': 'treinos-periodizacao', 'planejamento-competicoes': 'treinos-periodizacao',
  };
  // Para onde volta o botão "‹" de cada tela que não é uma porta.
  const VOLTA = {
    'equipes-editar': ['inicio', 'Início'], 'equipes-nova': ['inicio', 'Início'], ficha: ['inicio', 'Início'], saude: ['inicio', 'Início'],
    'treino-registro': ['treinos-periodizacao', 'Periodização'], 'treinos-microciclo': ['treinos-periodizacao', 'Periodização'],
    'planejamento-competicoes': ['treinos-periodizacao', 'Periodização'], 'treinos-biblioteca': ['treinos-periodizacao', 'Periodização'],
  };
  // As abas de cada porta ficam dentro da própria tela (Periodização: Semana, Bloco, Temporada, Calendário, Exercícios, Atletas).
  const SUBNAV = [];
  let rotaAtual = null;
  const EXIGE_PLANO = ['treino-registro', 'treinos-microciclo', 'atleta-previa'];

  function semPlanoVazio(main, item) {
    const temEquipes = Object.keys(window.Farol.elenco.TURMAS).length > 0;
    main.innerHTML = `
      <header class="page-head"><div><h1>${esc(item.nome)}</h1></div></header>
      <section class="card eq-vazio"><h2>${temEquipes ? 'Crie a periodização de uma equipe primeiro' : 'Cadastre uma equipe primeiro'}</h2>
        <p>${temEquipes ? 'Esta tela trabalha em cima das sessões da periodização.' : 'Esta tela trabalha em cima das equipes e da periodização. Comece cadastrando a equipe e os atletas.'}</p>
        <button class="btn btn-primary" id="sp-ir">${temEquipes ? 'Criar periodização' : 'Cadastrar equipe e atletas'}</button></section>`;
    main.querySelector('#sp-ir').addEventListener('click', () => (temEquipes ? window.Farol.ir('treinos-periodizacao', { nivel: 'criar', editor: null }) : window.Farol.ir('equipes-nova')));
  }

  const rotuloBarra = (b) => (b.curto ? `<span class="r-longo">${b.rotulo}</span><span class="r-curto">${b.curto}</span>` : `<span>${b.rotulo}</span>`);

  function montarBarra() {
    const itens = BARRA.map((b) => {
      return `<a class="bar-item" href="#${b.id}" data-rota="${b.id}" aria-label="${esc(ROTAS[b.id].nome)}">${icon(b.icone || ROTAS[b.id].icone, 20)}${rotuloBarra(b)}</a>`;
    });
    document.getElementById('barra').innerHTML = `<div class="barra-itens">${itens.join('')}</div>`;
  }

  function atualizarBarra() {
    document.querySelectorAll('.bar-item[data-rota]').forEach((a) => {
      if (a.dataset.rota === (PAI[rotaAtual] || rotaAtual)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function pendente(item) {
    return `
      <header class="page-head">
        <div>
          <h1>${esc(item.nome)}</h1>
          <p class="lead">${esc(item.resumo)}</p>
        </div>
      </header>
      <section class="card pending">
        <span class="label">Próxima etapa do frontend</span>
        <p>Esta tela ainda não foi montada. Ela vai conter:</p>
        <ul>${item.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        ${item.aberto ? `<span class="label">Para decidir</span><ul>${item.aberto.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        ${item.tabelas.length ? `<p>Tabelas previstas no schema <code>ft</code>: ${item.tabelas.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>` : ''}
      </section>`;
  }

  function rotear() {
    // A gaveta do quadro pertence à tela em que foi aberta: ao trocar de tela, fecha, e o botão Quadro volta a abrir.
    if (gaveta.aberta) gaveta.fechar(false);
    let id = location.hash.slice(1);
    if (id === 'analise-comparar') { id = 'analise'; window.Farol.params = { aba: 'comparar' }; }
    const rota = ROTAS[id] && !ROTAS[id].existente ? id : PADRAO;
    const item = ROTAS[rota];
    const main = document.getElementById('conteudo');

    const view = window.Farol.views && window.Farol.views[rota];
    const params = window.Farol.params;
    window.Farol.params = null;
    // Telas que dependem de um plano de treino: sem plano (conta nova), mostram o caminho para criar um.
    if (EXIGE_PLANO.includes(rota) && !window.Farol.dados.planos.length) semPlanoVazio(main, item);
    else if (item.pronta && view) view(main, params);
    else main.innerHTML = pendente(item);

    document.title = `${item.nome} | Farol Tático`;
    rotaAtual = rota;
    atualizarBarra();
    atualizarNavegacao(rota);
  }

  // Linha de abas da porta e botão de voltar, que dependem da tela atual.
  function atualizarNavegacao(rota) {
    const sub = document.getElementById('subnav');
    const grupo = SUBNAV.find((g) => g.ids.includes(rota));
    if (grupo) {
      const ativo = rota;
      sub.innerHTML = grupo.itens.map(([id, nome]) => `<a class="subnav-item" href="#${id}" data-rota="${id}" ${id === ativo ? 'aria-current="page"' : ''}>${esc(nome)}</a>`).join('');
      sub.hidden = false;
    } else { sub.innerHTML = ''; sub.hidden = true; }
    const v = document.getElementById('voltar-w');
    const [alvo, nome] = VOLTA[rota] || ['inicio', 'Início'];
    const link = v.querySelector('a');
    link.setAttribute('href', `#${alvo}`);
    link.textContent = `‹ ${nome}`;
    v.hidden = rota === 'inicio';
  }

  // Navega para outra tela levando parâmetros (por exemplo, abrir uma semana ou uma competição).
  window.Farol.ir = function (rota, params) {
    window.Farol.params = params || null;
    if (location.hash.slice(1) === rota) rotear();
    else location.hash = '#' + rota;
    window.scrollTo({ top: 0 });
  };


  /* ---------- Gaveta "Quadro rápido" ----------
     Botão fixo que abre o quadro técnico sobre qualquer tela, sem navegar. O desenho é o mesmo
     da tela cheia e continua onde parou. Pensado para o treino e, depois, para o scout em jogo. */
  const lerModo = () => { try { return localStorage.getItem('ft.gaveta.modo') === 'compacta'; } catch (e) { return false; } };
  const gaveta = {
    aberta: false,
    abrir() {
      const el = document.getElementById('gaveta-quadro');
      if (!el || !window.Farol.quadro) return;
      this.origem = document.activeElement;
      this.aberta = true;
      el.hidden = false;
      this.modo(lerModo());
      atualizarBarra();
      window.Farol.quadro.montar(document.getElementById('gaveta-corpo'), 'painel');
      document.getElementById('gaveta-fechar').focus();
    },
    // Em telas estreitas a gaveta ocupa a área toda acima da barra (como uma aba); "Reduzir" devolve a tela de baixo.
    modo(compacta) {
      const el = document.getElementById('gaveta-quadro');
      const bt = document.getElementById('gaveta-modo');
      el.classList.toggle('compacta', compacta);
      if (bt) { bt.textContent = compacta ? 'Ampliar' : 'Reduzir'; bt.setAttribute('aria-pressed', String(compacta)); }
      try { localStorage.setItem('ft.gaveta.modo', compacta ? 'compacta' : 'cheia'); } catch (e) { /* sem armazenamento */ }
    },
    fechar(devolverFoco = true) {
      const el = document.getElementById('gaveta-quadro');
      if (!el || !this.aberta) return;
      this.aberta = false;
      el.hidden = true;
      atualizarBarra();
      document.getElementById('gaveta-corpo').innerHTML = '';
      window.Farol.quadro.desmontar();
      if (devolverFoco && this.origem && document.contains(this.origem)) this.origem.focus();
      this.origem = null;
    },
  };
  window.Farol.gaveta = gaveta;
  window.Farol.rota = (id) => ROTAS[id] || null;

  function ligarGaveta() {
    document.getElementById('gaveta-fechar').addEventListener('click', () => gaveta.fechar());
    document.getElementById('gaveta-modo').addEventListener('click', () => gaveta.modo(!document.getElementById('gaveta-quadro').classList.contains('compacta')));
    document.getElementById('gaveta-tela').addEventListener('click', () => { gaveta.fechar(false); window.Farol.ir('treino-quadro', {}); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && gaveta.aberta) gaveta.fechar(); });
  }

  function iniciales(nome) { return nome.split(' ').filter((x) => x.length > 1).slice(0, 2).map((x) => x[0]).join('').toUpperCase(); }

  // Menu da conta, no canto do topo: quem está logado, em que modo, e a saída.
  function montarConta() {
    const host = document.getElementById('conta');
    const C = window.Farol.conta;
    const u = C.usuario();
    if (!u) { host.innerHTML = ''; return; }
    const demo = C.modo() === 'demo';
    host.innerHTML = `
      <button class="conta-bt" id="conta-bt" aria-haspopup="true" aria-expanded="false" aria-controls="conta-menu" aria-label="Conta de ${esc(u.nome)}">
        <span class="conta-av">${esc(iniciales(u.nome))}</span><span class="conta-nome">${esc(u.nome.split(' ')[0])}</span>
      </button>
      <div class="conta-menu" id="conta-menu" hidden>
        <div class="conta-quem"><b>${esc(u.nome)}</b>${u.org ? `<small>${esc(u.org)}</small>` : ''}<small>${demo ? 'Dados de exemplo' : esc(u.email)}</small></div>
        ${demo ? '<p class="conta-dica">Você está vendo o app com dados de exemplo. Crie sua conta para cadastrar as suas equipes e atletas.</p>' : '<p class="conta-dica">Seus dados ficam guardados neste aparelho.</p>'}
        <button class="btn btn-sm ${demo ? 'btn-primary' : ''}" id="conta-sair">${demo ? 'Criar minha conta' : 'Sair da conta'}</button>
      </div>`;
    const bt = host.querySelector('#conta-bt'), menu = host.querySelector('#conta-menu');
    const alternar = (abre) => { menu.hidden = !abre; bt.setAttribute('aria-expanded', String(abre)); };
    bt.addEventListener('click', (e) => { e.stopPropagation(); alternar(menu.hidden); });
    document.addEventListener('click', (e) => { if (!menu.hidden && !host.contains(e.target)) alternar(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { alternar(false); bt.focus(); } });
    host.querySelector('#conta-sair').addEventListener('click', () => { C.sair(); location.hash = '#inicio'; location.reload(); });
  }

  function iniciar() {
    // Sem sessão, só a tela de entrada: nada do painel é montado.
    if (!window.Farol.conta.modo()) { window.Farol.entrar.montar(); return; }
    montarConta();
    montarBarra();
    ligarGaveta();

    // Tocar no item da tela em que já está volta ao início dela (por exemplo, sai do relatório de um jogo).
    const mesmaTela = (e) => {
      const a = e.target.closest('a[data-rota]');
      if (a && a.dataset.rota === location.hash.slice(1)) { e.preventDefault(); window.Farol.ir(a.dataset.rota); }
    };
    document.getElementById('barra').addEventListener('click', mesmaTela);
    document.getElementById('subnav').addEventListener('click', mesmaTela);

    window.addEventListener('hashchange', rotear);
    rotear();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
