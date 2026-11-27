window.MiraComponents = window.MiraComponents || {};

window.MiraComponents.Sidebar = {
  props: ['currentView', 'userPerfil'],
  emits: ['navigate'],
  setup() {
    const expandedModule = Vue.ref('projetos');
    const mobileMenu = Vue.inject('mobileMenu');

    const toggleModule = (mod) => {
      expandedModule.value = expandedModule.value === mod ? null : mod;
    };

    return { expandedModule, toggleModule, mobileMenu };
  },
  template: `
    <div class="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark h-100 shadow">
      <div class="d-flex justify-content-between align-items-start">
        <a href="#" @click.prevent="$emit('navigate', 'view-home')"
           class="d-flex flex-column align-items-center mb-2 text-white text-decoration-none border-bottom border-secondary w-100 pb-2">
          <img src="https://drive.google.com/thumbnail?id=1pjxkX8GXRBWd4D-vS45bMzUito7pRAI-&sz=w500"
               alt="Logo MIRA" style="width: 100%; max-height: 75px; object-fit: contain;">
        </a>
        <button class="btn btn-link text-white d-md-none position-absolute top-0 end-0 m-2" @click="mobileMenu.close()">
          <i class="bi bi-x-lg fs-4"></i>
        </button>
      </div>

      <ul class="list-unstyled ps-0 mb-auto" style="overflow-y: auto;">
        <li class="mb-1">
          <a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2"
             :class="{ 'bg-secondary bg-opacity-25': currentView === 'view-home' }"
             @click.prevent="$emit('navigate', 'view-home')">
            <i class="bi bi-house-door me-2 text-warning"></i> Início
          </a>
        </li>

        <li class="mb-1" v-if="userPerfil === 'ADMIN'">
          <a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2"
             :class="{ 'bg-secondary bg-opacity-25': currentView === 'view-resumo' }"
             @click.prevent="$emit('navigate', 'view-resumo')">
            <i class="bi bi-grid-1x2-fill me-2 text-warning"></i> DashResumo
          </a>
        </li>

        <!-- INICIATIVAS (PROPOSTAS & PROJETOS) -->
        <li class="mb-1">
          <button class="btn btn-toggle d-flex align-items-center rounded border-0 text-white w-100 justify-content-between p-2"
                  :class="{ 'bg-secondary bg-opacity-25': expandedModule === 'projetos' }"
                  @click="toggleModule('projetos')">
            <span><i class="bi bi-folder2-open me-2 text-primary"></i> Iniciativas</span>
            <i class="bi bi-chevron-down small transition-icon" :class="{ 'rotate-180': expandedModule === 'projetos' }"></i>
          </button>
          <div class="collapse" :class="{ 'show': expandedModule === 'projetos' }">
            <ul class="btn-toggle-nav list-unstyled fw-normal pb-1 small bg-dark bg-opacity-50 rounded-bottom">
              <li><a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2 ps-4"
                     :class="{ 'active-link': currentView === 'view-proposta' }"
                     @click.prevent="$emit('navigate', 'view-proposta')"><i class="bi bi-plus-circle me-2"></i> Nova Proposta</a></li>
              <li v-if="userPerfil === 'ADMIN'"><a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2 ps-4"
                     :class="{ 'active-link': currentView === 'view-avaliacao' }"
                     @click.prevent="$emit('navigate', 'view-avaliacao')"><i class="bi bi-check2-circle me-2"></i> Avaliar</a></li>
              <li><a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2 ps-4"
                     :class="{ 'active-link': currentView === 'view-gerencia' }"
                     @click.prevent="$emit('navigate', 'view-gerencia')"><i class="bi bi-kanban me-2"></i> Gerenciar</a></li>
              <li v-if="userPerfil === 'ADMIN'"><a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2 ps-4"
                     :class="{ 'active-link': currentView === 'view-monitor' }"
                     @click.prevent="$emit('navigate', 'view-monitor')"><i class="bi bi-speedometer2 me-2"></i> Monitorar</a></li>
            </ul>
          </div>
        </li>

        <!-- NOVO: FPP & PORTFÓLIO -->
        <li class="mb-1">
          <button class="btn btn-toggle d-flex align-items-center rounded border-0 text-white w-100 justify-content-between p-2"
                  :class="{ 'bg-secondary bg-opacity-25': expandedModule === 'ssp' }"
                  @click="toggleModule('ssp')">
            <span><i class="bi bi-bank me-2 text-info"></i> SSP &amp; Compras</span>
            <i class="bi bi-chevron-down small transition-icon" :class="{ 'rotate-180': expandedModule === 'ssp' }"></i>
          </button>
          <div class="collapse" :class="{ 'show': expandedModule === 'ssp' }">
            <ul class="btn-toggle-nav list-unstyled fw-normal pb-1 small bg-dark bg-opacity-50 rounded-bottom">
              <li><a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2 ps-4"
                     :class="{ 'active-link': currentView === 'view-fpp' }"
                     @click.prevent="$emit('navigate', 'view-fpp')"><i class="bi bi-file-earmark-ruled me-2"></i> Propostas FPP</a></li>
              <li><a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2 ps-4"
                     :class="{ 'active-link': currentView === 'view-portfolio' }"
                     @click.prevent="$emit('navigate', 'view-portfolio')"><i class="bi bi-cart3 me-2"></i> Portfólio Compras</a></li>
            </ul>
          </div>
        </li>

        <!-- PROGRAMAS -->
        <li class="mb-1">
          <button class="btn btn-toggle d-flex align-items-center rounded border-0 text-white w-100 justify-content-between p-2"
                  :class="{ 'bg-secondary bg-opacity-25': expandedModule === 'programas' }"
                  @click="toggleModule('programas')">
            <span><i class="bi bi-diagram-3 me-2 text-success"></i> Programas</span>
            <i class="bi bi-chevron-down small transition-icon" :class="{ 'rotate-180': expandedModule === 'programas' }"></i>
          </button>
          <div class="collapse" :class="{ 'show': expandedModule === 'programas' }">
            <ul class="btn-toggle-nav list-unstyled fw-normal pb-1 small bg-dark bg-opacity-50 rounded-bottom">
              <li><a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2 ps-4"
                     :class="{ 'active-link': currentView === 'view-programas' }"
                     @click.prevent="$emit('navigate', 'view-programas')"><i class="bi bi-kanban me-2"></i> Painel Programas</a></li>
            </ul>
          </div>
        </li>

        <!-- ADMINISTRAÇÃO -->
        <li class="mb-1 mt-3 pt-3 border-top border-secondary" v-if="userPerfil === 'ADMIN'">
          <a href="#" class="link-light d-flex align-items-center text-decoration-none rounded p-2"
             :class="{ 'bg-secondary bg-opacity-25': currentView === 'view-admin' }"
             @click.prevent="$emit('navigate', 'view-admin')">
            <i class="bi bi-gear me-2 text-warning"></i> Administração &amp; Mestres
          </a>
        </li>
      </ul>

      <div class="pt-3 mt-3 text-center small text-white-50 border-top border-secondary">
        &copy; 2026 PMSE - MIRA 2.0
      </div>
    </div>
  `
};