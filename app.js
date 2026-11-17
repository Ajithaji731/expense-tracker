/**
 * ========================================================
 * EXPENSE TRACKER - APPLICATION LOGIC & AI ENGINE
 * ========================================================
 */

// --- Category Configuration ---
const CATEGORIES = {
  "Food & Drinks": { icon: "☕", color: "#f97316", keywords: ["tea", "chai", "coffee", "breakfast", "lunch", "dinner", "snack", "snacks", "swiggy", "zomato", "restaurant", "cafe", "food", "eat", "biryani", "juice", "water", "samosa", "maggie", "biscuit", "cookie"] },
  "Transportation": { icon: "🚗", color: "#3b82f6", keywords: ["auto", "cab", "uber", "ola", "metro", "bus", "train", "flight", "petrol", "diesel", "fuel", "parking", "toll", "rapido", "rickshaw", "travel"] },
  "Groceries": { icon: "🛒", color: "#10b981", keywords: ["grocery", "groceries", "supermarket", "vegetables", "fruits", "milk", "bread", "eggs", "rice", "dal", "oil", "curd", "blinkit", "zepto", "instamart", "bigbasket"] },
  "Bills & Utilities": { icon: "⚡", color: "#eab308", keywords: ["recharge", "wifi", "internet", "electricity", "water bill", "gas", "cylinder", "rent", "maintenance", "mobile recharge", "broadband", "dth"] },
  "Shopping": { icon: "🛍️", color: "#ec4899", keywords: ["shopping", "amazon", "flipkart", "myntra", "clothes", "shoes", "shirt", "pant", "tshirt", "electronics", "gadget", "watch", "perfume", "bag"] },
  "Entertainment": { icon: "🎬", color: "#8b5cf6", keywords: ["movie", "cinema", "netflix", "prime", "hotstar", "spotify", "youtube", "game", "gaming", "outing", "party", "club"] },
  "Health & Medical": { icon: "💊", color: "#ef4444", keywords: ["medicine", "medicines", "doctor", "hospital", "clinic", "pharmacy", "medical", "tablet", "tablets", "lab", "test", "consultation", "dental"] },
  "Personal Care": { icon: "✂️", color: "#06b6d4", keywords: ["salon", "haircut", "spa", "grooming", "barber", "skincare", "soap", "shampoo"] },
  "Education & Learning": { icon: "📚", color: "#6366f1", keywords: ["book", "books", "course", "udemy", "tuition", "fees", "exam", "stationary", "pen", "notebook"] },
  "Investment & Savings": { icon: "📈", color: "#14b8a6", keywords: ["invest", "sip", "stock", "etf", "mutual fund", "gold", "deposit", "savings"] },
  "Other": { icon: "📦", color: "#64748b", keywords: [] }
};

// --- Initial Expenses (Starts 100% clean - No dummy data) ---
const INITIAL_SAMPLE_DATA = [];

// --- App State ---
let expenses = [];
let selectedMonth = "2026-11";
let currentTab = "dailyView";
const EXPENSE_GAS_URL = "https://script.google.com/macros/s/AKfycbyT64Ehwsk_hev8n_-G6fjX2Bt7NyFUTWc81BALw5phR14f2tkd_ZksyIANOmVqOoE/exec";

// Chart instances
let monthlyCompareChart = null;
let categoryCompareChart = null;
let categoryDonutChart = null;

// --- DOM References ---
const monthSelect = document.getElementById("monthSelect");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const themeSelect = document.getElementById("themeSelect");

const aiPromptForm = document.getElementById("aiPromptForm");
const aiPromptInput = document.getElementById("aiPromptInput");

const kpiTotalSpent = document.getElementById("kpiTotalSpent");
const kpiDailyAvg = document.getElementById("kpiDailyAvg");
const kpiPeakDay = document.getElementById("kpiPeakDay");
const kpiPeakAmount = document.getElementById("kpiPeakAmount");
const kpiTxnCount = document.getElementById("kpiTxnCount");
const kpiTopCategory = document.getElementById("kpiTopCategory");
const kpiMonthLabel = document.getElementById("kpiMonthLabel");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const dailyContainer = document.getElementById("dailyContainer");

