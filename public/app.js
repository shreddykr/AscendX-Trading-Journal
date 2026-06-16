// Smart Data Converter & History Recovery Engine
function loadStoredData() {
    let rawQ = localStorage.getItem('quantumx_journal'), rawA = localStorage.getItem('ascendx_journal');
    let accQ = rawQ ? JSON.parse(rawQ) : [], accA = rawA ? JSON.parse(rawA) : [];
    let map = new Map();
    
    accQ.forEach(a => map.set(a.name, a));
    accA.forEach(a => {
        if (map.has(a.name)) map.get(a.name).data = Object.assign({}, map.get(a.name).data, a.data);
        else map.set(a.name, a);
    });
    
    let merged = Array.from(map.values());
    
    // Core Conversion Loop: Safely convert legacy raw numbers into the new format
    merged.forEach(account => {
        if (account.data) {
            Object.keys(account.data).forEach(dateKey => {
                let entry = account.data[dateKey];
                // If it is just a plain number or string from earlier, wrap it securely
                if (typeof entry !== 'object' || entry === null) {
                    account.data[dateKey] = {
                        pnl: parseFloat(entry || 0),
                        trades: entry ? 1 : 0 // Set a default baseline trade count so it loads cleanly
                    };
                }
            });
        }
    });
    
    localStorage.setItem('ascendx_journal', JSON.stringify(merged));
    return merged;
}

let accounts = loadStoredData(), activeAccountIndex = null, currentDate = new Date();
let holdTimer = null, holdProgress = 0, holdTargetType = null, holdTargetId = null, selectedDayKey = null;
let lastHoldTimestamp = null;

const accountTabs = document.getElementById('accountTabs'), addTabBtn = document.getElementById('addTabBtn');
const tabModal = document.getElementById('tabModal'), closeModalBtn = document.getElementById('closeModalBtn'), saveAccountBtn = document.getElementById('saveAccountBtn');
const activeAccountTitle = document.getElementById('activeAccountTitle'), accountBadge = document.getElementById('accountBadge');
const calendarDays = document.getElementById('calendarDays'), calendarMonthYear = document.getElementById('calendarMonthYear');
const settingsBtn = document.getElementById('settingsBtn'), settingsModal = document.getElementById('settingsModal'), closeSettingsBtn = document.getElementById('closeSettingsBtn'), settingsAccountList = document.getElementById('settingsAccountList'), triggerGlobalWipeBtn = document.getElementById('triggerGlobalWipeBtn');
const confirmModal = document.getElementById('confirmModal'), closeConfirmBtn = document.getElementById('closeConfirmBtn'), confirmWarningText = document.getElementById('confirmWarningText'), holdDeleteBtn = document.getElementById('holdDeleteBtn'), holdProgressBar = document.getElementById('holdProgressBar'), holdBtnText = document.getElementById('holdBtnText');

// Updated Input Field Targets to match the new dual fields
const pnlModal = document.getElementById('pnlModal'), closePnlModalBtn = document.getElementById('closePnlModalBtn'), savePnLBtn = document.getElementById('savePnLBtn');
const dailyPnLInput = document.getElementById('dailyPnLInput'), dailyTradesInput = document.getElementById('dailyTradesInput');

function init() { renderTabs(); if(accounts.length > 0) switchAccount(0); setupEventListeners(); }

function getTotalPnL(a) { 
    return Object.values(a.data || {}).reduce((s, v) => s + parseFloat(v?.pnl || 0), 0); 
}

function renderTabs() {
    accountTabs.innerHTML = '';
    accounts.forEach((a, i) => {
        const t = document.createElement('div');
        t.className = `account-tab ${i === activeAccountIndex ? 'active' : ''}`;
        t.innerHTML = `<div><strong style="display:block;">${a.name}</strong><small style="color:var(--text-muted);font-size:0.75rem;">${a.market}</small></div>
                       <span style="font-weight:bold;color:${getTotalPnL(a) >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}">$${getTotalPnL(a).toFixed(0)}</span>`;
        t.addEventListener('click', () => switchAccount(i));
        accountTabs.appendChild(t);
    });
}

function switchAccount(i) {
    activeAccountIndex = i;
    activeAccountTitle.innerText = accounts[i].name;
    accountBadge.innerText = accounts[i].market;
    renderTabs(); renderCalendar(); animateCounters();
}

