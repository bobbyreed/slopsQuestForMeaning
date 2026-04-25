import { AuthManager } from '../auth/AuthManager.js'

export class AuthModal {
  constructor(onSuccess) {
    this._onSuccess = onSuccess
    this._el = null
    this._mode = 'main' // 'main' | 'create' | 'loading'
  }

  show() {
    if (this._el) return
    this._el = document.createElement('div')
    this._el.id = 'slop-auth-modal'
    this._el.innerHTML = this._html('main')
    document.body.appendChild(this._el)
    this._bind()
    this._el.querySelector('#auth-email')?.focus()

    document.addEventListener('keydown', this._onEsc)
  }

  hide() {
    this._el?.remove()
    this._el = null
    document.removeEventListener('keydown', this._onEsc)
  }

  _onEsc = (e) => { if (e.key === 'Escape') this.hide() }

  _html(mode) {
    if (mode === 'loading') return `
      <div id="slop-auth-panel">
        <div class="auth-header">SLOP'S QUEST FOR MEANING <span>// auth</span></div>
        <div class="auth-body">
          <p class="auth-status">authenticating...</p>
        </div>
      </div>`

    if (mode === 'create') return `
      <div id="slop-auth-panel">
        <div class="auth-header">SLOP'S QUEST FOR MEANING <span>// create account</span></div>
        <div class="auth-body">
          <p class="auth-hint">your save will follow you across devices.</p>
          <div class="auth-field">
            <label>email</label>
            <input id="auth-email" type="email" autocomplete="email" spellcheck="false" placeholder="you@example.com" />
          </div>
          <div class="auth-field">
            <label>password</label>
            <input id="auth-password" type="password" autocomplete="new-password" placeholder="at least 6 characters" />
          </div>
          <div class="auth-error" id="auth-error"></div>
          <div class="auth-actions">
            <button id="auth-create-btn" class="auth-btn">[ CREATE ]</button>
            <button id="auth-back-btn" class="auth-btn auth-btn-dim">[ BACK ]</button>
          </div>
        </div>
      </div>`

    return `
      <div id="slop-auth-panel">
        <div class="auth-header">SLOP'S QUEST FOR MEANING <span>// sign in</span></div>
        <div class="auth-body">
          <p class="auth-hint">sign in to sync your save across devices. or don't. the game works either way.</p>
          <button id="auth-google-btn" class="auth-btn auth-btn-google">[ SIGN IN WITH GOOGLE ]</button>
          <div class="auth-divider">— or —</div>
          <div class="auth-field">
            <label>email</label>
            <input id="auth-email" type="email" autocomplete="email" spellcheck="false" placeholder="you@example.com" />
          </div>
          <div class="auth-field">
            <label>password</label>
            <input id="auth-password" type="password" autocomplete="current-password" placeholder="password" />
          </div>
          <div class="auth-error" id="auth-error"></div>
          <div class="auth-actions">
            <button id="auth-email-btn" class="auth-btn">[ SIGN IN ]</button>
            <button id="auth-new-btn" class="auth-btn auth-btn-dim">[ CREATE ACCOUNT ]</button>
            <button id="auth-cancel-btn" class="auth-btn auth-btn-dim">[ CANCEL ]</button>
          </div>
        </div>
      </div>`
  }

  _bind() {
    const el = this._el

    el.querySelector('#auth-google-btn')?.addEventListener('click', async () => {
      this._setLoading()
      try {
        const result = await AuthManager.signInWithGoogle()
        this.hide()
        this._onSuccess(result.user)
      } catch (err) {
        this._setMode('main')
        this._setError(this._friendlyError(err))
      }
    })

    el.querySelector('#auth-email-btn')?.addEventListener('click', () => this._submitEmail('signin'))
    el.querySelector('#auth-new-btn')?.addEventListener('click', () => this._setMode('create'))
    el.querySelector('#auth-cancel-btn')?.addEventListener('click', () => this.hide())
    el.querySelector('#auth-create-btn')?.addEventListener('click', () => this._submitEmail('create'))
    el.querySelector('#auth-back-btn')?.addEventListener('click', () => this._setMode('main'))

    el.querySelectorAll('input').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') this._submitEmail(this._mode === 'create' ? 'create' : 'signin')
      })
    })
  }

  async _submitEmail(action) {
    const email = this._el.querySelector('#auth-email')?.value.trim()
    const password = this._el.querySelector('#auth-password')?.value
    if (!email || !password) { this._setError('email and password required.'); return }

    this._setLoading()
    try {
      const result = action === 'create'
        ? await AuthManager.createAccount(email, password)
        : await AuthManager.signInWithEmail(email, password)
      this.hide()
      this._onSuccess(result.user)
    } catch (err) {
      this._setMode(action === 'create' ? 'create' : 'main')
      this._setError(this._friendlyError(err))
    }
  }

  _setLoading() {
    this._el.innerHTML = this._html('loading')
  }

  _setMode(mode) {
    this._mode = mode
    this._el.innerHTML = this._html(mode)
    this._bind()
    this._el.querySelector('#auth-email')?.focus()
  }

  _setError(msg) {
    const err = this._el.querySelector('#auth-error')
    if (err) err.textContent = msg
  }

  _friendlyError(err) {
    const code = err?.code || ''
    if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'wrong email or password.'
    if (code.includes('user-not-found')) return 'no account with that email.'
    if (code.includes('email-already-in-use')) return 'an account with that email already exists.'
    if (code.includes('weak-password')) return 'password must be at least 6 characters.'
    if (code.includes('popup-closed')) return 'sign-in cancelled.'
    if (code.includes('network-request-failed')) return 'network error. try again.'
    return 'something went wrong. try again.'
  }
}