const expenseModal = document.getElementById("expenseModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const closeExpenseModal = document.getElementById("closeExpenseModal");
const cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
const expenseForm = document.getElementById("expenseForm");
const modalTitle = document.getElementById("modalTitle");
const editExpenseId = document.getElementById("editExpenseId");
const formAmount = document.getElementById("formAmount");
const formDescription = document.getElementById("formDescription");
const formCategory = document.getElementById("formCategory");
const formPaymentMode = document.getElementById("formPaymentMode");
const formDate = document.getElementById("formDate");
const formTime = document.getElementById("formTime");

const syncNowBtn = document.getElementById("syncNowBtn");
const syncStatusText = document.getElementById("syncStatusText");
const exportDataBtn = document.getElementById("exportDataBtn");

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  loadStoredData();
  populateCategoryDropdowns();
  initTheme();
  setupEventListeners();
  renderApp();
  
  updateSyncBadge(true, "Connecting...");
  fetchFromGoogleSheets(false);

  lucide.createIcons();
});

// --- Data Loading & Storage ---
function loadStoredData() {
  const localData = localStorage.getItem("expense_tracker_data");
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      // Filter out any legacy dummy records so app is 100% clean
      expenses = Array.isArray(parsed) ? parsed.filter(e => 
        !e.id.startsWith("exp_1731815") && 
        !e.id.startsWith("exp_1731816") && 
        e.description !== "Broadband Wi-Fi bill" && 
        e.description !== "Technical Handbook book purchase" &&
        e.description !== "Dinner with friends" &&
        e.description !== "Monthly Electricity bill"
      ) : [];
      expenses.forEach(e => {
        e.date = normalizeDateStr(e.date);
        e.month = normalizeMonthStr(e.month || e.date);
        e.time = normalizeTimeStr(e.time);
      });
    } catch (e) {
      expenses = [];
    }
  } else {
    expenses = [];
  }
  saveToLocalStorage();

  // Ensure current date month is selected if available, or latest available month
  const today = getTodayDateStr();
  const currentMonthStr = today.substring(0, 7);
  const availableMonths = getAvailableMonths();
  if (availableMonths.includes(currentMonthStr)) {
    selectedMonth = currentMonthStr;
  } else if (availableMonths.length > 0) {
    selectedMonth = availableMonths[0];
  } else {
    selectedMonth = currentMonthStr;
  }
}

function saveToLocalStorage() {
  localStorage.setItem("expense_tracker_data", JSON.stringify(expenses));
}

function getAvailableMonths() {
  const set = new Set();
  expenses.forEach(e => {
    if (e.month) set.add(e.month);
    else if (e.date) set.add(e.date.substring(0, 7));
  });
  // Always include current month
  set.add(getTodayDateStr().substring(0, 7));
  return Array.from(set).sort().reverse();
}

function populateCategoryDropdowns() {
  // Filter dropdown
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  // Modal dropdown
  formCategory.innerHTML = "";

  Object.keys(CATEGORIES).forEach(cat => {
    const optFilter = document.createElement("option");
    optFilter.value = cat;
    optFilter.textContent = `${CATEGORIES[cat].icon} ${cat}`;
    categoryFilter.appendChild(optFilter);

    const optForm = document.createElement("option");
    optForm.value = cat;
    optForm.textContent = `${CATEGORIES[cat].icon} ${cat}`;
    formCategory.appendChild(optForm);
  });
}

function updateMonthSelectDropdown() {
  const months = getAvailableMonths();
  monthSelect.innerHTML = "";
  
  months.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = formatMonthReadable(m);
    if (m === selectedMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  });
}

// --- Render Main Application ---
function renderApp() {
  updateMonthSelectDropdown();
  updateKPIs();
  
  if (currentTab === "dailyView") {
    renderDailyBreakdown();
  } else if (currentTab === "compareView") {
    renderMonthlyComparison();
  } else if (currentTab === "analyticsView") {
    renderAnalytics();
  }

  lucide.createIcons();
}

