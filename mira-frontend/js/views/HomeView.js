window.MiraViews = window.MiraViews || {};

window.MiraViews.HomeView = {
  setup() {
    const api = Vue.inject('api');
    const user = Vue.inject('user');
    const utils = window.MiraUtils;

    const loading = Vue.ref(false);
    const stats = Vue.ref({
      projetos: { ativos: 0, pendentes: 0, atrasados: 0, vencendo: 0, metas_concluidas: 0, metas_total: 0, percentual_metas: 0 },
      programas: { total: 0 },
      usuarios: { total: 0 },
      alertas: []
    });

    const carregar = async () => {
      loading.value = true;
      try {
        const res = await api('getDashboardStats', { matricula: user.matricula });
        if (res.success && res.stats) {
          stats.value = res.stats;
        }
      } catch (e) {
        console.error('Erro ao carregar dashboard:', e);
      } finally {
        loading.value = false;
      }
    };

    Vue.onMounted(carregar);

    return { loading, stats, user, utils, carregar };
  },
  template: `
    <div class="container-fluid py-2">
      <div class="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 class="fw-bold text-dark mb-1">Olá, {{ user.nome }}!</h3>
          <p class="text-muted mb-0">
            {{ user.perfil === 'ADMIN' ? 'Painel de Monitoramento Geral (Admin)' : 'Painel de Gerenciamento' }}
          </p>
        </div>
        <button class="btn btn-light border btn-sm" @click="carregar" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1"></i> Atualizar
        </button>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>

      <div v-else>
        <div class="row g-4 mb-4">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100 border-start border-4 border-primary">
              <div class="card-body">
                <div class="text-muted small fw-bold text-uppercase">Em Gestão</div>
                <div class="fs-2 fw-bold text-dark">{{ stats.projetos.ativos + stats.programas.total }}</div>
                <div class="mt-2 small text-muted">
                  <div>Projetos Ativos: <strong class="text-primary">{{ stats.projetos.ativos }}</strong></div>
                  <div>Programas: <strong class="text-info">{{ stats.programas.total }}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100 border-start border-4 border-success">
              <div class="card-body">
                <div class="text-muted small fw-bold text-uppercase">Metas Concluídas</div>
                <div class="fs-2 fw-bold text-success">{{ stats.projetos.metas_concluidas }}</div>
                <div class="mt-2 small text-muted">
                  <div>Total de Metas: <strong>{{ stats.projetos.metas_total }}</strong></div>
                  <div>Conclusão: <strong class="text-success">{{ stats.projetos.percentual_metas }}%</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100 border-start border-4"
                 :class="stats.alertas.length > 0 ? 'border-danger' : 'border-success'">
              <div class="card-body">
                <div class="text-muted small fw-bold text-uppercase">Alertas de Prazo</div>
                <div class="fs-2 fw-bold" :class="stats.alertas.length > 0 ? 'text-danger' : 'text-success'">
                  {{ stats.alertas.length }}
                </div>
                <div class="mt-2 small text-muted">
                  <div>Atrasados: <strong class="text-danger">{{ stats.projetos.atrasados }}</strong></div>
                  <div>Venc. em 5 dias: <strong class="text-warning-emphasis">{{ stats.projetos.vencendo }}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100 border-start border-4 border-warning">
              <div class="card-body">
                <div class="text-muted small fw-bold text-uppercase">Propostas em Análise</div>
                <div class="fs-2 fw-bold text-warning-emphasis">{{ stats.projetos.pendentes }}</div>
                <div class="mt-2 small text-muted">
                  {{ user.perfil === 'ADMIN' ? 'Aguardando Avaliação' : 'Aguardando Aprovação' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0">
          <div class="card-header bg-white py-3 d-flex align-items-center">
            <h5 class="m-0 fw-bold text-dark"><i class="bi bi-bell me-2 text-warning"></i>Próximos Prazos e Atrasos</h5>
            <span class="badge bg-danger ms-2" v-if="stats.alertas.length">{{ stats.alertas.length }}</span>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th class="ps-4">Item</th>
                    <th>Meta / Etapa</th>
                    <th>Progresso</th>
                    <th class="text-center">Prazo</th>
                    <th class="text-center">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(alerta, i) in stats.alertas" :key="i">
                    <td class="ps-4">
                      <div class="fw-bold text-dark">{{ alerta.nome_item }}</div>
                      <span class="badge bg-light text-secondary border">{{ alerta.tipo_pai }}</span>
                    </td>
                    <td>
                      <div class="small text-muted">{{ alerta.meta_descricao }}</div>
                      <div class="fw-bold text-secondary">{{ alerta.etapa_descricao }}</div>
                    </td>
                    <td>
                      <span class="badge" :class="alerta.progresso_meta >= 100 ? 'bg-success' : 'bg-secondary'">
                        {{ alerta.progresso_meta }}%
                      </span>
                    </td>
                    <td class="text-center fw-bold">{{ utils.formatDate(alerta.data_prazo) }}</td>
                    <td class="text-center">
                      <span v-if="alerta.status_alerta === 'ATRASADO'" class="badge bg-danger">
                        Atrasado ({{ Math.abs(alerta.dias_restantes) }} dias)
                      </span>
                      <span v-else class="badge bg-warning text-dark">
                        Vence em {{ alerta.dias_restantes }} dias
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!stats.alertas.length">
                    <td colspan="5" class="text-center py-5 text-muted">
                      <i class="bi bi-check-circle fs-1 d-block mb-2 text-success opacity-50"></i>
                      Tudo em dia! Nenhuma etapa atrasada ou vencendo nos próximos 5 dias.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};