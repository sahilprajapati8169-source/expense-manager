const API = 
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://expense-manager-backend-2z6k.onrender.com";

    const categories = ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Others'];

let isAddingExpense = false; // ✅ DUPLICATE ROKNE KE LIYE

// 🔐 AUTH GUARD (GLOBAL)
async function checkAuth() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error("Unauthorized");
    }

    const user = await res.json();
    localStorage.setItem("userData", JSON.stringify(user));
    await loadLimitsFromBackend();

  } catch (err) {
    console.warn("🔒 Auth failed, logging out");
    localStorage.clear();
    window.location.href = "login.html";
  }
}

// Common logout function
function logoutUser() {
  localStorage.clear();
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize toggle eyes for password fields
  document.querySelectorAll(".toggle-eye").forEach(eye => {
    eye.addEventListener("click", function () {
      const input = this.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        this.textContent = "🙈";
      } else {
        input.type = "password";
        this.textContent = "👁️";
      }
    });
  });

  // Check auth for protected pages
  if (
    window.location.pathname.includes("dashboard.html") ||
    window.location.pathname.includes("exphistory.html") ||
    window.location.pathname.includes("add-expense.html") ||
    window.location.pathname.includes("set-limit.html") ||
    window.location.pathname.includes("setting.html") ||
    window.location.pathname.includes("notes.html") ||
    window.location.pathname.includes("trash.html")
  ) {
    await checkAuth();
  }

  initApp();

  // Load data based on page
  if (window.location.pathname.includes("dashboard.html")) {
    loadExpensesFromBackend();
  } else if (window.location.pathname.includes("exphistory.html")) {
    renderHistoryPage();
  } else if (window.location.pathname.includes("notes.html")) {
    renderNotes();
  } else if (window.location.pathname.includes("trash.html")) {
    renderTrash();
  }
});

// Data Structures
let expenses = [];
let totalLimit = parseFloat(localStorage.getItem('totalLimit')) || 0;
let categoryLimits = {};
try {
  const stored = localStorage.getItem("categoryLimits");
  if (stored && stored !== "undefined") {
    categoryLimits = JSON.parse(stored);
  }
} catch {}

// Charts
let overviewChart, growthChart;

