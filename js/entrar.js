/* Tela de entrada: criar conta, entrar ou ver o app com dados de exemplo.
   Aparece sempre que não há sessão. Ao entrar, a página recarrega para que cada módulo carregue os dados da conta certa. */
(function () {
  const C = window.Farol.conta;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const FAROL = `<svg width="46" height="46" viewBox="0 0 34 34" fill="none" aria-hidden="true">
    <path d="M3 17 L16 14 V20 Z" fill="#f2a900" opacity=".9"/><path d="M31 17 L18 14 V20 Z" fill="#f2a900" opacity=".55"/>
    <path d="M14 13h4l1.5 17h-7z" fill="#fff"/><path d="M13 22h8M12.6 26h8.8" stroke="#0b1f2d" stroke-width="1.6"/>
    <rect x="14" y="8" width="6" height="5" rx="1" fill="#f2a900"/><path d="M13 8l4-4 4 4z" fill="#fff"/></svg>`;

  const PONTOS = [
    ['Suas equipes', 'Cadastre equipes e atletas e veja a semana de cada uma.'],
    ['Treino e registro', 'Planeje a temporada, registre PSE e PSR e acompanhe a carga.'],
    ['Jogos e scout', 'Competições, duplas e coleta de jogo com toque.'],
  ];

  function montar() {
    document.body.classList.add('sem-sessao');
    let el = document.getElementById('entrada');
    if (!el) { el = document.createElement('div'); el.id = 'entrada'; document.body.appendChild(el); }
    const est = { aba: C.temContas() ? 'entrar' : 'criar', erro: '', campo: '', ocupado: false };

    function desenhar(foco) {
      const criar = est.aba === 'criar';
      el.innerHTML = `
        <div class="en-wrap">
          <aside class="en-lado" aria-hidden="false">
            <div class="en-marca">${FAROL}<div><b>Farol Tático</b><small>Painel do técnico de vôlei de praia</small></div></div>
            <h1>Planeje, treine e jogue com dados na mão.</h1>
            <ul>${PONTOS.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ul>
          </aside>
          <main class="en-card">
            <div class="en-abas" role="tablist" aria-label="Entrar ou criar conta">
              <button role="tab" id="en-t-entrar" aria-selected="${!criar}" data-aba="entrar">Entrar</button>
              <button role="tab" id="en-t-criar" aria-selected="${criar}" data-aba="criar">Criar conta</button>
            </div>
            <form id="en-form" novalidate>
              <h2>${criar ? 'Crie sua conta de técnico' : 'Que bom ver você de novo'}</h2>
              ${criar ? `<div class="field"><label class="label" for="en-nome">Seu nome</label><input class="input" id="en-nome" autocomplete="name" required aria-invalid="${est.campo === 'nome'}" ${est.campo === 'nome' ? 'aria-describedby="en-erro"' : ''}></div>` : ''}
              ${criar ? `<div class="field"><label class="label" for="en-org">Centro de treinamento ou clube <small>(opcional)</small></label><input class="input" id="en-org" autocomplete="organization" maxlength="80"></div>` : ''}
              <div class="field"><label class="label" for="en-email">E-mail</label><input class="input" id="en-email" type="email" autocomplete="email" inputmode="email" required aria-invalid="${est.campo === 'email'}" ${est.campo === 'email' ? 'aria-describedby="en-erro"' : ''}></div>
              <div class="field"><label class="label" for="en-senha">Senha${criar ? ' (mínimo de 8 caracteres)' : ''}</label>
                <div class="en-senha"><input class="input" id="en-senha" type="password" autocomplete="${criar ? 'new-password' : 'current-password'}" required aria-invalid="${est.campo === 'senha'}" ${est.campo === 'senha' ? 'aria-describedby="en-erro"' : ''}>
                <button type="button" class="link-btn" id="en-ver" aria-pressed="false" style="margin:0">Mostrar</button></div></div>
              <p class="en-erro" id="en-erro" role="alert">${esc(est.erro)}</p>
              <button class="btn btn-primary en-ok" type="submit" ${est.ocupado ? 'disabled' : ''}>${est.ocupado ? 'Aguarde…' : criar ? 'Criar conta e começar' : 'Entrar'}</button>
            </form>
            <div class="en-ou"><span>ou</span></div>
            <button class="btn en-demo" id="en-demo" type="button">Ver com dados de exemplo</button>
            <p class="en-nota">Neste momento a conta fica guardada só neste aparelho e navegador. Ela separa os seus dados dos de exemplo, mas ainda não é um login seguro: a sincronização entre aparelhos e a proteção por servidor entram com o Supabase.</p>
          </main>
        </div>`;

      el.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { est.aba = b.dataset.aba; est.erro = ''; est.campo = ''; desenhar(`#en-t-${est.aba}`); }));
      el.querySelector('#en-ver').addEventListener('click', (e) => {
        const i = el.querySelector('#en-senha'); const mostra = i.type === 'password';
        i.type = mostra ? 'text' : 'password'; e.target.textContent = mostra ? 'Ocultar' : 'Mostrar'; e.target.setAttribute('aria-pressed', String(mostra));
      });
      el.querySelector('#en-demo').addEventListener('click', () => { C.entrarDemo(); location.hash = '#inicio'; location.reload(); });
      el.querySelector('#en-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = (id) => { const x = el.querySelector(id); return x ? x.value : ''; };
        const dados = { nome: v('#en-nome'), email: v('#en-email'), senha: v('#en-senha'), org: v('#en-org') };
        est.ocupado = true; el.querySelector('.en-ok').disabled = true;
        const r = criar ? await C.criar(dados) : await C.entrar(dados);
        est.ocupado = false;
        if (r.erro) {
          est.erro = r.erro; est.campo = r.campo || '';
          desenhar(); // mantém o que foi digitado
          el.querySelector('#en-email').value = dados.email; if (el.querySelector('#en-nome')) el.querySelector('#en-nome').value = dados.nome; if (el.querySelector('#en-org')) el.querySelector('#en-org').value = dados.org;
          const f = el.querySelector(`#en-${est.campo}`) || el.querySelector('#en-email'); if (f) f.focus();
          return;
        }
        location.hash = '#inicio';
        location.reload();
      });
      if (foco) { const f = el.querySelector(foco); if (f) f.focus(); } else { const f = el.querySelector(criar ? '#en-nome' : '#en-email'); if (f) f.focus(); }
    }
    desenhar();
  }

  window.Farol.entrar = { montar };
})();
