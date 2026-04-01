// ═══════════════════════════════════════════════════════
// js/supabase.js — Cliente Supabase + helpers de auth
// v2.2: + data_types 'produtos' e 'clientes'
// ═══════════════════════════════════════════════════════
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ▼ CONFIGURAÇÃO REALIZADA COM SUCESSO
export const SUPABASE_URL = 'https://wjuooblxcczmbdaxuqhj.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_iiKZubiCAW9X2LdCliM7Lw_8Z1cA_2B'
// ▲ ─────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,   // captura o link mágico/OAuth da URL
  }
})

// ── Auth helpers ───────────────────────────────────────

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Login e-mail + senha */
export async function loginEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data?.user, error }
}

/** Cadastro — envia e-mail de confirmação / link mágico */
export async function signupEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  })
  return { user: data?.user, error }
}

/** Login Google OAuth */
export async function loginGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  })
  return { error }
}

/** Reenviar link de confirmação */
export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  return { error }
}

/** Recuperar senha */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname + '?reset=1'
  })
  return { error }
}

/** Logout */
export async function logout() {
  await supabase.auth.signOut()
}

// ── Dados helpers ──────────────────────────────────────

// v2.2: Adicionados 'produtos' e 'clientes' à lista de tipos sincronizados.
const DATA_TYPES = [
  'config', 'custos', 'receitas', 'servicos', 'diario', 'agenda',
  'produtos',   // v2.2 — catálogo + estoque
  'clientes',   // v2.2 — CRM
]

/** Carrega todos os dados do salão do Supabase → localStorage */
export async function loadFromSupabase() {
  const user = await getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('salao_data')
    .select('data_type, data')
    .eq('user_id', user.id)

  if (error) { console.warn('Supabase load error:', error.message); return false }

  // v2.2: mapa atualizado com 'produtos' e 'clientes'
  const KEY_MAP = {
    config:   'salao_config',
    custos:   'salao_custos',
    receitas: 'salao_receitas',
    servicos: 'salao_servicos',
    diario:   'salao_diario',
    agenda:   'salao_agenda',
    produtos: 'salao_produtos',   // v2.2
    clientes: 'salao_clientes',   // v2.2
  }

  for (const row of (data || [])) {
    if (KEY_MAP[row.data_type]) {
      localStorage.setItem(KEY_MAP[row.data_type], JSON.stringify(row.data))
    }
  }
  return true
}

/** Sincroniza um tipo de dado do localStorage → Supabase */
export async function syncToSupabase(dataType, rawData) {
  const user = await getUser()
  if (!user) return

  const { error } = await supabase.from('salao_data').upsert({
    user_id:    user.id,
    data_type:  dataType,
    data:        rawData,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,data_type' })

  if (error) console.warn(`Sync error (${dataType}):`, error.message)
}