// --- KPI Calculations ---
function updateKPIs() {
  const monthExpenses = expenses.filter(e => e.month === selectedMonth || (e.date && e.date.substring(0, 7) === selectedMonth));
  const total = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  // Calculate daily average based on distinct dates in the month with expenses
  const datesSet = new Set(monthExpenses.map(e => e.date));
  const activeDays = datesSet.size || 1;
  const avg = Math.round(total / activeDays);

  // Peak spend day
  const dailyTotals = {};
  monthExpenses.forEach(e => {
    dailyTotals[e.date] = (dailyTotals[e.date] || 0) + Number(e.amount);
  });
  let peakDate = "None";
  let peakAmount = 0;
  Object.keys(dailyTotals).forEach(d => {
    if (dailyTotals[d] > peakAmount) {
      peakAmount = dailyTotals[d];
      peakDate = d;
    }
  });

  // Top category
  const catTotals = {};
  monthExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });
  let topCat = "None";
  let topCatAmount = 0;
  Object.keys(catTotals).forEach(c => {
    if (catTotals[c] > topCatAmount) {
      topCatAmount = catTotals[c];
      topCat = c;
    }
  });

  kpiTotalSpent.textContent = `₹${total.toLocaleString("en-IN")}`;
  kpiDailyAvg.textContent = `₹${avg.toLocaleString("en-IN")}`;
  kpiMonthLabel.textContent = formatMonthReadable(selectedMonth);
  kpiTxnCount.textContent = monthExpenses.length;

  // Calculate today's total spending
  const todayStr = getTodayDateStr();
  const todayTotal = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const heroTodayEl = document.getElementById("heroTodayTotal");
  if (heroTodayEl) {
    heroTodayEl.textContent = `₹${todayTotal.toLocaleString("en-IN")}`;
  }
  
  if (peakDate !== "None") {
    kpiPeakDay.textContent = formatShortDate(peakDate);
    kpiPeakAmount.textContent = `₹${peakAmount.toLocaleString("en-IN")}`;
  } else {
    kpiPeakDay.textContent = "None";
    kpiPeakAmount.textContent = "₹0";
  }

  if (topCat !== "None") {
    const icon = CATEGORIES[topCat]?.icon || "📦";
    kpiTopCategory.textContent = `Top: ${icon} ${topCat} (₹${topCatAmount.toLocaleString("en-IN")})`;
  } else {
    kpiTopCategory.textContent = "Top: None";
  }
}