function renderCalendar() {
    if (activeAccountIndex === null) { calendarDays.innerHTML = '<div style="grid-column:span 7;text-align:center;padding:40px;color:var(--text-muted);">Add an account tracker.</div>'; return; }
    calendarDays.innerHTML = '';
    let y = currentDate.getFullYear(), m = currentDate.getMonth();
    calendarMonthYear.innerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    let start = new Date(y, m, 1).getDay(), total = new Date(y, m + 1, 0).getDate(), today = new Date();
    let todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    for (let i = 0; i < start; i++) { let b = document.createElement('div'); b.style.visibility = 'hidden'; calendarDays.appendChild(b); }
    let data = accounts[activeAccountIndex].data || {};
    for (let d = 1; d <= total; d++) {
        let cell = document.createElement('div'); cell.className = 'day-cell';
        let key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, val = data[key];
        if (key === todayStr) cell.classList.add('today-highlight');
        
        let txt = '', countTxt = '';
        if (val !== undefined && val !== null) { 
            let pnlNum = parseFloat(val.pnl || 0);
            let tradeNum = parseInt(val.trades || 0);
            
            txt = pnlNum >= 0 ? `+$${pnlNum.toFixed(0)}` : `-$${Math.abs(pnlNum).toFixed(0)}`; 
            countTxt = tradeNum === 1 ? '1 Trade' : `${tradeNum} Trades`;
            cell.classList.add(pnlNum >= 0 ? 'profit' : 'loss'); 
        }
        
        cell.innerHTML = `
            <div class="day-num">${d}</div>
            <div class="day-pnl">${txt}</div>
            <div class="day-trades">${countTxt}</div>
        `;
        cell.addEventListener('click', () => openPnLModal(key));
        calendarDays.appendChild(cell);
    }
}

function animateCounters() {
    if (activeAccountIndex === null) return;
    let vals = Object.values(accounts[activeAccountIndex].data || {}).map(v => v ? parseFloat(v.pnl) : 0).filter(v => v !== 0);
    let w = vals.filter(v => v > 0), l = vals.filter(v => v < 0), total = vals.length;
    let wr = total > 0 ? Math.round((w.length / total) * 100) : 0, pnl = vals.reduce((a, b) => a + b, 0);
    let gW = w.reduce((a, b) => a + b, 0), gL = Math.abs(l.reduce((a, b) => a + b, 0));
    let pf = gL > 0 ? (gW / gL).toFixed(2) : gW > 0 ? '99.9' : '0.00';
    slot('statNetPnL', 0, pnl, '$'); slot('statWinRate', 0, wr, '%'); slot('statProfitFactor', 0, parseFloat(pf), 'num');
    slot('statAvgWin', 0, w.length > 0 ? (gW / w.length) : 0, '$'); slot('statAvgLoss', 0, l.length > 0 ? (gL / l.length) : 0, '-$');
    document.getElementById('statGreenRed').innerText = `${w.length} G / ${l.length} R`;
}