// Init on load
function initApp() {
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.value = new Date().toISOString().split("T")[0];
    dateInput.addEventListener("keydown", function (e) {
      e.preventDefault();
    });
  }

  // Initialize phone input for signup (FIXED ID)
  const phoneInputField = document.getElementById("signup-mobile");
  if (phoneInputField) {
    window.phoneInput = window.intlTelInput(phoneInputField, {
  utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
  separateDialCode: true,
  preferredCountries: ["in", "us", "gb"],
  initialCountry: "in",
  nationalMode: false
});

  }



  if (window.location.pathname.includes('dashboard.html')) {
    updateSummary();
    renderTransactions();
    initCharts();
    renderCategoryCharts(getCategorySummary());
  }
   else if (window.location.pathname.includes('setting.html')) {
    loadSettings();
  }

  // Hamburger / Sidebar
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const closeBtn = document.getElementById("sidebar-close");
  const profileBtn = document.getElementById("profile-btn");
  const profilePopup = document.getElementById("profile-popup");
  const logoutProfile = document.getElementById("logout-profile");
  const editBtn = document.getElementById("edit-profile");
  const logoutLink = document.querySelector(".logout");

  // SIDEBAR OPEN
  hamburger?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.add("active");
    overlay.classList.add("active");
    if (profilePopup) profilePopup.style.display = "none";
  });

  // SIDEBAR CLOSE
  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  }

  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  // PROFILE TOGGLE
  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeSidebar();

    const user = JSON.parse(localStorage.getItem("userData"));
    if (user && profilePopup) {
      document.getElementById("p-name").textContent = user.name;
      document.getElementById("p-email").textContent = user.email;
      document.getElementById("p-mobile").textContent = user.mobile;
      document.getElementById("p-country").textContent = user.country;

      profilePopup.style.display =
        profilePopup.style.display === "block" ? "none" : "block";
    }
  });

  // OUTSIDE CLICK → PROFILE CLOSE
  document.addEventListener("click", () => {
    const profilePopup = document.getElementById("profile-popup");
    if (profilePopup) profilePopup.style.display = "none";
  });

  // PROFILE KE ANDAR CLICK SAFE
  profilePopup?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // LOGOUT HANDLERS
  logoutProfile?.addEventListener("click", logoutUser);
  logoutLink?.addEventListener("click", (e) => {
    e.preventDefault();
    logoutUser();
  });

  editBtn?.addEventListener("click", () => {
    window.location.href = "setting.html";
  });

  // ✅✅✅ ADD EXPENSE FORM - FIXED DUPLICATE ISSUE ✅✅✅
  const expenseForm = document.getElementById("expense-form");
  if (expenseForm) {
    // Remove old listener if exists
    const newForm = expenseForm.cloneNode(true);
    expenseForm.parentNode.replaceChild(newForm, expenseForm);
    
    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // ✅ STOP DUPLICATE SUBMISSION
      if (isAddingExpense) {
        console.log("⏳ Already adding expense, please wait...");
        return;
      }
      
      isAddingExpense = true;
      
      const submitBtn = newForm.querySelector('button[type="submit"]');
      const originalText = submitBtn?.textContent || "Add Expense";
      const originalBg = submitBtn?.style.backgroundColor;
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Adding...";
        submitBtn.style.backgroundColor = "#999";
        submitBtn.style.cursor = "not-allowed";
      }

      const notesValue = document.getElementById("notes")?.value.trim() || "";
      const amount = Number(document.getElementById("amount")?.value);
      const category = document.getElementById("category")?.value;
      const date = document.getElementById("date")?.value;

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please login again");
        window.location.href = "login.html";
        isAddingExpense = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          submitBtn.style.backgroundColor = originalBg;
          submitBtn.style.cursor = "pointer";
        }
        return;
      }

      try {
        console.log("📤 Adding expense to backend...");
        
        const res = await fetch(`${API}/api/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            title: category,
            notes: notesValue,
            amount,
            category,
            date
          })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Failed to add expense");
          return;
        }

        alert("✅ Expense added successfully!");
        
        // ✅ CLEAR FORM
        newForm.reset();
        
        // ✅ REDIRECT AFTER DELAY
        setTimeout(() => {
          if (window.location.pathname.includes("dashboard.html")) {
            location.reload();
          } else {
            window.location.href = "dashboard.html";
          }
        }, 800);
        
      } catch (err) {
        console.error("❌ Error:", err);
        alert("Server error. Please try again.");
      } finally {
        // ✅ RESET BUTTON STATE
        isAddingExpense = false;
        if (submitBtn) {
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            submitBtn.style.backgroundColor = originalBg;
            submitBtn.style.cursor = "pointer";
          }, 1000);
        }
      }
    });
  }
}

// Animation counter
function animateValue(id, start, end, duration = 800) {
  const el = document.getElementById(id);
  if (!el) return;

  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    el.textContent = (progress * (end - start) + start).toFixed(2);
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// Update Summary Cards
function updateSummary() {
  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  animateValue("total-expense", 0, totalExpense);
  animateValue("balance", 0, totalLimit - totalExpense);
  animateValue("total-limit", 0, totalLimit);
}

async function loadExpensesFromBackend() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/api/expenses`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    expenses = data;
    updateSummary();
    renderTransactions();
    if (window.location.pathname.includes('dashboard.html')) {
      updateOverviewChart();
      updateGrowthChart();
      renderCategoryCharts(getCategorySummary());
    }
  } catch (err) {
    console.error("❌ Failed to load expenses", err);
  }
}

