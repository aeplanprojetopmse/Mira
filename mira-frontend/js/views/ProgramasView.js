window.MiraViews = window.MiraViews || {};

window.MiraViews.ProgramasView = {
  setup() {
    const api = Vue.inject('api');
    const user = Vue.inject('user');
    const initialData = Vue.inject('initialData');
    const setGlobalLoading = Vue.inject('setGlobalLoading');
    const utils = window.MiraUtils;

    const loading = Vue.ref(false);
    const viewMode = Vue.ref('LISTA'); // 'LISTA' | 'FORM' | 'DETALHE'
    const escopo = Vue.ref(user.perfil === 'ADMIN' ? 'MONITORAMENTO' : 'GERENCIA');
    const programas = Vue.ref([]);
    const det = Vue.ref(null);
    const abaDetalhe = Vue.ref('EXECUCAO');
    const anoVisao = Vue.ref(new Date().getFullYear());

    const formProg = Vue.reactive({
      id_programa: '',
      info: { nome: '', sigla: '', ano_inicio: new Date().getFullYear(), status: 'Aprovado', matricula_gerente: '', id_setor_responsavel: '', justificativa: '' },
      municipios: [],
      setores_envolvidos: [],
      beneficiarios: [],
      metas: [],
      riscos: []
    });

    const temp = Vue.reactive({
      mun_ibge: '', mun_estadual: false, setor_id: '', bene_id: '', bene_est: '',
      meta_desc: '', meta_qtd: '', meta_un: 'Unid', meta_resp: '',
      etapa_meta_idx: null, etapa_desc: '', etapa_prazo: '',
      rel_etapa_id: null, rel_texto: '',
      prazo_etapa_id: null, prazo_novo: '',
      anexo_etapa_id: '', anexo_file: null, anexo_desc: ''
    });

    const carregar = async () => {
      loading.value = true;
      try {
        const res = await api('listarProgramas', { matricula: user.matricula, escopo: escopo.value });
        if (res.success) programas.value = res.programas || [];
      } finally {
        loading.value = false;
      }
    };

    const abrirDetalhe = async (idProg) => {
      setGlobalLoading(true);
      try {
        const res = await api('obterDetalhesPrograma', { matricula: user.matricula, id_programa: idProg });
        if (res.success) {
          // Garantia defensiva para Dono de Meta
          if (res.permissoes && !res.permissoes.is_gerente_geral) {
            res.metas = (res.metas || []).filter(m => String(m.matricula_responsavel).trim() === String(user.matricula).trim());
          }
          det.value = res;
          viewMode.value = 'DETALHE';
          abaDetalhe.value = 'EXECUCAO';
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    const abrirNovoPrograma = () => {
      Object.assign(formProg, {
        id_programa: '',
        info: { nome: '', sigla: '', ano_inicio: new Date().getFullYear(), status: 'Aprovado', matricula_gerente: '', id_setor_responsavel: '', justificativa: '' },
        municipios: [], setores_envolvidos: [], beneficiarios: [], metas: [], riscos: []
      });
      viewMode.value = 'FORM';
    };

    const abrirEditarPrograma = () => {
      const p = det.value.programa;
      Object.assign(formProg, {
        id_programa: p.id_programa,
        info: { nome: p.nome, sigla: p.sigla, ano_inicio: p.ano_inicio, status: p.status, matricula_gerente: p.matricula_gerente, id_setor_responsavel: p.id_setor_responsavel, justificativa: p.justificativa },
        municipios: JSON.parse(JSON.stringify(det.value.municipios || [])),
        setores_envolvidos: JSON.parse(JSON.stringify(det.value.setores_envolvidos || [])),
        beneficiarios: JSON.parse(JSON.stringify(det.value.beneficiarios || [])),
        metas: JSON.parse(JSON.stringify(det.value.metas || [])),
        riscos: JSON.parse(JSON.stringify(det.value.riscos || []))
      });
      viewMode.value = 'FORM';
    };

    const addMunProg = () => {
      if (temp.mun_estadual) {
        formProg.municipios = [{ codigo_ibge: '', nome_municipio: 'Todo o Estado (SE)', abrangencia_estadual: true }];
        temp.mun_estadual = false;
        return;
      }
      const ref = (initialData.municipios || []).find(m => m.codigo_ibge === temp.mun_ibge);
      if (ref && !formProg.municipios.some(m => m.codigo_ibge === ref.codigo_ibge)) {
        formProg.municipios.push({ codigo_ibge: ref.codigo_ibge, nome_municipio: ref.nome_municipio, abrangencia_estadual: false });
      }
      temp.mun_ibge = '';
    };

    const addMetaForm = () => {
      if (!temp.meta_desc || !temp.meta_qtd) return;
      formProg.metas.push({
        descricao: temp.meta_desc, qtd_alvo: Number(temp.meta_qtd), unidade_medida: temp.meta_un,
        matricula_responsavel: temp.meta_resp, etapas: []
      });
      temp.meta_desc = ''; temp.meta_qtd = '';
    };

    const addEtapaForm = (idxMeta) => {
      if (!temp.etapa_desc) return;
      formProg.metas[idxMeta].etapas.push({ descricao: temp.etapa_desc, data_prazo: temp.etapa_prazo || '' });
      temp.etapa_desc = ''; temp.etapa_prazo = '';
    };

    const salvarPrograma = async () => {
      if (!formProg.info.nome || !formProg.info.justificativa) return alert('Nome e justificativa são obrigatórios.');
      setGlobalLoading(true);
      try {
        const res = await api('salvarPrograma', {
          solicitante_matricula: user.matricula,
          id_programa: formProg.id_programa || undefined,
          info: formProg.info,
          municipios: formProg.municipios.map(m => ({ codigo_ibge: m.codigo_ibge, abrangencia_estadual: m.abrangencia_estadual })),
          setores_envolvidos: formProg.setores_envolvidos.map(s => ({ id_setor: s.id_setor, papel: s.papel || 'Envolvido' })),
          beneficiarios: formProg.beneficiarios.map(b => ({ id_beneficiario: b.id_beneficiario, estimativa_publico: b.estimativa_publico })),
          metas: JSON.parse(JSON.stringify(formProg.metas)),
          riscos: JSON.parse(JSON.stringify(formProg.riscos))
        });
        if (res.success) {
          alert('Programa salvo com sucesso!');
          await abrirDetalhe(res.id_programa);
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    // Execução dentro do detalhe
    const atualizarQtdMeta = async (meta) => {
      await api('salvarProgressoItem', { matricula: user.matricula, tipo: 'META', id_item: meta.id_meta, valor: Number(meta.qtd_executada || 0) });
    };
    const atualizarStatusEtapa = async (etapa, novoStatus) => {
      const res = await api('salvarProgressoItem', { matricula: user.matricula, tipo: 'ETAPA', id_item: etapa.id_etapa, valor: novoStatus });
      if (!res.success) alert(res.message);
      await abrirDetalhe(det.value.programa.id_programa);
    };
    const enviarRelatorio = async (etapa) => {
      if (!temp.rel_texto.trim()) return;
      const res = await api('enviarRelatorioEtapa', { matricula_autor: user.matricula, id_etapa: etapa.id_etapa, texto_relatorio: temp.rel_texto });
      if (res.success) { temp.rel_texto = ''; await abrirDetalhe(det.value.programa.id_programa); }
      else alert(res.message);
    };
    const marcarLido = async (rel) => {
      const res = await api('marcarRelatorioLido', { matricula: user.matricula, id_relatorio: rel.id_relatorio });
      if (res.success) rel.status_leitura = 'Lido';
    };
    const salvarRepactuacao = async (etapa) => {
      if (!temp.prazo_novo) return;
      const res = await api('repactuarPrazoEtapa', { solicitante_matricula: user.matricula, id_etapa: etapa.id_etapa, novo_prazo: temp.prazo_novo });
      if (res.success) { temp.prazo_etapa_id = null; await abrirDetalhe(det.value.programa.id_programa); }
      else alert(res.message);
    };
    const salvarFinanceiro = async (item) => {
      const res = await api('salvarExecucaoFinanceira', {
        matricula: user.matricula, id_item_orcamento: item.id_item_orcamento,
        executado: item.executado, valor_executado: item.executado ? (Number(item.valor_executado) || item.valor_planejado_total) : 0
      });
      if (!res.success) alert(res.message);
    };
    const enviarAnexo = async () => {
      if (!temp.anexo_file) return alert('Selecione um arquivo.');
      setGlobalLoading(true);
      try {
        const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader(); r.readAsDataURL(temp.anexo_file); r.onload = () => resolve(r.result); r.onerror = reject;
        });
        const res = await api('adicionarAnexoDrive', {
          matricula_autor: user.matricula, tipo_pai: 'PROGRAMA', id_pai: det.value.programa.id_programa,
          id_etapa: temp.anexo_etapa_id || '', file_data: base64, file_name: temp.anexo_file.name, file_desc: temp.anexo_desc || temp.anexo_file.name
        });
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalAnexoProg'))?.hide();
          await abrirDetalhe(det.value.programa.id_programa);
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    const etapasDoAno = Vue.computed(() => {
      if (!det.value) return [];
      const res = [];
      (det.value.metas || []).forEach(m => {
        (m.etapas || []).forEach(e => {
          if (e.data_prazo && new Date(e.data_prazo).getFullYear() === Number(anoVisao.value)) {
            res.push({ meta: `${m.codigo_meta} - ${m.descricao}`, ...e });
          }
        });
      });
      return res;
    });

    Vue.onMounted(carregar);

    return {
      loading, viewMode, escopo, programas, det, abaDetalhe, anoVisao, formProg, temp,
      user, initialData, utils, etapasDoAno,
      carregar, abrirDetalhe, abrirNovoPrograma, abrirEditarPrograma,
      addMunProg, addMetaForm, addEtapaForm, salvarPrograma,
      atualizarQtdMeta, atualizarStatusEtapa, enviarRelatorio, marcarLido, salvarRepactuacao, salvarFinanceiro, enviarAnexo
    };
  },
  template: `
    <div>
      <!-- LISTA -->
      <div v-if="viewMode === 'LISTA'">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <h4 class="text-primary fw-bold m-0"><i class="bi bi-diagram-3 me-2"></i>Programas Continuados</h4>
          <div class="d-flex gap-2">
            <select v-if="user.perfil==='ADMIN'" v-model="escopo" @change="carregar" class="form-select form-select-sm w-auto">
              <option value="MONITORAMENTO">Todos (Monitoramento)</option>
              <option value="GERENCIA">Minha Gerência</option>
            </select>
            <button v-if="user.perfil==='ADMIN'" class="btn btn-success btn-sm fw-bold" @click="abrirNovoPrograma">+ Instituir Programa</button>
          </div>
        </div>
        <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else class="row g-3">
          <div class="col-md-6 col-lg-4" v-for="p in programas" :key="p.id_programa">
            <div class="card h-100 shadow-sm hover-card cursor-pointer border-top border-4 border-success" @click="abrirDetalhe(p.id_programa)">
              <div class="card-body">
                <div class="d-flex justify-content-between mb-2">
                  <span class="badge bg-success">{{ p.sigla || 'PROG' }}</span>
                  <span class="badge bg-light text-dark border">Desde {{ p.ano_inicio }}</span>
                </div>
                <h6 class="fw-bold">{{ p.nome }}</h6>
                <div class="small text-muted mb-2">Gerente: <strong>{{ p.nome_gerente || 'Não definido' }}</strong></div>
                <div class="row text-center small pt-2 border-top">
                  <div class="col-6 border-end"><span class="text-muted d-block">Execução</span><strong class="text-primary">{{ p.progresso_execucao }}%</strong></div>
                  <div class="col-6"><span class="text-muted d-block">Efetividade</span><strong class="text-success">{{ p.efetividade }}%</strong></div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!programas.length" class="col-12 text-center py-5 text-muted border rounded bg-light">Nenhum programa encontrado.</div>
        </div>
      </div>

      <!-- FORMULÁRIO INSTITUIR / EDITAR PROGRAMA (ADMIN) -->
      <div v-if="viewMode === 'FORM'" class="card shadow-sm border-0">
        <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h5 class="m-0 fw-bold text-primary">{{ formProg.id_programa ? 'Editar Programa' : 'Instituir Novo Programa' }}</h5>
          <button class="btn btn-sm btn-outline-secondary" @click="viewMode = 'LISTA'">Cancelar</button>
        </div>
        <div class="card-body">
          <div class="row g-3 mb-3">
            <div class="col-md-6"><label class="small fw-bold">Nome do Programa *</label><input v-model="formProg.info.nome" class="form-control"></div>
            <div class="col-md-2"><label class="small fw-bold">Sigla</label><input v-model="formProg.info.sigla" class="form-control text-uppercase"></div>
            <div class="col-md-2"><label class="small fw-bold">Ano Início</label><input v-model="formProg.info.ano_inicio" type="number" class="form-control"></div>
            <div class="col-md-2"><label class="small fw-bold">Status</label><select v-model="formProg.info.status" class="form-select"><option>Aprovado</option><option>Em Execução</option><option>Encerrado</option></select></div>
            <div class="col-md-6"><label class="small fw-bold">Gerente Responsável</label>
              <select v-model="formProg.info.matricula_gerente" class="form-select">
                <option value="">Selecione...</option>
                <option v-for="u in initialData.usuarios" :key="u.matricula" :value="u.matricula">{{ u.nome }} ({{ u.matricula }})</option>
              </select>
            </div>
            <div class="col-md-6"><label class="small fw-bold">Setor Responsável</label>
              <select v-model="formProg.info.id_setor_responsavel" class="form-select">
                <option value="">Selecione...</option>
                <option v-for="s in initialData.setores" :key="s.id_setor" :value="s.id_setor">{{ s.nome_setor }}</option>
              </select>
            </div>
            <div class="col-12"><label class="small fw-bold">Justificativa *</label><textarea v-model="formProg.info.justificativa" class="form-control" rows="3"></textarea></div>
          </div>

          <div class="card bg-light border-0 p-3 mb-3">
            <h6 class="fw-bold">Abrangência (Municípios)</h6>
            <div class="d-flex gap-2 mb-2 align-items-center">
              <div class="form-check"><input type="checkbox" class="form-check-input" v-model="temp.mun_estadual" id="pEst"><label class="form-check-label small" for="pEst">Estadual</label></div>
              <select v-if="!temp.mun_estadual" v-model="temp.mun_ibge" class="form-select form-select-sm w-auto">
                <option value="">Município...</option>
                <option v-for="m in initialData.municipios" :key="m.codigo_ibge" :value="m.codigo_ibge">{{ m.nome_municipio }}</option>
              </select>
              <button class="btn btn-sm btn-primary" @click="addMunProg">+</button>
            </div>
            <div class="d-flex flex-wrap gap-1">
              <span v-for="(m, i) in formProg.municipios" :key="i" class="badge bg-primary">{{ m.nome_municipio }} <i class="bi bi-x cursor-pointer" @click="formProg.municipios.splice(i,1)"></i></span>
            </div>
          </div>

          <div class="card border p-3 mb-3">
            <h6 class="fw-bold">Metas e Etapas do Programa</h6>
            <div class="row g-2 mb-2">
              <div class="col-md-4"><input v-model="temp.meta_desc" class="form-control form-control-sm" placeholder="Descrição da meta"></div>
              <div class="col-md-2"><input v-model="temp.meta_qtd" type="number" class="form-control form-control-sm" placeholder="Alvo"></div>
              <div class="col-md-2"><select v-model="temp.meta_un" class="form-select form-select-sm"><option value="Unid">Unid</option><option value="%">%</option><option value="R$">R$</option></select></div>
              <div class="col-md-3">
                <select v-model="temp.meta_resp" class="form-select form-select-sm">
                  <option value="">Responsável...</option>
                  <option v-for="u in initialData.usuarios" :key="u.matricula" :value="u.matricula">{{ u.nome }}</option>
                </select>
              </div>
              <div class="col-md-1"><button class="btn btn-sm btn-success w-100" @click="addMetaForm">+</button></div>
            </div>
            <div v-for="(m, idx) in formProg.metas" :key="idx" class="border rounded p-2 mb-2 bg-light small">
              <div class="d-flex justify-content-between fw-bold">
                <span>{{ m.descricao }} ({{ m.qtd_alvo }} {{ m.unidade_medida }})</span>
                <button class="btn btn-link text-danger p-0" @click="formProg.metas.splice(idx,1)">Remover</button>
              </div>
              <div class="input-group input-group-sm my-1">
                <input v-model="temp.etapa_desc" class="form-control" placeholder="Nova etapa...">
                <input v-model="temp.etapa_prazo" type="date" class="form-control" style="max-width:150px">
                <button class="btn btn-outline-primary" @click="addEtapaForm(idx)">+ Etapa</button>
              </div>
              <div v-for="(e, ie) in m.etapas" :key="ie" class="ps-3 text-muted">
                • {{ e.descricao }} ({{ utils.formatDate(e.data_prazo) }}) <a href="#" class="text-danger ms-2" @click.prevent="m.etapas.splice(ie,1)">x</a>
              </div>
            </div>
          </div>

          <button class="btn btn-success btn-lg w-100 fw-bold" @click="salvarPrograma">SALVAR PROGRAMA</button>
        </div>
      </div>

      <!-- DETALHE DO PROGRAMA -->
      <div v-if="viewMode === 'DETALHE' && det">
        <div class="bg-white p-3 shadow-sm border rounded mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <button class="btn btn-link p-0 text-decoration-none fw-bold text-secondary d-print-none mb-1" @click="viewMode='LISTA'; carregar()"><i class="bi bi-arrow-left"></i> Voltar</button>
            <h4 class="fw-bold text-success m-0">{{ det.programa.nome }} <span class="badge bg-secondary ms-1">{{ det.programa.sigla }}</span></h4>
            <div class="small text-muted">Gerente: <strong>{{ det.programa.nome_gerente || '-' }}</strong> • Setor: {{ det.programa.nome_setor_responsavel || '-' }}</div>
          </div>
          <div class="d-flex gap-2 d-print-none">
            <button v-if="user.perfil==='ADMIN'" class="btn btn-sm btn-outline-primary" @click="abrirEditarPrograma"><i class="bi bi-pencil me-1"></i> Editar Estrutura</button>
            <button class="btn btn-sm btn-outline-info" @click="temp.anexo_etapa_id=''" data-bs-toggle="modal" data-bs-target="#modalAnexoProg"><i class="bi bi-paperclip me-1"></i> Anexos ({{ det.anexos.length }})</button>
            <button class="btn btn-sm btn-outline-dark" onclick="window.print()"><i class="bi bi-printer me-1"></i> Imprimir</button>
          </div>
        </div>

        <ul class="nav nav-tabs mb-3 d-print-none">
          <li class="nav-item"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='EXECUCAO' }" @click.prevent="abaDetalhe='EXECUCAO'">Metas &amp; Etapas</a></li>
          <li class="nav-item"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='ANUAL' }" @click.prevent="abaDetalhe='ANUAL'">Visão Anual</a></li>
          <li class="nav-item" v-if="det.permissoes?.pode_ver_financeiro"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='FINANCEIRO' }" @click.prevent="abaDetalhe='FINANCEIRO'">Financeiro</a></li>
          <li class="nav-item"><a href="#" class="nav-link" :class="{ active: abaDetalhe==='INFO' }" @click.prevent="abaDetalhe='INFO'">Dados &amp; Histórico</a></li>
        </ul>

        <!-- EXECUÇÃO -->
        <div v-show="abaDetalhe === 'EXECUCAO'">
          <div v-for="m in det.metas" :key="m.id_meta" class="card shadow-sm border-0 mb-3">
            <div class="card-header bg-light d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div class="fw-bold">{{ m.codigo_meta }} - {{ m.descricao }}</div>
              <div class="d-flex align-items-center gap-2">
                <input type="number" class="form-control form-control-sm text-center fw-bold" style="width:80px" v-model="m.qtd_executada" @change="atualizarQtdMeta(m)">
                <span class="small text-muted">/ {{ m.qtd_alvo }} {{ m.unidade_medida }}</span>
                <span class="badge bg-success">{{ utils.calcularEfetividadeMeta(m) }}%</span>
              </div>
            </div>
            <div class="card-body p-0 table-responsive">
              <table class="table table-sm table-bordered mb-0 align-middle">
                <thead class="table-light"><tr><th>Etapa</th><th style="width:160px">Prazo</th><th style="width:160px">Status</th><th style="width:130px" class="text-center">Ações</th></tr></thead>
                <tbody>
                  <template v-for="e in m.etapas" :key="e.id_etapa">
                    <tr :class="utils.getRowClass(e)">
                      <td class="ps-3">{{ e.codigo_etapa }} - {{ e.descricao }}</td>
                      <td>
                        <div v-if="temp.prazo_etapa_id===e.id_etapa" class="input-group input-group-sm">
                          <input type="date" v-model="temp.prazo_novo" class="form-control">
                          <button class="btn btn-success" @click="salvarRepactuacao(e)">✓</button>
                        </div>
                        <div v-else class="d-flex justify-content-between">
                          <span>{{ utils.formatDate(e.data_prazo) }}</span>
                          <button v-if="user.perfil==='ADMIN'" class="btn btn-link btn-sm p-0" @click="temp.prazo_etapa_id=e.id_etapa; temp.prazo_novo=e.data_prazo?String(e.data_prazo).slice(0,10):''"><i class="bi bi-pencil-square"></i></button>
                        </div>
                      </td>
                      <td>
                        <span v-if="utils.isAtrasada(e) && user.perfil !== 'ADMIN'" class="badge bg-danger w-100">ATRASADA</span>
                        <select v-else class="form-select form-select-sm" :value="e.status" @change="atualizarStatusEtapa(e, $event.target.value)">
                          <option>Planejada</option><option>Em Andamento</option><option>Pausada</option><option>Concluída</option>
                        </select>
                      </td>
                      <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" @click="temp.rel_etapa_id = temp.rel_etapa_id===e.id_etapa ? null : e.id_etapa">Rel ({{ (e.relatorios||[]).length }})</button>
                        <button class="btn btn-sm btn-outline-info" @click="temp.anexo_etapa_id=e.id_etapa" data-bs-toggle="modal" data-bs-target="#modalAnexoProg">Anx ({{ (e.anexos||[]).length }})</button>
                      </td>
                    </tr>
                    <tr v-if="temp.rel_etapa_id===e.id_etapa" class="bg-light">
                      <td colspan="4" class="p-3">
                        <div v-for="r in e.relatorios" :key="r.id_relatorio" class="bg-white border rounded p-2 mb-2 small">
                          <div class="d-flex justify-content-between text-muted">
                            <span><strong>{{ r.nome_autor }}</strong> • {{ utils.formatDateTime(r.data_criacao) }}</span>
                            <button v-if="r.status_leitura!=='Lido' && user.perfil==='ADMIN'" class="btn btn-link btn-sm p-0" @click="marcarLido(r)">Marcar Lido</button>
                            <span v-else class="badge bg-light text-dark border">{{ r.status_leitura }}</span>
                          </div>
                          <div>{{ r.texto_relatorio }}</div>
                        </div>
                        <div class="input-group input-group-sm">
                          <input v-model="temp.rel_texto" class="form-control" placeholder="Adicionar relatório...">
                          <button class="btn btn-primary" @click="enviarRelatorio(e)">Enviar</button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- VISÃO ANUAL -->
        <div v-show="abaDetalhe === 'ANUAL'" class="card border-0 shadow-sm p-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold m-0">Cronograma Anual</h6>
            <input v-model="anoVisao" type="number" class="form-control form-control-sm" style="width:100px">
          </div>
          <table class="table table-sm table-bordered small mb-0">
            <thead class="table-light"><tr><th>Meta</th><th>Etapa</th><th>Prazo</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="e in etapasDoAno" :key="e.id_etapa">
                <td>{{ e.meta }}</td><td>{{ e.descricao }}</td><td>{{ utils.formatDate(e.data_prazo) }}</td><td>{{ e.status }}</td>
              </tr>
              <tr v-if="!etapasDoAno.length"><td colspan="4" class="text-center text-muted py-3">Nenhuma etapa prevista para {{ anoVisao }}.</td></tr>
            </tbody>
          </table>
        </div>

        <!-- FINANCEIRO -->
        <div v-show="abaDetalhe === 'FINANCEIRO'" v-if="det.permissoes?.pode_ver_financeiro" class="card border-0 shadow-sm">
          <table class="table table-sm mb-0 align-middle">
            <thead class="table-light"><tr><th>Item</th><th>Planejado</th><th>Pago?</th><th style="width:150px">Valor Pago</th></tr></thead>
            <tbody>
              <tr v-for="it in det.orcamento.itens" :key="it.id_item_orcamento">
                <td>{{ it.descricao }}</td><td>{{ utils.formatMoeda(it.valor_planejado_total) }}</td>
                <td><input type="checkbox" class="form-check-input" v-model="it.executado" @change="salvarFinanceiro(it)"></td>
                <td><input type="number" step="0.01" class="form-control form-control-sm" v-model="it.valor_executado" :disabled="!it.executado" @change="salvarFinanceiro(it)"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- INFO E HISTÓRICO -->
        <div v-show="abaDetalhe === 'INFO'" class="card border-0 shadow-sm p-3 small">
          <p><strong>Justificativa:</strong> {{ det.programa.justificativa }}</p>
          <p><strong>Municípios:</strong> {{ (det.municipios||[]).map(m => m.nome_municipio).join(', ') || '-' }}</p>
          <p><strong>Anexos Gerais:</strong> <span v-for="a in det.anexos" :key="a.id_anexo" class="me-2"><a :href="a.url_arquivo" target="_blank">{{ a.descricao }}</a></span></p>
        </div>
      </div>

      <!-- MODAL ANEXO PROGRAMA -->
      <div class="modal fade" id="modalAnexoProg" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Anexar ao Programa</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <input type="file" class="form-control mb-2" @change="temp.anexo_file = $event.target.files[0]">
              <input v-model="temp.anexo_desc" class="form-control" placeholder="Descrição">
            </div>
            <div class="modal-footer"><button class="btn btn-primary" @click="enviarAnexo">Enviar para o Drive</button></div>
          </div>
        </div>
      </div>
    </div>
  `
};