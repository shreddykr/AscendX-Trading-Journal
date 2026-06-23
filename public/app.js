/* ==========================================================================
   ASCENDX ENGINE - PART 1: GLOBAL CONFIGURATIONS & CORE DATABASE SYNC
   ========================================================================== */

let accounts = []; 
let newsEventsRawList = []; // Caches raw structured news items for row grid feeding 
let activeAccountIndex = null; 
let currentDate = new Date(); 
let holdTimer = null, holdProgress = 0, holdTargetType = null, holdTargetId = null, selectedDayKey = null, lastHoldTimestamp = null; 
let activeSelectedEmojis = []; 

// Authentication Guard: confirms an active session before booting the dashboard
async function enforceAuthSession() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) { window.location.href = '/login.html'; return false; }
        const me = await res.json();
        const chip = document.getElementById('userEmailChip');
        if (chip && me.email) chip.textContent = me.email;
        return true;
    } catch (err) {
        window.location.href = '/login.html';
        return false;
    }
}

async function logoutCurrentUser() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
    window.location.href = '/login.html';
}

// Central Automated Data Processing Core 
async function loadStoredData() { 
    try { 
        const response = await fetch('/api/journal'); 
        if (response.status === 401) { window.location.href = '/login.html'; return; }
        const payload = await response.json(); 
        accounts = payload.journal || []; 
        newsEventsRawList = payload.newsRawFeed || []; // Safely extracts row list array package 
        
        if (accounts.length === 0) { 
            let legacy = localStorage.getItem('ascendx_journal') || localStorage.getItem('quantumx_journal'); 
            if (legacy) { 
                accounts = JSON.parse(legacy); 
                await saveAndBackup(); 
            } 
        } 
        renderTabs(); 
        if (accounts.length > 0) switchAccount(0); 
    } catch (err) { 
        console.error("Central database fetch failure:", err); 
    } 
} 

async function saveAndBackup() { 
    try { 
        await fetch('/api/journal', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(accounts) 
        }); 
    } catch (err) { 
        console.error("Central file save failure:", err); 
    } 
} 

async function init() { 
    const authed = await enforceAuthSession();
    if (!authed) return;
    loadStoredData(); 
    setupEventListeners(); 
    window.addEventListener('resize', renderPerformanceChart); 
} 

function getTotalPnL(a) { 
    return Object.values(a.data || {}).reduce((s, v) => s + parseFloat(v?.pnl || 0), 0); 
}
/* ==========================================================================
   ASCENDX ENGINE - PART 2: SIDEBAR ACCOUNT DECK NAVIGATION CONTROLLERS
   ========================================================================== */

function renderTabs() { 
    const accountTabs = document.getElementById('accountTabs'); 
    if (!accountTabs) return; 
    accountTabs.innerHTML = ''; 
    accounts.forEach((a, i) => { 
        const t = document.createElement('div'); 
        t.className = `account-tab ${i === activeAccountIndex ? 'active' : ''}`; 
        t.innerHTML = `<div><strong style="display:block;">${a.name}</strong><small style="color:var(--text-muted);font-size:0.75rem;">${a.market}</small></div> <span style="font-weight:bold;color:${getTotalPnL(a) >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'}">$${getTotalPnL(a).toFixed(0)}</span>`; 
        t.addEventListener('click', () => switchAccount(i)); 
        accountTabs.appendChild(t); 
    }); 
} 

function switchAccount(i) { 
    activeAccountIndex = i; 
    const activeAccountTitle = document.getElementById('activeAccountTitle'); 
    const accountBadge = document.getElementById('accountBadge'); 
    
    if (activeAccountTitle) activeAccountTitle.innerText = accounts[i].name; 
    if (accountBadge) accountBadge.innerText = accounts[i].market; 
    
    renderTabs(); 
    renderCalendar(); 
    animateCounters(); 
    renderPerformanceChart(); 
}
/* ==========================================================================
   ASCENDX ENGINE - PART 3: CALENDAR CELL GRID MATRIX GENERATOR
   ========================================================================== */

function renderCalendar() { 
    const calendarDays = document.getElementById('calendarDays'); 
    const calendarMonthYear = document.getElementById('calendarMonthYear'); 
    if (!calendarDays || !calendarMonthYear) return; 
    
    if (activeAccountIndex === null) { 
        calendarDays.innerHTML = '<div style="grid-column:span 7;text-align:center;padding:40px;color:var(--text-muted);">Add an account tracker.</div>'; 
        return; 
    } 
    calendarDays.innerHTML = ''; 
    let y = currentDate.getFullYear(), m = currentDate.getMonth(); 
    let data = accounts[activeAccountIndex].data || {}; 
    let currentMonthPnL = 0; 
    
    Object.keys(data).forEach(key => { 
        let parts = key.split('-'); 
        if (parseInt(parts[0]) === y && parseInt(parts[1]) === (m + 1)) { 
            currentMonthPnL += parseFloat(data[key]?.pnl || 0); 
        } 
    }); 
    
    let colorStyle = currentMonthPnL >= 0 ? 'color: var(--neon-green); text-shadow: 0 0 10px rgba(0,255,135,0.2);' : 'color: var(--neon-red); text-shadow: 0 0 10px rgba(255,0,85,0.2);'; 
    let formattedMonthPnL = currentMonthPnL >= 0 ? `+$${currentMonthPnL.toFixed(0)}` : `-$${Math.abs(currentMonthPnL).toFixed(0)}`; 
    calendarMonthYear.innerHTML = ` <span>${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span> <span style="font-size: 1.15rem; font-weight: 800; margin-left: 15px; ${colorStyle}">${formattedMonthPnL}</span> `; 
    
    let start = new Date(y, m, 1).getDay(), total = new Date(y, m + 1, 0).getDate(), today = new Date(); 
    let todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; 
    let allEntries = Object.values(data).filter(v => v && parseInt(v.trades) > 0); 
    let avgTradesBaseline = allEntries.length > 0 ? (allEntries.reduce((s, v) => s + parseInt(v.trades), 0) / allEntries.length) : 0; 
    
    for (let i = 0; i < start; i++) { 
        let b = document.createElement('div'); 
        b.style.visibility = 'hidden'; 
        calendarDays.appendChild(b); 
    } 
    
    for (let d = 1; d <= total; d++) { 
        let cell = document.createElement('div'); 
        cell.className = 'day-cell'; 
        let key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, val = data[key]; 
        if (key === todayStr) cell.classList.add('today-highlight'); 
        let txt = '', countTxt = '', emojiStringDeck = ''; 
        
        if (val !== undefined && val !== null) { 
            let pnlNum = parseFloat(val.pnl || 0), tradeNum = parseInt(val.trades || 0); 
            let savedEmojis = val.emojis || []; 
            if (pnlNum !== 0 || tradeNum !== 0 || savedEmojis.length > 0) { 
                txt = pnlNum >= 0 ? `+$${pnlNum.toFixed(0)}` : `-$${Math.abs(pnlNum).toFixed(0)}`; 
                countTxt = tradeNum === 1 ? '1 Trade' : `${tradeNum} Trades`; 
                cell.classList.add(pnlNum >= 0 ? 'profit' : 'loss'); 
                
                if (avgTradesBaseline > 0 && tradeNum > Math.ceil(avgTradesBaseline * 1.35) && tradeNum > 2) { 
                    cell.classList.add('overtraded-alert'); 
                    countTxt = `⚠️ Overtraded (${tradeNum})`; 
                } 
                if (savedEmojis.length > 0) { 
                    emojiStringDeck = `<div class="day-emoji-row">${savedEmojis.join(' ')}</div>`; 
                } 
            } 
        } 
        cell.innerHTML = `<div class="day-num">${d}</div><div class="day-pnl">${txt}</div><div class="day-trades">${countTxt}</div>${emojiStringDeck}`; 
        cell.addEventListener('click', () => openPnLModal(key)); 
        calendarDays.appendChild(cell); 
    } 
}
/* ==========================================================================
   ASCENDX ENGINE - PART 4: COUNTER SLOTS & 10-CARD ADVANCED STRATEGY MATH
   ========================================================================== */

