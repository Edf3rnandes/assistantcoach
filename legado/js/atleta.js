/* Página do atleta (atleta.html) e a prévia dentro do painel.
   Um link único por turma: o atleta abre, escolhe o próprio nome e responde, sem login.
   Mostra o que ele precisa responder, as próximas competições em que está inscrito e o histórico dele.
   Cuidado de privacidade: o atleta vê só os próprios dados, nunca os dos colegas. */
(function () {
  const { dados, util, elenco, registros: REG, calendario: CAL } = window.Farol;
  const { DIA, dd, esc, plural, HOJE } = util;
  const { ATLETAS, TURMAS } = elenco;
  const { TIPOS_SESSAO, DIAS, TURNOS } = dados;

  const PSE_ROT = { 1: 'Muito fácil', 2: 'Fácil', 3: 'Leve', 4: 'Moderado', 5: 'Um pouco forte', 6: 'Forte', 7: 'Muito forte', 8: 'Muito, muito forte', 9: 'Quase o máximo', 10: 'Máximo' };
  const SONO_ROT = { 1: 'Dormi muito mal', 2: 'Dormi mal', 3: 'Dormi mais ou menos', 4: 'Dormi bem', 5: 'Dormi muito bem' };
  const DISP_ROT = { 1: 'Sem energia', 2: 'Pouca energia', 3: 'Normal', 4: 'Com energia', 5: 'Muito disposto' };
  const ROT = {};
  const PSR_ROT = { 0: 'Exausto', 1: 'Muito cansado', 2: 'Muito cansado', 3: 'Cansado', 4: 'Cansado', 5: 'Mais ou menos', 6: 'Razoável', 7: 'Bem', 8: 'Bem recuperado', 9: 'Quase 100%', 10: 'Totalmente recuperado' };
  ROT.pse = PSE_ROT; ROT.psr = PSR_ROT; ROT.sono = SONO_ROT; ROT.disp = DISP_ROT;
  const turnoNome = (id) => TURNOS.find((t) => t.id === id).nome.toLowerCase();
  const ORDEM_TURNO = { manha: 0, tarde: 1, noite: 2 };
  const recentes = (m, n) => n.data - m.data || ORDEM_TURNO[n.s.turno] - ORDEM_TURNO[m.s.turno];
  const brData = (isoStr) => (isoStr ? `${isoStr.slice(8, 10)}/${isoStr.slice(5, 7)}` : '');

  const guardar = {
    ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } },
  };

  function montar(root, opts) {
    const turma = opts.turmaId ? TURMAS[opts.turmaId] : elenco.turmaPorToken(opts.token);
    const chaveSalva = turma ? `ft.atleta.${turma.id}` : '';
    const st = {
      atletaId: !opts.embutido && turma ? guardar.ler(chaveSalva) : null,
      confirmando: null, abrir: null, aviso: '', form: null,
    };
    if (st.atletaId && !turma.atletas.includes(st.atletaId)) st.atletaId = null;

    const topo = opts.embutido ? '' : `
      <header class="at-top">
        <svg width="28" height="28" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <path d="M3 17 L16 14 V20 Z" fill="#f2a900" opacity=".9"/><path d="M31 17 L18 14 V20 Z" fill="#f2a900" opacity=".55"/>
          <path d="M14 13h4l1.5 17h-7z" style="fill:var(--ink)"/><rect x="14" y="8" width="6" height="5" rx="1" fill="#f2a900"/><path d="M13 8l4-4 4 4z" style="fill:var(--ink)"/>
        </svg>
        <span class="at-marca">Farol Tático</span>
      </header>`;

    function quadro(conteudo) {
      root.innerHTML = `<div class="at-app">${topo}${conteudo}</div>`;
    }

    /* ---------- Link inválido ---------- */

    if (!turma) {
      quadro(`<section class="card at-vazio"><h1>Link inválido</h1>
        <p>Este link não existe ou foi trocado. Peça um link novo ao seu professor.</p></section>`);
      return;
    }

    /* ---------- Escolha do nome ---------- */

    function telaNome() {
      quadro(`
        <section class="at-boasvindas">
          <h1>Quem é você?</h1>
          <p>${esc(turma.nome)}. Toque no seu nome para responder aos treinos.</p>
        </section>
        <ul class="at-nomes">
          ${turma.atletas.map((id) => `<li><button class="at-nome-btn" data-id="${id}">${esc(ATLETAS[id].nome)}</button></li>`).join('')}
        </ul>
        <p class="hint">Escolha só o seu nome. Suas respostas ajudam o professor a ajustar a carga de treino.</p>`);

      root.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => { st.confirmando = b.dataset.id; telaConfirma(); }));
    }

    function telaConfirma() {
      const a = ATLETAS[st.confirmando];
      quadro(`
        <section class="card at-confirma">
          <h1>Você é ${esc(a.nome)}?</h1>
          <p>As respostas que você enviar vão ficar no nome dela ou dele. Confirme só se for você mesmo.</p>
          <div class="actions">
            <button class="btn btn-primary at-grande" id="at-sim">Sim, sou eu</button>
            <button class="btn at-grande" id="at-nao">Voltar</button>
          </div>
        </section>`);
      root.querySelector('#at-nao').addEventListener('click', () => { st.confirmando = null; telaNome(); });
      root.querySelector('#at-sim').addEventListener('click', () => {
        st.atletaId = st.confirmando; st.confirmando = null;
        if (!opts.embutido) guardar.gravar(chaveSalva, st.atletaId);
        telaInicio();
      });
    }

    /* ---------- Início ---------- */

    function sessoesDoPlano(plano) {
      const lista = [];
      plano.semanas.forEach((semana) => semana.sessoes.forEach((s) => lista.push({ semana, s, data: REG.dataSessao(semana, s), st: REG.estado(plano, semana, s) })));
      return lista;
    }

    const rotuloSessao = (x) => {
      const t = TIPOS_SESSAO[x.s.tipo];
      return `<span class="dot" style="background:var(${t.cor})"></span><b>${DIAS[x.s.dia]} ${dd(x.data)}, ${turnoNome(x.s.turno)}</b> · ${esc(t.nome)}`;
    };

    function cartaoPendente(plano, x) {
      const aberta = st.abrir === x.s.id;
      const base = `
        <article class="card at-pend" data-s="${x.s.id}">
          <div class="at-pend-top">
            <div><div class="at-pend-tit">${rotuloSessao(x)}</div>
              <div class="at-pend-obj">${esc(x.s.obj)} · ${x.s.dur} min</div></div>
            ${aberta ? '' : '<button class="btn btn-primary" data-resp="' + x.s.id + '">Responder</button>'}
          </div>`;
      if (!aberta) return base + '</article>';
      const f = st.form;
      return base + `
          <form class="at-form" novalidate>
            <fieldset class="at-bloco">
              <legend class="at-q">Você foi a este treino?</legend>
              <div class="at-duplo">
                <button type="button" class="at-opcao" data-part="1" aria-pressed="${f.participou}">Sim, fui</button>
                <button type="button" class="at-opcao" data-part="0" aria-pressed="${!f.participou}">Não fui</button>
              </div>
            </fieldset>
            <div id="at-campos" ${f.participou ? '' : 'hidden'}>
              <fieldset class="at-bloco">
                <legend class="at-q">Qual foi o esforço do treino?<small>PSE · 1 é muito fácil, 10 é o máximo que você aguenta</small></legend>
                ${escala('pse', 1, 10, f.pse, PSE_ROT)}
              </fieldset>
              <fieldset class="at-bloco">
                <legend class="at-q">Quão recuperado você se sente?<small>PSR · 0 é exausto, 10 é totalmente recuperado</small></legend>
                ${escala('psr', 0, 10, f.psr, PSR_ROT)}
              </fieldset>
              <fieldset class="at-bloco">
                <legend class="at-q">Como você dormiu esta noite?<small>Opcional · 1 é muito mal, 5 é muito bem</small></legend>
                ${escala('sono', 1, 5, f.sono, SONO_ROT)}
              </fieldset>
              <fieldset class="at-bloco">
                <legend class="at-q">Como está a sua disposição hoje?<small>Opcional · 1 é sem energia, 5 é muito disposto</small></legend>
                ${escala('disp', 1, 5, f.disp, DISP_ROT)}
              </fieldset>
              <fieldset class="at-bloco">
                <legend class="at-q">Está com alguma dor?</legend>
                <div class="at-dor" role="radiogroup" aria-label="Dor">
                  ${Object.entries(REG.DOR).map(([k, n]) => `<button type="button" class="at-opcao" role="radio" data-dor="${k}" aria-checked="${f.dor === Number(k)}" aria-pressed="${f.dor === Number(k)}">${n}</button>`).join('')}
                </div>
              </fieldset>
            </div>
            <p class="form-erro" role="alert" hidden></p>
            <div class="actions">
              <button class="btn btn-primary at-grande" type="submit">Enviar resposta</button>
              <button class="btn at-grande" type="button" data-cancelar>Agora não</button>
            </div>
          </form>
        </article>`;
    }

    function escala(nome, min, max, valor, rot) {
      const itens = [];
      for (let v = min; v <= max; v++) {
        itens.push(`<button type="button" class="at-num" role="radio" data-escala="${nome}" data-v="${v}" aria-checked="${valor === v}" aria-pressed="${valor === v}" aria-label="${v}, ${rot[v]}">${v}</button>`);
      }
      return `<div class="at-escala at-escala-${nome}" role="radiogroup">${itens.join('')}</div>
        <p class="at-rotulo" id="at-rot-${nome}" aria-live="polite">${valor == null ? (nome === 'sono' || nome === 'disp' ? 'Opcional: toque num número' : 'Toque num número') : `${valor} · ${rot[valor]}`}</p>`;
    }

    // Treino físico prescrito pelo professor: o atleta vê só o dele, já com as trocas e as cargas individuais.
    function blocoFisico(atletaId) {
      const PR = window.Farol.prescricao;
      if (!PR) return '';
      const lista = PR.doAtleta(atletaId).slice(0, 2);
      if (!lista.length) return '<p class="vazio">Nenhum treino físico prescrito para você agora.</p>';
      return lista.map((p) => {
        const m = PR.plano(p.plano);
        const itens = PR.itensDoAtleta(p, atletaId);
        const trocou = itens.some((x) => x.troca);
        const duvida = itens.filter((x) => x.conflitoFinal);
        const carga = (x) => (x.kg != null ? `${x.kg} kg` : x.it.carga === 'pc' ? 'peso do corpo' : x.it.carga === 'kg' ? (x.it.valor != null ? `${x.it.valor} kg` : 'carga combinada com o professor') : x.it.carga === 'pct' ? `${x.it.valor}% da sua carga máxima` : `esforço ${x.it.valor}`);
        const url = (e) => (/^https?:\/\//i.test(e.video) ? ` · <a href="${esc(e.video)}" target="_blank" rel="noopener noreferrer">ver vídeo</a>` : '');
        return `<article class="card at-fis">
          <div class="at-comp-top"><b class="num">${dd(p.data)}</b><span>${esc(m.nome)}</span></div>
          ${p.nota ? `<div class="at-comp-sub">${esc(p.nota)}</div>` : ''}
          ${duvida.length ? `<p class="at-fis-aviso at-fis-perigo"><b>Atenção:</b> ${plural(duvida.length, 'exercício pode não servir', 'exercícios podem não servir')} para a sua saúde agora. Não faça os marcados sem falar com o professor.</p>` : ''}
          ${trocou ? '<p class="at-fis-aviso">O professor ajustou alguns exercícios por causa da sua saúde. Faça só o que está nesta lista.</p>' : ''}
          <ol class="at-fis-l">${itens.map((x) => `<li><b>${esc(x.efetivo.nome)}</b>${x.troca ? ` <span class="chip">troca</span>` : ''}${x.conflitoFinal ? ` <span class="chip chip-crit">fale com o professor antes</span>` : ''}<small>${x.it.series} × ${esc(x.it.reps)} · ${esc(carga(x))}${x.it.desc ? ` · descanso ${x.it.desc} s` : ''}${url(x.efetivo)}</small><small>${esc(x.efetivo.dica)}</small></li>`).join('')}</ol>
        </article>`;
      }).join('');
    }

    function blocoCompeticoes(atletaId) {
      const itens = [];
      CAL.lista().filter((c) => !CAL.passada(c)).forEach((c) => {
        const p = CAL.plan(c.id);
        const d = p.duplas.find((q) => q.a === atletaId || q.b === atletaId);
        if (!d) return;
        itens.push({ c, p, d, parceiro: ATLETAS[d.a === atletaId ? d.b : d.a] });
      });
      if (!itens.length) return '<p class="vazio">Você ainda não está em nenhuma competição.</p>';
      return itens.slice(0, 3).map(({ c, p, d, parceiro }) => {
        const v = p.viagem;
        const linhas = [];
        if (v.necessaria && (v.saida || v.retorno)) linhas.push(`Viagem: saída ${brData(v.saida) || 'a definir'}, retorno ${brData(v.retorno) || 'a definir'}${v.chegada ? `, chegada ${esc(v.chegada)}` : ''}`);
        if (v.necessaria && v.hospedagem) linhas.push(`Hospedagem: ${esc(v.hospedagem)}`);
        if (v.bateBola.data) linhas.push(`Bate-bola: ${brData(v.bateBola.data)}${v.bateBola.hora ? ` às ${esc(v.bateBola.hora)}` : ''}${v.bateBola.local ? `, ${esc(v.bateBola.local)}` : ''}`);
        return `
          <article class="card at-comp">
            <div class="at-comp-top"><b class="num">${dd(c.data)}</b><span>${esc(c.nome)}</span>
              <span class="chip ${d.status === 'confirmada' ? 'chip-beam' : ''}">${CAL.STATUS_DUPLA[d.status].nome}</span></div>
            <div class="at-comp-sub">${esc(c.local)} · Dupla com ${esc(parceiro.nome)} · ${esc(d.cat)}</div>
            ${linhas.length ? `<ul class="at-comp-lista">${linhas.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
          </article>`;
      }).join('');
    }

    function telaInicio() {
      const a = ATLETAS[st.atletaId];
      const plano = dados.planos.find((p) => p.atletas.includes(a.id));
      const aviso = st.aviso;
      st.aviso = '';

      let corpo = '';
      if (!plano) {
        corpo = '<section class="card at-vazio"><p>Você ainda não tem treinos planejados. Fale com o professor.</p></section>';
      } else {
        const lista = sessoesDoPlano(plano);
        const resp = (x) => REG.respostas(plano, x.semana, x.s)[a.id];
        const pend = lista.filter((x) => x.st === 'aguardando' && !resp(x)).sort(recentes);
        const feitas = lista.filter((x) => resp(x)).sort(recentes).slice(0, 5);
        const prox = lista.filter((x) => x.data > HOJE).sort((m, n) => m.data - n.data).slice(0, 4);

        corpo = `
          <section aria-labelledby="at-h-pend">
            <h2 id="at-h-pend">${pend.length ? `Para responder (${pend.length})` : 'Tudo respondido'}</h2>
            ${pend.length ? pend.map((x) => cartaoPendente(plano, x)).join('') : '<p class="vazio">Você respondeu todos os treinos recentes. Obrigado.</p>'}
          </section>
          <section aria-labelledby="at-h-fis">
            <h2 id="at-h-fis">Meu treino físico</h2>
            ${blocoFisico(a.id)}
          </section>
          <section aria-labelledby="at-h-comp">
            <h2 id="at-h-comp">Minhas competições</h2>
            ${blocoCompeticoes(a.id)}
          </section>
          <section aria-labelledby="at-h-prox">
            <h2 id="at-h-prox">Próximos treinos</h2>
            ${prox.length ? `<ul class="at-lista">${prox.map((x) => `<li><div>${rotuloSessao(x)}</div><small>${esc(x.s.obj)} · ${x.s.dur} min</small></li>`).join('')}</ul>` : '<p class="vazio">Sem treinos marcados.</p>'}
          </section>
          <section aria-labelledby="at-h-hist">
            <h2 id="at-h-hist">Minhas últimas respostas</h2>
            ${feitas.length ? `<ul class="at-lista">${feitas.map((x) => {
              const r = resp(x);
              return `<li><div>${rotuloSessao(x)}</div><small>${r.faltou ? 'Você marcou que não foi' : `Esforço ${r.pse} · recuperação ${r.psr} · ${REG.DOR[r.dor || 0].toLowerCase()}${r.sono ? ` · sono ${r.sono}/5` : ''}${r.disp ? ` · disposição ${r.disp}/5` : ''}`}</small></li>`;
            }).join('')}</ul>` : '<p class="vazio">Nenhuma resposta ainda.</p>'}
          </section>`;
      }

      quadro(`
        <section class="at-boasvindas">
          <h1>Olá, ${esc(a.nome.split(' ')[0])}</h1>
          <p>${esc(turma.nome)}</p>
        </section>
        ${aviso ? `<div class="aviso-ok" role="status">${esc(aviso)}</div>` : ''}
        ${corpo}
        <p class="at-trocar"><button class="link-btn" id="at-trocar" style="margin:0">Não sou ${esc(a.nome.split(' ')[0])}</button></p>`);

      root.querySelector('#at-trocar').addEventListener('click', () => {
        st.atletaId = null; st.abrir = null;
        if (!opts.embutido) guardar.gravar(chaveSalva, null);
        telaNome();
      });
      if (!plano) return;

      root.querySelectorAll('[data-resp]').forEach((b) => b.addEventListener('click', () => {
        st.abrir = b.dataset.resp;
        st.form = { participou: true, pse: null, psr: null, dor: 0, sono: null, disp: null };
        telaInicio();
        const card = root.querySelector(`[data-s="${st.abrir}"]`);
        if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }));

      const card = st.abrir ? root.querySelector(`[data-s="${st.abrir}"]`) : null;
      if (card) {
        const form = card.querySelector('.at-form');
        const x = sessoesDoPlano(plano).find((q) => q.s.id === st.abrir);
        const f = st.form;
        card.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => {
          f.participou = b.dataset.part === '1';
          card.querySelectorAll('[data-part]').forEach((o) => o.setAttribute('aria-pressed', String((o.dataset.part === '1') === f.participou)));
          card.querySelector('#at-campos').hidden = !f.participou;
        }));
        card.querySelectorAll('[data-escala]').forEach((b) => b.addEventListener('click', () => {
          const nome = b.dataset.escala, v = Number(b.dataset.v);
          f[nome] = v;
          card.querySelector('.form-erro').hidden = true;
          card.querySelectorAll(`[data-escala="${nome}"]`).forEach((o) => { const on = Number(o.dataset.v) === v; o.setAttribute('aria-pressed', String(on)); o.setAttribute('aria-checked', String(on)); });
          card.querySelector(`#at-rot-${nome}`).textContent = `${v} · ${ROT[nome][v]}`;
        }));
        card.querySelectorAll('[data-dor]').forEach((b) => b.addEventListener('click', () => {
          f.dor = Number(b.dataset.dor);
          card.querySelectorAll('[data-dor]').forEach((o) => { const on = Number(o.dataset.dor) === f.dor; o.setAttribute('aria-pressed', String(on)); o.setAttribute('aria-checked', String(on)); });
        }));
        card.querySelector('[data-cancelar]').addEventListener('click', () => { st.abrir = null; telaInicio(); });
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const erro = card.querySelector('.form-erro');
          if (f.participou && f.pse == null) { erro.textContent = 'Escolha o esforço do treino (PSE).'; erro.hidden = false; return; }
          if (f.participou && f.psr == null) { erro.textContent = 'Escolha como você se sente de recuperação (PSR).'; erro.hidden = false; return; }
          REG.responder(plano, x.s, a.id, f.participou ? { faltou: false, pse: f.pse, psr: f.psr, dor: f.dor, sono: f.sono, disp: f.disp } : { faltou: true });
          st.abrir = null;
          st.aviso = 'Resposta enviada. Obrigado!';
          telaInicio();
        });
      }
    }

    if (st.atletaId) telaInicio(); else telaNome();
  }

  window.Farol.atletaUI = { montar };
})();
