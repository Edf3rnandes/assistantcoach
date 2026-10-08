/* Rotas (hash), barra de navegação e montagem das telas. */
(function (AC) {
  const { h } = AC.ui;

  const ABAS = [
    { rota: 'inicio', rotulo: 'Início', icone: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>' },
    { rota: 'periodizacao', rotulo: 'Periodização', icone: '<path d="M3 17h4V9h4V13h4V5h6"/><path d="M3 21h18"/>' },
    { rota: 'treinos', rotulo: 'Treinos', icone: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
    { rota: 'fisico', rotulo: 'Físico', icone: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>' },
    { rota: 'atletas', rotulo: 'Atletas', icone: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.4"/><path d="M17 14.2c2.5.2 4 2.2 4 5.3"/>' },
  ];

  const principal = () => document.getElementById('conteudo');

  function lerRota() {
    const [caminho, q = ''] = (location.hash.replace(/^#\/?/, '') || 'inicio').split('?');
    const partes = caminho.split('/').filter(Boolean).map(decodeURIComponent);
    const query = Object.fromEntries(new URLSearchParams(q));
    return { partes: partes.length ? partes : ['inicio'], query };
  }

  function desenharNav(rota) {
    const nav = document.getElementById('nav');
    nav.replaceChildren(...ABAS.map((a) => {
      const el = h('a', { href: `#/${a.rota}`, class: a.rota === rota ? 'on' : '', 'aria-current': a.rota === rota ? 'page' : null });
      el.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${a.icone}</svg><span>${a.rotulo}</span>`;
      return el;
    }));
    const dados = document.getElementById('link-dados');
    dados.classList.toggle('on', rota === 'dados');
  }

  function desenhar(rolar) {
    const ctx = lerRota();
    const rota = ctx.partes[0];
    const view = AC.views[rota] || AC.views.inicio;
    desenharNav(AC.views[rota] ? rota : 'inicio');
    let no;
    try { no = view(ctx); }
    catch (err) {
      console.error(err);
      no = h('div', { class: 'vazio' }, h('h2', null, 'Algo deu errado nesta tela'), h('p', null, String(err.message || err)), h('a', { class: 'btn', href: '#/inicio' }, 'Ir para o início'));
    }
    principal().replaceChildren(no);
    if (rolar) window.scrollTo(0, 0);
    document.title = ({ inicio: 'Início', periodizacao: 'Periodização', treinos: 'Treinos', fisico: 'Treino físico', atletas: 'Atletas', dados: 'Dados' }[rota] || 'Início') + ' · Assistente do Treinador';
  }

  /* Refaz a tela atual mantendo a posição de rolagem (depois de salvar algo num modal, por exemplo). */
  AC.redesenhar = () => { const y = window.scrollY; desenhar(false); window.scrollTo(0, y); };

  window.addEventListener('hashchange', () => desenhar(true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => desenhar(true));
  else desenhar(true);
})((window.AC = window.AC || {}));