function animateCounters() {
  if (activeAccountIndex === null) return;
  let data = accounts[activeAccountIndex].data || {};
  let vals = Object.values(data).map(v => v ? parseFloat(v.pnl) : 0).filter(v => v !== 0);
  let w = vals.filter(v => v > 0), l = vals.filter(v => v < 0);
  let wr = vals.length > 0 ? Math.round((w.length / vals.length) * 100) : 0, netPnL = vals.reduce((a, b) => a + b, 0);
  let gW = w.reduce((a, b) => a + b, 0), gL = Math.abs(l.reduce((a, b) => a + b, 0));
  let pf = gL > 0 ? (gW / gL).toFixed(2) : gW > 0 ? '99.9' : '0.00';
  let activeTradeDays = Object.values(data).filter(v => v && parseInt(v.trades) > 0);
  let totalTradesCount = activeTradeDays.reduce((s, v) => s + (parseInt(v.trades) || 0), 0);
  let avgTrades = activeTradeDays.length > 0 ? (totalTradesCount / activeTradeDays.length).toFixed(1) : '0.0';
  // Calculate an internal baseline average for the overtrading metric
  let avgTradesBaseline = activeTradeDays.length > 0 ? (totalTradesCount / activeTradeDays.length) : 0;

  slot('statNetPnL', 0, netPnL, '$');
  slot('statWinRate', 0, wr, '%');
  slot('statProfitFactor', 0, parseFloat(pf), 'num');
  const statAvgTrades = document.getElementById('statAvgTrades'), statGreenRed = document.getElementById('statGreenRed');
  if (statAvgTrades) statAvgTrades.innerText = `${avgTrades} / day`;
  if (statGreenRed) statGreenRed.innerText = `${w.length} G / ${l.length} R`;

  // ==========================================================================
  // ADVANCED STRATEGY ROW 2 DATA COMPILER ENGINE
  // ==========================================================================
  let winSum = w.reduce((a, b) => a + b, 0);
  let lossSum = Math.abs(l.reduce((a, b) => a + b, 0));
  let avgWinSize = w.length > 0 ? (winSum / w.length) : 0;
  let avgLossSize = l.length > 0 ? (lossSum / l.length) : 0;
  let maxWinSize = w.length > 0 ? Math.max(...w) : 0;
  let valPerTrade = totalTradesCount > 0 ? (netPnL / totalTradesCount) : 0;

  // Chronological timeline parser loops for the Peak-to-Valley Maximum Drawdown calculation
  let sortedDates = Object.keys(data).sort((a,b) => new Date(a) - new Date(b));
  let currentBal = 0, runningPeak = 0, maxDrawdown = 0;
  sortedDates.forEach(k => {
    currentBal += parseFloat(data[k]?.pnl || 0);
    if (currentBal > runningPeak) runningPeak = currentBal;
    let dd = runningPeak - currentBal;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  // Inject data directly into Row 2 container elements
  const sAvgWin = document.getElementById('statAvgWin'), sAvgLoss = document.getElementById('statAvgLoss'), sMaxDD = document.getElementById('statMaxDD'), sMaxWin = document.getElementById('statMaxWin'), sValTrade = document.getElementById('statValPerTrade');
  if (sAvgWin) { sAvgWin.innerText = '$' + avgWinSize.toFixed(0); sAvgWin.style.color = avgWinSize > 0 ? 'var(--neon-green)' : 'var(--text-main)'; }
  if (sAvgLoss) { sAvgLoss.innerText = '$' + avgLossSize.toFixed(0); sAvgLoss.style.color = avgLossSize > 0 ? 'var(--neon-red)' : 'var(--text-main)'; }
  if (sMaxDD) { sMaxDD.innerText = '$' + maxDrawdown.toFixed(0); sMaxDD.style.color = maxDrawdown > 0 ? 'var(--neon-red)' : 'var(--text-main)'; }
  if (sMaxWin) { sMaxWin.innerText = '$' + maxWinSize.toFixed(0); sMaxWin.style.color = maxWinSize > 0 ? 'var(--neon-green)' : 'var(--text-main)'; }
  if (sValTrade) { sValTrade.innerText = (valPerTrade >= 0 ? '+$' : '-$') + Math.abs(valPerTrade).toFixed(0); sValTrade.style.color = valPerTrade >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'; }

  // ==========================================================================
  // ADVANCED ROW 3 PSYCHOLOGICAL & SYSTEM DATA COMPILER ENGINE
  // ==========================================================================
  let winRateFraction = vals.length > 0 ? (w.length / vals.length) : 0;
  let ratioRewardRisk = avgLossSize > 0 ? (avgWinSize / avgLossSize) : avgWinSize;

  // 1. Calculate Trade Edge (Win Rate * Reward/Risk Ratio)
  let calculatedTradeEdge = (winRateFraction * ratioRewardRisk) - (1 - winRateFraction);

  // 2. Prop Firm Consistency % (Largest Single Day Profit / Total Net Profits)
  let consistencyPct = 0;
  if (netPnL > 0 && w.length > 0) {
    let maxSingleDayWin = Math.max(...w);
    consistencyPct = Math.round((maxSingleDayWin / netPnL) * 100);
  }

  // 3. Calculate Overtrade Frequency Percentage
  let overtradedDaysCount = activeTradeDays.filter(v => {
    let tNum = parseInt(v.trades) || 0;
    return avgTradesBaseline > 0 && tNum > Math.ceil(avgTradesBaseline * 1.35) && tNum > 2;
  }).length;
  let overtradePctValue = activeTradeDays.length > 0 ? Math.round((overtradedDaysCount / activeTradeDays.length) * 100) : 0;

  // 4. Calculate Extraction Efficiency Ratio (Total Net Profits / Largest Single Win)
  let extractionEfficiency = maxWinSize > 0 ? (netPnL / maxWinSize) : 0;

  // Inject data directly into Row 3 container elements
  const sEdge = document.getElementById('statTradeEdge'), sConsistency = document.getElementById('statConsistency'), sOver = document.getElementById('statOvertradePct'), sEff = document.getElementById('statEfficiency'), sTotalVolume = document.getElementById('statTotalVolume');
  if (sEdge) {
    sEdge.innerText = calculatedTradeEdge.toFixed(2);
    sEdge.style.color = calculatedTradeEdge >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
  }
  if (sConsistency) {
    sConsistency.innerText = consistencyPct + '%';
    // Turns red if you breach a standard 45% prop firm consistency limit
    sConsistency.style.color = consistencyPct > 45 ? 'var(--neon-red)' : 'var(--neon-green)';
  }
  if (sOver) {
    sOver.innerText = overtradePctValue + '%';
    sOver.style.color = overtradePctValue > 25 ? 'var(--neon-red)' : 'var(--text-main)';
  }
  if (sEff) {
    sEff.innerText = extractionEfficiency.toFixed(1) + 'x';
    sEff.style.color = extractionEfficiency >= 3 ? 'var(--neon-green)' : 'var(--text-main)';
  }
  // FIX: Maps the absolute total execution counts directly into your 15th card slot
  if (sTotalVolume) {
    sTotalVolume.innerText = totalTradesCount;
    sTotalVolume.style.color = 'var(--text-main)';
  }
}


function slot(id, s, e, mode) { 
    let obj = document.getElementById(id); 
    if (!obj) return; 
    let sT = null; 
    let step = (t) => { 
        if (!sT) sT = t; 
        let p = Math.min((t - sT) / 400, 1), v = p * (e - s) + s; 
        if (mode === '$') { 
            obj.innerHTML = v >= 0 ? `+$${v.toFixed(0)}` : `-$${Math.abs(v).toFixed(0)}`; 
            obj.style.color = e >= 0 ? 'var(--neon-green)' : 'var(--neon-red)'; 
        } else if (mode === '%') { 
            obj.innerHTML = Math.floor(v) + '%'; 
            obj.style.color = 'var(--text-main)'; 
        } else { 
            obj.innerHTML = v.toFixed(2); 
            obj.style.color = 'var(--text-main)'; 
        } 
        if (p < 1) window.requestAnimationFrame(step); 
    }; 
    window.requestAnimationFrame(step); 
}
/* ==========================================================================
   ASCENDX ENGINE - PART 5: CANVAS RE-RENDERING LINE GRID & PURGE OVERLAYS
   ========================================================================== */

function renderPerformanceChart() { 
    const canvas = document.getElementById('analyticsChart'); 
    if (!canvas || activeAccountIndex === null) return; 
    const ctx = canvas.getContext('2d'), dRect = canvas.parentElement.getBoundingClientRect(); 
    canvas.width = dRect.width || 800; 
    canvas.height = dRect.height || 350; 
    let rawData = accounts[activeAccountIndex].data || {}; 
    let sortedDates = Object.keys(rawData).sort((a,b) => new Date(a) - new Date(b)); 
    let cumulative = 0, points = []; 
    sortedDates.forEach(k => { 
        cumulative += parseFloat(rawData[k]?.pnl || 0); 
        points.push(cumulative); 
    }); 
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    if (points.length < 2) { 
        ctx.fillStyle = '#4a5568'; 
        ctx.font = '13px sans-serif'; 
        ctx.fillText("Log multi-day trades to map asset growth waves...", 30, canvas.height / 2); 
        return; 
    } 
    let max = Math.max(...points), min = Math.min(...points), range = max - min || 200; 
    let padX = 40, padY = 30, chartW = canvas.width - (padX * 2), chartH = canvas.height - (padY * 2); 
    ctx.strokeStyle = '#121824'; 
    ctx.lineWidth = 1; 
    ctx.beginPath(); 
    let baselineY = padY + chartH - ((0 - min) / range) * chartH; 
    ctx.moveTo(padX, baselineY); 
    ctx.lineTo(padX + chartW, baselineY); 
    ctx.stroke(); 
    let coords = points.map((p, i) => { 
        return { x: padX + (i / (points.length - 1)) * chartW, y: padY + chartH - ((p - min) / range) * chartH }; 
    }); 
    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = 2.5; 
    ctx.lineJoin = 'round'; 
    ctx.lineCap = 'round'; 
    ctx.shadowBlur = 10; 
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'; 
    ctx.beginPath(); 
    if (coords.length > 0) ctx.moveTo(coords[0].x, coords[0].y); 
    for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].x, coords[i].y); 
    ctx.stroke(); 
    ctx.shadowBlur = 0; 
} 

function populateSettingsAccounts() { 
    const settingsAccountList = document.getElementById('settingsAccountList'); 
    if (!settingsAccountList) return; 
    settingsAccountList.innerHTML = ''; 
    accounts.forEach((a, i) => { 
        let row = document.createElement('div'); 
        row.className = 'manage-item'; 
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:var(--panel-sub);padding:10px;border-radius:6px;border:1px solid #172030;margin-bottom:5px;'; 
        row.innerHTML = `<div><strong>${a.name}</strong><span style="font-size:0.75rem;color:var(--text-muted);display:block;">${a.market}</span></div><button class="single-delete-btn" data-index="${i}">Delete</button>`; 
        settingsAccountList.appendChild(row); 
    }); 
    document.querySelectorAll('.single-delete-btn').forEach(b => b.addEventListener('click', (e) => openCustomConfirmModal('individual', parseInt(e.target.getAttribute('data-index'))))); 
} 

function openCustomConfirmModal(type, targetId = null) { 
    const confirmWarningText = document.getElementById('confirmWarningText'), confirmModal = document.getElementById('confirmModal'), holdProgressBar = document.getElementById('holdProgressBar'), holdBtnText = document.getElementById('holdBtnText'); 
    holdTargetType = type; 
    holdTargetId = targetId; 
    holdProgress = 0; 
    if (holdProgressBar) holdProgressBar.style.width = '0%'; 
    if (holdBtnText) holdBtnText.innerText = "Hold to Confirm (5s)"; 
    if (confirmWarningText) confirmWarningText.innerText = type === 'all' ? "CRITICAL: Permanent wipe of ALL accounts and histories." : `CRITICAL: Deleting account calendar "${accounts[targetId]?.name}".`; 
    if (confirmModal) confirmModal.classList.add('open'); 
} 

function closeCustomConfirmModal() { 
    const confirmModal = document.getElementById('confirmModal'); 
    if (confirmModal) confirmModal.classList.remove('open'); 
    resetHoldTimer(); 
}
/* ==========================================================================
   ASCENDX ENGINE - PART 6: TIMER SYSTEM, ACTION LISTENERS & ACTIVE INITS
   ========================================================================== */

function startHoldTimer() { 
    const holdDeleteBtn = document.getElementById('holdDeleteBtn'); 
    if (holdTimer) window.cancelAnimationFrame(holdTimer); 
    lastHoldTimestamp = performance.now(); 
    if (holdDeleteBtn) holdDeleteBtn.classList.add('holding'); 
    function holdStep(now) { 
        const holdProgressBar = document.getElementById('holdProgressBar'), holdBtnText = document.getElementById('holdBtnText'); 
        let elapsed = now - lastHoldTimestamp; 
        holdProgress += (elapsed / 5000) * 100; 
        lastHoldTimestamp = now; 
        if (holdProgress > 100) holdProgress = 100; 
        if (holdProgressBar) holdProgressBar.style.width = `${holdProgress}%`; 
        let remaining = Math.max(0, (5000 - (holdProgress / 100 * 5000)) / 1000); 
        if (holdBtnText) holdBtnText.innerText = `HOLDING... (${remaining.toFixed(1)}s)`; 
        if (holdProgress >= 100) executeConfirmedPurge(); 
        else holdTimer = window.requestAnimationFrame(holdStep); 
    } 
    holdTimer = window.requestAnimationFrame(holdStep); 
}

function resetHoldTimer() { const holdDeleteBtn = document.getElementById('holdDeleteBtn'), holdProgressBar = document.getElementById('holdProgressBar'), holdBtnText = document.getElementById('holdBtnText'); if (holdTimer) window.cancelAnimationFrame(holdTimer); holdTimer = null; holdProgress = 0; if (holdProgressBar) holdProgressBar.style.width = '0%'; if (holdBtnText) holdBtnText.innerText = "Hold to Confirm (5s)"; if (holdDeleteBtn) holdDeleteBtn.classList.remove('holding'); } 

async function executeConfirmedPurge() { 
    const confirmModal = document.getElementById('confirmModal'), settingsModal = document.getElementById('settingsModal'), activeAccountTitle = document.getElementById('activeAccountTitle'), accountBadge = document.getElementById('accountBadge'); 
    if (holdTimer) window.cancelAnimationFrame(holdTimer); 
    holdTimer = null; 
    if (holdTargetType === 'all') { accounts = []; activeAccountIndex = null; } 
    else { accounts.splice(holdTargetId, 1); activeAccountIndex = accounts.length > 0 ? 0 : null; } 
    await saveAndBackup(); 
    if (confirmModal) confirmModal.classList.remove('open'); 
    if (settingsModal) settingsModal.classList.remove('open'); 
    populateSettingsAccounts(); 
    renderTabs(); 
    if (accounts.length > 0 && activeAccountIndex !== null) switchAccount(activeAccountIndex); 
    else { 
        if (activeAccountTitle) activeAccountTitle.innerText = "Select or Add an Account"; 
        if (accountBadge) accountBadge.innerText = "N/A"; 
        renderCalendar(); 
        animateCounters(); 
        renderPerformanceChart(); 
    } 
} 

function openPnLModal(key) {
    if (activeAccountIndex === null) return;
    selectedDayKey = key;
    const pnlModal = document.getElementById('pnlModal');
    const pnlModalTitle = document.getElementById('pnlModalTitle');
    const dailyPnLInput = document.getElementById('dailyPnLInput');
    const dailyTradesInput = document.getElementById('dailyTradesInput');
    if (pnlModalTitle) pnlModalTitle.innerText = `Log Trade: ${key}`;
    let currentEntry = accounts[activeAccountIndex].data[key] || { pnl: '', trades: '', emojis: [] };
    if (dailyPnLInput) dailyPnLInput.value = currentEntry.pnl;
    if (dailyTradesInput) dailyTradesInput.value = currentEntry.trades;
    activeSelectedEmojis = currentEntry.emojis ? [...currentEntry.emojis] : [];
    document.querySelectorAll('.emoji-tag-btn').forEach(btn => {
        let btnEmoji = btn.getAttribute('data-emoji');
        if (activeSelectedEmojis.includes(btnEmoji)) { btn.classList.add('selected-active'); }
        else { btn.classList.remove('selected-active'); }
    });
    if (pnlModal) pnlModal.classList.add('open');
}

function setupEventListeners() { 
    const settingsBtn = document.getElementById('settingsBtn'), settingsModal = document.getElementById('settingsModal'), closeSettingsBtn = document.getElementById('closeSettingsBtn'), triggerGlobalWipeBtn = document.getElementById('triggerGlobalWipeBtn'), addTabBtn = document.getElementById('addTabBtn'), tabModal = document.getElementById('tabModal'), closeModalBtn = document.getElementById('closeModalBtn'), saveAccountBtn = document.getElementById('saveAccountBtn'), pnlModal = document.getElementById('pnlModal'), closePnlModalBtn = document.getElementById('closePnlModalBtn'), savePnLBtn = document.getElementById('savePnLBtn'), holdDeleteBtn = document.getElementById('holdDeleteBtn'), closeConfirmBtn = document.getElementById('closeConfirmBtn'); 
    const newsTabBtn = document.getElementById('newsTabBtn'), closeNewsViewBtn = document.getElementById('closeNewsViewBtn'), calendarView = document.getElementById('calendarSectionView'), newsView = document.getElementById('newsSectionView'); 
    
    // Core Balance History & Manual Trade input element definitions
    const historyTabBtn = document.getElementById('historyTabBtn'), closeHistoryViewBtn = document.getElementById('closeHistoryViewBtn'), tradeLogView = document.getElementById('tradeLogSectionView');
    const openManualTradeModalBtn = document.getElementById('openManualTradeModalBtn'), closeManualTradeModalBtn = document.getElementById('closeManualTradeModalBtn'), manualTradeModal = document.getElementById('manualTradeModal');

    // Clean structural toggle logic: Switches views seamlessly between calendar and embedded news
    if (newsTabBtn && calendarView && newsView) { newsTabBtn.addEventListener('click', () => { calendarView.style.display = 'none'; newsView.style.display = 'block'; }); } 
    if (closeNewsViewBtn && calendarView && newsView) { closeNewsViewBtn.addEventListener('click', () => { newsView.style.display = 'none'; calendarView.style.display = 'block'; renderCalendar(); renderPerformanceChart(); }); } 
    
    // FIX: Toggles visibility for the new Balance History ledger interface panel view
    if (historyTabBtn && calendarView && tradeLogView) {
        historyTabBtn.addEventListener('click', () => { 
            calendarView.style.display = 'none'; 
            tradeLogView.style.display = 'block'; 
        });
    }
    if (closeHistoryViewBtn && calendarView && tradeLogView) {
        closeHistoryViewBtn.addEventListener('click', () => { 
            tradeLogView.style.display = 'none'; 
            calendarView.style.display = 'block'; 
            renderCalendar(); 
            renderPerformanceChart(); 
        });
    }

    // FIX: Toggles open/close visibility tracking for the manual trade ticket entry pop-up modal card
    if (openManualTradeModalBtn && manualTradeModal) openManualTradeModalBtn.addEventListener('click', () => manualTradeModal.classList.add('open'));
    if (closeManualTradeModalBtn && manualTradeModal) closeManualTradeModalBtn.addEventListener('click', () => manualTradeModal.classList.remove('open'));

    if (settingsBtn && settingsModal) settingsBtn.addEventListener('click', () => { populateSettingsAccounts(); settingsModal.classList.add('open'); }); 
    if (closeSettingsBtn && settingsModal) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('open')); 
    if (triggerGlobalWipeBtn) triggerGlobalWipeBtn.addEventListener('click', () => openCustomConfirmModal('all')); 
    if (addTabBtn && tabModal) addTabBtn.addEventListener('click', () => tabModal.classList.add('open')); 
    if (closeModalBtn && tabModal) closeModalBtn.addEventListener('click', () => tabModal.classList.remove('open')); 
    if (saveAccountBtn && tabModal) { 
        saveAccountBtn.addEventListener('click', async () => { 
            let name = document.getElementById('accName').value.trim(), market = document.getElementById('accMarket').value; if (!name) return alert('Name required.'); 
            accounts.push({ name: name, market: market, data: {} }); await saveAndBackup(); tabModal.classList.remove('open'); document.getElementById('accName').value = ''; switchAccount(accounts.length - 1); 
        }); 
    } 
    const prevMonth = document.getElementById('prevMonth'), nextMonth = document.getElementById('nextMonth'); 
    if (prevMonth) prevMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); renderPerformanceChart(); }); 
    if (nextMonth) nextMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); renderPerformanceChart(); }); 
    if (closePnlModalBtn && pnlModal) closePnlModalBtn.addEventListener('click', () => pnlModal.classList.remove('open')); 
    
    document.querySelectorAll('.emoji-tag-btn').forEach(btn => { 
        btn.addEventListener('click', (e) => { 
            let selectedEmoji = e.target.getAttribute('data-emoji'); 
            if (activeSelectedEmojis.includes(selectedEmoji)) { activeSelectedEmojis = activeSelectedEmojis.filter(em => em !== selectedEmoji); e.target.classList.remove('selected-active'); } 
            else { activeSelectedEmojis.push(selectedEmoji); e.target.classList.add('selected-active'); } 
        }); 
    }); 
    
    if (savePnLBtn && pnlModal) {
        savePnLBtn.addEventListener('click', async () => {
            const dailyPnLInput = document.getElementById('dailyPnLInput'), dailyTradesInput = document.getElementById('dailyTradesInput');
            let val = parseFloat(dailyPnLInput.value || 0), tradesVal = parseInt(dailyTradesInput.value || 0);
            if ((val === 0 || isNaN(val)) && (tradesVal === 0 || isNaN(tradesVal)) && activeSelectedEmojis.length === 0) { delete accounts[activeAccountIndex].data[selectedDayKey]; }
            else { accounts[activeAccountIndex].data[selectedDayKey] = { pnl: isNaN(val) ? 0 : val, trades: isNaN(tradesVal) ? 0 : tradesVal, emojis: [...activeSelectedEmojis] }; }
            await saveAndBackup(); pnlModal.classList.remove('open'); dailyPnLInput.value = ''; dailyTradesInput.value = ''; activeSelectedEmojis = [];
            if (val > 0) { document.body.classList.add('jackpot-flash'); setTimeout(() => document.body.classList.remove('jackpot-flash'), 600); }
            else if (val < 0) { document.body.classList.add('loss-flash'); setTimeout(() => document.body.classList.remove('loss-flash'), 600); }
            switchAccount(activeAccountIndex);
        });
    }
    if (holdDeleteBtn) {
        holdDeleteBtn.addEventListener('mousedown', startHoldTimer); holdDeleteBtn.addEventListener('mouseup', resetHoldTimer); holdDeleteBtn.addEventListener('mouseleave', resetHoldTimer);
        holdDeleteBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startHoldTimer(); }); holdDeleteBtn.addEventListener('touchend', resetHoldTimer); holdDeleteBtn.addEventListener('touchcancel', resetHoldTimer);
    }
    if (closeConfirmBtn) closeConfirmBtn.addEventListener('click', closeCustomConfirmModal);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logoutCurrentUser);
}


