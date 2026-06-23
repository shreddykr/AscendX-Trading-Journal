/* ==========================================================================
   ASCENDX AUTH CONTROLLER
   Handles sign in, account creation, forgot-password, and reset flows.
   ========================================================================== */

const banner = document.getElementById('authBanner');

function showBanner(message, type) {
    if (!banner) return;
    banner.textContent = message;
    banner.className = 'auth-banner show ' + (type || 'info');
}

function clearBanner() {
    if (!banner) return;
    banner.textContent = '';
    banner.className = 'auth-banner';
}

async function postJSON(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    let payload = {};
    try {
        payload = await res.json();
    } catch (e) {
        payload = {};
    }
    return { ok: res.ok, status: res.status, payload };
}

/* --------------------------------------------------------------------------
   View references
   -------------------------------------------------------------------------- */
const authForm = document.getElementById('authForm');
const forgotForm = document.getElementById('forgotForm');
const resetForm = document.getElementById('resetForm');
const authToggle = document.getElementById('authToggle');
const confirmGroup = document.getElementById('confirmPasswordGroup');
const authSubmit = document.getElementById('authSubmit');
const authPasswordConfirm = document.getElementById('authPasswordConfirm');

let mode = 'login'; // 'login' | 'register'

function setMode(newMode) {
    mode = newMode;
    clearBanner();
    document.querySelectorAll('.auth-toggle-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mode === newMode);
    });
    const isRegister = newMode === 'register';
    confirmGroup.style.display = isRegister ? 'flex' : 'none';
    authSubmit.textContent = isRegister ? 'Create Account' : 'Sign In';
    document.getElementById('authPassword').autocomplete = isRegister
        ? 'new-password'
        : 'current-password';
}

function showView(view) {
    authForm.style.display = view === 'auth' ? 'block' : 'none';
    forgotForm.style.display = view === 'forgot' ? 'block' : 'none';
    resetForm.style.display = view === 'reset' ? 'block' : 'none';
    authToggle.style.display = view === 'auth' ? 'flex' : 'none';
    clearBanner();
}

/* --------------------------------------------------------------------------
   Toggle Sign In / Create Account
   -------------------------------------------------------------------------- */
authToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('.auth-toggle-btn');
    if (btn) setMode(btn.dataset.mode);
});

/* --------------------------------------------------------------------------
   Sign in / Register submit
   -------------------------------------------------------------------------- */
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (mode === 'register') {
        if (password.length < 6) {
            return showBanner('Password must be at least 6 characters.', 'error');
        }
        if (password !== authPasswordConfirm.value) {
            return showBanner('Passwords do not match.', 'error');
        }
    }

    authSubmit.disabled = true;
    authSubmit.textContent = mode === 'register' ? 'Creating…' : 'Signing in…';

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const { ok, payload } = await postJSON(endpoint, { email, password });

    if (ok) {
        window.location.href = '/';
        return;
    }

    showBanner(payload.error || 'Something went wrong. Try again.', 'error');
    authSubmit.disabled = false;
    setMode(mode);
});

/* --------------------------------------------------------------------------
   Forgot password flow
   -------------------------------------------------------------------------- */
document.getElementById('forgotLink').addEventListener('click', () => showView('forgot'));
document.getElementById('backToLoginLink').addEventListener('click', () => showView('auth'));

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    const submit = document.getElementById('forgotSubmit');
    submit.disabled = true;
    submit.textContent = 'Sending…';
    const { payload } = await postJSON('/api/auth/forgot', { email });
    showBanner(
        payload.message || 'If an account exists for that email, a reset link has been sent.',
        'info'
    );
    submit.disabled = false;
    submit.textContent = 'Send Reset Link';
});

/* --------------------------------------------------------------------------
   Reset password flow (triggered by ?token= in the URL)
   -------------------------------------------------------------------------- */
const resetToken = new URLSearchParams(window.location.search).get('token');

document.getElementById('resetBackLink').addEventListener('click', () => {
    history.replaceState(null, '', window.location.pathname);
    showView('auth');
});

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('resetPassword').value;
    const confirm = document.getElementById('resetPasswordConfirm').value;
    if (password.length < 6) {
        return showBanner('Password must be at least 6 characters.', 'error');
    }
    if (password !== confirm) {
        return showBanner('Passwords do not match.', 'error');
    }
    const submit = document.getElementById('resetSubmit');
    submit.disabled = true;
    submit.textContent = 'Updating…';
    const { ok, payload } = await postJSON('/api/auth/reset', { token: resetToken, password });
    if (ok) {
        history.replaceState(null, '', window.location.pathname);
        showView('auth');
        showBanner('Password updated. You can now sign in.', 'success');
    } else {
        showBanner(payload.error || 'Could not reset password.', 'error');
        submit.disabled = false;
        submit.textContent = 'Update Password';
    }
});

/* --------------------------------------------------------------------------
   Boot: if already signed in, go straight to the dashboard.
   If a reset token is present, open the reset view.
   -------------------------------------------------------------------------- */
(async function boot() {
    if (resetToken) {
        showView('reset');
        return;
    }
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            window.location.href = '/';
            return;
        }
    } catch (e) {
        /* offline / not logged in — stay on login screen */
    }
    setMode('login');
})();
