# AscendX Journal Public No Download Required and enjoy the lastest updates!

# [TRY NOW](https://ascendxjournal.us/home.html)
*not responsible for loss of data*

# AscendX Journal ⚡

AscendX is a high-performance, locally hosted trading journal and calendar tracker engineered to run seamlessly across your private Wi-Fi network. Built using standalone vanilla JavaScript, HTML5, and fluid percent-based CSS grids, it features an ultra-smooth, high-refresh dashboard layout designed to deliver pixel-perfect visual analytics on everything from handheld mobile screens to high-end ultrawide monitors and 4K TV panels.

---

## 🛰️ Architecture Overview

```text
[ Your Local Host PC ] ──( Auto-Saves to database.json )──> [ Local Wi-Fi Router ]
          ▲                                                           │
          └─( Managed by local-server.bat )                            ▼
                                                   [ Accessible on Any Connected Device ]
                                                   (PC / iPad / iPhone via Port 8082)
```

---

## 📹 Visual Dashboard Interface

The application features a sleek, hardware-accelerated viewport designed to keep your trading metrics beautifully structured across different display platforms.

<img width="286" height="302" alt="Screenshot 2026-06-22 220148" src="https://github.com/user-attachments/assets/0c00aded-6f7c-470d-a40f-c8592f7f0575" />
<img width="275" height="229" alt="Screenshot 2026-06-22 220127" src="https://github.com/user-attachments/assets/dc5129f9-7568-4f07-9edd-a48aee9fee6a" />
<img width="959" height="407" alt="Screenshot 2026-06-22 220106" src="https://github.com/user-attachments/assets/1f25eb3a-f5cb-4006-aef5-b0e15740a53a" />
<img width="959" height="410" alt="Screenshot 2026-06-22 220048" src="https://github.com/user-attachments/assets/3f2d6969-dccc-4572-8ce0-f691fab878a4" />
<img width="959" height="408" alt="Screenshot 2026-06-22 220030" src="https://github.com/user-attachments/assets/4bad27c1-bb8f-4a9f-b549-372ec8cce5fd" />
<img width="959" height="408" alt="Screenshot 2026-06-22 220014" src="https://github.com/user-attachments/assets/ff786bfc-adad-4541-92b6-d8a168fd0689" />
<img width="959" height="409" alt="Screenshot 2026-06-17 163938" src="https://github.com/user-attachments/assets/1a0124b6-6da9-4688-9328-c63d25414c2d" />


---

## ✨ System Features

