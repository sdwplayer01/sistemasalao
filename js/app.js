// ═══════════════════════════════════════════════════════
// app.js — Roteador principal + controle de autenticação
// v2.3: Sidebar retrátil + boot resiliente com timeout
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
import { Config, loadFromSupabase, clearLocalData, exportarDados, importarDados } from './storage.js'
import { supabase, getSession, logout } from './supabase.js'
import { closeModal, toast, initIcons } from './utils.js'
import { MESES } from './storage.js'

const PAGES = {
  dashboard:    { render: renderDashboard,    title: 'Dashboard' },
  agenda:       { render: renderAgenda,       title: 'Agenda de Horários' },
  diario:       { render: renderDiario,       title: 'Diário / Caixa' },
  servicos:     { render: renderServicos,     title: 'Serviços & Produtos' },
  custos:       { render: renderCustos,       title: 'Custos Fixos' },
  receitas:     { render: renderReceitas,     title: 'Receitas Internas' },
  controle:     { render: renderControle,     title: 'Controle Anual' },
  clientes:     { render: renderClientes,     title: 'CRM de Clientes' },
  configuracoes:{ render: renderConfiguracoes, title: 'Configurações' },
}

let _paginaAtual = 'dashboard'

// ── Navegação ──────────────────────────────────────────
function navigateTo(page) {
  if (!PAGES[page]) return
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  const pageEl = document.getElementById(`page-${page}`)
  const navEl  = document.querySelector(`[data-page="${page}"]`)
  if (pageEl) {
    pageEl.classList.add('active')
    pageEl.innerHTML = '<div style="text-align:center;padding:60px;color:var(--txt-muted)">Carregando...</div>'
    PAGES[page].render(pageEl)
    // Garante que ícones Lucide injetados dinamicamente sejam renderizados
    initIcons()
  }
  if (navEl) navEl.classList.add('active')
  const titleEl = document.getElementById('topBarTitle')
  if (titleEl) titleEl.textContent = PAGES[page].title
  _paginaAtual = page
  // Mobile: fecha sidebar ao navegar (NÃO remove collapsed)
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open')
}

// ── Mostrar / ocultar áreas ────────────────────────────
function showApp() {
  document.getElementById('page-login').style.display = 'none'
  document.getElementById('app-shell').style.display  = ''
}

function showLogin() {
  document.getElementById('app-shell').style.display  = 'none'
  document.getElementById('page-login').style.display = ''
}

// ── Init do app (pós-login) ────────────────────────────
async function initApp(user) {
  showApp()

  // Mostra "carregando dados..."
  document.getElementById('topBarTitle').textContent = 'Carregando dados...'

  // ═══ v2.3: Boot resiliente com timeout de 7s ═══════
  // Se o Supabase não responder em 7s, prossegue com dados locais (offline mode).
  // Usa AbortController para cancelar o fetch pendente quando possível.
  try {
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 7000)

    await Promise.race([
      loadFromSupabase(),
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new Error('Sync timeout — 7s'))
        )
      })
    ])

    clearTimeout(timeoutId)
  } catch (e) {
    console.warn('⚠ Falha no sync, usando modo offline:', e.message || e)
    toast('Sem conexão — usando dados locais', 'default', 4000)
  }
  // ═══ /boot resiliente ══════════════════════════════

  // Salva nome do salão vindo do cadastro (primeira vez via Google ou e-mail)
  const pendingName = localStorage.getItem('salao_pending_name')
  if (pendingName) {
    Config.save({ nomeSalao: pendingName })
    localStorage.removeItem('salao_pending_name')
  }

  const cfg = Config.get()

  // Nome do salão na sidebar
  const nomeSalaoEl = document.getElementById('sidebarNomeSalao')
  if (nomeSalaoEl) nomeSalaoEl.textContent = cfg.nomeSalao || 'Meu Salão'

  // E-mail do usuário logado
  const userEmailEl = document.getElementById('userEmail')
  if (userEmailEl) userEmailEl.textContent = user.email || ''

  // Badge de mês
  const badgeEl = document.getElementById('badgeMes')
  if (badgeEl) {
    const now = new Date()
    badgeEl.textContent = `${MESES[now.getMonth()]} ${now.getFullYear()}`
  }

  // Navegação
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigateTo(btn.dataset.page)
  })

  // ═══ v2.3: Menu — dual behavior (desktop: collapse, mobile: toggle) ═══
  const sidebar = document.getElementById('sidebar')

  // Restaura estado salvo
  if (localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed')
  }

  document.getElementById('btnMenu').onclick = () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open')          // mobile: abre/fecha
    } else {
      sidebar.classList.toggle('collapsed')    // desktop: colapsa/expande
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'))
    }
  }

  // Fecha sidebar mobile ao clicar fora
  document.addEventListener('click', e => {
    const btnMenu = document.getElementById('btnMenu')
    if (window.innerWidth <= 768 &&
        !sidebar.contains(e.target) &&
        !btnMenu.contains(e.target)) {
      sidebar.classList.remove('open')
    }
  })

  // Modal
  document.getElementById('modalClose').onclick = closeModal
  document.getElementById('modalOverlay').onclick = e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal()
  }

  // Export / Import
  document.getElementById('btnExport').onclick = () => { exportarDados(); toast('Dados exportados! ✓', 'success') }
  document.getElementById('btnImport').onclick = () => document.getElementById('fileImport').click()
  document.getElementById('fileImport').onchange = async e => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      importarDados(text)
      toast('Dados importados com sucesso! ✓', 'success')
      navigateTo(_paginaAtual)
    } catch { toast('Erro ao importar: arquivo inválido.', 'error') }
    e.target.value = ''
  }

  // Logout
  document.getElementById('btnLogout').onclick = async () => {
    if (!confirm('Sair do sistema?')) return
    await logout()
    clearLocalData()
    showLogin()
    renderLogin(onLoginSuccess)
    toast('Até logo! 👋', 'default')
  }

  // Renderiza ícones Lucide na sidebar
  initIcons()

  // Página inicial
  navigateTo('dashboard')
}

// ── Callback pós-login bem-sucedido ───────────────────
async function onLoginSuccess(user) {
  await initApp(user)
}

// ── Entry point ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Escuta mudanças de sessão (OAuth callback, link mágico, etc.)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await initApp(session.user)
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
    await initApp(session.user)
  } else {
    showLogin()
    renderLogin(onLoginSuccess)
  }
})
