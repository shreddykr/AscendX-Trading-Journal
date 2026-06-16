# AscendX Journal ⚡

AscendX is a high-performance, locally hosted trading journal and calendar tracker designed to run exclusively within your private Wi-Fi network. Built using standalone vanilla JavaScript, HTML5, and fluid CSS grid matrices, it features an engaging, high-refresh dashboard layout engineered to maximize sensory visual feedback.

---

## 🛰️ Architecture Overview

```text
[ Your Local Host PC ] ──( Serves Site via Express Engine )──> [ Local Wi-Fi Router ]
          ▲                                                              │
          └─( Controlled by local-server.bat )                            ▼
                                                       [ Accessible on Any Connected Device ]
                                                       (Phone / Tablet / Laptop via Port 8082)
```

---

## 📹 Visual Dashboard Interface

The application utilizes an advanced, hardware-accelerated user viewport engineered to fit ultra-wide monitors, 4K television hubs, and multi-device platforms seamlessly.

<img width="2556" height="862" alt="Screenshot 2026-06-16 145341" src="https://github.com/user-attachments/assets/208eb03e-5eaf-48aa-91f8-4f9366589e09" />

## ✨ System Features

* **Modular Tracking Categories**: Establish infinite tracking profiles parsed dynamically by asset classifications (Indices, Equities, Crypto, Forex).
* **Perfect Multi-Line Centering**: Date numbers anchor tightly in the corner margins, forcing P&L gains and total trade counts directly down the centerline of the cells.
* **165Hz Hold Verification**: Secure data wipes rely on a sub-millisecond timer loop syncing frame rates directly to high-refresh gaming displays for a silky-smooth fill bar animation.
* **Fluid Geometry Grid Layout**: The system auto-fits 4K TVs, default viewports, and extreme ultrawides by mapping components into percentage-based scaling boundaries.
* **Legacy Cache Migration**: Old data from previous versions automatically converts, merges, and adapts forward into the new complex tracking container without data loss.

---

## 📦 System Requirements

To operate AscendX locally on your home network, your machine requires the following base infrastructure dependencies:

* **Core Runtime**: [Node.js (LTS Stable Build Version)](https://nodejs.org)
* **Internal Package Management**: Installed automatically via **npm** tools.
* **Operating Framework**: Standalone Windows Command Prompt compatibility (`.bat` scripting engine execution authorization).

---

## 🔧 Installation & Initial Launch

1. **Download and Extract**: Save the folder container to your computer directory and name the folder exactly `trading-journal`.
2. **Launch the Engine**: Double-click the `local-server.bat` file in your root folder. The batch tool will detect environment settings and download dependencies via `npm install` automatically.
3. **Verify Local Ports**: Ensure that your configuration files are routing correctly through your system's open channels:
   * **TCP Network Link Port**: `8082`
   * **Alternative Sync Channel Ports**: `9601` (Reserved)
4. **Access the App**: Open your browser and navigate to `http://localhost:8082` on the host machine, or use your local IP configuration link on any mobile device over Wi-Fi.

---

## 🔒 Storage Maintenance Safety

* **Storage Vector**: 100% of your account logs live locally within your browser's native **`localStorage`** profile cache partition. 
* **Cache Warning**: Standard cookie clears are safe. However, running deep system cleansing programs or wiping website databases entirely will clear your data logs.

---

## ☕ Support the Platform

If you find this tracking matrix helpful for optimizing your trading setups, feel free to support continued development:

[![Buy Me A Coffee](https://buymeacoffee.com/skrscripts)

---

## 📄 Legal License Framework

```text
Copyright (c) 2026. All Rights Reserved.

This software code and its accompanying design architectures are strictly proprietary. 
Permission is granted solely for private, non-commercial, non-redistributable personal use 
on the user's closed local area network. Selling, reproduction, modification for open public 
release, or exploitation of these assets under any monetization vector is strictly prohibited.
```
