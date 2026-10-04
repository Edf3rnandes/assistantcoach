/* Cadastro de equipes e atletas (`equipes-nova` e `equipes-editar`).
   Uma tela só, em duas partes: os dados da equipe (nome, faixa e gênero) e a lista de atletas, que se monta na hora:
   digita o nome, toca em Adicionar (ou Enter) e ele entra na lista. Também dá para colar vários nomes de uma vez.
   O rascunho só vale ao tocar em Salvar; sair antes não muda nada. */
(function () {
  const { elenco, dados } = window.Farol;
  const { esc, plural } = window.Farol.util;
  const { TURMAS, ATLETAS, cadastro: CAD } = elenco;

  const NOME_GEN = { M: 'Masculina', F: 'Feminina', X: 'Mista' };
  let rascunho = null;

  const novoRascunho = (turmaId) => {
    if (!turmaId) return { id: null, nome: '', faixa: 'Sub-18', genero: 'M', atletas: [], removidos: [], erro: '', campo: '' };
    const t = TURMAS[turmaId];
    return { id: t.id, nome: t.nome, faixa: t.faixa, genero: t.genero || (t.atletas.length && ATLETAS[t.atletas[0]].genero) || 'X',
      atletas: t.atletas.map((a) => ({ id: a, nome: ATLETAS[a].nome, genero: ATLETAS[a].genero })), removidos: [], erro: '', campo: '' };
  };

  // "Nome" ou "Nome, F" por linha (o sufixo só vale em equipe mista).
  function lerLista(txt, generoEquipe) {
    return txt.split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = /^(.*?)[,\t]\s*([MFmf])\s*$/.exec(l);
      const nome = (m ? m[1] : l).replace(/^[\-\*\d\.\)\s]+/, '').trim();
      const g = m ? m[2].toUpperCase() : generoEquipe === 'X' ? 'M' : generoEquipe;
      return { nome, genero: g };
    }).filter((x) => x.nome.length >= 2);
  }

  function montar(root, params) {
    const turmaId = params && params.turmaId;
    if (!rascunho || (params && params.novo !== false && (rascunho.id || null) !== (turmaId || null))) rascunho = novoRascunho(turmaId);
    if (turmaId && !TURMAS[turmaId]) { window.Farol.ir('inicio'); return; }
    const r = rascunho;
    const edicao = !!r.id;
    const temPlano = edicao && dados.planos.some((p) => p.turma === r.id);

    root.innerHTML = `
      <header class="page-head"><div>
        <h1>${edicao ? 'Editar equipe' : 'Nova equipe'}</h1>
        <p class="lead">${edicao ? 'Mude o nome, a faixa ou os atletas da equipe.' : 'Dê um nome à equipe e cadastre os atletas. Dá para ajustar tudo depois.'}</p>
      </div></header>

      <form id="ef-form" class="ef" novalidate>
        <section class="card" aria-labelledby="ef-eq-t">
          <div class="card-head"><h2 id="ef-eq-t">1 · A equipe</h2></div>
          <div class="ef-linha">
            <div class="field ef-nome"><label class="label" for="ef-nome">Nome da equipe</label>
              <input class="input" id="ef-nome" value="${esc(r.nome)}" placeholder="ex.: Sub-18 Masculino" maxlength="60" autocomplete="off" aria-invalid="${r.campo === 'nome'}" ${r.campo === 'nome' ? 'aria-describedby="ef-erro"' : ''}></div>
            <div class="field"><label class="label" for="ef-faixa">Faixa</label>
              <select class="select" id="ef-faixa">${CAD.FAIXAS.map((f) => `<option ${f === r.faixa ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
          </div>
          <fieldset class="ef-gen"><legend class="label">Gênero da equipe</legend>
            ${Object.entries(NOME_GEN).map(([k, n]) => `<label class="ef-chip"><input type="radio" name="ef-gen" value="${k}" ${r.genero === k ? 'checked' : ''}><span>${n}</span></label>`).join('')}
          </fieldset>
        </section>

        <section class="card" aria-labelledby="ef-at-t">
          <div class="card-head"><h2 id="ef-at-t">2 · Os atletas</h2><span class="label num">${plural(r.atletas.length, 'atleta', 'atletas')}</span></div>
          <div class="ef-add">
            <div class="field ef-nome"><label class="label" for="ef-at-nome">Nome do atleta</label>
              <input class="input" id="ef-at-nome" placeholder="ex.: João Vitor Lima" maxlength="60" autocomplete="off"></div>
            ${r.genero === 'X' ? `<div class="field"><label class="label" for="ef-at-gen">Gênero</label><select class="select" id="ef-at-gen"><option value="M">Masculino</option><option value="F">Feminino</option></select></div>` : ''}
            <button class="btn btn-primary" type="button" id="ef-add">Adicionar</button>
          </div>
          <p class="hint" id="ef-at-msg" role="status" style="margin:6px 0 0"></p>
          ${r.atletas.length ? `<ul class="ef-lista">${r.atletas.map((a, i) => `<li class="ef-at"><span class="ef-n">${i + 1}</span><span class="ef-nm">${esc(a.nome)}</span>${r.genero === 'X' ? `<span class="ix-chip">${a.genero === 'F' ? 'Fem' : 'Masc'}</span>` : ''}<button type="button" class="ef-x" data-rem="${i}" aria-label="Remover ${esc(a.nome)}">×</button></li>`).join('')}</ul>`
            : '<p class="vazio" style="padding:8px 0">Nenhum atleta ainda. Adicione acima ou cole uma lista.</p>'}
          <details class="ef-colar"><summary>Colar uma lista de nomes</summary>
            <p class="hint" style="margin:8px 0">Um nome por linha${r.genero === 'X' ? '. Em equipe mista, escreva ", F" ou ", M" no fim da linha (sem isso, entra como masculino)' : ''}.</p>
            <textarea class="input" id="ef-lista" rows="5" placeholder="Lucas Ribeiro&#10;Pedro Alves&#10;Gabriel Santana"></textarea>
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
    const ler = () => { r.nome = $('#ef-nome').value; r.faixa = $('#ef-faixa').value; const g = root.querySelector('input[name="ef-gen"]:checked'); if (g) r.genero = g.value; };
    const refaz = (foco, manterErro) => { ler(); if (!manterErro) { r.erro = ''; r.campo = ''; } const y = window.scrollY; montar(root, { novo: false, turmaId: r.id }); window.scrollTo({ top: y }); if (foco) { const f = root.querySelector(foco); if (f) f.focus(); } };

    root.querySelectorAll('input[name="ef-gen"]').forEach((i) => i.addEventListener('change', () => { ler(); if (r.genero !== 'X') r.atletas.forEach((a) => { a.genero = r.genero; }); refaz(); }));

    const adicionar = () => {
      ler();
      const nome = $('#ef-at-nome').value.replace(/\s+/g, ' ').trim();
      const msg = $('#ef-at-msg');
      if (nome.length < 2) { msg.textContent = 'Escreva o nome do atleta.'; $('#ef-at-nome').focus(); return; }
      if (r.atletas.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) { msg.textContent = `${nome} já está na lista.`; $('#ef-at-nome').focus(); return; }
      const g = $('#ef-at-gen') ? $('#ef-at-gen').value : r.genero === 'X' ? 'M' : r.genero;
      r.atletas.push({ nome, genero: g });
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
      const novos = lerLista($('#ef-lista').value, r.genero);
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
      const dadosT = { nome: r.nome, faixa: r.faixa, genero: r.genero };
      const res = edicao ? CAD.editarTurma(r.id, dadosT) : CAD.criarTurma(dadosT);
      if (res.erro) { r.erro = res.erro; r.campo = res.campo || ''; refaz('#ef-nome', true); return; }
      const t = res.turma;
      r.removidos.forEach((a) => CAD.removerAtleta(a));
      r.atletas.forEach((a) => {
        if (a.id) { CAD.renomearAtleta(a.id, a.nome); ATLETAS[a.id].genero = a.genero; }
        else CAD.adicionarAtleta(t.id, { nome: a.nome, genero: a.genero });
      });
      if (dados.recarregar) dados.recarregar();
      rascunho = null;
      window.Farol.compartilhado.equipeId = t.id;
      window.Farol.ir('equipe', { turmaId: t.id });
    });
    const foco = params && params.focoNome ? '#ef-nome' : null;
    if (foco) $(foco).focus();
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['equipes-nova'] = (root) => { rascunho = null; montar(root, { novo: true, focoNome: true }); };
  window.Farol.views['equipes-editar'] = (root, params) => { rascunho = null; montar(root, { novo: true, turmaId: params && params.turmaId }); };
})();
