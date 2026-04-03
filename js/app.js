// ═══════════════════════════════════════════════════════
// app.js — Roteador + autenticação + boot instantâneo
// v3.0: Offline-first / tema claro-escuro / sync silencioso
// ═══════════════════════════════════════════════════════
import { renderDashboard }     from './pages/dashboard.js'
import { renderAgenda }        from './pages/agenda.js'
import { renderDiario }        from './pages/diario.js'
import { renderServicos }      from './pages/servicos.js'
import { renderCustos }        from './pages/custos.js'
import { renderReceitas }      from './pages/receitas.js'
import { renderControle }      from './pages/controle.js'
import { renderConfiguracoes } from './pages/configuracoes.js'
import { renderClientes }      from './pages/clientes.js'
import { renderLogin }         from './pages/login.js'
import { Config, loadFromSupabase, clearLocalData } from './storage.js'
import { supabase, getSession, logout } from './supabase.js'
import { closeModal, openModal, toast, initIcons } from './utils.js'
import { MESES } from './storage.js'

// Expõe utils para o dashboard (onboarding modal)
window.__utils = { openModal, closeModal }

const PAGES = {
  dashboard:    { render: renderDashboard,    title: 'Dashboard' },
  agenda:       { render: renderAgenda,       title: 'Agenda de Horários' },
  diario:       { render: renderDiario,       title: 'Diário / Caixa' },
  servicos:     { render: renderServicos,     title: 'Serviços & Produtos' },
  custos:       { render: renderCustos,       title: 'Custos Fixos' },
  receitas:     { render: renderReceitas,     title: 'Receitas do Espaço' },
  controle:     { render: renderControle,     title: 'Controle Anual' },
  clientes:     { render: renderClientes,     title: 'CRM de Clientes' },
  configuracoes:{ render: renderConfiguracoes, title: 'Configurações' },
}

let _paginaAtual = 'dashboard'

// ── Tema ───────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('salao_theme', theme)
}

function loadTheme() {
  // Aplica imediatamente na abertura — antes do DOMContentLoaded
  const saved = localStorage.getItem('salao_theme') || 'light'
  applyTheme(saved)
  return saved
}

// Roda antes do DOMContentLoaded para evitar flash de tema errado
loadTheme()

