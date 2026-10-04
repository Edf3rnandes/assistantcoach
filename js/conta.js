/* Conta do técnico: cadastro, entrada e saída, e o espaço de dados de cada conta.
   Três situações:
   - sem sessão: o app mostra a tela de entrada;
   - "demo": dados de exemplo, como sempre foi (nada do núcleo é guardado);
   - "conta": o técnico cadastrou a própria equipe; elenco, planos, registros e competições ficam guardados neste aparelho,
     separados por conta (chaves `ft.u.<id>.*`).
   IMPORTANTE: é uma conta local, só para este navegador. Ela separa os dados e guarda a senha com hash (PBKDF2),
   mas NÃO é segurança de verdade: quem tem acesso ao aparelho tem acesso aos dados. O login seguro e a sincronização entre
   aparelhos entram com o Supabase Auth e o schema `ft` no lugar deste arquivo (mesma interface: usuario, entrar, criar, sair). */
(function () {
  const CHAVE = 'ft.conta.v1';
  const enc = new TextEncoder();

  const ler = () => {
    try { const g = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (g && Array.isArray(g.usuarios)) return g; } catch (e) { /* sem armazenamento */ }
    return { usuarios: [], sessao: null };
  };
  let db = ler();
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { /* ignora */ } };

  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const aleatorio = () => hex(crypto.getRandomValues(new Uint8Array(16)));

  // PBKDF2 quando o navegador oferece; sem ele (contexto não seguro), um hash simples que serve só para a demonstração.
  async function hash(senha, sal) {
    if (window.crypto && crypto.subtle) {
      const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
      return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(sal), iterations: 150000 }, chave, 256));
    }
    let h = 2166136261;
    const t = sal + senha;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return `s${(h >>> 0).toString(16)}`;
  }

  const DEMO = { id: 'demo', nome: 'Renato Gomes', email: 'demo@farol.exemplo' };
  const limpoEmail = (e) => String(e || '').trim().toLowerCase();
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  const api = {
    // 'demo', 'conta' ou null (sem sessão)
    modo: () => (db.sessao === 'demo' ? 'demo' : db.sessao ? 'conta' : null),
    usuario() {
      if (db.sessao === 'demo') return DEMO;
      const u = db.usuarios.find((x) => x.id === db.sessao);
      return u ? { id: u.id, nome: u.nome, email: u.email } : null;
    },
    // Chave de armazenamento: a original na demonstração; separada por conta nas contas cadastradas.
    chave: (base) => (db.sessao && db.sessao !== 'demo' ? `ft.u.${db.sessao}.${base}` : base),
    guardaDados: () => !!db.sessao && db.sessao !== 'demo',

    async criar({ nome, email, senha }) {
      nome = String(nome || '').trim(); email = limpoEmail(email);
      if (nome.length < 2) return { erro: 'Informe seu nome.', campo: 'nome' };
      if (!emailOk(email)) return { erro: 'Informe um e-mail válido.', campo: 'email' };
      if (String(senha || '').length < 8) return { erro: 'A senha precisa ter ao menos 8 caracteres.', campo: 'senha' };
      if (db.usuarios.some((u) => u.email === email)) return { erro: 'Já existe uma conta com este e-mail. Use Entrar.', campo: 'email' };
      const sal = aleatorio();
      const u = { id: `u${Date.now().toString(36)}${aleatorio().slice(0, 4)}`, nome, email, sal, hash: await hash(senha, sal), criada: Date.now() };
      db.usuarios.push(u);
      db.sessao = u.id;
      gravar();
      return { ok: true };
    },
    async entrar({ email, senha }) {
      email = limpoEmail(email);
      const u = db.usuarios.find((x) => x.email === email);
      // mesma mensagem para e-mail e senha errados: não revela quais e-mails existem
      if (!u || (await hash(String(senha || ''), u.sal)) !== u.hash) return { erro: 'E-mail ou senha incorretos.', campo: 'senha' };
      db.sessao = u.id;
      gravar();
      return { ok: true };
    },
    entrarDemo() { db.sessao = 'demo'; gravar(); },
    sair() { db.sessao = null; gravar(); },
    temContas: () => db.usuarios.length > 0,
  };

  window.Farol = window.Farol || {};
  window.Farol.conta = api;
})();