// Render Recent Transactions
async function renderTransactions() {
  const tbody = document.querySelector("#transactions-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/api/expenses`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    const recent = data
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    if (recent.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;opacity:.6">
            No transactions found
          </td>
        </tr>
      `;
      return;
    }

    recent.forEach(exp => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(exp.date).toLocaleDateString()}</td>
        <td>${exp.category}</td>
        <td>${exp.notes || "-"}</td>
        <td style="color:#ef4444">₹${exp.amount}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("❌ Failed to load transactions", err);
  }
}

let currentEditId = null;

async function openEditPopup(id) {
  try {
    currentEditId = id;
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login again");
      return;
    }

    const res = await fetch(`${API}/api/expenses/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      alert("Failed to fetch expense");
      return;
    }

    const exp = await res.json();
    document.getElementById("edit-date").value = exp.date.split("T")[0];
    document.getElementById("edit-category").value = exp.category;
    document.getElementById("edit-notes").value = exp.notes || "";
    document.getElementById("edit-amount").value = exp.amount;
    document.getElementById("edit-modal").style.display = "flex";
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
}

function closeEditPopup() {
  document.getElementById("edit-modal").style.display = "none";
}

async function saveEdit() {
  const token = localStorage.getItem("token");
  if (!token || !currentEditId) return;

  try {
    await fetch(`${API}/api/expenses/${currentEditId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        date: document.getElementById("edit-date").value,
        category: document.getElementById("edit-category").value,
        notes: document.getElementById("edit-notes").value,
        amount: Number(document.getElementById("edit-amount").value)
      })
    });

    closeEditPopup();
    if (window.location.pathname.includes("exphistory.html")) {
      renderHistoryPage();
    }
    if (window.location.pathname.includes("dashboard.html")) {
      renderTransactions();
      loadExpensesFromBackend();
    }
  } catch (err) {
    console.error("❌ Save edit failed", err);
  }
}

async function deleteExpense() {
  const token = localStorage.getItem("token");
  if (!token || !currentEditId) return;

  await fetch(`${API}/api/expenses/${currentEditId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  closeEditPopup();
  if (window.location.pathname.includes("exphistory.html")) {
    renderHistoryPage();
  }
  if (window.location.pathname.includes("dashboard.html")) {
    renderTransactions();
    loadExpensesFromBackend();
  }
}

async function renderHistoryPage() {
  const tbody = document.getElementById("fullHistoryTable");
  if (!tbody) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/api/expenses`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const expenses = await res.json();
    tbody.innerHTML = "";

    if (expenses.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;opacity:.6">
            No expense history
          </td>
        </tr>
      `;
      return;
    }

    expenses.forEach(exp => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${exp.date.split("T")[0]}</td>
        <td>${exp.category}</td>
        <td>${exp.notes || "-"}</td>
        <td style="color:#ef4444">₹${exp.amount}</td>
        <td>
          <button onclick="openEditPopup('${exp._id}')">✏️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load history", err);
  }
}

// ================= TRASH PAGE FUNCTIONS =================
async function renderTrash() {
  const tbody = document.querySelector("#trash-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/api/expenses/trash`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const trash = await res.json();

    if (trash.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;opacity:.6">
            Trash is empty
          </td>
        </tr>
      `;
      return;
    }

    trash.forEach(exp => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${exp.date.split("T")[0]}</td>
        <td>${exp.category}</td>
        <td style="color:#ef4444">₹${exp.amount}</td>
        <td>${new Date(exp.deletedAt).toLocaleString()}</td>
        <td>
          <button onclick="restoreExpense('${exp._id}')">♻ Restore</button>
          <button onclick="deleteForever('${exp._id}')">❌ Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("❌ Failed to load trash", err);
  }
}

async function restoreExpense(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login again");
    return;
  }

  try {
    await fetch(`${API}/api/expenses/${id}/restore`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    alert("✅ Expense restored");
    renderTrash();
  } catch (err) {
    console.error("Restore failed", err);
    alert("Restore failed");
  }
}


function deleteForever(index) {
  if (!confirm("Delete permanently?")) return;

  let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
  const deletedItems = expenses.filter(e => e.deleted);

  const item = deletedItems[index];
  expenses = expenses.filter(e => e !== item);

  localStorage.setItem("expenses", JSON.stringify(expenses));
  renderTrash();
}

// Charts Initialization
function initCharts() {
  updateOverviewChart();
  updateGrowthChart();
}

const limitLabelPlugin = {
  id: "limitLabel",
  afterDraw(chart) {
    const { ctx, chartArea: { right }, scales: { y } } = chart;
    const limitDataset = chart.data.datasets.find(d => d.label === "Limit");
    if (!limitDataset) return;

    const limitValue = limitDataset.data[0];
    const yPos = y.getPixelForValue(limitValue);

    ctx.save();
    ctx.fillStyle = "#ff3b3b";
    ctx.font = "bold 12px Poppins";
    ctx.textAlign = "right";
    ctx.fillText(`₹ ${limitValue}`, right - 8, yPos - 6);
    ctx.restore();
  }
};

// Overview Chart
function updateOverviewChart() {
  const filter = document.getElementById("time-filter")?.value || "monthly";
  const limitValue = getCalculatedLimit(filter);
  const grouped = groupExpenses(filter);
  const labels = Object.keys(grouped);
  const data = Object.values(grouped);

  const ctx = document.getElementById("overview-chart")?.getContext("2d");
  if (!ctx) return;

  if (overviewChart) overviewChart.destroy();

  overviewChart = new Chart(ctx, {
    plugins: [limitLabelPlugin],
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Expenses",
          data,
          borderRadius: 10,
          backgroundColor: (ctx) => {
            const value = ctx.raw;
            return value > limitValue ? "#ef4444" : "#6a7cff";
          }
        },
        {
          label: "Limit",
          data: labels.map(() => limitValue),
          type: "line",
          borderColor: "#ff3b3b",
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      animation: {
        duration: 1200,
        easing: "easeOutQuart"
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              if (ctx.dataset.label === "Expenses") {
                const diff = ctx.raw - limitValue;
                return diff > 0 ? `Limit exceeded by ₹${diff}` : "Within limit";
              }
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  });
}

function getCalculatedLimit(period) {
  const monthly = Number(localStorage.getItem("totalLimit")) || 0;
  if (!monthly) return 0;

  switch (period) {
    case "daily": return monthly / 30;
    case "weekly": return monthly / 4;
    case "monthly": return monthly;
    case "yearly": return monthly * 12;
    default: return monthly;
  }
}

// Growth Chart
function updateGrowthChart() {
  const monthly = groupExpenses("monthly");
  const labels = Object.keys(monthly);
  const monthlyValues = Object.values(monthly);
  const monthlyLimit = Number(localStorage.getItem("totalLimit")) || 0;

  const ctx = document.getElementById("growth-chart")?.getContext("2d");
  if (!ctx) return;

  if (growthChart) growthChart.destroy();

  growthChart = new Chart(ctx, {
    plugins: [limitLabelPlugin],
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Monthly Expenses",
          data: monthlyValues,
          borderColor: "#ff6b81",
          backgroundColor: (ctx) => {
            const value = ctx.raw;
            return value > monthlyLimit ? "rgba(255, 0, 0, 0.15)" : "rgba(255,107,129,0.15)";
          },
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: (ctx) => ctx.raw > monthlyLimit ? "#ef4444" : "#ff6b81"
        },
        {
          label: "Limit",
          data: labels.map(() => monthlyLimit),
          borderColor: "#ef4444",
          borderDash: [6, 6],
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              if (ctx.dataset.label === "Monthly Expenses") {
                const diff = ctx.raw - monthlyLimit;
                return diff > 0 ? `Limit exceeded by ₹${diff}` : "Within limit";
              }
            }
          }
        }
      },
      scales: { y: { beginAtZero: true } }
    }
  });

  showGrowthInsight(monthly);
}

function showGrowthInsight(monthly) {
  const values = Object.values(monthly);
  if (values.length < 2) return;

  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const change = last - prev;
  const percent = prev === 0 ? 100 : ((change / prev) * 100).toFixed(1);
  const box = document.getElementById("growth-insight");
  
  if (!box) return;
  
  box.innerHTML = change > 0
    ? `📈 Expense increased by <b>${percent}%</b> this month`
    : `📉 Expense decreased by <b>${Math.abs(percent)}%</b> this month`;
}

// Group Expenses by period
function groupExpenses(period) {
  const groups = {};

  expenses.forEach(exp => {
    const date = new Date(exp.date);
    let key;

    if (period === 'daily') {
      key = exp.date;
    } else if (period === 'weekly') {
      const week = getWeekNumber(date);
      key = `Week ${week}`;
    } else if (period === 'monthly') {
      key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    } else if (period === 'yearly') {
      key = date.getFullYear();
    }

    groups[key] = (groups[key] || 0) + exp.amount;
  });

  return groups;
}

function getWeekNumber(d) {
  d = new Date(d);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Category Charts
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const dataset = chart.data.datasets[0];
    const spent = dataset.data[0];
    const remaining = dataset.data[1];
    const total = spent + remaining;

    if (total === 0) return;
    const percent = Math.round((spent / total) * 100);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px Poppins';
    ctx.fillStyle = document.body.classList.contains("dark-mode") ? '#f9fafb' : '#111827';
    ctx.fillText(percent + '%', chartArea.left + chartArea.width / 2, chartArea.top + chartArea.height / 2 - 6);
    
    ctx.font = '12px Poppins';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Used', chartArea.left + chartArea.width / 2, chartArea.top + chartArea.height / 2 + 14);
    ctx.restore();
  }
};

function getCategorySummary() {
  return categories.map(cat => {
    const spent = expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      name: cat,
      spent: spent,
      limit: categoryLimits[cat] || 0
    };
  });
}

function renderCategoryCharts(categoryData) {
  const container = document.getElementById("category-charts");
  if (!container) return;

  if (categoryData.every(c => c.spent === 0 && c.limit === 0)) {
    container.innerHTML = "<p style='color:#777'>No category data available</p>";
    return;
  }

  container.innerHTML = "";
  categoryData.forEach((cat, index) => {
    const card = document.createElement("div");
    card.className = "category-card";
    const exceeded = cat.spent - cat.limit;

    if (cat.limit && cat.spent > cat.limit) {
      card.classList.add("over-limit");
    }

    card.innerHTML = `
      <h4>${cat.name}</h4>
      <div class="chart-wrap">
        <canvas id="catChart${index}"></canvas>
        ${exceeded > 0 ? `<div class="tooltip">Limit exceeded by ₹${exceeded}</div>` : ''}
      </div>
      <div class="amount">₹${cat.spent} / ₹${cat.limit}</div>
    `;

    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      renderTransactions(cat.name);
    });

    container.appendChild(card);

    new Chart(document.getElementById(`catChart${index}`), {
      type: 'doughnut',
      data: {
        labels: ['Spent', 'Remaining'],
        datasets: [{
          data: [cat.spent, Math.max(cat.limit - cat.spent, 0)],
          backgroundColor: ['#ff7a8a', '#7fd3c8'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `₹${ctx.raw}`
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });
  });
}

// Set Limits Page
function loadLimitsForm() {
  const totalInput = document.getElementById("total-limit-input");
  const container = document.getElementById("category-limits");

  if (!container || !totalInput) return;

  totalInput.value = totalLimit;

  // 🔥 VERY IMPORTANT
  container.innerHTML = "";

  categories.forEach(cat => {
    const row = document.createElement("div");
    row.className = "limit-row";

    row.innerHTML = `
      <label>${cat}</label>
      <input 
        type="number"
        min="0"
        data-cat="${cat}"
        value="${categoryLimits[cat] || 0}"
      />
    `;

    container.appendChild(row);
  });

  updateRemaining();
}


function getCategoryTotal() {
  let total = 0;
  document.querySelectorAll("#category-limits input").forEach(input => {
    total += Number(input.value) || 0;
  });
  return total;
}

async function saveLimits() {
  const token = localStorage.getItem("token");

  const totalMonthlyLimit = Number(
    document.getElementById("total-limit-input").value
  );

  const categoryLimits = {};
  document.querySelectorAll("#category-limits input").forEach(input => {
    categoryLimits[input.dataset.cat] = Number(input.value) || 0;
  });

  try {
    const res = await fetch(`${API}/api/limits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        totalLimit: totalMonthlyLimit,
        categoryLimits
      })
    });

    if (!res.ok) throw new Error();

    alert("✅ Limits saved (cloud synced)");
    window.location.href = "dashboard.html";

  } catch {
    alert("❌ Failed to save limits");
  }
}

