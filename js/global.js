// ==========================================
// 1. MOBILE HAMBURGER MENU LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');

    if (hamburgerBtn && navLinks) {
        hamburgerBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

// ==========================================
// 2. GLOBAL AUTHENTICATION UI UPDATER
// ==========================================
async function updateGlobalNavbar() {
    if (!window.supabaseClient) return;

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const user = session ? session.user : null;

    const loginBtn = document.getElementById('navLoginBtn');
    const dashboardBtn = document.getElementById('navDashboardBtn');

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (dashboardBtn) dashboardBtn.style.display = 'inline-flex';
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
    }
}

// ==========================================
// 3. AUTH MODAL – HTML INJECTION
// ==========================================
function injectAuthModal() {
    const modalHTML = `
    <div class="auth-modal-overlay" id="authModalOverlay" role="dialog" aria-modal="true" aria-label="Authentication">
      <div class="auth-modal">
        <button class="auth-modal-close" id="authModalClose" aria-label="Close">&times;</button>

        <!-- ── LOGIN VIEW ── -->
        <div class="auth-view active" id="viewLogin">
          <div class="auth-modal-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your Promptlier account.</p>
          </div>
          <div class="auth-status" id="loginStatus"></div>
          <div class="auth-form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="auth-form-group">
            <label for="loginPassword">Password</label>
            <div class="pw-wrapper">
              <input type="password" id="loginPassword" placeholder="••••••••" autocomplete="current-password">
              <button type="button" class="pw-toggle" data-target="loginPassword" aria-label="Show password">👁</button>
            </div>
          </div>
          <button class="btn btn-primary auth-submit-btn" id="loginSubmitBtn">Log In</button>
          <div class="auth-modal-footer">
            <button class="link-btn" id="toForgotPassword">Forgot password?</button>
            &nbsp;·&nbsp;
            <span>New here? <button class="link-btn" id="toSignup">Create an account</button></span>
          </div>
        </div>

        <!-- ── SIGN UP VIEW ── -->
        <div class="auth-view" id="viewSignup">
          <div class="auth-modal-header">
            <h2>Create Account</h2>
            <p>Join Promptlier and start exploring premium prompts.</p>
          </div>
          <div class="auth-status" id="signupStatus"></div>
          <div class="auth-form-group">
            <label for="signupEmail">Email</label>
            <input type="email" id="signupEmail" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="auth-form-group">
            <label for="signupPassword">Password</label>
            <div class="pw-wrapper">
              <input type="password" id="signupPassword" placeholder="Min. 8 characters" autocomplete="new-password">
              <button type="button" class="pw-toggle" data-target="signupPassword" aria-label="Show password">👁</button>
            </div>
          </div>
          <div class="auth-form-group">
            <label for="signupConfirm">Confirm Password</label>
            <div class="pw-wrapper">
              <input type="password" id="signupConfirm" placeholder="Repeat your password" autocomplete="new-password">
              <button type="button" class="pw-toggle" data-target="signupConfirm" aria-label="Show password">👁</button>
            </div>
          </div>
          <button class="btn btn-primary auth-submit-btn" id="signupSubmitBtn">Create Account</button>
          <div class="auth-modal-footer">
            Already have an account? <button class="link-btn" id="toLogin">Log in</button>
          </div>
        </div>

        <!-- ── FORGOT PASSWORD VIEW ── -->
        <div class="auth-view" id="viewForgotPassword">
          <div class="auth-modal-header">
            <h2>Forgot Password</h2>
            <p>Enter your email and we'll send you a reset link.</p>
          </div>
          <div class="auth-status" id="forgotStatus"></div>
          <div class="auth-form-group">
            <label for="forgotEmail">Email</label>
            <input type="email" id="forgotEmail" placeholder="you@example.com" autocomplete="email">
          </div>
          <button class="btn btn-primary auth-submit-btn" id="forgotSubmitBtn">Send Reset Link</button>
          <div class="auth-modal-footer">
            Remembered it? <button class="link-btn" id="backToLogin">Back to Log In</button>
          </div>
        </div>

      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ==========================================
// 4. AUTH MODAL – LOGIC & EVENT HANDLERS
// ==========================================
function setupAuthModal() {
    const overlay = document.getElementById('authModalOverlay');
    if (!overlay) return;

    // Helper: show a specific view
    function showView(viewId) {
        document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        // Clear all status messages when switching
        document.querySelectorAll('.auth-status').forEach(s => {
            s.className = 'auth-status';
            s.textContent = '';
        });
    }

    // Helper: set a status message
    function setStatus(elId, type, msg) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.className = `auth-status ${type}`;
        el.textContent = msg;
    }

    // Helper: friendly error messages from Supabase error codes/messages
    function friendlyError(err) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid password') || msg.includes('wrong password')) {
            return '❌ Incorrect email or password. Please try again.';
        }
        if (msg.includes('email not confirmed')) {
            return '📧 Please verify your email first. Check your inbox for a confirmation link.';
        }
        if (msg.includes('user not found') || msg.includes('no user found')) {
            return '🤔 This email is not registered. Try signing up first!';
        }
        if (msg.includes('already registered') || msg.includes('user already exists')) {
            return '📬 This email is already registered. Try logging in instead.';
        }
        if (msg.includes('password should be at least')) {
            return '🔒 Password must be at least 8 characters.';
        }
        if (msg.includes('rate limit') || msg.includes('too many requests')) {
            return '⏳ Too many attempts. Please wait a moment and try again.';
        }
        return `⚠️ ${err.message || 'Something went wrong. Please try again.'}`;
    }

    // Open / close
    function openModal(defaultView = 'viewLogin') {
        showView(defaultView);
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Wire the Login button in the navbar
    const navLoginBtn = document.getElementById('navLoginBtn');
    if (navLoginBtn) navLoginBtn.addEventListener('click', () => openModal('viewLogin'));

    // Close modal
    document.getElementById('authModalClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // View switches
    document.getElementById('toSignup').addEventListener('click', () => showView('viewSignup'));
    document.getElementById('toLogin').addEventListener('click', () => showView('viewLogin'));
    document.getElementById('toForgotPassword').addEventListener('click', () => showView('viewForgotPassword'));
    document.getElementById('backToLogin').addEventListener('click', () => showView('viewLogin'));

    // ── Password visibility toggles (delegated) ──
    overlay.addEventListener('click', (e) => {
        const btn = e.target.closest('.pw-toggle');
        if (!btn) return;
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        btn.textContent = isHidden ? '🙈' : '👁';
        btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });

    // ── LOGIN ──
    document.getElementById('loginSubmitBtn').addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginSubmitBtn');

        if (!email || !password) {
            setStatus('loginStatus', 'error', '⚠️ Please fill in both fields.');
            return;
        }

        btn.textContent = 'Logging in…';
        btn.disabled = true;

        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            setStatus('loginStatus', 'error', friendlyError(error));
            btn.textContent = 'Log In';
            btn.disabled = false;
        } else {
            setStatus('loginStatus', 'success', '✅ Logged in successfully! Redirecting…');
            setTimeout(() => {
                closeModal();
                updateGlobalNavbar();
            }, 1000);
        }
    });

    // ── SIGN UP ──
    document.getElementById('signupSubmitBtn').addEventListener('click', async () => {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;
        const btn = document.getElementById('signupSubmitBtn');

        if (!email || !password || !confirm) {
            setStatus('signupStatus', 'error', '⚠️ Please fill in all fields.');
            return;
        }
        if (password.length < 8) {
            setStatus('signupStatus', 'error', '🔒 Password must be at least 8 characters long.');
            return;
        }
        if (password !== confirm) {
            setStatus('signupStatus', 'error', '❌ Passwords do not match. Please check and try again.');
            return;
        }

        btn.textContent = 'Creating account…';
        btn.disabled = true;

        const { error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin + '/index.html'
            }
        });

        if (error) {
            setStatus('signupStatus', 'error', friendlyError(error));
            btn.textContent = 'Create Account';
            btn.disabled = false;
        } else {
            setStatus('signupStatus', 'success', '📧 Almost there! We sent a confirmation email to ' + email + '. Please check your inbox and click the link to activate your account.');
            btn.textContent = 'Email Sent!';
        }
    });

    // ── FORGOT PASSWORD ──
    document.getElementById('forgotSubmitBtn').addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail').value.trim();
        const btn = document.getElementById('forgotSubmitBtn');

        if (!email) {
            setStatus('forgotStatus', 'error', '⚠️ Please enter your email address.');
            return;
        }

        btn.textContent = 'Sending…';
        btn.disabled = true;

        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });

        if (error) {
            setStatus('forgotStatus', 'error', friendlyError(error));
            btn.textContent = 'Send Reset Link';
            btn.disabled = false;
        } else {
            setStatus('forgotStatus', 'success', '📬 Reset link sent! Check your inbox (and spam folder). Click the link in the email to set a new password.');
            btn.textContent = 'Link Sent!';
        }
    });
}

// ==========================================
// 5. INITIALIZE: NAV + MODAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalNavbar();
    injectAuthModal();
    setupAuthModal();
    setupZeroClsNavigation();
});

// ==========================================
// 6. ZERO-CLS SMOOTH NAVIGATION (PRE-FETCH)
// ==========================================
function setupZeroClsNavigation() {
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    document.body.appendChild(loader);

    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link || link.target === '_blank') return;

        const href = link.getAttribute('href');

        if (href && href.includes('prompt.html') && href.includes('id=')) {
            e.preventDefault();

            const url = new URL(link.href);
            const promptId = url.searchParams.get('id');

            if (promptId && window.supabaseClient) {
                const currentCache = localStorage.getItem('promptlier_current_prompt_preload');
                if (currentCache) {
                    try {
                        const parsed = JSON.parse(currentCache);
                        if (parsed.id == promptId) {
                            window.location.href = href;
                            return;
                        }
                    } catch (e) { }
                }

                loader.classList.add('loading');

                try {
                    const { data, error } = await window.supabaseClient
                        .from('prompts')
                        .select('*')
                        .eq('id', promptId)
                        .single();

                    if (error) throw error;
                    if (data) {
                        localStorage.setItem('promptlier_current_prompt_preload', JSON.stringify(data));
                    }
                } catch (err) {
                    console.error("Background fetch failed:", err);
                } finally {
                    loader.classList.replace('loading', 'finishing');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 150);
                }
            } else {
                window.location.href = href;
            }
        } else if (href && href.includes('blog.html') && href.includes('slug=')) {
            e.preventDefault();

            const url = new URL(link.href);
            const blogSlug = url.searchParams.get('slug');

            if (blogSlug && window.supabaseClient) {
                loader.classList.add('loading');

                try {
                    const { data, error } = await window.supabaseClient
                        .from('blogs')
                        .select('*')
                        .eq('slug', blogSlug)
                        .single();

                    if (error) throw error;
                    if (data) {
                        localStorage.setItem('promptlier_current_blog_preload', JSON.stringify(data));
                    }
                } catch (err) {
                    console.error("Background fetch failed for blog:", err);
                } finally {
                    loader.classList.replace('loading', 'finishing');
                    setTimeout(() => {
                        window.location.href = href;
                    }, 150);
                }
            } else {
                window.location.href = href;
            }
        }
    });
}