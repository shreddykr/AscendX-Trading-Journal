const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const needle = require('needle');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Lightweight .env loader (no external dependency) so SMTP / key overrides work locally.
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

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
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
   EMAIL TRANSPORT (nodemailer) - falls back to console logging locally
   Configure real email by setting SMTP_HOST / SMTP_USER / SMTP_PASS env vars.
   ========================================================================== */
function getMailer() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }
    return null;
}

async function sendResetEmail(toEmail, resetLink) {
    const mailer = getMailer();
    if (!mailer) {
        console.log('==================================================');
        console.log('🔑 PASSWORD RESET REQUESTED (no SMTP configured)');
        console.log(`   Account: ${toEmail}`);
        console.log(`   Reset link (valid 1 hour): ${resetLink}`);
        console.log('   Paste this link into the browser to set a new password.');
        console.log('==================================================');
        return;
    }
    await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: toEmail,
        subject: 'AscendX Journal - Password Reset',
        text: `You requested a password reset for your AscendX Journal account.\n\nOpen this link to choose a new password (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`,
        html: `<div style="font-family:Segoe UI,Roboto,sans-serif;background:#05070b;color:#e2e8f0;padding:30px;border-radius:12px;max-width:480px;margin:auto;">
            <h2 style="color:#00d2ff;">AscendX Journal</h2>
            <p>You requested a password reset for your account.</p>
            <p><a href="${resetLink}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold;">Choose a new password</a></p>
            <p style="color:#94a3b8;font-size:0.85rem;">This link is valid for 1 hour. If you did not request this, you can ignore this email.</p>
        </div>`,
    });
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
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
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

app.post('/api/auth/forgot', async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    const users = readUsers();
    const user = users.find((u) => u.email === email);
    if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        user.reset = { tokenHash: sha256(token), expires: Date.now() + 1000 * 60 * 60 };
        writeUsers(users);
        const link = `${req.protocol}://${req.get('host')}/login.html?token=${token}`;
        try {
            await sendResetEmail(email, link);
        } catch (e) {
            console.error('Reset email send failure:', e.message);
        }
    }
    // Always return the same response so attackers cannot probe which emails exist.
    res.json({
        success: true,
        message: 'If an account exists for that email, a reset link has been sent.',
    });
});

app.post('/api/auth/reset', async (req, res) => {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (!token || password.length < 6) {
        return res
            .status(400)
            .json({ error: 'Invalid request. Password must be at least 6 characters.' });
    }
    const users = readUsers();
    const user = users.find(
        (u) => u.reset && u.reset.tokenHash === sha256(token) && u.reset.expires > Date.now()
    );
    if (!user) {
        return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
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
    if (!getMailer()) {
        console.log(`📧 Email:          console fallback (set SMTP_* env vars for real emails)`);
    } else {
        console.log(`📧 Email:          SMTP configured (${process.env.SMTP_HOST})`);
    }
    console.log(`==================================================`);
});