async function loadLimitsFromBackend() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/api/limits`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!data) return;

    localStorage.setItem("totalLimit", data.totalLimit);
    localStorage.setItem(
      "categoryLimits",
      JSON.stringify(data.categoryLimits)
    );

  } catch (err) {
    console.error("Failed to load limits");
  }
}

function updateRemaining() {
  const total = Number(document.getElementById("total-limit-input")?.value) || 0;
  let used = 0;
  
  document.querySelectorAll("#category-limits input").forEach(input => {
    used += Number(input.value) || 0;
  });

  const remaining = total - used;
  const el = document.getElementById("remaining-limit");
  
  if (!el) return;

  if (remaining > 0) {
    el.textContent = `🟢 Remaining to assign: ₹${remaining}`;
    el.style.color = "#16a34a";
  } else if (remaining === 0) {
    el.textContent = `✅ Perfect! All budget assigned`;
    el.style.color = "#2563eb";
  } else {
    el.textContent = `🔴 Exceeded by ₹${Math.abs(remaining)}`;
    el.style.color = "#dc2626";
  }
}

// ================= SETTINGS PAGE LOGIC =================
function loadSettings() {
  const user = JSON.parse(localStorage.getItem("userData"));
  if (!user) return;

  document.getElementById("set-name").value = user.name;
  document.getElementById("set-email").value = user.email;
  document.getElementById("set-mobile").value = user.mobile;
  document.getElementById("set-country").value = user.country;
}

function saveProfile() {
  const user = JSON.parse(localStorage.getItem("userData"));
  if (!user) return;

  user.name = document.getElementById("set-name").value.trim();
  user.mobile = document.getElementById("set-mobile").value.trim();
  user.country = document.getElementById("set-country").value.trim();

  localStorage.setItem("userData", JSON.stringify(user));
  alert("Profile updated successfully ✅");
}

// Clear All Data
async function clearAllData() {
  if (!confirm("⚠️ All expenses will move to Trash. Continue?")) return;

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please login again");
    return;
  }

  try {
    const res = await fetch(`${API}/api/expenses/trash/all`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to clear expenses");
      return;
    }

    alert("✅ All expenses moved to Trash");
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}


// Authentication Functions
function validateEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu)$/;
  return regex.test(email);
}

// LOGIN LOGIC
document.addEventListener("DOMContentLoaded", () => {

  const loginBtn = document.getElementById("login-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {

      const email = document.getElementById("login-email")?.value.trim();
      const password = document.getElementById("login-password")?.value.trim();

      if (!email || !password) {
        alert("Email & Password required");
        return;
      }

      try {
        const res = await fetch(`${API}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Login failed");
          return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("userData", JSON.stringify(data.user));
        alert("Login successful ✅");
        window.location.href = "dashboard.html";

      } catch {
        alert("Server error");
      }

    });
  }

});