// --- Daily Breakdown View ---
function renderDailyBreakdown() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedCat = categoryFilter.value;
  const sortMode = sortFilter.value;

  // Filter current month
  let filtered = expenses.filter(e => {
    const expMonth = e.month || (e.date ? e.date.substring(0, 7) : "");
    if (expMonth !== selectedMonth) return false;
    
    if (selectedCat !== "all" && e.category !== selectedCat) return false;
    
    if (searchTerm) {
      const descMatch = (e.description || "").toLowerCase().includes(searchTerm);
      const catMatch = (e.category || "").toLowerCase().includes(searchTerm);
      const amtMatch = String(e.amount).includes(searchTerm);
      const modeMatch = (e.paymentMode || "").toLowerCase().includes(searchTerm);
      if (!descMatch && !catMatch && !amtMatch && !modeMatch) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortMode === "date-desc") return b.date.localeCompare(a.date) || (b.createdAt || "").localeCompare(a.createdAt || "");
    if (sortMode === "date-asc") return a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || "");
    if (sortMode === "amount-desc") return Number(b.amount) - Number(a.amount);
    if (sortMode === "amount-asc") return Number(a.amount) - Number(b.amount);
    return 0;
  });

  dailyContainer.innerHTML = "";

  if (filtered.length === 0) {
    dailyContainer.innerHTML = `
      <div class="empty-box">
        <div class="empty-icon">🍵</div>
        <h3>No expenses yet</h3>
        <p>Type <em>"spent 200 today"</em> or tap <em>+100</em> above to log your spendings.</p>
      </div>
    `;
    return;
  }

  // Group by Date
  const groupedByDate = {};
  filtered.forEach(item => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = [];
    }
    groupedByDate[item.date].push(item);
  });

  const todayStr = getTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();

  Object.keys(groupedByDate).forEach(dateStr => {
    const dayItems = groupedByDate[dateStr];
    const dayTotal = dayItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const isToday = dateStr === todayStr;
    const isYesterday = dateStr === yesterdayStr;
    
    let badgeText = "";
    if (isToday) badgeText = `<span class="day-tag-badge today">Today</span>`;
    else if (isYesterday) badgeText = `<span class="day-tag-badge">Yesterday</span>`;

    const dayCard = document.createElement("div");
    dayCard.className = "day-card";

    let itemsHtml = dayItems.map(item => {
      const catInfo = CATEGORIES[item.category] || CATEGORIES["Other"];
      return `
        <div class="expense-row" data-id="${item.id}">
          <div class="row-left">
            <div class="row-icon" style="background: ${catInfo.color}22; color: ${catInfo.color};">
              ${catInfo.icon}
            </div>
            <div class="row-details">
              <h4>${escapeHtml(item.description)}</h4>
              <div class="row-meta">
                <span>${item.category}</span>
                <span>•</span>
                <span>${item.paymentMode || 'UPI'}</span>
                ${item.time ? `<span>• ${item.time}</span>` : ''}
                ${item.source === 'AI Agent' ? `<span class="ai-tag">AI</span>` : ''}
              </div>
            </div>
          </div>
          <div class="row-right">
            <span class="row-amount">₹${Number(item.amount).toLocaleString('en-IN')}</span>
            <div class="row-btns">
              <button class="mini-btn" title="Edit" onclick="openExpenseModalForEdit('${item.id}')">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="mini-btn del" title="Delete" onclick="deleteExpenseItem('${item.id}')">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    dayCard.innerHTML = `
      <div class="day-header">
        <div class="day-title-box">
          ${badgeText}
          <span class="day-title-text">${formatFullDate(dateStr)}</span>
        </div>
        <div class="day-sum-badge">
          Day Total: ₹${dayTotal.toLocaleString('en-IN')}
        </div>
      </div>
      <div class="day-items-group">
        ${itemsHtml}
      </div>
    `;

    dailyContainer.appendChild(dayCard);
  });
}

// --- Monthly Comparison View ---
function renderMonthlyComparison() {
  const months = getAvailableMonths().slice().reverse(); // Chronological order
  const monthSummaries = [];

  months.forEach(m => {
    const items = expenses.filter(e => (e.month === m) || (e.date && e.date.substring(0, 7) === m));
    const total = items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const datesSet = new Set(items.map(e => e.date));
    const activeDays = datesSet.size || 1;
    const avg = Math.round(total / activeDays);

    // Top Category
    const catTotals = {};
    items.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
    });
    let topCat = "-";
    let topCatAmt = 0;
    Object.keys(catTotals).forEach(c => {
      if (catTotals[c] > topCatAmt) {
        topCatAmt = catTotals[c];
        topCat = c;
      }
    });

    monthSummaries.push({
      month: m,
      total,
      avg,
      count: items.length,
      topCat,
      topCatAmt,
      catTotals
    });
  });

  // Calculate MoM Changes
  for (let i = 0; i < monthSummaries.length; i++) {
    if (i === 0) {
      monthSummaries[i].momChange = 0;
    } else {
      const prev = monthSummaries[i - 1].total;
      const curr = monthSummaries[i].total;
      if (prev > 0) {
        monthSummaries[i].momChange = Math.round(((curr - prev) / prev) * 100);
      } else {
        monthSummaries[i].momChange = 0;
      }
    }
  }

  // Update Comparison KPIs
  const trackedCount = monthSummaries.length;
  const cmpMonthsCountEl = document.getElementById("cmpMonthsCount");
  if (cmpMonthsCountEl) cmpMonthsCountEl.textContent = `${trackedCount} Month${trackedCount > 1 ? 's' : ''}`;
  
  const overallTotal = monthSummaries.reduce((s, m) => s + m.total, 0);
  const overallAvg = trackedCount > 0 ? Math.round(overallTotal / trackedCount) : 0;
  const cmpOverallAvgEl = document.getElementById("cmpOverallAvg");
  if (cmpOverallAvgEl) cmpOverallAvgEl.textContent = `₹${overallAvg.toLocaleString('en-IN')}`;

  let highestM = null;
  monthSummaries.forEach(m => {
    if (!highestM || m.total > highestM.total) highestM = m;
  });
  if (highestM) {
    const highestMonthEl = document.getElementById("cmpHighestMonth");
    const highestAmountEl = document.getElementById("cmpHighestAmount");
    if (highestMonthEl) highestMonthEl.textContent = formatMonthReadable(highestM.month);
    if (highestAmountEl) highestAmountEl.textContent = `₹${highestM.total.toLocaleString('en-IN')}`;
  }

  // Render Table (Newest first)
  const tbody = document.getElementById("comparisonTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    const reversedSummaries = monthSummaries.slice().reverse();

    reversedSummaries.forEach(m => {
      const tr = document.createElement("tr");
      
      let momBadge = `<span style="color: var(--text-muted);">-</span>`;
      if (m.momChange > 0) {
        momBadge = `<span style="color: var(--danger); font-weight: 600;">+${m.momChange}% ↗</span>`;
      } else if (m.momChange < 0) {
        momBadge = `<span style="color: var(--success); font-weight: 600;">${m.momChange}% ↘</span>`;
      }

      const catIcon = CATEGORIES[m.topCat]?.icon || "📦";

      tr.innerHTML = `
        <td><strong>${formatMonthReadable(m.month)}</strong></td>
        <td><strong>₹${m.total.toLocaleString('en-IN')}</strong></td>
        <td>₹${m.avg.toLocaleString('en-IN')}/day</td>
        <td>${m.count} txns</td>
        <td>${momBadge}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render Charts
  renderComparisonCharts(monthSummaries);
}

function renderComparisonCharts(monthSummaries) {
  const labels = monthSummaries.map(m => formatMonthReadable(m.month));
  const totals = monthSummaries.map(m => m.total);

  // 1. Monthly Total Bar Chart
  const elMonthly = document.getElementById("monthlyCompareChart");
  if (elMonthly) {
    const ctxBar = elMonthly.getContext("2d");
    if (monthlyCompareChart) monthlyCompareChart.destroy();

    monthlyCompareChart = new Chart(ctxBar, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Total Expenses (₹)",
          data: totals,
          backgroundColor: "rgba(99, 102, 241, 0.7)",
          borderColor: "#6366f1",
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: "rgba(99, 102, 241, 0.9)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Spent: ₹${ctx.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#94a3b8",
              callback: (val) => `₹${val.toLocaleString('en-IN')}`
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: "#94a3b8" }
          }
        }
      }
    });
  }

  // 2. Stacked Category Compare Chart (if canvas exists)
  const elCat = document.getElementById("categoryCompareChart");
  if (elCat) {
    const ctxCat = elCat.getContext("2d");
    if (categoryCompareChart) categoryCompareChart.destroy();

    const allCategoryNames = Object.keys(CATEGORIES);
    const datasets = allCategoryNames.map(cat => {
      return {
        label: cat,
        data: monthSummaries.map(m => m.catTotals[cat] || 0),
        backgroundColor: CATEGORIES[cat].color,
        borderRadius: 4
      };
    }).filter(ds => ds.data.some(v => v > 0));

    categoryCompareChart = new Chart(ctxCat, {
      type: "bar",
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#94a3b8", boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: "#94a3b8" }
          },
          y: {
            stacked: true,
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: {
              color: "#94a3b8",
              callback: (val) => `₹${val.toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }
}

// --- Analytics & Categories View ---
function renderAnalytics() {
  const donutLabelEl = document.getElementById("donutMonthLabel");
  if (donutLabelEl) donutLabelEl.textContent = formatMonthReadable(selectedMonth);

  const monthItems = expenses.filter(e => e.month === selectedMonth || (e.date && e.date.substring(0, 7) === selectedMonth));
  const totalSpend = monthItems.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const catTotals = {};
  monthItems.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
  });

  const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  // Donut Chart
  const elDonut = document.getElementById("categoryDonutChart");
  if (elDonut) {
    const ctxDonut = elDonut.getContext("2d");
    if (categoryDonutChart) categoryDonutChart.destroy();

    const donutLabels = sortedCats.map(c => `${CATEGORIES[c]?.icon || ''} ${c}`);
    const donutData = sortedCats.map(c => catTotals[c]);
    const donutColors = sortedCats.map(c => CATEGORIES[c]?.color || "#64748b");

    categoryDonutChart = new Chart(ctxDonut, {
      type: "doughnut",
      data: {
        labels: donutLabels,
        datasets: [{
          data: donutData,
          backgroundColor: donutColors,
          borderWidth: 2,
          borderColor: "rgba(17, 24, 39, 0.8)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#94a3b8", font: { family: "'Outfit', sans-serif" } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw;
                const pct = totalSpend > 0 ? Math.round((val / totalSpend) * 100) : 0;
                return `${ctx.label}: ₹${val.toLocaleString('en-IN')} (${pct}%)`;
              }
            }
          }
        },
        cutout: "65%"
      }
    });
  }

  // Progress Bars List
  const progressContainer = document.getElementById("categoryProgressContainer");
  if (progressContainer) {
    progressContainer.innerHTML = "";

    if (sortedCats.length === 0) {
      progressContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No spending recorded for this month.</p>`;
      return;
    }

    sortedCats.forEach(cat => {
      const amt = catTotals[cat];
      const pct = totalSpend > 0 ? ((amt / totalSpend) * 100).toFixed(1) : 0;
      const catInfo = CATEGORIES[cat] || CATEGORIES["Other"];

      const itemDiv = document.createElement("div");
      itemDiv.className = "cat-progress-item";
      itemDiv.innerHTML = `
        <div class="cat-progress-header">
          <span>${catInfo.icon} ${cat}</span>
          <span>₹${amt.toLocaleString('en-IN')} <span style="color: var(--text-muted); font-size: 0.78rem;">(${pct}%)</span></span>
        </div>
        <div class="cat-progress-track">
          <div class="cat-progress-bar" style="width: ${pct}%; background: ${catInfo.color};"></div>
        </div>
      `;
      progressContainer.appendChild(itemDiv);
    });
  }
}

// ========================================================
// --- AI NATURAL LANGUAGE PROMPT PARSER (0ms Instant) ---
// ========================================================
function parseAIPrompt(rawText) {
  if (!rawText || !rawText.trim()) return null;
  const text = rawText.trim().toLowerCase();

  // 1. Extract Amount
  // Matches: "spent 200 for today", "spend 10 now", "spent 500", "200", "10", "paid 50", "₹20"
  let amount = null;
  const numMatch = text.match(/(?:(?:rs\.?|₹|inr)\s*(\d+(?:\.\d+)?))|(?:(?:spent|spend|paid|pay)\s*(\d+(?:\.\d+)?))|(?:\b(\d+(?:\.\d+)?)\s*(?:rs|rupees|bucks)?\b)/i);
  if (numMatch) {
    amount = Number(numMatch[1] || numMatch[2] || numMatch[3]);
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  // 2. Extract Date
  let targetDate = getTodayDateStr();
  let timeStr = formatCurrentTimeStr();

  if (/\b(yesterday|yday)\b/i.test(text)) {
    targetDate = getYesterdayDateStr();
  } else if (/\b(day before yesterday)\b/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    targetDate = formatDateISO(d);
  }

  // 3. Extract Payment Mode
  let paymentMode = "UPI";
  if (/\b(cash)\b/i.test(text)) paymentMode = "Cash";
  else if (/\b(credit\s*card|cc)\b/i.test(text)) paymentMode = "Credit Card";
  else if (/\b(debit\s*card|dc)\b/i.test(text)) paymentMode = "Debit Card";
  else if (/\b(net\s*banking)\b/i.test(text)) paymentMode = "Net Banking";
  else if (/\b(gpay|phonepe|paytm|upi)\b/i.test(text)) paymentMode = "UPI";

  // 4. Infer Category and Clean Description (if user specifies, otherwise simple "Expense")
  let matchedCategory = "Other";
  let inferredNote = "";

  for (const cat of Object.keys(CATEGORIES)) {
    const keywords = CATEGORIES[cat].keywords;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) {
        matchedCategory = cat;
        inferredNote = capitalizeFirst(kw);
        break;
      }
    }
    if (inferredNote) break;
  }

  // Derive human clean description from prompt
  let cleanDesc = rawText.trim()
    .replace(/(?:spent|spend|paid|pay|for|in|morning|evening|night|today|yesterday|via|rupees|rs\.?|₹|bucks|now)\b/gi, '')
    .replace(/\b\d+(\.\d+)?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanDesc || cleanDesc.length < 2) {
    cleanDesc = inferredNote || "Expense";
  } else {
    cleanDesc = capitalizeFirst(cleanDesc);
  }

  return {
    id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    date: targetDate,
    time: timeStr,
    month: targetDate.substring(0, 7),
    amount: amount,
    description: cleanDesc,
    category: matchedCategory,
    paymentMode: paymentMode,
    source: "AI Agent",
    createdAt: new Date().toISOString()
  };
}

