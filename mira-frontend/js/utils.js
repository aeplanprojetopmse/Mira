window.MiraUtils = {
  formatMoeda(valor) {
    const num = Number(valor) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  formatDate(dataString) {
    if (!dataString) return '-';
    try {
      const d = new Date(dataString);
      if (isNaN(d.getTime())) return '-';
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  },

  formatDateTime(dataString) {
    if (!dataString) return '-';
    try {
      const d = new Date(dataString);
      return isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
    } catch {
      return '-';
    }
  },

  isAtrasada(etapa) {
    if (!etapa || !etapa.data_prazo) return false;
    const st = String(etapa.status || '').trim();
    if (['Concluída', 'Concluida', 'Pausada'].includes(st)) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const prazo = new Date(etapa.data_prazo);
    prazo.setMinutes(prazo.getMinutes() + prazo.getTimezoneOffset());
    return prazo < hoje;
  },

  getRowClass(etapa) {
    if (this.isAtrasada(etapa)) return 'table-danger text-danger fw-bold';
    if (etapa.status === 'Concluída') return 'table-success text-success';
    if (etapa.status === 'Em Andamento') return 'table-primary text-primary';
    if (etapa.status === 'Pausada') return 'table-warning text-dark';
    return '';
  },

  calcularEfetividadeMeta(meta) {
    const alvo = Number(meta.qtd_alvo || 0);
    if (!alvo) return 0;
    const exec = Number(meta.qtd_executada || 0);
    return Math.min(Math.round((exec / alvo) * 100), 100);
  }
};