/* Cadastro de equipes e atletas (`equipes-nova` e `equipes-editar`).
   Equipe = o grupo que treina junto. Ela pode reunir mais de uma faixa (Sub-15 e Sub-17) e os dois gêneros, e cada atleta tem a
   própria faixa e o próprio gênero. Quem treina separado vira outra equipe; as duas podem seguir a mesma periodização.
   Uma tela só: dados da equipe e lista de atletas montada na hora (Enter adiciona), ou uma lista colada de uma vez.
   O rascunho só vale ao tocar em Salvar; sair antes não muda nada. */
(function () {
  const { elenco, dados } = window.Farol;
  const { esc, plural } = window.Farol.util;
  const { TURMAS, ATLETAS, cadastro: CAD } = elenco;

  let rascunho = null;

  const novoRascunho = (turmaId) => {
    if (!turmaId) return { id: null, nome: '', faixas: ['Sub-17'], generos: ['M'], atletas: [], removidos: [], erro: '', campo: '' };
    const t = TURMAS[turmaId];
    return { id: t.id, nome: t.nome, faixas: t.faixas.slice(), generos: t.generos.slice(),
      atletas: t.atletas.map((a) => ({ id: a, nome: ATLETAS[a].nome, genero: ATLETAS[a].genero, faixa: ATLETAS[a].faixa })), removidos: [], erro: '', campo: '' };
  };

  const nomeGen = (g) => (g === 'F' ? 'Fem' : 'Masc');

  // Linha da lista colada: "Nome", "Nome, F", "Nome, Sub-17" ou "Nome, F, Sub-17" (em qualquer ordem depois do nome).
  function lerLista(txt, r) {
    return txt.split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const partes = l.split(/[,\t]/).map((x) => x.trim()).filter(Boolean);
      const nome = (partes.shift() || '').replace(/^[\-\*\d\.\)\s]+/, '').trim();
      let genero = r.generos[0], faixa = r.faixas[0];
      partes.forEach((p) => {
        const g = /^([MF])$/i.exec(p), f = r.faixas.find((x) => x.toLowerCase() === p.toLowerCase() || x.replace('Sub-', '') === p.replace(/^sub-?/i, ''));
        if (g && r.generos.includes(g[1].toUpperCase())) genero = g[1].toUpperCase();
        else if (f) faixa = f;
      });
      return { nome, genero, faixa };
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

    root.innerHTML = `
      <header class="page-head"><div>
        <h1>${edicao ? 'Editar equipe' : 'Nova equipe'}</h1>
        <p class="lead">${edicao ? 'Mude o nome, as faixas, os gêneros ou os atletas da equipe.' : 'Uma equipe é o grupo que treina junto. Dê um nome, marque as faixas e os gêneros e cadastre os atletas.'}</p>
      </div></header>

      <form id="ef-form" class="ef" novalidate>
        <section class="card" aria-labelledby="ef-eq-t">
          <div class="card-head"><h2 id="ef-eq-t">1 · A equipe</h2></div>
          <div class="field ef-nome"><label class="label" for="ef-nome">Nome da equipe</label>
            <input class="input" id="ef-nome" value="${esc(r.nome)}" placeholder="ex.: Base da manhã" maxlength="60" autocomplete="off" aria-invalid="${r.campo === 'nome'}" ${r.campo === 'nome' ? 'aria-describedby="ef-erro"' : ''}></div>
          <fieldset class="ef-gen"><legend class="label">Faixas <small>(marque todas as que treinam juntas)</small></legend>
            ${CAD.FAIXAS.map((f) => `<label class="ef-chip"><input type="checkbox" name="ef-faixa" value="${f}" ${r.faixas.includes(f) ? 'checked' : ''}><span>${f}</span></label>`).join('')}
          </fieldset>
          <fieldset class="ef-gen"><legend class="label">Gêneros <small>(marque os dois se treinam juntos)</small></legend>
            ${Object.entries(CAD.GENEROS).map(([k, n]) => `<label class="ef-chip"><input type="checkbox" name="ef-gen" value="${k}" ${r.generos.includes(k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}
          </fieldset>
          <p class="hint" style="margin:10px 0 0">Categorias de competição desta equipe: <b>${esc(CAD.categoriasDe(r.faixas, r.generos).join(', ') || 'nenhuma')}</b>. Quem treina separado deve ser outra equipe; as duas podem seguir a mesma periodização.</p>
        </section>

        <section class="card" aria-labelledby="ef-at-t">
          <div class="card-head"><h2 id="ef-at-t">2 · Os atletas</h2><span class="label num">${plural(r.atletas.length, 'atleta', 'atletas')}</span></div>
          <div class="ef-add">
            <div class="field ef-nome"><label class="label" for="ef-at-nome">Nome do atleta</label>
              <input class="input" id="ef-at-nome" placeholder="ex.: João Vitor Lima" maxlength="60" autocomplete="off"></div>
            ${duasFaixas ? `<div class="field"><label class="label" for="ef-at-faixa">Faixa</label><select class="select" id="ef-at-faixa">${r.faixas.map((f) => `<option>${f}</option>`).join('')}</select></div>` : ''}
            ${doisGen ? `<div class="field"><label class="label" for="ef-at-gen">Gênero</label><select class="select" id="ef-at-gen"><option value="M">Masculino</option><option value="F">Feminino</option></select></div>` : ''}
            <button class="btn btn-primary" type="button" id="ef-add">Adicionar</button>
          </div>
          <p class="hint" id="ef-at-msg" role="status" style="margin:6px 0 0"></p>
          ${r.atletas.length ? `<ul class="ef-lista">${r.atletas.map((a, i) => `<li class="ef-at"><span class="ef-n">${i + 1}</span><span class="ef-nm">${esc(a.nome)}</span>
            ${duasFaixas ? `<select class="select sm ef-sel" data-faixa="${i}" aria-label="Faixa de ${esc(a.nome)}">${r.faixas.map((f) => `<option ${f === a.faixa ? 'selected' : ''}>${f}</option>`).join('')}</select>` : `<span class="ix-chip">${esc(a.faixa)}</span>`}
            ${doisGen ? `<select class="select sm ef-sel" data-gen="${i}" aria-label="Gênero de ${esc(a.nome)}"><option value="M" ${a.genero === 'M' ? 'selected' : ''}>Masc</option><option value="F" ${a.genero === 'F' ? 'selected' : ''}>Fem</option></select>` : ''}
            <button type="button" class="ef-x" data-rem="${i}" aria-label="Remover ${esc(a.nome)}">×</button></li>`).join('')}</ul>`
            : '<p class="vazio" style="padding:8px 0">Nenhum atleta ainda. Adicione acima ou cole uma lista.</p>'}
          <details class="ef-colar"><summary>Colar uma lista de nomes</summary>
            <p class="hint" style="margin:8px 0">Um nome por linha${duasFaixas || doisGen ? `. Depois do nome, separe por vírgula ${doisGen ? 'o gênero (M ou F)' : ''}${duasFaixas && doisGen ? ' e ' : ''}${duasFaixas ? 'a faixa (ex.: Sub-17)' : ''}; sem isso, entra como ${esc(nomeGen(r.generos[0]))}${duasFaixas ? `, ${esc(r.faixas[0])}` : ''}` : ''}.</p>
            <textarea class="input" id="ef-lista" rows="5" placeholder="Lucas Ribeiro${doisGen ? ', M' : ''}${duasFaixas ? `, ${esc(r.faixas[0])}` : ''}&#10;Pedro Alves${doisGen ? ', M' : ''}${duasFaixas ? `, ${esc(r.faixas[r.faixas.length - 1])}` : ''}"></textarea>
            <button class="btn btn-sm" type="button" id="ef-colar" style="margin-top:8px">Adicionar os nomes</button>
          </details>
        </section>

        <p class="en-erro" id="ef-erro" role="alert">${esc(r.erro)}</p>
        <div class="actions ef-rodape">
          <button class="btn btn-primary" type="submit" id="ef-salvar">${edicao ? 'Salvar alterações' : 'Criar equipe'}</button>
          <button class="btn" type="button" id="ef-cancela">Cancelar</button>
          ${edicao && !temPlano ? '<button class="btn btn-danger" type="button" id="ef-excluir" style="margin-left:auto">Excluir equipe</button>' : ''}
        </div>
        ${edicao && temPlano ? '<p class="hint">Esta equipe tem periodização, por isso ainda não dá para excluí-la por aqui.</p>' : ''}
      </form>`;

    const $ = (s) => root.querySelector(s);
    // Lê o que está na tela. Atleta cuja faixa ou gênero foi desmarcado passa para o primeiro que sobrou.
    const ler = () => {
      r.nome = $('#ef-nome').value;
      r.faixas = [...root.querySelectorAll('input[name="ef-faixa"]:checked')].map((i) => i.value);
      r.generos = [...root.querySelectorAll('input[name="ef-gen"]:checked')].map((i) => i.value);
      root.querySelectorAll('[data-faixa]').forEach((s) => { r.atletas[Number(s.dataset.faixa)].faixa = s.value; });
      root.querySelectorAll('[data-gen]').forEach((s) => { r.atletas[Number(s.dataset.gen)].genero = s.value; });
      r.atletas.forEach((a) => { if (r.faixas.length && !r.faixas.includes(a.faixa)) a.faixa = r.faixas[0]; if (r.generos.length && !r.generos.includes(a.genero)) a.genero = r.generos[0]; });
    };
    const refaz = (foco, manterErro) => { ler(); if (!manterErro) { r.erro = ''; r.campo = ''; } const y = window.scrollY; montar(root, { novo: false, turmaId: r.id }); window.scrollTo({ top: y }); if (foco) { const f = root.querySelector(foco); if (f) f.focus(); } };

    root.querySelectorAll('input[name="ef-faixa"], input[name="ef-gen"]').forEach((i) => i.addEventListener('change', () => refaz()));
    root.querySelectorAll('.ef-sel').forEach((s) => s.addEventListener('change', () => refaz()));

    const adicionar = () => {
      ler();
      const nome = $('#ef-at-nome').value.replace(/\s+/g, ' ').trim();
      const msg = $('#ef-at-msg');
      if (!r.faixas.length || !r.generos.length) { msg.textContent = 'Marque ao menos uma faixa e um gênero da equipe antes.'; return; }
      if (nome.length < 2) { msg.textContent = 'Escreva o nome do atleta.'; $('#ef-at-nome').focus(); return; }
      if (r.atletas.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) { msg.textContent = `${nome} já está na lista.`; $('#ef-at-nome').focus(); return; }
      r.atletas.push({ nome, faixa: $('#ef-at-faixa') ? $('#ef-at-faixa').value : r.faixas[0], genero: $('#ef-at-gen') ? $('#ef-at-gen').value : r.generos[0] });
      refaz('#ef-at-nome');
    };
    $('#ef-add').addEventListener('click', adicionar);
    $('#ef-at-nome').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } });
    root.querySelectorAll('[data-rem]').forEach((b) => b.addEventListener('click', () => {
      ler();
      const [a] = r.atletas.splice(Number(b.dataset.rem), 1);
      if (a.id) r.removidos.push(a.id);
      refaz('#ef-at-nome');
    }));
    $('#ef-colar').addEventListener('click', () => {
      ler();
      if (!r.faixas.length || !r.generos.length) { $('#ef-at-msg').textContent = 'Marque ao menos uma faixa e um gênero da equipe antes.'; return; }
      const novos = lerLista($('#ef-lista').value, r);
      let n = 0;
      novos.forEach((x) => { if (!r.atletas.some((a) => a.nome.toLowerCase() === x.nome.toLowerCase())) { r.atletas.push(x); n++; } });
      refaz('#ef-at-nome');
      const m = root.querySelector('#ef-at-msg'); if (m) m.textContent = n ? `${plural(n, 'atleta adicionado', 'atletas adicionados')}.` : 'Nenhum nome novo na lista.';
    });

    $('#ef-cancela').addEventListener('click', () => { const id = r.id; rascunho = null; window.Farol.ir(id ? 'equipe' : 'inicio', id ? { turmaId: id } : null); });
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
      window.Farol.ir('equipe', { turmaId: t.id });
    });
    if (params && params.focoNome) $('#ef-nome').focus();
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['equipes-nova'] = (root) => { rascunho = null; montar(root, { novo: true, focoNome: true }); };
  window.Farol.views['equipes-editar'] = (root, params) => { rascunho = null; montar(root, { novo: true, turmaId: params && params.turmaId }); };
})();
