# AscendX Journal ⚡

AscendX is a locally hosted trading journal and calendar tracker designed to run within your private Wi-Fi network. Built using HTML5, CSS grid, and plain JavaScript, it automatically scales across PC, iPad, and mobile phone screens.

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

The application features a responsive layout designed to keep your metrics organized across different screen sizes.

<img width="2557" height="862" alt="AscendX Equity Cumulative Trendline Panel" src="https://github.com" />
<img width="2557" height="862" alt="AscendX Main Calendar Workspace Layout" src="https://github.com" />

---

## ✨ System Features

* **Multi-Device Data Sync**: Data is saved directly to your host PC's hard drive (`database.json`) instead of individual browser memory. Your PC, iPad, and phone all read and update the same file automatically over your Wi-Fi network.
* **5-Column Metrics Matrix**: Displays real-time calculations for cumulative Net P&L, Win Rate, Profit Factor, Average Trades per day, and Green vs Red winning/losing day counts.
* **Inline Monthly P&L**: Automatically calculates and displays the net profit or loss for the current month view directly in the calendar header. The number updates instantly when you switch months.
* **Centered Calendar Layout**: Date numbers are pinned to the top-left corner of each cell, keeping your P&L amounts and trade counts perfectly centered in the middle of the box.
* **Overtrading Alerts**: Tracks your moving active trade average. If you take significantly more trades than your usual baseline on a single day, the calendar cell automatically highlights with an orange dashed border and an overtraded warning.
* **Cumulative Performance Graph**: Displays a clean, white trendline chart directly underneath the calendar workspace to track your equity curve over time.
* **Data Correction**: If you log data onto the wrong day, opening that box, clearing the inputs (or entering `0`), and hitting save will completely remove that entry and reset the cell to normal.
* **Hold-to-Confirm Deletions**: Account removals and database wipes require holding down the confirmation button for 5 seconds to prevent accidental data loss.
* **Responsive Touch Sidebar**: The left sidebar layout features independent touch scrolling, allowing you to access menu settings on an iPad or phone without breaking the dashboard view.

---

## 📦 System Requirements

To run AscendX locally on your network, your machine requires:

* **Core Runtime**: [Node.js (LTS Version)](https://nodejs.org)
* **Package Management**: npm (installed automatically with Node.js)
* **Operating System**: Windows Command Prompt compatibility (`.bat` script execution)

---

## 🔧 Installation & Initial Launch

1. **Download and Extract**: Save the folder container to your computer directory and name the root folder exactly `trading-journal`.
2. **Launch the Server**: Double-click the `local-server.bat` file. On the first launch, it will automatically download the required Express library dependencies via `npm install`.
3. **Access the App**: Look at the command prompt window to find your access links:
   * **On the Host PC**: Type `http://localhost:8082` into your web browser.
   * **On iPad / Phone**: Connect to the same Wi-Fi network and type your PC's IP link (e.g., `http://192.168.1.45:8082`).
4. **Closing the App**: Simply close out the active command prompt terminal window on your main host computer to take the server offline.

---

## 🔒 Storage & Data Maintenance Safety

* **Storage Location**: 100% of your account logs live locally within your host machine's hard drive files (`database.json`). No data ever leaves your computer or is sent to external servers.
* **Legacy Cache Migration**: Opening this version for the first time will automatically scan for any existing browser cache data (`localStorage`) from older versions, migrate the histories forward, and save them permanently to the host disk file database.

---

## ☕ Support the Platform

If you find this tracking matrix helpful for organizing your trading setups, feel free to support continued development:

[Buy me a coffee ☕](https://buymeacoffee.com)

---

## 📄 Legal License Framework

```text
Copyright (c) 2026. All Rights Reserved.

This software code and its accompanying design architectures are strictly proprietary. 
Permission is granted solely for private, non-commercial, non-redistributable personal use 
on the user's closed local area network. Selling, reproduction, modification for open public 
release, or exploitation of these assets under any monetization vector is strictly prohibited.
```