* **Automated Multi-Device Sync**: Data storage has been moved completely off isolated browser cache partitions and written directly to your host PC's hard drive (`database.json`). Your desktop computer, iPad, and phone automatically read, write, and pull logs from the exact same file over Wi-Fi.
* **Balanced 5-Column Metrics Matrix**: Provides direct mathematical counters for your cumulative Net P&L, percentage-based Win Rate, Profit Factor, Avg Trades per day, and Green vs Red winning/losing session histories.
* **Inline Monthly P&L Headers**: The cumulative profit or loss generated over a specific calendar month view is calculated automatically and pinned right next to the header text, updating instantly when navigating between months.
* **Perfect Mid-Aligned Calendar Geometry**: Calendar date numbers anchor cleanly in the upper left corner of grid cells, forcing your net P&L dollar amounts and trade volume stats to align directly down the dead center of the blocks.
* **Smart Overtrading Identification Alerts**: The engine tracks your personalized, moving active trade history baseline. If a single calendar cell exceeds 135% of your historical trade average, it automatically triggers a neon orange dashed border alert with a custom warning tag.
* **Neon White Equity Curve Graph**: Positioned perfectly right beneath your calendar workspace container. The line panel uses a high-frame-rate rendering loop (`requestAnimationFrame`) to map asset growth waves across a doubled vertical view canvas with neon white lighting.
* **Personalized Undo Integration**: If you log trade data into the wrong calendar block, simply open the box, input `0` (or leave it blank) across both entry logs, and save. The calendar cell will instantly purge the index, resetting its colors back to normal.
* **Security Hold Verification**: Interactive single-account removals and terminal database wipes require engaging a custom hold-to-confirm progress button that fills smoothly at high refresh rates.
* **Responsive Touch-Scrolling Sidebar**: Sidebar layout handles its own internal scrolling mechanics with iOS inertial swipe physics, allowing you to access menu settings on an iPad or phone without shifting screen geometry.
* **Multi-User Accounts & Encryption**: Each person creates their own login and gets a completely separate, independent journal file (`data/journals/user1.enc`, `user2.enc`, …). Every journal file is encrypted at rest with **AES-256-GCM**, and passwords are stored as one-way **bcrypt** hashes — never in plain text.
* **Forgot-Password Recovery**: A built-in "Forgot password?" flow lets users reset their own password by answering the security question they chose at sign-up — no email provider or setup required.
* **Public Domain (optional)**: Put the journal on your own Cloudflare domain with a single token file. Traffic runs through a Cloudflare Tunnel, so your home IP is never exposed and no router port-forwarding is needed. See [Going public](#-going-public-your-own-domain-via-cloudflare-tunnel).

---

## 🔐 Accounts, Login & Encryption

The first time you open the site you'll land on a **Sign In / Create Account** screen that matches the dashboard theme.

* **Create Account**: Enter an email + password (min 6 characters). A fresh, empty, encrypted journal file is created just for you. The very first account created on a brand-new install automatically inherits any existing `database.json` so your original single-user history is never lost.
* **Sign In**: Log in and use the journal exactly as before — everything you see and save is scoped to *your* account only.
* **Forgot Password**: Click "Forgot password?", enter your email to fetch the security question you chose at sign-up, answer it, and set a new password — no email needed.
* **Log Out**: Use the red **Log Out** button at the bottom of the sidebar.

### Per-user data files

```text
data/
  secret.key            # AES master key (auto-generated, keep private — back it up!)
  users.json            # encrypted account registry (emails + bcrypt password hashes)
  journals/
    user1.enc           # independent encrypted journal for the 1st account
    user2.enc           # independent encrypted journal for the 2nd account
```

The entire `data/` folder is git-ignored and never leaves your machine.

### Enabling real password-reset emails (optional)

Reset links print to the server console by default. To send real emails, copy `.env.example` to `.env` and fill in your SMTP details (a Gmail [App Password](https://myaccount.google.com/apppasswords) works well):

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraddress@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM=AscendX Journal <youraddress@gmail.com>
```

---

## 🌐 Going public: your own domain via Cloudflare Tunnel

Want the journal reachable from anywhere on **your own domain** instead of just your Wi-Fi? AscendX uses a **Cloudflare Tunnel**. It creates a secure outbound-only connection from your PC to Cloudflare, so:

* **Your home IP stays hidden** — visitors only ever see Cloudflare, never your real address.
* **No router/port-forwarding** — nothing is exposed on your home network.
* **Free** — included with any domain you manage on Cloudflare.

```text
[ Visitor ] ──HTTPS──> [ Cloudflare Edge ] ──encrypted outbound tunnel──> [ Your PC: localhost:8082 ]
                         (yourdomain.com)                                   (home IP never exposed)
```

### One-time setup (~3 minutes)

> Prerequisite: your domain is already added to Cloudflare (its nameservers point to Cloudflare).

1. Open the **Zero Trust** dashboard: <https://one.dash.cloudflare.com> → **Networks → Tunnels → Create a tunnel**.
2. Choose **Cloudflared**, name it `ascendx`, and **Save**.
3. On the install screen, choose **Windows**. You'll see a command containing `--token eyJ...` — copy **just the token** (the long string after `--token`).
4. In your app folder (the one with `local-server.bat`), create a file named **`cloudflared.token`** and paste the token into it. Save.
5. Back in the dashboard, open the tunnel's **Public Hostname** tab → **Add a public hostname**:
   * **Subdomain**: leave **blank** (this serves your root domain).
   * **Domain**: select `yourdomain.com`.
   * **Path**: leave blank.
   * **Service**: Type **HTTP**, URL **`localhost:8082`**.
   * **Save**.

   > Tip: to also catch `www`, add a second public hostname with subdomain `www` pointing to the same `HTTP localhost:8082`.

### Launch

Run `local-server.bat` exactly like before. On first run it auto-downloads the tunnel client (`cloudflared.exe`), starts the server, and connects your domain. Your site is now live at **`https://yourdomain.com`** with HTTPS handled automatically by Cloudflare.

* **No `cloudflared.token` file?** The script just runs **local-only** (`http://localhost:8082`) — nothing breaks.
* **`cloudflared.token` is private** — it's git-ignored and must never be shared or committed; anyone with it can route your tunnel.

### Optional: start automatically on boot (no .bat needed)

To have the tunnel run as a background Windows service that survives reboots, run once in an **Administrator** Command Prompt (paste your token):

```bat
cloudflared.exe service install <your-token>
```

The server itself (`node server.js`) still needs to be running — keep using `local-server.bat`. The script automatically detects the installed `cloudflared` service, so it won't ask for a token file; it just launches the journal server while the service handles your domain.

---

## 📦 System Requirements

To operate AscendX locally on your network, your machine requires the following base infrastructure:

* **Core Runtime**: [Node.js (LTS Stable Build Version)](https://nodejs.org)
* **Internal Package Management**: Installed automatically via standard **npm** tools.
* **Operating Framework**: Standalone Windows Command Prompt compatibility (`.bat` scripting execution).

---

## 🔧 Installation & Initial Launch

1. **Download and Extract**: Save the folder container to your computer directory and name the root folder exactly `trading-journal`.
2. **Launch the Engine**: Double-click the `local-server.bat` file in your root directory. The batch script will automatically run an environment configuration check and pull down network modules via `npm install` on your first launch.
3. **Network Routing Access Link**: Once initialized, copy the link displayed in the server terminal log window:
   * **Host PC Access**: Open your browser and navigate directly to `http://localhost:8082`.
   * **iPad / iPhone Wi-Fi Access**: Navigate to your PC's broadcasted local network IP address (e.g., `http://192.168.1.45:8082`).
4. **Taking the Site Offline**: Simply close out the active command prompt terminal window on your main host computer.

---

## 🔒 Storage & Data Maintenance Safety

* **Storage Vector**: 100% of your account logs live locally within your host machine's hard drive files (`database.json`). No data ever leaves your computer or passes out to an external cloud data center.
* **Automatic Cache Migration**: Opening the updated application for the first time will automatically scan any existing browser cache data (`localStorage`) from older versions, migrate the histories forward, and commit them permanently to the host disk file database.

---

## ☕ Support the Platform

If you find this tracking matrix helpful for optimizing your trading setups, feel free to support continued development: 

[Buy me a coffee ☕](https://buymeacoffee.com/skrscripts)

---

## 📄 Legal License Framework

```text
Copyright (c) 2026. All Rights Reserved.

This software code and its accompanying design architectures are strictly proprietary. 
Permission is granted solely for private, non-commercial, non-redistributable personal use 
on the user's closed local area network. Selling, reproduction, modification for open public 
release, or exploitation of these assets under any monetization vector is strictly prohibited.
```
