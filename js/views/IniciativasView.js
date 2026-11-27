window.MiraViews = window.MiraViews || {};

window.MiraViews.createIniciativasView = function (escopoFixo) {
  return {
    setup() {
      const api = Vue.inject('api');
      const user = Vue.inject('user');
      const initialData = Vue.inject('initialData');
      const setGlobalLoading = Vue.inject('setGlobalLoading');
      const utils = window.MiraUtils;

      const loading = Vue.ref(false);
      const viewMode = Vue.ref('LISTA'); // 'LISTA' | 'DETALHE'
      const escopoAtual = Vue.ref(escopoFixo); // Permite alternar GERENCIA <-> MINHAS_PROPOSTAS
      const filtroStatus = Vue.ref(escopoFixo === 'AVALIACAO' ? 'Pendentes' : 'Todos');
      const buscaTexto = Vue.ref('');

      const lista = Vue.ref([]);
      const det = Vue.reactive({
        is_gerente_geral: false,
        iniciativa: {},
        municipios: [],
        setores_colaboradores: [],
        beneficiarios: [],
        ssp: { ativo: 'Não', locais: [] },
        metas: [],
        riscos: [],
        orcamento: { visivel: {}, itens: [] },
        anexos: [],
        historico: []
      });

      // Controles de interação
      const abaDetalhe = Vue.ref('EXECUCAO'); // 'EXECUCAO' | 'FINANCEIRO' | 'DADOS' | 'HISTORICO'
      const etapaExpandida = Vue.ref({ id: null, tipo: null }); // 'REL' | 'ANX'
      const tempRelatorio = Vue.ref('');
      const editandoPrazoId = Vue.ref(null);
      const tempNovoPrazo = Vue.ref('');
      const tempMeta = Vue.reactive({ descricao: '', qtd_alvo: '', unidade_medida: 'Unid', matricula_responsavel: '' });
      const tempEtapa = Vue.reactive({ id_meta: '', descricao: '', data_prazo: '' });
      const tempAnexo = Vue.reactive({ id_etapa: '', file: null, desc: '' });
      const uploadingAnexo = Vue.ref(false);

      const carregarLista = async () => {
        loading.value = true;
        try {
          const res = await api('listarIniciativas', {
            matricula: user.matricula,
            escopo: escopoAtual.value
          });
          if (res.success) {
            lista.value = res.iniciativas || [];
          } else {
            alert(res.message || 'Erro ao listar iniciativas.');
          }
        } catch (e) {
          console.error(e);
        } finally {
          loading.value = false;
        }
      };

      const listaFiltrada = Vue.computed(() => {
        return lista.value.filter(i => {
          if (buscaTexto.value && !String(i.nome).toLowerCase().includes(buscaTexto.value.toLowerCase())) return false;
          if (escopoFixo === 'AVALIACAO') {
            if (filtroStatus.value === 'Pendentes') return ['Em Análise', 'Submetida'].includes(i.status);
            if (filtroStatus.value === 'Aprovados') return ['Aprovado', 'Em Execução', 'Encerrado'].includes(i.status);
            if (filtroStatus.value === 'Reprovados') return i.status === 'Reprovado';
          } else if (filtroStatus.value !== 'Todos') {
            return i.status === filtroStatus.value;
          }
          return true;
        });
      });

      const abrirDetalhe = async (id) => {
        setGlobalLoading(true);
        try {
          const res = await api('obterDetalhesIniciativa', {
            matricula: user.matricula,
            id_iniciativa: id,
            modo: escopoAtual.value
          });
          if (res.success) {
            det.is_gerente_geral = res.is_gerente_geral;
            det.iniciativa = res.iniciativa || {};
            det.municipios = res.municipios || [];
            det.setores_colaboradores = res.setores_colaboradores || [];
            det.beneficiarios = res.beneficiarios || [];
            det.ssp = res.ssp || { ativo: 'Não', locais: [] };
            det.metas = res.metas || [];
            det.riscos = res.riscos || [];
            det.orcamento = res.orcamento || { visivel: {}, itens: [] };
            det.anexos = res.anexos || [];
            det.historico = res.historico || [];
            abaDetalhe.value = escopoFixo === 'AVALIACAO' ? 'DADOS' : 'EXECUCAO';
            viewMode.value = 'DETALHE';
          } else {
            alert(res.message || 'Erro ao abrir iniciativa.');
          }
        } catch (e) {
          alert(e.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      const voltarLista = () => {
        viewMode.value = 'LISTA';
        carregarLista();
      };

      // --- KPIs locais ---
      const kpisDetalhe = Vue.computed(() => {
        let totalMetas = det.metas.length, concluidas = 0, somaEfet = 0;
        det.metas.forEach(m => {
          somaEfet += utils.calcularEfetividadeMeta(m);
          const ets = m.etapas || [];
          if (ets.length > 0 && ets.every(e => ['Concluída', 'Concluida'].includes(e.status))) concluidas++;
        });
        const plan = (det.orcamento.itens || []).reduce((a, i) => a + Number(i.valor_planejado_total || 0), 0);
        const exec = (det.orcamento.itens || []).reduce((a, i) => a + (i.executado ? Number(i.valor_executado || 0) : 0), 0);
        return {
          execFisica: totalMetas ? Math.round((concluidas / totalMetas) * 100) : 0,
          efetividade: totalMetas ? Math.round(somaEfet / totalMetas) : 0,
          planFmt: utils.formatMoeda(plan),
          execFmt: utils.formatMoeda(exec),
          percFin: plan > 0 ? Math.round((exec / plan) * 100) : 0
        };
      });

      // --- Execução Física ---
      const atualizarQtdMeta = async (meta) => {
        setGlobalLoading(true);
        try {
          const res = await api('salvarProgressoItem', {
            matricula: user.matricula, tipo: 'META', id_item: meta.id_meta, valor: Number(meta.qtd_executada || 0)
          });
          if (!res.success) alert(res.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      const atualizarStatusEtapa = async (etapa, novoStatus) => {
        const antigo = etapa.status;
        setGlobalLoading(true);
        try {
          const res = await api('salvarProgressoItem', {
            matricula: user.matricula, tipo: 'ETAPA', id_item: etapa.id_etapa, valor: novoStatus
          });
          if (res.success) {
            await abrirDetalhe(det.iniciativa.id_iniciativa);
          } else {
            etapa.status = antigo;
            alert(res.message);
          }
        } catch (e) {
          etapa.status = antigo;
          alert(e.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      const enviarRelatorio = async (etapa) => {
        if (!tempRelatorio.value.trim()) return alert('Digite o texto do relatório.');
        setGlobalLoading(true);
        try {
          const res = await api('enviarRelatorioEtapa', {
            matricula_autor: user.matricula, id_etapa: etapa.id_etapa, texto_relatorio: tempRelatorio.value
          });
          if (res.success) {
            tempRelatorio.value = '';
            await abrirDetalhe(det.iniciativa.id_iniciativa);
          } else alert(res.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      const marcarLido = async (rel) => {
        const res = await api('marcarRelatorioLido', { matricula: user.matricula, id_relatorio: rel.id_relatorio });
        if (res.success) rel.status_leitura = 'Lido';
      };

      // --- Admin: Repactuação, Avaliação, Metas/Etapas e Encerramento ---
      const salvarRepactuacao = async (etapa) => {
        if (!tempNovoPrazo.value) return;
        setGlobalLoading(true);
        try {
          const res = await api('repactuarPrazoEtapa', {
            solicitante_matricula: user.matricula, id_etapa: etapa.id_etapa, novo_prazo: tempNovoPrazo.value
          });
          if (res.success) {
            editandoPrazoId.value = null;
            await abrirDetalhe(det.iniciativa.id_iniciativa);
          } else alert(res.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      const salvarAvaliacaoAdmin = async (statusNovo) => {
        if (['Aprovado', 'Em Execução'].includes(statusNovo) && !det.iniciativa.matricula_gerente) {
          return alert('Selecione um Gerente Responsável para aprovar a iniciativa.');
        }
        if (!confirm(`Confirmar salvamento com status "${statusNovo}"?`)) return;

        setGlobalLoading(true);
        try {
          const res = await api('avaliarIniciativa', {
            solicitante_matricula: user.matricula,
            id_iniciativa: det.iniciativa.id_iniciativa,
            status_novo: statusNovo,
            info: {
              nome: det.iniciativa.nome,
              ano: det.iniciativa.ano,
              matricula_gerente: det.iniciativa.matricula_gerente,
              id_catalogo: det.iniciativa.id_catalogo,
              id_setor_responsavel: det.iniciativa.id_setor_responsavel,
              justificativa: det.iniciativa.justificativa,
              detalhe_local: det.iniciativa.detalhe_local
            },
            metas: JSON.parse(JSON.stringify(det.metas))
          });
          if (res.success) {
            alert('Iniciativa atualizada com sucesso!');
            if (escopoFixo === 'AVALIACAO') voltarLista();
            else await abrirDetalhe(det.iniciativa.id_iniciativa);
          } else {
            alert(res.message);
          }
        } finally {
          setGlobalLoading(false);
        }
      };

      const adicionarMetaRapida = async () => {
        if (!tempMeta.descricao || !tempMeta.qtd_alvo) return alert('Preencha descrição e alvo.');
        const metasAtualizadas = [...JSON.parse(JSON.stringify(det.metas)), {
          descricao: tempMeta.descricao,
          unidade_medida: tempMeta.unidade_medida,
          qtd_alvo: Number(tempMeta.qtd_alvo),
          matricula_responsavel: tempMeta.matricula_responsavel,
          etapas: []
        }];
        setGlobalLoading(true);
        try {
          const res = await api('avaliarIniciativa', {
            solicitante_matricula: user.matricula,
            id_iniciativa: det.iniciativa.id_iniciativa,
            status_novo: det.iniciativa.status,
            metas: metasAtualizadas
          });
          if (res.success) {
            Object.assign(tempMeta, { descricao: '', qtd_alvo: '', unidade_medida: 'Unid', matricula_responsavel: '' });
            bootstrap.Modal.getInstance(document.getElementById('modalAddMetaIni'))?.hide();
            await abrirDetalhe(det.iniciativa.id_iniciativa);
          } else alert(res.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      const adicionarEtapaRapida = async () => {
        if (!tempEtapa.descricao || !tempEtapa.id_meta) return alert('Preencha a descrição.');
        const metasCopia = JSON.parse(JSON.stringify(det.metas));
        const metaAlvo = metasCopia.find(m => m.id_meta === tempEtapa.id_meta);
        if (!metaAlvo) return;
        metaAlvo.etapas.push({ descricao: tempEtapa.descricao, data_prazo: tempEtapa.data_prazo || '' });

        setGlobalLoading(true);
        try {
          const res = await api('avaliarIniciativa', {
            solicitante_matricula: user.matricula,
            id_iniciativa: det.iniciativa.id_iniciativa,
            status_novo: det.iniciativa.status,
            metas: metasCopia
          });
          if (res.success) {
            tempEtapa.descricao = ''; tempEtapa.data_prazo = '';
            bootstrap.Modal.getInstance(document.getElementById('modalAddEtapaIni'))?.hide();
            await abrirDetalhe(det.iniciativa.id_iniciativa);
          } else alert(res.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      // --- Financeiro ---
      const salvarFinanceiro = async (item) => {
        setGlobalLoading(true);
        try {
          const res = await api('salvarExecucaoFinanceira', {
            matricula: user.matricula,
            id_item_orcamento: item.id_item_orcamento,
            executado: item.executado,
            valor_executado: item.executado ? (Number(item.valor_executado) || item.valor_planejado_total) : 0,
            ano_exercicio: item.ano_exercicio || new Date().getFullYear()
          });
          if (res.success) {
            item.valor_executado = res.valor_executado;
          } else alert(res.message);
        } finally {
          setGlobalLoading(false);
        }
      };

      // --- Anexos Drive ---
      const abrirModalAnexo = (idEtapa = '') => {
        tempAnexo.id_etapa = idEtapa;
        tempAnexo.file = null;
        tempAnexo.desc = '';
        const el = document.getElementById('fileAnexoIni');
        if (el) el.value = '';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalAnexoIni')).show();
      };

      const enviarAnexoDrive = async () => {
        if (!tempAnexo.file) return alert('Selecione um arquivo.');
        if (tempAnexo.file.size > 20 * 1024 * 1024) return alert('Limite de 20 MB.');
        uploadingAnexo.value = true;
        try {
          const base64 = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.readAsDataURL(tempAnexo.file);
            r.onload = () => resolve(r.result);
            r.onerror = reject;
          });
          const res = await api('adicionarAnexoDrive', {
            matricula_autor: user.matricula,
            tipo_pai: 'INICIATIVA',
            id_pai: det.iniciativa.id_iniciativa,
            id_etapa: tempAnexo.id_etapa || '',
            file_data: base64,
            file_name: tempAnexo.file.name,
            file_desc: tempAnexo.desc || tempAnexo.file.name
          });
          if (res.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalAnexoIni'))?.hide();
            await abrirDetalhe(det.iniciativa.id_iniciativa);
          } else alert(res.message);
        } finally {
          uploadingAnexo.value = false;
        }
      };

      const imprimirFicha = () => window.print();

      Vue.onMounted(carregarLista);

      return {
        escopoFixo, escopoAtual, loading, viewMode, filtroStatus, buscaTexto,
        listaFiltrada, det, abaDetalhe, etapaExpandida, tempRelatorio,
        editandoPrazoId, tempNovoPrazo, tempMeta, tempEtapa, tempAnexo, uploadingAnexo,
        user, initialData, utils, kpisDetalhe,
        carregarLista, abrirDetalhe, voltarLista,
        atualizarQtdMeta, atualizarStatusEtapa, enviarRelatorio, marcarLido,
        salvarRepactuacao, salvarAvaliacaoAdmin, adicionarMetaRapida, adicionarEtapaRapida,
        salvarFinanceiro, abrirModalAnexo, enviarAnexoDrive, imprimirFicha
      };
    },
    template: `
      <div>
        <!-- LISTA -->
        <div v-if="viewMode === 'LISTA'">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
            <div>
              <h4 class="text-primary fw-bold m-0">
                {{ escopoFixo === 'AVALIACAO' ? 'Avaliação de Iniciativas' : (escopoFixo === 'MONITORAMENTO' ? 'Monitoramento de Projetos' : 'Gerenciamento') }}
              </h4>
              <div v-if="escopoFixo === 'GERENCIA'" class="btn-group btn-group-sm mt-2">
                <button class="btn" :class="escopoAtual==='GERENCIA'?'btn-primary':'btn-outline-primary'" @click="escopoAtual='GERENCIA'; carregarLista()">Em Gestão</button>
                <button class="btn" :class="escopoAtual==='MINHAS_PROPOSTAS'?'btn-primary':'btn-outline-primary'" @click="escopoAtual='MINHAS_PROPOSTAS'; carregarLista()">Minhas Propostas</button>
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <input v-model="buscaTexto" class="form-control form-control-sm" style="width: 220px;" placeholder="Buscar iniciativa...">
              <select v-if="escopoFixo === 'AVALIACAO'" v-model="filtroStatus" class="form-select form-select-sm w-auto">
                <option>Pendentes</option><option>Aprovados</option><option>Reprovados</option><option>Todos</option>
              </select>
              <select v-else v-model="filtroStatus" class="form-select form-select-sm w-auto">
                <option>Todos</option><option>Aprovado</option><option>Em Execução</option><option>Encerrado</option><option>Em Análise</option>
              </select>
              <button class="btn btn-sm btn-light border" @click="carregarLista"><i class="bi bi-arrow-clockwise"></i></button>
            </div>
          </div>

          <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

          <div v-else class="row g-3">
            <div class="col-12 col-md-6 col-lg-4" v-for="item in listaFiltrada" :key="item.id_iniciativa">
              <div class="card h-100 shadow-sm hover-card cursor-pointer border-top border-4"
                   :class="item.status==='Aprovado'||item.status==='Em Execução'?'border-success':(item.status==='Reprovado'?'border-danger':'border-warning')"
                   @click="abrirDetalhe(item.id_iniciativa)">
                <div class="card-body d-flex flex-column">
                  <div class="d-flex justify-content-between mb-2">
                    <span class="badge bg-light text-dark border">{{ item.tipo_iniciativa }} • {{ item.ano }}</span>
                    <span class="badge" :class="item.status==='Aprovado'||item.status==='Em Execução'?'bg-success':(item.status==='Reprovado'?'bg-danger':(item.status==='Encerrado'?'bg-secondary':'bg-warning text-dark'))">
                      {{ item.status }}
                    </span>
                  </div>
                  <h6 class="fw-bold text-dark">{{ item.nome }}</h6>
                  <div class="small text-muted mb-2">
                    <div>Gerente: <strong>{{ item.nome_gerente || 'Não designado' }}</strong></div>
                    <div>Fundo: {{ item.tipo_fundo }} • {{ utils.formatMoeda(item.valor_total_planejado) }}</div>
                  </div>
                  <div class="row text-center small mt-auto pt-2 border-top">
                    <div class="col-6 border-end"><div class="text-muted">Execução</div><strong class="text-primary">{{ item.progresso_execucao }}%</strong></div>
                    <div class="col-6"><div class="text-muted">Efetividade</div><strong class="text-success">{{ item.efetividade }}%</strong></div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!listaFiltrada.length" class="col-12 text-center py-5 text-muted border border-dashed rounded bg-light">
              Nenhuma iniciativa encontrada.
            </div>
          </div>
        </div>

        <!-- DETALHE -->
        <div v-if="viewMode === 'DETALHE'">
          <div class="bg-white p-3 shadow-sm border rounded mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <button class="btn btn-link p-0 text-decoration-none fw-bold text-secondary mb-1 d-print-none" @click="voltarLista">
                <i class="bi bi-arrow-left"></i> Voltar
              </button>
              <h4 class="fw-bold text-primary m-0">{{ det.iniciativa.nome }}</h4>
              <div class="small text-muted mt-1">
                <span class="badge bg-dark me-1">{{ det.iniciativa.tipo_iniciativa }}</span>
                <span class="badge bg-info text-dark me-1">{{ det.iniciativa.status }}</span>
                Gerente: <strong>{{ det.iniciativa.nome_gerente || 'Não definido' }}</strong> •
                Execução: <strong class="text-primary">{{ kpisDetalhe.execFisica }}%</strong> •
                Efetividade: <strong class="text-success">{{ kpisDetalhe.efetividade }}%</strong>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-2 d-print-none">
              <button class="btn btn-sm btn-outline-dark" @click="imprimirFicha"><i class="bi bi-printer me-1"></i> Imprimir / PDF</button>
              <button class="btn btn-sm btn-outline-info" @click="abrirModalAnexo('')"><i class="bi bi-paperclip me-1"></i> Anexos ({{ det.anexos.length }})</button>
              <button v-if="escopoFixo === 'MONITORAMENTO' && det.iniciativa.status !== 'Encerrado'" class="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#modalAddMetaIni">+ Meta</button>
              <button v-if="escopoFixo === 'MONITORAMENTO' && det.iniciativa.status !== 'Encerrado'" class="btn btn-sm btn-danger" @click="salvarAvaliacaoAdmin('Encerrado')">Encerrar</button>
            </div>
          </div>

          <!-- ABAS INTERNAS -->
          <ul class="nav nav-tabs mb-3 d-print-none">
            <li class="nav-item"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='EXECUCAO' }" @click.prevent="abaDetalhe='EXECUCAO'">Metas &amp; Etapas ({{ det.metas.length }})</a></li>
            <li class="nav-item" v-if="det.is_gerente_geral"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='FINANCEIRO' }" @click.prevent="abaDetalhe='FINANCEIRO'">Financeiro ({{ det.orcamento.itens.length }})</a></li>
            <li class="nav-item"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='DADOS' }" @click.prevent="abaDetalhe='DADOS'">Dados &amp; Avaliação</a></li>
            <li class="nav-item"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='HISTORICO' }" @click.prevent="abaDetalhe='HISTORICO'">Histórico ({{ det.historico.length }})</a></li>
          </ul>

          <!-- ABA EXECUÇÃO -->
          <div v-show="abaDetalhe === 'EXECUCAO'">
            <div class="accordion" id="accIniMetas">
              <div class="accordion-item mb-2 border rounded" v-for="(meta, idx) in det.metas" :key="meta.id_meta">
                <h2 class="accordion-header">
                  <button class="accordion-button bg-light" type="button" data-bs-toggle="collapse" :data-bs-target="'#im'+idx">
                    <div class="row w-100 align-items-center g-2 me-2">
                      <div class="col-md-5 fw-bold">{{ meta.codigo_meta }} - {{ meta.descricao }}</div>
                      <div class="col-md-3 small text-muted">Resp: {{ meta.nome_responsavel || 'Gerente' }}</div>
                      <div class="col-md-3 d-flex align-items-center" @click.stop>
                        <input type="number" class="form-control form-control-sm text-center fw-bold me-1" style="width:80px"
                               v-model="meta.qtd_executada" @change="atualizarQtdMeta(meta)">
                        <span class="small text-muted">/ {{ meta.qtd_alvo }} {{ meta.unidade_medida }}</span>
                      </div>
                      <div class="col-md-1 text-end">
                        <span class="badge" :class="utils.calcularEfetividadeMeta(meta)>=100?'bg-success':'bg-secondary'">{{ utils.calcularEfetividadeMeta(meta) }}%</span>
                      </div>
                    </div>
                  </button>
                </h2>
                <div :id="'im'+idx" class="accordion-collapse collapse show">
                  <div class="accordion-body p-0">
                    <div v-if="escopoFixo === 'MONITORAMENTO'" class="p-2 bg-light border-bottom text-end">
                      <button class="btn btn-sm btn-outline-primary" @click="tempEtapa.id_meta = meta.id_meta" data-bs-toggle="modal" data-bs-target="#modalAddEtapaIni">+ Nova Etapa</button>
                    </div>
                    <table class="table table-bordered table-sm mb-0 align-middle">
                      <thead class="table-light"><tr><th>Etapa</th><th style="width:165px">Prazo</th><th style="width:165px">Status</th><th style="width:140px" class="text-center">Ações</th></tr></thead>
                      <tbody>
                        <template v-for="etapa in meta.etapas" :key="etapa.id_etapa">
                          <tr :class="utils.getRowClass(etapa)">
                            <td class="ps-3"><strong>{{ etapa.codigo_etapa }}</strong> - {{ etapa.descricao }}</td>
                            <td>
                              <div v-if="editandoPrazoId === etapa.id_etapa" class="input-group input-group-sm">
                                <input type="date" v-model="tempNovoPrazo" class="form-control">
                                <button class="btn btn-success" @click="salvarRepactuacao(etapa)"><i class="bi bi-check"></i></button>
                                <button class="btn btn-secondary" @click="editandoPrazoId = null"><i class="bi bi-x"></i></button>
                              </div>
                              <div v-else class="d-flex justify-content-between align-items-center">
                                <span>{{ utils.formatDate(etapa.data_prazo) }}</span>
                                <button v-if="escopoFixo === 'MONITORAMENTO'" class="btn btn-sm btn-link p-0" @click="editandoPrazoId = etapa.id_etapa; tempNovoPrazo = etapa.data_prazo ? String(etapa.data_prazo).slice(0,10) : ''">
                                  <i class="bi bi-pencil-square"></i>
                                </button>
                              </div>
                            </td>
                            <td>
                              <span v-if="utils.isAtrasada(etapa) && user.perfil !== 'ADMIN'" class="badge bg-danger w-100 py-2">ATRASADA (Bloq.)</span>
                              <select v-else class="form-select form-select-sm fw-bold" :value="etapa.status" @change="atualizarStatusEtapa(etapa, $event.target.value)">
                                <option>Planejada</option><option>Em Andamento</option><option>Pausada</option><option>Concluída</option>
                              </select>
                            </td>
                            <td class="text-center">
                              <button class="btn btn-sm btn-outline-primary me-1" @click="etapaExpandida = (etapaExpandida.id===etapa.id_etapa && etapaExpandida.tipo==='REL') ? {id:null,tipo:null} : {id:etapa.id_etapa,tipo:'REL'}">
                                <i class="bi bi-chat-left-text"></i> ({{ (etapa.relatorios||[]).length }})
                              </button>
                              <button class="btn btn-sm btn-outline-info" @click="abrirModalAnexo(etapa.id_etapa)">
                                <i class="bi bi-paperclip"></i> ({{ (etapa.anexos||[]).length }})
                              </button>
                            </td>
                          </tr>
                          <tr v-if="etapaExpandida.id === etapa.id_etapa && etapaExpandida.tipo === 'REL'" class="bg-light">
                            <td colspan="4" class="p-3">
                              <div v-for="rel in etapa.relatorios" :key="rel.id_relatorio" class="bg-white border rounded p-2 mb-2 small">
                                <div class="d-flex justify-content-between text-muted">
                                  <span><strong>{{ rel.nome_autor }}</strong> • {{ utils.formatDateTime(rel.data_criacao) }}</span>
                                  <button v-if="rel.status_leitura !== 'Lido' && user.perfil === 'ADMIN'" class="btn btn-link btn-sm p-0" @click="marcarLido(rel)">Marcar Lido</button>
                                  <span v-else class="badge bg-light text-dark border">{{ rel.status_leitura }}</span>
                                </div>
                                <div class="mt-1 text-dark">{{ rel.texto_relatorio }}</div>
                              </div>
                              <div class="input-group input-group-sm mt-2">
                                <input v-model="tempRelatorio" class="form-control" placeholder="Escrever relatório de acompanhamento...">
                                <button class="btn btn-primary" @click="enviarRelatorio(etapa)">Enviar</button>
                              </div>
                            </td>
                          </tr>
                        </template>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ABA FINANCEIRO -->
          <div v-show="abaDetalhe === 'FINANCEIRO'" v-if="det.is_gerente_geral">
            <div class="row g-3 mb-3">
              <div class="col-md-4"><div class="card p-3 border-0 shadow-sm"><small class="text-muted">Planejado</small><div class="fs-4 fw-bold">{{ kpisDetalhe.planFmt }}</div></div></div>
              <div class="col-md-4"><div class="card p-3 border-0 shadow-sm"><small class="text-muted">Executado (Pago)</small><div class="fs-4 fw-bold text-success">{{ kpisDetalhe.execFmt }}</div></div></div>
              <div class="col-md-4"><div class="card p-3 border-0 shadow-sm"><small class="text-muted">% Execução</small><div class="fs-4 fw-bold text-primary">{{ kpisDetalhe.percFin }}%</div></div></div>
            </div>
            <div class="table-responsive bg-white border rounded shadow-sm">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead class="table-light"><tr><th>Item</th><th>Categoria</th><th class="text-end">Planejado</th><th class="text-center">Pago?</th><th class="text-end" style="width:150px">Valor Pago (R$)</th></tr></thead>
                <tbody>
                  <tr v-for="it in det.orcamento.itens" :key="it.id_item_orcamento">
                    <td class="fw-bold">{{ it.descricao }} <small class="text-muted d-block">{{ it.detalhe_complementar }}</small></td>
                    <td><span class="badge bg-secondary">{{ it.categoria_item }}</span></td>
                    <td class="text-end">{{ utils.formatMoeda(it.valor_planejado_total) }}</td>
                    <td class="text-center"><input type="checkbox" class="form-check-input" v-model="it.executado" @change="salvarFinanceiro(it)"></td>
                    <td><input type="number" step="0.01" class="form-control form-control-sm text-end" v-model="it.valor_executado" :disabled="!it.executado" @change="salvarFinanceiro(it)"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ABA DADOS & AVALIAÇÃO -->
          <div v-show="abaDetalhe === 'DADOS'" class="card shadow-sm border-0 p-3">
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="small fw-bold">Nome da Iniciativa</label>
                <input v-model="det.iniciativa.nome" class="form-control" :disabled="user.perfil !== 'ADMIN'">
              </div>
              <div class="col-md-2">
                <label class="small fw-bold">Ano</label>
                <input v-model="det.iniciativa.ano" type="number" class="form-control" :disabled="user.perfil !== 'ADMIN'">
              </div>
              <div class="col-md-4">
                <label class="small fw-bold">Gerente Designado</label>
                <select v-model="det.iniciativa.matricula_gerente" class="form-select" :disabled="user.perfil !== 'ADMIN'">
                  <option value="">-- Selecione --</option>
                  <option v-for="u in initialData.usuarios" :key="u.matricula" :value="u.matricula">{{ u.nome }} ({{ u.matricula }})</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="small fw-bold">Setor Responsável</label>
                <select v-model="det.iniciativa.id_setor_responsavel" class="form-select" :disabled="user.perfil !== 'ADMIN'">
                  <option value="">-- Selecione --</option>
                  <option v-for="s in initialData.setores" :key="s.id_setor" :value="s.id_setor">{{ s.nome_setor }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="small fw-bold">Objetivo Estratégico</label>
                <select v-model="det.iniciativa.id_catalogo" class="form-select" :disabled="user.perfil !== 'ADMIN'">
                  <option value="">-- Selecione --</option>
                  <option v-for="e in initialData.estrategia" :key="e.id_catalogo" :value="e.id_catalogo">[{{ e.ano }}] {{ e.eixo }} - {{ e.objetivo }}</option>
                </select>
              </div>
              <div class="col-12">
                <label class="small fw-bold">Justificativa</label>
                <textarea v-model="det.iniciativa.justificativa" class="form-control" rows="4" :disabled="user.perfil !== 'ADMIN'"></textarea>
              </div>
            </div>

            <div class="row g-3 mb-3 small">
              <div class="col-md-4"><strong>Municípios:</strong> {{ det.municipios.map(m => m.nome_municipio).join(', ') || '-' }}</div>
              <div class="col-md-4"><strong>Beneficiários:</strong> {{ det.beneficiarios.map(b => b.descricao).join(', ') || '-' }}</div>
              <div class="col-md-4"><strong>Anexos:</strong>
                <div v-for="a in det.anexos" :key="a.id_anexo"><a :href="a.url_arquivo" target="_blank">{{ a.descricao }}</a></div>
              </div>
            </div>

            <div v-if="user.perfil === 'ADMIN' && escopoFixo === 'AVALIACAO'" class="d-flex flex-wrap gap-2 pt-3 border-top justify-content-end d-print-none">
              <button class="btn btn-outline-secondary" @click="salvarAvaliacaoAdmin('Em Análise')">Salvar Alterações</button>
              <button class="btn btn-danger fw-bold" @click="salvarAvaliacaoAdmin('Reprovado')">Reprovar</button>
              <button class="btn btn-success fw-bold" @click="salvarAvaliacaoAdmin('Aprovado')">APROVAR PROPOSTA</button>
            </div>
          </div>

          <!-- ABA HISTÓRICO -->
          <div v-show="abaDetalhe === 'HISTORICO'" class="card shadow-sm border-0">
            <table class="table table-sm table-striped mb-0 small">
              <thead class="table-light"><tr><th>Data</th><th>Autor</th><th>Evento</th><th>Item</th><th>Alteração</th></tr></thead>
              <tbody>
                <tr v-for="h in det.historico" :key="h.id_historico">
                  <td>{{ utils.formatDateTime(h.data_evento) }}</td>
                  <td>{{ h.nome_autor }}</td>
                  <td><span class="badge bg-secondary">{{ h.tipo_evento }}</span></td>
                  <td>{{ h.descricao_item }}</td>
                  <td>{{ h.valor_anterior }} → <strong>{{ h.valor_novo }}</strong></td>
                </tr>
                <tr v-if="!det.historico.length"><td colspan="5" class="text-center text-muted py-4">Sem alterações registradas.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- MODAL ANEXO DRIVE -->
        <div class="modal fade" id="modalAnexoIni" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header"><h5 class="modal-title">Enviar Anexo para o Drive</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
              <div class="modal-body">
                <input type="file" id="fileAnexoIni" class="form-control mb-2" @change="tempAnexo.file = $event.target.files[0]">
                <input v-model="tempAnexo.desc" class="form-control" placeholder="Descrição do anexo">
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" @click="enviarAnexoDrive" :disabled="uploadingAnexo">
                  {{ uploadingAnexo ? 'Enviando...' : 'Enviar para o Drive' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL NOVA META (MONITORAMENTO) -->
        <div class="modal fade" id="modalAddMetaIni" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header"><h5 class="modal-title">Adicionar Meta</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
              <div class="modal-body">
                <input v-model="tempMeta.descricao" class="form-control mb-2" placeholder="Descrição da Meta">
                <div class="row g-2 mb-2">
                  <div class="col-6"><input v-model="tempMeta.qtd_alvo" type="number" class="form-control" placeholder="Alvo"></div>
                  <div class="col-6"><select v-model="tempMeta.unidade_medida" class="form-select"><option value="Unid">Unid</option><option value="%">%</option><option value="R$">R$</option></select></div>
                </div>
                <select v-model="tempMeta.matricula_responsavel" class="form-select">
                  <option value="">Responsável (Gerente Padrão)</option>
                  <option v-for="u in initialData.usuarios" :key="u.matricula" :value="u.matricula">{{ u.nome }}</option>
                </select>
              </div>
              <div class="modal-footer"><button class="btn btn-success" @click="adicionarMetaRapida">Salvar Meta</button></div>
            </div>
          </div>
        </div>

        <!-- MODAL NOVA ETAPA (MONITORAMENTO) -->
        <div class="modal fade" id="modalAddEtapaIni" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header"><h5 class="modal-title">Adicionar Etapa</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
              <div class="modal-body">
                <input v-model="tempEtapa.descricao" class="form-control mb-2" placeholder="Descrição da Etapa">
                <label class="small">Prazo</label>
                <input v-model="tempEtapa.data_prazo" type="date" class="form-control">
              </div>
              <div class="modal-footer"><button class="btn btn-primary" @click="adicionarEtapaRapida">Salvar Etapa</button></div>
            </div>
          </div>
        </div>
      </div>
    `
  };
};

window.MiraViews.AvaliacaoView = window.MiraViews.createIniciativasView('AVALIACAO');
window.MiraViews.GerenciaView = window.MiraViews.createIniciativasView('GERENCIA');
window.MiraViews.MonitorView = window.MiraViews.createIniciativasView('MONITORAMENTO');