// ═══════════════════════════════════════════════════════
// app.js — Roteador + autenticação + boot instantâneo
// v3.1: Máscaras automáticas + Ícones Otimizados
// ═══════════════════════════════════════════════════════
import { renderDashboard } from './pages/dashboard.js'
import { renderAgenda } from './pages/agenda.js'
import { renderDiario } from './pages/diario.js'
import { renderServicos } from './pages/servicos.js'
import { renderCustos } from './pages/custos.js'
import { renderReceitas } from './pages/receitas.js'
import { renderControle } from './pages/controle.js'
import { renderConfiguracoes } from './pages/configuracoes.js'
import { renderClientes } from './pages/clientes.js'
import { renderLogin } from './pages/login.js'
import { Config, loadFromSupabase, clearLocalData, MESES } from './storage.js'
import { supabase, getSession, logout } from './supabase.js'
import { closeModal, openModal, toast, initIcons, applyMoneyMask, applyPhoneMask } from './utils.js'

// Expõe utils para o dashboard (onboarding modal)
window.__utils = { openModal, closeModal }

const PAGES = {
  dashboard: { render: renderDashboard, title: 'Dashboard' },
  agenda: { render: renderAgenda, title: 'Agenda de Horários' },
  diario: { render: renderDiario, title: 'Diário / Caixa' },
  servicos: { render: renderServicos, title: 'Serviços & Produtos' },
  custos: { render: renderCustos, title: 'Custos Fixos' },
  receitas: { render: renderReceitas, title: 'Receitas do Espaço' },
  controle: { render: renderControle, title: 'Controle Anual' },
  clientes: { render: renderClientes, title: 'Clientes' },
  configuracoes: { render: renderConfiguracoes, title: 'Configurações' },
}

let _paginaAtual = 'dashboard'

// ── Tema ───────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('salao_theme', theme)
}

function loadTheme() {
  const saved = localStorage.getItem('salao_theme') || 'light'
  applyTheme(saved)
  return saved
}

loadTheme()

// ── Navegação ──────────────────────────────────────────
export function navigateTo(page) {
  if (!PAGES[page]) { page = 'dashboard' }

  const performNav = () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))

    const pageEl = document.getElementById(`page-${page}`)
    const navEl = document.querySelector(`[data-page="${page}"]`)

    if (pageEl) {
      pageEl.classList.add('active')
      // Loader minimalista
      pageEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px;gap:15px;color:var(--plum-medium);opacity:0.6">
          <i data-lucide="loader-2" style="width:24px;height:24px;animation:spin .8s linear infinite"></i>
          <span style="font-size:13px;letter-spacing:1px">CARREGANDO</span>
        </div>`

      // Renderiza o conteúdo da página
      PAGES[page].render(pageEl)

      // Inicializa utilitários na nova página
      initIcons()
      applyMoneyMask(pageEl)
      applyPhoneMask(pageEl)
    }

    if (navEl) navEl.classList.add('active')

    _paginaAtual = page
    localStorage.setItem('salao_last_page', page)

    if (window.innerWidth <= 768) {
      const sb = document.getElementById('sidebar');
      if (sb) sb.classList.remove('open');
    }
  }

  if (document.startViewTransition) {
    document.startViewTransition(() => performNav())
  } else {
    performNav()
  }
}

// ── Visibilidade ───────────────────────────────────────
function showApp() { document.getElementById('page-login').style.display = 'none'; document.getElementById('app-shell').style.display = 'flex' }
function showLogin() { document.getElementById('app-shell').style.display = 'none'; document.getElementById('page-login').style.display = '' }

// ── Init do App ────────────────────────────────────────
function initApp(user) {
  const cfg = Config.get()

  // Atualiza Nome do Salão e Email
  const topBarNomeSalaoElement = document.getElementById('topBarNomeSalao');
  if (topBarNomeSalaoElement) topBarNomeSalaoElement.textContent = cfg.nomeSalao || 'Salão Premium';

  const userEmailEl = document.getElementById('userEmail')
  if (userEmailEl) userEmailEl.textContent = user.email || ''

  const badgeEl = document.getElementById('badgeMes')
  if (badgeEl) {
    const now = new Date()
    badgeEl.textContent = `${MESES[now.getMonth()]} ${now.getFullYear()}`
  }

  // Restaura última página ou vai para dashboard
  const _ultimaPagina = localStorage.getItem('salao_last_page') || 'dashboard'
  navigateTo(PAGES[_ultimaPagina] ? _ultimaPagina : 'dashboard')

  _syncBackground()

  // Eventos de Navegação
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.page)
  })

  // Sidebar e Menu
  const sidebar = document.getElementById('sidebar')
  if (window.innerWidth > 768 && localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed')
  }

  const btnMenu = document.getElementById('btnMenu')
  if (btnMenu) {
    btnMenu.onclick = () => {
      if (window.innerWidth > 768) {
        sidebar.classList.toggle('collapsed')
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'))
      } else {
        sidebar.classList.toggle('open')
      }
    }
  }

  const btnMenuMobile = document.getElementById('btnMenuMobile')
  if (btnMenuMobile) {
    btnMenuMobile.onclick = () => sidebar.classList.toggle('open')
  }

  // Modal
  document.getElementById('modalClose').onclick = closeModal
  document.getElementById('modalOverlay').onclick = e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal()
  }

  // Logout
  document.getElementById('btnLogout').onclick = async () => {
    if (!confirm('Sair do sistema?')) return
    await logout()
    clearLocalData()
    showLogin()
    renderLogin(onLoginSuccess)
    toast('Até logo!', 'default')
  }

  initIcons()
  showApp()
}

// ── Sync Background ────────────────────────────────────
async function _syncBackground() {
  try {
    await loadFromSupabase()
    if (_paginaAtual === 'dashboard') {
      const pageEl = document.getElementById('page-dashboard')
      if (pageEl) {
        renderDashboard(pageEl)
        initIcons()
        applyMoneyMask(pageEl)
      }
    }
  } catch (e) {
    console.warn('Sync background falhou:', e?.message || e)
  }
}

function onLoginSuccess(user) {
  initApp(user)
}

// ── Entry Point ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Estilo do loader
  if (!document.getElementById('spinStyle')) {
    const style = document.createElement('style')
    style.id = 'spinStyle'
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
    document.head.appendChild(style)
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      initApp(session.user)
    }
    if (event === 'SIGNED_OUT') {
      clearLocalData()
      showLogin()
      renderLogin(onLoginSuccess)
    }
  })

  const session = await getSession()
  if (session?.user) {
    initApp(session.user)
  } else {
    showLogin()
    renderLogin(onLoginSuccess)
  }
});

// Mensagens rotativas (Premium)
; (function () {
  const container = document.getElementById('rotatingMsgBar');
  if (!container) return;
  const messages = container.querySelectorAll('.rotating-msg-text');
  let index = 0;
  if (!messages.length) return;

  setInterval(() => {
    messages[index].classList.remove('is-active');
    index = (index + 1) % messages.length;
    messages[index].classList.add('is-active');
  }, 6000);
})();

// API Pública
window.__navigateTo = navigateTo
window.__applyTheme = applyTheme
window.__getTheme = () => localStorage.getItem('salao_theme') || 'light'