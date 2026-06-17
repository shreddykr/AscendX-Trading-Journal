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

<img width="2557" height="857" alt="Screenshot 2026-06-17 163957" src="https://github.com/user-attachments/assets/11649354-69b0-4887-ad6b-e2951ac21af2" />
<img width="2557" height="860" alt="Screenshot 2026-06-17 163938" src="https://github.com/user-attachments/assets/f31b6ec2-26ec-4955-9c88-ca7ed956f8b2" />




<img width="720" height="562" alt="Screenshot 2026-06-16 222122" src="https://github.com/user-attachments/assets/679054b6-2da5-49dc-a274-6448a40fd5e1" />
<img width="670" height="647" alt="Screenshot 2026-06-16 222106" src="https://github.com/user-attachments/assets/d94c09cd-2e85-45fd-92ba-3356ddecc276" />


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
