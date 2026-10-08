/* Cadastro de equipes e atletas (`equipes-nova` e `equipes-editar`), numa tela só.
   Equipe = o grupo que treina junto. Ela pode reunir mais de uma faixa (Sub-15 e Sub-17) e os dois gêneros.
   Quem treina separado vira outra equipe; as duas podem seguir a mesma periodização.
   Cada atleta entra com nome e, de preferência, a data de nascimento: a faixa sai dela (e muda sozinha quando o ano vira).
   Sem data, a faixa é escolhida à mão e a ficha do atleta fica marcada como incompleta.
   O rascunho só vale ao tocar em Salvar; sair antes não muda nada. */
(function () {
  const { elenco, dados } = window.Farol;
  const { esc, plural, dd, HOJE } = window.Farol.util;
  const { TURMAS, ATLETAS, cadastro: CAD } = elenco;

  let rascunho = null;

  const novoRascunho = (turmaId) => {
    if (!turmaId) return { id: null, nome: '', faixas: ['Sub-17'], generos: ['M'], atletas: [], removidos: [], erro: '', campo: '' };
    const t = TURMAS[turmaId];
    return { id: t.id, nome: t.nome, faixas: t.faixas.slice(), generos: t.generos.slice(),
      atletas: t.atletas.map((a) => ({ id: a, nome: ATLETAS[a].nome, genero: ATLETAS[a].genero, faixa: ATLETAS[a].faixa, nascimento: ATLETAS[a].nascimento || '' })), removidos: [], erro: '', campo: '' };
  };

  const brData = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  // "04/08/2011" (ou 4-8-2011, 4.8.2011) vira "2011-08-04"; fora disso, vazio.
  const isoData = (txt) => {
    const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(String(txt).trim());
    if (!m) return '';
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return CAD.nascimentoValido(iso) ? iso : '';
  };
  const ordenar = (faixas) => faixas.slice().sort((x, y) => CAD.idadeLimite(x) - CAD.idadeLimite(y));
  const cat = (a) => `${a.faixa} ${a.genero === 'F' ? 'Fem' : 'Masc'}`;

  // Linha da lista colada: "Nome", "Nome, 04/08/2011", "Nome, F", "Nome, Sub-17" ou tudo junto, em qualquer ordem depois do nome.
  function lerLista(txt, r) {
    return txt.split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const partes = l.split(/[,\t]/).map((x) => x.trim()).filter(Boolean);
      const nome = (partes.shift() || '').replace(/^[\-\*\d\.\)\s]+/, '').trim();
      let genero = r.generos[0], faixa = r.faixas[0], nascimento = '';
      partes.forEach((p) => {
        const g = /^([MF])$/i.exec(p), f = CAD.FAIXAS.find((x) => x.toLowerCase() === p.toLowerCase() || x.replace('Sub-', '') === p.replace(/^sub-?/i, ''));
        const d = isoData(p);
        if (d) nascimento = d;
        else if (g && r.generos.includes(g[1].toUpperCase())) genero = g[1].toUpperCase();
        else if (f) faixa = f;
      });
      if (nascimento) faixa = CAD.faixaPorNascimento(nascimento);
      return { nome, genero, faixa, nascimento };
    }).filter((x) => x.nome.length >= 2);
  }

  function montar(root, params) {
    const turmaId = params && params.turmaId;
    if (turmaId && !TURMAS[turmaId]) { window.Farol.ir('inicio'); return; }
    if (!rascunho || (params && params.novo !== false && (rascunho.id || null) !== (turmaId || null))) rascunho = novoRascunho(turmaId);
    const r = rascunho;
    const edicao = !!r.id;
    const temPlano = edicao && dados.planos.some((p) => (p.turmas || [p.turma]).includes(r.id));
    const duasFaixas = r.faixas.length > 1, doisGen = r.generos.length > 1;
    const hojeIso = new Date(HOJE).toISOString().slice(0, 10);

    root.innerHTML = `
      <header class="page-head"><div>
        <h1>${edicao ? 'Editar equipe' : 'Nova equipe'}</h1>
        <p class="lead">${edicao ? 'Mude o nome, as faixas, os gêneros ou os atletas da equipe.' : 'Uma equipe é o grupo que treina junto. O resto da ficha de cada atleta você completa depois.'}</p>
      </div></header>

      <form id="ef-form" class="ef" novalidate>
        <section class="card" aria-labelledby="ef-eq-t">
          <div class="card-head"><h2 id="ef-eq-t">A equipe</h2></div>
          <div class="field ef-nome"><label class="label" for="ef-nome">Nome da equipe</label>
            <input class="input" id="ef-nome" value="${esc(r.nome)}" placeholder="ex.: Base da manhã" maxlength="60" autocomplete="off" aria-invalid="${r.campo === 'nome'}" ${r.campo === 'nome' ? 'aria-describedby="ef-erro"' : ''}></div>
          <fieldset class="ef-gen"><legend class="label">Faixas <small>(marque todas as que treinam juntas)</small></legend>
            ${CAD.FAIXAS.map((f) => `<label class="ef-chip"><input type="checkbox" name="ef-faixa" value="${f}" ${r.faixas.includes(f) ? 'checked' : ''}><span>${f}</span></label>`).join('')}
          </fieldset>
          <fieldset class="ef-gen"><legend class="label">Gêneros <small>(marque os dois se treinam juntos)</small></legend>
            ${Object.entries(CAD.GENEROS).map(([k, n]) => `<label class="ef-chip"><input type="checkbox" name="ef-gen" value="${k}" ${r.generos.includes(k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}
          </fieldset>
          <p class="hint ef-cats">Categorias de competição desta equipe: <b>${esc(CAD.categoriasDe(r.faixas, r.generos).join(' · ') || 'nenhuma')}</b></p>
        </section>

        <section class="card" aria-labelledby="ef-at-t">
          <div class="card-head"><h2 id="ef-at-t">Atletas</h2><span class="label num">${plural(r.atletas.length, 'atleta', 'atletas')}</span></div>
          <details class="ef-colar" ${r.atletas.length ? '' : 'open'}><summary>Colar uma lista de nomes</summary>
            <p class="hint" style="margin:8px 0">Um atleta por linha: nome e data de nascimento (dd/mm/aaaa).${doisGen ? ' Se a equipe tem os dois gêneros, acrescente M ou F.' : ''} A faixa sai da data.</p>
            <textarea class="input" id="ef-lista" rows="5" placeholder="Lucas Ribeiro, 04/08/2011${doisGen ? ', M' : ''}&#10;Alice Torres, 19/01/2011${doisGen ? ', F' : ''}"></textarea>
            <button class="btn btn-sm" type="button" id="ef-colar" style="margin-top:8px">Adicionar à lista</button>
          </details>
          <div class="ef-add">
            <div class="field ef-nome"><label class="label" for="ef-at-nome">Nome do atleta</label>
              <input class="input" id="ef-at-nome" placeholder="ex.: João Vitor Lima" maxlength="60" autocomplete="off"></div>
            <div class="field"><label class="label" for="ef-at-nasc">Nascimento</label><input class="input" type="date" id="ef-at-nasc" min="1940-01-01" max="${hojeIso}"></div>
            ${duasFaixas ? `<div class="field"><label class="label" for="ef-at-faixa">Faixa <small>(sem data)</small></label><select class="select" id="ef-at-faixa">${r.faixas.map((f) => `<option>${f}</option>`).join('')}</select></div>` : ''}
            ${doisGen ? `<div class="field"><label class="label" for="ef-at-gen">Gênero</label><select class="select" id="ef-at-gen"><option value="M">Masculino</option><option value="F">Feminino</option></select></div>` : ''}
            <button class="btn btn-primary" type="button" id="ef-add">Adicionar</button>
          </div>
          <p class="hint" id="ef-at-msg" role="status" style="margin:6px 0 0"></p>
          ${r.atletas.length ? `<ul class="ef-lista">${r.atletas.map((a, i) => `<li class="ef-at"><span class="ef-n">${i + 1}</span><span class="ef-nm">${esc(a.nome)}</span>
            <input class="input sm ef-nasc" type="date" data-nasc="${i}" value="${esc(a.nascimento || '')}" min="1940-01-01" max="${hojeIso}" aria-label="Nascimento de ${esc(a.nome)}">
            ${a.nascimento ? `<span class="ix-chip" title="Faixa calculada pela data de nascimento">${esc(a.faixa)}</span>`
              : duasFaixas ? `<select class="select sm ef-sel" data-faixa="${i}" aria-label="Faixa de ${esc(a.nome)}">${r.faixas.map((f) => `<option ${f === a.faixa ? 'selected' : ''}>${f}</option>`).join('')}</select>` : `<span class="ix-chip">${esc(a.faixa)}</span>`}
            ${doisGen ? `<select class="select sm ef-sel" data-gen="${i}" aria-label="Gênero de ${esc(a.nome)}"><option value="M" ${a.genero === 'M' ? 'selected' : ''}>Masc</option><option value="F" ${a.genero === 'F' ? 'selected' : ''}>Fem</option></select>` : ''}
            <button type="button" class="ef-x" data-rem="${i}" aria-label="Remover ${esc(a.nome)}">×</button></li>`).join('')}</ul>
            <p class="hint" style="margin:8px 0 0">${r.atletas.filter((a) => !a.nascimento).length ? `${plural(r.atletas.filter((a) => !a.nascimento).length, 'atleta sem data de nascimento', 'atletas sem data de nascimento')}: a faixa fica manual até você preencher.` : 'A faixa de cada atleta vem da data de nascimento e acompanha o ano.'}</p>`
            : '<p class="vazio" style="padding:8px 0">Nenhum atleta ainda. Cole uma lista ou adicione um a um.</p>'}
        </section>

        <p class="en-erro" id="ef-erro" role="alert">${esc(r.erro)}</p>
        <div class="actions ef-rodape">
          <button class="btn btn-primary btn-grande" type="submit" id="ef-salvar">${edicao ? 'Salvar alterações' : r.atletas.length ? `Criar equipe com ${plural(r.atletas.length, 'atleta', 'atletas')}` : 'Criar equipe'}</button>
          <button class="btn" type="button" id="ef-cancela">Cancelar</button>
          ${edicao && !temPlano ? '<button class="btn btn-danger" type="button" id="ef-excluir" style="margin-left:auto">Excluir equipe</button>' : ''}
        </div>
        ${edicao && temPlano ? '<p class="hint">Esta equipe tem periodização, por isso ainda não dá para excluí-la por aqui.</p>' : ''}
      </form>`;

    const $ = (s) => root.querySelector(s);
    // Lê o que está na tela. Quem tem data de nascimento tem a faixa calculada; os demais passam para a primeira faixa marcada se a deles saiu.
    const ler = () => {
      r.nome = $('#ef-nome').value;
      r.faixas = ordenar([...root.querySelectorAll('input[name="ef-faixa"]:checked')].map((i) => i.value));
      r.generos = [...root.querySelectorAll('input[name="ef-gen"]:checked')].map((i) => i.value);
      root.querySelectorAll('[data-nasc]').forEach((s) => { const a = r.atletas[Number(s.dataset.nasc)]; a.nascimento = CAD.nascimentoValido(s.value) ? s.value : ''; });
      root.querySelectorAll('[data-faixa]').forEach((s) => { r.atletas[Number(s.dataset.faixa)].faixa = s.value; });
      root.querySelectorAll('[data-gen]').forEach((s) => { r.atletas[Number(s.dataset.gen)].genero = s.value; });
      r.atletas.forEach((a) => {
        if (a.nascimento && a.faixa !== 'Master') { a.faixa = CAD.faixaPorNascimento(a.nascimento); if (!r.faixas.includes(a.faixa)) r.faixas = ordenar([...r.faixas, a.faixa]); }
        else if (r.faixas.length && !r.faixas.includes(a.faixa)) a.faixa = r.faixas[0];
        if (r.generos.length && !r.generos.includes(a.genero)) a.genero = r.generos[0];
      });
    };
    const refaz = (foco, manterErro, semLer) => { if (!semLer) ler(); if (!manterErro) { r.erro = ''; r.campo = ''; } const y = window.scrollY; montar(root, { novo: false, turmaId: r.id }); window.scrollTo({ top: y }); if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); } };

    root.querySelectorAll('input[name="ef-faixa"], input[name="ef-gen"]').forEach((i) => i.addEventListener('change', () => refaz()));
    root.querySelectorAll('.ef-sel').forEach((s) => s.addEventListener('change', () => refaz()));
    root.querySelectorAll('[data-nasc]').forEach((s) => s.addEventListener('change', () => refaz()));

    const adicionar = () => {
      ler();
      const nome = $('#ef-at-nome').value.replace(/\s+/g, ' ').trim();
      const nasc = $('#ef-at-nasc').value;
      const msg = $('#ef-at-msg');
      if (nome.length < 2) { msg.textContent = 'Escreva o nome do atleta.'; $('#ef-at-nome').focus(); return; }
      if (nasc && !CAD.nascimentoValido(nasc)) { msg.textContent = 'Confira a data de nascimento.'; $('#ef-at-nasc').focus(); return; }
      if (!nasc && (!r.faixas.length)) { msg.textContent = 'Marque uma faixa da equipe ou informe a data de nascimento.'; return; }
      if (!r.generos.length) { msg.textContent = 'Marque ao menos um gênero da equipe antes.'; return; }
      if (r.atletas.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) { msg.textContent = `${nome} já está na lista.`; $('#ef-at-nome').focus(); return; }
      r.atletas.push({ nome, nascimento: nasc || '', faixa: nasc ? CAD.faixaPorNascimento(nasc) : $('#ef-at-faixa') ? $('#ef-at-faixa').value : r.faixas[0], genero: $('#ef-at-gen') ? $('#ef-at-gen').value : r.generos[0] });
      refaz('#ef-at-nome');
    };
    $('#ef-add').addEventListener('click', adicionar);
    $('#ef-at-nome').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } });
    root.querySelectorAll('[data-rem]').forEach((b) => b.addEventListener('click', () => {
      ler();
      const [a] = r.atletas.splice(Number(b.dataset.rem), 1);
      if (a.id) r.removidos.push(a.id);
      refaz('#ef-at-nome', false, true);
    }));
    $('#ef-colar').addEventListener('click', () => {
      ler();
      if (!r.generos.length) { $('#ef-at-msg').textContent = 'Marque ao menos um gênero da equipe antes.'; return; }
      const novos = lerLista($('#ef-lista').value, r);
      let n = 0;
      novos.forEach((x) => {
        if (!x.nascimento && !r.faixas.length) return;
        if (!r.atletas.some((a) => a.nome.toLowerCase() === x.nome.toLowerCase())) { r.atletas.push(x); n++; }
      });
      refaz('#ef-at-nome');
      const m = root.querySelector('#ef-at-msg'); if (m) m.textContent = n ? `${plural(n, 'atleta adicionado', 'atletas adicionados')}.` : 'Nenhum nome novo na lista.';
    });

    $('#ef-cancela').addEventListener('click', () => { const id = r.id; rascunho = null; if (id) { const pl = window.Farol.equipes.planoDe(TURMAS[id]); window.Farol.ir('treinos-periodizacao', pl ? { planoId: pl.id, nivel: 'atletas' } : null); } else window.Farol.ir('inicio'); });
    const ex = $('#ef-excluir');
    if (ex) ex.addEventListener('click', () => {
      if (!ex.dataset.confirma) { ex.dataset.confirma = '1'; ex.textContent = 'Excluir mesmo? Toque de novo'; return; }
      CAD.excluirTurma(r.id); rascunho = null; window.Farol.ir('inicio');
    });

    $('#ef-form').addEventListener('submit', (e) => {
      e.preventDefault();
      ler();
      const res = CAD.salvarEquipe({ id: r.id, nome: r.nome, faixas: r.faixas, generos: r.generos, atletas: r.atletas, removidos: r.removidos });
      if (res.erro) { r.erro = res.erro; r.campo = res.campo || ''; refaz(res.campo === 'nome' ? '#ef-nome' : null, true); return; }
      const t = res.turma;
      if (dados.recarregar) dados.recarregar();
      rascunho = null;
      window.Farol.compartilhado.equipeId = t.id;
      // Equipe nova segue para a periodização (a tela de criar já vem com ela marcada); equipe editada volta aos atletas.
      window.Farol.ir('equipe', { turmaId: t.id });
    });
    if (params && params.focoNome) $('#ef-nome').focus();
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['equipes-nova'] = (root) => { rascunho = null; montar(root, { novo: true, focoNome: true }); };
  window.Farol.views['equipes-editar'] = (root, params) => { rascunho = null; montar(root, { novo: true, turmaId: params && params.turmaId }); };
})();
