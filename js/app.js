/**
 * GTA 6 Online Payout & Heist Calculator - Application Controller
 * Handles UI interactions, state synchronization, URL sharing, and data rendering.
 */

(function () {
  'use strict';

  // State object
  const state = {
    activities: [],
    meta: {
      lastUpdated: '2026-11-22',
      status: 'PLACEHOLDER_ESTIMATES'
    },
    activeTab: 'splitter',
    splitter: {
      selectedActivityId: 'port-gellhorn-vault',
      totalTake: 2450000,
      setupCost: 100000,
      fencingFeePct: 10,
      crewSupportCut: 0,
      damageLoss: 0,
      reimburseSetup: false,
      numPlayers: 4,
      cuts: [40, 20, 20, 20]
    },
    hourly: {
      payout: 2450000,
      timeMinutes: 45
    },
    goal: {
      targetPrice: 3500000,
      currentBalance: 750000,
      selectedActivityId: 'port-gellhorn-vault'
    },
    cheatSheet: {
      searchQuery: '',
      categoryFilter: 'all',
      difficultyFilter: 'all',
      soloOnly: false,
      sortBy: 'hourlyRate',
      sortAsc: false
    }
  };

  // DOM Elements Cache
  const DOM = {};

  function init() {
    cacheDOMElements();
    setupEventListeners();
    loadActivities()
      .then(() => {
        restoreStateFromUrl();
        renderAll();
      })
      .catch((err) => {
        console.warn('Failed to fetch activities.json, loading fallback dataset:', err);
        loadFallbackActivities();
        restoreStateFromUrl();
        renderAll();
      });

    checkCookieConsent();
  }

  function cacheDOMElements() {
    DOM.tabButtons = document.querySelectorAll('.tab-btn');
    DOM.toolPanels = document.querySelectorAll('.tool-panel');

    // Live Result Banner
    DOM.liveTitle = document.getElementById('live-title');
    DOM.statBox1Label = document.getElementById('stat-1-label');
    DOM.statBox1Val = document.getElementById('stat-1-val');
    DOM.statBox1Sub = document.getElementById('stat-1-sub');

    DOM.statBox2Label = document.getElementById('stat-2-label');
    DOM.statBox2Val = document.getElementById('stat-2-val');
    DOM.statBox2Sub = document.getElementById('stat-2-sub');

    DOM.statBox3Label = document.getElementById('stat-3-label');
    DOM.statBox3Val = document.getElementById('stat-3-val');
    DOM.statBox3Sub = document.getElementById('stat-3-sub');

    DOM.statBox4Label = document.getElementById('stat-4-label');
    DOM.statBox4Val = document.getElementById('stat-4-val');
    DOM.statBox4Sub = document.getElementById('stat-4-sub');

    DOM.btnCopyResult = document.getElementById('btn-copy-result');
    DOM.btnShareLink = document.getElementById('btn-share-link');

    // Splitter Elements
    DOM.activitySelect = document.getElementById('splitter-activity-select');
    DOM.totalTakeInput = document.getElementById('splitter-total-take');
    DOM.setupCostInput = document.getElementById('splitter-setup-cost');
    DOM.fencingPctInput = document.getElementById('splitter-fencing-pct');
    DOM.fencingSlider = document.getElementById('splitter-fencing-slider');
    DOM.damageLossInput = document.getElementById('splitter-damage-loss');
    DOM.crewSupportInput = document.getElementById('splitter-crew-support');
    DOM.reimburseSetupCheckbox = document.getElementById('splitter-reimburse-setup');
    DOM.playerCountChips = document.querySelectorAll('.btn-player-count');
    DOM.btnFairSplit = document.getElementById('btn-fair-split');
    DOM.btnLeaderSplit = document.getElementById('btn-leader-split');
    DOM.playersContainer = document.getElementById('players-list-container');
    DOM.cutValidationBar = document.getElementById('cut-validation-bar');
    DOM.cutValidationText = document.getElementById('cut-validation-text');

    // Hourly Elements
    DOM.hourlyPayoutInput = document.getElementById('hourly-payout');
    DOM.hourlyTimeInput = document.getElementById('hourly-time');
    DOM.hourlyTimeSlider = document.getElementById('hourly-time-slider');
    DOM.hourlyResultDisplay = document.getElementById('hourly-result-display');
    DOM.hourlyActivitiesTbody = document.getElementById('hourly-activities-tbody');

    // Goal Elements
    DOM.goalTargetInput = document.getElementById('goal-target');
    DOM.goalBalanceInput = document.getElementById('goal-balance');
    DOM.goalActivitySelect = document.getElementById('goal-activity-select');
    DOM.goalProgressBar = document.getElementById('goal-progress-fill');
    DOM.goalProgressPercent = document.getElementById('goal-progress-percent');
    DOM.goalRunsNeeded = document.getElementById('goal-runs-needed');
    DOM.goalTotalTime = document.getElementById('goal-total-time');
    DOM.goalNeededCash = document.getElementById('goal-needed-cash');
    DOM.goalSurplusCash = document.getElementById('goal-surplus-cash');
    DOM.goalFastestPath = document.getElementById('goal-fastest-path');
    DOM.goalPresetChips = document.querySelectorAll('.btn-goal-preset');

    // Cheat Sheet Elements
    DOM.csSearchInput = document.getElementById('cs-search-input');
    DOM.csCategoryFilter = document.getElementById('cs-category-filter');
    DOM.csSoloCheckbox = document.getElementById('cs-solo-checkbox');
    DOM.csTbody = document.getElementById('cheat-sheet-tbody');

    // Toast & Modals
    DOM.toastContainer = document.getElementById('toast-container');
    DOM.cookieBanner = document.getElementById('cookie-banner');
    DOM.btnAcceptCookies = document.getElementById('btn-accept-cookies');
    DOM.btnDeclineCookies = document.getElementById('btn-decline-cookies');
    DOM.dialogs = document.querySelectorAll('dialog.modal-dialog');
  }

  function setupEventListeners() {
    // Navigation Tabs
    DOM.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Splitter events
    if (DOM.activitySelect) {
      DOM.activitySelect.addEventListener('change', (e) => {
        const actId = e.target.value;
        state.splitter.selectedActivityId = actId;
        const act = state.activities.find(a => a.id === actId);
        if (act) {
          state.splitter.totalTake = act.basePayout;
          state.splitter.setupCost = act.setupCost || 0;
          state.splitter.fencingFeePct = act.fencingFeePct || 0;
          if (act.playersMin && state.splitter.numPlayers < act.playersMin) {
            setPlayerCount(act.playersMin);
          } else {
            renderSplitterInputs();
            calculateAndRenderSplitter();
          }
        }
      });
    }

    if (DOM.totalTakeInput) {
      DOM.totalTakeInput.addEventListener('input', (e) => {
        state.splitter.totalTake = Calculator.parseNumber(e.target.value, 0, 0);
        calculateAndRenderSplitter();
      });
    }

    if (DOM.setupCostInput) {
      DOM.setupCostInput.addEventListener('input', (e) => {
        state.splitter.setupCost = Calculator.parseNumber(e.target.value, 0, 0);
        calculateAndRenderSplitter();
      });
    }

    if (DOM.fencingPctInput && DOM.fencingSlider) {
      DOM.fencingPctInput.addEventListener('input', (e) => {
        const val = Calculator.parseNumber(e.target.value, 0, 0, 100);
        state.splitter.fencingFeePct = val;
        DOM.fencingSlider.value = val;
        calculateAndRenderSplitter();
      });
      DOM.fencingSlider.addEventListener('input', (e) => {
        const val = Calculator.parseNumber(e.target.value, 0, 0, 100);
        state.splitter.fencingFeePct = val;
        DOM.fencingPctInput.value = val;
        calculateAndRenderSplitter();
      });
    }

    if (DOM.damageLossInput) {
      DOM.damageLossInput.addEventListener('input', (e) => {
        state.splitter.damageLoss = Calculator.parseNumber(e.target.value, 0, 0);
        calculateAndRenderSplitter();
      });
    }

    if (DOM.crewSupportInput) {
      DOM.crewSupportInput.addEventListener('input', (e) => {
        state.splitter.crewSupportCut = Calculator.parseNumber(e.target.value, 0, 0);
        calculateAndRenderSplitter();
      });
    }

    if (DOM.reimburseSetupCheckbox) {
      DOM.reimburseSetupCheckbox.addEventListener('change', (e) => {
        state.splitter.reimburseSetup = e.target.checked;
        calculateAndRenderSplitter();
      });
    }

    DOM.playerCountChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const count = parseInt(chip.dataset.count, 10);
        setPlayerCount(count);
      });
    });

    if (DOM.btnFairSplit) {
      DOM.btnFairSplit.addEventListener('click', () => {
        state.splitter.cuts = Calculator.calculateFairSplit(state.splitter.numPlayers);
        renderPlayerCutInputs();
        calculateAndRenderSplitter();
        showToast('Even split applied');
      });
    }

    if (DOM.btnLeaderSplit) {
      DOM.btnLeaderSplit.addEventListener('click', () => {
        state.splitter.cuts = Calculator.calculateStandardLeaderSplit(state.splitter.numPlayers);
        renderPlayerCutInputs();
        calculateAndRenderSplitter();
        showToast('Leader split applied');
      });
    }

    // Hourly Events
    if (DOM.hourlyPayoutInput) {
      DOM.hourlyPayoutInput.addEventListener('input', (e) => {
        state.hourly.payout = Calculator.parseNumber(e.target.value, 0, 0);
        calculateAndRenderHourly();
      });
    }

    if (DOM.hourlyTimeInput && DOM.hourlyTimeSlider) {
      DOM.hourlyTimeInput.addEventListener('input', (e) => {
        const val = Calculator.parseNumber(e.target.value, 1, 1, 300);
        state.hourly.timeMinutes = val;
        DOM.hourlyTimeSlider.value = val;
        calculateAndRenderHourly();
      });
      DOM.hourlyTimeSlider.addEventListener('input', (e) => {
        const val = Calculator.parseNumber(e.target.value, 1, 1, 300);
        state.hourly.timeMinutes = val;
        DOM.hourlyTimeInput.value = val;
        calculateAndRenderHourly();
      });
    }

    // Goal Events
    if (DOM.goalTargetInput) {
      DOM.goalTargetInput.addEventListener('input', (e) => {
        state.goal.targetPrice = Calculator.parseNumber(e.target.value, 0, 0);
        calculateAndRenderGoal();
      });
    }

    if (DOM.goalBalanceInput) {
      DOM.goalBalanceInput.addEventListener('input', (e) => {
        state.goal.currentBalance = Calculator.parseNumber(e.target.value, 0, 0);
        calculateAndRenderGoal();
      });
    }

    if (DOM.goalActivitySelect) {
      DOM.goalActivitySelect.addEventListener('change', (e) => {
        state.goal.selectedActivityId = e.target.value;
        calculateAndRenderGoal();
      });
    }

    DOM.goalPresetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const price = parseInt(chip.dataset.price, 10);
        state.goal.targetPrice = price;
        DOM.goalTargetInput.value = price;
        DOM.goalPresetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        calculateAndRenderGoal();
      });
    });

    // Cheat Sheet Events
    if (DOM.csSearchInput) {
      DOM.csSearchInput.addEventListener('input', (e) => {
        state.cheatSheet.searchQuery = e.target.value.toLowerCase().trim();
        renderCheatSheet();
      });
    }

    if (DOM.csCategoryFilter) {
      DOM.csCategoryFilter.addEventListener('change', (e) => {
        state.cheatSheet.categoryFilter = e.target.value;
        renderCheatSheet();
      });
    }

    if (DOM.csSoloCheckbox) {
      DOM.csSoloCheckbox.addEventListener('change', (e) => {
        state.cheatSheet.soloOnly = e.target.checked;
        renderCheatSheet();
      });
    }

    // Copy Result and Share Link Buttons
    if (DOM.btnCopyResult) {
      DOM.btnCopyResult.addEventListener('click', copyFormattedResult);
    }
    if (DOM.btnShareLink) {
      DOM.btnShareLink.addEventListener('click', copyShareableLink);
    }

    // Modal triggers and close buttons
    document.querySelectorAll('[data-open-modal]').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = trigger.getAttribute('data-open-modal');
        const modal = document.getElementById(modalId);
        if (modal && typeof modal.showModal === 'function') {
          modal.showModal();
        }
      });
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('dialog');
        if (modal) modal.close();
      });
    });

    // Close modal on backdrop click
    DOM.dialogs.forEach(dialog => {
      dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) dialog.close();
      });
    });

    // Cookie consent buttons
    if (DOM.btnAcceptCookies) {
      DOM.btnAcceptCookies.addEventListener('click', () => {
        localStorage.setItem('gta_calc_cookie_consent', 'accepted');
        DOM.cookieBanner.classList.remove('visible');
        showToast('Preferences saved');
      });
    }
    if (DOM.btnDeclineCookies) {
      DOM.btnDeclineCookies.addEventListener('click', () => {
        localStorage.setItem('gta_calc_cookie_consent', 'declined');
        DOM.cookieBanner.classList.remove('visible');
        showToast('Non-essential cookies declined');
      });
    }
  }

  // Load activities from JSON
  async function loadActivities() {
    const res = await fetch('./data/activities.json');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    state.activities = data.activities || [];
    state.meta = data.meta || state.meta;
    populateActivityDropdowns();
  }

  // Fallback if running from file:// or fetch fails
  function loadFallbackActivities() {
    state.activities = [
      {
        id: "port-gellhorn-vault",
        name: "Port Gellhorn Container Depository",
        category: "Major Heist",
        basePayout: 2450000,
        timeMinutes: 45,
        playersMin: 1,
        playersMax: 4,
        difficulty: "Hard",
        setupCost: 100000,
        fencingFeePct: 10,
        recommendedSolo: true,
        notes: "Best solo grinding heist estimate."
      },
      {
        id: "vice-city-marina-heist",
        name: "Vice City Superyacht Syndicate",
        category: "Major Heist",
        basePayout: 3600000,
        timeMinutes: 60,
        playersMin: 2,
        playersMax: 4,
        difficulty: "Very Hard",
        setupCost: 150000,
        fencingFeePct: 12,
        recommendedSolo: false,
        notes: "Requires at least 2 players for dual keycards."
      },
      {
        id: "bayshore-car-smuggling",
        name: "Bayshore Exotic Auto Import/Export",
        category: "Vehicle Cargo",
        basePayout: 420000,
        timeMinutes: 18,
        playersMin: 1,
        playersMax: 4,
        difficulty: "Medium",
        setupCost: 20000,
        fencingFeePct: 5,
        recommendedSolo: true,
        notes: "Top-tier exotic car delivery."
      }
    ];
    populateActivityDropdowns();
  }

  function populateActivityDropdowns() {
    if (DOM.activitySelect) {
      DOM.activitySelect.innerHTML = state.activities.map(act => 
        `<option value="${act.id}" ${act.id === state.splitter.selectedActivityId ? 'selected' : ''}>${act.name} (${Calculator.formatCompactCurrency(act.basePayout)})</option>`
      ).join('');
    }

    if (DOM.goalActivitySelect) {
      DOM.goalActivitySelect.innerHTML = state.activities.map(act => 
        `<option value="${act.id}" ${act.id === state.goal.selectedActivityId ? 'selected' : ''}>${act.name} (${Calculator.formatCompactCurrency(act.basePayout)} / ${act.timeMinutes}m)</option>`
      ).join('');
    }

    if (DOM.csCategoryFilter) {
      const categories = Array.from(new Set(state.activities.map(a => a.category))).filter(Boolean);
      DOM.csCategoryFilter.innerHTML = `<option value="all">All Categories</option>` + 
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    DOM.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    DOM.toolPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    updateLiveSummaryHeader();

    // Trigger calculation for the tab
    if (tabId === 'splitter') calculateAndRenderSplitter();
    if (tabId === 'hourly') calculateAndRenderHourly();
    if (tabId === 'goal') calculateAndRenderGoal();
    if (tabId === 'cheatsheet') renderCheatSheet();

    // Update URL hash smoothly
    if (history.replaceState) {
      history.replaceState(null, '', `#${tabId}`);
    }
  }

  function updateLiveSummaryHeader() {
    switch (state.activeTab) {
      case 'splitter':
        DOM.liveTitle.textContent = 'Live split summary';
        break;
      case 'hourly':
        DOM.liveTitle.textContent = 'Profitability & hourly yield';
        break;
      case 'goal':
        DOM.liveTitle.textContent = 'Goal grind path';
        break;
      case 'cheatsheet':
        DOM.liveTitle.textContent = 'Activities overview';
        break;
    }
  }

  function setPlayerCount(count) {
    state.splitter.numPlayers = count;
    DOM.playerCountChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.count, 10) === count);
    });

    // Adjust cuts array length
    if (state.splitter.cuts.length !== count) {
      state.splitter.cuts = Calculator.calculateFairSplit(count);
    }

    renderPlayerCutInputs();
    calculateAndRenderSplitter();
  }

  function renderSplitterInputs() {
    if (DOM.totalTakeInput) DOM.totalTakeInput.value = state.splitter.totalTake;
    if (DOM.setupCostInput) DOM.setupCostInput.value = state.splitter.setupCost;
    if (DOM.fencingPctInput) DOM.fencingPctInput.value = state.splitter.fencingFeePct;
    if (DOM.fencingSlider) DOM.fencingSlider.value = state.splitter.fencingFeePct;
    if (DOM.damageLossInput) DOM.damageLossInput.value = state.splitter.damageLoss;
    if (DOM.crewSupportInput) DOM.crewSupportInput.value = state.splitter.crewSupportCut;
    if (DOM.reimburseSetupCheckbox) DOM.reimburseSetupCheckbox.checked = state.splitter.reimburseSetup;
  }

  function renderPlayerCutInputs() {
    if (!DOM.playersContainer) return;

    let html = '';
    for (let i = 0; i < state.splitter.numPlayers; i++) {
      const isLeader = i === 0;
      const cutVal = state.splitter.cuts[i] || 0;
      html += `
        <div class="player-row ${isLeader ? 'is-leader' : ''}" data-player-index="${i}">
          <div class="player-info">
            <div class="player-name">
              <span>Player ${i + 1}</span>
              <span class="role-tag ${isLeader ? 'leader' : 'crew'}">${isLeader ? 'Leader' : 'Crew'}</span>
            </div>
            <div class="player-payout" id="player-${i}-payout">$0</div>
          </div>
          <div class="player-cut-control">
            <div class="cut-input-wrapper">
              <input type="number" 
                     class="cut-input player-cut-val" 
                     data-index="${i}" 
                     min="0" 
                     max="100" 
                     step="1" 
                     value="${cutVal}">
              <span class="cut-percent-symbol">%</span>
            </div>
          </div>
        </div>
      `;
    }
    DOM.playersContainer.innerHTML = html;

    // Attach listeners
    DOM.playersContainer.querySelectorAll('.player-cut-val').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const val = Calculator.parseNumber(e.target.value, 0, 0, 100);
        state.splitter.cuts[idx] = val;
        calculateAndRenderSplitter();
      });
    });
  }

  function calculateAndRenderSplitter() {
    const result = Calculator.calculateHeistSplit({
      totalTake: state.splitter.totalTake,
      setupCost: state.splitter.setupCost,
      fencingFeePct: state.splitter.fencingFeePct,
      crewSupportCut: state.splitter.crewSupportCut,
      damageLoss: state.splitter.damageLoss,
      cuts: state.splitter.cuts,
      reimburseSetupFromPot: state.splitter.reimburseSetup
    });

    // Update each player card
    result.players.forEach((p, idx) => {
      const payoutEl = document.getElementById(`player-${idx}-payout`);
      if (payoutEl) {
        payoutEl.textContent = Calculator.formatCurrency(p.netTake);
        if (p.playerIndex === 0 && !state.splitter.reimburseSetup && state.splitter.setupCost > 0) {
          payoutEl.title = `Profit: ${Calculator.formatCurrency(p.effectiveProfit)} (after ${Calculator.formatCurrency(state.splitter.setupCost)} setup)`;
        }
      }
    });

    // Update Cut Validation Bar
    if (DOM.cutValidationBar && DOM.cutValidationText) {
      if (result.isSumValid) {
        DOM.cutValidationBar.className = 'cut-validation-bar valid';
        DOM.cutValidationText.innerHTML = `Cuts sum to 100% (${Calculator.formatCurrency(result.netPot)} net pot)`;
      } else {
        DOM.cutValidationBar.className = 'cut-validation-bar invalid';
        const diff = 100 - result.totalCutPct;
        DOM.cutValidationText.innerHTML = `Cuts sum to ${result.totalCutPct}% (${diff > 0 ? diff + '% unallocated' : Math.abs(diff) + '% over'})`;
      }
    }

    // Update Above-the-fold Live Result Banner if splitter active
    if (state.activeTab === 'splitter') {
      DOM.statBox1Label.textContent = "Leader Take";
      DOM.statBox1Val.className = "stat-value highlight-cyan num-mono";
      DOM.statBox1Val.textContent = Calculator.formatCurrency(result.leaderTake);
      DOM.statBox1Sub.textContent = state.splitter.setupCost > 0 
        ? `Profit: ${Calculator.formatCurrency(result.leaderProfit)}` 
        : `${state.splitter.cuts[0]}% cut`;

      DOM.statBox2Label.textContent = state.splitter.numPlayers > 1 ? "Crew Total" : "Bag Total";
      DOM.statBox2Val.className = "stat-value highlight-cash num-mono";
      DOM.statBox2Val.textContent = state.splitter.numPlayers > 1 
        ? Calculator.formatCurrency(result.crewTotalTake) 
        : Calculator.formatCurrency(result.effectiveGross);
      DOM.statBox2Sub.textContent = state.splitter.numPlayers > 1 
        ? `${state.splitter.numPlayers - 1} crew players` 
        : "Solo run";

      DOM.statBox3Label.textContent = "Net Pot";
      DOM.statBox3Val.className = "stat-value num-mono";
      DOM.statBox3Val.textContent = Calculator.formatCurrency(result.netPot);
      DOM.statBox3Sub.textContent = "After fence fees";

      DOM.statBox4Label.textContent = "Deductions";
      DOM.statBox4Val.className = "stat-value num-mono";
      DOM.statBox4Val.textContent = Calculator.formatCurrency(result.totalDeductions + result.damageLoss);
      DOM.statBox4Sub.textContent = `${result.fencingFeePct}% fee + crew`;
    }
  }

  function calculateAndRenderHourly() {
    const stats = Calculator.calculateMoneyPerHour(state.hourly.payout, state.hourly.timeMinutes);
    if (DOM.hourlyResultDisplay) {
      DOM.hourlyResultDisplay.textContent = stats.formattedRate;
    }

    // Render ranked table in hourly tab
    if (DOM.hourlyActivitiesTbody) {
      const ranked = Calculator.rankActivitiesByProfitability(state.activities);
      DOM.hourlyActivitiesTbody.innerHTML = ranked.map((act, index) => `
        <tr>
          <td>
            <strong>#${index + 1} ${act.name}</strong>
            <div style="font-size:0.7rem; color:var(--text-dim);">${act.category} • ${act.timeMinutes} mins</div>
          </td>
          <td><span class="tag-difficulty ${act.difficulty.toLowerCase()}">${act.difficulty}</span></td>
          <td>${act.recommendedSolo ? '<span class="tag-solo">Solo Ready</span>' : 'Co-op (2+)'}</td>
          <td class="num-mono">${Calculator.formatCompactCurrency(act.netBase)}</td>
          <td class="num-mono" style="color:var(--green-cash); font-weight:800;">${act.formattedHourlyRate}</td>
        </tr>
      `).join('');
    }

    // Update Above-the-fold Live Result Banner if hourly active
    if (state.activeTab === 'hourly') {
      DOM.statBox1Label.textContent = "Money / Hour";
      DOM.statBox1Val.className = "stat-value highlight-cash num-mono";
      DOM.statBox1Val.textContent = stats.formattedRate;
      DOM.statBox1Sub.textContent = "Based on completion time";

      DOM.statBox2Label.textContent = "Rate / Minute";
      DOM.statBox2Val.className = "stat-value highlight-cyan num-mono";
      DOM.statBox2Val.textContent = Calculator.formatCurrency(Math.round(stats.ratePerMinute));
      DOM.statBox2Sub.textContent = "Per active grind minute";

      DOM.statBox3Label.textContent = "Run Payout";
      DOM.statBox3Val.className = "stat-value num-mono";
      DOM.statBox3Val.textContent = Calculator.formatCurrency(state.hourly.payout);
      DOM.statBox3Sub.textContent = "Per single completion";

      DOM.statBox4Label.textContent = "Time Taken";
      DOM.statBox4Val.className = "stat-value num-mono";
      DOM.statBox4Val.textContent = Calculator.formatTime(state.hourly.timeMinutes);
      DOM.statBox4Sub.textContent = `${state.hourly.timeMinutes} minutes`;
    }
  }

  function calculateAndRenderGoal() {
    const selectedAct = state.activities.find(a => a.id === state.goal.selectedActivityId) || state.activities[0];
    const payoutPerRun = selectedAct ? selectedAct.basePayout - (selectedAct.setupCost || 0) : 1000000;
    const timePerRun = selectedAct ? selectedAct.timeMinutes : 45;

    const goal = Calculator.calculateGoalRuns({
      targetPrice: state.goal.targetPrice,
      currentBalance: state.goal.currentBalance,
      activityPayout: payoutPerRun,
      activityTimeMinutes: timePerRun
    });

    if (DOM.goalProgressBar) DOM.goalProgressBar.style.width = `${goal.progressPercent}%`;
    if (DOM.goalProgressPercent) DOM.goalProgressPercent.textContent = `${goal.progressPercent}%`;
    if (DOM.goalRunsNeeded) DOM.goalRunsNeeded.textContent = goal.runsNeeded;
    if (DOM.goalTotalTime) DOM.goalTotalTime.textContent = goal.formattedTotalTime;
    if (DOM.goalNeededCash) DOM.goalNeededCash.textContent = Calculator.formatCurrency(goal.neededAmount);
    if (DOM.goalSurplusCash) DOM.goalSurplusCash.textContent = goal.formattedSurplus;

    const optimal = Calculator.findOptimalGrindPath(state.activities, goal.neededAmount);
    if (DOM.goalFastestPath && optimal) {
      DOM.goalFastestPath.innerHTML = `
        <strong>Fastest Path:</strong> Run <em>${optimal.topHourly.name}</em> (${optimal.topHourly.formattedHourlyRate}) for maximum cash velocity.
      `;
    }

    // Update Above-the-fold Live Result Banner if goal active
    if (state.activeTab === 'goal') {
      DOM.statBox1Label.textContent = "Runs Needed";
      DOM.statBox1Val.className = "stat-value highlight-cyan num-mono";
      DOM.statBox1Val.textContent = `${goal.runsNeeded} Runs`;
      DOM.statBox1Sub.textContent = `${selectedAct ? selectedAct.name.slice(0, 18) + '...' : 'Runs'}`;

      DOM.statBox2Label.textContent = "Total Time";
      DOM.statBox2Val.className = "stat-value highlight-gold num-mono";
      DOM.statBox2Val.textContent = goal.formattedTotalTime;
      DOM.statBox2Sub.textContent = "Active playtime needed";

      DOM.statBox3Label.textContent = "Cash Needed";
      DOM.statBox3Val.className = "stat-value num-mono";
      DOM.statBox3Val.textContent = Calculator.formatCurrency(goal.neededAmount);
      DOM.statBox3Sub.textContent = `${goal.progressPercent}% already saved`;

      DOM.statBox4Label.textContent = "Surplus Cash";
      DOM.statBox4Val.className = "stat-value highlight-cash num-mono";
      DOM.statBox4Val.textContent = goal.formattedSurplus;
      DOM.statBox4Sub.textContent = "Leftover in bank";
    }
  }

  function renderCheatSheet() {
    if (!DOM.csTbody) return;

    let filtered = [...state.activities];

    // Filter by Search Query
    if (state.cheatSheet.searchQuery) {
      const q = state.cheatSheet.searchQuery;
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q))
      );
    }

    // Filter by Category
    if (state.cheatSheet.categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === state.cheatSheet.categoryFilter);
    }

    // Filter by Solo
    if (state.cheatSheet.soloOnly) {
      filtered = filtered.filter(a => a.recommendedSolo || a.playersMin === 1);
    }

    // Calculate hourly stats for each
    const enriched = filtered.map(act => {
      const net = act.basePayout - (act.setupCost || 0) - Math.round(act.basePayout * ((act.fencingFeePct || 0) / 100));
      const stats = Calculator.calculateMoneyPerHour(net, act.timeMinutes);
      return {
        ...act,
        netBase: net,
        hourlyRate: stats.hourlyRate,
        formattedRate: stats.formattedRate
      };
    });

    // Sort
    enriched.sort((a, b) => {
      return state.cheatSheet.sortAsc ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate;
    });

    if (enriched.length === 0) {
      DOM.csTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-dim);">No activities matched your search filter.</td></tr>`;
      return;
    }

    DOM.csTbody.innerHTML = enriched.map(act => `
      <tr>
        <td>
          <div style="font-weight:700;">${act.name}</div>
          <div style="font-size:0.72rem; color:var(--text-dim);">${act.notes || ''}</div>
        </td>
        <td><span class="tag-difficulty ${act.difficulty.toLowerCase()}">${act.difficulty}</span></td>
        <td>${act.recommendedSolo ? '<span class="tag-solo">Solo</span>' : 'Co-op (' + act.playersMin + '-' + act.playersMax + ')'}</td>
        <td class="num-mono">${Calculator.formatTime(act.timeMinutes)}</td>
        <td class="num-mono" style="font-weight:700;">${Calculator.formatCompactCurrency(act.basePayout)}</td>
        <td class="num-mono" style="color:var(--green-cash); font-weight:800;">${act.formattedRate}</td>
      </tr>
    `).join('');

    // Update Above-the-fold Live Result Banner if cheatsheet active
    if (state.activeTab === 'cheatsheet') {
      DOM.statBox1Label.textContent = "Activities Listed";
      DOM.statBox1Val.className = "stat-value highlight-cyan num-mono";
      DOM.statBox1Val.textContent = `${state.activities.length} Total`;
      DOM.statBox1Sub.textContent = "Verified & estimated";

      const topEarner = Calculator.rankActivitiesByProfitability(state.activities)[0];
      DOM.statBox2Label.textContent = "Top Hourly Earner";
      DOM.statBox2Val.className = "stat-value highlight-cash num-mono";
      DOM.statBox2Val.textContent = topEarner ? topEarner.formattedHourlyRate : '$0/hr';
      DOM.statBox2Sub.textContent = topEarner ? topEarner.name.slice(0, 16) + '...' : '';

      DOM.statBox3Label.textContent = "Solo Friendly";
      DOM.statBox3Val.className = "stat-value num-mono";
      DOM.statBox3Val.textContent = `${state.activities.filter(a => a.recommendedSolo).length} Activities`;
      DOM.statBox3Sub.textContent = "Can run completely solo";

      DOM.statBox4Label.textContent = "Last Updated";
      DOM.statBox4Val.className = "stat-value num-mono";
      DOM.statBox4Val.textContent = state.meta.lastUpdated;
      DOM.statBox4Sub.textContent = "Community verified";
    }
  }

  function renderAll() {
    renderSplitterInputs();
    renderPlayerCutInputs();
    calculateAndRenderSplitter();
    calculateAndRenderHourly();
    calculateAndRenderGoal();
    renderCheatSheet();
    updateLiveSummaryHeader();
  }

  // URL state serialization & restoration
  function copyShareableLink() {
    const params = new URLSearchParams();
    params.set('tab', state.activeTab);

    if (state.activeTab === 'splitter') {
      params.set('heist', state.splitter.selectedActivityId);
      params.set('take', state.splitter.totalTake);
      params.set('p', state.splitter.numPlayers);
      params.set('cuts', state.splitter.cuts.join(','));
      params.set('setup', state.splitter.setupCost);
      params.set('fence', state.splitter.fencingFeePct);
    } else if (state.activeTab === 'hourly') {
      params.set('payout', state.hourly.payout);
      params.set('time', state.hourly.timeMinutes);
    } else if (state.activeTab === 'goal') {
      params.set('target', state.goal.targetPrice);
      params.set('balance', state.goal.currentBalance);
      params.set('act', state.goal.selectedActivityId);
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}#${state.activeTab}`;
    copyToClipboard(shareUrl);
    showToast('Link copied to clipboard');
  }

  function restoreStateFromUrl() {
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(window.location.search);

    const initialTab = hash || params.get('tab') || 'splitter';
    if (['splitter', 'hourly', 'goal', 'cheatsheet'].includes(initialTab)) {
      state.activeTab = initialTab;
    }

    if (params.has('take')) state.splitter.totalTake = Calculator.parseNumber(params.get('take'), state.splitter.totalTake, 0);
    if (params.has('setup')) state.splitter.setupCost = Calculator.parseNumber(params.get('setup'), state.splitter.setupCost, 0);
    if (params.has('fence')) state.splitter.fencingFeePct = Calculator.parseNumber(params.get('fence'), state.splitter.fencingFeePct, 0, 100);
    if (params.has('heist')) state.splitter.selectedActivityId = params.get('heist');

    if (params.has('p')) {
      const pCount = Calculator.parseNumber(params.get('p'), 4, 1, 8);
      state.splitter.numPlayers = pCount;
    }

    if (params.has('cuts')) {
      const rawCuts = params.get('cuts').split(',').map(c => parseInt(c, 10)).filter(n => !isNaN(n));
      if (rawCuts.length === state.splitter.numPlayers) {
        state.splitter.cuts = rawCuts;
      }
    }

    if (params.has('payout')) state.hourly.payout = Calculator.parseNumber(params.get('payout'), state.hourly.payout, 0);
    if (params.has('time')) state.hourly.timeMinutes = Calculator.parseNumber(params.get('time'), state.hourly.timeMinutes, 1);

    if (params.has('target')) state.goal.targetPrice = Calculator.parseNumber(params.get('target'), state.goal.targetPrice, 0);
    if (params.has('balance')) state.goal.currentBalance = Calculator.parseNumber(params.get('balance'), state.goal.currentBalance, 0);
    if (params.has('act')) state.goal.selectedActivityId = params.get('act');

    switchTab(state.activeTab);
  }

  // Format result text for Discord/Reddit
  function copyFormattedResult() {
    let text = '';
    const date = new Date().toISOString().split('T')[0];

    if (state.activeTab === 'splitter') {
      const result = Calculator.calculateHeistSplit({
        totalTake: state.splitter.totalTake,
        setupCost: state.splitter.setupCost,
        fencingFeePct: state.splitter.fencingFeePct,
        cuts: state.splitter.cuts,
        reimburseSetupFromPot: state.splitter.reimburseSetup
      });

      text = `💰 **GTA 6 Heist Payout Split**\n` +
             `• Total Gross Take: ${Calculator.formatCurrency(result.totalTake)}\n` +
             `• Fence Fee (${result.fencingFeePct}%): ${Calculator.formatCurrency(result.fencingFee)}\n` +
             `• Net Distributable Pot: ${Calculator.formatCurrency(result.netPot)}\n` +
             `------------------------------\n` +
             result.players.map((p, idx) => 
               `• Player ${idx + 1} (${p.cutPercentage}%): ${Calculator.formatCurrency(p.netTake)}`
             ).join('\n') +
             `\n------------------------------\n` +
             `Calculated via GTA Payout Calc (${window.location.origin || 'gtapayoutcalc.com'})`;
    } else if (state.activeTab === 'hourly') {
      const stats = Calculator.calculateMoneyPerHour(state.hourly.payout, state.hourly.timeMinutes);
      text = `⏱ **GTA 6 Grind Profitability**\n` +
             `• Payout: ${Calculator.formatCurrency(state.hourly.payout)}\n` +
             `• Completion Time: ${state.hourly.timeMinutes} minutes\n` +
             `• Profitability: ${stats.formattedRate} (${Calculator.formatCurrency(Math.round(stats.ratePerMinute))}/min)\n` +
             `Calculated via GTA Payout Calc`;
    } else if (state.activeTab === 'goal') {
      const act = state.activities.find(a => a.id === state.goal.selectedActivityId);
      const goal = Calculator.calculateGoalRuns({
        targetPrice: state.goal.targetPrice,
        currentBalance: state.goal.currentBalance,
        activityPayout: act ? act.basePayout : 1000000,
        activityTimeMinutes: act ? act.timeMinutes : 45
      });
      text = `🎯 **GTA 6 Goal Grind Plan**\n` +
             `• Target Goal: ${Calculator.formatCurrency(state.goal.targetPrice)}\n` +
             `• Current Bank: ${Calculator.formatCurrency(state.goal.currentBalance)}\n` +
             `• Cash Needed: ${Calculator.formatCurrency(goal.neededAmount)}\n` +
             `• Runs Required: ${goal.runsNeeded}x runs of ${act ? act.name : 'Heist'}\n` +
             `• Est. Grind Time: ${goal.formattedTotalTime}\n` +
             `Calculated via GTA Payout Calc`;
    }

    copyToClipboard(text);
    showToast('Breakdown copied to clipboard');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(err => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  function showToast(msg) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    DOM.toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function checkCookieConsent() {
    const consent = localStorage.getItem('gta_calc_cookie_consent');
    if (!consent && DOM.cookieBanner) {
      DOM.cookieBanner.classList.add('visible');
    }
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