// --- Add / Edit Expense Logic ---
function addExpenseRecord(expense, syncCloud = true) {
  expenses.unshift(expense);
  saveToLocalStorage();
  
  // Switch to the month of the added expense so the user sees it immediately
  selectedMonth = expense.month;
  renderApp();
  showToast(`Logged ₹${expense.amount} for "${expense.description}"! 💸`);

  if (syncCloud) {
    syncExpenseToCloud(expense);
  }
}

function updateExpenseRecord(updatedExpense) {
  const index = expenses.findIndex(e => e.id === updatedExpense.id);
  if (index !== -1) {
    expenses[index] = updatedExpense;
    saveToLocalStorage();
    renderApp();
    showToast(`Updated expense "${updatedExpense.description}"!`);

    postToGas({
      action: "updateExpense",
      expense: updatedExpense
    });
  }
}

function deleteExpenseItem(id) {
  const item = expenses.find(e => e.id === id);
  const note = item ? item.description : "Expense";
  
  if (confirm(`Are you sure you want to delete "${note}" (₹${item?.amount || ''})?`)) {
    expenses = expenses.filter(e => e.id !== id);
    saveToLocalStorage();
    renderApp();
    showToast(`Deleted "${note}".`);

    postToGas({
      action: "deleteExpense",
      id: id
    });
  }
}

