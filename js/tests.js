/**
 * GTA 6 Online Payout & Heist Calculator - Test Suite
 * Run with: node js/tests.js
 */

const Calculator = require('./calculator.js');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

function assertEqual(actual, expected, testName) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}\n    Expected: ${JSON.stringify(expected)}\n    Actual:   ${JSON.stringify(actual)}`);
    failedTests++;
  }
}

console.log('====================================================');
console.log('Running GTA Payout Calculator Unit Tests...');
console.log('====================================================\n');

// 1. Currency Formatting
console.log('[Suite 1: Formatting Utilities]');
assertEqual(Calculator.formatCurrency(0), '$0', 'Format zero as $0');
assertEqual(Calculator.formatCurrency(1234567), '$1,234,567', 'Format positive millions with commas');
assertEqual(Calculator.formatCurrency(-50000), '-$50,000', 'Format negative numbers properly');
assertEqual(Calculator.formatCompactCurrency(2450000), '$2.45M', 'Format compact millions');
assertEqual(Calculator.formatTime(45), '45m', 'Format 45 minutes');
assertEqual(Calculator.formatTime(90), '1h 30m', 'Format 90 minutes as 1h 30m');
assertEqual(Calculator.formatTime(120), '2h', 'Format 120 minutes as 2h');

// 2. Fair Split Algorithm
console.log('\n[Suite 2: Fair Split Algorithms]');
assertEqual(Calculator.calculateFairSplit(1), [100], '1 player fair split is 100%');
assertEqual(Calculator.calculateFairSplit(2), [50, 50], '2 players fair split is 50/50');
assertEqual(Calculator.calculateFairSplit(3), [34, 33, 33], '3 players fair split sums to 100% (34, 33, 33)');
assertEqual(Calculator.calculateFairSplit(4), [25, 25, 25, 25], '4 players fair split is 25/25/25/25');

const cuts3 = Calculator.calculateFairSplit(3);
assert(cuts3.reduce((a, b) => a + b, 0) === 100, '3-player cuts sum to exactly 100');

const cuts5 = Calculator.calculateFairSplit(5);
assert(cuts5.reduce((a, b) => a + b, 0) === 100, '5-player cuts sum to exactly 100');

assertEqual(Calculator.calculateStandardLeaderSplit(4), [40, 20, 20, 20], 'Standard 4-player leader split is 40/20/20/20');
assertEqual(Calculator.calculateStandardLeaderSplit(2), [60, 40], 'Standard 2-player leader split is 60/40');

// 3. Heist Split Calculations
console.log('\n[Suite 3: Heist Split Calculations]');
{
  // 4 players, 2M take, 10% fence fee = 200k fee. Net pot = 1.8M. 40/20/20/20 cut.
  const result = Calculator.calculateHeistSplit({
    totalTake: 2000000,
    setupCost: 100000,
    fencingFeePct: 10,
    crewSupportCut: 0,
    damageLoss: 0,
    cuts: [40, 20, 20, 20],
    reimburseSetupFromPot: false
  });

  assertEqual(result.fencingFee, 200000, 'Fencing fee is 10% ($200,000)');
  assertEqual(result.netPot, 1800000, 'Net pot is $1,800,000');
  assertEqual(result.players[0].rawShare, 720000, 'Leader raw share is 40% of 1.8M = $720,000');
  assertEqual(result.players[1].rawShare, 360000, 'Crew 1 raw share is 20% of 1.8M = $360,000');
  assertEqual(result.leaderProfit, 620000, 'Leader profit is $720,000 - $100,000 setup = $620,000');
  assertEqual(result.isSumValid, true, 'Sum of cuts is exactly 100%');
}

{
  // Setup reimbursement from pot test
  const result = Calculator.calculateHeistSplit({
    totalTake: 2000000,
    setupCost: 200000,
    fencingFeePct: 10,
    crewSupportCut: 0,
    damageLoss: 0,
    cuts: [25, 25, 25, 25],
    reimburseSetupFromPot: true
  });

  // Effective gross: 2M. Fencing: 200k. Setup reimbursement: 200k. Total deductions: 400k. Net pot: 1.6M.
  // Each 25% share of 1.6M is 400k.
  // Leader gets 400k + 200k setup = 600k net take.
  assertEqual(result.netPot, 1600000, 'Net pot after setup reimbursement is $1,600,000');
  assertEqual(result.players[0].netTake, 600000, 'Leader gets rawShare + setup reimbursement = $600,000');
  assertEqual(result.players[1].netTake, 400000, 'Crew member gets $400,000');
}

{
  // Damage loss deduction
  const result = Calculator.calculateHeistSplit({
    totalTake: 2000000,
    damageLoss: 500000,
    fencingFeePct: 10,
    cuts: [100]
  });
  // Effective gross: 1.5M. Fencing: 150k. Net pot: 1.35M.
  assertEqual(result.effectiveGross, 1500000, 'Effective gross is reduced by bag damage');
  assertEqual(result.fencingFee, 150000, 'Fencing fee applies to bag remaining');
  assertEqual(result.netPot, 1350000, 'Net pot is $1,350,000');
}

// 4. Money Per Hour Calculations
console.log('\n[Suite 4: Money Per Hour Engine]');
{
  const result = Calculator.calculateMoneyPerHour(1200000, 30);
  assertEqual(result.hourlyRate, 2400000, '1.2M in 30 mins yields 2.4M/hr');
  assertEqual(result.formattedRate, '$2,400,000/hr', 'Formatted rate is $2,400,000/hr');
}

{
  // Zero and negative edge cases
  const zeroResult = Calculator.calculateMoneyPerHour(1000000, 0);
  assertEqual(zeroResult.hourlyRate, 0, 'Zero minutes returns $0/hr without division by zero crash');

  const negativeResult = Calculator.calculateMoneyPerHour(-5000, -10);
  assertEqual(negativeResult.hourlyRate, 0, 'Negative values clamped safely to 0');
}

// 5. Goal Tracker Engine
console.log('\n[Suite 5: Goal Tracker Engine]');
{
  // Target: 5,000,000 Supercar. Current balance: 1,000,000. Needed: 4,000,000.
  // Activity net payout: 1,500,000 per run. Time: 45 mins.
  const goal = Calculator.calculateGoalRuns({
    targetPrice: 5000000,
    currentBalance: 1000000,
    activityPayout: 1500000,
    activityTimeMinutes: 45
  });

  assertEqual(goal.neededAmount, 4000000, 'Needed cash is $4,000,000');
  assertEqual(goal.runsNeeded, 3, 'Ceil(4M / 1.5M) = 3 runs needed');
  assertEqual(goal.totalTimeMinutes, 135, '3 runs * 45m = 135 minutes total');
  assertEqual(goal.formattedTotalTime, '2h 15m', '135 minutes formatted as 2h 15m');
  assertEqual(goal.surplusCash, 500000, 'Surplus cash is $500,000');
}

{
  // Goal already achieved
  const goalAchieved = Calculator.calculateGoalRuns({
    targetPrice: 2000000,
    currentBalance: 2500000,
    activityPayout: 500000,
    activityTimeMinutes: 20
  });

  assertEqual(goalAchieved.neededAmount, 0, 'Needed cash is 0 when already funded');
  assertEqual(goalAchieved.runsNeeded, 0, 'Runs needed is 0');
  assertEqual(goalAchieved.surplusCash, 500000, 'Surplus reflects current excess cash');
}

// 6. Ranking and Optimal Grind Path
console.log('\n[Suite 6: Activity Ranking]');
{
  const mockActivities = [
    { id: 'act1', name: 'Slow Mission', basePayout: 500000, timeMinutes: 60, setupCost: 0, fencingFeePct: 0, recommendedSolo: true },
    { id: 'act2', name: 'Fast Heist', basePayout: 1800000, timeMinutes: 45, setupCost: 0, fencingFeePct: 0, recommendedSolo: true }
  ];

  const ranked = Calculator.rankActivitiesByProfitability(mockActivities);
  assertEqual(ranked[0].id, 'act2', 'Higher $/hr activity ranks first');
  assertEqual(ranked[0].hourlyRate, 2400000, 'Fast Heist hourly rate is $2,400,000/hr');

  const optimal = Calculator.findOptimalGrindPath(mockActivities, 3000000);
  assertEqual(optimal.topHourly.id, 'act2', 'Optimal path suggests highest $/hr activity');
}

console.log('\n====================================================');
console.log(`Test Results: ${passedTests} passed, ${failedTests} failed.`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
