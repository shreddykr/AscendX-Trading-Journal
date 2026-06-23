/* ==========================================================================
   ASCENDX AUTH CONTROLLER
   Handles sign in, account creation, and email-free password recovery
   via a security question chosen at sign-up.
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
const authToggle = document.getElementById('authToggle');
const confirmGroup = document.getElementById('confirmPasswordGroup');
const securityQuestionGroup = document.getElementById('securityQuestionGroup');
const securityAnswerGroup = document.getElementById('securityAnswerGroup');
const securityQuestionSelect = document.getElementById('securityQuestion');
const securityAnswerInput = document.getElementById('securityAnswer');
const authSubmit = document.getElementById('authSubmit');
const authPasswordConfirm = document.getElementById('authPasswordConfirm');

// Recovery-flow references
const recoverStep1 = document.getElementById('recoverStep1');
const recoverStep2 = document.getElementById('recoverStep2');
const recoverQuestion = document.getElementById('recoverQuestion');
let recoverEmail = '';

let mode = 'login'; // 'login' | 'register'

function setMode(newMode) {
    mode = newMode;
    clearBanner();
    document.querySelectorAll('.auth-toggle-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mode === newMode);
    });
    const isRegister = newMode === 'register';
    confirmGroup.style.display = isRegister ? 'flex' : 'none';
    securityQuestionGroup.style.display = isRegister ? 'flex' : 'none';
    securityAnswerGroup.style.display = isRegister ? 'flex' : 'none';
    authSubmit.textContent = isRegister ? 'Create Account' : 'Sign In';
    document.getElementById('authPassword').autocomplete = isRegister
        ? 'new-password'
        : 'current-password';
}

function showView(view) {
    authForm.style.display = view === 'auth' ? 'block' : 'none';
    forgotForm.style.display = view === 'forgot' ? 'block' : 'none';
    authToggle.style.display = view === 'auth' ? 'flex' : 'none';
    if (view === 'forgot') {
        recoverStep1.style.display = 'block';
        recoverStep2.style.display = 'none';
    }
    clearBanner();
}

/* --------------------------------------------------------------------------
   Load the selectable security questions into the sign-up dropdown
   -------------------------------------------------------------------------- */
async function loadSecurityQuestions() {
    try {
        const res = await fetch('/api/auth/security-questions');
        const { questions } = await res.json();
        securityQuestionSelect.innerHTML = '';
        (questions || []).forEach((q) => {
            const opt = document.createElement('option');
            opt.value = q;
            opt.textContent = q;
            securityQuestionSelect.appendChild(opt);
        });
    } catch (e) {
        /* leave empty; register validation will catch a missing question */
    }
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

    const body = { email, password };

    if (mode === 'register') {
        if (password.length < 6) {
            return showBanner('Password must be at least 6 characters.', 'error');
        }
        if (password !== authPasswordConfirm.value) {
            return showBanner('Passwords do not match.', 'error');
        }
        const securityQuestion = securityQuestionSelect.value;
        const securityAnswer = securityAnswerInput.value.trim();
        if (!securityQuestion) {
            return showBanner('Choose a security question.', 'error');
        }
        if (securityAnswer.length < 2) {
            return showBanner('Enter an answer to your security question.', 'error');
        }
        body.securityQuestion = securityQuestion;
        body.securityAnswer = securityAnswer;
    }

    authSubmit.disabled = true;
    authSubmit.textContent = mode === 'register' ? 'Creating…' : 'Signing in…';

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const { ok, payload } = await postJSON(endpoint, body);

    if (ok) {
        window.location.href = '/';
        return;
    }

    showBanner(payload.error || 'Something went wrong. Try again.', 'error');
    authSubmit.disabled = false;
    setMode(mode);
});

/* --------------------------------------------------------------------------
   Password recovery flow (security question, no email)
   -------------------------------------------------------------------------- */
document.getElementById('forgotLink').addEventListener('click', () => showView('forgot'));
document.getElementById('backToLoginLink').addEventListener('click', () => showView('auth'));

// Step 1: look up the account's security question by email.
document.getElementById('forgotContinue').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) {
        return showBanner('Enter your account email.', 'error');
    }
    const btn = document.getElementById('forgotContinue');
    btn.disabled = true;
    btn.textContent = 'Checking…';
    const { ok, payload } = await postJSON('/api/auth/security-question', { email });
    btn.disabled = false;
    btn.textContent = 'Continue';
    if (!ok) {
        return showBanner(payload.error || 'Could not look up that account.', 'error');
    }
    recoverEmail = email;
    recoverQuestion.textContent = payload.question;
    recoverStep1.style.display = 'none';
    recoverStep2.style.display = 'block';
    clearBanner();
});

// Step 2: verify the answer and set a new password.
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const answer = document.getElementById('recoverAnswer').value.trim();
    const password = document.getElementById('recoverPassword').value;
    const confirm = document.getElementById('recoverPasswordConfirm').value;
    if (!answer) {
        return showBanner('Enter your answer.', 'error');
    }
    if (password.length < 6) {
        return showBanner('Password must be at least 6 characters.', 'error');
    }
    if (password !== confirm) {
        return showBanner('Passwords do not match.', 'error');
    }
    const submit = document.getElementById('recoverSubmit');
    submit.disabled = true;
    submit.textContent = 'Resetting…';
    const { ok, payload } = await postJSON('/api/auth/reset-security', {
        email: recoverEmail,
        answer,
        password,
    });
    submit.disabled = false;
    submit.textContent = 'Reset Password';
    if (ok) {
        showView('auth');
        showBanner('Password updated. You can now sign in.', 'success');
    } else {
        showBanner(payload.error || 'Could not reset password.', 'error');
    }
});

/* --------------------------------------------------------------------------
   Boot: if already signed in, go straight to the dashboard.
   -------------------------------------------------------------------------- */
(async function boot() {
    loadSecurityQuestions();
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
