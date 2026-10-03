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
  };
  const icon = (nome, t = 18) =>
    `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[nome]}</svg>`;

  // `pronta` indica se a tela já foi construída; as demais mostram o que entra nela.
  const GRUPOS = [
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
        {
          id: 'treinos-microciclo', nome: 'Resposta da semana', icone: 'pulso',
          resumo: 'Como os atletas estão respondendo à semana: PSE, PSR e bem-estar.',
          bullets: [
            'Sessões da semana planejadas na Periodização, lado a lado com o que os atletas relataram.',
            'Por atleta: PSE, PSR, sono, dor e disposição, com semáforo e carga da semana (monotonia, strain, ACWR).',
            'Coleta em lote pelo técnico (toque em atleta × valor) ou pelo link do atleta.',
          ],
          tabelas: ['pse_sessao', 'wellness_diario'],
        },
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
        {
          id: 'treinos-biblioteca', nome: 'Exercícios e prescrição', icone: 'halter',
          resumo: 'Catálogo de exercícios e templates de treino físico, aplicados a atletas ou turmas.',
          bullets: ['Catálogo com grupo muscular, categoria e vídeo.', 'Template com séries, repetições, carga e descanso.', 'Aplicar a uma turma ou a um atleta.'],
          tabelas: ['exercicios', 'planos_treino', 'treino_prescrito'],
        },
      ],
    },
    {
      titulo: 'Análise',
      itens: [
        {
          id: 'analise', nome: 'Análise', icone: 'graf', pronta: true,
          resumo: '', bullets: [], tabelas: [],
        },
        {
          id: 'analise-scout', nome: 'Scout', icone: 'alvo',
          resumo: 'Scout de jogos de campeonato reaproveitado no treino. Ponto em discussão.',
          bullets: [
            'Jogo: registro completo, como já existe hoje.',
            'Treino-jogo: a mesma taxonomia de ações, em versão leve.',
            'Fundamento: contagem de acertos e tentativas de um exercício, em um toque.',
            'Metas de treino geradas a partir do scout dos jogos.',
          ],
          aberto: [
            'O que o scout atual registra hoje: por ponto, por ação, direção, tipo de ataque?',
            'Quem coleta e onde: o técnico sozinho, um auxiliar, ou depois pelo vídeo?',
            'O scout de treino deve ser comparável ao de jogo (mesma ficha) ou ser mais simples?',
          ],
          tabelas: ['jogos', 'acoes_scout'],
        },
      ],
    },
  ];

  const ROTAS = {};
  GRUPOS.forEach((g) => g.itens.forEach((i) => { ROTAS[i.id] = i; }));
  const PADRAO = 'treinos-periodizacao';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Itens que ficam sempre na barra. "Quadro" abre a gaveta do quadro rápido; o resto navega.
  const BARRA = [
    { id: 'treinos-periodizacao', rotulo: 'Periodização', curto: 'Plano' },
    { id: 'planejamento-competicoes', rotulo: 'Competições', curto: 'Torneios' },
    { id: 'treino-registro', rotulo: 'Registro' },
    { id: 'quadro', rotulo: 'Quadro', icone: 'quadro' },
    { id: 'analise', rotulo: 'Análise' },
  ];
  const ID_NA_BARRA = [...BARRA.map((b) => b.id), 'treino-quadro'];
  let rotaAtual = null;

  const rotuloBarra = (b) => (b.curto ? `<span class="r-longo">${b.rotulo}</span><span class="r-curto">${b.curto}</span>` : `<span>${b.rotulo}</span>`);

  function montarBarra() {
    const itens = BARRA.map((b) => {
      if (b.id === 'quadro') return `<button class="bar-item" id="bt-quadro" type="button" aria-pressed="false" aria-controls="gaveta-quadro" aria-label="Quadro técnico rápido">${icon(b.icone, 20)}${rotuloBarra(b)}</button>`;
      return `<a class="bar-item" href="#${b.id}" data-rota="${b.id}" aria-label="${esc(ROTAS[b.id].nome)}">${icon(ROTAS[b.id].icone, 20)}${rotuloBarra(b)}</a>`;
    });
    itens.push(`<button class="bar-item" id="bt-mais" type="button" aria-expanded="false" aria-controls="folha-mais" aria-label="Mais telas">${icon('mais', 20)}<span>Mais</span></button>`);
    document.getElementById('barra').innerHTML = `<div class="barra-itens">${itens.join('')}</div>`;
  }

  function montarFolha() {
    const todos = GRUPOS.flatMap((g) => g.itens).filter((i) => !i.oculta && !ID_NA_BARRA.includes(i.id));
    const breve = todos.filter((i) => !i.existente);
    const atuais = todos.filter((i) => i.existente);
    document.getElementById('folha-mais').innerHTML = `
      <div class="folha-titulo label">Em breve</div>
      ${breve.map((i) => `<a class="folha-link" role="menuitem" href="#${i.id}" data-rota="${i.id}">${icon(i.icone, 20)}${esc(i.nome)}<span class="folha-tag">em breve</span></a>`).join('')}
      <div class="folha-titulo label">No sistema atual</div>
      ${atuais.map((i) => `<span class="folha-link" role="menuitem" aria-disabled="true">${icon(i.icone, 20)}${esc(i.nome)}</span>`).join('')}`;
  }

  function atualizarBarra() {
    document.querySelectorAll('.bar-item[data-rota]').forEach((a) => {
      if (a.dataset.rota === rotaAtual) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const q = document.getElementById('bt-quadro');
    if (q) q.setAttribute('aria-pressed', String(rotaAtual === 'treino-quadro' || gaveta.aberta));
    const maisAtivo = rotaAtual && !ID_NA_BARRA.includes(rotaAtual) && rotaAtual !== 'atleta-previa';
    const m = document.getElementById('bt-mais');
    if (m) { if (maisAtivo) m.setAttribute('aria-current', 'page'); else m.removeAttribute('aria-current'); }
  }

  function fecharFolha() {
    const f = document.getElementById('folha-mais');
    if (!f || f.hidden) return;
    f.hidden = true;
    document.getElementById('bt-mais').setAttribute('aria-expanded', 'false');
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
    let id = location.hash.slice(1);
    if (id === 'analise-comparar') { id = 'analise'; window.Farol.params = { aba: 'comparar' }; }
    const rota = ROTAS[id] && !ROTAS[id].existente ? id : PADRAO;
    const item = ROTAS[rota];
    const main = document.getElementById('conteudo');

    const view = window.Farol.views && window.Farol.views[rota];
    const params = window.Farol.params;
    window.Farol.params = null;
    if (item.pronta && view) view(main, params);
    else main.innerHTML = pendente(item);

    document.title = `${item.nome} | Farol Tático`;
    rotaAtual = rota;
    fecharFolha();
    atualizarBarra();
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
  const gaveta = {
    aberta: false,
    abrir() {
      const el = document.getElementById('gaveta-quadro');
      if (!el || !window.Farol.quadro) return;
      this.aberta = true;
      el.hidden = false;
      atualizarBarra();
      window.Farol.quadro.montar(document.getElementById('gaveta-corpo'), 'painel');
      document.getElementById('gaveta-fechar').focus();
    },
    fechar() {
      const el = document.getElementById('gaveta-quadro');
      if (!el || !this.aberta) return;
      this.aberta = false;
      el.hidden = true;
      atualizarBarra();
      document.getElementById('gaveta-corpo').innerHTML = '';
      window.Farol.quadro.desmontar();
      const bt = document.getElementById('bt-quadro');
      if (bt) bt.focus();
    },
  };
  window.Farol.gaveta = gaveta;

  function ligarGaveta() {
    const bt = document.getElementById('bt-quadro');
    if (!bt) return;
    // Na tela cheia do quadro o item já está ativo; nas demais, abre e fecha a gaveta.
    bt.addEventListener('click', () => {
      if (rotaAtual === 'treino-quadro') return;
      fecharFolha();
      if (gaveta.aberta) { gaveta.fechar(); bt.focus(); } else gaveta.abrir();
    });
    document.getElementById('gaveta-fechar').addEventListener('click', () => gaveta.fechar());
    document.getElementById('gaveta-tela').addEventListener('click', () => { gaveta.fechar(); window.Farol.ir('treino-quadro', {}); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && gaveta.aberta) gaveta.fechar(); });
  }

  function iniciar() {
    montarBarra();
    montarFolha();
    ligarGaveta();

    const mais = document.getElementById('bt-mais');
    mais.addEventListener('click', () => {
      const f = document.getElementById('folha-mais');
      f.hidden = !f.hidden;
      mais.setAttribute('aria-expanded', String(!f.hidden));
    });
    document.addEventListener('click', (e) => {
      const f = document.getElementById('folha-mais');
      if (!f.hidden && !f.contains(e.target) && !mais.contains(e.target)) fecharFolha();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharFolha(); });

    window.addEventListener('hashchange', rotear);
    rotear();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