// --- Cloud Sync (Google Sheets & Apps Script) ---
async function syncExpenseToCloud(expense) {
  updateSyncBadge(true, "Syncing...");
  try {
    const res = await postToGas({
      action: "addExpense",
      expense: expense
    });
    if (res && res.status === "success") {
      updateSyncBadge(true, "Sheets Synced");
    } else {
      updateSyncBadge(false, "Sync Warning");
    }
  } catch (err) {
    console.warn("Cloud sync error:", err);
    updateSyncBadge(false, "Offline / Saved Local");
  }
}

async function fetchFromGoogleSheets(showToasts = true) {
  updateSyncBadge(true, "Syncing...");

  try {
    const res = await fetch(`${EXPENSE_GAS_URL}?action=getExpenses&userId=2108&t=${Date.now()}`);
    const data = await res.json();

    if (data && data.status === "success") {
      // Direct live cloud sync: exact state from Google Sheet across all devices
      expenses = (data.expenses || []).map(cloudExp => ({
        ...cloudExp,
        date: normalizeDateStr(cloudExp.date),
        month: normalizeMonthStr(cloudExp.month || cloudExp.date),
        time: normalizeTimeStr(cloudExp.time)
      }));
      saveToLocalStorage();
      renderApp();

      updateSyncBadge(true, "Sheets Synced");
      if (showToasts) showToast(`Synced with Google Sheet! ☁️`);
    } else {
      updateSyncBadge(false, "Sync Warning");
    }
  } catch (err) {
    console.warn("Failed to fetch cloud expenses:", err);
    updateSyncBadge(false, "Offline / Local");
    if (showToasts) showToast("Could not reach Google Sheets. Using local data.", "error");
  }
}

