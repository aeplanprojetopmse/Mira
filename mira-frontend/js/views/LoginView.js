window.MiraViews = window.MiraViews || {};

window.MiraViews.LoginView = {
  emits: ['sucesso-login'],
  setup(props, { emit }) {
    const api = Vue.inject('api');
    const mode = Vue.ref('LOGIN'); // 'LOGIN' | 'RECOVER_REQUEST' | 'RECOVER_CONFIRM'
    const loading = Vue.ref(false);
    const msgErro = Vue.ref('');
    const msgSucesso = Vue.ref('');

    const form = Vue.reactive({
      matricula: '', senha: '', token: '', novaSenha: '', confirmaSenha: ''
    });

    const mudarModo = (novoModo) => {
      mode.value = novoModo;
      msgErro.value = '';
      msgSucesso.value = '';
      form.senha = ''; form.token = ''; form.novaSenha = ''; form.confirmaSenha = '';
    };

    const tentarLogin = async () => {
      if (!form.matricula || !form.senha) {
        msgErro.value = 'Preencha matrícula e senha.';
        return;
      }
      loading.value = true;
      msgErro.value = '';
      try {
        // Backend_Mira espera { matricula, senha }
        const res = await api('login', { matricula: form.matricula, senha: form.senha });
        if (res.success) {
          emit('sucesso-login', res.user);
        } else {
          msgErro.value = res.message || 'Credenciais inválidas ou usuário inativo.';
        }
      } catch (e) {
        msgErro.value = e.message || 'Erro de comunicação ao tentar fazer login.';
      } finally {
        loading.value = false;
      }
    };

    const solicitarToken = async () => {
      if (!form.matricula) {
        msgErro.value = 'Informe sua matrícula para localizar o cadastro.';
        return;
      }
      loading.value = true;
      msgErro.value = '';
      try {
        const res = await api('solicitarRecuperacaoSenha', { matricula: form.matricula });
        if (res.success) {
          msgSucesso.value = `Código enviado para ${res.email}. Verifique sua caixa de entrada.`;
          mudarModo('RECOVER_CONFIRM');
        } else {
          msgErro.value = res.message;
        }
      } catch (e) {
        msgErro.value = e.message || 'Erro ao solicitar o código.';
      } finally {
        loading.value = false;
      }
    };

    const redefinirSenha = async () => {
      if (!form.token || !form.novaSenha) {
        msgErro.value = 'Preencha o código e a nova senha.';
        return;
      }
      if (form.novaSenha !== form.confirmaSenha) {
        msgErro.value = 'As senhas não conferem.';
        return;
      }
      loading.value = true;
      msgErro.value = '';
      try {
        const res = await api('confirmarRedefinicaoSenha', {
          matricula: form.matricula,
          token: form.token,
          novaSenha: form.novaSenha
        });
        if (res.success) {
          alert('Senha alterada com sucesso! Faça login com sua nova senha.');
          mudarModo('LOGIN');
        } else {
          msgErro.value = res.message;
        }
      } catch (e) {
        msgErro.value = e.message || 'Erro ao redefinir senha.';
      } finally {
        loading.value = false;
      }
    };

    return { mode, form, loading, msgErro, msgSucesso, mudarModo, tentarLogin, solicitarToken, redefinirSenha };
  },
  template: `
    <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light p-3">
      <div class="card shadow border-0" style="width: 100%; max-width: 410px;">
        <div class="card-body p-4 p-md-5">
          <div class="text-center mb-4">
            <img src="https://drive.google.com/thumbnail?id=1hC8rZRVcf1Ni91ZlXNxaGvLl-7jGQi2D&sz=w500"
                 alt="Logo MIRA" class="mb-2" style="width: 100%; max-height: 110px; object-fit: contain;">
            <div class="small text-muted fw-bold">MIRA 2.0 • PMSE / AEPLAN</div>
          </div>

          <form v-if="mode === 'LOGIN'" @submit.prevent="tentarLogin">
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Matrícula</label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="bi bi-person-badge"></i></span>
                <input v-model="form.matricula" type="text" class="form-control" placeholder="Apenas números" required>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold text-muted">Senha</label>
              <div class="input-group">
                <span class="input-group-text bg-white"><i class="bi bi-lock"></i></span>
                <input v-model="form.senha" type="password" class="form-control" placeholder="••••••" required>
              </div>
            </div>
            <div class="text-end mb-4">
              <a href="#" class="text-decoration-none small" @click.prevent="mudarModo('RECOVER_REQUEST')">Esqueci minha senha</a>
            </div>
            <div v-if="msgErro" class="alert alert-danger py-2 small text-center mb-3">{{ msgErro }}</div>
            <button type="submit" class="btn btn-dark w-100 fw-bold py-2" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ loading ? 'Entrando...' : 'ENTRAR' }}
            </button>
          </form>

          <form v-if="mode === 'RECOVER_REQUEST'" @submit.prevent="solicitarToken">
            <h5 class="fw-bold text-dark mb-2">Recuperar Senha</h5>
            <p class="small text-muted mb-4">Informe sua matrícula para receber o código de 6 dígitos no e-mail cadastrado.</p>
            <div class="mb-4">
              <label class="form-label small fw-bold text-muted">Matrícula</label>
              <input v-model="form.matricula" type="text" class="form-control" placeholder="Apenas números" required>
            </div>
            <div v-if="msgErro" class="alert alert-danger py-2 small text-center mb-3">{{ msgErro }}</div>
            <button type="submit" class="btn btn-primary w-100 fw-bold py-2 mb-2" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span> Enviar Código
            </button>
            <button type="button" class="btn btn-light w-100 text-muted" @click="mudarModo('LOGIN')">Voltar</button>
          </form>

          <form v-if="mode === 'RECOVER_CONFIRM'" @submit.prevent="redefinirSenha">
            <h5 class="fw-bold text-dark mb-2">Redefinir Senha</h5>
            <div v-if="msgSucesso" class="alert alert-success py-2 small text-center mb-3">{{ msgSucesso }}</div>
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Código de Verificação</label>
              <input v-model="form.token" type="text" class="form-control text-center fw-bold"
                     style="letter-spacing: 5px; font-size: 1.2rem;" placeholder="000000" maxlength="6" required>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold text-muted">Nova Senha</label>
              <input v-model="form.novaSenha" type="password" class="form-control" required>
            </div>
            <div class="mb-4">
              <label class="form-label small fw-bold text-muted">Confirmar Senha</label>
              <input v-model="form.confirmaSenha" type="password" class="form-control" required>
            </div>
            <div v-if="msgErro" class="alert alert-danger py-2 small text-center mb-3">{{ msgErro }}</div>
            <button type="submit" class="btn btn-success w-100 fw-bold py-2 mb-2" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span> Salvar Nova Senha
            </button>
            <button type="button" class="btn btn-light w-100 text-muted" @click="mudarModo('LOGIN')">Cancelar</button>
          </form>
        </div>
      </div>
    </div>
  `
};