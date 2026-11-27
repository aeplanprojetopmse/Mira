window.MiraViews = window.MiraViews || {};

window.MiraViews.AdminView = {
  setup() {
    const api = Vue.inject('api');
    const user = Vue.inject('user');
    const setGlobalLoading = Vue.inject('setGlobalLoading');

    const aba = Vue.ref('USUARIOS'); // 'USUARIOS' | 'MESTRES'
    const loading = Vue.ref(false);
    const usuarios = Vue.ref([]);

    // Form Usuário
    const editandoUser = Vue.ref(false);
    const formUser = Vue.reactive({ matricula: '', nome: '', email: '', perfil: 'GERENTE', telefone: '', lotacao: '', senha: 'pmse', ativo: 'TRUE' });
    const userExcluir = Vue.ref(null);
    const confirmMatricula = Vue.ref('');

    // Mestres
    const tabelaMestre = Vue.ref('MUNICIPIOS');
    const mestresData = Vue.ref({ MUNICIPIOS: [], CATALOGO_ESTRATEGIA: [], SETORES_EXECUCAO: [], NATUREZAS_DESPESA: [], BENEFICIARIOS: [] });
    const modoMestre = Vue.ref('CRIAR');
    const regMestre = Vue.reactive({});
    const erroRotaMestres = Vue.ref('');

    const carregarUsuarios = async () => {
      loading.value = true;
      try {
        const res = await api('adminListarUsuarios', { solicitante_matricula: user.matricula });
        if (res.success) usuarios.value = res.usuarios || [];
      } finally {
        loading.value = false;
      }
    };

    const abrirNovoUser = () => {
      editandoUser.value = false;
      Object.assign(formUser, { matricula: '', nome: '', email: '', perfil: 'GERENTE', telefone: '', lotacao: '', senha: 'pmse', ativo: 'TRUE' });
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUserAdmin')).show();
    };

    const abrirEditarUser = (u) => {
      editandoUser.value = true;
      Object.assign(formUser, {
        matricula: u.matricula, nome: u.nome, email: u.email_notificacao || '', perfil: u.perfil,
        telefone: u.telefone || '', lotacao: u.lotacao || '', senha: '', ativo: u.ativo || 'TRUE'
      });
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUserAdmin')).show();
    };

    const salvarUser = async () => {
      if (!formUser.matricula || !formUser.nome) return alert('Matrícula e nome são obrigatórios.');
      setGlobalLoading(true);
      try {
        const action = editandoUser.value ? 'adminEditarUsuario' : 'adminCriarUsuario';
        const res = await api(action, {
          solicitante_matricula: user.matricula,
          ...formUser,
          nova_senha: editandoUser.value ? formUser.senha : undefined
        });
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalUserAdmin'))?.hide();
          await carregarUsuarios();
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    const confirmarExcluirUser = (u) => {
      userExcluir.value = u;
      confirmMatricula.value = '';
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalExcluirUser')).show();
    };

    const executarExcluirUser = async () => {
      if (!userExcluir.value || confirmMatricula.value.trim() !== userExcluir.value.matricula) return;
      setGlobalLoading(true);
      try {
        const res = await api('adminExcluirUsuario', { solicitante_matricula: user.matricula, matricula: userExcluir.value.matricula });
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalExcluirUser'))?.hide();
          await carregarUsuarios();
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    // --- Mestres ---
    const carregarMestres = async () => {
      loading.value = true;
      erroRotaMestres.value = '';
      try {
        const res = await api('adminListarMestres', { solicitante_matricula: user.matricula, tabela: 'TODAS' });
        if (res.success && res.mestres) {
          mestresData.value = res.mestres;
        } else {
          erroRotaMestres.value = res.message || 'Erro ao listar mestres.';
        }
      } catch (e) {
        erroRotaMestres.value = e.message;
      } finally {
        loading.value = false;
      }
    };

    const abrirFormMestre = (modo, registro = {}) => {
      modoMestre.value = modo;
      Object.keys(regMestre).forEach(k => delete regMestre[k]);
      Object.assign(regMestre, { ativo: 'TRUE', uf: 'SE', ano: new Date().getFullYear(), ...registro });
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalMestreAdmin')).show();
    };

    const salvarMestre = async () => {
      setGlobalLoading(true);
      try {
        const res = await api('adminSalvarMestre', {
          solicitante_matricula: user.matricula,
          tabela: tabelaMestre.value,
          modo: modoMestre.value,
          registro: { ...regMestre }
        });
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalMestreAdmin'))?.hide();
          await carregarMestres();
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    const excluirMestre = async (id) => {
      if (!confirm('Confirma exclusão deste registro mestre?')) return;
      setGlobalLoading(true);
      try {
        const res = await api('adminExcluirMestre', { solicitante_matricula: user.matricula, tabela: tabelaMestre.value, id });
        if (res.success) await carregarMestres();
        else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    Vue.onMounted(carregarUsuarios);

    return {
      aba, loading, usuarios, editandoUser, formUser, userExcluir, confirmMatricula,
      tabelaMestre, mestresData, modoMestre, regMestre, erroRotaMestres, user,
      carregarUsuarios, abrirNovoUser, abrirEditarUser, salvarUser, confirmarExcluirUser, executarExcluirUser,
      carregarMestres, abrirFormMestre, salvarMestre, excluirMestre
    };
  },
  template: `
    <div>
      <ul class="nav nav-tabs mb-4">
        <li class="nav-item"><a href="#" class="nav-link fw-bold" :class="{ active: aba==='USUARIOS' }" @click.prevent="aba='USUARIOS'; carregarUsuarios()">Usuários</a></li>
        <li class="nav-item"><a href="#" class="nav-link fw-bold" :class="{ active: aba==='MESTRES' }" @click.prevent="aba='MESTRES'; carregarMestres()">Cadastros Mestres</a></li>
      </ul>

      <!-- ABA USUÁRIOS -->
      <div v-if="aba === 'USUARIOS'">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="m-0 fw-bold text-primary">Usuários do Sistema</h5>
          <button class="btn btn-primary btn-sm fw-bold" @click="abrirNovoUser">+ Novo Usuário</button>
        </div>
        <div class="table-responsive bg-white rounded shadow-sm border">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light"><tr><th>Nome / Matrícula</th><th>Lotação</th><th>Perfil</th><th>Email</th><th>Status</th><th class="text-end">Ações</th></tr></thead>
            <tbody>
              <tr v-for="u in usuarios" :key="u.matricula">
                <td><strong>{{ u.nome }}</strong><div class="text-muted">{{ u.matricula }}</div></td>
                <td>{{ u.lotacao || '-' }}</td>
                <td><span class="badge" :class="u.perfil==='ADMIN'?'bg-danger':'bg-primary'">{{ u.perfil }}</span></td>
                <td>{{ u.email_notificacao || '-' }}</td>
                <td><span class="badge" :class="u.ativo==='TRUE'?'bg-success':'bg-secondary'">{{ u.ativo==='TRUE'?'Ativo':'Inativo' }}</span></td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirEditarUser(u)"><i class="bi bi-pencil"></i></button>
                  <button v-if="u.matricula !== user.matricula" class="btn btn-sm btn-outline-danger" @click="confirmarExcluirUser(u)"><i class="bi bi-trash"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ABA MESTRES -->
      <div v-if="aba === 'MESTRES'">
        <div v-if="erroRotaMestres" class="alert alert-warning small">
          <strong>Aviso Backend:</strong> {{ erroRotaMestres }}. Lembre-se de registrar <code>adminListarMestres</code> e <code>adminExcluirMestre</code> no objeto <code>rotas</code> do <code>Código.gs</code>.
        </div>
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <select v-model="tabelaMestre" class="form-select form-select-sm w-auto fw-bold">
            <option value="MUNICIPIOS">Municípios</option>
            <option value="CATALOGO_ESTRATEGIA">Catálogo Estratégico</option>
            <option value="SETORES_EXECUCAO">Setores de Execução</option>
            <option value="NATUREZAS_DESPESA">Naturezas de Despesa</option>
            <option value="BENEFICIARIOS">Beneficiários</option>
          </select>
          <button class="btn btn-success btn-sm fw-bold" @click="abrirFormMestre('CRIAR')">+ Novo Registro</button>
        </div>

        <div class="table-responsive bg-white rounded shadow-sm border">
          <table class="table table-sm table-hover mb-0 small align-middle">
            <thead class="table-light">
              <tr v-if="tabelaMestre==='MUNICIPIOS'"><th>IBGE</th><th>Município</th><th>UF</th><th>Ativo</th><th class="text-end">Ações</th></tr>
              <tr v-if="tabelaMestre==='CATALOGO_ESTRATEGIA'"><th>Ano</th><th>Eixo</th><th>Objetivo</th><th>Ativo</th><th class="text-end">Ações</th></tr>
              <tr v-if="tabelaMestre==='SETORES_EXECUCAO'"><th>Setor</th><th>Sigla</th><th>Ativo</th><th class="text-end">Ações</th></tr>
              <tr v-if="tabelaMestre==='NATUREZAS_DESPESA'"><th>Código</th><th>Descrição</th><th>Grupo</th><th>Ativo</th><th class="text-end">Ações</th></tr>
              <tr v-if="tabelaMestre==='BENEFICIARIOS'"><th>Descrição</th><th>Categoria</th><th>Ativo</th><th class="text-end">Ações</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in (mestresData[tabelaMestre] || [])" :key="Object.values(r)[0]">
                <template v-if="tabelaMestre==='MUNICIPIOS'"><td>{{ r.codigo_ibge }}</td><td>{{ r.nome_municipio }}</td><td>{{ r.uf }}</td><td>{{ r.ativo }}</td></template>
                <template v-if="tabelaMestre==='CATALOGO_ESTRATEGIA'"><td>{{ r.ano }}</td><td>{{ r.eixo }}</td><td>{{ r.objetivo }}</td><td>{{ r.ativo }}</td></template>
                <template v-if="tabelaMestre==='SETORES_EXECUCAO'"><td>{{ r.nome_setor }}</td><td>{{ r.sigla }}</td><td>{{ r.ativo }}</td></template>
                <template v-if="tabelaMestre==='NATUREZAS_DESPESA'"><td>{{ r.codigo_natureza }}</td><td>{{ r.descricao }}</td><td>{{ r.grupo_despesa }}</td><td>{{ r.ativo }}</td></template>
                <template v-if="tabelaMestre==='BENEFICIARIOS'"><td>{{ r.descricao }}</td><td>{{ r.categoria_publico }}</td><td>{{ r.ativo }}</td></template>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirFormMestre('EDITAR', r)"><i class="bi bi-pencil"></i></button>
                  <button class="btn btn-sm btn-outline-danger" @click="excluirMestre(r[Object.keys(r)[0]])"><i class="bi bi-trash"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL USUÁRIO -->
      <div class="modal fade" id="modalUserAdmin" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title fw-bold">{{ editandoUser ? 'Editar Usuário' : 'Novo Usuário' }}</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div class="row g-2 mb-2">
                <div class="col-5"><label class="small fw-bold">Matrícula *</label><input v-model="formUser.matricula" :disabled="editandoUser" class="form-control"></div>
                <div class="col-7"><label class="small fw-bold">Nome *</label><input v-model="formUser.nome" class="form-control"></div>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-6"><label class="small fw-bold">E-mail</label><input v-model="formUser.email" type="email" class="form-control"></div>
                <div class="col-6"><label class="small fw-bold">Telefone</label><input v-model="formUser.telefone" class="form-control"></div>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-4"><label class="small fw-bold">Lotação</label><input v-model="formUser.lotacao" class="form-control"></div>
                <div class="col-4"><label class="small fw-bold">Perfil</label><select v-model="formUser.perfil" class="form-select"><option value="GERENTE">GERENTE</option><option value="ADMIN">ADMIN</option></select></div>
                <div class="col-4"><label class="small fw-bold">Status</label><select v-model="formUser.ativo" class="form-select"><option value="TRUE">Ativo</option><option value="FALSE">Inativo</option></select></div>
              </div>
              <label class="small fw-bold">{{ editandoUser ? 'Nova Senha (opcional)' : 'Senha Inicial' }}</label>
              <input v-model="formUser.senha" type="text" class="form-control">
            </div>
            <div class="modal-footer"><button class="btn btn-primary" @click="salvarUser">Salvar</button></div>
          </div>
        </div>
      </div>

      <!-- MODAL EXCLUIR USUÁRIO -->
      <div class="modal fade" id="modalExcluirUser" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-danger" v-if="userExcluir">
            <div class="modal-header bg-danger text-white"><h5 class="modal-title">Confirmar Exclusão</h5><button class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <p class="small">Digite a matrícula <strong>{{ userExcluir.matricula }}</strong> para excluir <strong>{{ userExcluir.nome }}</strong>:</p>
              <input v-model="confirmMatricula" class="form-control text-center fw-bold">
            </div>
            <div class="modal-footer"><button class="btn btn-danger" :disabled="confirmMatricula.trim() !== userExcluir.matricula" @click="executarExcluirUser">Excluir</button></div>
          </div>
        </div>
      </div>

      <!-- MODAL MESTRE -->
      <div class="modal fade" id="modalMestreAdmin" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title fw-bold">{{ modoMestre }} • {{ tabelaMestre }}</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <template v-if="tabelaMestre==='MUNICIPIOS'">
                <input v-model="regMestre.codigo_ibge" :disabled="modoMestre==='EDITAR'" class="form-control mb-2" placeholder="Código IBGE *">
                <input v-model="regMestre.nome_municipio" class="form-control mb-2" placeholder="Nome do Município *">
                <input v-model="regMestre.uf" class="form-control mb-2" placeholder="UF (SE)">
              </template>
              <template v-if="tabelaMestre==='CATALOGO_ESTRATEGIA'">
                <input v-model="regMestre.ano" type="number" class="form-control mb-2" placeholder="Ano *">
                <input v-model="regMestre.eixo" class="form-control mb-2" placeholder="Eixo Estratégico *">
                <input v-model="regMestre.objetivo" class="form-control mb-2" placeholder="Objetivo Estratégico *">
              </template>
              <template v-if="tabelaMestre==='SETORES_EXECUCAO'">
                <input v-model="regMestre.nome_setor" class="form-control mb-2" placeholder="Nome do Setor *">
                <input v-model="regMestre.sigla" class="form-control mb-2" placeholder="Sigla">
              </template>
              <template v-if="tabelaMestre==='NATUREZAS_DESPESA'">
                <input v-model="regMestre.codigo_natureza" :disabled="modoMestre==='EDITAR'" class="form-control mb-2" placeholder="Código (ex: 449052) *">
                <input v-model="regMestre.descricao" class="form-control mb-2" placeholder="Descrição *">
                <input v-model="regMestre.grupo_despesa" class="form-control mb-2" placeholder="Grupo (Investimento/Custeio)">
              </template>
              <template v-if="tabelaMestre==='BENEFICIARIOS'">
                <input v-model="regMestre.descricao" class="form-control mb-2" placeholder="Descrição do Público *">
                <input v-model="regMestre.categoria_publico" class="form-control mb-2" placeholder="Categoria (Direto/Indireto)">
              </template>
              <select v-model="regMestre.ativo" class="form-select"><option value="TRUE">Ativo</option><option value="FALSE">Inativo</option></select>
            </div>
            <div class="modal-footer"><button class="btn btn-success" @click="salvarMestre">Salvar</button></div>
          </div>
        </div>
      </div>
    </div>
  `
};