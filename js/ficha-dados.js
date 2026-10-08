/* Cadastro pelo atleta sem servidor: o técnico gera um link, o atleta preenche a ficha e devolve um código,
   que o técnico cola no sistema. Tudo que chega de fora é limpo aqui antes de tocar nos dados. */
(function (raiz) {
  const PREFIXO = 'AC1:';

  /* Base64 seguro para URL (aceita acentos). */
  function codificar(obj) {
    const json = JSON.stringify(obj);
    const b64 = typeof Buffer !== 'undefined'
      ? Buffer.from(json, 'utf8').toString('base64')
      : btoa(Array.from(new TextEncoder().encode(json), (b) => String.fromCharCode(b)).join(''));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodificar(texto) {
    try {
      const b64 = String(texto).replace(/-/g, '+').replace(/_/g, '/');
      const bin = typeof Buffer !== 'undefined'
        ? Buffer.from(b64, 'base64').toString('utf8')
        : new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      const o = JSON.parse(bin);
      return o && typeof o === 'object' ? o : null;
    } catch (e) { return null; }
  }

  const texto = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const um = (v, opcoes) => (opcoes.includes(v) ? v : '');
  function data(v, hoje) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
    if (v < '1940-01-01' || (hoje && v > hoje) || isNaN(Date.parse(v))) return '';
    return v;
  }

  /* Só os campos conhecidos, com tamanho e valores limitados. */
  function limpar(d, hoje) {
    d = d && typeof d === 'object' ? d : {};
    const contato = typeof d.contato === 'string' ? d.contato.replace(/[^\d+()\-\s]/g, '').trim().slice(0, 25) : '';
    return {
      id: texto(d.id, 40) || null,
      nome: texto(d.nome, 80),
      sexo: um(d.sexo, ['F', 'M']),
      acao: um(d.acao, ['bloqueio', 'defesa', 'ambos']),
      lado: um(d.lado, ['direito', 'esquerdo', 'ambos']),
      nascimento: data(d.nascimento, hoje),
      contato,
      responsavel: texto(d.responsavel, 120),
      obs: texto(d.obs, 300),
      consentimento: data(d.consentimento, hoje),
    };
  }

  const CURTO = { id: 'i', nome: 'n', sexo: 's', acao: 'a', lado: 'l', nascimento: 'd', contato: 't', responsavel: 'r', obs: 'o', consentimento: 'k' };
  const compactar = (d) => { const o = { v: 1 }; for (const [k, c] of Object.entries(CURTO)) if (d[k]) o[c] = d[k]; return o; };
  const expandir = (o) => { const d = {}; for (const [k, c] of Object.entries(CURTO)) d[k] = o[c]; return d; };

  /* Link que o técnico manda (individual com o atleta já preenchido, ou geral sem ele). */
  function criarLink(base, atleta) {
    const dados = atleta ? { id: atleta.id, nome: atleta.nome, sexo: atleta.sexo, acao: atleta.acao } : {};
    return `${base}#/ficha?d=${codificar(compactar(dados))}`;
  }

  const lerLink = (d, hoje) => { const o = decodificar(d || ''); return o && o.v === 1 ? limpar(expandir(o), hoje) : limpar({}, hoje); };

  /* Código que o atleta devolve. */
  const criarResposta = (dados, hoje) => PREFIXO + codificar(compactar(limpar(dados, hoje)));

  /* Acha todos os códigos num texto colado (mensagem de WhatsApp com vários, por exemplo). */
  function lerRespostas(t, hoje) {
    const achados = String(t || '').match(/AC1:[A-Za-z0-9_-]+/g) || [];
    const vistos = new Set();
    const out = [];
    for (const a of achados) {
      if (vistos.has(a)) continue;
      vistos.add(a);
      const o = decodificar(a.slice(PREFIXO.length));
      if (o && o.v === 1) {
        const d = limpar(expandir(o), hoje);
        if (d.nome) out.push(d);
      }
    }
    return out;
  }

  /* Copia para o atleta só o que veio preenchido. */
  function aplicarResposta(atleta, r) {
    for (const k of ['nome', 'sexo', 'acao', 'lado', 'nascimento', 'contato', 'responsavel', 'obs', 'consentimento']) if (r[k]) atleta[k] = r[k];
    return atleta;
  }

  const API = { codificar, decodificar, limpar, criarLink, lerLink, criarResposta, lerRespostas, aplicarResposta };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else (raiz.AC = raiz.AC || {}).ficha = API;
})(typeof window !== 'undefined' ? window : globalThis);
