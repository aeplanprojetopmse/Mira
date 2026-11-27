window.MiraViews = window.MiraViews || {};

window.MiraViews.IniciativaFormView = {
  setup() {
    const api = Vue.inject('api');
    const user = Vue.inject('user');
    const initialData = Vue.inject('initialData');
    const setGlobalLoading = Vue.inject('setGlobalLoading');
    const utils = window.MiraUtils;

    const step = Vue.ref(1);
    const submissionStatus = Vue.ref('idle'); // 'idle' | 'sending' | 'success'
    const finalId = Vue.ref('');
    const finalProtocoloFpp = Vue.ref('');
    const iaLoadingCampo = Vue.ref('');
    const modalMetaIndex = Vue.ref(null);

    // Listagem de FPPs para opção de vínculo existente
    const fppsExistentes = Vue.ref([]);
    const loadingFpps = Vue.ref(false);

    // Áreas Temáticas oficiais do FPP (Portaria SSP nº 1998/2025)
    const areasFpp = [
      {
        codigo: 'MVI',
        titulo: 'Mortes Violentas Intencionais',
        desc: 'Aquisições de viaturas táticas, armamento, munições e tecnologia para redução de homicídios.',
        icone: 'bi-shield-shaded', cor: 'danger'
      },
      {
        codigo: 'EVM',
        titulo: 'Violência contra a Mulher',
        desc: 'Patrulha Maria da Penha, viaturas lilás e salas de acolhimento humanizado.',
        icone: 'bi-heart-pulse-fill', cor: 'primary'
      },
      {
        codigo: 'MQV',
        titulo: 'Qualidade de Vida Policial',
        desc: 'Academias policiais, climatização de alojamentos e saúde ocupacional preventiva.',
        icone: 'bi-activity', cor: 'success'
      }
    ];

    const getCleanForm = () => {
      const anoAtual = new Date().getFullYear();
      return {
        info: {
          nome: '',
          ano: anoAtual,
          id_catalogo: '',
          id_setor_responsavel: '',
          justificativa: '',
          detalhe_local: '',
          id_fpp: ''
        },
        estrategia: { eixo: '' },
        fundo_tipo_escolha: 'Tesouro', // 'Tesouro' | 'Fundo a Fundo'
        fpp_modo: 'NOVO', // 'NOVO' | 'EXISTENTE'
        // FPP Oficial Completo Integrado (Idêntico ao FppView)
        fpp: {
          area_tematica: 'MVI',
          numero_protocolo_preview: `FPP-MVI-${anoAtual}-...`,
          orgao_instituicao: 'Polícia Militar do Estado de Sergipe - PMSE / SSP-SE',
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
        },
        municipios: [],
        setores_colaboradores: [],
        beneficiarios: [], // [{ descricao: '', estimativa_publico: '' }] - Texto livre!
        metas: [],
        riscos: [],
        orcamento: {
          visivel: {
            material: 'Não', servico: 'Não', hora_aula: 'Não',
            recorrente: 'Não', ifv: 'Não', diaria: 'Não', ifv_num_eventos: 1
          },
          itens: []
        }
      };
    };

    const form = Vue.reactive(getCleanForm());
    const anexosPendentes = Vue.ref([]);

    const aux = Vue.reactive({
      anos: [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1],
      municipioTemp: '',
      abrangenciaEstadual: false,
      setorColabTemp: '',
      papelColabTemp: 'Apoio Operacional',
      titulacoes: [
        { nome: 'Doutorado', valor: 100 },
        { nome: 'Mestrado', valor: 80 },
        { nome: 'Pós-Graduado', valor: 60 },
        { nome: 'Graduado', valor: 40 }
      ],
      postos: [
        { nome: 'Oficial Superior', valor: 600 },
        { nome: 'Oficial Intermediário', valor: 400 },
        { nome: 'Oficial Subalterno', valor: 350 },
        { nome: 'Subtenentes/Sargentos', valor: 250 },
        { nome: 'Cabos/Soldados', valor: 200 }
      ]
    });

    const temp = Vue.reactive({
      meta: { descricao: '', unidade_medida: 'Unid', qtd_alvo: '' },
      etapa: { descricao: '', data_prazo: '' },
      bene: { descricao: '', estimativa_publico: '' }, // Texto Livre
      risco: { tipo_risco: 'Risco Operacional', descricao_evento: '', acao_mitigacao: '', nivel_risco: 'Médio' },
      mat: { descricao: '', detalhe_complementar: '', codigo_natureza: '', quantidade: 1, f1_nome: '', f1_cnpj: '', v1: '', f2_nome: '', f2_cnpj: '', v2: '', f3_nome: '', f3_cnpj: '', v3: '' },
      serv: { descricao: '', detalhe_complementar: '', codigo_natureza: '', f1_nome: '', f1_cnpj: '', v1: '', f2_nome: '', f2_cnpj: '', v2: '', f3_nome: '', f3_cnpj: '', v3: '' },
      ha: { disc: '', instrVal: 100, monVal: 0, horas: '', codigo_natureza: '' },
      rec: { desc: '', freq: 'Mensal', valor: '', codigo_natureza: '' },
      ifv: { postoIdx: 4, qtd: 0, codigo_natureza: '' },
      dia: { desc: '', tipo: 'Militar', qtd: '', valor: '', codigo_natureza: '' },
      anexo: { desc: '', arquivo: null }
    });

    // --- Helpers de Setores ---
    const formatSetor = (s) => (s.sigla ? `[${s.sigla}] - ${s.nome_setor}` : s.nome_setor);

    const setorRespObj = Vue.computed(() =>
      (initialData.setores || []).find(s => s.id_setor === form.info.id_setor_responsavel) || null
    );

    const setoresDisponiveisColab = Vue.computed(() =>
      (initialData.setores || []).filter(s =>
        s.id_setor !== form.info.id_setor_responsavel &&
        !form.setores_colaboradores.some(sc => sc.id_setor === s.id_setor)
      )
    );

    const addSetorColab = () => {
      if (!aux.setorColabTemp) return;
      const ref = (initialData.setores || []).find(s => s.id_setor === aux.setorColabTemp);
      if (ref) {
        form.setores_colaboradores.push({
          id_setor: ref.id_setor,
          sigla: ref.sigla || '',
          nome_setor: ref.nome_setor,
          papel: aux.papelColabTemp || 'Apoio'
        });
      }
      aux.setorColabTemp = '';
    };

    // --- Helpers de Estratégia ---
    const eixosDoAno = Vue.computed(() => {
      const ano = Number(form.info.ano);
      const lista = (initialData.estrategia || []).filter(e => Number(e.ano) === ano).map(e => e.eixo);
      return [...new Set(lista)].sort();
    });

    const objetivosDoEixo = Vue.computed(() => {
      const ano = Number(form.info.ano);
      return (initialData.estrategia || []).filter(e => Number(e.ano) === ano && e.eixo === form.estrategia.eixo);
    });

    const onAnoChange = () => {
      if (!eixosDoAno.value.includes(form.estrategia.eixo)) {
        form.estrategia.eixo = '';
        form.info.id_catalogo = '';
      }
      form.fpp.numero_protocolo_preview = `FPP-${form.fpp.area_tematica}-${form.info.ano}-...`;
    };

    const onEixoChange = () => { form.info.id_catalogo = ''; };

    const catalogoSelecionado = Vue.computed(() =>
      (initialData.estrategia || []).find(e => e.id_catalogo === form.info.id_catalogo) || null
    );

    // --- Municípios ---
    const addMunicipio = () => {
      if (aux.abrangenciaEstadual) {
        if (form.municipios.length > 0 && !confirm('Substituir municípios por "Todo o Estado de Sergipe"?')) return;
        form.municipios = [{ codigo_ibge: '', nome_municipio: 'Todo o Estado de Sergipe', abrangencia_estadual: true }];
        aux.abrangenciaEstadual = false;
        aux.municipioTemp = '';
        return;
      }
      if (!aux.municipioTemp) return;
      if (form.municipios.some(m => m.abrangencia_estadual)) {
        return alert('Remova "Todo o Estado" antes de adicionar cidades específicas.');
      }
      if (form.municipios.some(m => m.codigo_ibge === aux.municipioTemp)) return;
      const ref = (initialData.municipios || []).find(m => m.codigo_ibge === aux.municipioTemp);
      if (ref) {
        form.municipios.push({ codigo_ibge: ref.codigo_ibge, nome_municipio: ref.nome_municipio, abrangencia_estadual: false });
      }
      aux.municipioTemp = '';
    };

    // --- FPP Totais & Helpers ---
    const fppTotalInvestimento = Vue.computed(() =>
      form.fpp.orcamento
        .filter(i => String(i.natureza).startsWith('4.4.90'))
        .reduce((acc, i) => acc + (Number(i.quantidade || 0) * Number(i.unitario || 0)), 0)
    );
    const fppTotalCusteio = Vue.computed(() =>
      form.fpp.orcamento
        .filter(i => String(i.natureza).startsWith('3.3.90'))
        .reduce((acc, i) => acc + (Number(i.quantidade || 0) * Number(i.unitario || 0)), 0)
    );
    const fppTotalGeral = Vue.computed(() => fppTotalInvestimento.value + fppTotalCusteio.value);

    const addFppLocal = () => form.fpp.locais.push({ item: '', quantidade: '', endereco: '' });
    const removeFppLocal = (idx) => {
      if (form.fpp.locais.length > 1) form.fpp.locais.splice(idx, 1);
      else Object.assign(form.fpp.locais[0], { item: '', quantidade: '', endereco: '' });
    };

    const addFppItemOrc = () => form.fpp.orcamento.push({ nome: '', descricao: '', marca: '', natureza: '4.4.90 (Investimento)', quantidade: 1, unitario: 0 });
    const removeFppItemOrc = (idx) => {
      if (form.fpp.orcamento.length > 1) form.fpp.orcamento.splice(idx, 1);
      else Object.assign(form.fpp.orcamento[0], { nome: '', descricao: '', marca: '', natureza: '4.4.90 (Investimento)', quantidade: 1, unitario: 0 });
    };

    const selecionarAreaFpp = (cod) => {
      form.fpp.area_tematica = cod;
      form.fpp.numero_protocolo_preview = `FPP-${cod}-${form.info.ano}-...`;
    };

    // --- ASSISTENTE DE IA MIRA (Groq / Gemini) ---
    const sugerirComIA = async (campo) => {
      iaLoadingCampo.value = campo;
      try {
        const setorNome = setorRespObj.value ? `${setorRespObj.value.sigla} (${setorRespObj.value.nome_setor})` : 'PMSE';
        const colabsNome = form.setores_colaboradores.map(s => s.sigla || s.nome_setor).join(', ') || 'Nenhum';
        const munTxt = form.municipios.map(m => m.nome_municipio).join(', ') || 'Estado de Sergipe';
        const objTxt = catalogoSelecionado.value ? `${catalogoSelecionado.value.eixo} - ${catalogoSelecionado.value.objetivo}` : 'Planejamento Estratégico PMSE';
        const tituloRef = form.info.nome || form.fpp.titulo_projeto || 'Projeto Institucional da PMSE';
        const itensFppTxt = form.fpp.orcamento.filter(i => i.nome).map(i => `${i.quantidade}x ${i.nome}`).join(', ') || 'equipamentos operacionais';

        const sys = 'Você é um oficial especialista em planejamento estratégico da Polícia Militar do Estado de Sergipe (PMSE) e elaboração de projetos e formulários FPP (Portaria SSP nº 1998/2025). Suas respostas devem ser estritamente formais, técnicas, claras e prontas para uso em processo oficial.';

        const prompts = {
          nome: `Sugira exatamente 1 título técnico formal, claro e direto (1 linha, sem aspas) para um projeto da PMSE executado pelo setor ${setorNome} no ano ${form.info.ano}, com foco em segurança pública em ${munTxt}. Referência inicial: "${form.info.nome}".`,
          justificativa: `Redija a Justificativa Técnica (2 a 3 parágrafos formais) para o projeto "${tituloRef}" da PMSE (ano ${form.info.ano}). Setor Executor: ${setorNome}. Apoio: ${colabsNome}. Municípios: ${munTxt}. Alinhamento Estratégico: ${objTxt}. Considere dados da mancha criminal e carências logísticas.`,
          detalhe_local: `Descreva em 1 parágrafo técnico o plano de distribuição e emprego das equipes/materiais do projeto "${tituloRef}" da PMSE, considerando o setor executor ${setorNome} e a atuação nos municípios: ${munTxt}.`,
          metas: `Crie 3 metas físicas quantificáveis para o projeto "${tituloRef}" da PMSE (${setorNome}, ${munTxt}). Formate estritamente cada linha assim:\nMETA: [descricao] | [unidade_medida (Unid ou %)] | [quantidade_alvo] | ETAPA 1: [desc_etapa_1] | ETAPA 2: [desc_etapa_2]`,
          beneficiarios: `Descreva em 2 tópicos concisos os beneficiários diretos (policiais militares) e indiretos (população sergipana) do projeto "${tituloRef}". Formate:\nDIRETO: [descricao] | [estimativa_pessoas]\nINDIRETO: [descricao] | [estimativa_pessoas]`,
          riscos: `Identifique 3 riscos realistas da PMSE para o projeto "${tituloRef}" (${setorNome}). Formate estritamente assim:\nRISCO 1: [tipo: Operacional|Material|Financeiro|Pessoal] | [se_ocorrer_evento] | [entao_fazer_mitigacao]\nRISCO 2: [tipo] | [evento] | [mitigacao]\nRISCO 3: [tipo] | [evento] | [mitigacao]`,

          // IA CAMPOS FPP (Passo 7)
          fpp_obj_geral: `Redija o "I. Objetivo Geral" (1 parágrafo iniciando com verbo no infinitivo) para a proposta FPP do projeto "${tituloRef}" da PMSE no eixo ${form.fpp.area_tematica}.`,
          fpp_obj_especificos: `Liste 3 a 4 objetivos específicos numerados (1., 2., 3.) para a proposta FPP do projeto "${tituloRef}" (${setorNome}, eixo ${form.fpp.area_tematica}).`,
          fpp_justificativa: `Redija a "III. Justificativa Técnica" (2 parágrafos formais) conforme a Portaria SSP nº 1998/2025 para a proposta FPP "${tituloRef}" no eixo ${form.fpp.area_tematica}, detalhando a necessidade dos investimentos pela PMSE.`,
          fpp_publico_direto: `Descreva o Público-Alvo Direto (efetivo policial militar beneficiado) para o FPP "${tituloRef}" da PMSE (${form.fpp.unidade_proponente || setorNome}).`,
          fpp_publico_indireto: `Descreva o Público-Alvo Indireto (sociedade sergipana/comunidade) atendido pelo FPP "${tituloRef}".`,
          fpp_resultados: `Liste em tópicos com hífen (-) os "V. Resultados Esperados" mensuráveis para o FPP "${tituloRef}" em Sergipe.`,
          fpp_metas: `Liste 2 metas numeradas quantificáveis para a proposta FPP contemplando: ${itensFppTxt}.`,
          fpp_sustentabilidade: `Redija a "VII. Sustentabilidade do Projeto" para o FPP "${tituloRef}", garantindo manutenção contínua, garantia contratual e provimento orçamentário pela PMSE.`,
          fpp_mensuracao: `Redija a "VIII. Mensuração dos Resultados" para o FPP "${tituloRef}" indicando indicadores oficiais da PMSE/SSP (CEACRIM, ROPs, inventário patrimonial da DAL).`,
          fpp_pesquisa: `Redija uma justificativa objetiva fundamentada no Art. 5º da Portaria SSP nº 1998/2025 comprovando a realização da pesquisa de preços por atas vigentes e cotações de mercado para: ${itensFppTxt}.`,
          fpp_implementacao: `Liste em 4 etapas numeradas (1 a 4) a "XI. Estratégia de Implementação" para "${tituloRef}" (comissão de recebimento, tombamento pela DAL/PMSE, instrução e emprego operacional).`
        };

        const res = await api('consultarIaMira', {
          matricula: user.matricula,
          prompt: prompts[campo],
          system_instruction: sys,
          temperatura: 0.6
        });

        if (res.success && res.texto) {
          const texto = res.texto.trim();
          if (campo === 'nome') form.info.nome = texto.replace(/^["']|["']$/g, '');
          else if (campo === 'justificativa') form.info.justificativa = texto;
          else if (campo === 'detalhe_local') form.info.detalhe_local = texto;
          else if (campo === 'metas') {
            const linhas = texto.split('\n').filter(l => l.toUpperCase().includes('META:'));
            linhas.forEach(l => {
              const semPrefixo = l.replace(/^META:\s*/i, '');
              const partes = semPrefixo.split('|').map(p => p.trim());
              if (partes.length >= 3) {
                const desc = partes[0];
                const un = partes[1] || 'Unid';
                const qtd = Number(partes[2].replace(/[^\d]/g, '')) || 10;
                const etapas = [];
                for (let k = 3; k < partes.length; k++) {
                  const etapaTexto = partes[k].replace(/^ETAPA\s*\d*:\s*/i, '').trim();
                  if (etapaTexto) etapas.push({ codigo_etapa: '', descricao: etapaTexto, data_prazo: '' });
                }
                form.metas.push({ codigo_meta: '', descricao: desc, unidade_medida: un, qtd_alvo: qtd, etapas });
              }
            });
            reindexarMetas();
          } else if (campo === 'beneficiarios') {
            const linhas = texto.split('\n').filter(l => l.includes('|'));
            linhas.forEach(l => {
              const partes = l.split('|').map(p => p.trim());
              const desc = partes[0].replace(/^(DIRETO|INDIRETO):\s*/i, '');
              const qtd = Number(partes[1]?.replace(/[^\d]/g, '')) || '';
              if (desc) form.beneficiarios.push({ descricao: desc, estimativa_publico: qtd });
            });
          } else if (campo === 'riscos') {
            const linhas = texto.split('\n').filter(l => l.includes('|'));
            linhas.forEach(l => {
              const partes = l.replace(/^RISCO\s*\d*:\s*/i, '').split('|').map(p => p.trim());
              if (partes.length >= 3) {
                form.riscos.push({
                  tipo_risco: partes[0] ? `Risco ${partes[0].replace(/^Risco\s*/i, '')}` : 'Risco Operacional',
                  descricao_evento: partes[1] || '',
                  acao_mitigacao: partes[2] || '',
                  nivel_risco: 'Médio'
                });
              } else if (partes.length === 2) {
                form.riscos.push({
                  tipo_risco: 'Risco Operacional',
                  descricao_evento: partes[0],
                  acao_mitigacao: partes[1],
                  nivel_risco: 'Médio'
                });
              }
            });
          }
          // Campos do FPP
          else if (campo === 'fpp_obj_geral') form.fpp.objetivo_geral = texto;
          else if (campo === 'fpp_obj_especificos') form.fpp.objetivos_especificos_txt = texto;
          else if (campo === 'fpp_justificativa') form.fpp.justificativa_tecnica = texto;
          else if (campo === 'fpp_publico_direto') form.fpp.publico_direto = texto;
          else if (campo === 'fpp_publico_indireto') form.fpp.publico_indireto = texto;
          else if (campo === 'fpp_resultados') form.fpp.resultados_esperados = texto;
          else if (campo === 'fpp_metas') form.fpp.metas_txt = texto;
          else if (campo === 'fpp_sustentabilidade') form.fpp.sustentabilidade = texto;
          else if (campo === 'fpp_mensuracao') form.fpp.mensuracao = texto;
          else if (campo === 'fpp_pesquisa') form.fpp.pesquisa_precos_obs = texto;
          else if (campo === 'fpp_implementacao') form.fpp.implementacao = texto;
        } else {
          alert('Falha na IA: ' + (res.message || 'Erro desconhecido.'));
        }
      } finally {
        iaLoadingCampo.value = '';
      }
    };

    // --- Metas & Etapas ---
    const reindexarMetas = () => {
      form.metas.forEach((m, i) => {
        m.codigo_meta = `M.${String(i + 1).padStart(2, '0')}`;
        (m.etapas || []).forEach((e, j) => {
          e.codigo_etapa = `${m.codigo_meta}.E.${String(j + 1).padStart(2, '0')}`;
        });
      });
    };

    const addMeta = () => {
      if (!temp.meta.descricao || !temp.meta.qtd_alvo) return alert('Preencha descrição e quantidade alvo.');
      form.metas.push({
        codigo_meta: '',
        descricao: temp.meta.descricao,
        unidade_medida: temp.meta.unidade_medida,
        qtd_alvo: Number(temp.meta.qtd_alvo),
        etapas: []
      });
      reindexarMetas();
      temp.meta.descricao = '';
      temp.meta.qtd_alvo = '';
    };

    const removeMeta = (i) => {
      if (confirm('Excluir meta?')) {
        form.metas.splice(i, 1);
        reindexarMetas();
      }
    };

    const openEtapas = (i) => {
      modalMetaIndex.value = i;
      bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEtapasForm')).show();
    };

    const addEtapa = () => {
      if (!temp.etapa.descricao || modalMetaIndex.value === null) return;
      form.metas[modalMetaIndex.value].etapas.push({
        codigo_etapa: '',
        descricao: temp.etapa.descricao,
        data_prazo: temp.etapa.data_prazo || ''
      });
      reindexarMetas();
      temp.etapa.descricao = '';
      temp.etapa.data_prazo = '';
    };

    const removeEtapa = (i) => {
      form.metas[modalMetaIndex.value].etapas.splice(i, 1);
      reindexarMetas();
    };

    // --- Beneficiários (Texto Livre) ---
    const addBene = () => {
      if (!temp.bene.descricao.trim()) return alert('Informe a descrição do público beneficiário.');
      form.beneficiarios.push({
        descricao: temp.bene.descricao.trim(),
        estimativa_publico: temp.bene.estimativa_publico ? Number(temp.bene.estimativa_publico) : ''
      });
      temp.bene.descricao = '';
      temp.bene.estimativa_publico = '';
    };

    // --- Riscos ---
    const addRisco = () => {
      if (!temp.risco.descricao_evento || !temp.risco.acao_mitigacao) return alert('Preencha evento e ação de mitigação.');
      form.riscos.push({ ...temp.risco });
      temp.risco.descricao_evento = '';
      temp.risco.acao_mitigacao = '';
    };

    // --- Orçamento ---
    const mediaCotacoes = (vals) => {
      const validos = vals.map(v => Number(v || 0)).filter(v => v > 0);
      return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : 0;
    };

    const addItemMaterial = () => {
      const t = temp.mat;
      if (!t.descricao || !t.quantidade || !t.v1) return alert('Preencha item, quantidade e ao menos o Fornecedor A.');
      const cotacoes = [
        { numero_fornecedor: 1, nome_fornecedor: t.f1_nome, cnpj_fornecedor: t.f1_cnpj, valor_cotado: Number(t.v1 || 0) },
        { numero_fornecedor: 2, nome_fornecedor: t.f2_nome, cnpj_fornecedor: t.f2_cnpj, valor_cotado: Number(t.v2 || 0) },
        { numero_fornecedor: 3, nome_fornecedor: t.f3_nome, cnpj_fornecedor: t.f3_cnpj, valor_cotado: Number(t.v3 || 0) }
      ].filter(c => c.valor_cotado > 0 || c.nome_fornecedor);

      const unit = mediaCotacoes([t.v1, t.v2, t.v3]);
      const qtd = Number(t.quantidade);
      form.orcamento.itens.push({
        categoria_item: 'MATERIAL',
        codigo_natureza: t.codigo_natureza,
        descricao: t.descricao,
        detalhe_complementar: t.detalhe_complementar,
        quantidade: qtd,
        valor_unitario: Math.round(unit * 100) / 100,
        valor_planejado_total: Math.round(unit * qtd * 100) / 100,
        cotacoes
      });
      Object.assign(temp.mat, { descricao: '', detalhe_complementar: '', codigo_natureza: '', quantidade: 1, f1_nome: '', f1_cnpj: '', v1: '', f2_nome: '', f2_cnpj: '', v2: '', f3_nome: '', f3_cnpj: '', v3: '' });
    };

    const addItemServico = () => {
      const t = temp.serv;
      if (!t.descricao || !t.v1) return alert('Preencha descrição do serviço e ao menos o Prestador A.');
      const cotacoes = [
        { numero_fornecedor: 1, nome_fornecedor: t.f1_nome, cnpj_fornecedor: t.f1_cnpj, valor_cotado: Number(t.v1 || 0) },
        { numero_fornecedor: 2, nome_fornecedor: t.f2_nome, cnpj_fornecedor: t.f2_cnpj, valor_cotado: Number(t.v2 || 0) },
        { numero_fornecedor: 3, nome_fornecedor: t.f3_nome, cnpj_fornecedor: t.f3_cnpj, valor_cotado: Number(t.v3 || 0) }
      ].filter(c => c.valor_cotado > 0 || c.nome_fornecedor);

      const unit = mediaCotacoes([t.v1, t.v2, t.v3]);
      form.orcamento.itens.push({
        categoria_item: 'SERVICO',
        codigo_natureza: t.codigo_natureza,
        descricao: t.descricao,
        detalhe_complementar: t.detalhe_complementar,
        quantidade: 1,
        valor_unitario: Math.round(unit * 100) / 100,
        valor_planejado_total: Math.round(unit * 100) / 100,
        cotacoes
      });
      Object.assign(temp.serv, { descricao: '', detalhe_complementar: '', codigo_natureza: '', f1_nome: '', f1_cnpj: '', v1: '', f2_nome: '', f2_cnpj: '', v2: '', f3_nome: '', f3_cnpj: '', v3: '' });
    };

    const addItemHoraAula = () => {
      const t = temp.ha;
      if (!t.disc || !t.horas) return alert('Preencha disciplina e carga horária.');
      const instr = aux.titulacoes.find(x => x.valor === Number(t.instrVal));
      const mon = Number(t.monVal) > 0 ? aux.titulacoes.find(x => x.valor === Number(t.monVal)) : null;
      const valorHora = Number(t.instrVal) + Number(t.monVal || 0);
      const qtd = Number(t.horas);
      form.orcamento.itens.push({
        categoria_item: 'HORA_AULA',
        codigo_natureza: t.codigo_natureza,
        descricao: t.disc,
        detalhe_complementar: `Instrutor: ${instr?.nome || ''} | Monitor: ${mon ? mon.nome : 'Sem Monitor'}`,
        quantidade: qtd,
        valor_unitario: valorHora,
        valor_planejado_total: Math.round(valorHora * qtd * 100) / 100,
        cotacoes: []
      });
      temp.ha.disc = ''; temp.ha.horas = '';
    };

    const addItemRecorrente = () => {
      const t = temp.rec;
      if (!t.desc || !t.valor) return alert('Preencha descrição e valor.');
      const mult = t.freq === 'Mensal' ? 12 : (t.freq === 'Semestral' ? 2 : 1);
      const val = Number(t.valor);
      form.orcamento.itens.push({
        categoria_item: 'RECORRENTE',
        codigo_natureza: t.codigo_natureza,
        descricao: t.desc,
        detalhe_complementar: t.freq,
        quantidade: mult,
        valor_unitario: val,
        valor_planejado_total: Math.round(val * mult * 100) / 100,
        cotacoes: []
      });
      temp.rec.desc = ''; temp.rec.valor = '';
    };

    const addItemIfv = () => {
      const p = aux.postos[temp.ifv.postoIdx];
      if (!temp.ifv.qtd || Number(temp.ifv.qtd) <= 0) return alert('Informe a quantidade de policiais.');
      const qtd = Number(temp.ifv.qtd);
      const eventos = Number(form.orcamento.visivel.ifv_num_eventos || 1);
      form.orcamento.itens.push({
        categoria_item: 'IFV',
        codigo_natureza: temp.ifv.codigo_natureza,
        descricao: `IFV - ${p.nome}`,
        detalhe_complementar: `${eventos} evento(s)`,
        quantidade: qtd,
        valor_unitario: p.valor,
        valor_planejado_total: 0,
        cotacoes: []
      });
      temp.ifv.qtd = 0;
    };

    const addItemDiaria = () => {
      const t = temp.dia;
      if (!t.desc || !t.qtd || !t.valor) return alert('Preencha motivo, quantidade de diárias e valor unitário.');
      const qtd = Number(t.qtd);
      const val = Number(t.valor);
      form.orcamento.itens.push({
        categoria_item: 'DIARIA',
        codigo_natureza: t.codigo_natureza,
        descricao: t.desc,
        detalhe_complementar: t.tipo,
        quantidade: qtd,
        valor_unitario: val,
        valor_planejado_total: Math.round(qtd * val * 100) / 100,
        cotacoes: []
      });
      temp.dia.desc = ''; temp.dia.qtd = ''; temp.dia.valor = '';
    };

    const itensPorCategoria = (cat) => form.orcamento.itens
      .map((item, idx) => ({ ...item, _idx: idx }))
      .filter(i => i.categoria_item === cat);

    const removerItemOrc = (idx) => form.orcamento.itens.splice(idx, 1);

    const calcularTotalItemExibicao = (item) => {
      if (item.categoria_item === 'IFV') {
        return Number(item.valor_unitario) * Number(item.quantidade) * Number(form.orcamento.visivel.ifv_num_eventos || 1);
      }
      return Number(item.valor_planejado_total || (Number(item.valor_unitario) * Number(item.quantidade)));
    };

    const resumoFinanceiro = Vue.computed(() => {
      const soma = (cat) => form.orcamento.itens
        .filter(i => i.categoria_item === cat)
        .reduce((acc, i) => acc + calcularTotalItemExibicao(i), 0);
      const mat = soma('MATERIAL'), serv = soma('SERVICO'), ha = soma('HORA_AULA'),
            rec = soma('RECORRENTE'), ifv = soma('IFV'), dia = soma('DIARIA');
      return { mat, serv, ha, rec, ifv, dia, total: mat + serv + ha + rec + ifv + dia };
    });

    // --- FPPs Disponíveis para Vínculo Existente ---
    const carregarFppsDisponiveis = async () => {
      loadingFpps.value = true;
      try {
        const res = await api('listarPropostasFPP', { matricula: user.matricula });
        if (res.success) fppsExistentes.value = res.propostas_fpp || [];
      } finally {
        loadingFpps.value = false;
      }
    };

    const fppSelecionadaObj = Vue.computed(() =>
      fppsExistentes.value.find(f => f.id_fpp === form.info.id_fpp) || null
    );

    // --- Anexos e Envio ---
    const fileToBase64 = (file) => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => resolve(r.result);
      r.onerror = reject;
    });

    const handleFileSelect = (e) => { temp.anexo.arquivo = e.target.files[0] || null; };

    const adicionarAnexoPendente = () => {
      if (!temp.anexo.arquivo) return alert('Selecione um arquivo.');
      if (temp.anexo.arquivo.size > 20 * 1024 * 1024) return alert('Arquivo excede 20 MB.');
      anexosPendentes.value.push({
        file: temp.anexo.arquivo,
        file_name: temp.anexo.arquivo.name,
        file_desc: temp.anexo.desc || temp.anexo.arquivo.name
      });
      temp.anexo.desc = '';
      temp.anexo.arquivo = null;
      const el = document.getElementById('inputAnexoProposta');
      if (el) el.value = '';
    };

    const nav = (dir) => {
      window.scrollTo(0, 0);
      if (dir === 1) {
        if (step.value === 1) {
          if (!form.info.nome.trim()) return alert('O Nome do Projeto é obrigatório.');
          if (!form.info.id_setor_responsavel) return alert('Selecione o Setor Responsável (Executor Principal).');
          if (!form.municipios.length) return alert('Selecione ao menos um Município ou Abrangência Estadual.');
        }
        if (step.value === 2 && !form.info.justificativa.trim()) {
          return alert('A Justificativa Técnica é obrigatória.');
        }
        if (step.value === 3 && !form.metas.length) {
          return alert('Cadastre pelo menos uma Meta.');
        }
        if (step.value === 6) {
          // Prepara a sincronização de dados pré-preenchidos para o FPP (Passo 7)
          if (!form.fpp.titulo_projeto) form.fpp.titulo_projeto = form.info.nome;
          if (!form.fpp.justificativa_tecnica) form.fpp.justificativa_tecnica = form.info.justificativa;
          carregarFppsDisponiveis();
        }
        if (step.value < 8) step.value++;
      } else if (step.value > 1) {
        step.value--;
      }
    };

    const enviarProposta = async () => {
      if (!confirm('Confirmar envio da proposta à AEPLAN?')) return;
      submissionStatus.value = 'sending';
      try {
        let idFppFinal = form.info.id_fpp;

        // Se escolheu Fundo a Fundo e preencheu o formulário FPP oficial completo:
        if (form.fundo_tipo_escolha === 'Fundo a Fundo' && form.fpp_modo === 'NOVO') {
          const fppObjGeral = form.fpp.objetivo_geral || `Executar o projeto ${form.info.nome} no âmbito do Fundo a Fundo SSP.`;
          const fppJust = form.fpp.justificativa_tecnica || form.info.justificativa;

          const objetivosParsed = (form.fpp.objetivos_especificos_txt || '')
            .split('\n').map(l => l.trim()).filter(Boolean)
            .map((l, idx) => ({ ordem: idx + 1, descricao_objetivo: l.replace(/^\d+[\.\)\-]\s*/, '') }));

          const metasParsed = (form.fpp.metas_txt || '')
            .split('\n').map(l => l.trim()).filter(Boolean)
            .map((l, idx) => ({
              codigo_meta: `M.${String(idx + 1).padStart(2, '0')}`,
              descricao_meta: l.replace(/^\d+[\.\)\-]\s*/, ''),
              indicador: 'Conforme FPP',
              unidade_medida: 'Unid',
              quantidade_prevista: 1
            }));

          const locaisParsed = form.fpp.locais
            .filter(l => l.item || l.endereco)
            .map(l => ({ item_material: l.item, quantidade: l.quantidade, endereco_local: l.endereco }));

          const orcamentoFppParsed = form.fpp.orcamento
            .filter(i => i.nome && Number(i.quantidade) > 0)
            .map(i => ({
              categoria_item: String(i.natureza).startsWith('4.4.90') ? 'INVESTIMENTO' : 'CUSTEIO',
              codigo_natureza: String(i.natureza).startsWith('4.4.90') ? '4490' : '3390',
              descricao_item: i.nome,
              especificacao_sucinta: i.descricao,
              marca_referencia: i.marca,
              unidade_medida: 'Unid',
              quantidade: Number(i.quantidade || 1),
              valor_unitario: Number(i.unitario || 0)
            }));

          const resFpp = await api('salvarPropostaFPP', {
            matricula_proponente: user.matricula,
            ano: Number(form.info.ano),
            area_tematica: form.fpp.area_tematica,
            titulo_projeto: form.fpp.titulo_projeto || form.info.nome,
            orgao_instituicao: form.fpp.orgao_instituicao,
            nome_proponente: form.fpp.nome_proponente,
            unidade_proponente: form.fpp.unidade_proponente,
            cargo_funcao: form.fpp.cargo_funcao,
            telefone_contato: form.fpp.telefone_contato,
            email_contato: form.fpp.email_contato,
            justificativa_tecnica: fppJust,
            objetivo_geral: fppObjGeral,
            publico_direto: form.fpp.publico_direto,
            publico_indireto: form.fpp.publico_indireto,
            resultados_esperados: form.fpp.resultados_esperados,
            sustentabilidade: form.fpp.sustentabilidade,
            mensuracao: form.fpp.mensuracao,
            pesquisa_precos_obs: form.fpp.pesquisa_precos_obs,
            implementacao: form.fpp.implementacao,
            objetivos_especificos: objetivosParsed,
            metas_entregas: metasParsed,
            locais: locaisParsed,
            orcamento_itens: orcamentoFppParsed
          });

          if (!resFpp.success) throw new Error(resFpp.message || 'Erro ao protocolar FPP.');
          idFppFinal = resFpp.id_fpp;
          finalProtocoloFpp.value = resFpp.numero_protocolo;
        }

        // Submissão da Iniciativa (com id_fpp vinculado no banco)
        const payload = {
          matricula_criador: user.matricula,
          info: {
            ...form.info,
            id_fpp: form.fundo_tipo_escolha === 'Fundo a Fundo' ? idFppFinal : ''
          },
          municipios: form.municipios.map(m => ({ codigo_ibge: m.codigo_ibge, abrangencia_estadual: m.abrangencia_estadual })),
          setores_colaboradores: form.setores_colaboradores.map(s => ({ id_setor: s.id_setor, papel: s.papel })),
          beneficiarios: form.beneficiarios.map(b => ({ id_beneficiario: b.descricao, estimativa_publico: b.estimativa_publico })),
          metas: JSON.parse(JSON.stringify(form.metas)),
          riscos: JSON.parse(JSON.stringify(form.riscos)),
          orcamento: JSON.parse(JSON.stringify(form.orcamento)),
          ssp: { ativo: form.fundo_tipo_escolha === 'Fundo a Fundo' ? 'Sim' : 'Não' }
        };

        const res = await api('salvarPropostaIniciativa', payload);
        if (!res.success) throw new Error(res.message || 'Erro ao salvar proposta.');

        // Upload de Anexos
        for (const item of anexosPendentes.value) {
          const base64 = await fileToBase64(item.file);
          await api('adicionarAnexoDrive', {
            matricula_autor: user.matricula,
            tipo_pai: 'INICIATIVA',
            id_pai: res.id_iniciativa,
            file_data: base64,
            file_name: item.file_name,
            file_desc: item.file_desc
          });
        }

        finalId.value = res.id_iniciativa;
        submissionStatus.value = 'success';
      } catch (e) {
        alert('Erro ao enviar: ' + e.message);
        submissionStatus.value = 'idle';
      }
    };

    const novaProposta = () => {
      Object.assign(form, getCleanForm());
      anexosPendentes.value = [];
      step.value = 1;
      submissionStatus.value = 'idle';
      finalId.value = '';
      finalProtocoloFpp.value = '';
    };

    Vue.onMounted(() => {
      carregarFppsDisponiveis();
    });

    return {
      step, submissionStatus, finalId, finalProtocoloFpp, iaLoadingCampo, form, aux, temp, initialData, utils,
      modalMetaIndex, anexosPendentes, fppsExistentes, loadingFpps, areasFpp,
      fppSelecionadaObj, fppTotalInvestimento, fppTotalCusteio, fppTotalGeral,
      formatSetor, setorRespObj, setoresDisponiveisColab, addSetorColab,
      eixosDoAno, objetivosDoEixo, onAnoChange, onEixoChange,
      addMunicipio, sugerirComIA,
      addMeta, removeMeta, openEtapas, addEtapa, removeEtapa,
      addBene, addRisco,
      addItemMaterial, addItemServico, addItemHoraAula, addItemRecorrente, addItemIfv, addItemDiaria,
      itensPorCategoria, removerItemOrc, calcularTotalItemExibicao, resumoFinanceiro,
      addFppLocal, removeFppLocal, addFppItemOrc, removeFppItemOrc, selecionarAreaFpp,
      handleFileSelect, adicionarAnexoPendente,
      nav, enviarProposta, novaProposta
    };
  },
  template: `
    <div>
      <!-- TELA DE SUCESSO -->
      <div v-if="submissionStatus === 'success'" class="text-center py-5">
        <div class="card shadow border-0 p-5 mx-auto" style="max-width: 620px; border-radius: 14px;">
          <div class="mb-3 text-success"><i class="bi bi-check-circle-fill" style="font-size: 4rem;"></i></div>
          <h2 class="fw-bold text-success mb-2">Proposta Gravada com Sucesso!</h2>
          <p class="lead mb-2">ID do Projeto: <strong class="bg-light px-2 py-1 border rounded">{{ finalId }}</strong></p>
          <p v-if="finalProtocoloFpp" class="text-primary fw-bold mb-3">
            <i class="bi bi-file-earmark-check me-1"></i> FPP Protocolado Oficialmente: {{ finalProtocoloFpp }}
          </p>
          <p class="text-muted mb-4">Dados gravados e vinculados no banco de dados normalizado Db_Mira da AEPLAN/PMSE.</p>
          <button class="btn btn-primary btn-lg fw-bold" @click="novaProposta">Cadastrar Nova Proposta</button>
        </div>
      </div>

      <!-- TELA DE ENVIO -->
      <div v-else-if="submissionStatus === 'sending'" class="text-center py-5">
        <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
        <h4 class="text-primary fw-bold">Gravando proposta e vinculando ao banco...</h4>
      </div>

      <!-- WIZARD EM 8 PASSOS -->
      <div v-else class="card shadow border-0 mb-5" style="border-radius: 14px;">
        <div class="card-header bg-white py-3 sticky-top shadow-sm" style="z-index: 10;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h5 class="m-0 text-primary fw-bold">
              {{ [
                '1. Identificação & Setores',
                '2. Estratégia & Justificativa (IA)',
                '3. Metas e Etapas (IA)',
                '4. Beneficiários (Texto Livre)',
                '5. Gestão de Riscos (IA)',
                '6. Orçamento Detalhado',
                '7. Formulário Oficial FPP (Portaria SSP 1998/2025)',
                '8. Anexos e Revisão Geral'
              ][step-1] }}
            </h5>
            <span class="badge bg-secondary">Etapa {{ step }} / 8</span>
          </div>
          <div class="progress" style="height: 6px;">
            <div class="progress-bar bg-primary" :style="{ width: (step * 12.5) + '%' }"></div>
          </div>
        </div>

        <div class="card-body p-3 p-md-4">
          <!-- ETAPA 1: IDENTIFICAÇÃO E SETORES -->
          <div v-if="step === 1">
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="fw-bold">Nome do Projeto / Proposta *</label>
                <button type="button" class="btn btn-sm btn-outline-primary py-0 fw-bold" @click="sugerirComIA('nome')" :disabled="!!iaLoadingCampo">
                  <span v-if="iaLoadingCampo==='nome'" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                </button>
              </div>
              <input v-model="form.info.nome" class="form-control" placeholder="Ex: Modernização do Sistema de Radiocomunicação Digital da PMSE">
            </div>

            <div class="row g-3 mb-3">
              <div class="col-md-3">
                <label class="fw-bold">Ano *</label>
                <select v-model="form.info.ano" @change="onAnoChange" class="form-select">
                  <option v-for="a in aux.anos" :key="a" :value="a">{{ a }}</option>
                </select>
              </div>
              <div class="col-md-9">
                <label class="fw-bold text-primary">Setor Responsável (Executor Principal) *</label>
                <select v-model="form.info.id_setor_responsavel" class="form-select border-primary">
                  <option value="">Selecione o setor dono do projeto...</option>
                  <option v-for="s in initialData.setores" :key="s.id_setor" :value="s.id_setor">
                    {{ formatSetor(s) }}
                  </option>
                </select>
                <small class="text-muted">Unidade que coordenará a execução técnica da iniciativa.</small>
              </div>
            </div>

            <!-- Abrangência Territorial -->
            <div class="card bg-light border-0 p-3 mb-3">
              <label class="fw-bold mb-2">Abrangência Territorial (Municípios) *</label>
              <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" v-model="aux.abrangenciaEstadual" id="chkEstadoIni">
                <label class="form-check-label fw-bold text-primary" for="chkEstadoIni">Todo o Estado de Sergipe</label>
              </div>
              <div class="input-group" v-if="!aux.abrangenciaEstadual">
                <select v-model="aux.municipioTemp" class="form-select">
                  <option value="">Selecione um município...</option>
                  <option v-for="m in initialData.municipios" :key="m.codigo_ibge" :value="m.codigo_ibge">{{ m.nome_municipio }}</option>
                </select>
                <button class="btn btn-primary" type="button" @click="addMunicipio">Adicionar</button>
              </div>
              <button v-else class="btn btn-sm btn-primary w-auto align-self-start" type="button" @click="addMunicipio">Confirmar Abrangência Estadual</button>
              <div class="mt-2 d-flex flex-wrap gap-1">
                <span v-for="(m, i) in form.municipios" :key="i" class="badge bg-primary">
                  {{ m.nome_municipio }} <i class="bi bi-x-circle ms-1 cursor-pointer" @click="form.municipios.splice(i,1)"></i>
                </span>
              </div>
            </div>

            <!-- Setores Colaboradores -->
            <div class="card border p-3 mb-3">
              <label class="fw-bold mb-1">Setores Colaboradores (Apoio e Parcerias)</label>
              <small class="text-muted d-block mb-2">Adicione outros setores da PMSE envolvidos no projeto.</small>
              <div class="row g-2 align-items-center mb-2">
                <div class="col-md-7">
                  <select v-model="aux.setorColabTemp" class="form-select form-select-sm">
                    <option value="">Selecione o setor de apoio...</option>
                    <option v-for="s in setoresDisponiveisColab" :key="s.id_setor" :value="s.id_setor">
                      {{ formatSetor(s) }}
                    </option>
                  </select>
                </div>
                <div class="col-md-3">
                  <input v-model="aux.papelColabTemp" class="form-control form-control-sm" placeholder="Papel / Atribuição">
                </div>
                <div class="col-md-2">
                  <button class="btn btn-sm btn-outline-secondary w-100 fw-bold" type="button" @click="addSetorColab">+ Adicionar</button>
                </div>
              </div>
              <div class="d-flex flex-wrap gap-1" v-if="form.setores_colaboradores.length">
                <span v-for="(s, i) in form.setores_colaboradores" :key="i" class="badge bg-secondary p-2">
                  <strong>{{ s.sigla ? '['+s.sigla+'] ' : '' }}{{ s.nome_setor }}</strong>: {{ s.papel }}
                  <i class="bi bi-x ms-1 cursor-pointer text-warning" @click="form.setores_colaboradores.splice(i,1)"></i>
                </span>
              </div>
              <small v-else class="text-muted fst-italic">Nenhum setor colaborador adicionado.</small>
            </div>

            <!-- Detalhe do Local -->
            <div>
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="fw-bold">Detalhamento do Local / Emprego Operacional</label>
                <button type="button" class="btn btn-sm btn-outline-primary py-0 fw-bold" @click="sugerirComIA('detalhe_local')" :disabled="!!iaLoadingCampo">
                  <span v-if="iaLoadingCampo==='detalhe_local'" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                </button>
              </div>
              <textarea v-model="form.info.detalhe_local" class="form-control" rows="2" placeholder="Unidades, batalhões, sedes ou regiões onde o projeto será implantado"></textarea>
            </div>
          </div>

          <!-- ETAPA 2: ESTRATÉGIA & JUSTIFICATIVA -->
          <div v-if="step === 2">
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <label class="fw-bold">Eixo Estratégico ({{ form.info.ano }})</label>
                <select v-model="form.estrategia.eixo" @change="onEixoChange" class="form-select">
                  <option value="">Selecione...</option>
                  <option v-for="e in eixosDoAno" :key="e" :value="e">{{ e }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="fw-bold">Objetivo Estratégico</label>
                <select v-model="form.info.id_catalogo" class="form-select" :disabled="!form.estrategia.eixo">
                  <option value="">Selecione...</option>
                  <option v-for="o in objetivosDoEixo" :key="o.id_catalogo" :value="o.id_catalogo">{{ o.objetivo }}</option>
                </select>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="fw-bold m-0">Justificativa Técnica *</label>
              <button type="button" class="btn btn-sm btn-outline-primary fw-bold" @click="sugerirComIA('justificativa')" :disabled="!!iaLoadingCampo">
                <span v-if="iaLoadingCampo==='justificativa'" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-stars me-1"></i> {{ iaLoadingCampo==='justificativa' ? 'Redigindo...' : 'Sugerir / Redigir com IA' }}
              </button>
            </div>
            <textarea v-model="form.info.justificativa" class="form-control" rows="8" placeholder="Fundamente a necessidade técnica, operacional e o impacto da iniciativa..."></textarea>
          </div>

          <!-- ETAPA 3: METAS E ETAPAS (COM GUIA E IA) -->
          <div v-if="step === 3">
            <!-- Guia de Ajuda para Definição de Metas e Etapas -->
            <div class="alert alert-light border border-info shadow-sm mb-3">
              <div class="d-flex align-items-start gap-2">
                <i class="bi bi-lightbulb-fill text-info fs-5 mt-1"></i>
                <div class="small">
                  <strong>Guia Prático PMSE — Como definir Metas e Etapas:</strong>
                  <div class="mt-1">
                    • <strong>Meta (O que e quanto entregar):</strong> O resultado final mensurável e quantitativo (Ex: <em>"Adquirir 30 viaturas 4x4"</em> ou <em>"Capacitar 120 policiais"</em>).
                  </div>
                  <div>
                    • <strong>Etapa (Como e quando fazer):</strong> Os marcos temporais críticos indispensáveis para atingir a meta (Ex: <em>"Elaborar Termo de Referência"</em>, <em>"Homologar licitação"</em>, <em>"Vistoriar e tombar na DAL"</em>).
                  </div>
                </div>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 class="fw-bold m-0">Metas Físicas e Etapas do Projeto</h6>
                <small class="text-muted">Cadastre manualmente ou peça à IA para sugerir com base nos dados do projeto.</small>
              </div>
              <button type="button" class="btn btn-sm btn-outline-primary fw-bold" @click="sugerirComIA('metas')" :disabled="!!iaLoadingCampo">
                <span v-if="iaLoadingCampo==='metas'" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-stars me-1"></i> Sugerir Metas &amp; Etapas com IA
              </button>
            </div>

            <div class="card border shadow-sm mb-4">
              <div class="card-body">
                <div class="row g-2 align-items-end">
                  <div class="col-md-5"><label class="small fw-bold">Descrição da Meta</label><input v-model="temp.meta.descricao" class="form-control" placeholder="Ex: Adquirir e colocar em carga 50 coletes balísticos"></div>
                  <div class="col-md-3"><label class="small fw-bold">Unidade</label>
                    <select v-model="temp.meta.unidade_medida" class="form-select">
                      <option value="Unid">Unidade (Físico)</option>
                      <option value="%">Percentual (%)</option>
                      <option value="R$">Financeiro (R$)</option>
                    </select>
                  </div>
                  <div class="col-md-2"><label class="small fw-bold">Qtd Alvo</label><input v-model="temp.meta.qtd_alvo" type="number" step="0.01" class="form-control" placeholder="Ex: 50"></div>
                  <div class="col-md-2"><button type="button" class="btn btn-primary w-100 fw-bold" @click="addMeta">+ Criar Meta</button></div>
                </div>
              </div>
            </div>

            <div v-if="form.metas.length" class="table-responsive border rounded">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light"><tr><th style="width:60px">Cód</th><th>Descrição</th><th class="text-center" style="width:110px">Alvo</th><th class="text-center" style="width:140px">Etapas</th><th style="width:50px"></th></tr></thead>
                <tbody>
                  <tr v-for="(m, i) in form.metas" :key="i">
                    <td class="fw-bold">{{ m.codigo_meta }}</td>
                    <td>{{ m.descricao }}</td>
                    <td class="text-center fw-bold text-primary">{{ m.qtd_alvo }} {{ m.unidade_medida }}</td>
                    <td class="text-center">
                      <button type="button" class="btn btn-sm btn-outline-primary" @click="openEtapas(i)">
                        Etapas ({{ m.etapas.length }})
                      </button>
                    </td>
                    <td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger border-0" @click="removeMeta(i)"><i class="bi bi-trash"></i></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-4 text-muted border border-dashed rounded bg-light">Nenhuma meta cadastrada.</div>
          </div>

          <!-- ETAPA 4: BENEFICIÁRIOS (TEXTO LIVRE) -->
          <div v-if="step === 4">
            <div class="alert alert-light border border-secondary shadow-sm mb-3">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="small">
                  <strong>Público Beneficiário em Texto Livre:</strong> Digite livremente quem será atendido pelo projeto (efetivo da unidade, sociedade, público escolar, etc.).
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary fw-bold" @click="sugerirComIA('beneficiarios')" :disabled="!!iaLoadingCampo">
                  <span v-if="iaLoadingCampo==='beneficiarios'" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                </button>
              </div>
            </div>

            <div class="card border p-3 mb-3 bg-light">
              <div class="row g-2 align-items-end">
                <div class="col-md-7">
                  <label class="small fw-bold">Descrição do Público Beneficiário *</label>
                  <input v-model="temp.bene.descricao" class="form-control" placeholder="Ex: Tropa operacional do 3º BPM e moradores da região agreste">
                </div>
                <div class="col-md-3">
                  <label class="small fw-bold">Estimativa de Pessoas (Opcional)</label>
                  <input v-model="temp.bene.estimativa_publico" type="number" class="form-control" placeholder="Ex: 1500">
                </div>
                <div class="col-md-2">
                  <button type="button" class="btn btn-success w-100 fw-bold" @click="addBene">+ Adicionar</button>
                </div>
              </div>
            </div>

            <ul class="list-group" v-if="form.beneficiarios.length">
              <li v-for="(b, i) in form.beneficiarios" :key="i" class="list-group-item d-flex justify-content-between align-items-center">
                <span>
                  <strong>{{ b.descricao }}</strong>
                  <span v-if="b.estimativa_publico" class="badge bg-primary bg-opacity-10 text-primary border ms-2">
                    ~{{ b.estimativa_publico }} pessoas
                  </span>
                </span>
                <button type="button" class="btn btn-sm btn-outline-danger border-0" @click="form.beneficiarios.splice(i,1)"><i class="bi bi-trash"></i></button>
              </li>
            </ul>
            <div v-else class="text-center py-4 text-muted border border-dashed rounded bg-light">Nenhum beneficiário adicionado.</div>
          </div>

          <!-- ETAPA 5: GESTÃO DE RISCOS (COM GUIA E IA) -->
          <div v-if="step === 5">
            <div class="alert alert-light border border-warning shadow-sm mb-3">
              <div class="d-flex align-items-start gap-2">
                <i class="bi bi-shield-exclamation text-warning fs-5 mt-1"></i>
                <div class="small">
                  <strong>Guia de Gestão de Riscos (PMSE):</strong>
                  <div class="mt-1">
                    • <strong>Categorias:</strong> <em>Operacional</em> (emprego da tropa/rotinas), <em>Material</em> (atraso de fábrica/peças), <em>Financeiro</em> (bloqueio/orçamento) e <em>Pessoal</em> (afastamentos/capacitação).
                  </div>
                  <div>
                    • <strong>Lógica Se → Então:</strong> Descreva o evento incerto e defina a ação imediata caso ele se concretize (Ex: <em>Se</em> atrasar a entrega da viatura, <em>então</em> acionar garantia contratual e remanejar frota).
                  </div>
                </div>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 class="fw-bold m-0">Matriz de Riscos do Projeto</h6>
                <small class="text-muted">Mapeie os riscos e plano de mitigação ou utilize a IA para preencher.</small>
              </div>
              <button type="button" class="btn btn-sm btn-outline-primary fw-bold" @click="sugerirComIA('riscos')" :disabled="!!iaLoadingCampo">
                <span v-if="iaLoadingCampo==='riscos'" class="spinner-border spinner-border-sm me-1"></span>
                <i v-else class="bi bi-stars me-1"></i> Sugerir Riscos com IA
              </button>
            </div>

            <div class="card border shadow-sm mb-3">
              <div class="card-body">
                <div class="row g-2 mb-2">
                  <div class="col-md-6">
                    <label class="small fw-bold">Tipo de Risco</label>
                    <select v-model="temp.risco.tipo_risco" class="form-select">
                      <option>Risco Operacional</option><option>Risco Financeiro</option><option>Risco Material</option><option>Risco Pessoal</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="small fw-bold">Nível</label>
                    <select v-model="temp.risco.nivel_risco" class="form-select"><option>Baixo</option><option>Médio</option><option>Alto</option></select>
                  </div>
                </div>
                <div class="row g-2">
                  <div class="col-md-6"><label class="small fw-bold text-danger">Se ocorrer (Evento)</label><input v-model="temp.risco.descricao_evento" class="form-control" placeholder="Ex: O fornecedor atrasar a entrega das baterias"></div>
                  <div class="col-md-6"><label class="small fw-bold text-success">Então fazer (Mitigação)</label><input v-model="temp.risco.acao_mitigacao" class="form-control" placeholder="Ex: Notificar contratada e escalonar cronograma"></div>
                </div>
                <div class="text-end mt-3"><button type="button" class="btn btn-warning fw-bold" @click="addRisco">+ Adicionar Risco</button></div>
              </div>
            </div>
            <table v-if="form.riscos.length" class="table table-bordered table-sm">
              <thead class="table-light"><tr><th>Tipo / Nível</th><th>Se → Então</th><th style="width:40px"></th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in form.riscos" :key="i">
                  <td><span class="badge bg-secondary">{{ r.tipo_risco }}</span><div class="small text-muted">{{ r.nivel_risco }}</div></td>
                  <td class="small"><strong class="text-danger">Se:</strong> {{ r.descricao_evento }}<br><strong class="text-success">Então:</strong> {{ r.acao_mitigacao }}</td>
                  <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger border-0" @click="form.riscos.splice(i,1)"><i class="bi bi-trash"></i></button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ETAPA 6: ORÇAMENTO -->
          <div v-if="step === 6">
            <!-- MATERIAIS -->
            <div class="card mb-3 shadow-sm">
              <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                <h6 class="m-0">Materiais?</h6>
                <select v-model="form.orcamento.visivel.material" class="form-select form-select-sm w-auto"><option>Não</option><option>Sim</option></select>
              </div>
              <div class="card-body bg-light" v-if="form.orcamento.visivel.material === 'Sim'">
                <div class="row g-2 mb-2">
                  <div class="col-md-4"><input v-model="temp.mat.descricao" class="form-control form-control-sm" placeholder="Item / Material *"></div>
                  <div class="col-md-3"><input v-model="temp.mat.detalhe_complementar" class="form-control form-control-sm" placeholder="Marca / Especificação"></div>
                  <div class="col-md-3">
                    <select v-model="temp.mat.codigo_natureza" class="form-select form-select-sm">
                      <option value="">Natureza (Opcional)</option>
                      <option v-for="n in initialData.naturezas" :key="n.codigo_natureza" :value="n.codigo_natureza">{{ n.codigo_natureza }} - {{ n.descricao }}</option>
                    </select>
                  </div>
                  <div class="col-md-2"><input v-model="temp.mat.quantidade" type="number" class="form-control form-control-sm" placeholder="Qtd"></div>
                </div>
                <div class="row g-2 mb-2">
                  <div class="col-md-4"><input v-model="temp.mat.f1_nome" class="form-control form-control-sm mb-1" placeholder="Forn A Nome *"><input v-model="temp.mat.v1" type="number" step="0.01" class="form-control form-control-sm" placeholder="Valor Unit R$ *"></div>
                  <div class="col-md-4"><input v-model="temp.mat.f2_nome" class="form-control form-control-sm mb-1" placeholder="Forn B Nome"><input v-model="temp.mat.v2" type="number" step="0.01" class="form-control form-control-sm" placeholder="Valor Unit R$"></div>
                  <div class="col-md-4"><input v-model="temp.mat.f3_nome" class="form-control form-control-sm mb-1" placeholder="Forn C Nome"><input v-model="temp.mat.v3" type="number" step="0.01" class="form-control form-control-sm" placeholder="Valor Unit R$"></div>
                </div>
                <div class="text-end"><button type="button" class="btn btn-secondary btn-sm" @click="addItemMaterial">+ Adicionar Material</button></div>
                <table class="table table-sm bg-white mt-2 mb-0" v-if="itensPorCategoria('MATERIAL').length">
                  <thead><tr><th>Item</th><th>Qtd</th><th>Unit Médio</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    <tr v-for="it in itensPorCategoria('MATERIAL')" :key="it._idx">
                      <td>{{ it.descricao }}</td><td>{{ it.quantidade }}</td><td>{{ utils.formatMoeda(it.valor_unitario) }}</td><td>{{ utils.formatMoeda(it.valor_planejado_total) }}</td>
                      <td><button type="button" class="btn btn-danger btn-sm py-0" @click="removerItemOrc(it._idx)">x</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- SERVIÇOS -->
            <div class="card mb-3 shadow-sm">
              <div class="card-header bg-info text-dark d-flex justify-content-between align-items-center">
                <h6 class="m-0">Serviços?</h6>
                <select v-model="form.orcamento.visivel.servico" class="form-select form-select-sm w-auto"><option>Não</option><option>Sim</option></select>
              </div>
              <div class="card-body bg-light" v-if="form.orcamento.visivel.servico === 'Sim'">
                <div class="row g-2 mb-2">
                  <div class="col-md-8"><input v-model="temp.serv.descricao" class="form-control form-control-sm" placeholder="Descrição do Serviço *"></div>
                  <div class="col-md-4">
                    <select v-model="temp.serv.codigo_natureza" class="form-select form-select-sm">
                      <option value="">Natureza (Opcional)</option>
                      <option v-for="n in initialData.naturezas" :key="n.codigo_natureza" :value="n.codigo_natureza">{{ n.codigo_natureza }} - {{ n.descricao }}</option>
                    </select>
                  </div>
                </div>
                <div class="row g-2 mb-2">
                  <div class="col-md-4"><input v-model="temp.serv.f1_nome" class="form-control form-control-sm mb-1" placeholder="Prest A Nome *"><input v-model="temp.serv.v1" type="number" step="0.01" class="form-control form-control-sm" placeholder="Valor R$ *"></div>
                  <div class="col-md-4"><input v-model="temp.serv.f2_nome" class="form-control form-control-sm mb-1" placeholder="Prest B Nome"><input v-model="temp.serv.v2" type="number" step="0.01" class="form-control form-control-sm" placeholder="Valor R$"></div>
                  <div class="col-md-4"><input v-model="temp.serv.f3_nome" class="form-control form-control-sm mb-1" placeholder="Prest C Nome"><input v-model="temp.serv.v3" type="number" step="0.01" class="form-control form-control-sm" placeholder="Valor R$"></div>
                </div>
                <div class="text-end"><button type="button" class="btn btn-info btn-sm" @click="addItemServico">+ Adicionar Serviço</button></div>
                <table class="table table-sm bg-white mt-2 mb-0" v-if="itensPorCategoria('SERVICO').length">
                  <tbody>
                    <tr v-for="it in itensPorCategoria('SERVICO')" :key="it._idx">
                      <td>{{ it.descricao }}</td><td>{{ utils.formatMoeda(it.valor_planejado_total) }}</td>
                      <td class="text-end"><button type="button" class="btn btn-danger btn-sm py-0" @click="removerItemOrc(it._idx)">x</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- HORA-AULA / RECORRENTE / IFV / DIÁRIAS -->
            <div class="row g-3">
              <div class="col-md-6">
                <div class="card shadow-sm h-100">
                  <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h6 class="m-0">Hora-Aula?</h6>
                    <select v-model="form.orcamento.visivel.hora_aula" class="form-select form-select-sm w-auto"><option>Não</option><option>Sim</option></select>
                  </div>
                  <div class="card-body bg-light" v-if="form.orcamento.visivel.hora_aula === 'Sim'">
                    <input v-model="temp.ha.disc" class="form-control form-control-sm mb-2" placeholder="Disciplina">
                    <div class="row g-2 mb-2">
                      <div class="col-5"><select v-model="temp.ha.instrVal" class="form-select form-select-sm"><option v-for="t in aux.titulacoes" :value="t.valor">{{ t.nome }} ({{ t.valor }})</option></select></div>
                      <div class="col-4"><select v-model="temp.ha.monVal" class="form-select form-select-sm"><option value="0">S/ Monitor</option><option v-for="t in aux.titulacoes" :value="t.valor">Mon: {{ t.nome }}</option></select></div>
                      <div class="col-3"><input v-model="temp.ha.horas" type="number" class="form-control form-control-sm" placeholder="Horas"></div>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm w-100 mb-2" @click="addItemHoraAula">+ Adicionar Hora-Aula</button>
                    <div v-for="it in itensPorCategoria('HORA_AULA')" :key="it._idx" class="small d-flex justify-content-between border-bottom py-1">
                      <span>{{ it.descricao }} ({{ it.quantidade }}h)</span>
                      <span><strong>{{ utils.formatMoeda(it.valor_planejado_total) }}</strong> <button type="button" class="btn btn-link text-danger p-0 ms-1" @click="removerItemOrc(it._idx)">x</button></span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card shadow-sm h-100">
                  <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                    <h6 class="m-0">Recorrentes?</h6>
                    <select v-model="form.orcamento.visivel.recorrente" class="form-select form-select-sm w-auto"><option>Não</option><option>Sim</option></select>
                  </div>
                  <div class="card-body bg-light" v-if="form.orcamento.visivel.recorrente === 'Sim'">
                    <input v-model="temp.rec.desc" class="form-control form-control-sm mb-2" placeholder="Descrição do Custeio">
                    <div class="row g-2 mb-2">
                      <div class="col-6"><select v-model="temp.rec.freq" class="form-select form-select-sm"><option>Mensal</option><option>Semestral</option><option>Anual</option></select></div>
                      <div class="col-6"><input v-model="temp.rec.valor" type="number" step="0.01" class="form-control form-control-sm" placeholder="Valor R$"></div>
                    </div>
                    <button type="button" class="btn btn-warning btn-sm w-100 mb-2" @click="addItemRecorrente">+ Adicionar Recorrente</button>
                    <div v-for="it in itensPorCategoria('RECORRENTE')" :key="it._idx" class="small d-flex justify-content-between border-bottom py-1">
                      <span>{{ it.descricao }} ({{ it.detalhe_complementar }})</span>
                      <span><strong>{{ utils.formatMoeda(it.valor_planejado_total) }}/ano</strong> <button type="button" class="btn btn-link text-danger p-0 ms-1" @click="removerItemOrc(it._idx)">x</button></span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card shadow-sm h-100">
                  <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                    <h6 class="m-0">IFV?</h6>
                    <select v-model="form.orcamento.visivel.ifv" class="form-select form-select-sm w-auto"><option>Não</option><option>Sim</option></select>
                  </div>
                  <div class="card-body bg-light" v-if="form.orcamento.visivel.ifv === 'Sim'">
                    <div class="mb-2"><label class="small fw-bold">Nº de Eventos</label><input v-model="form.orcamento.visivel.ifv_num_eventos" type="number" min="1" class="form-control form-control-sm w-50"></div>
                    <div class="row g-2 mb-2">
                      <div class="col-7"><select v-model="temp.ifv.postoIdx" class="form-select form-select-sm"><option v-for="(p, i) in aux.postos" :key="i" :value="i">{{ p.nome }} (R$ {{ p.valor }})</option></select></div>
                      <div class="col-5"><input v-model="temp.ifv.qtd" type="number" class="form-control form-control-sm" placeholder="Qtd PM"></div>
                    </div>
                    <button type="button" class="btn btn-danger btn-sm w-100 mb-2" @click="addItemIfv">+ Adicionar IFV</button>
                    <div v-for="it in itensPorCategoria('IFV')" :key="it._idx" class="small d-flex justify-content-between border-bottom py-1">
                      <span>{{ it.descricao }} ({{ it.quantidade }} PMs)</span>
                      <span><strong>{{ utils.formatMoeda(calcularTotalItemExibicao(it)) }}</strong> <button type="button" class="btn btn-link text-danger p-0 ms-1" @click="removerItemOrc(it._idx)">x</button></span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card shadow-sm h-100">
                  <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                    <h6 class="m-0">Diárias?</h6>
                    <select v-model="form.orcamento.visivel.diaria" class="form-select form-select-sm w-auto"><option>Não</option><option>Sim</option></select>
                  </div>
                  <div class="card-body bg-light" v-if="form.orcamento.visivel.diaria === 'Sim'">
                    <input v-model="temp.dia.desc" class="form-control form-control-sm mb-2" placeholder="Motivo da Viagem">
                    <div class="row g-2 mb-2">
                      <div class="col-4"><select v-model="temp.dia.tipo" class="form-select form-select-sm"><option>Militar</option><option>Civil</option></select></div>
                      <div class="col-4"><input v-model="temp.dia.qtd" type="number" class="form-control form-control-sm" placeholder="Qtd"></div>
                      <div class="col-4"><input v-model="temp.dia.valor" type="number" step="0.01" class="form-control form-control-sm" placeholder="R$ Unit"></div>
                    </div>
                    <button type="button" class="btn btn-dark btn-sm w-100 mb-2" @click="addItemDiaria">+ Adicionar Diária</button>
                    <div v-for="it in itensPorCategoria('DIARIA')" :key="it._idx" class="small d-flex justify-content-between border-bottom py-1">
                      <span>{{ it.descricao }} ({{ it.quantidade }}x)</span>
                      <span><strong>{{ utils.formatMoeda(it.valor_planejado_total) }}</strong> <button type="button" class="btn btn-link text-danger p-0 ms-1" @click="removerItemOrc(it._idx)">x</button></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="alert alert-success mt-4 d-flex justify-content-between align-items-center fw-bold fs-5 mb-0">
              <span>TOTAL PLANEJADO DA INICIATIVA:</span>
              <span>{{ utils.formatMoeda(resumoFinanceiro.total) }}</span>
            </div>
          </div>

          <!-- ETAPA 7: FORMULÁRIO OFICIAL FPP (IDÊNTICO À FPP VIEW COM IA) -->
          <div v-if="step === 7">
            <div class="card bg-light border p-3 mb-4">
              <label class="fw-bold fs-6 mb-2">Este projeto utilizará recursos do Fundo a Fundo (SSP / SENASP / FNSP)?</label>
              <div class="d-flex gap-4">
                <div class="form-check">
                  <input class="form-check-input" type="radio" value="Tesouro" v-model="form.fundo_tipo_escolha" id="radTesouro" @change="form.info.id_fpp=''">
                  <label class="form-check-label fw-bold text-dark" for="radTesouro">Não (Tesouro Estadual)</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" value="Fundo a Fundo" v-model="form.fundo_tipo_escolha" id="radFpp">
                  <label class="form-check-label fw-bold text-primary" for="radFpp">Sim (Fundo a Fundo SSP - Portaria nº 1998/2025)</label>
                </div>
              </div>
            </div>

            <div v-if="form.fundo_tipo_escolha === 'Fundo a Fundo'">
              <!-- Alternância: Preencher FPP Oficial Completo OU Vincular Existente -->
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn" :class="form.fpp_modo==='NOVO' ? 'btn-primary fw-bold' : 'btn-outline-primary'" @click="form.fpp_modo='NOVO'">
                    <i class="bi bi-pencil-square me-1"></i> Preencher FPP Oficial Completo
                  </button>
                  <button type="button" class="btn" :class="form.fpp_modo==='EXISTENTE' ? 'btn-primary fw-bold' : 'btn-outline-primary'" @click="form.fpp_modo='EXISTENTE'">
                    <i class="bi bi-link-45deg me-1"></i> Vincular a um FPP Já Existente
                  </button>
                </div>
                <span class="badge bg-dark font-monospace">{{ form.fpp.numero_protocolo_preview }}</span>
              </div>

              <!-- OPÇÃO 1: FORMULÁRIO OFICIAL FPP COMPLETO COM IA EM TUDO -->
              <div v-if="form.fpp_modo === 'NOVO'" class="card border p-3 p-md-4 shadow-sm bg-white">
                <!-- Seletor de Áreas Temáticas -->
                <div class="mb-4">
                  <label class="fw-bold small text-uppercase text-secondary mb-2">Área Temática Prioritária (Portaria SSP 1998/2025):</label>
                  <div class="row g-2">
                    <div class="col-md-4" v-for="a in areasFpp" :key="a.codigo">
                      <div class="card p-2 h-100 cursor-pointer border-2"
                           :class="form.fpp.area_tematica === a.codigo ? 'border-'+a.cor+' bg-'+a.cor+' bg-opacity-10' : 'border-light bg-light'"
                           @click="selecionarAreaFpp(a.codigo)">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                          <strong :class="'text-'+a.cor"><i class="bi me-1" :class="a.icone"></i> {{ a.codigo }}</strong>
                          <span v-if="form.fpp.area_tematica === a.codigo" class="badge" :class="'bg-'+a.cor">SELECIONADO</span>
                        </div>
                        <div class="fw-bold small text-dark">{{ a.titulo }}</div>
                        <small class="text-muted lh-sm">{{ a.desc }}</small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Proponente e Lotação -->
                <div class="row g-2 mb-3">
                  <div class="col-md-6"><label class="small fw-bold">Órgão / Instituição:</label><input v-model="form.fpp.orgao_instituicao" class="form-control form-control-sm"></div>
                  <div class="col-md-6"><label class="small fw-bold">Responsável Técnico:</label><input v-model="form.fpp.nome_proponente" class="form-control form-control-sm"></div>
                  <div class="col-md-4"><label class="small fw-bold">Posto / Cargo:</label><input v-model="form.fpp.cargo_funcao" class="form-control form-control-sm" placeholder="Ex: Major PM"></div>
                  <div class="col-md-4"><label class="small fw-bold">Lotação:</label><input v-model="form.fpp.unidade_proponente" class="form-control form-control-sm"></div>
                  <div class="col-md-4"><label class="small fw-bold">Telefone / E-mail:</label><input v-model="form.fpp.telefone_contato" class="form-control form-control-sm" placeholder="Telefone"></div>
                </div>

                <!-- I. Objetivo Geral -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="small fw-bold text-uppercase">I. Objetivo Geral</label>
                    <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_obj_geral')" :disabled="!!iaLoadingCampo">
                      <span v-if="iaLoadingCampo==='fpp_obj_geral'" class="spinner-border spinner-border-sm me-1"></span>
                      <i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                    </button>
                  </div>
                  <textarea v-model="form.fpp.objetivo_geral" class="form-control form-control-sm" rows="3" placeholder="Iniciando com verbo no infinitivo..."></textarea>
                </div>

                <!-- II. Objetivos Específicos -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="small fw-bold text-uppercase">II. Objetivos Específicos</label>
                    <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_obj_especificos')" :disabled="!!iaLoadingCampo">
                      <span v-if="iaLoadingCampo==='fpp_obj_especificos'" class="spinner-border spinner-border-sm me-1"></span>
                      <i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                    </button>
                  </div>
                  <textarea v-model="form.fpp.objetivos_especificos_txt" class="form-control form-control-sm" rows="4" placeholder="1. ...&#10;2. ...&#10;3. ..."></textarea>
                </div>

                <!-- III. Justificativa Técnica -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="small fw-bold text-uppercase">III. Justificativa Técnica do FPP</label>
                    <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_justificativa')" :disabled="!!iaLoadingCampo">
                      <span v-if="iaLoadingCampo==='fpp_justificativa'" class="spinner-border spinner-border-sm me-1"></span>
                      <i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                    </button>
                  </div>
                  <textarea v-model="form.fpp.justificativa_tecnica" class="form-control form-control-sm" rows="5"></textarea>
                </div>

                <!-- IV. Público-Alvo -->
                <div class="row g-2 mb-3">
                  <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="small fw-bold text-uppercase">IV. Público-Alvo Direto</label>
                      <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_publico_direto')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars"></i> IA</button>
                    </div>
                    <textarea v-model="form.fpp.publico_direto" class="form-control form-control-sm" rows="3" placeholder="Efetivo policial beneficiado"></textarea>
                  </div>
                  <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="small fw-bold text-uppercase">IV. Público-Alvo Indireto</label>
                      <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_publico_indireto')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars"></i> IA</button>
                    </div>
                    <textarea v-model="form.fpp.publico_indireto" class="form-control form-control-sm" rows="3" placeholder="Comunidade / Sociedade"></textarea>
                  </div>
                </div>

                <!-- V. Resultados Esperados & VI. Metas -->
                <div class="row g-2 mb-3">
                  <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="small fw-bold text-uppercase">V. Resultados Esperados</label>
                      <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_resultados')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars"></i> IA</button>
                    </div>
                    <textarea v-model="form.fpp.resultados_esperados" class="form-control form-control-sm" rows="4" placeholder="Impactos diretos na segurança"></textarea>
                  </div>
                  <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="small fw-bold text-uppercase">VI. Metas FPP</label>
                      <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_metas')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars"></i> IA</button>
                    </div>
                    <textarea v-model="form.fpp.metas_txt" class="form-control form-control-sm" rows="4" placeholder="Metas quantificáveis do plano de aplicação"></textarea>
                  </div>
                </div>

                <!-- VII. Sustentabilidade & VIII. Mensuração -->
                <div class="row g-2 mb-3">
                  <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="small fw-bold text-uppercase">VII. Sustentabilidade do Projeto</label>
                      <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_sustentabilidade')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars"></i> IA</button>
                    </div>
                    <textarea v-model="form.fpp.sustentabilidade" class="form-control form-control-sm" rows="3"></textarea>
                  </div>
                  <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="small fw-bold text-uppercase">VIII. Mensuração dos Resultados</label>
                      <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_mensuracao')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars"></i> IA</button>
                    </div>
                    <textarea v-model="form.fpp.mensuracao" class="form-control form-control-sm" rows="3"></textarea>
                  </div>
                </div>

                <!-- IX. Plano de Localização -->
                <div class="card p-3 bg-light border mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="small fw-bold text-uppercase text-primary m-0">IX. Plano de Localização</label>
                    <button type="button" class="btn btn-xs btn-outline-primary fw-bold" @click="addFppLocal">+ Adicionar Local</button>
                  </div>
                  <div v-for="(loc, idx) in form.fpp.locais" :key="idx" class="row g-2 mb-2 align-items-center">
                    <div class="col-md-4"><input v-model="loc.item" class="form-control form-control-sm" placeholder="Item / Material"></div>
                    <div class="col-md-2"><input v-model="loc.quantidade" class="form-control form-control-sm" placeholder="Qtd"></div>
                    <div class="col-md-5"><input v-model="loc.endereco" class="form-control form-control-sm" placeholder="Endereço / Lotação"></div>
                    <div class="col-md-1 text-center"><button type="button" class="btn btn-link text-danger p-0" @click="removeFppLocal(idx)"><i class="bi bi-trash"></i></button></div>
                  </div>
                </div>

                <!-- X. Materiais, Serviços & Orçamento FPP -->
                <div class="card p-3 border mb-3 bg-light">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="small fw-bold text-uppercase text-success m-0">X. Materiais, Serviços &amp; Orçamento (FPP)</label>
                    <button type="button" class="btn btn-xs btn-success fw-bold" @click="addFppItemOrc">+ Adicionar Item Orçamentário</button>
                  </div>
                  <div class="table-responsive">
                    <table class="table table-sm table-bordered bg-white align-middle small mb-2">
                      <thead class="table-light">
                        <tr>
                          <th>Item</th>
                          <th>Especificação</th>
                          <th>Marca/Ref</th>
                          <th style="width: 170px;">Natureza</th>
                          <th style="width: 75px;">Qtd</th>
                          <th style="width: 110px;">Unitário (R$)</th>
                          <th class="text-end" style="width: 115px;">Total</th>
                          <th style="width: 35px;"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(it, idx) in form.fpp.orcamento" :key="idx">
                          <td><input v-model="it.nome" class="form-control form-control-sm" placeholder="Nome"></td>
                          <td><input v-model="it.descricao" class="form-control form-control-sm" placeholder="Especificação"></td>
                          <td><input v-model="it.marca" class="form-control form-control-sm" placeholder="Marca"></td>
                          <td><select v-model="it.natureza" class="form-select form-select-sm"><option>4.4.90 (Investimento)</option><option>3.3.90 (Custeio)</option></select></td>
                          <td><input v-model="it.quantidade" type="number" min="1" class="form-control form-control-sm text-center"></td>
                          <td><input v-model="it.unitario" type="number" step="0.01" class="form-control form-control-sm text-end"></td>
                          <td class="text-end fw-bold">{{ utils.formatMoeda((Number(it.quantidade)||0)*(Number(it.unitario)||0)) }}</td>
                          <td class="text-center"><button type="button" class="btn btn-link text-danger p-0" @click="removeFppItemOrc(idx)"><i class="bi bi-trash"></i></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="row small fw-bold text-end justify-content-end g-3 pe-2">
                    <div class="col-auto">Investimento: <span class="text-primary">{{ utils.formatMoeda(fppTotalInvestimento) }}</span></div>
                    <div class="col-auto">Custeio: <span class="text-warning">{{ utils.formatMoeda(fppTotalCusteio) }}</span></div>
                    <div class="col-auto">Total FPP: <span class="text-success fs-6">{{ utils.formatMoeda(fppTotalGeral) }}</span></div>
                  </div>
                  <!-- Pesquisa de Preços Art. 5º -->
                  <div class="mt-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="small fw-bold">Pesquisa de Preços (Art. 5º da Portaria SSP 1998/2025):</label>
                      <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_pesquisa')" :disabled="!!iaLoadingCampo"><i class="bi bi-stars"></i> IA</button>
                    </div>
                    <textarea v-model="form.fpp.pesquisa_precos_obs" class="form-control form-control-sm" rows="2"></textarea>
                  </div>
                </div>

                <!-- XI. Estratégia de Implementação -->
                <div>
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="small fw-bold text-uppercase">XI. Estratégia de Implementação</label>
                    <button type="button" class="btn btn-xs btn-outline-primary py-0 fw-bold" @click="sugerirComIA('fpp_implementacao')" :disabled="!!iaLoadingCampo">
                      <span v-if="iaLoadingCampo==='fpp_implementacao'" class="spinner-border spinner-border-sm me-1"></span>
                      <i v-else class="bi bi-stars me-1"></i> Sugerir com IA
                    </button>
                  </div>
                  <textarea v-model="form.fpp.implementacao" class="form-control form-control-sm" rows="4"></textarea>
                </div>
              </div>

              <!-- OPÇÃO 2: VINCULAR A UM FPP JÁ EXISTENTE -->
              <div v-else class="card border p-3 shadow-sm bg-white">
                <div v-if="fppSelecionadaObj" class="alert alert-success d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span class="badge bg-success mb-1">FPP SELECIONADA</span>
                    <h6 class="fw-bold text-dark m-0">{{ fppSelecionadaObj.numero_protocolo }} — {{ fppSelecionadaObj.titulo_projeto }}</h6>
                    <small class="text-muted">Valor Total: {{ utils.formatMoeda(fppSelecionadaObj.valor_total_fpp) }}</small>
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-danger" @click="form.info.id_fpp=''">Trocar FPP</button>
                </div>

                <div v-else>
                  <label class="small fw-bold mb-2">Selecione uma proposta FPP protocolada anteriormente:</label>
                  <div v-if="loadingFpps" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></div>
                  <div v-else-if="!fppsExistentes.length" class="text-center py-4 text-muted small border rounded bg-light">
                    Nenhuma proposta FPP cadastrada. Alterne para a opção "Preencher FPP Oficial Completo" acima.
                  </div>
                  <table v-else class="table table-hover table-sm align-middle small border rounded mb-0">
                    <thead class="table-light">
                      <tr><th style="width: 40px;"></th><th>Protocolo</th><th>Projeto / Eixo</th><th class="text-end">Valor Total</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for="f in fppsExistentes" :key="f.id_fpp" class="cursor-pointer" @click="form.info.id_fpp = f.id_fpp">
                        <td class="text-center"><input type="radio" :value="f.id_fpp" v-model="form.info.id_fpp"></td>
                        <td class="font-monospace fw-bold text-primary">{{ f.numero_protocolo }}</td>
                        <td><strong>{{ f.titulo_projeto }}</strong><br><small class="text-muted">{{ f.fundo_especifico }}</small></td>
                        <td class="text-end fw-bold text-success">{{ utils.formatMoeda(f.valor_total_fpp) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- SE FOR RECURSO DO TESOURO -->
            <div v-else class="text-center py-5 text-muted border rounded bg-light">
              <i class="bi bi-check2-circle fs-2 text-success d-block mb-2"></i>
              Projeto financiado pelo Tesouro Estadual. Não requer formalização de FPP. Avance para revisar e salvar.
            </div>
          </div>

          <!-- ETAPA 8: REVISÃO & ENVIO -->
          <div v-if="step === 8">
            <h6 class="fw-bold mb-2">Anexos (serão enviados para o Google Drive ao confirmar)</h6>
            <div class="input-group mb-3">
              <input type="file" id="inputAnexoProposta" @change="handleFileSelect" class="form-control">
              <input v-model="temp.anexo.desc" class="form-control" placeholder="Descrição do arquivo">
              <button type="button" class="btn btn-primary" @click="adicionarAnexoPendente">Adicionar</button>
            </div>
            <ul class="list-group mb-4" v-if="anexosPendentes.length">
              <li v-for="(a, i) in anexosPendentes" :key="i" class="list-group-item d-flex justify-content-between align-items-center">
                <span><i class="bi bi-paperclip me-2"></i>{{ a.file_desc }} <small class="text-muted">({{ a.file_name }})</small></span>
                <button type="button" class="btn btn-sm btn-outline-danger" @click="anexosPendentes.splice(i,1)">Remover</button>
              </li>
            </ul>

            <div class="card bg-light border-primary p-3">
              <h5 class="fw-bold text-primary">{{ form.info.nome }}</h5>
              <div class="small text-muted mb-2">
                <strong>Setor Responsável:</strong> {{ setorRespObj ? formatSetor(setorRespObj) : 'Não definido' }} •
                <strong>Ano:</strong> {{ form.info.ano }} •
                <strong>Fonte de Recursos:</strong> {{ form.fundo_tipo_escolha }} •
                <strong>Metas:</strong> {{ form.metas.length }} •
                <strong>Total Estimado:</strong> <span class="text-success fw-bold">{{ utils.formatMoeda(resumoFinanceiro.total) }}</span>
              </div>
              <div v-if="form.fundo_tipo_escolha === 'Fundo a Fundo'" class="alert alert-primary py-2 px-3 small mb-2">
                <i class="bi bi-file-earmark-ruled me-1"></i>
                <span v-if="form.fpp_modo === 'EXISTENTE' && fppSelecionadaObj">FPP Vinculada: <strong>{{ fppSelecionadaObj.numero_protocolo }}</strong></span>
                <span v-else>Formulário Oficial FPP preenchido e pronto para ser protocolado na Portaria SSP 1998/2025.</span>
              </div>
              <div v-if="form.setores_colaboradores.length" class="small mb-3">
                <strong>Setores Colaboradores:</strong>
                <span v-for="sc in form.setores_colaboradores" :key="sc.id_setor" class="badge bg-secondary me-1">
                  {{ sc.sigla || sc.nome_setor }}
                </span>
              </div>
              <button type="button" class="btn btn-success btn-lg fw-bold w-100 mt-2" @click="enviarProposta">
                <i class="bi bi-send-check me-2"></i> ENVIAR PROPOSTA PARA A AEPLAN
              </button>
            </div>
          </div>
        </div>

        <div class="card-footer bg-white d-flex justify-content-between py-3">
          <button type="button" class="btn btn-secondary px-4" @click="nav(-1)" :disabled="step === 1">Voltar</button>
          <button type="button" class="btn btn-primary px-4" @click="nav(1)" v-if="step < 8">Próximo</button>
        </div>
      </div>

      <!-- MODAL ETAPAS -->
      <div class="modal fade" id="modalEtapasForm" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content" v-if="modalMetaIndex !== null && form.metas[modalMetaIndex]">
            <div class="modal-header bg-light">
              <h5 class="modal-title fw-bold">Etapas • {{ form.metas[modalMetaIndex].codigo_meta }}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="row g-2 mb-3">
                <div class="col-7"><input v-model="temp.etapa.descricao" class="form-control form-control-sm" placeholder="Descrição da etapa"></div>
                <div class="col-3"><input v-model="temp.etapa.data_prazo" type="date" class="form-control form-control-sm"></div>
                <div class="col-2"><button type="button" class="btn btn-success btn-sm w-100" @click="addEtapa">+</button></div>
              </div>
              <ul class="list-group">
                <li v-for="(e, i) in form.metas[modalMetaIndex].etapas" :key="i" class="list-group-item d-flex justify-content-between align-items-center small">
                  <span><strong>{{ e.codigo_etapa }}</strong> - {{ e.descricao }} <span v-if="e.data_prazo" class="badge bg-secondary ms-1">{{ utils.formatDate(e.data_prazo) }}</span></span>
                  <i class="bi bi-trash text-danger cursor-pointer" @click="removeEtapa(i)"></i>
                </li>
              </ul>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Concluir</button></div>
          </div>
        </div>
      </div>
    </div>
  `
};