// SIGNUP LOGIC
document.addEventListener("DOMContentLoaded", () => {

  const signupBtn = document.getElementById("signup-btn");

  if (signupBtn) {
    signupBtn.addEventListener("click", async () => {

      const name = document.getElementById("signup-name")?.value.trim();
      const email = document.getElementById("signup-email")?.value.trim();
      const password = document.getElementById("signup-password")?.value.trim();
      const confirm = document.getElementById("signup-confirm")?.value.trim();
      const terms = document.getElementById("terms")?.checked;

      if (!name || !email || !password || !confirm) {
        alert("Fill all fields");
        return;
      }

      if (password !== confirm) {
        alert("Passwords do not match");
        return;
      }

      if (!terms) {
        alert("Please accept Terms & Privacy");
        return;
      }

      try {
        const iti = window.phoneInput;

        if (!iti || !iti.isValidNumber()) {
          alert("Enter valid mobile number");
          return;
        }

        const mobile = iti.getNumber();
        const country = iti.getSelectedCountryData().name;

        const res = await fetch(`${API}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, mobile, country })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Signup failed");
          return;
        }

        alert("Signup successful ✅");
        window.location.href = "login.html";

      } catch {
        alert("Server error");
      }

    });
  }

});

// ================= NOTES PAGE LOGIC =================
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let editIndex = null;

function renderNotes() {
  const container = document.getElementById("notesContainer");
  if (!container) return;

  container.innerHTML = "";

  if (notes.length === 0) {
    container.innerHTML = "<p>No notes saved yet.</p>";
    return;
  }

  notes.forEach((note, index) => {
    const div = document.createElement("div");
    div.className = "note-card";

    div.innerHTML = `
      <div class="note-date">${note.date}</div>
      <div class="note-text">${note.text}</div>
      <div class="note-actions">
        <button class="edit-btn" onclick="openEdit(${index})">✏️ Edit</button>
        <button class="delete-btn" onclick="deleteNote(${index})">🗑 Delete</button>
      </div>
    `;

    container.appendChild(div);
  });
}

function deleteNote(index) {
  if (!confirm("Delete this note?")) return;
  notes.splice(index, 1);
  localStorage.setItem("notes", JSON.stringify(notes));
  renderNotes();
}

function openEdit(index) {
  editIndex = index;
  document.getElementById("editText").value = notes[index].text;
  document.getElementById("editModal").style.display = "flex";
}

function closeEdit() {
  document.getElementById("editModal").style.display = "none";
}

async function saveExpenseEdit() {

  if (!currentEditId) {
    alert("Invalid expense ID");
    return;
  }

  const dateEl = document.getElementById("edit-date");
  const catEl = document.getElementById("edit-category");
  const notesEl = document.getElementById("edit-notes");
  const amtEl = document.getElementById("edit-amount");

  if (!dateEl || !catEl || !notesEl || !amtEl) {
    alert("Edit form broken. Check HTML IDs.");
    return;
  }

  const token = localStorage.getItem("token");

  await fetch(`${API}/api/expenses/${currentEditId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      date: dateEl.value,
      category: catEl.value,
      notes: notesEl.value,
      amount: Number(amtEl.value)
    })
  });

  closeEditPopup();
  renderHistoryPage();
}

// ================= CALCULATOR LOGIC =================
// ================= CALCULATOR =================
let current = "0";
let history = [];

const calc = document.getElementById("calculator");
const display = document.getElementById("calc-display");
const expBox = document.getElementById("calc-expression");
const historyList = document.getElementById("history-list");

// OPEN / CLOSE
function toggleCalculator() {
  if (!calc) return;
  calc.style.display = calc.style.display === "block" ? "none" : "block";
}

document.getElementById("calc-launcher")?.addEventListener("click", () => {
  calc.style.display = "block";
});

document.getElementById("calc-close")?.addEventListener("click", () => {
  calc.style.display = "none";
});
// ================= CALCULATOR OPEN / CLOSE =================
const calculator = document.getElementById("calculator");
const openCalcBtn = document.getElementById("open-calculator");
const closeCalcBtn = document.getElementById("calc-close");

if (openCalcBtn) {
  openCalcBtn.addEventListener("click", () => {
    calculator.style.display = "block";
  });
}

if (closeCalcBtn) {
  closeCalcBtn.addEventListener("click", () => {
    calculator.style.display = "none";
  });
}


// DRAG
let dragging = false, offsetX = 0, offsetY = 0;

document.getElementById("calc-header")?.addEventListener("mousedown", e => {
  e.preventDefault();
  dragging = true;
  offsetX = e.clientX - calc.offsetLeft;
  offsetY = e.clientY - calc.offsetTop;
});

document.addEventListener("mousemove", e => {
  if (!dragging) return;
  calc.style.left = e.clientX - offsetX + "px";
  calc.style.top = e.clientY - offsetY + "px";
  calc.style.transform = "none";
});

document.addEventListener("mouseup", () => dragging = false);

// BUTTONS
function press(val) {
  if (current === "0" && val !== ".") current = "";
  current += val;
  display.value = current;
}

function clearCalc() {
  current = "0";
  display.value = "0";
  expBox.textContent = "";
}

function backspace() {
  current = current.length > 1 ? current.slice(0, -1) : "0";
  display.value = current;
}

function calculate() {
  try {
    const result = eval(current.replace(/%/g, "/100"));
    history.unshift(`${current} = ${result}`);
    history = history.slice(0, 3);
    renderHistory();
    expBox.textContent = current + " =";
    current = result.toString();
    display.value = current;
  } catch {
    display.value = "Error";
  }
}

function renderHistory() {
  historyList.innerHTML = "";
  history.forEach(h => {
    const li = document.createElement("li");
    li.textContent = h;
    li.onclick = () => {
      current = h.split("=")[1].trim();
      display.value = current;
    };
    historyList.appendChild(li);
  });
}

// KEYBOARD SUPPORT
document.addEventListener("keydown", e => {
  if (calc.style.display !== "block") return;
  if ("0123456789+-*/.%".includes(e.key)) press(e.key);
  if (e.key === "Enter") calculate();
  if (e.key === "Backspace") backspace();
  if (e.key === "Escape") calc.style.display = "none";
});
function flashKey(text) {
  const btn = [...document.querySelectorAll("#calc-buttons button")]
    .find(b => b.textContent.trim() === text);
  if (!btn) return;
  btn.classList.add("key-active");
  setTimeout(() => btn.classList.remove("key-active"), 120);
}


// ================= NOTES POPUP LOGIC =================
function toggleNotes() {
  const modal = document.getElementById("notes-popup");
  if (!modal) return;
  
  modal.style.display = modal.style.display === "flex" ? "none" : "flex";
  const dateEl = document.getElementById("notes-date");
  if (dateEl) dateEl.textContent = new Date().toDateString();
}

function saveNote() {
  const text = document.getElementById("notes-text").value.trim();
  const tag = document.getElementById("note-tag").value;
  const color = document.getElementById("note-color").value;

  if (!text) {
    alert("Write something first");
    return;
  }

  const notes = JSON.parse(localStorage.getItem("notes")) || [];

  notes.unshift({
    id: Date.now(),          // 🔑 UNIQUE ID (VERY IMPORTANT)
    text,
    tag,
    color,
    pinned: false,
    date: new Date().toLocaleString()
  });

  localStorage.setItem("notes", JSON.stringify(notes));

  document.getElementById("notes-text").value = "";
  toggleNotes();

  alert("✅ Note Saved");
}

// ================= NOTES POPUP FIX =================
// ================= NOTES FINAL FIX =================
document.addEventListener("DOMContentLoaded", () => {
  const notesBtn = document.getElementById("open-notes");
  const notesModal = document.getElementById("notes-popup");

  if (!notesBtn || !notesModal) return;

  notesBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    notesModal.style.display = "flex";

    const dateEl = document.getElementById("notes-date");
    if (dateEl) dateEl.textContent = new Date().toDateString();
  });

  // outside click close
  notesModal.addEventListener("click", (e) => {
    if (e.target === notesModal) {
      notesModal.style.display = "none";
    }
  });
});

// ✅ FINAL SAFE CALL FOR SET-LIMIT PAGE
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("category-limits")) {
    loadLimitsForm();
  }
});
// Event Listeners
document.addEventListener("input", updateRemaining);