// Magnetic Pointer Follower Instantiation Loop (Concatenation Patch Fix)
document.addEventListener('DOMContentLoaded', () => {
    const interactiveGlowTargets = document.querySelectorAll('.stat-card, .nav-tab-btn, .settings-toggle-btn, .add-tab-btn, .calendar-day-box');
    
    interactiveGlowTargets.forEach(cardFrame => {
        const cursorCircle = document.createElement('div');
        cursorCircle.className = 'cursor-glow-circle-follower';
        cardFrame.appendChild(cursorCircle);
        
        cardFrame.addEventListener('mousemove', (e) => {
            const frameBounds = cardFrame.getBoundingClientRect();
            const posX = e.clientX - frameBounds.left;
            const posY = e.clientY - frameBounds.top;
            
            // FIX: Using regular string concatenation prevents the text parser from ever skipping or cutting off these layout variables
            cursorCircle.style.setProperty('--cursor-x', posX + 'px');
            cursorCircle.style.setProperty('--cursor-y', posY + 'px');
        });
    });
});


// ==========================================================================
// ASCENDX CASE-INSENSITIVE AUTOMATED CSV PARSING ENGINE
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const triggerCsvUploadBtn = document.getElementById('triggerCsvUploadBtn');
    const csvFileInputNode = document.getElementById('csvFileInputNode');
    const ledgerRowsViewportContainer = document.getElementById('ledgerRowsViewportContainer');
    const ledgerEmptyStateAnchor = document.getElementById('ledgerEmptyStateAnchor');

    if (triggerCsvUploadBtn && csvFileInputNode) {
        triggerCsvUploadBtn.addEventListener('click', () => {
            csvFileInputNode.click();
        });

        csvFileInputNode.addEventListener('change', (e) => {
            const uploadedFile = e.target.files[0];
            if (!uploadedFile) return;

            const fileReaderEngine = new FileReader();
            fileReaderEngine.onload = function(event) {
                const rawTextContents = event.target.result;
                const textLinesArray = rawTextContents.split('\n');

                if (textLinesArray.length <= 1) return alert('Selected CSV file is completely empty.');

                if (ledgerEmptyStateAnchor) ledgerEmptyStateAnchor.style.display = 'none';
                
                const placeholders = ledgerRowsViewportContainer.querySelectorAll('.empty-notice');
                placeholders.forEach(p => p.remove());

                // Build an automated index dictionary map by reading the column headers layout strings
                const headerRowString = textLinesArray[0].toLowerCase();
                const headers = headerRowString.split(',').map(h => h.trim().replace(/["']/g, ""));

                // Dynamic keyword matching targets both proprietary and institutional exports
                let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time') || h.includes('timestamp'));
                let sideIdx = headers.findIndex(h => h.includes('side') || h.includes('type') || h.includes('action') || h.includes('direction'));
                let pnlIdx = headers.findIndex(h => h.includes('p&l') || h.includes('pnl') || h.includes('profit') || h.includes('realized') || h.includes('net'));
                let notesIdx = headers.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('desc') || h.includes('message'));

                // Secure fallback logic routes to positional arrays if header fields are unnamed
                if (dateIdx === -1) dateIdx = 0;
                if (sideIdx === -1) sideIdx = 2;
                if (pnlIdx === -1) pnlIdx = 4;
                if (notesIdx === -1) notesIdx = 5;

                // Loop over raw content lines
                for (let i = 1; i < textLinesArray.length; i++) {
                    const rowTextLine = textLinesArray[i].trim();
                    if (!rowTextLine) continue;

                    // Clean comma segmentation loops that respect quotes
                    const columnDataCells = rowTextLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/["']/g, ""));

                    // Extract actual metrics directly using the mapped positions
                    const tradeDate = columnDataCells[dateIdx] || 'N/A';
                    let rawSideValue = (columnDataCells[sideIdx] || 'buy').toLowerCase().trim(); // FIX: Lowercases the text loop parameter to avoid sorting cuts
                    const rawPnLValue = columnDataCells[pnlIdx] || '0';
                    const tradeNotes = columnDataCells[notesIdx] || 'CSV statement fill entry.';

                    // Clean string numbers (strips currency characters to guarantee clean float parsing loops)
                    const parsedPnL = parseFloat(rawPnLValue.replace(/[\$\,\s]/g, '')) || 0;

                    // Standardize order side text tags to handle broker variants cleanly
                    let tradeSide = 'BUY';
                    if (rawSideValue.includes('sell') || rawSideValue.includes('short') || rawSideValue === 's') {
                        tradeSide = 'SELL';
                    } else if (rawSideValue.includes('buy') || rawSideValue.includes('long') || rawSideValue === 'b') {
                        tradeSide = 'BUY';
                    }

                    // Create a beautiful data row component matching your 4-column layout design perfectly
                    const ledgerRowItem = document.createElement('div');
                    ledgerRowItem.className = 'ledger-data-row';
                    ledgerRowItem.style.cssText = 'display: grid; grid-template-columns: 140px 90px 140px 1fr; padding: 12px 20px; background: #0c111a; border-bottom: 1px solid #172030; font-size: 0.9rem; align-items: center; transition: background 0.2s ease;';
                    
                    const pnlColorCode = parsedPnL >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
                    const formattedPnLString = parsedPnL >= 0 ? '+$' + parsedPnL.toFixed(2) : '-$' + Math.abs(parsedPnL).toFixed(2);

                    ledgerRowItem.innerHTML = `
                        <div style="color: var(--text-muted); font-size: 0.85rem;">${tradeDate}</div>
                        <div style="font-weight: 800; color: ${tradeSide === 'BUY' ? 'var(--neon-blue)' : 'var(--neon-gold)'};">${tradeSide}</div>
                        <div style="text-align: right; padding-right: 20px; font-weight: bold; color: ${pnlColorCode};">${formattedPnLString}</div>
                        <div style="color: var(--text-muted); font-size: 0.85rem; padding-left: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${tradeNotes}">${tradeNotes}</div>
                    `;

                    if (ledgerRowsViewportContainer) {
                        ledgerRowsViewportContainer.appendChild(ledgerRowItem);
                    }
                }
                csvFileInputNode.value = '';
            };
            fileReaderEngine.readAsText(uploadedFile);
        });
    }
});


// ==========================================================================
// INDEPENDENT STORAGE EXTENSION - PERSISTS LEDGER ROWS TO DISK AUTOMATICALLY
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const csvFileInputNode = document.getElementById('csvFileInputNode');
    if (!csvFileInputNode) return;

    // FIX: Removed the duplicate click listener so the file explorer only pops open once!
    csvFileInputNode.addEventListener('change', (e) => {
        if (activeAccountIndex === null || accounts.length === 0) {
            alert('Select an active account tracker first.');
            csvFileInputNode.value = '';
            return;
        }

        const uploadedFile = e.target.files;
        if (!uploadedFile || uploadedFile.length === 0) return;

        const fileReaderEngine = new FileReader();
        fileReaderEngine.onload = async function(event) {
            const rawTextContents = event.target.result;
            const textLinesArray = rawTextContents.split('\n');
            if (textLinesArray.length <= 1) return alert('Selected CSV file is empty.');

            if (!accounts[activeAccountIndex].tradesLedger) {
                accounts[activeAccountIndex].tradesLedger = [];
            }

            const headerRowString = textLinesArray[0].toLowerCase();
            const headers = headerRowString.split(',').map(h => h.trim().replace(/["']/g, ""));
            
            let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time'));
            let sideIdx = headers.findIndex(h => h.includes('side') || h.includes('type'));
            let pnlIdx = headers.findIndex(h => h.includes('p&l') || h.includes('pnl') || h.includes('profit'));
            let notesIdx = headers.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('desc'));

            if (dateIdx === -1) dateIdx = 0;
            if (sideIdx === -1) sideIdx = 2;
            if (pnlIdx === -1) pnlIdx = 4;
            if (notesIdx === -1) notesIdx = 5;

            for (let i = 1; i < textLinesArray.length; i++) {
                const rowTextLine = textLinesArray[i].trim();
                if (!rowTextLine) continue;

                const columnDataCells = rowTextLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/["']/g, ""));
                const tradeDate = columnDataCells[dateIdx] || 'N/A';
                let rawSideValue = (columnDataCells[sideIdx] || 'buy').toLowerCase().trim();
                const rawPnLValue = columnDataCells[pnlIdx] || '0';
                const tradeNotes = columnDataCells[notesIdx] || 'CSV statement entry log.';
                const parsedPnL = parseFloat(rawPnLValue.replace(/[\$\,\s]/g, '')) || 0;

                // FIX: Fuzzy scanner looks inside rawSideValue AND the full notes/row string for short/sell indicators
                let tradeSide = 'BUY';
                if (rawSideValue.includes('sell') || rawSideValue.includes('short') || rawSideValue === 's' || tradeNotes.toLowerCase().includes('short') || tradeNotes.toLowerCase().includes('sell') || rowTextLine.toLowerCase().includes('short')) {
                    tradeSide = 'SELL';
                }

                // FIX: Prevents trade duplication by checking if an identical timestamp and P&L already exist in your file database
                const tradeIsDuplicate = accounts[activeAccountIndex].tradesLedger.some(existingTrade => 
                    existingTrade.date === tradeDate && 
                    existingTrade.pnl === parsedPnL && 
                    existingTrade.side === tradeSide
                );

                if (!tradeIsDuplicate) {
                    accounts[activeAccountIndex].tradesLedger.push({
                        date: tradeDate,
                        side: tradeSide,
                        pnl: parsedPnL,
                        notes: tradeNotes
                    });
                }
            }

            await saveAndBackup();
            renderLedgerRowsFromDatabase();
            csvFileInputNode.value = '';
        };
        fileReaderEngine.readAsText(uploadedFile[0]);
    });
});

function renderLedgerRowsFromDatabase() {
    const container = document.getElementById('ledgerRowsViewportContainer');
    const emptyAnchor = document.getElementById('ledgerEmptyStateAnchor');
    if (!container) return;

    container.querySelectorAll('.ledger-data-row').forEach(row => row.remove());

    if (activeAccountIndex === null || accounts.length === 0 || !accounts[activeAccountIndex].tradesLedger || accounts[activeAccountIndex].tradesLedger.length === 0) {
        if (emptyAnchor) emptyAnchor.style.display = 'block';
        return;
    }
    if (emptyAnchor) emptyAnchor.style.display = 'none';

    accounts[activeAccountIndex].tradesLedger.forEach(trade => {
        const ledgerRowItem = document.createElement('div');
        ledgerRowItem.className = 'ledger-data-row';
        ledgerRowItem.style.cssText = 'display: grid; grid-template-columns: 140px 90px 140px 1fr; padding: 12px 20px; background: #0c111a; border-bottom: 1px solid #172030; font-size: 0.9rem; align-items: center;';
        
        const pnlColorCode = trade.pnl >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';
        const formattedPnLString = trade.pnl >= 0 ? '+$' + trade.pnl.toFixed(2) : '-$' + Math.abs(trade.pnl).toFixed(2);

        // FIX: Re-mapped the side tag colors to neon green for BUY/LONG and neon red for SELL/SHORT
        const sideColorCode = trade.side === 'BUY' ? 'var(--neon-green)' : 'var(--neon-red)';

        ledgerRowItem.innerHTML = `
            <div style="color: var(--text-muted); font-size: 0.85rem;">${trade.date}</div>
            <div style="font-weight: 800; color: ${sideColorCode};">${trade.side}</div>
            <div style="text-align: right; padding-right: 20px; font-weight: bold; color: ${pnlColorCode};">${formattedPnLString}</div>
            <div style="color: var(--text-muted); font-size: 0.85rem; padding-left: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${trade.notes}">${trade.notes}</div>
        `;
        container.appendChild(ledgerRowItem);
    });
}


if (typeof switchAccount !== 'undefined') {
    const backupOriginalSwitch = switchAccount;
    switchAccount = function(i) {
        backupOriginalSwitch(i);
        renderLedgerRowsFromDatabase();
    };
}

if (typeof loadStoredData !== 'undefined') {
    const backupOriginalLoad = loadStoredData;
    loadStoredData = async function() {
        await backupOriginalLoad();
        if (accounts.length > 0 && activeAccountIndex !== null) renderLedgerRowsFromDatabase();
    };
}


// ==========================================================================
// INDEPENDENT SETTINGS EXTENSION - SECURE HISTORY LONG-HOLD ENGINE HOOK
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const triggerHistoryWipeBtn = document.getElementById('triggerHistoryWipeBtn');
    if (!triggerHistoryWipeBtn) return;

    // Connects your new ledger purge button to your original 606-line hold verification modal
    triggerHistoryWipeBtn.addEventListener('click', () => {
        if (activeAccountIndex === null || accounts.length === 0) {
            alert('No active account tracker selected.');
            return;
        }
        
        // Closes settings panel layout and routes straight into your 5s hold modal engine
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.remove('open');

        if (typeof openCustomConfirmModal === 'function') {
            // Passes 'history' as the unique type identifier profile keyword
            openCustomConfirmModal('history', activeAccountIndex);
            
            // Updates the countdown modal warning banner box string dynamically
            const txt = document.getElementById('confirmWarningText');
            if (txt) {
                txt.innerText = 'CRITICAL USER VERIFICATION: You are about to initiate a secure 5-second long-hold erasure. This will permanently clear the Balance History statement ledger data records for account "' + accounts[activeAccountIndex].name + '".';
            }
        }
    });
});

