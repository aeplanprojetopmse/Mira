window.MiraAPI = {
  /**
   * Chama o roteador doPost(e) do Backend_Mira no Google Apps Script.
   * Usa text/plain para evitar bloqueio de CORS Preflight (OPTIONS) no GitHub Pages.
   */
  async call(action, dados = {}) {
    const url = window.MIRA_CONFIG.API_URL;
    if (!url || url.includes('SEU_DEPLOYMENT_ID')) {
      throw new Error('Configure a API_URL do Google Apps Script em js/config.js.');
    }

    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ action, dados })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao comunicar com o servidor.`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Resposta não-JSON do servidor:', text);
      throw new Error('Resposta inválida do servidor Apps Script.');
    }
  },

  // Persistência de sessão (evita deslogar ao dar F5 no GitHub Pages)
  salvarSessao(user) {
    sessionStorage.setItem('mira_user', JSON.stringify(user));
  },
  obterSessao() {
    try {
      const raw = sessionStorage.getItem('mira_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  limparSessao() {
    sessionStorage.removeItem('mira_user');
  }
};