function slot(id, s, e, mode) {
    let obj = document.getElementById(id); if (!obj) return;
    let sT = null;
    let step = (t) => {
        if (!sT) sT = t; let p = Math.min((t - sT) / 400, 1), v = p * (e - s) + s;
        if (mode === '$') { obj.innerHTML = v >= 0 ? `+$${v.toFixed(0)}` : `-$${Math.abs(v).toFixed(0)}`; obj.style.color = e >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'; }
        else if (mode === '-$') { obj.innerHTML = `-$${Math.abs(v).toFixed(0)}`; obj.style.color = 'var(--neon-red)'; }
        else if (mode === '%') { obj.innerHTML = Math.floor(v) + '%'; obj.style.color = 'var(--accent-glow)'; }
        else { obj.innerHTML = v.toFixed(2); obj.style.color = 'var(--text-main)'; }
        if (p < 1) window.requestAnimationFrame(step);
    }; window.requestAnimationFrame(step);
}

function populateSettingsAccounts() {
    settingsAccountList.innerHTML = '';
    if (accounts.length === 0) { settingsAccountList.innerHTML = '<div style="color:var(--text-muted);padding:5px 0;">No trackers configured.</div>'; return; }
    accounts.forEach((a, i) => {
        let row = document.createElement('div'); row.className = 'manage-item';
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:var(--panel-sub);padding:10px;border-radius:6px;border:1px solid #172030;margin-bottom:5px;';
        row.innerHTML = `<div><strong>${a.name}</strong><span style="font-size:0.75rem;color:var(--text-muted);display:block;">${a.market}</span></div><button class="single-delete-btn" data-index="${i}">Delete</button>`;
        settingsAccountList.appendChild(row);
    });
    document.querySelectorAll('.single-delete-btn').forEach(b => b.addEventListener('click', (e) => openCustomConfirmModal('individual', parseInt(e.target.getAttribute('data-index')))));
}

function openCustomConfirmModal(type, targetId = null) {
    holdTargetType = type; holdTargetId = targetId; holdProgress = 0; holdProgressBar.style.width = '0%'; holdBtnText.innerText = "Hold to Confirm (5s)";
    confirmWarningText.innerText = type === 'all' ? "CRITICAL: Permanent wipe of ALL accounts and histories." : `CRITICAL: Deleting account calendar "${accounts[targetId]?.name}".`;
    confirmModal.classList.add('open');
}

function closeCustomConfirmModal() { confirmModal.classList.remove('open'); resetHoldTimer(); }

function startHoldTimer() {
    if (holdTimer) { window.cancelAnimationFrame(holdTimer); }
    lastHoldTimestamp = performance.now();
    holdDeleteBtn.classList.add('holding');
    
    function holdStep(now) {
        if (!holdDeleteBtn.classList.contains('holding')) return;
        let elapsed = now - lastHoldTimestamp;
        holdProgress += (elapsed / 5000) * 100;
        lastHoldTimestamp = now;
        
        if (holdProgress > 100) holdProgress = 100;
        holdProgressBar.style.width = `${holdProgress}%`;
        
        let remaining = Math.max(0, (5000 - (holdProgress / 100 * 5000)) / 1000);
        holdBtnText.innerText = `HOLDING... (${remaining.toFixed(1)}s)`;
        
        if (holdProgress >= 100) {
            executeConfirmedPurge();
        } else {
            holdTimer = window.requestAnimationFrame(holdStep);
        }
    }
    holdTimer = window.requestAnimationFrame(holdStep);
}

function resetHoldTimer() {
    if (holdTimer) { window.cancelAnimationFrame(holdTimer); }
    holdTimer = null;
    holdProgress = 0;
    holdProgressBar.style.width = '0%';
    holdBtnText.innerText = "Hold to Confirm (5s)";
    holdDeleteBtn.classList.remove('holding');
}

function executeConfirmedPurge() {
    if (holdTimer) window.cancelAnimationFrame(holdTimer);
    holdTimer = null;
    if (holdTargetType === 'all') { localStorage.removeItem('ascendx_journal'); localStorage.removeItem('quantumx_journal'); accounts = []; activeAccountIndex = null; }
    else { accounts.splice(holdTargetId, 1); activeAccountIndex = accounts.length > 0 ? 0 : null; localStorage.setItem('ascendx_journal', JSON.stringify(accounts)); }
    confirmModal.classList.remove('open'); settingsModal.classList.remove('open'); populateSettingsAccounts(); renderTabs();
    if (accounts.length > 0 && activeAccountIndex !== null) switchAccount(activeAccountIndex);
    else { activeAccountTitle.innerText = "Select or Add an Account"; accountBadge.innerText = "N/A"; renderCalendar(); animateCounters(); }
}

function setupEventListeners() {
    settingsBtn.addEventListener('click', () => { populateSettingsAccounts(); settingsModal.classList.add('open'); });
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('open'));
    triggerGlobalWipeBtn.addEventListener('click', () => openCustomConfirmModal('all'));
    addTabBtn.addEventListener('click', () => tabModal.classList.add('open'));
    closeModalBtn.addEventListener('click', () => tabModal.classList.remove('open'));
    
    saveAccountBtn.addEventListener('click', () => {
        let name = document.getElementById('accName').value.trim(), market = document.getElementById('accMarket').value;
        if (!name) return alert('Name required.');
        accounts.push({ name: name, market: market, data: {} }); localStorage.setItem('ascendx_journal', JSON.stringify(accounts));
        tabModal.classList.remove('open'); document.getElementById('accName').value = ''; switchAccount(accounts.length - 1);
    });
    
    document.getElementById('prevMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('nextMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    closePnlModalBtn.addEventListener('click', () => pnlModal.classList.remove('open'));
    
    savePnLBtn.addEventListener('click', () => {
        let val = parseFloat(dailyPnLInput.value); 
        let tradesVal = parseInt(dailyTradesInput.value || 0);
        
        if (isNaN(val)) return alert('Numeric values only.');
        
        // Save as a dual-metric structured container object
        accounts[activeAccountIndex].data[selectedDayKey] = {
            pnl: val,
            trades: tradesVal
        };
        
        localStorage.setItem('ascendx_journal', JSON.stringify(accounts));
        pnlModal.classList.remove('open');
        dailyPnLInput.value = '';
        dailyTradesInput.value = '';
        
        if (val > 0) { document.body.classList.add('jackpot-flash'); setTimeout(() => document.body.classList.remove('jackpot-flash'), 600); }
        switchAccount(activeAccountIndex);
    });

    holdDeleteBtn.addEventListener('mousedown', startHoldTimer);
    holdDeleteBtn.addEventListener('mouseup', closeCustomConfirmModal);
    holdDeleteBtn.addEventListener('mouseleave', closeCustomConfirmModal);
    
    holdDeleteBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startHoldTimer(); });
    holdDeleteBtn.addEventListener('touchend', closeCustomConfirmModal);
    holdDeleteBtn.addEventListener('touchcancel', closeCustomConfirmModal);
    
    closeConfirmBtn.addEventListener('click', closeCustomConfirmModal);
}

function openPnLModal(key) { 
    if (activeAccountIndex === null) return; 
    selectedDayKey = key; 
    document.getElementById('pnlModalTitle').innerText = `Log Trade: ${key}`; 
    
    let currentEntry = accounts[activeAccountIndex].data[key] || { pnl: '', trades: '' };
    dailyPnLInput.value = currentEntry.pnl; 
    dailyTradesInput.value = currentEntry.trades;
    
    pnlModal.classList.add('open'); 
}
window.onload = init;
