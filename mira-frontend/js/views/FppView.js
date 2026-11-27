window.MiraViews = window.MiraViews || {};

window.MiraViews.FppView = {
  setup() {
    const api = Vue.inject('api');
    const user = Vue.inject('user');
    const initialData = Vue.inject('initialData');
    const setGlobalLoading = Vue.inject('setGlobalLoading');
    const utils = window.MiraUtils;

    const modo = Vue.ref('LISTA'); // 'LISTA' | 'WIZARD' | 'DETALHE'
    const step = Vue.ref(1);
    const loading = Vue.ref(false);
    const iaLoadingCampo = Vue.ref('');
    const lista = Vue.ref([]);
    const detalhe = Vue.ref(null);
    const resultadoEnvio = Vue.ref(null);

    const filtros = Vue.reactive({ busca: '', area: 'TODAS', status: 'TODOS', ano: '' });
    const avalForm = Vue.reactive({ status_novo: 'Aprovado', matricula_gerente: '' });

    const anexosPendentes = Vue.ref([]);
    const tempAnexo = Vue.reactive({ file: null, desc: '' });
    const uploadingAnexo = Vue.ref(false);

    const areasTematicas = [
      {
        codigo: 'MVI',
        titulo: 'Mortes Violentas Intencionais',
        desc: 'Aquisições de viaturas táticas, armamento, munições e tecnologia para redução de homicídios e crimes letais.',
        icone: 'bi-shield', corTexto: 'text-danger', corBadge: 'bg-danger',
        corIconBg: 'bg-danger bg-opacity-10 text-danger', classeCard: 'fpp-card-mvi'
      },
      {
        codigo: 'EVM',
        titulo: 'Violência contra a Mulher',
        desc: 'Estruturação da Patrulha Maria da Penha, viaturas lilás e salas de acolhimento humanizado para atendimento às vítimas.',
        icone: 'bi-heart-pulse', corTexto: 'text-primary', corBadge: 'bg-primary',
        corIconBg: 'bg-primary bg-opacity-10 text-primary', classeCard: 'fpp-card-evm'
      },
      {
        codigo: 'MQV',
        titulo: 'Melhoria da Qualidade de Vida',
        desc: 'Equipamentos de musculação, academias policiais, climatização de alojamentos e saúde ocupacional preventiva.',
        icone: 'bi-activity', corTexto: 'text-success', corBadge: 'bg-success',
        corIconBg: 'bg-success bg-opacity-10 text-success', classeCard: 'fpp-card-mqv'
      }
    ];

    const passosMeta = [
      { num: 1, nome: 'Área Temática' },
      { num: 2, nome: 'Identificação' },
      { num: 3, nome: 'Objetivos' },
      { num: 4, nome: 'Justificativa' },
      { num: 5, nome: 'Público-Alvo' },
      { num: 6, nome: 'Resultados & Metas' },
      { num: 7, nome: 'Sustentabilidade' },
      { num: 8, nome: 'Localização' },
      { num: 9, nome: 'Materiais & Orçamento' },
      { num: 10, nome: 'Implementação' },
      { num: 11, nome: 'Resumo & Envio' }
    ];

    const getCleanForm = () => {
      const ano = new Date().getFullYear();
      return {
        ano,
        area_tematica: 'MVI',
        numero_protocolo: `FPP-MVI-${ano}-...`,
        titulo_projeto: '',
        orgao_instituicao: 'Polícia Militar do Estado de Sergipe - PMSE / Secretaria de Estado da Segurança Pública',
        nome_proponente: user.nome || '',
        cargo_funcao: '',
        unidade_proponente: user.lotacao || '',
        telefone_contato: user.telefone || '',
        email_contato: user.email || '',
        objetivo_geral: '',
        objetivos_especificos_txt: '',
        justificativa_tecnica: '',
        publico_direto: '',
        publico_indireto: '',
        resultados_esperados: '',
        metas_txt: '',
        sustentabilidade: '',
        mensuracao: '',
        locais: [{ item: '', quantidade: '', endereco: '' }],
        orcamento: [{ nome: '', descricao: '', marca: '', natureza: '4.4.90 (Investimento)', quantidade: 1, unitario: 0 }],
        pesquisa_precos_obs: '',
        implementacao: ''
      };
    };

    const form = Vue.reactive(getCleanForm());

    const atualizarPreviewProtocolo = async () => {
      form.numero_protocolo = `FPP-${form.area_tematica}-${form.ano}-...`;
      try {
        const res = await api('obterProximoProtocoloFPP', {
          matricula: user.matricula,
          area_tematica: form.area_tematica,
          ano: Number(form.ano)
        });
        if (res.success && res.numero_protocolo) {
          form.numero_protocolo = res.numero_protocolo;
        }
      } catch (e) {}
    };

    const selecionarArea = (cod) => {
      form.area_tematica = cod;
      atualizarPreviewProtocolo();
    };

    const areaAtualObj = Vue.computed(() =>
      areasTematicas.find(a => a.codigo === form.area_tematica) || areasTematicas[0]
    );
    const passoAtualObj = Vue.computed(() => passosMeta[step.value - 1] || passosMeta[0]);
    const proximoPassoObj = Vue.computed(() => passosMeta[step.value] || null);

    const totalInvestimento = Vue.computed(() =>
      form.orcamento
        .filter(i => String(i.natureza).startsWith('4.4.90'))
        .reduce((acc, i) => acc + (Number(i.quantidade || 0) * Number(i.unitario || 0)), 0)
    );
    const totalCusteio = Vue.computed(() =>
      form.orcamento
        .filter(i => String(i.natureza).startsWith('3.3.90'))
        .reduce((acc, i) => acc + (Number(i.quantidade || 0) * Number(i.unitario || 0)), 0)
    );
    const totalGeral = Vue.computed(() => totalInvestimento.value + totalCusteio.value);

    const addLocal = () => form.locais.push({ item: '', quantidade: '', endereco: '' });
    const removeLocal = (idx) => {
      if (form.locais.length > 1) form.locais.splice(idx, 1);
      else Object.assign(form.locais[0], { item: '', quantidade: '', endereco: '' });
    };

    const addItemOrc = () => form.orcamento.push({ nome: '', descricao: '', marca: '', natureza: '4.4.90 (Investimento)', quantidade: 1, unitario: 0 });
    const removeItemOrc = (idx) => {
      if (form.orcamento.length > 1) form.orcamento.splice(idx, 1);
      else Object.assign(form.orcamento[0], { nome: '', descricao: '', marca: '', natureza: '4.4.90 (Investimento)', quantidade: 1, unitario: 0 });
    };

    const abrirNovaProposta = () => {
      Object.assign(form, getCleanForm());
      anexosPendentes.value = [];
      resultadoEnvio.value = null;
      step.value = 1;
      modo.value = 'WIZARD';
      atualizarPreviewProtocolo();
      window.scrollTo(0, 0);
    };

    const reiniciarProposta = () => {
      if (!confirm('Deseja limpar os campos e iniciar uma nova proposta FPP?')) return;
      abrirNovaProposta();
    };

    const irParaPasso = (n) => {
      window.scrollTo(0, 0);
      step.value = Math.min(Math.max(1, n), 11);
    };

    // --- Anexos ---
    const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => resolve(r.result);
      r.onerror = reject;
    });

    const addAnexoPendente = () => {
      if (!tempAnexo.file) return alert('Selecione um arquivo.');
      if (tempAnexo.file.size > 20 * 1024 * 1024) return alert('Arquivo excede 20 MB.');
      anexosPendentes.value.push({
        file: tempAnexo.file,
        file_name: tempAnexo.file.name,
        file_desc: tempAnexo.desc || tempAnexo.file.name
      });
      tempAnexo.file = null;
      tempAnexo.desc = '';
      const el = document.getElementById('inputAnexoFppWizard');
      if (el) el.value = '';
    };

    const enviarAnexoDiretoFpp = async () => {
      if (!tempAnexo.file || !detalhe.value?.fpp?.id_fpp) return alert('Selecione um arquivo.');
      if (tempAnexo.file.size > 20 * 1024 * 1024) return alert('Arquivo excede 20 MB.');
      uploadingAnexo.value = true;
      try {
        const base64 = await fileToBase64(tempAnexo.file);
        const res = await api('adicionarAnexoDrive', {
          matricula_autor: user.matricula,
          tipo_pai: 'FPP',
          id_pai: detalhe.value.fpp.id_fpp,
          file_data: base64,
          file_name: tempAnexo.file.name,
          file_desc: tempAnexo.desc || tempAnexo.file.name
        });
        if (res.success) {
          tempAnexo.file = null;
          tempAnexo.desc = '';
          const el = document.getElementById('inputAnexoFppDetalhe');
          if (el) el.value = '';
          bootstrap.Modal.getInstance(document.getElementById('modalAnexoFppDetalhe'))?.hide();
          await abrirDetalhe(detalhe.value.fpp.id_fpp);
        } else alert(res.message);
      } finally {
        uploadingAnexo.value = false;
      }
    };

    // --- IA MIRA ---
    const sugerirComIA = async (campo) => {
      iaLoadingCampo.value = campo;
      try {
        const areaDesc = `${areaAtualObj.value.codigo} (${areaAtualObj.value.titulo})`;
        const tituloRef = form.titulo_projeto || 'Aquisição de equipamentos/viaturas para a PMSE';
        const itensTxt = form.orcamento.filter(i => i.nome).map(i => `${i.quantidade}x ${i.nome}`).join(', ') || 'bens e serviços operacionais';
        const sys = 'Você é um especialista em planejamento da Polícia Militar do Estado de Sergipe (PMSE) e elaboração de Formulários de Proposta de Projeto (FPP) conforme a Portaria SSP nº 1998/2025. Responda diretamente com o texto pronto para o formulário oficial.';

        const prompts = {
          titulo_projeto: `Sugira apenas 1 título técnico formal e objetivo (1 linha, sem aspas) para um projeto da PMSE no eixo ${areaDesc} em Sergipe (${form.ano}).`,
          objetivo_geral: `Redija o "I. Objetivo Geral" (1 parágrafo iniciando com verbo no infinitivo) para o projeto "${tituloRef}" no eixo ${areaDesc}.`,
          objetivos_especificos_txt: `Liste de 3 a 4 objetivos específicos numerados (1., 2., 3.) para o projeto "${tituloRef}" no eixo ${areaDesc}.`,
          justificativa_tecnica: `Redija a "III. Justificativa Técnica" (2 a 3 parágrafos formais) para o projeto "${tituloRef}" (${areaDesc}), considerando a mancha criminal em Sergipe, carências logísticas da unidade "${form.unidade_proponente || 'PMSE'}" e impacto na segurança pública.`,
          publico_direto: `Descreva em 1 parágrafo curto o "Público-Alvo Direto" (efetivo policial militar beneficiado) do projeto "${tituloRef}" na unidade "${form.unidade_proponente || 'PMSE'}".`,
          publico_indireto: `Descreva em 1 parágrafo curto o "Público-Alvo Indireto" (sociedade sergipana beneficiada) do projeto "${tituloRef}" (${areaDesc}).`,
          resultados_esperados: `Liste em tópicos com hífen (-) os "V. Resultados Esperados" mensuráveis para o projeto "${tituloRef}" (${areaDesc}).`,
          metas_txt: `Liste de 2 a 3 metas numeradas (1., 2.) quantificáveis para o projeto "${tituloRef}" contemplando: ${itensTxt}.`,
          sustentabilidade: `Redija o item "VII. Sustentabilidade do Projeto" explicando garantia, manutenção contínua pela PMSE e recursos futuros para "${tituloRef}".`,
          mensuracao: `Redija o item "VIII. Mensuração dos Resultados Esperados" indicando indicadores e relatórios oficiais (CEACRIM/SSP, ROPs da PMSE, inventário patrimonial) para "${tituloRef}".`,
          pesquisa_precos_obs: `Redija uma justificativa objetiva conforme o Art. 5º da Portaria SSP nº 1998/2025 fundamentando a pesquisa de preços (${itensTxt}) por meio de atas vigentes e no mínimo 3 cotações de mercado.`,
          implementacao: `Liste em etapas numeradas (1., 2., 3., 4.) a "XI. Estratégia de Implementação" para "${tituloRef}", contemplando comissão de recebimento, tombamento pela DAL/PMSE, capacitação e emprego operacional.`
        };

        const res = await api('consultarIaMira', {
          matricula: user.matricula, prompt: prompts[campo], system_instruction: sys, temperatura: 0.6
        });
        if (res.success && res.texto) form[campo] = res.texto.trim();
        else alert('Falha ao consultar IA: ' + (res.message || 'Erro desconhecido.'));
      } finally {
        iaLoadingCampo.value = '';
      }
    };

    // --- PDF Sob Demanda ---
    const getPdfOptions = (nomeArquivo) => ({
      margin: [10, 10, 10, 10],
      filename: nomeArquivo,
      image: { type: 'jpeg', quality: 0.96 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    });

    const gerarNomeArquivoPdf = (prot, tit) => {
      const limpo = (tit || 'Proposta_FPP').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      return `${prot || 'FPP'}_${limpo}.pdf`;
    };

    const abrirPreviewPdf = () => {
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPreviewPdfFpp')).show();
    };

    const baixarPdfFormatado = async (elementId, nomeArquivo) => {
      const el = document.getElementById(elementId);
      if (!el) return;
      if (typeof window.html2pdf !== 'function') {
        window.print();
        return;
      }
      setGlobalLoading(true);
      try {
        await window.html2pdf().set(getPdfOptions(nomeArquivo)).from(el).save();
      } finally {
        setGlobalLoading(false);
      }
    };

    // --- Envio para Db_Mira + Anexos na pasta FPP por Ano (sem salvar PDF estático) ---
    const enviarPropostaAeplan = async () => {
      if (!form.titulo_projeto.trim()) return alert('Preencha o Título do Projeto (Passo 2).');
      if (!form.objetivo_geral.trim()) return alert('Preencha o Objetivo Geral (Passo 3).');
      if (!form.justificativa_tecnica.trim()) return alert('Preencha a Justificativa Técnica (Passo 4).');
      if (!confirm('Confirmar envio da proposta FPP para o banco de dados da AEPLAN?')) return;

      setGlobalLoading(true);
      try {
        const objetivosParsed = form.objetivos_especificos_txt
          .split('\n').map(l => l.trim()).filter(Boolean)
          .map((l, idx) => ({ ordem: idx + 1, descricao_objetivo: l.replace(/^\d+[\.\)\-]\s*/, '') }));

        const metasParsed = form.metas_txt
          .split('\n').map(l => l.trim()).filter(Boolean)
          .map((l, idx) => ({
            ordem_objetivo: 1,
            codigo_meta: `M.${String(idx + 1).padStart(2, '0')}`,
            descricao_meta: l.replace(/^\d+[\.\)\-]\s*/, ''),
            indicador: 'Conforme FPP',
            unidade_medida: 'Unid',
            quantidade_prevista: 1,
            prazo_execucao: ''
          }));

        const locaisParsed = form.locais
          .filter(l => l.item || l.endereco)
          .map(l => ({ item_material: l.item, quantidade: l.quantidade, endereco_local: l.endereco }));

        const orcamentoParsed = form.orcamento
          .filter(i => i.nome && (Number(i.quantidade) > 0))
          .map(i => ({
            categoria_item: String(i.natureza).startsWith('4.4.90') ? 'INVESTIMENTO' : 'CUSTEIO',
            codigo_natureza: String(i.natureza).startsWith('4.4.90') ? '4490' : '3390',
            descricao_item: i.nome,
            especificacao_sucinta: i.descricao,
            marca_referencia: i.marca,
            unidade_medida: 'Unid',
            quantidade: Number(i.quantidade || 1),
            valor_unitario: Number(i.unitario || 0),
            cotacoes: []
          }));

        const resDb = await api('salvarPropostaFPP', {
          matricula_proponente: user.matricula,
          ano: Number(form.ano),
          area_tematica: form.area_tematica,
          titulo_projeto: form.titulo_projeto,
          fundo_especifico: `${areaAtualObj.value.codigo} - ${areaAtualObj.value.titulo}`,
          orgao_instituicao: form.orgao_instituicao,
          nome_proponente: form.nome_proponente,
          unidade_proponente: form.unidade_proponente,
          cargo_funcao: form.cargo_funcao,
          telefone_contato: form.telefone_contato,
          email_contato: form.email_contato,
          justificativa_tecnica: form.justificativa_tecnica,
          objetivo_geral: form.objetivo_geral,
          publico_direto: form.publico_direto,
          publico_indireto: form.publico_indireto,
          resultados_esperados: form.resultados_esperados,
          sustentabilidade: form.sustentabilidade,
          mensuracao: form.mensuracao,
          pesquisa_precos_obs: form.pesquisa_precos_obs,
          implementacao: form.implementacao,
          objetivos_especificos: objetivosParsed,
          metas_entregas: metasParsed,
          locais: locaisParsed,
          orcamento_itens: orcamentoParsed
        });

        if (!resDb.success) throw new Error(resDb.message || 'Erro ao salvar FPP no banco.');

        for (const anx of anexosPendentes.value) {
          const base64 = await fileToBase64(anx.file);
          await api('adicionarAnexoDrive', {
            matricula_autor: user.matricula,
            tipo_pai: 'FPP',
            id_pai: resDb.id_fpp,
            file_data: base64,
            file_name: anx.file_name,
            file_desc: anx.file_desc
          });
        }

        resultadoEnvio.value = {
          id_fpp: resDb.id_fpp,
          protocolo: resDb.numero_protocolo,
          link_pasta_drive: resDb.link_pasta_drive
        };
      } catch (e) {
        alert('Erro ao enviar proposta: ' + e.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    // --- CONSULTA ---
    const carregarLista = async () => {
      loading.value = true;
      try {
        const res = await api('listarPropostasFPP', { matricula: user.matricula });
        if (res.success) lista.value = res.propostas_fpp || [];
        else alert(res.message || 'Erro ao listar propostas FPP.');
      } finally {
        loading.value = false;
      }
    };

    const listaFiltrada = Vue.computed(() => {
      return lista.value.filter(p => {
        const txt = `${p.numero_protocolo} ${p.titulo_projeto} ${p.nome_proponente} ${p.unidade_proponente}`.toLowerCase();
        if (filtros.busca && !txt.includes(filtros.busca.toLowerCase())) return false;
        if (filtros.area !== 'TODAS' && String(p.area_tematica || p.fundo_especifico || '').indexOf(filtros.area) === -1) return false;
        if (filtros.status !== 'TODOS' && p.status_iniciativa !== filtros.status) return false;
        if (filtros.ano && Number(p.ano) !== Number(filtros.ano)) return false;
        return true;
      });
    });

    const kpisConsulta = Vue.computed(() => {
      const arr = listaFiltrada.value;
      return {
        total: arr.length,
        emAnalise: arr.filter(p => ['Em Análise', 'Submetida'].includes(p.status_iniciativa)).length,
        aprovadas: arr.filter(p => ['Aprovado', 'Em Execução', 'Encerrado'].includes(p.status_iniciativa)).length,
        valorTotal: arr.reduce((acc, p) => acc + Number(p.valor_total_fpp || 0), 0)
      };
    });

    const abrirDetalhe = async (idFpp) => {
      setGlobalLoading(true);
      try {
        const res = await api('obterDetalhesFPP', { matricula: user.matricula, id_fpp: idFpp });
        if (res.success) {
          detalhe.value = res;
          avalForm.status_novo = 'Aprovado';
          avalForm.matricula_gerente = res.fpp.matricula_proponente || '';
          modo.value = 'DETALHE';
          window.scrollTo(0, 0);
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    const detalheTotais = Vue.computed(() => {
      if (!detalhe.value) return { inv: 0, cust: 0, total: 0 };
      const itens = detalhe.value.orcamento_itens || [];
      const inv = itens
        .filter(i => String(i.categoria_item).toUpperCase().includes('INVEST') || String(i.codigo_natureza).startsWith('4490'))
        .reduce((a, i) => a + Number(i.valor_total_item || 0), 0);
      const cust = itens
        .filter(i => String(i.categoria_item).toUpperCase().includes('CUST') || String(i.codigo_natureza).startsWith('3390'))
        .reduce((a, i) => a + Number(i.valor_total_item || 0), 0);
      const total = Number(detalhe.value.fpp.valor_total_fpp || (inv + cust));
      return { inv, cust, total };
    });

    const avaliarFppAdmin = async () => {
      if (!detalhe.value?.fpp?.id_iniciativa) return;
      if (avalForm.status_novo === 'Aprovado' && !avalForm.matricula_gerente) {
        return alert('Selecione o Gerente Responsável para aprovar.');
      }
      setGlobalLoading(true);
      try {
        const res = await api('avaliarIniciativa', {
          solicitante_matricula: user.matricula,
          id_iniciativa: detalhe.value.fpp.id_iniciativa,
          status_novo: avalForm.status_novo,
          info: { matricula_gerente: avalForm.matricula_gerente }
        });
        if (res.success) {
          bootstrap.Modal.getInstance(document.getElementById('modalAvaliarFppAdmin'))?.hide();
          await abrirDetalhe(detalhe.value.fpp.id_fpp);
          await carregarLista();
        } else alert(res.message);
      } finally {
        setGlobalLoading(false);
      }
    };

    Vue.onMounted(carregarLista);

    return {
      modo, step, loading, iaLoadingCampo, lista, listaFiltrada, kpisConsulta, detalhe, detalheTotais, resultadoEnvio,
      filtros, avalForm, anexosPendentes, tempAnexo, uploadingAnexo,
      areasTematicas, passosMeta, form, user, initialData, utils,
      areaAtualObj, passoAtualObj, proximoPassoObj, totalInvestimento, totalCusteio, totalGeral,
      selecionarArea, atualizarPreviewProtocolo, addLocal, removeLocal, addItemOrc, removeItemOrc,
      addAnexoPendente, enviarAnexoDiretoFpp,
      abrirNovaProposta, reiniciarProposta, irParaPasso, sugerirComIA,
      abrirPreviewPdf, baixarPdfFormatado, gerarNomeArquivoPdf, enviarPropostaAeplan,
      carregarLista, abrirDetalhe, avaliarFppAdmin
    };
  },
  template: `
    <div>
      <!-- 1. LISTA DE CONSULTA -->
      <div v-if="modo === 'LISTA'">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div>
            <h4 class="text-primary fw-bold m-0"><i class="bi bi-file-earmark-ruled me-2"></i>Propostas FPP (Fundo a Fundo SSP)</h4>
            <small class="text-muted">Consulte as propostas enviadas, gere o PDF oficial sob demanda ou crie uma nova proposta</small>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-light border btn-sm" @click="carregarLista" title="Atualizar"><i class="bi bi-arrow-clockwise"></i></button>
            <button class="btn btn-primary fw-bold btn-sm px-3" @click="abrirNovaProposta"><i class="bi bi-plus-lg me-1"></i> Nova Proposta FPP</button>
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-6 col-md-3"><div class="card border-0 shadow-sm p-3 border-start border-4 border-primary"><small class="text-muted fw-bold">TOTAL ENVIADAS</small><div class="fs-3 fw-bold">{{ kpisConsulta.total }}</div></div></div>
          <div class="col-6 col-md-3"><div class="card border-0 shadow-sm p-3 border-start border-4 border-warning"><small class="text-muted fw-bold">EM ANÁLISE</small><div class="fs-3 fw-bold text-warning-emphasis">{{ kpisConsulta.emAnalise }}</div></div></div>
          <div class="col-6 col-md-3"><div class="card border-0 shadow-sm p-3 border-start border-4 border-success"><small class="text-muted fw-bold">APROVADAS</small><div class="fs-3 fw-bold text-success">{{ kpisConsulta.aprovadas }}</div></div></div>
          <div class="col-6 col-md-3"><div class="card border-0 shadow-sm p-3 border-start border-4 border-dark"><small class="text-muted fw-bold">VOLUME TOTAL</small><div class="fs-5 fw-bold text-dark mt-1">{{ utils.formatMoeda(kpisConsulta.valorTotal) }}</div></div></div>
        </div>

        <div class="card border-0 shadow-sm p-2 mb-3">
          <div class="row g-2 align-items-center">
            <div class="col-md-5"><input v-model="filtros.busca" class="form-control form-control-sm" placeholder="Buscar por protocolo, título, proponente ou unidade..."></div>
            <div class="col-4 col-md-3">
              <select v-model="filtros.area" class="form-select form-select-sm">
                <option value="TODAS">Todas as Áreas (MVI/EVM/MQV)</option>
                <option value="MVI">MVI</option><option value="EVM">EVM</option><option value="MQV">MQV</option>
              </select>
            </div>
            <div class="col-4 col-md-2">
              <select v-model="filtros.status" class="form-select form-select-sm">
                <option value="TODOS">Todos Status</option><option value="Em Análise">Em Análise</option><option value="Aprovado">Aprovado</option><option value="Reprovado">Reprovado</option>
              </select>
            </div>
            <div class="col-4 col-md-2"><input v-model="filtros.ano" type="number" class="form-control form-control-sm" placeholder="Ano"></div>
          </div>
        </div>

        <div v-if="loading" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else class="table-responsive bg-white border rounded shadow-sm">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr><th>Protocolo / Ano</th><th>Projeto &amp; Área</th><th>Proponente / Unidade</th><th class="text-end">Valor Total</th><th class="text-center">Status</th><th class="text-end">Ações</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in listaFiltrada" :key="p.id_fpp" class="cursor-pointer" @click="abrirDetalhe(p.id_fpp)">
                <td><div class="fw-bold font-monospace text-primary">{{ p.numero_protocolo }}</div><small class="text-muted">{{ p.ano }} • {{ utils.formatDate(p.data_submissao) }}</small></td>
                <td><div class="fw-bold text-dark">{{ p.titulo_projeto }}</div><span class="badge bg-light text-secondary border">{{ p.fundo_especifico }}</span></td>
                <td><div>{{ p.nome_proponente }}</div><small class="text-muted">{{ p.unidade_proponente || '-' }}</small></td>
                <td class="text-end fw-bold text-success">{{ utils.formatMoeda(p.valor_total_fpp) }}</td>
                <td class="text-center"><span class="badge" :class="p.status_iniciativa==='Aprovado'?'bg-success':(p.status_iniciativa==='Reprovado'?'bg-danger':'bg-warning text-dark')">{{ p.status_iniciativa }}</span></td>
                <td class="text-end" @click.stop>
                  <a v-if="p.link_pasta_drive" :href="p.link_pasta_drive" target="_blank" class="btn btn-sm btn-outline-secondary me-1" title="Pasta de Anexos no Drive"><i class="bi bi-folder2-open"></i></a>
                  <button class="btn btn-sm btn-outline-primary fw-bold" @click="abrirDetalhe(p.id_fpp)">Consultar / PDF</button>
                </td>
              </tr>
              <tr v-if="!listaFiltrada.length"><td colspan="6" class="text-center py-5 text-muted">Nenhuma proposta FPP encontrada.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. CONSULTA DETALHADA + PDF SOB DEMANDA + ANEXOS -->
      <div v-if="modo === 'DETALHE' && detalhe">
        <div class="fpp-hero-dark mb-4 d-print-none">
          <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button class="btn btn-sm btn-outline-light me-2" @click="modo='LISTA'">← Voltar</button>
              <span class="badge bg-primary">{{ detalhe.fpp.fundo_especifico }}</span>
              <span class="badge bg-secondary bg-opacity-50 font-monospace">{{ detalhe.fpp.numero_protocolo }}</span>
              <span class="badge" :class="detalhe.fpp.status_iniciativa==='Aprovado'?'bg-success':(detalhe.fpp.status_iniciativa==='Reprovado'?'bg-danger':'bg-warning text-dark')">{{ detalhe.fpp.status_iniciativa }}</span>
            </div>
            <small class="text-white-50">Ano {{ detalhe.fpp.ano }} • Enviada em {{ utils.formatDateTime(detalhe.fpp.data_submissao) }}</small>
          </div>
          <h3 class="fw-bold mb-1">{{ detalhe.fpp.titulo_projeto }}</h3>
          <div class="small text-white-50 mb-4">{{ detalhe.fpp.orgao_instituicao }} • {{ detalhe.fpp.nome_proponente }} ({{ detalhe.fpp.unidade_proponente || '-' }})</div>
          <div class="fpp-kpi-box mb-3">
            <div class="row g-3">
              <div class="col-md-4"><small class="text-white-50 d-block">INVESTIMENTO (4.4.90):</small><span class="fs-4 fw-bold text-info">{{ utils.formatMoeda(detalheTotais.inv) }}</span></div>
              <div class="col-md-4"><small class="text-white-50 d-block">CUSTEIO (3.3.90):</small><span class="fs-4 fw-bold text-warning">{{ utils.formatMoeda(detalheTotais.cust) }}</span></div>
              <div class="col-md-4"><small class="text-white-50 d-block">VALOR TOTAL FPP:</small><span class="fs-4 fw-bold text-success">{{ utils.formatMoeda(detalheTotais.total) }}</span></div>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-danger fw-bold" @click="baixarPdfFormatado('fpp-consulta-a4', gerarNomeArquivoPdf(detalhe.fpp.numero_protocolo, detalhe.fpp.titulo_projeto))">
              <i class="bi bi-file-earmark-pdf me-1"></i> Montar e Baixar PDF
            </button>
            <button class="btn btn-outline-light" onclick="window.print()"><i class="bi bi-printer me-1"></i> Imprimir</button>
            <a v-if="detalhe.fpp.link_pasta_drive" :href="detalhe.fpp.link_pasta_drive" target="_blank" class="btn btn-outline-light"><i class="bi bi-folder2-open me-1"></i> Pasta Drive ({{ detalhe.fpp.ano }})</a>
            <button class="btn btn-outline-info" data-bs-toggle="modal" data-bs-target="#modalAnexoFppDetalhe"><i class="bi bi-paperclip me-1"></i> Anexos ({{ detalhe.anexos.length }})</button>
            <button v-if="user.perfil==='ADMIN'" class="btn btn-success fw-bold ms-auto" data-bs-toggle="modal" data-bs-target="#modalAvaliarFppAdmin">
              <i class="bi bi-check2-circle me-1"></i> Avaliar (Admin)
            </button>
          </div>
        </div>

        <div id="fpp-consulta-a4" class="card border-0 shadow-sm p-4 small">
          <div class="text-center border-bottom border-2 border-dark pb-2 mb-3">
            <div class="fw-bold fs-6">GOVERNO DO ESTADO DE SERGIPE • SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA</div>
            <div class="fw-bold text-primary">FORMULÁRIO DE PROPOSTA DE PROJETO (FPP) — PORTARIA SSP Nº 1998/2025</div>
            <div class="small mt-1"><strong>Protocolo:</strong> {{ detalhe.fpp.numero_protocolo }} | <strong>Eixo:</strong> {{ detalhe.fpp.fundo_especifico }}</div>
          </div>
          <table class="table table-sm table-bordered mb-3">
            <tbody>
              <tr><td colspan="2"><strong>Título do Projeto:</strong> {{ detalhe.fpp.titulo_projeto }}</td></tr>
              <tr><td colspan="2"><strong>Órgão / Instituição:</strong> {{ detalhe.fpp.orgao_instituicao }}</td></tr>
              <tr><td><strong>Responsável Técnico:</strong> {{ detalhe.fpp.nome_proponente }}</td><td><strong>Posto/Cargo:</strong> {{ detalhe.fpp.cargo_funcao || '-' }}</td></tr>
              <tr><td><strong>Lotação:</strong> {{ detalhe.fpp.unidade_proponente || '-' }}</td><td><strong>Contato:</strong> {{ detalhe.fpp.telefone_contato || '-' }} | {{ detalhe.fpp.email_contato || '-' }}</td></tr>
            </tbody>
          </table>
          <p><strong>I. OBJETIVO GERAL:</strong><br>{{ detalhe.fpp.objetivo_geral || '-' }}</p>
          <div><strong>II. OBJETIVOS ESPECÍFICOS:</strong>
            <ul v-if="detalhe.objetivos_especificos.length" class="mb-3"><li v-for="o in detalhe.objetivos_especificos" :key="o.id_fpp_objetivo">{{ o.ordem }}. {{ o.descricao_objetivo }}</li></ul>
            <p v-else>-</p>
          </div>
          <p style="white-space: pre-line;"><strong>III. JUSTIFICATIVA TÉCNICA:</strong><br>{{ detalhe.fpp.justificativa_tecnica || '-' }}</p>
          <p><strong>IV. PÚBLICO-ALVO:</strong><br><strong>Direto:</strong> {{ detalhe.fpp.publico_direto || '-' }}<br><strong>Indireto:</strong> {{ detalhe.fpp.publico_indireto || '-' }}</p>
          <p style="white-space: pre-line;"><strong>V. RESULTADOS ESPERADOS:</strong><br>{{ detalhe.fpp.resultados_esperados || '-' }}</p>
          <div><strong>VI. METAS E ENTREGAS:</strong>
            <table class="table table-sm table-bordered mt-1 mb-3" v-if="detalhe.metas_entregas.length">
              <thead class="table-light"><tr><th>Cód</th><th>Descrição</th><th>Indicador</th><th>Qtd</th></tr></thead>
              <tbody><tr v-for="m in detalhe.metas_entregas" :key="m.id_fpp_meta"><td>{{ m.codigo_meta }}</td><td>{{ m.descricao_meta }}</td><td>{{ m.indicador }}</td><td>{{ m.quantidade_prevista }} {{ m.unidade_medida }}</td></tr></tbody>
            </table>
            <p v-else>-</p>
          </div>
          <p style="white-space: pre-line;"><strong>VII. SUSTENTABILIDADE:</strong><br>{{ detalhe.fpp.sustentabilidade || '-' }}</p>
          <p style="white-space: pre-line;"><strong>VIII. MENSURAÇÃO:</strong><br>{{ detalhe.fpp.mensuracao || '-' }}</p>
          <div><strong>IX. PLANO DE LOCALIZAÇÃO:</strong>
            <table class="table table-sm table-bordered mt-1 mb-3" v-if="detalhe.locais.length">
              <thead class="table-light"><tr><th>Item / Material</th><th>Qtd</th><th>Endereço / Lotação</th></tr></thead>
              <tbody><tr v-for="l in detalhe.locais" :key="l.id_fpp_local"><td>{{ l.item_material }}</td><td>{{ l.quantidade }}</td><td>{{ l.endereco_local }}</td></tr></tbody>
            </table>
            <p v-else>-</p>
          </div>
          <strong>X. MATERIAIS, SERVIÇOS &amp; ORÇAMENTO:</strong>
          <table class="table table-sm table-bordered mt-1 mb-2">
            <thead class="table-light"><tr><th>Item</th><th>Especificação / Marca</th><th>Natureza</th><th>Qtd</th><th class="text-end">Unitário</th><th class="text-end">Total</th></tr></thead>
            <tbody>
              <tr v-for="it in detalhe.orcamento_itens" :key="it.id_fpp_item">
                <td>{{ it.descricao_item }}</td><td>{{ it.especificacao_sucinta || '-' }} {{ it.marca_referencia ? '('+it.marca_referencia+')' : '' }}</td>
                <td>{{ it.codigo_natureza }} ({{ it.categoria_item }})</td><td>{{ it.quantidade }}</td>
                <td class="text-end">{{ utils.formatMoeda(it.valor_unitario) }}</td><td class="text-end fw-bold">{{ utils.formatMoeda(it.valor_total_item) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="5" class="text-end fw-bold">Total Investimento (4.4.90):</td><td class="text-end fw-bold">{{ utils.formatMoeda(detalheTotais.inv) }}</td></tr>
              <tr><td colspan="5" class="text-end fw-bold">Total Custeio (3.3.90):</td><td class="text-end fw-bold">{{ utils.formatMoeda(detalheTotais.cust) }}</td></tr>
              <tr class="table-success fw-bold"><td colspan="5" class="text-end">VALOR TOTAL FPP:</td><td class="text-end">{{ utils.formatMoeda(detalheTotais.total) }}</td></tr>
            </tfoot>
          </table>
          <p v-if="detalhe.fpp.pesquisa_precos_obs"><strong>Pesquisa de Preços (Art. 5º):</strong> {{ detalhe.fpp.pesquisa_precos_obs }}</p>
          <p style="white-space: pre-line;"><strong>XI. ESTRATÉGIA DE IMPLEMENTAÇÃO:</strong><br>{{ detalhe.fpp.implementacao || '-' }}</p>

          <div v-if="detalhe.anexos.length" class="mt-3 pt-2 border-top d-print-none">
            <strong>Anexos Arquivados no Drive:</strong>
            <ul class="mb-0 mt-1">
              <li v-for="a in detalhe.anexos" :key="a.id_anexo">
                <a :href="a.url_arquivo" target="_blank">{{ a.descricao }}</a> <small class="text-muted">({{ a.nome_autor }} • {{ utils.formatDateTime(a.data_upload) }})</small>
              </li>
            </ul>
          </div>
        </div>

        <!-- MODAL ANEXO FPP -->
        <div class="modal fade" id="modalAnexoFppDetalhe" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header"><h5 class="modal-title fw-bold">Anexos da Proposta ({{ detalhe.fpp.ano }})</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
              <div class="modal-body">
                <ul class="list-group mb-3" v-if="detalhe.anexos.length">
                  <li v-for="a in detalhe.anexos" :key="a.id_anexo" class="list-group-item d-flex justify-content-between align-items-center small">
                    <a :href="a.url_arquivo" target="_blank" class="fw-bold">{{ a.descricao }}</a>
                    <span class="text-muted">{{ utils.formatDate(a.data_upload) }}</span>
                  </li>
                </ul>
                <input type="file" id="inputAnexoFppDetalhe" class="form-control mb-2" @change="tempAnexo.file = $event.target.files[0]">
                <input v-model="tempAnexo.desc" class="form-control" placeholder="Descrição do anexo">
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" @click="enviarAnexoDiretoFpp" :disabled="uploadingAnexo">{{ uploadingAnexo ? 'Enviando...' : 'Enviar para Pasta FPP' }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL AVALIAR FPP (ADMIN) -->
        <div class="modal fade" id="modalAvaliarFppAdmin" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header"><h5 class="modal-title fw-bold">Avaliar Proposta FPP</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
              <div class="modal-body">
                <div class="mb-3"><label class="small fw-bold">Decisão</label>
                  <select v-model="avalForm.status_novo" class="form-select"><option value="Aprovado">Aprovar (Promover a Projeto)</option><option value="Em Análise">Manter Em Análise</option><option value="Reprovado">Reprovar</option></select>
                </div>
                <div><label class="small fw-bold">Gerente Responsável</label>
                  <select v-model="avalForm.matricula_gerente" class="form-select"><option value="">-- Selecione --</option><option v-for="u in initialData.usuarios" :key="u.matricula" :value="u.matricula">{{ u.nome }} ({{ u.matricula }})</option></select>
                </div>
              </div>
              <div class="modal-footer"><button class="btn btn-success fw-bold" @click="avaliarFppAdmin">Confirmar Decisão</button></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. WIZARD DE 11 PASSOS -->
      <div v-if="modo === 'WIZARD'">
        <div v-if="resultadoEnvio" class="card shadow border-0 p-5 text-center mx-auto my-4" style="max-width: 650px;">
          <i class="bi bi-check-circle-fill text-success mb-3" style="font-size: 4rem;"></i>
          <h3 class="fw-bold text-success">Proposta Salva no Banco de Dados!</h3>
          <p class="mb-2">Protocolo Oficial: <strong class="bg-light px-2 py-1 border rounded font-monospace">{{ resultadoEnvio.protocolo }}</strong></p>
          <p class="small text-muted mb-4">Dados salvos em Db_Mira. Você pode consultar e gerar o PDF formatado a qualquer momento.</p>
          <div class="d-flex justify-content-center gap-2 flex-wrap">
            <a v-if="resultadoEnvio.link_pasta_drive" :href="resultadoEnvio.link_pasta_drive" target="_blank" class="btn btn-outline-secondary fw-bold"><i class="bi bi-folder2-open me-1"></i> Abrir Pasta Drive</a>
            <button class="btn btn-outline-primary fw-bold" @click="abrirDetalhe(resultadoEnvio.id_fpp)">Consultar Ficha / Montar PDF</button>
            <button class="btn btn-primary fw-bold" @click="modo='LISTA'; carregarLista()">Ir para Lista</button>
          </div>
        </div>

        <div v-else>
          <div class="card border-0 shadow-sm mb-3 p-3" style="border-radius: 14px;">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div class="d-flex align-items-center gap-3">
                <button class="btn btn-light border rounded-3" @click="reiniciarProposta" title="Reiniciar formulário"><i class="bi bi-arrow-counterclockwise"></i></button>
                <div class="lh-sm"><div class="fw-bold text-primary">Passo {{ step }} de 11</div><small class="text-muted">{{ passoAtualObj.nome }}</small></div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <button class="btn btn-light border rounded-3" @click="modo='LISTA'; carregarLista()" title="Voltar para Lista"><i class="bi bi-folder"></i></button>
                <button class="btn btn-light border rounded-3" @click="irParaPasso(2)" title="Identificação"><i class="bi bi-gear"></i></button>
                <button class="btn btn-outline-danger rounded-3 fw-bold px-3" @click="abrirPreviewPdf"><i class="bi bi-file-earmark-pdf me-1"></i> PDF</button>
              </div>
            </div>
            <div class="progress" style="height: 6px; border-radius: 6px;"><div class="progress-bar bg-primary" :style="{ width: ((step / 11) * 100) + '%' }"></div></div>
          </div>

          <div class="card border-0 shadow-sm p-4 mb-3" style="border-radius: 14px;">
            <!-- PASSO 1 -->
            <div v-if="step === 1">
              <h5 class="fw-bold mb-1">Passo 1: Selecione a Área Temática do Projeto</h5>
              <p class="small text-muted mb-4">A Portaria SSP nº 1998/2025 estabelece 3 eixos prioritários de investimento para captação de recursos.</p>
              <div class="row g-3 mb-4">
                <div class="col-md-4" v-for="a in areasTematicas" :key="a.codigo">
                  <div class="p-3 h-100 fpp-card-area" :class="[a.classeCard, { selected: form.area_tematica === a.codigo }]" @click="selecionarArea(a.codigo)">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                      <div class="fpp-icon-box" :class="a.corIconBg"><i class="bi" :class="a.icone"></i></div>
                      <span v-if="form.area_tematica === a.codigo" class="badge rounded-pill px-3 py-2" :class="a.corBadge">SELECIONADO</span>
                    </div>
                    <div class="fw-bold fs-5 text-dark">{{ a.codigo }}</div>
                    <div class="fw-bold small mb-2" :class="a.corTexto">{{ a.titulo }}</div>
                    <p class="small text-muted mb-0 lh-sm">{{ a.desc }}</p>
                  </div>
                </div>
              </div>
              <div class="border rounded-3 p-3 bg-light row g-3 align-items-end">
                <div class="col-md-3">
                  <label class="small fw-bold text-uppercase">ANO DE REFERÊNCIA:</label>
                  <input v-model="form.ano" @change="atualizarPreviewProtocolo" type="number" class="form-control fw-bold">
                </div>
                <div class="col-md-9">
                  <div class="small fw-bold text-uppercase text-dark">PREVISÃO DO NÚMERO OFICIAL DA PROPOSTA:</div>
                  <div class="d-flex flex-wrap align-items-center gap-3 mt-1">
                    <input :value="form.numero_protocolo" class="form-control fw-bold text-secondary font-monospace w-auto bg-secondary bg-opacity-10" disabled>
                    <small class="text-muted fst-italic">(Sequencial definitivo por Área e Ano gerado no envio)</small>
                  </div>
                </div>
              </div>
            </div>

            <!-- PASSO 2 -->
            <div v-if="step === 2">
              <h5 class="fw-bold mb-1">Passo 2: Identificação do Projeto &amp; Responsável Técnico</h5>
              <p class="small text-muted mb-4">Defina o título do projeto e os dados do oficial/servidor responsável pela proposta técnica.</p>
              <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <label class="small fw-bold text-uppercase">TÍTULO DO PROJETO:</label>
                  <button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('titulo_projeto')" :disabled="!!iaLoadingCampo">
                    <span v-if="iaLoadingCampo==='titulo_projeto'" class="spinner-border spinner-border-sm me-1"></span><i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                  </button>
                </div>
                <input v-model="form.titulo_projeto" class="form-control" placeholder="Ex: Aquisição de Viaturas Policiais Operacionais 4x4 para Redução de Homicídios no Alto Sertão">
              </div>
              <div class="row g-3">
                <div class="col-md-6"><label class="small fw-bold">Órgão / Instituição:</label><input v-model="form.orgao_instituicao" class="form-control"></div>
                <div class="col-md-6"><label class="small fw-bold">Responsável Técnico pelo Projeto:</label><input v-model="form.nome_proponente" class="form-control"></div>
                <div class="col-md-6"><label class="small fw-bold">Posto / Graduação / Cargo:</label><input v-model="form.cargo_funcao" class="form-control" placeholder="Ex: Major PM - Subcomandante"></div>
                <div class="col-md-6"><label class="small fw-bold">Lotação (OPM / Batalhão / Companhia):</label><input v-model="form.unidade_proponente" class="form-control"></div>
                <div class="col-md-6"><label class="small fw-bold">Telefone Institucional:</label><input v-model="form.telefone_contato" class="form-control"></div>
                <div class="col-md-6"><label class="small fw-bold">E-mail Institucional:</label><input v-model="form.email_contato" type="email" class="form-control"></div>
              </div>
            </div>

            <!-- PASSO 3 -->
            <div v-if="step === 3">
              <h5 class="fw-bold mb-1">Passo 3: Objetivos do Projeto (Itens I e II)</h5>
              <p class="small text-muted mb-4">Descreva o resultado macro a ser alcançado e as metas específicas da proposta.</p>
              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold text-uppercase">I. OBJETIVO GERAL:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('objetivo_geral')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.objetivo_geral" class="form-control" rows="4"></textarea>
              </div>
              <div>
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold text-uppercase">II. OBJETIVOS ESPECÍFICOS:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('objetivos_especificos_txt')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.objetivos_especificos_txt" class="form-control" rows="4"></textarea>
              </div>
            </div>

            <!-- PASSO 4 -->
            <div v-if="step === 4">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div><h5 class="fw-bold mb-1">Passo 4: III. Justificativa Técnica</h5><p class="small text-muted m-0">Fundamente a necessidade da aquisição com dados estatísticos da mancha criminal em Sergipe, carências logísticas e impacto na segurança da sociedade.</p></div>
                <button type="button" class="btn btn-ia-fpp flex-shrink-0" @click="sugerirComIA('justificativa_tecnica')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button>
              </div>
              <textarea v-model="form.justificativa_tecnica" class="form-control" rows="8"></textarea>
            </div>

            <!-- PASSO 5 -->
            <div v-if="step === 5">
              <h5 class="fw-bold mb-1">Passo 5: IV. Público-Alvo do Projeto</h5>
              <p class="small text-muted mb-4">Identifique os beneficiários imediatos (servidores) e mediatos (sociedade).</p>
              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold">Público-Alvo Direto:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('publico_direto')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.publico_direto" class="form-control" rows="3"></textarea>
              </div>
              <div>
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold">Público-Alvo Indireto:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('publico_indireto')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.publico_indireto" class="form-control" rows="3"></textarea>
              </div>
            </div>

            <!-- PASSO 6 -->
            <div v-if="step === 6">
              <h5 class="fw-bold mb-1">Passo 6: V. Resultados Esperados &amp; VI. Metas</h5>
              <p class="small text-muted mb-4">Estabeleça os efeitos positivos mensuráveis e metas quantificáveis do projeto.</p>
              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold text-uppercase">V. RESULTADOS ESPERADOS:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('resultados_esperados')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.resultados_esperados" class="form-control" rows="4"></textarea>
              </div>
              <div>
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold text-uppercase">VI. METAS:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('metas_txt')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.metas_txt" class="form-control" rows="4"></textarea>
              </div>
            </div>

            <!-- PASSO 7 -->
            <div v-if="step === 7">
              <h5 class="fw-bold mb-1">Passo 7: VII. Sustentabilidade &amp; VIII. Mensuração</h5>
              <p class="small text-muted mb-4">Especifique a manutenção após a aquisição e como os resultados serão comprovados.</p>
              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold text-uppercase">VII. SUSTENTABILIDADE DO PROJETO:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('sustentabilidade')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.sustentabilidade" class="form-control" rows="4"></textarea>
              </div>
              <div>
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold text-uppercase">VIII. MENSURAÇÃO DOS RESULTADOS ESPERADOS:</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('mensuracao')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.mensuracao" class="form-control" rows="4"></textarea>
              </div>
            </div>

            <!-- PASSO 8 -->
            <div v-if="step === 8">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div><h5 class="fw-bold mb-1">Passo 8: IX. Plano de Localização</h5><p class="small text-muted m-0">Endereço exato onde os materiais e equipamentos serão instalados ou empregados em Sergipe.</p></div>
                <button type="button" class="btn btn-outline-primary btn-sm fw-bold" @click="addLocal">+ Adicionar Local</button>
              </div>
              <div class="table-responsive border rounded-3">
                <table class="table table-borderless align-middle mb-0">
                  <thead class="table-light small text-muted"><tr><th>ITEM / MATERIAL</th><th style="width: 130px;">QUANTIDADE</th><th>ENDEREÇO DE INSTALAÇÃO / LOTAÇÃO</th><th style="width: 45px;"></th></tr></thead>
                  <tbody>
                    <tr v-for="(loc, idx) in form.locais" :key="idx" class="border-top">
                      <td><input v-model="loc.item" class="form-control form-control-sm" placeholder="Ex: Viaturas operacionais"></td>
                      <td><input v-model="loc.quantidade" class="form-control form-control-sm" placeholder="Ex: 02"></td>
                      <td><input v-model="loc.endereco" class="form-control form-control-sm" placeholder="Ex: Sede do 3º BPM - Itabaiana/SE"></td>
                      <td class="text-center"><button type="button" class="btn btn-link text-muted p-0" @click="removeLocal(idx)"><i class="bi bi-trash"></i></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- PASSO 9 -->
            <div v-if="step === 9">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div><h5 class="fw-bold mb-1">Passo 9: X. Materiais, Serviços &amp; Orçamento</h5><p class="small text-muted m-0">Itens orçados com Natureza da Despesa resumida: <strong>4.4.90 (Investimento)</strong> ou <strong>3.3.90 (Custeio)</strong>.</p></div>
                <button type="button" class="btn btn-success btn-sm fw-bold px-3" @click="addItemOrc">+ Adicionar Item</button>
              </div>
              <div class="table-responsive border rounded-3 mb-3">
                <table class="table table-borderless align-middle mb-0 small">
                  <thead class="table-light text-muted">
                    <tr><th>MATERIAL/SERVIÇO</th><th>DESCRIÇÃO SUCINTA</th><th>MARCA/REF.</th><th style="width: 195px;">NATUREZA DESPESA</th><th style="width: 80px;">QTD</th><th style="width: 115px;">UNITÁRIO (R$)</th><th class="text-end" style="width: 110px;">TOTAL (R$)</th><th style="width: 35px;"></th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(it, idx) in form.orcamento" :key="idx" class="border-top">
                      <td><input v-model="it.nome" class="form-control form-control-sm" placeholder="Nome do bem"></td>
                      <td><input v-model="it.descricao" class="form-control form-control-sm" placeholder="Especificação"></td>
                      <td><input v-model="it.marca" class="form-control form-control-sm" placeholder="Ref."></td>
                      <td><select v-model="it.natureza" class="form-select form-select-sm"><option>4.4.90 (Investimento)</option><option>3.3.90 (Custeio)</option></select></td>
                      <td><input v-model="it.quantidade" type="number" min="1" class="form-control form-control-sm text-center"></td>
                      <td><input v-model="it.unitario" type="number" step="0.01" min="0" class="form-control form-control-sm text-end"></td>
                      <td class="text-end fw-bold">{{ utils.formatMoeda((Number(it.quantidade)||0) * (Number(it.unitario)||0)) }}</td>
                      <td class="text-center"><button type="button" class="btn btn-link text-muted p-0" @click="removeItemOrc(idx)"><i class="bi bi-trash"></i></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="fpp-hero-dark mb-4 py-3">
                <div class="row text-start">
                  <div class="col-md-4"><small class="text-white-50 d-block">TOTAL INVESTIMENTO (4.4.90):</small><span class="fs-5 fw-bold text-info">{{ utils.formatMoeda(totalInvestimento) }}</span></div>
                  <div class="col-md-4"><small class="text-white-50 d-block">TOTAL CUSTEIO (3.3.90):</small><span class="fs-5 fw-bold text-warning">{{ utils.formatMoeda(totalCusteio) }}</span></div>
                  <div class="col-md-4"><small class="text-white-50 d-block">VALOR TOTAL GERAL:</small><span class="fs-5 fw-bold text-success">{{ utils.formatMoeda(totalGeral) }}</span></div>
                </div>
              </div>
              <div>
                <div class="d-flex justify-content-between align-items-center mb-1"><label class="small fw-bold">Observações sobre Pesquisa de Preços (Art. 5º da Portaria SSP nº 1998/2025):</label><button type="button" class="btn btn-ia-fpp" @click="sugerirComIA('pesquisa_precos_obs')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button></div>
                <textarea v-model="form.pesquisa_precos_obs" class="form-control" rows="3"></textarea>
              </div>
            </div>

            <!-- PASSO 10 -->
            <div v-if="step === 10">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div><h5 class="fw-bold mb-1">Passo 10: XI. Estratégia de Implementação</h5><p class="small text-muted m-0">Descreva as etapas posteriores à liberação dos recursos: comissão de recebimento, tombamento pela DAL/PMSE, capacitação e entrega operacional.</p></div>
                <button type="button" class="btn btn-ia-fpp flex-shrink-0" @click="sugerirComIA('implementacao')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars me-1"></i> Sugerir com IA</button>
              </div>
              <textarea v-model="form.implementacao" class="form-control" rows="7"></textarea>
            </div>

            <!-- PASSO 11 -->
            <div v-if="step === 11">
              <div class="fpp-hero-dark mb-4">
                <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                  <div><span class="badge bg-primary me-2">ÁREA: {{ form.area_tematica }}</span><span class="badge bg-secondary bg-opacity-50 font-monospace">Nº: {{ form.numero_protocolo }}</span></div>
                  <small class="text-white-50">Portaria SSP nº 1998/2025 • Ano {{ form.ano }}</small>
                </div>
                <h3 class="fw-bold mb-1">{{ form.titulo_projeto || 'Proposta de Projeto sem Título' }}</h3>
                <div class="small text-white-50 mb-4">{{ form.orgao_instituicao }} • {{ form.unidade_proponente || 'Lotação não especificada' }}</div>
                <div class="fpp-kpi-box mb-4">
                  <div class="row g-3">
                    <div class="col-md-4"><small class="text-white-50 d-block">INVESTIMENTO (4.4.90):</small><span class="fs-4 fw-bold text-info">{{ utils.formatMoeda(totalInvestimento) }}</span></div>
                    <div class="col-md-4"><small class="text-white-50 d-block">CUSTEIO (3.3.90):</small><span class="fs-4 fw-bold text-warning">{{ utils.formatMoeda(totalCusteio) }}</span></div>
                    <div class="col-md-4"><small class="text-white-50 d-block">VALOR TOTAL DA PROPOSTA:</small><span class="fs-4 fw-bold text-success">{{ utils.formatMoeda(totalGeral) }}</span></div>
                  </div>
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-outline-light px-3" @click="abrirPreviewPdf"><i class="bi bi-eye me-2"></i>Visualizar e Baixar PDF Formatado</button>
                  <button class="btn btn-primary fw-bold px-4" @click="enviarPropostaAeplan"><i class="bi bi-send me-2"></i>Salvar Proposta na AEPLAN</button>
                </div>
              </div>

              <div class="card bg-light border p-3 mb-4">
                <h6 class="fw-bold mb-2"><i class="bi bi-paperclip me-1"></i> Anexos da Proposta (Cotações, ETP, Ofícios — Pasta {{ form.ano }})</h6>
                <div class="input-group input-group-sm mb-2">
                  <input type="file" id="inputAnexoFppWizard" class="form-control" @change="tempAnexo.file = $event.target.files[0]">
                  <input v-model="tempAnexo.desc" class="form-control" placeholder="Descrição do anexo">
                  <button type="button" class="btn btn-primary" @click="addAnexoPendente">Adicionar</button>
                </div>
                <ul class="list-group list-group-flush small" v-if="anexosPendentes.length">
                  <li v-for="(a, i) in anexosPendentes" :key="i" class="list-group-item d-flex justify-content-between">
                    <span>{{ a.file_desc }} <small class="text-muted">({{ a.file_name }})</small></span>
                    <button type="button" class="btn btn-link text-danger p-0" @click="anexosPendentes.splice(i,1)">Remover</button>
                  </li>
                </ul>
              </div>

              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold m-0">Resumo dos Dados Técnicos da Proposta</h5>
                <small class="text-muted">Clique no botão editar para ajustar qualquer campo</small>
              </div>
              <div class="vstack gap-3 small">
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">IDENTIFICAÇÃO</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(2)"><i class="bi bi-pencil"></i> Editar</button></div><div><strong>Título:</strong> {{ form.titulo_projeto || 'Não informado' }} | <strong>Responsável:</strong> {{ form.nome_proponente || '-' }} | <strong>E-mail:</strong> {{ form.email_contato || '-' }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">I &amp; II. OBJETIVOS</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(3)"><i class="bi bi-pencil"></i> Editar</button></div><div><strong>Geral:</strong> {{ form.objetivo_geral || '-' }}<br><strong>Específicos:</strong> {{ form.objetivos_especificos_txt || '-' }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">III. JUSTIFICATIVA TÉCNICA</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(4)"><i class="bi bi-pencil"></i> Editar</button></div><div>{{ form.justificativa_tecnica || '-' }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">IV. PÚBLICO-ALVO</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(5)"><i class="bi bi-pencil"></i> Editar</button></div><div><strong>Direto:</strong> {{ form.publico_direto || '-' }} | <strong>Indireto:</strong> {{ form.publico_indireto || '-' }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">V &amp; VI. RESULTADOS E METAS</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(6)"><i class="bi bi-pencil"></i> Editar</button></div><div><strong>Resultados:</strong> {{ form.resultados_esperados || '-' }}<br><strong>Metas:</strong> {{ form.metas_txt || '-' }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">VII &amp; VIII. SUSTENTABILIDADE E MENSURAÇÃO</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(7)"><i class="bi bi-pencil"></i> Editar</button></div><div><strong>Sustentabilidade:</strong> {{ form.sustentabilidade || '-' }}<br><strong>Mensuração:</strong> {{ form.mensuracao || '-' }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">IX. PLANO DE LOCALIZAÇÃO</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(8)"><i class="bi bi-pencil"></i> Editar</button></div><div v-for="(l, i) in form.locais.filter(x => x.item || x.endereco)" :key="i">• {{ l.item }} ({{ l.quantidade }}) — {{ l.endereco }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">X. ORÇAMENTO ({{ form.orcamento.filter(x => x.nome).length }} itens)</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(9)"><i class="bi bi-pencil"></i> Editar</button></div><div v-for="(it, i) in form.orcamento.filter(x => x.nome)" :key="i">• {{ it.quantidade }}x {{ it.nome }} ({{ it.natureza }}) — {{ utils.formatMoeda(it.quantidade * it.unitario) }}</div></div>
                <div class="border rounded-3 p-3"><div class="d-flex justify-content-between mb-2"><strong class="text-uppercase">XI. IMPLEMENTAÇÃO</strong><button class="btn btn-link btn-sm p-0" @click="irParaPasso(10)"><i class="bi bi-pencil"></i> Editar</button></div><div>{{ form.implementacao || '-' }}</div></div>
              </div>
            </div>
          </div>

          <div class="fpp-bottom-bar mb-4">
            <div class="d-flex align-items-center gap-3">
              <button v-if="step === 1" class="btn btn-outline-light btn-sm px-3" @click="modo='LISTA'; carregarLista()">← Voltar para Lista</button>
              <button v-else class="btn btn-outline-light btn-sm px-3" @click="irParaPasso(step - 1)">← Voltar</button>
              <small v-if="proximoPassoObj" class="text-white-50 d-none d-sm-inline">Próximo: <strong class="text-white">{{ proximoPassoObj.nome }}</strong></small>
            </div>
            <div>
              <button v-if="step < 11" class="btn btn-primary fw-bold px-4" @click="irParaPasso(step + 1)">Avançar para {{ proximoPassoObj.nome }} →</button>
              <button v-else class="btn btn-success fw-bold px-4" @click="enviarPropostaAeplan">Salvar Proposta na AEPLAN →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL PREVIEW PDF NO WIZARD -->
      <div class="modal fade" id="modalPreviewPdfFpp" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">Prévia Oficial FPP • {{ form.numero_protocolo }}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body bg-light">
              <div id="fpp-doc-oficial-a4" class="bg-white p-4 border mx-auto" style="max-width: 820px; font-size: 11.5px; color: #111;">
                <div class="text-center border-bottom border-2 border-dark pb-2 mb-3">
                  <div class="fw-bold fs-6">GOVERNO DO ESTADO DE SERGIPE • SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA</div>
                  <div class="fw-bold text-primary">FORMULÁRIO DE PROPOSTA DE PROJETO (FPP) — PORTARIA SSP Nº 1998/2025</div>
                  <div class="small mt-1"><strong>Protocolo:</strong> {{ form.numero_protocolo }} | <strong>Área Temática:</strong> {{ form.area_tematica }} — {{ areaAtualObj.titulo }}</div>
                </div>
                <table class="table table-sm table-bordered mb-3">
                  <tbody>
                    <tr><td colspan="2"><strong>Título do Projeto:</strong> {{ form.titulo_projeto || '-' }}</td></tr>
                    <tr><td colspan="2"><strong>Órgão / Instituição:</strong> {{ form.orgao_instituicao }}</td></tr>
                    <tr><td><strong>Responsável Técnico:</strong> {{ form.nome_proponente || '-' }}</td><td><strong>Posto/Cargo:</strong> {{ form.cargo_funcao || '-' }}</td></tr>
                    <tr><td><strong>Lotação:</strong> {{ form.unidade_proponente || '-' }}</td><td><strong>Contato:</strong> {{ form.telefone_contato || '-' }} | {{ form.email_contato || '-' }}</td></tr>
                  </tbody>
                </table>
                <p><strong>I. OBJETIVO GERAL:</strong><br>{{ form.objetivo_geral || '-' }}</p>
                <p style="white-space: pre-line;"><strong>II. OBJETIVOS ESPECÍFICOS:</strong><br>{{ form.objetivos_especificos_txt || '-' }}</p>
                <p style="white-space: pre-line;"><strong>III. JUSTIFICATIVA TÉCNICA:</strong><br>{{ form.justificativa_tecnica || '-' }}</p>
                <p><strong>IV. PÚBLICO-ALVO:</strong><br><strong>Direto:</strong> {{ form.publico_direto || '-' }}<br><strong>Indireto:</strong> {{ form.publico_indireto || '-' }}</p>
                <p style="white-space: pre-line;"><strong>V. RESULTADOS ESPERADOS:</strong><br>{{ form.resultados_esperados || '-' }}</p>
                <p style="white-space: pre-line;"><strong>VI. METAS:</strong><br>{{ form.metas_txt || '-' }}</p>
                <p style="white-space: pre-line;"><strong>VII. SUSTENTABILIDADE:</strong><br>{{ form.sustentabilidade || '-' }}</p>
                <p style="white-space: pre-line;"><strong>VIII. MENSURAÇÃO:</strong><br>{{ form.mensuracao || '-' }}</p>
                <strong>IX. PLANO DE LOCALIZAÇÃO:</strong>
                <table class="table table-sm table-bordered mt-1 mb-3">
                  <thead class="table-light"><tr><th>Item / Material</th><th>Qtd</th><th>Endereço de Instalação / Lotação</th></tr></thead>
                  <tbody><tr v-for="(l, i) in form.locais.filter(x => x.item || x.endereco)" :key="i"><td>{{ l.item }}</td><td>{{ l.quantidade }}</td><td>{{ l.endereco }}</td></tr></tbody>
                </table>
                <strong>X. MATERIAIS, SERVIÇOS &amp; ORÇAMENTO:</strong>
                <table class="table table-sm table-bordered mt-1 mb-2">
                  <thead class="table-light"><tr><th>Item</th><th>Descrição</th><th>Natureza</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead>
                  <tbody>
                    <tr v-for="(it, i) in form.orcamento.filter(x => x.nome)" :key="i">
                      <td>{{ it.nome }}</td><td>{{ it.descricao }} {{ it.marca ? '('+it.marca+')' : '' }}</td><td>{{ it.natureza }}</td>
                      <td>{{ it.quantidade }}</td><td>{{ utils.formatMoeda(it.unitario) }}</td>
                      <td class="fw-bold">{{ utils.formatMoeda((Number(it.quantidade)||0)*(Number(it.unitario)||0)) }}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr><td colspan="5" class="text-end fw-bold">Total Investimento (4.4.90):</td><td class="fw-bold">{{ utils.formatMoeda(totalInvestimento) }}</td></tr>
                    <tr><td colspan="5" class="text-end fw-bold">Total Custeio (3.3.90):</td><td class="fw-bold">{{ utils.formatMoeda(totalCusteio) }}</td></tr>
                    <tr class="table-success"><td colspan="5" class="text-end fw-bold">VALOR TOTAL DA PROPOSTA:</td><td class="fw-bold">{{ utils.formatMoeda(totalGeral) }}</td></tr>
                  </tfoot>
                </table>
                <p v-if="form.pesquisa_precos_obs"><strong>Pesquisa de Preços (Art. 5º):</strong> {{ form.pesquisa_precos_obs }}</p>
                <p style="white-space: pre-line;"><strong>XI. ESTRATÉGIA DE IMPLEMENTAÇÃO:</strong><br>{{ form.implementacao || '-' }}</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
              <button class="btn btn-danger fw-bold" @click="baixarPdfFormatado('fpp-doc-oficial-a4', gerarNomeArquivoPdf(form.numero_protocolo, form.titulo_projeto))">
                <i class="bi bi-download me-1"></i> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};