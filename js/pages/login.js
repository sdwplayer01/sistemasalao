// ═══════════════════════════════════════════════════════
// js/pages/login.js — Tela de autenticação Premium (Split Screen)
// ═══════════════════════════════════════════════════════
import {
  loginEmail, signupEmail, loginGoogle,
  resetPassword, resendConfirmation
} from '../supabase.js'

export function renderLogin(onSuccess) {
  const el = document.getElementById('page-login')
  if (!el) return

  // Injetando CSS específico para a tela de login dividida
  const style = `
    <style>
      .login-split-container {
        display: flex;
        min-height: 100vh;
        width: 100vw;
        background: var(--bg);
        margin: -20px; /* Compensa padding do body se houver */
      }
      .login-marketing {
        flex: 1;
        background: linear-gradient(135deg, var(--noir) 0%, var(--plum) 100%);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 60px;
        position: relative;
        overflow: hidden;
      }
      .login-marketing::after {
        content: '';
        position: absolute;
        top: -50%; left: -50%; width: 200%; height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%);
        pointer-events: none;
      }
      .login-form-side {
        width: 100%;
        max-width: 480px;
        background: var(--bg-card);
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 40px;
        box-shadow: -10px 0 30px rgba(0,0,0,0.05);
        z-index: 1;
      }
      .marketing-badge {
        display: inline-block;
        background: rgba(255,255,255,0.1);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 24px;
        backdrop-filter: blur(4px);
        width: fit-content;
      }
      .marketing-title {
        font-family: 'Cormorant Garamond', serif;
        font-size: 42px;
        font-weight: 600;
        line-height: 1.1;
        margin-bottom: 24px;
      }
      .marketing-subtitle {
        font-size: 16px;
        color: var(--rose-light);
        margin-bottom: 40px;
        max-width: 400px;
        line-height: 1.5;
      }
      .feature-list { display: flex; flex-direction: column; gap: 16px; }
      .feature-item { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 500; }
      .feature-icon { color: var(--rose); background: white; border-radius: 50%; padding: 4px; display: flex; }
      
      @media (max-width: 768px) {
        .login-marketing { display: none; }
        .login-form-side { max-width: 100%; padding: 24px; box-shadow: none; }
      }
    </style>
  `;

  el.innerHTML = `
    ${style}
    <div class="login-split-container">
      
      <div class="login-marketing">
        <div class="marketing-badge">✦ Sistema de Gestão Premium</div>
        <h1 class="marketing-title">Sua mente no estilo,<br>sua gestão no luxo.</h1>
        <p class="marketing-subtitle">Abandone o papel. Controle sua agenda, calcule seu lucro real instantaneamente e fidelize seus clientes em uma única plataforma.</p>
        
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon"><i data-lucide="calendar-check" style="width:16px;height:16px"></i></div>
            <span>Agendamentos organizados sem conflitos</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><i data-lucide="trending-up" style="width:16px;height:16px"></i></div>
            <span>Frente de Caixa com cálculo de Lucro Real</span>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><i data-lucide="heart" style="width:16px;height:16px"></i></div>
            <span>CRM integrado para retenção de clientes</span>
          </div>
        </div>
      </div>

      <div class="login-form-side">
        <div class="login-wrap" style="min-height:auto; padding:0; background:transparent;">
          <div class="login-card" style="box-shadow:none; padding:0; max-width:100%;">
            
            <div class="login-brand" style="justify-content:flex-start; margin-bottom: 32px;">
              <span class="brand-icon" style="font-size:28px; background:var(--plum); color:white; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:8px;">✦</span>
              <div>
                <div class="font-serif" style="font-size:24px;font-weight:600;color:var(--noir)">Salão Premium</div>
                <div style="font-size:12px;color:var(--txt-muted)">Gestão Inteligente</div>
              </div>
            </div>

            <div class="login-tabs">
              <button class="login-tab active" id="tabEntrar">Entrar</button>
              <button class="login-tab" id="tabCadastrar">Criar conta</button>
            </div>

            <div id="painelEntrar">
              <div class="form-group mt-16">
                <label>E-mail</label>
                <input type="email" id="li-email" placeholder="seu@email.com" autocomplete="email" />
              </div>
              <div class="form-group">
                <label>Senha</label>
                <input type="password" id="li-senha" placeholder="••••••••" autocomplete="current-password" />
              </div>
              <div id="li-erro" class="login-erro" style="display:none"></div>
              <button class="btn btn-primary w-full mt-8" id="btnEntrar" style="height:44px;">Entrar</button>

              <div class="login-divider"><span>ou</span></div>

              <button class="btn-google w-full" id="btnGoogle" style="height:44px; display:flex; align-items:center; justify-content:center; gap:8px;">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </button>

              <div style="text-align:center;margin-top:16px">
                <a href="#" id="linkEsqueci" style="font-size:12px;color:var(--plum);text-decoration:none;font-weight:500;">Esqueci minha senha</a>
              </div>
            </div>

            <div id="painelCadastrar" style="display:none">
              <div style="background:var(--lavender);padding:12px 14px;border-radius:var(--radius);margin-bottom:16px;font-size:13px;color:var(--plum)">
                💜 Você receberá um <strong>e-mail de confirmação</strong>. Clique no link para ativar sua conta e definir a senha.
              </div>
              <div class="form-group">
                <label>Nome do Salão</label>
                <input type="text" id="ca-salao" placeholder="Ex: Studio Rose" />
              </div>
              <div class="form-group">
                <label>E-mail</label>
                <input type="email" id="ca-email" placeholder="seu@email.com" autocomplete="email" />
              </div>
              <div class="form-group">
                <label>Senha (mínimo 6 caracteres)</label>
                <input type="password" id="ca-senha" placeholder="••••••••" autocomplete="new-password" />
              </div>
              <div id="ca-erro" class="login-erro" style="display:none"></div>
              <div id="ca-ok" style="display:none;background:var(--sage);padding:12px;border-radius:var(--radius);font-size:13px;color:var(--txt-green);margin-bottom:8px"></div>
              <button class="btn btn-primary w-full mt-8" id="btnCadastrar" style="height:44px;">Criar conta</button>

              <div class="login-divider"><span>ou</span></div>

              <button class="btn-google w-full" id="btnGoogleCad" style="height:44px; display:flex; align-items:center; justify-content:center; gap:8px;">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Cadastrar com Google
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  `

  if (window.lucide) window.lucide.createIcons();

  // ── Tabs ───────────────────────────────────────────
  document.getElementById('tabEntrar').onclick = () => {
    document.getElementById('painelEntrar').style.display = ''
    document.getElementById('painelCadastrar').style.display = 'none'
    document.getElementById('tabEntrar').classList.add('active')
    document.getElementById('tabCadastrar').classList.remove('active')
  }
  document.getElementById('tabCadastrar').onclick = () => {
    document.getElementById('painelEntrar').style.display = 'none'
    document.getElementById('painelCadastrar').style.display = ''
    document.getElementById('tabCadastrar').classList.add('active')
    document.getElementById('tabEntrar').classList.remove('active')
  }

  // ── Entrar ─────────────────────────────────────────
  document.getElementById('btnEntrar').onclick = async () => {
    const email = document.getElementById('li-email').value.trim()
    const senha = document.getElementById('li-senha').value
    const erroEl = document.getElementById('li-erro')
    if (!email || !senha) return mostrarErro(erroEl, 'Preencha e-mail e senha.')

    setLoading('btnEntrar', true)
    const { user, error } = await loginEmail(email, senha)
    setLoading('btnEntrar', false)

    if (error) return mostrarErro(erroEl, traduzirErro(error.message))
    onSuccess(user)
  }

  // Enter no campo senha
  document.getElementById('li-senha').onkeydown = e => {
    if (e.key === 'Enter') document.getElementById('btnEntrar').click()
  }

  // ── Google ─────────────────────────────────────────
  document.getElementById('btnGoogle').onclick = async () => {
    const { error } = await loginGoogle()
    if (error) mostrarErro(document.getElementById('li-erro'), traduzirErro(error.message))
  }

  // ── Cadastrar ──────────────────────────────────────
  document.getElementById('btnCadastrar').onclick = async () => {
    const salao = document.getElementById('ca-salao').value.trim()
    const email = document.getElementById('ca-email').value.trim()
    const senha = document.getElementById('ca-senha').value
    const erroEl = document.getElementById('ca-erro')
    const okEl = document.getElementById('ca-ok')

    if (!salao) return mostrarErro(erroEl, 'Informe o nome do salão.')
    if (!email) return mostrarErro(erroEl, 'Informe o e-mail.')
    if (senha.length < 6) return mostrarErro(erroEl, 'Senha deve ter pelo menos 6 caracteres.')

    setLoading('btnCadastrar', true)
    const { user, error } = await signupEmail(email, senha)
    setLoading('btnCadastrar', false)

    if (error) return mostrarErro(erroEl, traduzirErro(error.message))

    erroEl.style.display = 'none'
    okEl.style.display = ''
    okEl.innerHTML = `✅ Conta criada! Verifique seu e-mail <strong>${email}</strong> e clique no link para confirmar. <br><br>
      <a href="#" id="linkReenviar" style="color:var(--plum)">Não recebeu? Reenviar e-mail</a>`

    // Salva nome do salão para usar após confirmação
    localStorage.setItem('salao_pending_name', salao)

    document.getElementById('linkReenviar')?.addEventListener('click', async e => {
      e.preventDefault()
      await resendConfirmation(email)
      okEl.innerHTML = '📨 E-mail reenviado! Verifique sua caixa de entrada.'
    })

    // Se confirmação automática (modo dev sem e-mail), loga direto
    if (user?.confirmed_at || user?.email_confirmed_at) onSuccess(user)
  }

  document.getElementById('btnGoogleCad').onclick = async () => {
    const salao = document.getElementById('ca-salao').value.trim()
    if (salao) localStorage.setItem('salao_pending_name', salao)
    const { error } = await loginGoogle()
    if (error) mostrarErro(document.getElementById('ca-erro'), traduzirErro(error.message))
  }

  // ── Esqueci senha ──────────────────────────────────
  document.getElementById('linkEsqueci').onclick = async e => {
    e.preventDefault()
    const email = document.getElementById('li-email').value.trim()
    if (!email) return mostrarErro(document.getElementById('li-erro'), 'Digite seu e-mail acima primeiro.')
    const { error } = await resetPassword(email)
    if (error) return mostrarErro(document.getElementById('li-erro'), traduzirErro(error.message))
    mostrarErro(document.getElementById('li-erro'), '📨 Link de redefinição enviado! Verifique seu e-mail.', 'ok')
  }
}

// ── Helpers ────────────────────────────────────────────
function mostrarErro(el, msg, tipo = 'erro') {
  el.style.display = ''
  el.textContent = msg
  el.style.color = tipo === 'ok' ? 'var(--txt-green)' : 'var(--txt-red)'
  el.style.background = tipo === 'ok' ? 'var(--sage)' : '#FEE2E2'
}

function setLoading(id, loading) {
  const btn = document.getElementById(id)
  if (!btn) return
  btn.disabled = loading
  btn.textContent = loading ? 'Aguarde...' : (id === 'btnEntrar' ? 'Entrar' : 'Criar conta')
}

function traduzirErro(msg) {
  if (!msg) return 'Erro desconhecido.'
  if (msg.includes('Invalid login')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado. Tente entrar.'
  if (msg.includes('Password should')) return 'Senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('Unable to validate')) return 'Link inválido ou expirado.'
  return msg
}