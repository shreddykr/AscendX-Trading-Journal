const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const needle = require('needle');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Lightweight .env loader (no external dependency) so env overrides work locally.
(function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
})();

const app = express();
const PORT = process.env.PORT || 8082;

/* ==========================================================================
   STORAGE LAYOUT
   data/
     secret.key            -> AES master key (auto-generated, keep private)
     users.json            -> encrypted account registry (emails + bcrypt hashes)
     journals/
       user1.enc           -> independent encrypted journal for user 1
       user2.enc           -> independent encrypted journal for user 2
   ========================================================================== */
const DATA_DIR = path.join(__dirname, 'data');
const JOURNALS_DIR = path.join(DATA_DIR, 'journals');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const KEY_FILE = path.join(DATA_DIR, 'secret.key');

for (const dir of [DATA_DIR, JOURNALS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ==========================================================================
   ENCRYPTION CORE (AES-256-GCM with a single server master key)
   Every per-user journal file and the account registry are encrypted at rest.
   ========================================================================== */
function loadMasterKey() {
    const fromEnv = process.env.ASCENDX_MASTER_KEY;
    if (fromEnv) {
        if (/^[0-9a-fA-F]{64}$/.test(fromEnv)) return Buffer.from(fromEnv, 'hex');
        return crypto.createHash('sha256').update(fromEnv).digest();
    }
    if (fs.existsSync(KEY_FILE)) {
        return Buffer.from(fs.readFileSync(KEY_FILE, 'utf8').trim(), 'hex');
    }
    const key = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, key.toString('hex'), { mode: 0o600 });
    return key;
}
const MASTER_KEY = loadMasterKey();

function encryptJSON(obj) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        v: 1,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: enc.toString('hex'),
    });
}

function decryptJSON(raw) {
    const parsed = JSON.parse(raw);
    const iv = Buffer.from(parsed.iv, 'hex');
    const tag = Buffer.from(parsed.tag, 'hex');
    const data = Buffer.from(parsed.data, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
}

/* ==========================================================================
   SECURITY QUESTIONS (email-free password recovery)
   Users pick one at sign-up; the answer is stored only as a bcrypt hash and
   is required to reset a forgotten password. No email provider needed.
   ========================================================================== */
const SECURITY_QUESTIONS = [
    'What was the name of your first pet?',
    'What city were you born in?',
    'What was the make and model of your first car?',
    "What is your mother's maiden name?",
    'What was the name of your elementary school?',
    'What is your favorite movie?',
];

// Normalize answers so capitalization / spacing differences still match.
function normalizeAnswer(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/* ==========================================================================
   ACCOUNT REGISTRY HELPERS (encrypted users.json)
   ========================================================================== */
function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return decryptJSON(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {
        console.error('User registry read failure:', e.message);
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, encryptJSON(users), { mode: 0o600 });
}

/* ==========================================================================
   PER-USER ENCRYPTED JOURNAL HELPERS (independent file per account)
   ========================================================================== */
function journalPath(userId) {
    return path.join(JOURNALS_DIR, `${userId}.enc`);
}

function readJournal(userId) {
    const p = journalPath(userId);
    if (!fs.existsSync(p)) return [];
    try {
        return decryptJSON(fs.readFileSync(p, 'utf8'));
    } catch (e) {
        console.error(`Journal read failure for ${userId}:`, e.message);
        return [];
    }
}

function writeJournal(userId, data) {
    fs.writeFileSync(journalPath(userId), encryptJSON(data), { mode: 0o600 });
}

/* ==========================================================================
   MIDDLEWARE
   ========================================================================== */
app.use(express.json({ limit: '10mb' }));
app.use(
    session({
        secret: process.env.SESSION_SECRET || MASTER_KEY.toString('hex'),
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        },
    })
);

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    return res.status(401).json({ error: 'Not authenticated' });
}

// Gate the main dashboard: send unauthenticated visitors to the login screen.
app.get(['/', '/index.html'], (req, res, next) => {
    if (req.session && req.session.userId) return next();
    return res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, 'public')));

/* ==========================================================================
   AUTH ENDPOINTS
   ========================================================================== */
app.post('/api/auth/register', async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const securityQuestion = String(req.body.securityQuestion || '').trim();
    const securityAnswer = String(req.body.securityAnswer || '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!SECURITY_QUESTIONS.includes(securityQuestion)) {
        return res.status(400).json({ error: 'Choose a security question.' });
    }
    if (normalizeAnswer(securityAnswer).length < 2) {
        return res.status(400).json({ error: 'Enter an answer to your security question.' });
    }

    const users = readUsers();
    if (users.some((u) => u.email === email)) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const nextNum =
        users.reduce((max, u) => {
            const n = parseInt(String(u.id).replace(/\D/g, ''), 10) || 0;
            return Math.max(max, n);
        }, 0) + 1;
    const id = `user${nextNum}`;

    const user = {
        id,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        securityQuestion,
        securityAnswerHash: await bcrypt.hash(normalizeAnswer(securityAnswer), 10),
        createdAt: new Date().toISOString(),
        reset: null,
    };
    users.push(user);
    writeUsers(users);

    // Every new account starts with its own empty, independent journal file.
    writeJournal(id, []);

    req.session.userId = id;
    req.session.email = email;
    res.json({ success: true, email });
});

