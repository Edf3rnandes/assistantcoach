/* Pauta: fundamentos e ideias de uma temporada ou de uma fase.
   Um fundamento tem prioridade (alta, média ou manutenção) e uma ideia de como trabalhá-lo.
   Além deles, a pauta guarda ideias livres: o que o técnico quer ver naquele período.
   O editor altera o objeto recebido e se redesenha sozinho, sem mexer no resto da tela. */
(function () {
  const { util, elenco } = window.Farol;
  const { esc } = util;
  const { FUNDAMENTOS, GRUPOS_FUNDAMENTO, PRIORIDADES } = elenco;

  let seq = 0;

  function leitura(pauta, vazio) {
    const fs = pauta.fundamentos || [];
    const ideias = pauta.ideias || [];
    if (!fs.length && !ideias.length) return `<p class="vazio" style="padding:8px 0">${esc(vazio || 'Nada definido ainda.')}</p>`;
    const grupo = (prio) => fs.filter((f) => f.prio === prio);
    return `
      ${['alta', 'media', 'manutencao'].map((prio) => grupo(prio).length ? `
        <div class="prio-grupo">
          <span class="label">${PRIORIDADES[prio].nome}</span>
          <ul class="fund-lista">${grupo(prio).map((f) => `<li><span class="chip prio-${prio}">${esc(FUNDAMENTOS[f.id].nome)}</span>${f.ideia ? `<span class="fund-ideia">${esc(f.ideia)}</span>` : ''}</li>`).join('')}</ul>
        </div>` : '').join('')}
      ${ideias.length ? `<div class="prio-grupo"><span class="label">Ideias</span><ul class="ideias">${ideias.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}`;
  }

  function editor(el, pauta, opts = {}) {
    const pre = opts.prefixo || `pt${++seq}`;
    pauta.fundamentos = pauta.fundamentos || [];
    pauta.ideias = pauta.ideias || [];
    const aviso = () => { if (opts.onChange) opts.onChange(pauta); };

    function desenhar(foco) {
      const usados = new Set(pauta.fundamentos.map((f) => f.id));
      const livres = Object.values(FUNDAMENTOS).filter((f) => !usados.has(f.id));
      el.innerHTML = `
        <div class="pauta-ed">
          ${pauta.fundamentos.length ? `
          <ul class="pauta-linhas">
            ${pauta.fundamentos.map((f, i) => `
              <li class="pauta-linha" data-i="${i}">
                <span class="pauta-nome">${esc(FUNDAMENTOS[f.id].nome)}</span>
                <select class="select sm" data-campo="prio" aria-label="Prioridade de ${esc(FUNDAMENTOS[f.id].nome)}" style="min-width:0">
                  ${Object.entries(PRIORIDADES).map(([k, v]) => `<option value="${k}" ${k === f.prio ? 'selected' : ''}>${v.nome}</option>`).join('')}
                </select>
                <input class="input sm" data-campo="ideia" type="text" maxlength="120" value="${esc(f.ideia || '')}" placeholder="Como trabalhar (opcional)" aria-label="Ideia para ${esc(FUNDAMENTOS[f.id].nome)}">
                <button type="button" class="link-btn" style="margin:0" data-rem-f="${i}" aria-label="Remover ${esc(FUNDAMENTOS[f.id].nome)}">Remover</button>
              </li>`).join('')}
          </ul>` : '<p class="vazio" style="padding:6px 0">Nenhum fundamento escolhido.</p>'}
          ${livres.length ? `
          <div class="add-inline">
            <select class="select sm" id="${pre}-add" aria-label="Adicionar fundamento" style="min-width:0">
              <option value="">Adicionar fundamento…</option>
              ${Object.entries(GRUPOS_FUNDAMENTO).map(([g, nome]) => {
                const itens = livres.filter((f) => f.grupo === g);
                return itens.length ? `<optgroup label="${nome}">${itens.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</optgroup>` : '';
              }).join('')}
            </select>
          </div>` : ''}

          <span class="label" style="margin-top:14px;display:block">Ideias para este período</span>
          ${pauta.ideias.length ? `
          <ul class="pauta-linhas">
            ${pauta.ideias.map((t, i) => `
              <li class="pauta-linha pauta-ideia" data-j="${i}">
                <input class="input sm" data-campo="texto" type="text" maxlength="160" value="${esc(t)}" aria-label="Ideia ${i + 1}">
                <button type="button" class="link-btn" style="margin:0" data-rem-i="${i}" aria-label="Remover ideia ${i + 1}">Remover</button>
              </li>`).join('')}
          </ul>` : ''}
          <div class="add-inline">
            <input class="input sm" id="${pre}-nova" type="text" maxlength="160" placeholder="Ex.: toda dupla com plano de saque definido" aria-label="Nova ideia">
            <button type="button" class="btn btn-sm" id="${pre}-btn">Adicionar ideia</button>
          </div>
        </div>`;

      el.querySelectorAll('.pauta-linha[data-i]').forEach((li) => {
        const f = pauta.fundamentos[Number(li.dataset.i)];
        li.querySelector('[data-campo="prio"]').addEventListener('change', (e) => { f.prio = e.target.value; aviso(); });
        li.querySelector('[data-campo="ideia"]').addEventListener('input', (e) => { f.ideia = e.target.value; aviso(); });
      });
      el.querySelectorAll('[data-rem-f]').forEach((b) => b.addEventListener('click', () => {
        pauta.fundamentos.splice(Number(b.dataset.remF), 1);
        aviso();
        desenhar(`#${pre}-add`);
      }));
      const add = el.querySelector(`#${pre}-add`);
      if (add) add.addEventListener('change', () => {
        if (!add.value) return;
        pauta.fundamentos.push({ id: add.value, prio: 'media', ideia: '' });
        aviso();
        desenhar(`#${pre}-add`);
      });

      el.querySelectorAll('.pauta-ideia').forEach((li) => {
        li.querySelector('[data-campo="texto"]').addEventListener('input', (e) => { pauta.ideias[Number(li.dataset.j)] = e.target.value; aviso(); });
      });
      el.querySelectorAll('[data-rem-i]').forEach((b) => b.addEventListener('click', () => {
        pauta.ideias.splice(Number(b.dataset.remI), 1);
        aviso();
        desenhar(`#${pre}-nova`);
      }));
      const nova = el.querySelector(`#${pre}-nova`);
      const incluir = () => {
        const t = nova.value.trim();
        if (!t) { nova.focus(); return; }
        pauta.ideias.push(t);
        aviso();
        desenhar(`#${pre}-nova`);
      };
      el.querySelector(`#${pre}-btn`).addEventListener('click', incluir);
      nova.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); incluir(); } });

      if (foco) { const f = el.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
    }
    desenhar();
  }

  window.Farol.pauta = { leitura, editor };
})();