// Intercepts your original confirmation execution loop to securely run the history purge step
if (typeof executeConfirmedPurge !== 'undefined') {
    const originalExecutePurge = executeConfirmedPurge;
    executeConfirmedPurge = async function() {
        // Checks if the holdTargetType variable matches our custom 'history' string parameter
        if (typeof holdTargetType !== 'undefined' && holdTargetType === 'history') {
            if (holdTimer) window.cancelAnimationFrame(holdTimer);
            holdTimer = null;

            if (activeAccountIndex !== null && accounts[activeAccountIndex]) {
                // Wipe only the current portfolio tab statement rows list data structure arrays
                accounts[activeAccountIndex].tradesLedger = [];
            }

            // Commits changes instantly straight down to your local hard drive file database.json
            if (typeof saveAndBackup === 'function') {
                await saveAndBackup();
            }

            // Close layout modals securely
            const confirmModal = document.getElementById('confirmModal');
            if (confirmModal) confirmModal.classList.remove('open');
            if (typeof populateSettingsAccounts === 'function') populateSettingsAccounts();
            if (typeof renderTabs === 'function') renderTabs();

            // Repaint layouts cleanly
            if (typeof switchAccount === 'function' && activeAccountIndex !== null) {
                switchAccount(activeAccountIndex);
            }
        } else {
            // Automatically falls back to handle your original global wipe or single tracker deletions
            await originalExecutePurge();
        }
    };
}

