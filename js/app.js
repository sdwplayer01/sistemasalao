// ═══════════════════════════════════════════════════════
// app.js — Roteador principal e inicialização
// ═══════════════════════════════════════════════════════
import { renderDashboard }    from './pages/dashboard.js';
import { renderAgenda }       from './pages/agenda.js';
import { renderDiario }       from './pages/diario.js';
import { renderServicos }     from './pages/servicos.js';
import { renderCustos }       from './pages/custos.js';
import { renderReceitas }     from './pages/receitas.js';
import { renderControle }     from './pages/controle.js';
import { renderConfiguracoes } from './pages/configuracoes.js';
import { Config, exportarDados, importarDados } from './storage.js';
import { closeModal, toast }  from './utils.js';
import { MESES } from './storage.js';

const PAGES = {
  dashboard:    { render: renderDashboard,    title: 'Dashboard' },
  agenda:       { render: renderAgenda,       title: 'Agenda de Horários' },
  diario:       { render: renderDiario,       title: 'Diário de Atendimentos' },
  servicos:     { render: renderServicos,     title: 'Tabela de Serviços' },
  custos:       { render: renderCustos,       title: 'Custos Fixos' },
  receitas:     { render: renderReceitas,     title: 'Receitas Internas' },
  controle:     { render: renderControle,     title: 'Controle Anual' },
  configuracoes:{ render: renderConfiguracoes, title: 'Configurações' },
};

let _paginaAtual = 'dashboard';

function navigateTo(page) {
  if (!PAGES[page]) return;

  // Desativa todas as páginas e nav items
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Ativa a página e nav item corretos
  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.querySelector(`[data-page="${page}"]`);

  if (pageEl) {
    pageEl.classList.add('active');
    pageEl.innerHTML = '<div style="text-align:center;padding:60px;color:var(--txt-muted)">Carregando...</div>';
    PAGES[page].render(pageEl);
  }

  if (navEl) navEl.classList.add('active');

  // Atualiza top bar
  const titleEl = document.getElementById('topBarTitle');
  if (titleEl) titleEl.textContent = PAGES[page].title;

  _paginaAtual = page;

  // Fecha sidebar no mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function init() {
  // ── Configuração inicial ───────────────────────────
  const cfg = Config.get();

  const nomeSalaoEl = document.getElementById('sidebarNomeSalao');
  if (nomeSalaoEl) nomeSalaoEl.textContent = cfg.nomeSalao || 'Salão Premium';

  // ── Badge de mês ───────────────────────────────────
  const badgeEl = document.getElementById('badgeMes');
  if (badgeEl) {
    const now = new Date();
    badgeEl.textContent = `${MESES[now.getMonth()]} ${now.getFullYear()}`;
  }

  // ── Navegação ──────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.page);
  });

  // ── Menu mobile ────────────────────────────────────
  document.getElementById('btnMenu').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
  };

  // Fechar sidebar ao clicar fora (mobile)
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const btnMenu = document.getElementById('btnMenu');
    if (window.innerWidth <= 768 &&
        !sidebar.contains(e.target) &&
        !btnMenu.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });

  // ── Modal ──────────────────────────────────────────
  document.getElementById('modalClose').onclick = closeModal;
  document.getElementById('modalOverlay').onclick = e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  };

  // ── Export / Import ────────────────────────────────
  document.getElementById('btnExport').onclick = () => {
    exportarDados();
    toast('Dados exportados! ✓', 'success');
  };

  document.getElementById('btnImport').onclick = () => {
    document.getElementById('fileImport').click();
  };

  document.getElementById('fileImport').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      importarDados(text);
      toast('Dados importados com sucesso! ✓', 'success');
      navigateTo(_paginaAtual); // Recarrega página atual
    } catch (err) {
      toast('Erro ao importar: arquivo inválido.', 'error');
    }
    e.target.value = '';
  };

  // ── Rota inicial ───────────────────────────────────
  navigateTo('dashboard');
}

// Aguarda DOM
document.addEventListener('DOMContentLoaded', init);
