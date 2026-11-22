# GTA 6 Online Payout & Heist Calculator (GTA Payout Calc)

A blazing-fast, mobile-first, single-page web utility built for GTA 6 Online players. Designed specifically for console and PC players keeping a smartphone next to their controller, it calculates fair heist cuts, leader profits, money per hour ($/hr), and vehicle/property goal paths in under 5 seconds with zero account sign-up.

---

## 🚀 Key Features

1. **Heist Payout Splitter**:
   - Supports 1 to 4+ players.
   - Calculates gross take, fencing fees (e.g., 10-15%), bag damage losses, and support crew cuts.
   - One-click **"Fair Split (Equal %)"** and **"Leader Prep Split (40/20/20/20)"** presets.
   - Optional setup fee reimbursement before pot distribution.
   - Live validation showing whether cuts sum to exactly 100%.

2. **Money Per Hour Engine ($/hr)**:
   - Dynamic formula converting payout and prep+finale time into $/hr and $/min.
   - Real-time leaderboard ranking activities by active grinding profitability.

3. **Goal Savings Tracker**:
   - Computes exact runs needed (`Math.ceil`) to afford supercars, attack helicopters, or penthouses.
   - Shows active grind time required and leftover surplus bank balance.
   - Highlights the fastest single solo grind path.

4. **Cheat-Sheet Table**:
   - Searchable, sortable overview of activities with setup times, solo-compatibility tags, difficulty levels, and strategy tips.

5. **Instant Shareability**:
   - **"Copy Result"**: Generates a clean, Markdown-formatted breakdown tailored for Discord and Reddit.
   - **"Share Link"**: Serializes current cuts, heist parameters, and active tab directly into URL search params and hashes for one-click sharing with crew members.

6. **Lighthouse 95+ Architecture**:
   - Zero framework dependencies: vanilla HTML5, modern CSS3, and isolated JavaScript.
   - Above-the-fold result summary card: answer is visible immediately on mobile without scrolling.
   - Dark mode default with high-contrast accessibility (>4.5:1 ratio).
   - Semantic SEO markup with Open Graph cards, Twitter cards, and Schema.org `WebApplication` + `FAQPage` JSON-LD.

---

## 📁 Project Structure

```
├── index.html                   # Main single-page web app + SEO tags + FAQ
├── robots.txt                   # Crawler directives
├── sitemap.xml                  # XML sitemap with landing URLs
├── package.json                 # Test & run scripts
├── README.md                    # Documentation
├── data/
│   └── activities.json          # Core game activities database (placeholder estimates)
├── js/
│   ├── calculator.js            # Pure mathematical engine (Node.js & browser compatible)
│   ├── app.js                   # UI controller, state sync & URL parameter encoding
│   └── tests.js                 # Automated unit tests for calculation logic
├── styles/
│   └── main.css                 # Mobile-first CSS, dark aesthetic, responsive layout
├── assets/
│   └── og-image.svg             # Social share preview card
└── [heist-payout-calculator]/   # Virtual landing route for SEO
└── [money-per-hour]/            # Virtual landing route for SEO
└── [best-money-making-methods]/ # Virtual landing route for SEO
└── [goal-tracker]/              # Virtual landing route for SEO
```

---

## 🛠️ How to Update `activities.json`

All game numbers are completely decoupled from UI code. To add or adjust an activity:

1. Open `/data/activities.json`.
2. Edit or add an object to the `activities` array:

```json
{
  "id": "vice-city-marina-heist",
  "name": "Vice City Superyacht Syndicate",
  "category": "Major Heist",
  "basePayout": 3600000,
  "timeMinutes": 60,
  "playersMin": 2,
  "playersMax": 4,
  "difficulty": "Very Hard",
  "setupCost": 150000,
  "fencingFeePct": 12,
  "recommendedSolo": false,
  "lastVerified": "2026-11-22",
  "source": "Verified Day-One Heist Finale",
  "notes": "Requires at least 2 players for dual keycard swipes."
}
```

3. Update the `meta.lastUpdated` date in `activities.json` (e.g. `"2026-11-22"`). The badge on the site will automatically reflect the change.
4. Run unit tests to confirm formatting and calculation integrity:
   ```bash
   npm test
   ```

---

## 🧪 Running Unit Tests

The calculation engine in `js/calculator.js` is isolated and verified using pure assertion tests in `js/tests.js`:

```bash
# Run unit tests
node js/tests.js
# Or with npm:
npm test
```

All 42 test cases verify:
- Edge cases (0 payout, 0 minutes, negative values, large numbers).
- Integer fair splits (1-8 players summing to exactly 100%).
- Setup fee reimbursements, damage deductions, and fencing fees.
- Ceil calculations on goal runs and surplus bank balance.

---

## 🌐 Free Deployment Options

### Option 1: Cloudflare Pages (Recommended)
1. Push this repository to GitHub or GitLab.
2. In the Cloudflare dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select this repository.
4. Set **Build command**: *(leave blank)*.
5. Set **Build output directory**: `/` (root).
6. Click **Save and Deploy**. Cloudflare delivers the app across 300+ global edge locations with sub-50ms latency.

### Option 2: Vercel
1. Install Vercel CLI: `npm i -g vercel` or link your GitHub repo at [vercel.com](https://vercel.com).
2. Run `vercel` in this directory.
3. Accept the default static project settings.

### Option 3: Netlify
1. Drag and drop the project folder directly into [app.netlify.com/drop](https://app.netlify.com/drop).
2. Or connect via Git with build directory set to `.`.

---

## ⚖️ Legal Disclaimer

Unofficial fan-made utility. Not affiliated with, endorsed, sponsored, or approved by Rockstar Games or Take-Two Interactive. Grand Theft Auto and GTA are registered trademarks of Take-Two Interactive Software, Inc.