async function postToGas(payload) {
  // Uses text/plain to bypass CORS preflight issues on Google Apps Script
  const response = await fetch(EXPENSE_GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return await response.json();
}

function updateSyncBadge(isConnected, text) {
  const badge = document.getElementById("syncNowBtn");
  const textEl = document.getElementById("syncStatusText");
  if (textEl) textEl.textContent = text;

  if (badge) {
    if (isConnected) {
      badge.classList.remove("disconnected");
    } else {
      badge.classList.add("disconnected");
    }
  }
}

// --- Event Listeners & UI Controls ---
function setupEventListeners() {
  // AI Prompt Form Submit
  aiPromptForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = aiPromptInput.value.trim();
    if (!text) return;

    const parsed = parseAIPrompt(text);
    if (!parsed) {
      showToast("Could not parse amount from prompt. E.g. 'spent 20 for tea'", "error");
      return;
    }

    addExpenseRecord(parsed);
    aiPromptInput.value = "";
  });

  // AI Quick Prompt Chips
  document.querySelectorAll(".quick-chip, .prompt-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const promptText = chip.getAttribute("data-prompt");
      const parsed = parseAIPrompt(promptText);
      if (parsed) {
        addExpenseRecord(parsed);
      }
    });
  });

  // Navigation Tabs (Daily Spending / Monthly Comparison)
  document.querySelectorAll(".segment-btn, .tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".segment-btn, .tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const targetTab = btn.getAttribute("data-tab");
      currentTab = targetTab;

      document.querySelectorAll(".view-content").forEach(v => {
        v.style.display = "none";
        v.classList.remove("active");
      });
      const activeEl = document.getElementById(targetTab);
      if (activeEl) {
        activeEl.style.display = "block";
        activeEl.classList.add("active");
      }

      renderApp();
    });
  });

  // Month Select Dropdown Change
  monthSelect.addEventListener("change", (e) => {
    selectedMonth = e.target.value;
    renderApp();
  });

  // Prev / Next Month
  prevMonthBtn.addEventListener("click", () => {
    const months = getAvailableMonths();
    const idx = months.indexOf(selectedMonth);
    if (idx < months.length - 1) {
      selectedMonth = months[idx + 1];
      renderApp();
    }
  });

  nextMonthBtn.addEventListener("click", () => {
    const months = getAvailableMonths();
    const idx = months.indexOf(selectedMonth);
    if (idx > 0) {
      selectedMonth = months[idx - 1];
      renderApp();
    }
  });

  // Search & Filters
  searchInput.addEventListener("input", () => renderDailyBreakdown());
  categoryFilter.addEventListener("change", () => renderDailyBreakdown());
  sortFilter.addEventListener("change", () => renderDailyBreakdown());

  // Expense Modal open / close
  openAddModalBtn.addEventListener("click", () => openExpenseModalForAdd());
  closeExpenseModal.addEventListener("click", () => expenseModal.classList.remove("active"));
  cancelExpenseBtn.addEventListener("click", () => expenseModal.classList.remove("active"));

  // Expense Form Submit
  expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = editExpenseId.value;
    const amount = Number(formAmount.value);
    const desc = formDescription.value.trim();
    const cat = formCategory.value;
    const payment = formPaymentMode.value;
    const date = formDate.value;
    const time = formTime.value.trim() || formatCurrentTimeStr();

    if (!amount || !desc || !date) return;

    if (id) {
      // Editing existing
      const existing = expenses.find(x => x.id === id);
      const updated = {
        ...(existing || {}),
        id: id,
        amount: amount,
        description: desc,
        category: cat,
        paymentMode: payment,
        date: date,
        time: time,
        month: date.substring(0, 7)
      };
      updateExpenseRecord(updated);
    } else {
      // Adding new
      const newExp = {
        id: "exp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        date: date,
        time: time,
        month: date.substring(0, 7),
        amount: amount,
        description: desc,
        category: cat,
        paymentMode: payment,
        source: "App",
        createdAt: new Date().toISOString()
      };
      addExpenseRecord(newExp);
    }

    expenseModal.classList.remove("active");
  });

  // 1-Click Sync Now with Google Sheet
  if (syncNowBtn) {
    syncNowBtn.addEventListener("click", () => {
      fetchFromGoogleSheets(true);
    });
  }

  // Export JSON Backup
  if (exportDataBtn) {
    exportDataBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_backup_${getTodayDateStr()}.json`;
      a.click();
      showToast("Downloaded expense backup JSON! 📥");
    });
  }

  // Theme Toggle Button (Mobile fast-tap switch)
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const themes = ["default", "alt-dark", "light"];
      const current = document.documentElement.getAttribute("data-theme") || "default";
      const nextIndex = (themes.indexOf(current) + 1) % themes.length;
      const next = themes[nextIndex];
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("expense_theme", next);
      if (themeSelect) themeSelect.value = next;
      updateThemeIcon(next);
      showToast(`Switched theme to ${next === 'alt-dark' ? 'OLED' : capitalizeFirst(next)}`);
    });
  }

  // Theme Selector (Fallback)
  if (themeSelect) {
    themeSelect.addEventListener("change", (e) => {
      const theme = e.target.value;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("expense_theme", theme);
      updateThemeIcon(theme);
    });
  }
}

// --- Modal Helpers ---
function openExpenseModalForAdd() {
  modalTitle.textContent = "Add New Expense";
  editExpenseId.value = "";
  formAmount.value = "";
  formDescription.value = "";
  formCategory.value = "Food & Drinks";
  formPaymentMode.value = "UPI";
  formDate.value = getTodayDateStr();
  formTime.value = formatCurrentTimeStr();
  expenseModal.classList.add("active");
  formAmount.focus();
}

function openExpenseModalForEdit(id) {
  const item = expenses.find(e => e.id === id);
  if (!item) return;

  modalTitle.textContent = "Edit Expense";
  editExpenseId.value = item.id;
  formAmount.value = item.amount;
  formDescription.value = item.description;
  formCategory.value = item.category || "Food & Drinks";
  formPaymentMode.value = item.paymentMode || "UPI";
  formDate.value = item.date;
  formTime.value = item.time || "";
  expenseModal.classList.add("active");
  formAmount.focus();
}

// Make accessible to global scope for HTML onclick
window.openExpenseModalForAdd = openExpenseModalForAdd;
window.openExpenseModalForEdit = openExpenseModalForEdit;
window.deleteExpenseItem = deleteExpenseItem;

// --- Date & Formatting Utilities ---
function getTodayDateStr() {
  const d = new Date();
  return formatDateISO(d);
}

function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateISO(d);
}

function formatDateISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrentTimeStr() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatMonthReadable(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(year, parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatFullDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split('-');
  const date = new Date(y, parseInt(m, 10) - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split('-');
  const date = new Date(y, parseInt(m, 10) - 1, d);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
  if (!text) return "";
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function normalizeMonthStr(m) {
  if (!m) return "";
  if (/^\d{4}-\d{2}$/.test(m)) return m;
  const d = new Date(m);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${mo}`;
  }
  return String(m).substring(0, 7);
}

function normalizeDateStr(dStr) {
  if (!dStr) return getTodayDateStr();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const d = new Date(dStr);
  if (!isNaN(d.getTime())) {
    return formatDateISO(d);
  }
  return String(dStr).substring(0, 10);
}

function normalizeTimeStr(t) {
  if (!t) return "";
  if (t.includes("GMT") || t.includes("1899")) {
    const d = new Date(t);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  }
  return t;
}

function initTheme() {
  const saved = localStorage.getItem("expense_theme") || "default";
  document.documentElement.setAttribute("data-theme", saved);
  if (themeSelect) themeSelect.value = saved;
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  const iconEl = document.getElementById("themeIcon");
  if (!iconEl) return;
  if (theme === "light") {
    iconEl.setAttribute("data-lucide", "sun");
  } else if (theme === "alt-dark") {
    iconEl.setAttribute("data-lucide", "zap");
  } else {
    iconEl.setAttribute("data-lucide", "moon");
  }
  lucide.createIcons();
}

function showToast(msg, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" style="width: 18px; height: 18px; color: ${type === 'success' ? '#10b981' : '#ef4444'};"></i>
    <span>${escapeHtml(msg)}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.animation = "slide-toast 0.25s ease reverse forwards";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

