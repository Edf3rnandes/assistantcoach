/* Registro do treino (interface).
   O editor é usado em dois lugares: dentro da sessão no microciclo e na tela "Registro do treino".
   O professor lança presença, PSE e PSR de cada atleta da turma e uma nota geral, que pode ser ditada. */
(function () {
  const { dados, util, elenco, registros: REG } = window.Farol;
  const { DIA, dd, dec, esc, num, plural, media, clamp, HOJE } = util;
  const { ATLETAS, PROFS, FUNDAMENTOS } = elenco;
  const { TIPOS_SESSAO, DIAS, TURNOS } = dados;

  const PRESENCAS = { presente: 'Presente', justificada: 'Falta justificada', falta: 'Falta' };
  const turnoNome = (id) => TURNOS.find((t) => t.id === id).nome.toLowerCase();

  /* ---------- Editor ---------- */

  function editor(el, o) {
    const { plano, semana, sessao } = o;
    const existente = REG.obter(plano, semana, sessao);
    const estadoSessao = REG.estado(plano, semana, sessao);
    const data = REG.dataSessao(semana, sessao);
    const tipo = TIPOS_SESSAO[sessao.tipo];
    const meso = plano.mesos.find((m) => m.id === semana.meso);

    const pautaIds = meso ? meso.pauta.fundamentos.map((f) => f.id) : [];
    const base = existente || {
      duracao: sessao.dur,
      professores: plano.professores.slice(0, 2),
      fundamentos: ['tecnica', 'tatica', 'jogo'].includes(sessao.tipo) && meso
        ? meso.pauta.fundamentos.filter((f) => f.prio === 'alta').slice(0, 2).map((f) => f.id) : [],
      notas: '',
      presenca: Object.fromEntries(plano.atletas.map((id) => [id, 'presente'])),
      pse: {}, psr: {}, notasAtleta: {},
    };
    // Chips de fundamentos: os da pauta da fase mais os que o professor marcou.
    const chips = [...new Set([...pautaIds, ...base.fundamentos])];
    const outros = Object.values(FUNDAMENTOS).filter((f) => !chips.includes(f.id));

    el.innerHTML = `
      <form class="reg" id="form-registro" novalidate>
        <div class="reg-head">
          <div>
            <h3>Registro do treino · ${DIAS[sessao.dia]} ${dd(data)}, ${turnoNome(sessao.turno)}</h3>
            <p class="reg-plan"><span class="dot" style="background:var(${tipo.cor})"></span>${esc(tipo.nome)} · planejado ${sessao.dur} min, PSE ${sessao.pse}. ${esc(sessao.obj)}</p>
          </div>
          <span class="chip ${existente ? '' : 'chip-beam'}">${existente ? (existente.origem === 'professor' ? 'registrado pelo professor' : 'registrado') : estadoSessao === 'futuro' ? 'ainda não aconteceu' : 'aguardando registro'}</span>
        </div>

        <div class="reg-meta">
          <div class="field" style="max-width:160px">
            <label class="label" for="rg-dur">Duração real (min)</label>
            <input class="input num" id="rg-dur" type="number" min="20" max="300" step="5" value="${base.duracao}">
          </div>
          <fieldset class="reg-prof">
            <legend class="label">Professores na sessão</legend>
            <div class="checks">
              ${plano.professores.map((pid) => `<label class="check"><input type="checkbox" name="rg-prof" value="${pid}" ${base.professores.includes(pid) ? 'checked' : ''}><span>${esc(PROFS[pid].nome)}</span></label>`).join('')}
            </div>
          </fieldset>
        </div>

        <fieldset class="reg-fund">
          <legend class="label">Fundamentos trabalhados</legend>
          <div class="checks" id="rg-chips">
            ${chips.map((id) => `<label class="check chipcheck"><input type="checkbox" name="rg-fund" value="${id}" ${base.fundamentos.includes(id) ? 'checked' : ''}><span>${esc(FUNDAMENTOS[id].nome)}${pautaIds.includes(id) ? '' : ''}</span></label>`).join('')}
            ${outros.length ? `<select class="select sm" id="rg-mais" aria-label="Adicionar outro fundamento" style="min-width:0;width:auto"><option value="">+ outro fundamento</option>${outros.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select>` : ''}
          </div>
          ${pautaIds.length ? `<p class="hint" style="margin-top:6px">Os primeiros itens vêm da pauta da fase ${esc(meso.nome)}.</p>` : ''}
        </fieldset>

        <div class="reg-atletas">
          <div class="reg-tools">
            <span class="label">Atletas · ${plano.atletas.length}</span>
            <div class="actions">
              <button class="link-btn" type="button" id="rg-todos">Todos presentes</button>
              <button class="link-btn" type="button" id="rg-alvo">Preencher PSE vazio com ${sessao.pse}</button>
            </div>
          </div>
          <div class="reg-grid" role="group" aria-label="Presença, PSE e PSR por atleta">
            <div class="reg-row reg-cab" aria-hidden="true"><span>Atleta</span><span>Presença</span><span>PSE (1 a 10)</span><span>PSR (0 a 10)</span><span>Nota</span></div>
            ${plano.atletas.map((id) => {
              const a = ATLETAS[id];
              const pres = base.presenca[id] || 'presente';
              const ausente = pres !== 'presente';
              return `
              <div class="reg-row" data-atleta="${id}">
                <span class="reg-nome">${esc(a.nome)}</span>
                <label class="reg-cell"><span class="reg-lbl">Presença</span>
                  <select class="select sm" id="rg-pres-${id}" aria-label="Presença de ${esc(a.nome)}">
                    ${Object.entries(PRESENCAS).map(([k, v]) => `<option value="${k}" ${k === pres ? 'selected' : ''}>${v}</option>`).join('')}
                  </select></label>
                <label class="reg-cell"><span class="reg-lbl">PSE</span>
                  <input class="input sm num" id="rg-pse-${id}" type="number" min="1" max="10" step="1" value="${base.pse[id] != null ? base.pse[id] : ''}" ${ausente ? 'disabled' : ''} aria-label="PSE de ${esc(a.nome)}"></label>
                <label class="reg-cell"><span class="reg-lbl">PSR</span>
                  <input class="input sm num" id="rg-psr-${id}" type="number" min="0" max="10" step="1" value="${base.psr[id] != null ? base.psr[id] : ''}" ${ausente ? 'disabled' : ''} aria-label="PSR de ${esc(a.nome)}"></label>
                <label class="reg-cell reg-cell-nota"><span class="reg-lbl">Nota</span>
                  <input class="input sm" id="rg-obs-${id}" type="text" maxlength="120" value="${esc(base.notasAtleta[id] || '')}" placeholder="Opcional" aria-label="Nota sobre ${esc(a.nome)}"></label>
              </div>`;
            }).join('')}
          </div>
          <p class="hint">PSE é o esforço que o atleta sentiu na sessão. PSR é o quanto ele se sente recuperado, e pode ser preenchido depois, antes do treino seguinte.</p>
        </div>

        <div class="field">
          <div class="reg-tools">
            <label class="label" for="rg-notas">Anotações do professor</label>
            <button class="btn btn-sm" type="button" id="rg-ditar" aria-pressed="false">Ditar</button>
          </div>
          <textarea class="input" id="rg-notas" rows="4" placeholder="O que funcionou, o que corrigir, quem precisa de atenção. Dá para digitar ou ditar.">${esc(base.notas)}</textarea>
          <p class="hint" id="rg-ditar-msg" aria-live="polite"></p>
        </div>

        <div class="reg-resumo" id="rg-resumo" aria-live="polite"></div>
        <p class="form-erro" id="rg-erro" role="alert" hidden></p>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Salvar registro</button>
          ${o.onFechar ? '<button class="btn" type="button" id="rg-fechar">Fechar</button>' : ''}
        </div>
      </form>`;

    /* ---- comportamento ---- */
    const $ = (s) => el.querySelector(s);
    const valor = (id) => $(id).value;

    const linha = (id) => ({
      pres: valor(`#rg-pres-${id}`),
      pse: valor(`#rg-pse-${id}`) === '' ? null : Number(valor(`#rg-pse-${id}`)),
      psr: valor(`#rg-psr-${id}`) === '' ? null : Number(valor(`#rg-psr-${id}`)),
    });

    function resumo() {
      const dur = Number(valor('#rg-dur')) || 0;
      const linhas = plano.atletas.map((id) => ({ id, ...linha(id) }));
      const pres = linhas.filter((l) => l.pres === 'presente');
      const pses = pres.map((l) => l.pse).filter((v) => v != null);
      const psrs = pres.map((l) => l.psr).filter((v) => v != null);
      const faltaPse = pres.length - pses.length;
      const faltaPsr = pres.length - psrs.length;
      const cargas = linhas.map((l) => (l.pres === 'presente' && l.pse != null ? dur * l.pse : 0));
      $('#rg-resumo').innerHTML = `
        <span><b class="num">${pres.length}/${linhas.length}</b> presentes</span>
        <span><b class="num">${pses.length ? dec(media(pses)) : 'n/d'}</b> PSE médio <small>(alvo ${sessao.pse})</small></span>
        <span><b class="num">${psrs.length ? dec(media(psrs)) : 'n/d'}</b> PSR médio</span>
        <span><b class="num">${num(media(cargas) || 0)}</b> UA por atleta</span>
        ${faltaPse ? `<span class="aviso">${plural(faltaPse, 'atleta sem PSE', 'atletas sem PSE')}</span>` : ''}
        ${!faltaPse && faltaPsr ? `<span class="aviso">${plural(faltaPsr, 'PSR pendente', 'PSR pendentes')}</span>` : ''}`;
    }

    plano.atletas.forEach((id) => {
      $(`#rg-pres-${id}`).addEventListener('change', (e) => {
        const ausente = e.target.value !== 'presente';
        ['pse', 'psr'].forEach((k) => {
          const inp = $(`#rg-${k}-${id}`);
          inp.disabled = ausente;
          if (ausente) inp.value = '';
        });
        resumo();
      });
      ['pse', 'psr'].forEach((k) => $(`#rg-${k}-${id}`).addEventListener('input', resumo));
    });
    $('#rg-dur').addEventListener('input', resumo);

    $('#rg-todos').addEventListener('click', () => {
      plano.atletas.forEach((id) => {
        const sel = $(`#rg-pres-${id}`);
        sel.value = 'presente';
        $(`#rg-pse-${id}`).disabled = false;
        $(`#rg-psr-${id}`).disabled = false;
      });
      resumo();
    });
    $('#rg-alvo').addEventListener('click', () => {
      plano.atletas.forEach((id) => {
        const inp = $(`#rg-pse-${id}`);
        if (!inp.disabled && inp.value === '') inp.value = sessao.pse;
      });
      resumo();
    });

    const mais = $('#rg-mais');
    if (mais) {
      mais.addEventListener('change', () => {
        if (!mais.value) return;
        const f = FUNDAMENTOS[mais.value];
        const label = document.createElement('label');
        label.className = 'check chipcheck';
        label.innerHTML = `<input type="checkbox" name="rg-fund" value="${f.id}" checked><span>${esc(f.nome)}</span>`;
        $('#rg-chips').insertBefore(label, mais);
        mais.querySelector(`option[value="${f.id}"]`).remove();
        mais.value = '';
        if (mais.options.length === 1) mais.remove();
      });
    }

    // Ditado por voz: usa o reconhecimento de fala do navegador quando houver microfone liberado.
    let rec = null;
    const btn = $('#rg-ditar');
    const msg = $('#rg-ditar-msg');
    function parar() {
      if (rec) { try { rec.stop(); } catch (e) { /* já parado */ } }
      rec = null;
      btn.textContent = 'Ditar';
      btn.setAttribute('aria-pressed', 'false');
    }
    btn.addEventListener('click', () => {
      if (rec) { parar(); msg.textContent = ''; return; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { msg.textContent = 'Este navegador não oferece ditado por voz. Digite a anotação.'; return; }
      try {
        rec = new SR();
        rec.lang = 'pt-BR';
        rec.continuous = true;
        rec.interimResults = false;
        rec.onresult = (ev) => {
          let texto = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) texto += ev.results[i][0].transcript;
          if (texto) {
            const ta = $('#rg-notas');
            ta.value = (ta.value ? ta.value.replace(/\s*$/, ' ') : '') + texto.trim();
          }
        };
        rec.onerror = (ev) => {
          msg.textContent = ev.error === 'not-allowed' || ev.error === 'service-not-allowed'
            ? 'O microfone não foi liberado neste ambiente. Digite a anotação ou abra o painel no navegador.'
            : 'Não deu para ouvir agora. Tente de novo ou digite.';
          parar();
        };
        rec.onend = () => { if (rec) parar(); };
        rec.start();
        btn.textContent = 'Parar de ditar';
        btn.setAttribute('aria-pressed', 'true');
        msg.textContent = 'Ouvindo. Fale a anotação do treino.';
      } catch (e) {
        msg.textContent = 'Não foi possível iniciar o ditado. Digite a anotação.';
        parar();
      }
    });

    resumo();

    $('#form-registro').addEventListener('submit', (ev) => {
      ev.preventDefault();
      parar();
      const erro = $('#rg-erro');
      const dur = Number(valor('#rg-dur'));
      const linhas = plano.atletas.map((id) => ({ id, ...linha(id) }));
      const mostrar = (m, foco) => { erro.textContent = m; erro.hidden = false; if (foco) foco.focus(); };

      if (!(dur >= 20 && dur <= 300)) return mostrar('A duração deve ficar entre 20 e 300 minutos.', $('#rg-dur'));
      if (!linhas.some((l) => l.pres === 'presente')) return mostrar('Marque ao menos um atleta presente.', $(`#rg-pres-${plano.atletas[0]}`));
      for (const l of linhas) {
        if (l.pres !== 'presente') continue;
        const nome = ATLETAS[l.id].nome;
        if (l.pse == null || !Number.isInteger(l.pse) || l.pse < 1 || l.pse > 10) return mostrar(`Informe o PSE de ${nome}, de 1 a 10.`, $(`#rg-pse-${l.id}`));
        if (l.psr != null && (!Number.isInteger(l.psr) || l.psr < 0 || l.psr > 10)) return mostrar(`O PSR de ${nome} deve ficar entre 0 e 10.`, $(`#rg-psr-${l.id}`));
      }

      const reg = {
        duracao: dur,
        professores: [...el.querySelectorAll('input[name="rg-prof"]:checked')].map((i) => i.value),
        fundamentos: [...el.querySelectorAll('input[name="rg-fund"]:checked')].map((i) => i.value),
        notas: valor('#rg-notas').trim(),
        presenca: {}, pse: {}, psr: {}, notasAtleta: {},
      };
      linhas.forEach((l) => {
        reg.presenca[l.id] = l.pres;
        if (l.pres === 'presente') {
          reg.pse[l.id] = l.pse;
          if (l.psr != null) reg.psr[l.id] = l.psr;
        }
        const obs = valor(`#rg-obs-${l.id}`).trim();
        if (obs) reg.notasAtleta[l.id] = obs;
      });

      dados.registrarTreino(plano.id, semana, sessao, reg);
      const pendentes = linhas.filter((l) => l.pres === 'presente' && l.psr == null).length;
      o.onSalvar(`Registro salvo.${pendentes ? ` PSR pendente para ${plural(pendentes, 'atleta', 'atletas')}.` : ''}`);
    });

    const fechar = $('#rg-fechar');
    if (fechar) fechar.addEventListener('click', () => { parar(); o.onFechar(); });
  }

  /* ---------- Tela "Registro do treino" ---------- */

  const estado = { filtro: 'aguardando', dias: 28, abrir: null, aviso: '' };

  function sessoesRegistraveis(plano) {
    const lista = [];
    const ordemTurno = { manha: 0, tarde: 1, noite: 2 };
    plano.semanas.forEach((semana) => {
      semana.sessoes.forEach((s) => {
        const data = REG.dataSessao(semana, s);
        if (data > HOJE || data < HOJE - estado.dias * DIA) return;
        lista.push({ semana, s, data, st: REG.estado(plano, semana, s) });
      });
    });
    return lista.sort((a, b) => b.data - a.data || ordemTurno[b.s.turno] - ordemTurno[a.s.turno]);
  }

  function linhaLista(plano, item) {
    const { semana, s, data, st } = item;
    const tipo = TIPOS_SESSAO[s.tipo];
    const reg = st === 'registrado' ? REG.obter(plano, semana, s) : null;
    const r = reg ? REG.resumoSessao(plano, reg) : null;
    const aberta = estado.abrir && estado.abrir.sessaoId === s.id;
    return `
      <tr data-sel="${aberta}">
        <td class="num" style="white-space:nowrap">${DIAS[s.dia]} ${dd(data)}</td>
        <td>${turnoNome(s.turno)}</td>
        <td><span class="dot" style="background:var(${tipo.cor})"></span><b>${esc(tipo.nome)}</b> <span style="color:var(--ink-2)">${esc(s.obj)}</span></td>
        <td class="num">${r ? `${r.presentes}/${r.total}` : '–'}</td>
        <td class="num">${r && r.pseMedio != null ? `${dec(r.pseMedio)} <small style="color:var(--ink-2)">/ ${s.pse}</small>` : '–'}</td>
        <td class="num">${r && r.psrMedio != null ? dec(r.psrMedio) : '–'}${r && r.psrPendentes ? ` <span class="chip" title="PSR pendente">${r.psrPendentes}</span>` : ''}</td>
        <td>${st === 'registrado' ? '<span class="chip">registrado</span>' : st === 'aguardando' ? '<span class="chip chip-beam">aguardando</span>' : '<span class="chip">sem registro</span>'}</td>
        <td><button class="btn btn-sm" data-abrir="${semana.idx}:${s.id}">${st === 'registrado' ? 'Abrir' : 'Registrar'}</button></td>
      </tr>`;
  }

  function tela(root) {
    const plano = dados.plano(window.Farol.compartilhado.planoId);
    const todos = sessoesRegistraveis(plano);
    const aguardando = todos.filter((x) => x.st === 'aguardando' || x.st === 'semregistro');
    const registrados = todos.filter((x) => x.st === 'registrado');
    const mostrar = estado.filtro === 'aguardando' ? aguardando : estado.filtro === 'registrados' ? registrados : todos;

    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Registro do treino</h1>
          <p class="lead">O que de fato aconteceu em cada sessão do microciclo: presença, PSE e PSR de cada atleta da turma, mais as anotações do professor.</p>
        </div>
        <div class="field">
          <label class="label" for="reg-plano">Turma ou atleta</label>
          <select class="select" id="reg-plano">
            ${dados.planos.map((p) => `<option value="${p.id}" ${p.id === plano.id ? 'selected' : ''}>${esc(p.nome)} (${esc(p.detalhe)})</option>`).join('')}
          </select>
        </div>
      </header>

      ${estado.aviso ? `<div class="aviso-ok" role="status">${esc(estado.aviso)}</div>` : ''}

      <div id="reg-editor"></div>

      <section class="card" aria-labelledby="h-lista">
        <div class="card-head">
          <h2 id="h-lista">Sessões dos últimos ${estado.dias} dias</h2>
          <div class="seg-ctl" role="group" aria-label="Filtro">
            ${[['aguardando', `Aguardando (${aguardando.length})`], ['registrados', `Registrados (${registrados.length})`], ['todos', 'Todos']].map(([k, nome]) => `<button class="seg-btn" data-filtro="${k}" aria-pressed="${estado.filtro === k}">${nome}</button>`).join('')}
          </div>
        </div>
        ${mostrar.length ? `
        <div class="table-scroll">
          <table class="mesos reg-lista">
            <thead><tr><th>Data</th><th>Turno</th><th>Sessão</th><th>Presença</th><th>PSE</th><th>PSR</th><th>Situação</th><th></th></tr></thead>
            <tbody>${mostrar.map((x) => linhaLista(plano, x)).join('')}</tbody>
          </table>
        </div>` : `<p class="vazio">${estado.filtro === 'aguardando' ? 'Nenhuma sessão aguardando registro. Tudo em dia.' : 'Nenhuma sessão neste filtro.'}</p>`}
        <p class="hint"><button class="link-btn" id="reg-mais" style="margin:0">Mostrar mais ${estado.dias} dias</button></p>
      </section>`;

    root.querySelector('#reg-plano').addEventListener('change', (e) => {
      window.Farol.compartilhado.planoId = e.target.value;
      estado.abrir = null; estado.aviso = '';
      tela(root);
    });
    root.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => { estado.filtro = b.dataset.filtro; tela(root); }));
    root.querySelector('#reg-mais').addEventListener('click', () => { estado.dias += 28; tela(root); });

    root.querySelectorAll('[data-abrir]').forEach((b) => b.addEventListener('click', () => {
      const corte = b.dataset.abrir.indexOf(':');
      const si = b.dataset.abrir.slice(0, corte);
      const sid = b.dataset.abrir.slice(corte + 1);
      estado.abrir = { semana: Number(si), sessaoId: sid };
      estado.aviso = '';
      tela(root);
      root.querySelector('#reg-editor').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }));

    if (estado.abrir) {
      const semana = plano.semanas[estado.abrir.semana];
      const sessao = semana && semana.sessoes.find((x) => x.id === estado.abrir.sessaoId);
      if (sessao) {
        const box = root.querySelector('#reg-editor');
        box.innerHTML = '<section class="card editor" id="reg-card"></section>';
        editor(box.querySelector('#reg-card'), {
          plano, semana, sessao,
          onSalvar: (m) => { estado.abrir = null; estado.aviso = m; tela(root); },
          onFechar: () => { estado.abrir = null; tela(root); },
        });
        const semanaLink = document.createElement('p');
        semanaLink.className = 'hint';
        semanaLink.innerHTML = `<button class="link-btn" id="reg-ver-semana" style="margin:0">Ver esta sessão no microciclo da semana ${semana.n}</button>`;
        box.appendChild(semanaLink);
        box.querySelector('#reg-ver-semana').addEventListener('click', () => window.Farol.ir('treinos-periodizacao', { nivel: 'micro', semana: semana.idx, editor: { dia: sessao.dia, turno: sessao.turno, id: sessao.id }, painel: 'registro' }));
      }
    }
  }

  window.Farol.registroUI = { editor };
  window.Farol.views = window.Farol.views || {};
  window.Farol.views['treino-registro'] = tela;
})();
