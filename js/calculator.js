/**
 * GTA 6 Online Payout & Heist Calculator - Pure Calculation Engine
 * Works in both Browser and Node.js environments.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.GTACalculator = factory();
    root.Calculator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Safe number parser with min/max clamps
   * @param {*} value 
   * @param {number} defaultVal 
   * @param {number} min 
   * @param {number} max 
   * @returns {number}
   */
  function parseNumber(value, defaultVal = 0, min = 0, max = Infinity) {
    if (value === null || value === undefined || value === '') return defaultVal;
    const num = Number(value);
    if (isNaN(num)) return defaultVal;
    if (num < min) return min;
    if (num > max) return max;
    return num;
  }

  /**
   * Currency formatter: e.g. 1250000 -> "$1,250,000"
   * @param {number} amount 
   * @returns {string}
   */
  function formatCurrency(amount) {
    const safeAmount = Math.round(parseNumber(amount, 0, -Infinity));
    const isNegative = safeAmount < 0;
    const absVal = Math.abs(safeAmount);
    const formatted = absVal.toLocaleString('en-US');
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  }

  /**
   * Compact Currency formatter: e.g. 1250000 -> "$1.25M"
   * @param {number} amount 
   * @returns {string}
   */
  function formatCompactCurrency(amount) {
    const safeAmount = parseNumber(amount, 0, -Infinity);
    if (Math.abs(safeAmount) >= 1_000_000) {
      return `$${(safeAmount / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`;
    }
    if (Math.abs(safeAmount) >= 1_000) {
      return `$${(safeAmount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return formatCurrency(safeAmount);
  }

  /**
   * Format minutes to human readable time e.g. 75 -> "1h 15m"
   * @param {number} minutes 
   * @returns {string}
   */
  function formatTime(minutes) {
    const mins = Math.max(0, Math.round(parseNumber(minutes, 0, 0)));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }

  /**
   * Generates fair integer cuts that sum to exactly 100%
   * @param {number} numPlayers (1-8)
   * @returns {number[]} Array of cut percentages
   */
  function calculateFairSplit(numPlayers) {
    const count = Math.max(1, Math.min(8, Math.round(parseNumber(numPlayers, 1, 1, 8))));
    if (count === 1) return [100];
    if (count === 2) return [50, 50];
    if (count === 4) return [25, 25, 25, 25];

    // For arbitrary counts (e.g. 3 players -> 34, 33, 33)
    const baseCut = Math.floor(100 / count);
    const remainder = 100 % count;
    const cuts = [];

    for (let i = 0; i < count; i++) {
      // Leader gets the remainder so sum is exactly 100%
      cuts.push(i < remainder ? baseCut + 1 : baseCut);
    }
    return cuts;
  }

  /**
   * Generates the traditional "Leader Pays Setup" fair split
   * In GTA, leader typically spends prep time and money, so community
   * often standardizes on 40/20/20/20 (4 players) or 60/40 (2 players) or 50/25/25 (3 players).
   * @param {number} numPlayers 
   * @returns {number[]}
   */
  function calculateStandardLeaderSplit(numPlayers) {
    const count = Math.max(1, Math.min(8, Math.round(parseNumber(numPlayers, 1, 1, 8))));
    switch (count) {
      case 1: return [100];
      case 2: return [60, 40];
      case 3: return [50, 25, 25];
      case 4: return [40, 20, 20, 20];
      default: {
        const crewCount = count - 1;
        const crewEach = Math.floor(60 / crewCount);
        const leaderCut = 100 - (crewEach * crewCount);
        const cuts = [leaderCut];
        for (let i = 0; i < crewCount; i++) cuts.push(crewEach);
        return cuts;
      }
    }
  }

  /**
   * Calculates Heist Payout Breakdown
   * @param {Object} options
   * @param {number} options.totalTake Total gross bag take from heist
   * @param {number} options.setupCost Leader upfront setup fee
   * @param {number} options.fencingFeePct Percentage taken by fence / contacts (e.g. 10%)
   * @param {number} options.crewSupportCut Dollar amount for support crew (hacker/driver/gunner)
   * @param {number} options.damageLoss Dollar amount dropped from getting shot
   * @param {number[]} options.cuts Percentage cuts for each player (e.g. [40, 20, 20, 20])
   * @param {boolean} options.reimburseSetupFromPot If true, setup cost is reimbursed from pot before split
   * @returns {Object} Full breakdown of takes, fees, and net payouts
   */
  function calculateHeistSplit(options = {}) {
    const totalTake = parseNumber(options.totalTake, 0, 0);
    const setupCost = parseNumber(options.setupCost, 0, 0);
    const fencingFeePct = parseNumber(options.fencingFeePct, 0, 0, 100);
    const crewSupportCut = parseNumber(options.crewSupportCut, 0, 0);
    const damageLoss = parseNumber(options.damageLoss, 0, 0);
    const reimburseSetup = Boolean(options.reimburseSetupFromPot);

    // Initial gross take after bag damage losses
    const effectiveGross = Math.max(0, totalTake - damageLoss);

    // Fencing fee is calculated on effective gross
    const fencingFee = Math.round(effectiveGross * (fencingFeePct / 100));

    // Deductions out of gross pot
    const baselineDeductions = fencingFee + crewSupportCut;
    const totalDeductions = baselineDeductions + (reimburseSetup ? setupCost : 0);

    // Distributable pot
    const netPot = Math.max(0, effectiveGross - totalDeductions);

    // Parse cuts
    const cuts = Array.isArray(options.cuts) && options.cuts.length > 0
      ? options.cuts.map(c => parseNumber(c, 0, 0, 100))
      : [100];

    const totalCutPct = cuts.reduce((acc, curr) => acc + curr, 0);
    const isSumValid = totalCutPct === 100;

    // Calculate each player take
    const players = cuts.map((cutPct, index) => {
      const isLeader = index === 0;
      const rawShare = Math.round(netPot * (cutPct / 100));

      let netTake = rawShare;
      let effectiveProfit = rawShare;

      if (isLeader) {
        if (reimburseSetup) {
          // Leader gets their setup fee reimbursed directly from the pot
          netTake += setupCost;
          // Net profit is the share (since setup is covered)
          effectiveProfit = rawShare;
        } else {
          // Leader paid setup out of their own pocket
          effectiveProfit = rawShare - setupCost;
        }
      }

      return {
        playerIndex: index,
        role: isLeader ? 'Heist Leader' : `Crew Member ${index}`,
        cutPercentage: cutPct,
        rawShare,
        netTake,
        effectiveProfit
      };
    });

    const leaderTake = players[0] ? players[0].netTake : 0;
    const leaderProfit = players[0] ? players[0].effectiveProfit : 0;
    const crewTotalTake = players.slice(1).reduce((sum, p) => sum + p.netTake, 0);

    return {
      totalTake,
      damageLoss,
      effectiveGross,
      fencingFee,
      fencingFeePct,
      crewSupportCut,
      setupCost,
      reimburseSetup,
      totalDeductions,
      netPot,
      totalCutPct,
      isSumValid,
      players,
      leaderTake,
      leaderProfit,
      crewTotalTake
    };
  }

  /**
   * Money Per Hour calculation
   * @param {number} payout Total dollar payout
   * @param {number} timeMinutes Time taken in minutes
   * @returns {Object}
   */
  function calculateMoneyPerHour(payout, timeMinutes) {
    const safePayout = parseNumber(payout, 0, 0);
    const safeMinutes = parseNumber(timeMinutes, 0, 0);

    if (safeMinutes <= 0 || safePayout <= 0) {
      return {
        payout: safePayout,
        timeMinutes: safeMinutes,
        hourlyRate: 0,
        ratePerMinute: 0,
        formattedRate: '$0/hr'
      };
    }

    const ratePerMinute = safePayout / safeMinutes;
    const hourlyRate = Math.round(ratePerMinute * 60);

    return {
      payout: safePayout,
      timeMinutes: safeMinutes,
      hourlyRate,
      ratePerMinute,
      formattedRate: `${formatCurrency(hourlyRate)}/hr`
    };
  }

  /**
   * Goal Tracker calculation
   * @param {Object} options
   * @param {number} options.targetPrice Item or vehicle cost
   * @param {number} options.currentBalance Current player bank balance
   * @param {number} options.activityPayout Net payout per completed run
   * @param {number} options.activityTimeMinutes Duration of one run in minutes
   * @returns {Object}
   */
  function calculateGoalRuns(options = {}) {
    const targetPrice = parseNumber(options.targetPrice, 0, 0);
    const currentBalance = parseNumber(options.currentBalance, 0, 0);
    const activityPayout = parseNumber(options.activityPayout, 0, 0);
    const activityTimeMinutes = parseNumber(options.activityTimeMinutes, 1, 1);

    const neededAmount = Math.max(0, targetPrice - currentBalance);
    const progressPercent = targetPrice > 0 
      ? Math.min(100, Math.round((currentBalance / targetPrice) * 100))
      : 100;

    if (neededAmount === 0) {
      return {
        targetPrice,
        currentBalance,
        neededAmount: 0,
        progressPercent: 100,
        runsNeeded: 0,
        totalTimeMinutes: 0,
        formattedTotalTime: '0m',
        surplusCash: currentBalance - targetPrice,
        formattedSurplus: formatCurrency(currentBalance - targetPrice)
      };
    }

    if (activityPayout <= 0) {
      return {
        targetPrice,
        currentBalance,
        neededAmount,
        progressPercent,
        runsNeeded: Infinity,
        totalTimeMinutes: Infinity,
        formattedTotalTime: 'N/A',
        surplusCash: 0,
        formattedSurplus: '$0'
      };
    }

    const runsNeeded = Math.ceil(neededAmount / activityPayout);
    const totalEarningsFromRuns = runsNeeded * activityPayout;
    const surplusCash = (currentBalance + totalEarningsFromRuns) - targetPrice;
    const totalTimeMinutes = runsNeeded * activityTimeMinutes;

    return {
      targetPrice,
      currentBalance,
      neededAmount,
      progressPercent,
      runsNeeded,
      totalTimeMinutes,
      formattedTotalTime: formatTime(totalTimeMinutes),
      surplusCash,
      formattedSurplus: formatCurrency(surplusCash)
    };
  }

  /**
   * Rank activities by profitability ($/hour)
   * @param {Array} activities 
   * @returns {Array} Ranked activities with calculated hourly rate
   */
  function rankActivitiesByProfitability(activities = []) {
    if (!Array.isArray(activities)) return [];

    return activities
      .map(act => {
        const netBase = act.basePayout - (act.setupCost || 0) - Math.round(act.basePayout * ((act.fencingFeePct || 0) / 100));
        const stats = calculateMoneyPerHour(netBase, act.timeMinutes);
        return {
          ...act,
          netBase,
          hourlyRate: stats.hourlyRate,
          formattedHourlyRate: stats.formattedRate
        };
      })
      .sort((a, b) => b.hourlyRate - a.hourlyRate);
  }

  /**
   * Find the cheapest/fastest path recommendation to afford an item
   * @param {Array} activities 
   * @param {number} neededAmount 
   * @returns {Object}
   */
  function findOptimalGrindPath(activities = [], neededAmount = 0) {
    if (!Array.isArray(activities) || activities.length === 0 || neededAmount <= 0) {
      return null;
    }

    const ranked = rankActivitiesByProfitability(activities);
    const fastestSolo = ranked.find(a => a.recommendedSolo || a.playersMin === 1) || ranked[0];
    const highestTotalPayout = [...ranked].sort((a, b) => b.basePayout - a.basePayout)[0];

    return {
      topHourly: fastestSolo,
      highestPayout: highestTotalPayout,
      recommendedStrategy: fastestSolo.name
    };
  }

  return {
    parseNumber,
    formatCurrency,
    formatCompactCurrency,
    formatTime,
    calculateFairSplit,
    calculateStandardLeaderSplit,
    calculateHeistSplit,
    calculateMoneyPerHour,
    calculateGoalRuns,
    rankActivitiesByProfitability,
    findOptimalGrindPath
  };
});
