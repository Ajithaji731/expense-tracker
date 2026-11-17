# 💸 Expense Tracker (AI-Connected & Google Sheet Synced)

A sleek, modern, glassmorphic Expense Tracker built specifically for daily personal tracking and seamless AI Agent integration.

---

## ✨ Features

1. **Daily Expense Breakdown**:
   - Day-by-day itemized view grouped by date (Today, Yesterday, etc.).
   - Daily totals calculated automatically.
   - Clean category badges, payment mode tags (UPI, Cash, Card), timestamps, and notes.

2. **Month Switcher (Dropdown)**:
   - Easily switch between months via a clean dropdown or prev/next chevrons.
   - Defaults to the current month (**November 2026**).
   - Instant re-calculation of KPIs and day lists upon switching.

3. **Monthly Comparison Tab**:
   - Side-by-side comparison of expenses across months.
   - **Monthly Total Spend Comparison** (Bar chart).
   - **Category Distribution Across Months** (Stacked bar chart).
   - Full comparative table showing **Month, Total Spent, Daily Average, Transactions, Top Category, and MoM (Month-over-Month) % Change**.

4. **Categories & Analytics Tab**:
   - Interactive Donut chart showing category distribution.
   - Visual progress bars showing spending amount and percentage share per category.

5. **AI Quick Prompt Bar**:
   - Prominently positioned at the top of the daily view.
   - Natural language prompts handled instantly (0ms):
     - `spent 20 for tea`
     - `paid 50 for auto`
     - `spent 140 for lunch`
     - `paid 350 for groceries`
     - `paid 200 for petrol`
     - `swiggy 320 upi yesterday`
   - Automatically detects amount, date, category, and payment mode!

6. **Full In-App CRUD**:
   - Add new expenses manually with custom date, time, and payment mode.
   - Edit any existing expense.
   - Delete with confirmation.
   - Real-time search and category filtering.

7. **Google Sheet Cloud Sync**:
   - Powered by **Google Apps Script** to sync directly with your Google Sheet titled **"Expense tracker"**.
   - Works offline with `localStorage` fallback so your data is never lost.

---

## 🚀 Google Sheet Cloud Connection (Connected)

Your **"Expense tracker"** Google Sheet is already hardcoded and connected:
- **Web App URL**: `https://script.google.com/macros/s/AKfycbyT64Ehwsk_hev8n_-G6fjX2Bt7NyFUTWc81BALw5phR14f2tkd_ZksyIANOmVqOoE/exec`

No setup or copy-pasting is required inside the app. Clicking the **Sheets Synced** badge in the header performs an instant manual refresh anytime.

---

## 🤖 Connecting Your AI Agent (Leo)

You can prompt your AI agent (Leo or any assistant) with:
> *"Spent 20 for tea"*  
> *"Paid 50 for auto"*  
> *"Paid 150 for lunch"*  

### How the AI Agent Logs an Expense
Any AI agent or script can log an expense by sending a simple HTTP POST request to your Google Apps Script URL:

```bash
curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{
    "action": "addExpense",
    "expense": {
      "amount": 20,
      "description": "Tea",
      "category": "Food & Drinks",
      "paymentMode": "UPI",
      "source": "AI Agent"
    }
  }'
```

---

## 📂 File Structure

- [`index.html`](file:///Users/ajith/Downloads/Expense-tracker/index.html) - Main application UI with tabs, KPI cards, and modals.
- [`styles.css`](file:///Users/ajith/Downloads/Expense-tracker/styles.css) - Modern dark/light glassmorphic styling and responsive design.
- [`app.js`](file:///Users/ajith/Downloads/Expense-tracker/app.js) - State management, AI NLP parser, Chart.js integrations, and cloud sync logic.
- [`google_apps_script.js`](file:///Users/ajith/Downloads/Expense-tracker/google_apps_script.js) - Google Apps Script code to paste into your Google Sheet.

