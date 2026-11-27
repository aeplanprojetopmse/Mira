window.MiraViews = window.MiraViews || {};

window.MiraViews.PortfolioView = {
  setup() {
    const api = Vue.inject('api');
    const user = Vue.inject('user');
    const setGlobalLoading = Vue.inject('setGlobalLoading');
    const utils = window.MiraUtils;

    const loading = Vue.ref(false);
    const itensRaw = Vue.ref([]);

    const filtros = Vue.reactive({
      busca: '',
      unidade: 'TODAS',
      ano: 'TODOS',
      status: 'TODOS'
    });

    const unidadesAbertas = Vue.ref(new Set());
    const logosComErro = Vue.ref(new Set());

    const MAPA_PASTAS_UNIDADES = {
      banda: 'banda',
      bope: 'bope',
      bpati: 'bpati',
      bprp: 'bprp',
      bprv: 'bprv',
      bptran: 'bptran',
      eductransito: 'bptran',
      bptur: 'bptur',
      caatinga: 'caatinga',
      cipam: 'cipam',
      cipcaes: 'cipcaes',
      cto: 'cto',
      equoterapia: 'equoterapia',
      getam: 'getam',
      impo: 'impo',
      judo: 'judo',
      museu: 'museu',
      proerd: 'proerd',
      rpmon: 'rpmon',
      tatico: 'taticos',
      taticos: 'taticos'
    };

    const normalizarTexto = (txt) =>
      String(txt || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const getLogoUnidade = (nomeUnidade) => {
      const slug = normalizarTexto(nomeUnidade);
      const pasta = MAPA_PASTAS_UNIDADES[slug] || slug;
      if (!pasta || logosComErro.value.has(pasta)) return '';
      return `src/img/${pasta}/logo.png`;
    };

    const registrarErroLogo = (nomeUnidade) => {
      const slug = normalizarTexto(nomeUnidade);
      const pasta = MAPA_PASTAS_UNIDADES[slug] || slug;
      const novo = new Set(logosComErro.value);
      novo.add(pasta);
      logosComErro.value = novo;
    };

    const sugestao = Vue.reactive({
      nome_objeto: '',
      descricao_tecnica: '',
      quantidade: 1,
      valor_unitario: '',
      unidade: user.lotacao || '',
      ano_pedido: new Date().getFullYear(),
      natureza_despesa: '4490'
    });

    const editando = Vue.reactive({
      linha_original: null,
      item_numero: null,
      nome_objeto: '',
      descricao_tecnica: '',
      quantidade: 1,
      valor_unitario: 0,
      unidade: '',
      ano_pedido: new Date().getFullYear(),
      natureza_despesa: '',
      entra_no_portfolio: false
    });

    const carregar = async () => {
      loading.value = true;
      try {
        const res = await api('listarItensPortfolio', { matricula: user.matricula });
        if (res.success) {
          itensRaw.value = res.itens || [];
        } else {
          alert(res.message || 'Erro ao carregar portfólio.');
        }
      } finally {
        loading.value = false;
      }
    };

    const unidadesDisponiveis = Vue.computed(() => {
      const mapa = new Map();
      itensRaw.value.forEach(it => {
        const nomeOriginal = String(it.unidade || '').trim() || 'Sem Unidade';
        const chave = nomeOriginal.toLowerCase();
        if (!mapa.has(chave)) mapa.set(chave, nomeOriginal);
      });
      return Array.from(mapa.entries())
        .map(([chave, nome]) => ({ chave, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    });

    const anosDisponiveis = Vue.computed(() => {
      const set = new Set();
      itensRaw.value.forEach(it => {
        if (it.ano_pedido) set.add(Number(it.ano_pedido));
      });
      return Array.from(set).sort((a, b) => b - a);
    });

    const itensFiltrados = Vue.computed(() => {
      const termo = filtros.busca.trim().toLowerCase();
      return itensRaw.value.filter(it => {
        const unChave = (String(it.unidade || '').trim() || 'Sem Unidade').toLowerCase();
        if (filtros.unidade !== 'TODAS' && unChave !== filtros.unidade) return false;
        if (filtros.ano !== 'TODOS' && Number(it.ano_pedido) !== Number(filtros.ano)) return false;
        if (filtros.status === 'APROVADOS' && !it.entra_no_portfolio) return false;
        if (filtros.status === 'PENDENTES' && it.entra_no_portfolio) return false;

        if (termo) {
          const texto = `${it.nome_objeto} ${it.descricao_tecnica} ${it.unidade} ${it.natureza_despesa}`.toLowerCase();
          if (!texto.includes(termo)) return false;
        }
        return true;
      });
    });

    const gruposPorUnidade = Vue.computed(() => {
      const mapa = new Map();

      itensFiltrados.value.forEach(it => {
        const nomeUnidade = String(it.unidade || '').trim() || 'Sem Unidade';
        const chave = nomeUnidade.toLowerCase();

        if (!mapa.has(chave)) {
          mapa.set(chave, {
            chave,
            nome: nomeUnidade,
            logoUrl: getLogoUnidade(nomeUnidade),
            itens: [],
            totalItens: 0,
            totalAprovados: 0,
            totalPendentes: 0,
            valorTotal: 0
          });
        }

        const grupo = mapa.get(chave);
        grupo.itens.push(it);
        grupo.totalItens++;
        if (it.entra_no_portfolio) grupo.totalAprovados++;
        else grupo.totalPendentes++;
        grupo.valorTotal += Number(it.valor_total || 0);
      });

      return Array.from(mapa.values());
    });

    const kpis = Vue.computed(() => ({
      unidades: gruposPorUnidade.value.length,
      totalItens: itensFiltrados.value.length,
      aprovados: itensFiltrados.value.filter(i => i.entra_no_portfolio).length,
      valorTotal: itensFiltrados.value.reduce((acc, i) => acc + Number(i.valor_total || 0), 0)
    }));

    const isAberta = (chave) => {
      if (filtros.unidade !== 'TODAS' || filtros.busca.trim() !== '') return true;
      return unidadesAbertas.value.has(chave);
    };

    const toggleUnidade = (chave) => {
      const novo = new Set(unidadesAbertas.value);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      unidadesAbertas.value = novo;
    };

    const expandirTodas = () => {
      unidadesAbertas.value = new Set(gruposPorUnidade.value.map(g => g.chave));
    };

    const recolherTodas = () => {
      unidadesAbertas.value = new Set();
    };

    const enviarSugestao = async () => {
      if (!sugestao.nome_objeto.trim() || !sugestao.descricao_tecnica.trim()) {
        return alert('Preencha nome do objeto e descrição técnica.');
      }
      setGlobalLoading(true);
      try {
        const res = await api('enviarSugestaoPortfolio', {
          matricula: user.matricula,
          ...sugestao,
          quantidade: Number(sugestao.quantidade),
          valor_unitario: Number(sugestao.valor_unitario || 0)
        });
        if (res.success) {
          alert(res.message);
          bootstrap.Modal.getInstance(document.getElementById('modalSugestaoPort'))?.hide();
          Object.assign(sugestao, { nome_objeto: '', descricao_tecnica: '', quantidade: 1, valor_unitario: '' });
          await carregar();
        } else {
          alert(res.message);
        }
      } finally {
        setGlobalLoading(false);
      }
    };

    const abrirAvaliacao = (item) => {
      Object.assign(editando, item);
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAvaliarPort')).show();
    };

    const salvarAvaliacao = async () => {
      setGlobalLoading(true);
      try {
        const res = await api('avaliarItemPortfolio', {
          solicitante_matricula: user.matricula,
          ...editando,
          quantidade: Number(editando.quantidade || 1),
          valor_unitario: Number(editando.valor_unitario || 0),
          ano_pedido: editando.ano_pedido ? Number(editando.ano_pedido) : undefined
        });
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalAvaliarPort'))?.hide();
          await carregar();
        } else {
          alert(res.message);
        }
      } finally {
        setGlobalLoading(false);
      }
    };

    // Nova função de Exclusão Física no Portfólio
    const excluirItem = async (item) => {
      const nome = item.nome_objeto || `Item #${item.item_numero}`;
      if (!confirm(`ATENÇÃO: Deseja realmente excluir permanentemente o item "${nome}" do Portfólio de Compras? Esta ação não pode ser desfeita.`)) {
        return;
      }

      setGlobalLoading(true);
      try {
        const res = await api('excluirItemPortfolio', {
          solicitante_matricula: user.matricula,
          linha_original: item.linha_original,
          item_numero: item.item_numero,
          nome_objeto: item.nome_objeto
        });

        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalAvaliarPort'))?.hide();
          await carregar();
        } else {
          alert(res.message || 'Falha ao excluir item.');
        }
      } finally {
        setGlobalLoading(false);
      }
    };

    Vue.onMounted(carregar);

    return {
      loading, filtros, unidadesDisponiveis, anosDisponiveis,
      gruposPorUnidade, kpis, sugestao, editando, user, utils,
      registrarErroLogo, carregar, isAberta, toggleUnidade, expandirTodas, recolherTodas,
      enviarSugestao, abrirAvaliacao, salvarAvaliacao, excluirItem
    };
  },
  template: `
    <div>
      <!-- CABEÇALHO -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h4 class="text-primary fw-bold m-0"><i class="bi bi-cart3 me-2"></i>Portfólio de Compras</h4>
          <small class="text-muted">Clique no card da unidade para expandir ou recolher os itens solicitados</small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-light border btn-sm" @click="carregar" title="Atualizar"><i class="bi bi-arrow-clockwise"></i></button>
          <button class="btn btn-primary btn-sm fw-bold px-3" data-bs-toggle="modal" data-bs-target="#modalSugestaoPort">
            <i class="bi bi-plus-lg me-1"></i> Sugerir Item
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 border-start border-4 border-primary">
            <small class="text-muted fw-bold">UNIDADES</small>
            <div class="fs-3 fw-bold">{{ kpis.unidades }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 border-start border-4 border-info">
            <small class="text-muted fw-bold">TOTAL DE ITENS</small>
            <div class="fs-3 fw-bold">{{ kpis.totalItens }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 border-start border-4 border-success">
            <small class="text-muted fw-bold">NO PORTFÓLIO</small>
            <div class="fs-3 fw-bold text-success">{{ kpis.aprovados }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 border-start border-4 border-dark">
            <small class="text-muted fw-bold">VALOR ESTIMADO</small>
            <div class="fs-5 fw-bold text-dark mt-1">{{ utils.formatMoeda(kpis.valorTotal) }}</div>
          </div>
        </div>
      </div>

      <!-- FILTROS DINÂMICOS -->
      <div class="card border-0 shadow-sm p-3 mb-4">
        <div class="row g-2 align-items-center">
          <div class="col-md-4">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
              <input v-model="filtros.busca" class="form-control border-start-0" placeholder="Buscar objeto, descrição ou natureza...">
            </div>
          </div>
          <div class="col-6 col-md-3">
            <select v-model="filtros.unidade" class="form-select form-select-sm">
              <option value="TODAS">Todas as Unidades ({{ unidadesDisponiveis.length }})</option>
              <option v-for="u in unidadesDisponiveis" :key="u.chave" :value="u.chave">{{ u.nome }}</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <select v-model="filtros.status" class="form-select form-select-sm">
              <option value="TODOS">Todos os Status</option>
              <option value="APROVADOS">No Portfólio</option>
              <option value="PENDENTES">Em Análise</option>
            </select>
          </div>
          <div class="col-6 col-md-1">
            <select v-model="filtros.ano" class="form-select form-select-sm">
              <option value="TODOS">Ano</option>
              <option v-for="a in anosDisponiveis" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="col-6 col-md-2 d-flex gap-1 justify-content-end">
            <button class="btn btn-sm btn-outline-secondary w-50" @click="expandirTodas" title="Expandir Todos"><i class="bi bi-arrows-expand"></i></button>
            <button class="btn btn-sm btn-outline-secondary w-50" @click="recolherTodas" title="Recolher Todos"><i class="bi bi-arrows-collapse"></i></button>
          </div>
        </div>
      </div>

      <!-- LISTA DE CARDS POR UNIDADE COM COLLAPSE -->
      <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

      <div v-else-if="!gruposPorUnidade.length" class="text-center py-5 text-muted bg-white border rounded shadow-sm">
        <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
        Nenhum item encontrado com os filtros selecionados.
      </div>

      <div v-else class="vstack gap-3">
        <div v-for="grupo in gruposPorUnidade" :key="grupo.chave" class="card border-0 shadow-sm overflow-hidden">
          <!-- CABEÇALHO DO CARD DA UNIDADE -->
          <div class="card-header bg-white py-3 px-4 cursor-pointer d-flex flex-wrap justify-content-between align-items-center gap-2 border-start border-4 border-primary"
               @click="toggleUnidade(grupo.chave)">
            <div class="d-flex align-items-center gap-3">
              <div class="bg-light border rounded-3 d-flex align-items-center justify-content-center p-1 flex-shrink-0" style="width: 52px; height: 52px;">
                <img v-if="grupo.logoUrl"
                     :src="grupo.logoUrl"
                     :alt="grupo.nome"
                     @error="registrarErroLogo(grupo.nome)"
                     style="width: 100%; height: 100%; object-fit: contain;">
                <i v-else class="bi bi-shield-shaded text-primary fs-4"></i>
              </div>
              <div>
                <h5 class="fw-bold text-dark m-0">{{ grupo.nome }}</h5>
                <small class="text-muted">
                  {{ grupo.totalItens }} {{ grupo.totalItens === 1 ? 'item' : 'itens' }}
                  <span v-if="grupo.totalAprovados" class="text-success fw-bold ms-2">• {{ grupo.totalAprovados }} aprovado(s)</span>
                  <span v-if="grupo.totalPendentes" class="text-warning-emphasis ms-2">• {{ grupo.totalPendentes }} em análise</span>
                </small>
              </div>
            </div>

            <div class="d-flex align-items-center gap-3">
              <div class="text-end">
                <small class="text-muted d-block lh-1">Total da Unidade</small>
                <span class="fw-bold text-success fs-6">{{ utils.formatMoeda(grupo.valorTotal) }}</span>
              </div>
              <i class="bi fs-5 text-secondary" :class="isAberta(grupo.chave) ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </div>
          </div>

          <!-- CONTEÚDO DO COLLAPSE -->
          <div v-show="isAberta(grupo.chave)" class="border-top bg-light p-0">
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0 small bg-white">
                <thead class="table-light">
                  <tr>
                    <th class="ps-4" style="width: 55px;">#</th>
                    <th>Objeto / Descrição Técnica</th>
                    <th style="width: 90px;">Ano</th>
                    <th style="width: 100px;">Natureza</th>
                    <th class="text-center" style="width: 75px;">Qtd</th>
                    <th class="text-end" style="width: 120px;">Unitário</th>
                    <th class="text-end" style="width: 125px;">Total</th>
                    <th class="text-center" style="width: 115px;">Status</th>
                    <th v-if="user.perfil === 'ADMIN'" class="text-end pe-3" style="width: 90px;">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="it in grupo.itens" :key="it.linha_original">
                    <td class="ps-4 text-muted fw-bold">{{ it.item_numero }}</td>
                    <td>
                      <div class="fw-bold text-dark">{{ it.nome_objeto }}</div>
                      <div class="text-muted" style="white-space: pre-line;">{{ it.descricao_tecnica }}</div>
                    </td>
                    <td>{{ it.ano_pedido || '-' }}</td>
                    <td><span class="badge bg-light text-dark border">{{ it.natureza_despesa || '-' }}</span></td>
                    <td class="text-center fw-bold">{{ it.quantidade }}</td>
                    <td class="text-end">{{ utils.formatMoeda(it.valor_unitario) }}</td>
                    <td class="text-end fw-bold text-success">{{ utils.formatMoeda(it.valor_total) }}</td>
                    <td class="text-center">
                      <span class="badge" :class="it.entra_no_portfolio ? 'bg-success' : 'bg-warning text-dark'">
                        {{ it.entra_no_portfolio ? 'No Portfólio' : 'Em Análise' }}
                      </span>
                    </td>
                    <td v-if="user.perfil === 'ADMIN'" class="text-end pe-3">
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" @click="abrirAvaliacao(it)" title="Avaliar / Editar">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" @click="excluirItem(it)" title="Excluir do Portfólio">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL SUGESTÃO -->
      <div class="modal fade" id="modalSugestaoPort" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title fw-bold">Sugerir Item ao Portfólio</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <input v-model="sugestao.nome_objeto" class="form-control mb-2" placeholder="Nome do Objeto *">
              <textarea v-model="sugestao.descricao_tecnica" class="form-control mb-2" rows="3" placeholder="Descrição Técnica detalhada *"></textarea>
              <div class="row g-2 mb-2">
                <div class="col-4"><label class="small">Qtd</label><input v-model="sugestao.quantidade" type="number" class="form-control"></div>
                <div class="col-4"><label class="small">Valor Unit (R$)</label><input v-model="sugestao.valor_unitario" type="number" step="0.01" class="form-control"></div>
                <div class="col-4"><label class="small">Ano</label><input v-model="sugestao.ano_pedido" type="number" class="form-control"></div>
              </div>
              <div class="row g-2">
                <div class="col-6">
                  <label class="small">Unidade</label>
                  <input v-model="sugestao.unidade" list="dlUnidadesPort" class="form-control" placeholder="Ex: Bope">
                  <datalist id="dlUnidadesPort">
                    <option v-for="u in unidadesDisponiveis" :key="u.chave" :value="u.nome"></option>
                  </datalist>
                </div>
                <div class="col-6">
                  <label class="small">Natureza</label>
                  <input v-model="sugestao.natureza_despesa" class="form-control" placeholder="Ex: 4490">
                </div>
              </div>
            </div>
            <div class="modal-footer"><button class="btn btn-primary fw-bold" @click="enviarSugestao">Enviar Sugestão</button></div>
          </div>
        </div>
      </div>

      <!-- MODAL AVALIAR / EDITAR / EXCLUIR (ADMIN) -->
      <div class="modal fade" id="modalAvaliarPort" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title fw-bold">Avaliar Item do Portfólio</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div class="form-check form-switch mb-3">
                <input class="form-check-input" type="checkbox" v-model="editando.entra_no_portfolio" id="chkEntraPort">
                <label class="form-check-label fw-bold text-success" for="chkEntraPort">Aprovar e incluir no Portfólio oficial</label>
              </div>
              <input v-model="editando.nome_objeto" class="form-control mb-2" placeholder="Objeto">
              <textarea v-model="editando.descricao_tecnica" class="form-control mb-2" rows="3"></textarea>
              <div class="row g-2 mb-2">
                <div class="col-4"><label class="small">Qtd</label><input v-model="editando.quantidade" type="number" class="form-control"></div>
                <div class="col-4"><label class="small">Valor Unit</label><input v-model="editando.valor_unitario" type="number" step="0.01" class="form-control"></div>
                <div class="col-4"><label class="small">Unidade</label><input v-model="editando.unidade" list="dlUnidadesPort" class="form-control"></div>
              </div>
              <div class="row g-2">
                <div class="col-6"><label class="small">Ano</label><input v-model="editando.ano_pedido" type="number" class="form-control"></div>
                <div class="col-6"><label class="small">Natureza</label><input v-model="editando.natureza_despesa" class="form-control"></div>
              </div>
            </div>
            <div class="modal-footer d-flex justify-content-between">
              <button class="btn btn-outline-danger fw-bold" @click="excluirItem(editando)">
                <i class="bi bi-trash me-1"></i> Excluir Item
              </button>
              <div class="d-flex gap-2">
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-success fw-bold" @click="salvarAvaliacao">Salvar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};