// ==========================================================================
// INDEPENDENT AUTO-UPDATER & GITHUB BUILD AUDITING NETWORK PIPELINE
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Declare your current build parameter string index properties
    const LOCAL_SYSTEM_VERSION = "v1.0.4-beta";
    
    // CHANGE THIS LINK: Point this link string straight to your raw GitHub file location
    // e.g., "https://githubusercontent.com"
    const REMOTE_GITHUB_TXT_URL = "https://raw.githubusercontent.com/shreddykr/AscendX-Trading-Journal/main/VERSIONS.txt";

    const statusSlot = document.getElementById('githubVersionStatusSlot');
    if (!statusSlot) return;

    async function checkSystemUpdatesFromRemote() {
        try {
            // Fires an offline network fetch query directly to the public GitHub asset arrays
            const response = await fetch(REMOTE_GITHUB_TXT_URL, { cache: "no-store" });
            if (!response.ok) throw new Error();

            // Clean string values by stripping trailing newlines or quotation clutter
            const remoteVersionRaw = await response.text();
            const remoteVersionClean = remoteVersionRaw.trim().toLowerCase().replace(/[v\r\n]/g, "");
            const localVersionClean = LOCAL_SYSTEM_VERSION.trim().toLowerCase().replace(/[v]/g, "");

            if (remoteVersionClean === localVersionClean) {
                // System matches remote file exactly: Render an active "Up to Date" badge layout
                statusSlot.innerText = "🟢 UP TO DATE";
                statusSlot.style.cssText = "font-weight: bold; font-size: 0.8rem; padding: 4px 10px; border-radius: 4px; background: rgba(0, 255, 135, 0.1); color: var(--neon-green); border: 1px solid rgba(0, 255, 135, 0.2);";
            } else {
                // Versions do not match: Prompt the user with a distinct warning tracker flash component
                statusSlot.innerText = "💥 UPDATE AVAILABLE (v" + remoteVersionClean + ")";
                statusSlot.style.cssText = "font-weight: bold; font-size: 0.8rem; padding: 4px 10px; border-radius: 4px; background: rgba(255, 0, 85, 0.1); color: var(--neon-red); border: 1px solid rgba(255, 0, 85, 0.3); animation: loss-flash 1.5s infinite ease-in-out;";
            }
        } catch (err) {
            // Graceful error route in case user is offline or GitHub repository path tracks are down
            statusSlot.innerText = "⚪ SYNC OFFLINE";
            statusSlot.style.cssText = "font-weight: bold; font-size: 0.8rem; padding: 4px 10px; border-radius: 4px; background: var(--panel-sub); color: var(--text-muted); border: 1px solid #172030;";
        }
    }

    // Initialize the checking cycle loop immediately upon system workspace instantiation
    checkSystemUpdatesFromRemote();
});



window.onload = init;