app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const users = readUsers();
    const user = users.find((u) => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    req.session.userId = user.id;
    req.session.email = user.email;
    res.json({ success: true, email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', (req, res) => {
    if (req.session && req.session.userId) {
        return res.json({ authenticated: true, email: req.session.email });
    }
    res.status(401).json({ authenticated: false });
});

// List of selectable security questions for the sign-up form.
app.get('/api/auth/security-questions', (req, res) => {
    res.json({ questions: SECURITY_QUESTIONS });
});

// Step 1 of recovery: look up the security question for an email.
app.post('/api/auth/security-question', (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    const users = readUsers();
    const user = users.find((u) => u.email === email);
    if (!user) {
        return res.status(404).json({ error: 'No account found for that email.' });
    }
    if (!user.securityQuestion) {
        return res.status(400).json({
            error: 'This account has no security question set. Contact the site owner for a manual reset.',
        });
    }
    res.json({ question: user.securityQuestion });
});

// Step 2 of recovery: verify the answer and set a new password.
app.post('/api/auth/reset-security', async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    const answer = String(req.body.answer || '');
    const password = String(req.body.password || '');
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const users = readUsers();
    const user = users.find((u) => u.email === email);
    if (!user || !user.securityAnswerHash) {
        return res.status(400).json({ error: 'Could not verify your security answer.' });
    }
    const ok = await bcrypt.compare(normalizeAnswer(answer), user.securityAnswerHash);
    if (!ok) {
        return res.status(400).json({ error: 'That answer is incorrect.' });
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    user.reset = null;
    writeUsers(users);
    res.json({ success: true });
});

/* ==========================================================================
   JOURNAL ENDPOINTS (per-user, encrypted, session-scoped)
   ========================================================================== */
app.get('/api/journal', requireAuth, (req, res) => {
    const journalData = readJournal(req.session.userId);
    res.json({ journal: journalData, newsRawFeed: [] });
});

app.post('/api/journal', requireAuth, (req, res) => {
    try {
        writeJournal(req.session.userId, req.body);
        res.json({ success: true });
    } catch (e) {
        console.error('Journal write failure:', e.message);
        res.status(500).json({ error: 'Failed to write database updates.' });
    }
});

/* ==========================================================================
   ECONOMIC NEWS PROXY (unchanged)
   ========================================================================== */
app.get('/proxy/news', async (req, res) => {
    try {
        const options = {
            timeout: 6000,
            follow_max: 5,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                Referer: 'https://tradingview.com',
            },
        };

        const response = await needle(
            'get',
            'https://tradingview.comembed-widget/news-flow/?colorTheme=dark&isWidescreen=true',
            options
        );

        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');

        let rawHtml = String(response.body);

        const cleanThemeOverride = `
            <base href="https://tradingview.com">
            <style>
                html, body, main, section, [class*="container-"], [class*="widget-"] {
                    background-color: #05070b !important;
                    background: #05070b !important;
                    color: #e2e8f0 !important;
                }
                a, [class*="title-"], [class*="cardTitle-"] {
                    color: #00d2ff !important;
                    text-decoration: none !important;
                }
                time, [class*="meta-"], [class*="description-"] {
                    color: #94a3b8 !important;
                }
                header, nav, footer, [class*="header-"], [class*="footer-"] {
                    display: none !important;
                }
            </style>
        </head>`;

        if (rawHtml.includes('</head>')) {
            rawHtml = rawHtml.replace('</head>', cleanThemeOverride);
        } else {
            rawHtml = cleanThemeOverride + rawHtml;
        }

        res.send(rawHtml);
    } catch (err) {
        res
            .status(500)
            .send(
                `<div style="color:#ff0055;padding:40px;font-family:sans-serif;text-align:center;background:#05070b;height:100vh;"><h2>Proxy Pipeline Timeout</h2>Verify that your server hardware has access to an active internet connection loop.</div>`
            );
    }
});

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
app.listen(PORT, '0.0.0.0', () => {
    console.log(`==================================================`);
    console.log('🚀 ASCENDX SECURE MULTI-USER CORE ONLINE');
    console.log(`==================================================`);
    console.log(`💻 Local PC:       http://localhost:${PORT}`);
    console.log(`📶 Wi-Fi Access:   http://${localIP}:${PORT}`);
    console.log(`🔐 Encryption:     AES-256-GCM (per-user journal files)`);
    console.log(`🔑 Recovery:       Security question (no email needed)`);
    console.log(`==================================================`);
});
