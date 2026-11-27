window.MiraViews = window.MiraViews || {};

window.MiraViews.ResumoView = {
  setup() {
    const api = Vue.inject('api');
    const user = Vue.inject('user');
    const setGlobalLoading = Vue.inject('setGlobalLoading');

    const loading = Vue.ref(false);
    const itens = Vue.ref([]);
    const usuarios = Vue.ref([]);
    const setores = Vue.ref([]);
    const termoBusca = Vue.ref('');
    const filtroTipo = Vue.ref('TODOS');
    const itemAberto = Vue.ref(null);
    const tempColab = Vue.ref('');

    const itemEditMeta = Vue.ref(null);
    const novaMeta = Vue.reactive({ descricao: '', qtd_alvo: '', unidade_medida: 'Unid' });
    const novoGerente = Vue.reactive({ matricula: '', nome: '', email: '', lotacao: '', senha: 'pmse' });

    const carregarTudo = async () => {
      loading.value = true;
      try {
        const res = await api('listarDadosResumo', { solicitante_matricula: user.matricula });
        if (res.success) {
          itens.value = res.itens || [];
          usuarios.value = res.usuarios || [];
          setores.value = res.setores || [];
        } else alert(res.message);
      } finally {
        loading.value = false;
      }
    };

    const itensFiltrados = Vue.computed(() =>
      itens.value.filter(i => {
        const txt = String(i.nome || '').toLowerCase().includes(termoBusca.value.toLowerCase());
        const tipo = filtroTipo.value === 'TODOS' || i.tipo === filtroTipo.value;
        return txt && tipo;
      })
    );

    const addColab = (item) => {
      if (!tempColab.value) return;
      if (!item.setores_colaboradores.includes(tempColab.value)) {
        item.setores_colaboradores.push(tempColab.value);
      }
      tempColab.value = '';
    };

    const nomeSetor = (idSetor) => {
      const s = setores.value.find(x => x.id_setor === idSetor);
      return s ? (s.sigla ? `${s.sigla} - ${s.nome_setor}` : s.nome_setor) : idSetor;
    };

    const prepararAddMeta = (item) => {
      itemEditMeta.value = item;
      Object.assign(novaMeta, { descricao: '', qtd_alvo: '', unidade_medida: 'Unid' });
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalMetaResumo')).show();
    };

    const confirmarAddMeta = () => {
      if (!novaMeta.descricao || !novaMeta.qtd_alvo || !itemEditMeta.value) return;
      itemEditMeta.value.metas.push({
        id_meta: 'temp_' + Date.now(),
        codigo_meta: `M.${String(itemEditMeta.value.metas.length + 1).padStart(2, '0')}`,
        descricao: novaMeta.descricao,
        unidade_medida: novaMeta.unidade_medida,
        qtd_alvo: Number(novaMeta.qtd_alvo),
        matricula_responsavel: ''
      });
      bootstrap.Modal.getInstance(document.getElementById('modalMetaResumo'))?.hide();
    };

    const salvarItem = async (item) => {
      setGlobalLoading(true);
      try {
        const res = await api('salvarDadosResumo', {
          solicitante_matricula: user.matricula,
          id: item.id,
          entidade: item.entidade,
          matricula_gerente: item.matricula_gerente,
          id_setor_responsavel: item.id_setor_responsavel,
          setores_colaboradores: item.setores_colaboradores,
          metas: item.metas
        });
        if (res.success) {
          itemAberto.value = null;
          await carregarTudo();
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    const criarGerenteRapido = async () => {
      if (!novoGerente.matricula || !novoGerente.nome) return alert('Matrícula e nome são obrigatórios.');
      setGlobalLoading(true);
      try {
        const res = await api('adminCriarUsuario', {
          solicitante_matricula: user.matricula,
          ...novoGerente,
          perfil: 'GERENTE'
        });
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalGerenteResumo'))?.hide();
          Object.assign(novoGerente, { matricula: '', nome: '', email: '', lotacao: '', senha: 'pmse' });
          await carregarTudo();
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    Vue.onMounted(carregarTudo);

    return {
      loading, itensFiltrados, usuarios, setores, termoBusca, filtroTipo, itemAberto, tempColab,
      novaMeta, novoGerente,
      carregarTudo, addColab, nomeSetor, prepararAddMeta, confirmarAddMeta, salvarItem, criarGerenteRapido
    };
  },
  template: `
    <div>
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h4 class="fw-bold m-0"><i class="bi bi-grid-1x2-fill me-2 text-primary"></i>DashResumo</h4>
          <small class="text-muted">Gestão rápida de Gerentes, Setores e Donos de Metas</small>
        </div>
        <button class="btn btn-primary btn-sm fw-bold" data-bs-toggle="modal" data-bs-target="#modalGerenteResumo">
          <i class="bi bi-person-plus me-1"></i> Novo Gerente
        </button>
      </div>

      <div class="card border-0 shadow-sm p-2 mb-3">
        <div class="d-flex flex-wrap gap-2">
          <input v-model="termoBusca" class="form-control form-control-sm flex-grow-1" placeholder="Buscar iniciativa ou programa...">
          <select v-model="filtroTipo" class="form-select form-select-sm w-auto">
            <option value="TODOS">Todos</option><option value="PROPOSTA">Propostas</option><option value="PROJETO">Projetos</option><option value="PROGRAMA">Programas</option>
          </select>
          <button class="btn btn-sm btn-light border" @click="carregarTudo"><i class="bi bi-arrow-clockwise"></i></button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      <div v-else class="accordion shadow-sm">
        <div class="accordion-item" v-for="item in itensFiltrados" :key="item.id">
          <h2 class="accordion-header">
            <button class="accordion-button" :class="{ collapsed: itemAberto !== item.id }" @click="itemAberto = itemAberto === item.id ? null : item.id">
              <div class="d-flex align-items-center w-100 me-3 gap-2">
                <span class="badge" :class="item.tipo==='PROGRAMA'?'bg-success':(item.tipo==='PROJETO'?'bg-primary':'bg-warning text-dark')">{{ item.tipo }}</span>
                <span class="fw-bold text-truncate flex-grow-1">{{ item.nome }}</span>
                <small class="text-muted d-none d-md-inline">
                  {{ usuarios.find(u => u.matricula === item.matricula_gerente)?.label || 'Sem gerente' }}
                </small>
              </div>
            </button>
          </h2>
          <div class="accordion-collapse collapse" :class="{ show: itemAberto === item.id }">
            <div class="accordion-body bg-light">
              <div class="row g-3">
                <div class="col-md-5">
                  <div class="mb-2">
                    <label class="small fw-bold">Gerente Responsável</label>
                    <select v-model="item.matricula_gerente" class="form-select form-select-sm">
                      <option value="">-- Sem Gerente --</option>
                      <option v-for="u in usuarios" :key="u.matricula" :value="u.matricula">{{ u.label }}</option>
                    </select>
                  </div>
                  <div class="mb-2">
                    <label class="small fw-bold">Setor Responsável</label>
                    <select v-model="item.id_setor_responsavel" class="form-select form-select-sm">
                      <option value="">-- Selecione --</option>
                      <option v-for="s in setores" :key="s.id_setor" :value="s.id_setor">{{ s.nome_setor }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="small fw-bold">Setores Colaboradores</label>
                    <div class="input-group input-group-sm mb-2">
                      <select v-model="tempColab" class="form-select">
                        <option value="">Adicionar setor...</option>
                        <option v-for="s in setores" :key="s.id_setor" :value="s.id_setor">{{ s.nome_setor }}</option>
                      </select>
                      <button class="btn btn-outline-secondary" @click="addColab(item)">+</button>
                    </div>
                    <div class="d-flex flex-wrap gap-1">
                      <span v-for="(sid, idx) in item.setores_colaboradores" :key="idx" class="badge bg-secondary">
                        {{ nomeSetor(sid) }} <i class="bi bi-x cursor-pointer" @click="item.setores_colaboradores.splice(idx,1)"></i>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="col-md-7">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong class="small text-success">Metas e Donos</strong>
                    <button class="btn btn-sm btn-outline-success" @click="prepararAddMeta(item)">+ Meta</button>
                  </div>
                  <table class="table table-sm bg-white border mb-0 align-middle">
                    <thead class="table-light small"><tr><th>Cód</th><th>Descrição</th><th>Dono da Meta</th><th>Alvo</th><th></th></tr></thead>
                    <tbody>
                      <tr v-for="(m, idx) in item.metas" :key="idx">
                        <td class="small fw-bold">{{ m.codigo_meta }}</td>
                        <td><input v-model="m.descricao" class="form-control form-control-sm border-0"></td>
                        <td>
                          <select v-model="m.matricula_responsavel" class="form-select form-select-sm border-0">
                            <option value="">Gerente Padrão</option>
                            <option v-for="u in usuarios" :key="u.matricula" :value="u.matricula">{{ u.nome }}</option>
                          </select>
                        </td>
                        <td class="small">{{ m.qtd_alvo }} {{ m.unidade_medida }}</td>
                        <td><button class="btn btn-link text-danger p-0" @click="item.metas.splice(idx,1)">x</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="text-end mt-3 pt-2 border-top">
                <button class="btn btn-success btn-sm fw-bold px-4" @click="salvarItem(item)">Salvar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL NOVA META -->
      <div class="modal fade" id="modalMetaResumo" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Nova Meta Rápida</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <input v-model="novaMeta.descricao" class="form-control mb-2" placeholder="Descrição">
              <div class="row g-2">
                <div class="col-6"><input v-model="novaMeta.qtd_alvo" type="number" class="form-control" placeholder="Alvo"></div>
                <div class="col-6"><select v-model="novaMeta.unidade_medida" class="form-select"><option value="Unid">Unid</option><option value="%">%</option><option value="R$">R$</option></select></div>
              </div>
            </div>
            <div class="modal-footer"><button class="btn btn-success" @click="confirmarAddMeta">Adicionar</button></div>
          </div>
        </div>
      </div>

      <!-- MODAL NOVO GERENTE -->
      <div class="modal fade" id="modalGerenteResumo" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Novo Gerente Rápido (Senha: pmse)</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <input v-model="novoGerente.nome" class="form-control mb-2" placeholder="Nome Completo *">
              <input v-model="novoGerente.matricula" class="form-control mb-2" placeholder="Matrícula *">
              <input v-model="novoGerente.lotacao" class="form-control mb-2" placeholder="Lotação">
              <input v-model="novoGerente.email" type="email" class="form-control" placeholder="E-mail">
            </div>
            <div class="modal-footer"><button class="btn btn-primary" @click="criarGerenteRapido">Criar Gerente</button></div>
          </div>
        </div>
      </div>
    </div>
  `
};