// ── Navegação ──────────────────────────────────────────
export function navigateTo(page) {
  if (!PAGES[page]) { page = 'dashboard' }

  const performNav = () => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))

    const pageEl = document.getElementById(`page-${page}`)
    const navEl  = document.querySelector(`[data-page="${page}"]`)

    if (pageEl) {
      pageEl.classList.add('active')
      // Placeholder leve em vez de texto
      pageEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:10px;color:var(--txt-muted)">
        <i data-lucide="loader-2" style="width:18px;height:18px;animation:spin .8s linear infinite"></i>
        Carregando...
      </div>`
      PAGES[page].render(pageEl)
      initIcons()
    }

    if (navEl) navEl.classList.add('active')

    const titleEl = document.getElementById('topBarTitle')
    if (titleEl) titleEl.textContent = PAGES[page].title

    _paginaAtual = page
    // Item 2: persiste a última página visitada
    localStorage.setItem('salao_last_page', page)

    // Mobile: fecha sidebar
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

// ── show/hide ──────────────────────────────────────────
function showApp()   { document.getElementById('page-login').style.display = 'none';  document.getElementById('app-shell').style.display = 'flex' }
function showLogin() { document.getElementById('app-shell').style.display  = 'none'; document.getElementById('page-login').style.display = '' }

// ── Init do app (pós-login) — INSTANT BOOT ────────────
function initApp(user) {
  showApp()

  // 1. Aplica nome do salão do cache imediatamente
  const pendingName = localStorage.getItem('salao_pending_name')
  if (pendingName) {
    Config.save({ nomeSalao: pendingName })
    localStorage.removeItem('salao_pending_name')
  }

  const cfg = Config.get()

  const nomeSalaoEl = document.getElementById('sidebarNomeSalao')
  if (nomeSalaoEl) nomeSalaoEl.textContent = cfg.nomeSalao || 'Meu Salão'

  const userEmailEl = document.getElementById('userEmail')
  if (userEmailEl) userEmailEl.textContent = user.email || ''

  const badgeEl = document.getElementById('badgeMes')
  if (badgeEl) {
    const now = new Date()
    badgeEl.textContent = `${MESES[now.getMonth()]} ${now.getFullYear()}`
  }

  // 2. Restaura última página visitada (Item 2 — persistência)
  const _ultimaPagina = localStorage.getItem('salao_last_page') || 'dashboard'
  navigateTo(PAGES[_ultimaPagina] ? _ultimaPagina : 'dashboard')

  // 3. Sync com Supabase em background — NÃO bloqueia a tela
  _syncBackground()

  // ── Navegação ──────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.page)
  })

  // ── Sidebar: collapse (desktop) e open (mobile) ────
  const sidebar = document.getElementById('sidebar')

  // Item 1: collapsed só funciona no desktop
  if (window.innerWidth > 768 && localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed')
  }

  const btnMenu = document.getElementById('btnMenu')
  if (btnMenu) {
    btnMenu.onclick = () => {
      // Item 1: collapsed só no desktop; mobile usa open/close
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

  // Fecha sidebar mobile ao clicar fora
  document.addEventListener('click', e => {
    if (window.innerWidth <= 768 &&
        !sidebar.contains(e.target) &&
        btnMenuMobile && !btnMenuMobile.contains(e.target)) {
      sidebar.classList.remove('open')
    }
  })

  // ── Modal ──────────────────────────────────────────
  document.getElementById('modalClose').onclick = closeModal
  document.getElementById('modalOverlay').onclick = e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal()
  }



  // ── Logout ─────────────────────────────────────────
  document.getElementById('btnLogout').onclick = async () => {
    if (!confirm('Sair do sistema?')) return
    await logout()
    clearLocalData()
    showLogin()
    renderLogin(onLoginSuccess)
    toast('Ate logo!', 'default')
  }

  initIcons()
}

// ── Sync background (não bloqueia UI) ─────────────────
async function _syncBackground() {
  try {
    await loadFromSupabase()
    // Após sync silencioso, recarrega a página atual apenas se for o dashboard
    // (dados operacionais do dia podem ter mudado em outro dispositivo)
    if (_paginaAtual === 'dashboard') {
      const pageEl = document.getElementById('page-dashboard')
      if (pageEl) {
        renderDashboard(pageEl)
        initIcons()
      }
    }
  } catch (e) {
    // Falha silenciosa — usuário já está usando com dados locais
    console.warn('Sync background falhou:', e?.message || e)
  }
}

// ── Callback pós-login ─────────────────────────────────
function onLoginSuccess(user) {
  initApp(user) // NÃO usa await — boot instantâneo
}

// ── Entry point ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  // Adiciona classe de animação de spin para ícone de carregamento
  if (!document.getElementById('spinStyle')) {
    const style = document.createElement('style')
    style.id = 'spinStyle'
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
    document.head.appendChild(style)
  }

  // Escuta mudanças de sessão
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      initApp(session.user)
    }
    if (event === 'SIGNED_OUT') {
      clearLocalData()
      showLogin()
      renderLogin(onLoginSuccess)
    }
    if (event === 'PASSWORD_RECOVERY') {
      const nova = prompt('Digite sua nova senha (mínimo 6 caracteres):')
      if (nova && nova.length >= 6) {
        const { error } = await supabase.auth.updateUser({ password: nova })
        if (!error) toast('Senha atualizada com sucesso! ✓', 'success')
      }
    }
  })

  // Verifica sessão existente
  const session = await getSession()
  if (session?.user) {
    initApp(session.user)
  } else {
    showLogin()
    renderLogin(onLoginSuccess)
  }
})

// ── API pública para páginas que precisam navegar ─────
window.__navigateTo = navigateTo
window.__applyTheme = applyTheme
window.__getTheme   = () => localStorage.getItem('salao_theme') || 'light'
