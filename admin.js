// Initialize dashboard data
const dashboardData = {
  totalUsers: 2543,
  totalRevenue: 45231,
  activeInvestments: 1234,
  pendingKyc: 48,
  revenueChange: 8.2,
  usersChange: 12.5,
  investmentsChange: 5.1,
  kycChange: 15
};

async function loadAdminDashboardData() {
  try {
    const response = await fetch('http://localhost:5000/api/dashboard/stats');
    if (!response.ok) {
      throw new Error('Unable to fetch admin dashboard stats');
    }

    return await response.json();
  } catch (error) {
    console.warn('Using local admin dashboard data:', error.message);
    return dashboardData;
  }
}

// Show notification on page load
window.addEventListener("load", () => {
  const notification = document.getElementById("notification")
  notification.classList.add("show")

  // Auto hide after 5 seconds
  setTimeout(() => {
    closeNotification()
  }, 5000)
  
  // Load saved language preference
  const savedLanguage = localStorage.getItem('adminLanguage') || 'en';
  document.querySelector('.language-select').value = savedLanguage;
  applyLanguage(savedLanguage);
  
  // Initialize dashboard data
  initializeDashboardData();
  
  // Setup chart event listeners
  setupChartFilters();
  
  // Setup smooth scroll navigation
  setupSmoothScrollNavigation();
  renderAdminManagementSections();
  refreshAdminRealtimeSections();
  window.addEventListener('rivertrade:admin-data-updated', refreshAdminRealtimeSections);
  window.setInterval(refreshAdminRealtimeSections, 2000);
})

// Close notification
function closeNotification() {
  const notification = document.getElementById("notification")
  notification.classList.remove("show")
}

// Initialize and update dashboard data
async function initializeDashboardData() {
  // Load from localStorage or use defaults
  const savedData = JSON.parse(localStorage.getItem('dashboardData') || '{}');
  const data = { ...dashboardData, ...savedData };
  const serverData = await loadAdminDashboardData();
  const finalData = { ...data, ...serverData };

  // Update stat cards
  updateStatCard(0, finalData.totalUsers, finalData.usersChange, 'positive');
  updateStatCard(1, '$' + finalData.totalRevenue.toLocaleString(), finalData.revenueChange, 'positive');
  updateStatCard(2, finalData.activeInvestments, finalData.investmentsChange, 'positive');
  updateStatCard(3, finalData.pendingKyc, finalData.kycChange, 'negative');

  // Update transactions table with sample data
  updateTransactionsTable();

  // Populate all transactions section
  populateAllTransactions();

  // Save data to localStorage
  localStorage.setItem('dashboardData', JSON.stringify(finalData));
}

// Update individual stat card
function updateStatCard(index, value, change, type) {
  const statCards = document.querySelectorAll('.stat-card');
  if (statCards[index]) {
    const valueElement = statCards[index].querySelector('.stat-value');
    const changeElement = statCards[index].querySelector('.stat-change');
    
    if (valueElement) {
      valueElement.textContent = value;
    }
    
    if (changeElement) {
      const sign = change >= 0 ? '+' : '';
      const changeClass = type === 'positive' ? 'positive' : 'negative';
      const keyword = index === 3 ? 'new requests' : 'from last month';
      changeElement.className = 'stat-change ' + changeClass;
      changeElement.innerHTML = `${sign}${change}% <span data-translate="${index === 3 ? 'newRequests' : 'fromLastMonth'}">${keyword}</span>`;
    }
  }
}

// Update transactions table with data
function updateTransactionsTable() {
  const tableBody = document.querySelector('#dashboard-section .data-table tbody');
  const storedTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');

  if (tableBody) {
    tableBody.innerHTML = storedTransactions.slice(0, 6).map(tx => `
      <tr>
        <td>#TXN-${tx.id || tx.transactionId || (tx.timestamp ? tx.timestamp.slice(-6) : 'unknown')}</td>
        <td>${tx.user || 'Guest'}</td>
        <td>${tx.amount || '0'}</td>
        <td><span class="badge ${tx.type?.toLowerCase() || 'unknown'}">${tx.type || 'Unknown'}</span></td>
        <td><span class="badge ${tx.status?.toLowerCase() || 'unknown'}">${tx.status || 'Unknown'}</span></td>
        <td>${tx.date || (tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : 'N/A')}</td>
        <td><button class="action-btn" onclick="viewTransaction('${tx.id || tx.transactionId || tx.timestamp}')">View</button></td>
      </tr>
    `).join('');
  }
}

// Toggle sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar")
  const overlay = document.getElementById("sidebarOverlay")

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle("show")
    overlay.classList.toggle("show")
  } else {
    sidebar.classList.toggle("collapsed")
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar")
  const overlay = document.getElementById("sidebarOverlay")

  sidebar.classList.remove("show")
  overlay.classList.remove("show")
}

// Smooth scroll navigation for sidebar links
function setupSmoothScrollNavigation() {
  // Get all navigation links
  const navLinks = document.querySelectorAll('.nav-list a[href^="#"], .submenu a[href^="#"]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Check if this is a submenu toggle (has onclick attribute with toggleSubmenu)
      const isSubmenuToggle = this.hasAttribute('onclick') && this.getAttribute('onclick').includes('toggleSubmenu');
      
      if (!isSubmenuToggle && href.startsWith('#')) {
        e.preventDefault();
        
        const targetId = href.substring(1); // Remove the # character
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          // Smooth scroll to the target element
          const headerHeight = document.querySelector('.header')?.offsetHeight || 70;
          const targetPosition = targetElement.offsetTop - headerHeight - 20; // 20px extra padding
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          
          // Close sidebar on mobile after navigation
          if (window.innerWidth <= 768) {
            closeSidebar();
          }
          
          // Update active nav item
          updateActiveNavItem(href);
          
          // Load data for specific sections
          if (targetId === 'expert-management') {
            loadExpertsTable();
          } else if (targetId === 'user-management') {
            getAllUsers(); // Prepare users list
          } else if (targetId === 'all-customers') {
            loadAllCustomersTable();
          } else if (targetId === 'active-customers') {
            loadActiveCustomersTable();
          } else if (targetId === 'disabled-customers') {
            loadDisabledCustomersTable();
          }
        }
      }
    });
  });
}

// Update active navigation item based on current scroll position
function updateActiveNavItem(targetHref) {
  const navLinks = document.querySelectorAll('.nav-list a[href^="#"], .submenu a[href^="#"]');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === targetHref) {
      // Remove active from all
      document.querySelectorAll('.nav-list .nav-item, .submenu li').forEach(item => {
        item.classList.remove('active');
      });
      
      // Add active to current
      const parentItem = link.closest('.nav-item, li');
      if (parentItem) {
        parentItem.classList.add('active');
      }
    }
  });
}

// Optional: Update active nav item on scroll
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('[id]');
  const headerHeight = document.querySelector('.header')?.offsetHeight || 70;
  
  let currentSection = null;
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop - headerHeight - 50;
    if (window.scrollY >= sectionTop) {
      currentSection = section.id;
    }
  });
  
  if (currentSection) {
    const activeLink = document.querySelector(`.nav-list a[href="#${currentSection}"], .submenu a[href="#${currentSection}"]`);
    if (activeLink) {
      updateActiveNavItem(`#${currentSection}`);
    }
  }
});

// Toggle dropdown
let currentDropdown = null

function toggleDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId)

  // Close current dropdown if different
  if (currentDropdown && currentDropdown !== dropdown) {
    currentDropdown.classList.remove("show")
  }

  dropdown.classList.toggle("show")
  currentDropdown = dropdown.classList.contains("show") ? dropdown : null
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
      menu.classList.remove("show")
    })
    currentDropdown = null
  }
})

// Toggle submenu
function toggleSubmenu(event) {
  event.preventDefault()
  const navItem = event.currentTarget.closest(".nav-item")
  navItem.classList.toggle("open")
}

// Language change
function changeLanguage(lang) {
  console.log("Language changed to:", lang)
  localStorage.setItem('adminLanguage', lang);
  applyLanguage(lang);
  // Force a small delay to ensure DOM is updated
  setTimeout(() => {
    console.log('Language change completed');
  }, 100);
}

// View transaction
function viewTransaction(id) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const transaction = transactions.find(t => t.id === id);
  
  if (transaction) {
    const modal = document.createElement('div');
    modal.id = 'transactionModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content transaction-modal">
        <div class="modal-header">
          <h2>Transaction Details - #TXN-${transaction.id}</h2>
          <button class="modal-close" onclick="closeTransactionModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="transaction-details">
            <div class="detail-row">
              <span class="detail-label">User:</span>
              <span class="detail-value">${transaction.user}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value">${transaction.amount}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${transaction.type}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value badge ${transaction.status.toLowerCase()}">${transaction.status}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${transaction.date}</span>
            </div>
        ${transaction.method ? `
        <div class="detail-row">
          <span class="detail-label">Method:</span>
          <span class="detail-value">${transaction.method}</span>
        </div>
        ` : ''}
        ${transaction.depositAddress ? `
        <div class="detail-row">
          <span class="detail-label">Deposit Details:</span>
          <span class="detail-value" style="white-space:pre-wrap;">${transaction.depositAddress}</span>
        </div>
        ` : ''}
        ${transaction.type === 'Withdraw' && transaction.details ? `
        <div class="detail-row">
          <span class="detail-label">Withdraw Details:</span>
          <span class="detail-value" style="white-space:pre-wrap;">${JSON.stringify(transaction.details, null, 2)}</span>
        </div>
        ` : ''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeTransactionModal()">Close</button>
      ${transaction.type === 'Deposit' && transaction.status === 'Pending Approval' ? `
      <button class="btn-secondary" onclick="approveDeposit('${transaction.id}'); closeTransactionModal();">Approve</button>
      <button class="btn-secondary" onclick="rejectDeposit('${transaction.id}'); closeTransactionModal();">Reject</button>
      ` : ''}
    </div>
  </div>
`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  } else {
    console.log("Transaction not found:", id);
  }
}

// Close transaction modal
function closeTransactionModal() {
  const modal = document.getElementById('transactionModal');
  if (modal) {
    modal.remove();
  }
}

// Download transaction receipt
function downloadTransactionReceipt(id) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const transaction = transactions.find(t => t.id === id);
  
  if (transaction) {
    // Create receipt content
    const receiptContent = `
RIVERTRADE - TRANSACTION RECEIPT
==================================
Transaction ID: #TXN-${transaction.id}
Date: ${transaction.date}
User: ${transaction.user}
Type: ${transaction.type}
Amount: ${transaction.amount}
Status: ${transaction.status}

Thank you for using Rivertrade!
==================================
    `;
    
    // Create and download file
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptContent));
    element.setAttribute('download', `receipt_${id}.txt`);
    element.style.display = 'none';
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    console.log('Receipt downloaded for transaction ' + id);
  } else {
    alert('Transaction not found');
  }
}

// Close sidebar when clicking nav links on mobile (but not submenu toggles)
document.addEventListener("click", (e) => {
  const sidebar = document.getElementById("sidebar")
  const overlay = document.getElementById("sidebarOverlay")
  
  // Check if click is on a nav link that is NOT a submenu toggle (has-submenu class)
  const navItem = e.target.closest(".nav-item")
  const isSubmenuToggle = navItem && navItem.classList.contains("has-submenu") && e.target.closest("a[onclick*='toggleSubmenu']")
  
  if (navItem && !isSubmenuToggle && window.innerWidth <= 768 && sidebar.classList.contains("show")) {
    sidebar.classList.remove("show")
    overlay.classList.remove("show")
  }
})

// Charts
const revenueChart = document.getElementById("revenueChart")
const userChart = document.getElementById("userChart")

// Chart data for different periods
const chartDataByPeriod = {
  revenue: {
    '7days': [3200, 4100, 3800, 5200, 4800, 6100, 5800],
    '30days': [3200, 4100, 3800, 5200, 4800, 6100, 5800, 5900, 6200, 5800, 6500, 6800, 6200, 6500, 6800, 7100, 6900, 7200, 7500, 7200, 7800, 8100, 7900, 8200, 8500, 8200, 8800, 9100, 8900, 9200],
    '90days': Array.from({ length: 90 }, (_, i) => Math.floor(Math.random() * 5000 + 3000))
  },
  users: {
    '7days': [120, 180, 150, 220, 190, 280, 250],
    '30days': [120, 180, 150, 220, 190, 280, 250, 300, 280, 350, 320, 400, 380, 450, 420, 500, 480, 550, 520, 600, 580, 650, 620, 700, 680, 750, 720, 800, 780, 850],
    '90days': Array.from({ length: 90 }, (_, i) => Math.floor(Math.random() * 400 + 100))
  }
};

// Setup chart period filters
function setupChartFilters() {
  const chartSelects = document.querySelectorAll('.chart-select');
  
  chartSelects.forEach((select) => {
    select.addEventListener('change', function() {
      const period = this.value; // '7days', '30days', or '90days'
      const chartType = this.getAttribute('data-chart'); // 'revenue' or 'users'
      
      if (chartType === 'revenue' && revenueChart) {
        const ctx = revenueChart.getContext("2d");
        drawLineChart(ctx, revenueChart, chartDataByPeriod.revenue[period], "#5e3fc9");
      } else if (chartType === 'users' && userChart) {
        const ctx = userChart.getContext("2d");
        drawLineChart(ctx, userChart, chartDataByPeriod.users[period], "#00b894");
      }
    });
  });
}

// Simple chart drawing (using canvas)
if (revenueChart) {
  const ctx = revenueChart.getContext("2d")
  drawLineChart(ctx, revenueChart, [3200, 4100, 3800, 5200, 4800, 6100, 5800], "#5e3fc9")
}

if (userChart) {
  const ctx = userChart.getContext("2d")
  drawLineChart(ctx, userChart, [120, 180, 150, 220, 190, 280, 250], "#00b894")
}

function drawLineChart(ctx, canvas, data, color) {
  const width = (canvas.width = canvas.offsetWidth * 2)
  const height = (canvas.height = 600)
  const padding = 60
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Find min and max
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Draw grid lines
  ctx.strokeStyle = "#e1e8ed"
  ctx.lineWidth = 1

  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  // Draw line
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.lineJoin = "round"
  ctx.lineCap = "round"

  ctx.beginPath()
  data.forEach((value, index) => {
    const x = padding + (chartWidth / (data.length - 1)) * index
    const y = height - padding - ((value - min) / range) * chartHeight

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()

  // Draw gradient fill
  const gradient = ctx.createLinearGradient(0, padding, 0, height - padding)
  gradient.addColorStop(0, color + "40")
  gradient.addColorStop(1, color + "00")

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(padding, height - padding)
  data.forEach((value, index) => {
    const x = padding + (chartWidth / (data.length - 1)) * index
    const y = height - padding - ((value - min) / range) * chartHeight
    ctx.lineTo(x, y)
  })
  ctx.lineTo(width - padding, height - padding)
  ctx.closePath()
  ctx.fill()

  // Draw points
  ctx.fillStyle = color
  data.forEach((value, index) => {
    const x = padding + (chartWidth / (data.length - 1)) * index
    const y = height - padding - ((value - min) / range) * chartHeight

    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fill()

    // White center
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
  })

  // Draw labels
  ctx.fillStyle = "#636e72"
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
  ctx.textAlign = "center"

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  data.forEach((value, index) => {
    const x = padding + (chartWidth / (data.length - 1)) * index
    ctx.fillText(days[index], x, height - padding + 40)
  })
}

window.addEventListener("resize", () => {
  const sidebar = document.getElementById("sidebar")
  const overlay = document.getElementById("sidebarOverlay")

  // Reset sidebar state on desktop
  if (window.innerWidth > 768) {
    sidebar.classList.remove("show")
    overlay.classList.remove("show")
  }

  // Redraw charts on resize
  if (revenueChart) {
    const ctx = revenueChart.getContext("2d")
    drawLineChart(ctx, revenueChart, [3200, 4100, 3800, 5200, 4800, 6100, 5800], "#5e3fc9")
  }

  if (userChart) {
    const ctx = userChart.getContext("2d")
    drawLineChart(ctx, userChart, [120, 180, 150, 220, 190, 280, 250], "#00b894")
  }
})

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault()
    const target = document.querySelector(this.getAttribute("href"))
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
      })
    }
  })
})

// Add active state to nav items
document.querySelectorAll(".nav-item a").forEach((link) => {
  link.addEventListener("click", function () {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active")
    })
    this.closest(".nav-item").classList.add("active")
  })
})

// ===== PROFILE DROPDOWN FUNCTIONS =====

// Navigate to profile page
function goToProfile() {
  // Redirect to profile page (create this page or link to existing)
  window.location.href = '#profile';
  // Alternatively, if you have a separate profile page:
  // window.location.href = 'profile.html';
}

// Open change password modal
function openChangePasswordModal() {
  // Create and show a change password modal
  const modal = document.createElement('div');
  modal.id = 'changePasswordModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content change-password-modal">
      <div class="modal-header">
        <h2>Change Password</h2>
        <button class="modal-close" onclick="closeChangePasswordModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="changePasswordForm" onsubmit="submitPasswordChange(event)">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input type="password" id="currentPassword" name="currentPassword" required placeholder="Enter current password">
          </div>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input type="password" id="newPassword" name="newPassword" required placeholder="Enter new password">
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="Confirm new password">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="closeChangePasswordModal()">Cancel</button>
            <button type="submit" class="btn-primary">Update Password</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
}

// Close change password modal
function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) {
    modal.remove();
  }
}

// Submit password change
function submitPasswordChange(event) {
  event.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // Validate passwords match
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match!');
    return;
  }
  
  // Validate password strength (minimum 8 characters)
  if (newPassword.length < 8) {
    alert('Password must be at least 8 characters long');
    return;
  }
  
  // Here you would typically send this to your backend
  console.log('Password change request:', {
    currentPassword,
    newPassword
  });
  
  // Show success message
  alert('Password updated successfully!');
  closeChangePasswordModal();
  
  // Optional: You can add an API call here
  // updatePassword(currentPassword, newPassword);
}

// Logout function
function handleLogout() {
  // Clear user data from localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isLoggedIn');
  
  // Show logout message
  alert('You have been logged out successfully');
  
  // Redirect to login page
  window.location.href = '../auth.html';
}

// Attach event listeners to dropdown menu items
document.addEventListener('DOMContentLoaded', function() {
  // Get all dropdown items
  const profileDropdown = document.getElementById('userDropdown');
  if (profileDropdown) {
    const dropdownItems = profileDropdown.querySelectorAll('.dropdown-item');
    
    if (dropdownItems.length >= 3) {
      // Profile link
      dropdownItems[0].onclick = function(e) {
        e.preventDefault();
        goToProfile();
      };
      
      // Change Password link
      dropdownItems[1].onclick = function(e) {
        e.preventDefault();
        openChangePasswordModal();
      };
      
      // Logout link
      dropdownItems[2].onclick = function(e) {
        e.preventDefault();
        handleLogout();
      };
    }
  }
  
  // Initialize notifications
  initializeNotifications();
});

// ===== NOTIFICATIONS MANAGEMENT =====

// Initialize notifications from localStorage only (no sample data)
function seedAdminNotifications() {
  if (localStorage.getItem('notifications')) {
    return;
  }

  const sampleNotifications = [
    { id: 'n1', type: 'user-plus', user: 'New User', message: 'joined the platform', time: 'Just now', read: false },
    { id: 'n2', type: 'kyc', user: 'Sophia Kim', message: 'submitted a KYC request', time: '2 hours ago', read: false },
    { id: 'n3', type: 'deposit', user: 'Mark Rivera', message: 'requested a deposit', time: 'Yesterday', read: true }
  ];

  localStorage.setItem('notifications', JSON.stringify(sampleNotifications));
}

function getAdminNotifications() {
  seedAdminNotifications();
  try {
    return JSON.parse(localStorage.getItem('notifications') || '[]');
  } catch (e) {
    console.warn('Unable to load notifications', e);
    return [];
  }
}

function saveAdminNotifications(notifications) {
  localStorage.setItem('notifications', JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
}

function attachNotificationItemHandlers() {
  const notificationItems = document.querySelectorAll('.notification-list .notification-item');
  notificationItems.forEach((item, index) => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      markNotificationAsRead(index);
    });
  });
}

function renderAdminNotificationItems() {
  const list = document.querySelector('.notification-list');
  if (!list) return;

  const notifications = getAdminNotifications();
  if (notifications.length === 0) {
    list.innerHTML = '<div class="notification-item" style="padding: 15px; text-align: center;">No notifications</div>';
    return;
  }

  list.innerHTML = notifications.slice(0, 4).map((notif, index) => `
    <a href="#" class="notification-item ${notif.read ? 'read' : ''}" data-index="${index}">
      <div class="notification-icon-small ${notif.type}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 12l2 2 4-4"></path>
        </svg>
      </div>
      <div class="notification-content-small">
        <p><strong>${notif.user}</strong> ${notif.message}</p>
        <span class="time">${notif.time}</span>
      </div>
    </a>
  `).join('');

  attachNotificationItemHandlers();
}

function initializeNotifications() {
  seedAdminNotifications();
  renderAdminNotificationItems();
  updateNotificationBadge();
}

// Mark single notification as read
function markNotificationAsRead(index) {
  let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  if (notifications[index]) {
    notifications[index].read = true;
    saveAdminNotifications(notifications);
    renderAdminNotificationItems();
    updateNotificationBadge();
  }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
  let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  notifications.forEach(notif => notif.read = true);
  localStorage.setItem('notifications', JSON.stringify(notifications));
  
  // Update UI
  document.querySelectorAll('.notification-item').forEach(item => {
    item.classList.add('read');
    item.style.opacity = '0.6';
  });
  
  updateNotificationBadge();
  
  // Show success message
  showNotificationMessage('All notifications marked as read!');
}

// View all notifications
function viewAllNotifications() {
  let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  
  // Create a modal to display all notifications
  const modal = document.createElement('div');
  modal.id = 'allNotificationsModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content notifications-modal">
      <div class="modal-header">
        <h2>All Notifications</h2>
        <button class="modal-close" onclick="closeAllNotificationsModal()">&times;</button>
      </div>
      <div class="modal-body notifications-list-container">
        ${notifications.length > 0 ? notifications.map((notif, index) => `
          <div class="notification-item-full ${notif.read ? 'read' : ''}">
            <div class="notification-icon-wrapper">
              <div class="notification-icon-small ${notif.type}">
                <i class="fas fa-${notif.type === 'user-plus' ? 'user-plus' : 'shield'}"></i>
              </div>
            </div>
            <div class="notification-content-full">
              <p><strong>${notif.user}</strong> ${notif.message}</p>
              <span class="time">${notif.time}</span>
            </div>
            <div class="notification-actions">
              <button class="btn-sm" onclick="markNotificationAsRead(${index})">Mark as Read</button>
              <button class="btn-sm danger" onclick="deleteNotification(${index})">Delete</button>
            </div>
          </div>
        `).join('') : '<p class="no-notifications">No notifications</p>'}
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeAllNotificationsModal()">Close</button>
        <button class="btn-primary" onclick="markAllNotificationsAsRead()">Mark All as Read</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
}

// Close all notifications modal
function closeAllNotificationsModal() {
  const modal = document.getElementById('allNotificationsModal');
  if (modal) {
    modal.remove();
  }
}

// Delete a notification
function deleteNotification(index) {
  let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  notifications.splice(index, 1);
  saveAdminNotifications(notifications);
  
  // Refresh the view
  viewAllNotifications();
  renderAdminNotificationItems();
  updateNotificationBadge();
}

// Update notification badge count
function updateNotificationBadge() {
  let notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }
}

// Show notification toast message
function showNotificationMessage(message) {
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: #5e3fc9;
    color: white;
    padding: 15px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Attach handlers to notification buttons when page loads
document.addEventListener('DOMContentLoaded', function() {
  const markAllBtn = document.querySelector('.dropdown-footer .btn-secondary');
  const viewAllBtn = document.querySelector('.dropdown-footer .btn-primary');
  
  if (markAllBtn) {
    markAllBtn.addEventListener('click', markAllNotificationsAsRead);
  }
  
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', function(e) {
      e.preventDefault();
      viewAllNotifications();
    });
  }
  
  // Initialize notification badge
  updateNotificationBadge();
  
  // Initialize admin deposit settings summary
  initAdminDepositSettings();
});
// ===== LANGUAGE/TRANSLATION SYSTEM =====

const translations = {
  en: {
    // Header
    dashboard: 'Dashboard',
    language: 'Language',
    notifications: 'Notifications',
    profile: 'Profile',
    changePassword: 'Change Password',
    logout: 'Logout',
    
    // Sidebar
    customerManagement: 'Customer Management',
    customers: 'Customers',
    allCustomers: 'All Customers',
    activeCustomers: 'Active Customers',
    disabledCustomers: 'Disabled Customers',
    kycNotifications: 'Notifications',
    sendEmailToAll: 'Send Email to All',
    sendMessageToAll: 'Send Message to All',
    
    kycManagement: 'KYC Management',
    pendingKyc: 'Pending KYC',
    rejectedKyc: 'Rejected KYC',
    allKycLogs: 'All KYC Logs',
    kycForm: 'KYC Form',
    
    staffManagement: 'Staff Management',
    manageRoles: 'Manage Roles',
    manageStaffs: 'Manage Staffs',
    
    plans: 'Plans',
    manageSchema: 'Manage Schema',
    schedule: 'Schedule',
    holiday: 'Holiday',
    schema: 'Manage Schema',
    manageSchedule: 'Manage Crowd Schema',
    
    transactions: 'Transactions',
    investments: 'Investments',
    
    // Main Content
    welcomeBack: 'Welcome back! Here\'s what\'s happening with your platform today.',
    
    // Stats Cards
    totalUsers: 'Total Users',
    totalRevenue: 'Total Revenue',
    activeInvestments: 'Active Investments',
    pendingKycRequests: 'Pending KYC',
    fromLastMonth: 'from last month',
    newRequests: 'new requests',
    
    // Charts
    revenueOverview: 'Revenue Overview',
    userGrowth: 'User Growth',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    last90Days: 'Last 90 days',
    
    // Transactions Table
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    transactionId: 'Transaction ID',
    user: 'User',
    amount: 'Amount',
    type: 'Type',
    status: 'Status',
    date: 'Date',
    action: 'Action',
    view: 'View',
    
    // Status badges
    completed: 'Completed',
    pending: 'Pending',
    failed: 'Failed',
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    investment: 'Investment',
    
    // Notifications
    markAllAsRead: 'Mark All as Read',
    joinedTheSystem: 'joined the system',
    requestedKycVerification: 'requested KYC verification',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
    
    // Buttons
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    update: 'Update',
    send: 'Send',
    
    // Customer Management
    addCustomer: 'Add Customer',
    editCustomer: 'Edit Customer',
    deleteCustomer: 'Delete Customer',
    
    // Role Management
    addRole: 'Add Role',
    editRole: 'Edit Role',
    
    // Staff Management
    addStaff: 'Add Staff Member',
    editStaff: 'Edit Staff',
    removeStaff: 'Remove Staff',
    
    // Holiday Management
    addHoliday: 'Add Holiday',
    
    // Schema Management
    addSchema: 'Add Schema',
    editSchema: 'Edit Schema',
    deleteSchema: 'Delete Schema',
    
    // Crowd Schema
    addCrowdSchema: 'Add Crowd Schema',
    editCrowdSchema: 'Edit Crowd Schema',
    deleteCrowdSchema: 'Delete Crowd Schema',
    manageCrowdSchema: 'Manage Crowd Schema'
  },
  
  es: {
    // Header
    dashboard: 'Panel de Control',
    language: 'Idioma',
    notifications: 'Notificaciones',
    profile: 'Perfil',
    changePassword: 'Cambiar Contraseña',
    logout: 'Cerrar Sesión',
    
    // Sidebar
    customerManagement: 'Gestión de Clientes',
    customers: 'Clientes',
    allCustomers: 'Todos los Clientes',
    activeCustomers: 'Clientes Activos',
    disabledCustomers: 'Clientes Deshabilitados',
    kycNotifications: 'Notificaciones',
    sendEmailToAll: 'Enviar Correo a Todos',
    sendMessageToAll: 'Enviar Mensaje a Todos',
    
    kycManagement: 'Gestión KYC',
    pendingKyc: 'KYC Pendiente',
    rejectedKyc: 'KYC Rechazado',
    allKycLogs: 'Todos los Registros KYC',
    kycForm: 'Formulario KYC',
    
    staffManagement: 'Gestión de Personal',
    manageRoles: 'Gestionar Roles',
    manageStaffs: 'Gestionar Personal',
    
    plans: 'Planes',
    manageSchema: 'Gestionar Esquema',
    schedule: 'Horario',
    holiday: 'Festivo',
    schema: 'Gestionar Esquema',
    manageSchedule: 'Gestionar Esquema Crowdfunding',
    
    transactions: 'Transacciones',
    investments: 'Inversiones',
    
    // Main Content
    welcomeBack: '¡Bienvenido de vuelta! Aquí está lo que está sucediendo en tu plataforma hoy.',
    
    // Stats Cards
    totalUsers: 'Total de Usuarios',
    totalRevenue: 'Ingresos Totales',
    activeInvestments: 'Inversiones Activas',
    pendingKycRequests: 'KYC Pendiente',
    fromLastMonth: 'del mes pasado',
    newRequests: 'nuevas solicitudes',
    
    // Charts
    revenueOverview: 'Descripción de Ingresos',
    userGrowth: 'Crecimiento de Usuarios',
    last7Days: 'Últimos 7 días',
    last30Days: 'Últimos 30 días',
    last90Days: 'Últimos 90 días',
    
    // Transactions Table
    recentTransactions: 'Transacciones Recientes',
    viewAll: 'Ver Todo',
    transactionId: 'ID de Transacción',
    user: 'Usuario',
    amount: 'Cantidad',
    type: 'Tipo',
    status: 'Estado',
    date: 'Fecha',
    action: 'Acción',
    view: 'Ver',
    
    // Status badges
    completed: 'Completado',
    pending: 'Pendiente',
    failed: 'Fallido',
    deposit: 'Depósito',
    withdrawal: 'Retiro',
    investment: 'Inversión',
    
    // Notifications
    markAllAsRead: 'Marcar Todo como Leído',
    joinedTheSystem: 'se unió al sistema',
    requestedKycVerification: 'solicitó verificación KYC',
    hoursAgo: 'hace horas',
    daysAgo: 'hace días',
    
    // Buttons
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    update: 'Actualizar',
    send: 'Enviar',
    
    // Customer Management
    addCustomer: 'Añadir Cliente',
    editCustomer: 'Editar Cliente',
    deleteCustomer: 'Eliminar Cliente',
    
    // Role Management
    addRole: 'Añadir Rol',
    editRole: 'Editar Rol',
    
    // Staff Management
    addStaff: 'Añadir Miembro del Personal',
    editStaff: 'Editar Personal',
    removeStaff: 'Eliminar Personal',
    
    // Holiday Management
    addHoliday: 'Añadir Festivo',
    
    // Schema Management
    addSchema: 'Añadir Esquema',
    editSchema: 'Editar Esquema',
    deleteSchema: 'Eliminar Esquema',
    
    // Crowd Schema
    addCrowdSchema: 'Añadir Esquema Participativo',
    editCrowdSchema: 'Editar Esquema Participativo',
    deleteCrowdSchema: 'Eliminar Esquema Participativo',
    manageCrowdSchema: 'Gestionar Esquema Participativo'
  },
  
  fr: {
    // Header
    dashboard: 'Tableau de Bord',
    language: 'Langue',
    notifications: 'Notifications',
    profile: 'Profil',
    changePassword: 'Modifier le Mot de Passe',
    logout: 'Se Déconnecter',

    
    
    // Sidebar
    customerManagement: 'Gestion des Clients',
    customers: 'Clients',
    allCustomers: 'Tous les Clients',
    activeCustomers: 'Clients Actifs',
    disabledCustomers: 'Clients Désactivés',
    kycNotifications: 'Notifications',
    sendEmailToAll: 'Envoyer un E-mail à Tous',
    sendMessageToAll: 'Envoyer un Message à Tous',
    
    kycManagement: 'Gestion KYC',
    pendingKyc: 'KYC en Attente',
    rejectedKyc: 'KYC Rejeté',
    allKycLogs: 'Tous les Journaux KYC',
    kycForm: 'Formulaire KYC',
    
    staffManagement: 'Gestion du Personnel',
    manageRoles: 'Gérer les Rôles',
    manageStaffs: 'Gérer le Personnel',
    
    plans: 'Plans',
    manageSchema: 'Gérer le Schéma',
    schedule: 'Horaire',
    holiday: 'Jour Férié',
    schema: 'Gérer le Schéma',
    manageSchedule: 'Gérer le Schéma Participatif',
    
    transactions: 'Transactions',
    investments: 'Investissements',
    
    // Main Content
    welcomeBack: 'Bienvenue! Voici ce qui se passe sur votre plateforme aujourd\'hui.',
    
    // Stats Cards
    totalUsers: 'Nombre Total d\'Utilisateurs',
    totalRevenue: 'Revenu Total',
    activeInvestments: 'Investissements Actifs',
    pendingKycRequests: 'KYC en Attente',
    fromLastMonth: 'du mois dernier',
    newRequests: 'nouvelles demandes',
    
    // Charts
    revenueOverview: 'Aperçu des Revenus',
    userGrowth: 'Croissance des Utilisateurs',
    last7Days: '7 derniers jours',
    last30Days: '30 derniers jours',
    last90Days: '90 derniers jours',
    
    // Transactions Table
    recentTransactions: 'Transactions Récentes',
    viewAll: 'Voir Tout',
    transactionId: 'ID de Transactio',
    user: 'Utilisateur',
    amount: 'Montant',
    type: 'Type',
    status: 'Statut',
    date: 'Date',
    action: 'Action',
    view: 'Voir',
    
    // Status badges
    completed: 'Terminé',
    pending: 'En Attente',
    failed: 'Échoué',
    deposit: 'Dépôt',
    withdrawal: 'Retrait',
    investment: 'Investissement',
    
    // Notifications
    markAllAsRead: 'Marquer Tout comme Lu',
    joinedTheSystem: 'a rejoint le système',
    requestedKycVerification: 'a demandé la vérification KYC',
    hoursAgo: 'il y a des heures',
    daysAgo: 'il y a des jours',
    
    // Buttons
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    update: 'Mettre à Jour',
    send: 'Envoyer',
    
    // Customer Management
    addCustomer: 'Ajouter un Client',
    editCustomer: 'Modifier un Client',
    deleteCustomer: 'Supprimer un Client',
    
    // Role Management
    addRole: 'Ajouter un Rôle',
    editRole: 'Modifier un Rôle',
    
    // Staff Management
    addStaff: 'Ajouter un Membre du Personnel',
    editStaff: 'Modifier le Personnel',
    removeStaff: 'Supprimer le Personnel',
    
    // Holiday Management
    addHoliday: 'Ajouter un Jour Férié',
    
    // Schema Management
    addSchema: 'Ajouter un Schéma',
    editSchema: 'Modifier un Schéma',
    deleteSchema: 'Supprimer un Schéma',
    
    // Crowd Schema
    addCrowdSchema: 'Ajouter un Schéma Participatif',
    editCrowdSchema: 'Modifier un Schéma Participatif',
    deleteCrowdSchema: 'Supprimer un Schéma Participatif',
    manageCrowdSchema: 'Gérer le Schéma Participatif'
  }
};

// Apply language translations
function applyLanguage(lang) {
  if (!translations[lang]) {
    console.warn('Language not found:', lang);
    return;
  }
  
  const t = translations[lang];
  console.log('Applying language:', lang);
  
  // Update all text elements with data-translate attribute
  const elements = document.querySelectorAll('[data-translate]');
  console.log('Elements with data-translate:', elements.length);
  
  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    if (t[key]) {
      try {
        // Only update the direct text node, not children
        if (element.childNodes.length === 0 || (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3)) {
          // Element has no children or only text node
          element.textContent = t[key];
        } else if (element.tagName === 'SPAN' || element.tagName === 'BUTTON' || element.tagName === 'A' || element.tagName === 'LI') {
          // For these tags, replace only text nodes
          let hasOnlyText = Array.from(element.childNodes).every(node => 
            node.nodeType === 3 || (node.nodeType === 1 && node.tagName === 'SPAN')
          );
          if (hasOnlyText) {
            element.textContent = t[key];
          }
        } else {
          element.textContent = t[key];
        }
      } catch (e) {
        console.error('Error translating element:', key, e);
      }
    } else {
      console.warn('Translation key not found:', key);
    }
  });
  
  // Update specific elements without data-translate attribute
  // Header
  const dashboardTitle = document.querySelector('.content-header h1');
  if (dashboardTitle) dashboardTitle.textContent = t.dashboard;
  
  // Notification buttons
  const markAllBtn = document.querySelector('.dropdown-footer .btn-secondary');
  if (markAllBtn) markAllBtn.textContent = t.markAllAsRead;
  
  const viewAllBtn = document.querySelector('.dropdown-footer .btn-primary');
  if (viewAllBtn) viewAllBtn.textContent = t.viewAll;
  
  console.log('Language applied successfully');
  
  // Save language preference
  localStorage.setItem('adminLanguage', lang);
}

// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
  const savedLanguage = localStorage.getItem('adminLanguage') || 'en';
  const langSelect = document.querySelector('.language-select');
  if (langSelect) {
    langSelect.value = savedLanguage;
  }
  applyLanguage(savedLanguage);
  
  // Initialize section navigation
  initSectionNavigation();
});

// Navigate to section
function navigateToSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = 'block';
    window.scrollTo(0, 0);
  }
  
  // Update active nav item
  document.querySelectorAll('.nav-item, .submenu li').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
  if (activeLink) {
    activeLink.closest('li').classList.add('active');
  }
  
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebarOverlay').classList.remove('show');
  }
}

// Initialize section navigation
function initSectionNavigation() {
  // Get all navigation links
  const navLinks = document.querySelectorAll('a[href^="#"]');
  
  navLinks.forEach(link => {
    // Skip submenu toggles
    if (link.getAttribute('onclick') && link.getAttribute('onclick').includes('toggleSubmenu')) {
      return;
    }
    
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#') && href !== '#') {
        e.preventDefault();
        const sectionId = href.substring(1);
        navigateToSection(sectionId);
      }
    });
  });
}

// Customer Management Functions
function editCustomer(id) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Customer #${id}</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="saveCustomerEdit(event, ${id})">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" required placeholder="Customer name">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" required placeholder="Email address">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" required placeholder="Phone number">
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveCustomerEdit(event, id) {
  event.preventDefault();
  alert('Customer ' + id + ' updated successfully');
  event.target.closest('.modal-overlay').remove();
}

function deleteCustomer(id) {
  if (confirm('Are you sure you want to delete this customer?')) {
    alert('Customer ' + id + ' deleted successfully');
  }
}

function addCustomer() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add New Customer</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="saveNewCustomer(event)">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" required placeholder="Customer name">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" required placeholder="Email address">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" required placeholder="Phone number">
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Add Customer</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveNewCustomer(event) {
  event.preventDefault();
  alert('New customer added successfully');
  event.target.closest('.modal-overlay').remove();
}

const savedAdminCryptoWallets = JSON.parse(localStorage.getItem('adminCryptoWallets') || '{}');
const adminCryptoWallets = {
  BTC: {
    address: savedAdminCryptoWallets.BTC?.address || localStorage.getItem('adminBtcAddress') || '1A1z7agoat7W8EzGtqtU2CCZN6SHDA5tcD',
    network: savedAdminCryptoWallets.BTC?.network || localStorage.getItem('adminBtcNetwork') || 'Bitcoin Network'
  },
  USDT: {
    address: savedAdminCryptoWallets.USDT?.address || localStorage.getItem('adminUsdtAddress') || 'TVgcd7agoat7W8EzGtqtU2CCZN6SHDA5tcD',
    network: savedAdminCryptoWallets.USDT?.network || localStorage.getItem('adminUsdtNetwork') || 'TRC20'
  },
  ETH: {
    address: savedAdminCryptoWallets.ETH?.address || localStorage.getItem('adminEthAddress') || '0x0000000000000000000000000000000000000000',
    network: savedAdminCryptoWallets.ETH?.network || localStorage.getItem('adminEthNetwork') || 'ERC20'
  },
  BNB: {
    address: savedAdminCryptoWallets.BNB?.address || localStorage.getItem('adminBnbAddress') || 'bnb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    network: savedAdminCryptoWallets.BNB?.network || localStorage.getItem('adminBnbNetwork') || 'BEP20'
  },
  SOL: {
    address: savedAdminCryptoWallets.SOL?.address || localStorage.getItem('adminSolAddress') || 'SOLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    network: savedAdminCryptoWallets.SOL?.network || localStorage.getItem('adminSolNetwork') || 'Solana Network'
  },
  MATIC: {
    address: savedAdminCryptoWallets.MATIC?.address || localStorage.getItem('adminMaticAddress') || '0x0000000000000000000000000000000000000000',
    network: savedAdminCryptoWallets.MATIC?.network || localStorage.getItem('adminMaticNetwork') || 'Polygon (MATIC)'
  },
  TRX: {
    address: savedAdminCryptoWallets.TRX?.address || localStorage.getItem('adminTrxAddress') || 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    network: savedAdminCryptoWallets.TRX?.network || localStorage.getItem('adminTrxNetwork') || 'TRC20'
  }
};

const adminDepositSettings = {
  cryptoCurrency: localStorage.getItem('adminCryptoCurrency') || 'BTC',
  cryptoNetwork: localStorage.getItem('adminCryptoNetwork') || adminCryptoWallets.BTC.network,
  cryptoAddress: localStorage.getItem('adminCryptoAddress') || adminCryptoWallets.BTC.address,
  cryptoWallets: adminCryptoWallets,
  enabledMethods: JSON.parse(localStorage.getItem('adminEnabledDepositMethods') || JSON.stringify(['crypto', 'bank', 'card'])),
  enabledWithdrawMethods: JSON.parse(localStorage.getItem('adminEnabledWithdrawMethods') || JSON.stringify(['wallet', 'bank', 'paypal', 'stripe', 'sepa'])),
  bankDetails: JSON.parse(localStorage.getItem('adminBankDetails') || JSON.stringify({
    accountName: 'Rivertrade Corp',
    accountNumber: '1234567890',
    bankName: 'Rivertrade Bank',
    swiftCode: 'RTBCUS33',
    iban: 'US00RTBC0000001234567890'
  })),
  cardDetails: JSON.parse(localStorage.getItem('adminCardDetails') || JSON.stringify({
    cardName: 'Rivertrade Payments',
    cardNumber: '4111 1111 1111 1111',
    bankName: 'Rivertrade Bank',
    routingNumber: '021000021'
  }))
};

function saveAdminDepositSettings() {
  localStorage.setItem('adminCryptoAddress', adminDepositSettings.cryptoAddress);
  localStorage.setItem('adminCryptoCurrency', adminDepositSettings.cryptoCurrency);
  localStorage.setItem('adminCryptoNetwork', adminDepositSettings.cryptoNetwork);
  localStorage.setItem('adminCryptoWallets', JSON.stringify(adminDepositSettings.cryptoWallets));
  localStorage.setItem('adminEnabledDepositMethods', JSON.stringify(adminDepositSettings.enabledMethods));
  localStorage.setItem('adminEnabledWithdrawMethods', JSON.stringify(adminDepositSettings.enabledWithdrawMethods));
  localStorage.setItem('adminBtcAddress', adminDepositSettings.cryptoWallets.BTC.address);
  localStorage.setItem('adminBtcNetwork', adminDepositSettings.cryptoWallets.BTC.network);
  localStorage.setItem('adminUsdtAddress', adminDepositSettings.cryptoWallets.USDT.address);
  localStorage.setItem('adminUsdtNetwork', adminDepositSettings.cryptoWallets.USDT.network);
  localStorage.setItem('adminEthAddress', adminDepositSettings.cryptoWallets.ETH.address);
  localStorage.setItem('adminEthNetwork', adminDepositSettings.cryptoWallets.ETH.network);
  localStorage.setItem('adminBnbAddress', adminDepositSettings.cryptoWallets.BNB.address);
  localStorage.setItem('adminBnbNetwork', adminDepositSettings.cryptoWallets.BNB.network);
  localStorage.setItem('adminSolAddress', adminDepositSettings.cryptoWallets.SOL.address);
  localStorage.setItem('adminSolNetwork', adminDepositSettings.cryptoWallets.SOL.network);
  localStorage.setItem('adminMaticAddress', adminDepositSettings.cryptoWallets.MATIC.address);
  localStorage.setItem('adminMaticNetwork', adminDepositSettings.cryptoWallets.MATIC.network);
  localStorage.setItem('adminTrxAddress', adminDepositSettings.cryptoWallets.TRX.address);
  localStorage.setItem('adminTrxNetwork', adminDepositSettings.cryptoWallets.TRX.network);
  localStorage.setItem('adminBankDetails', JSON.stringify(adminDepositSettings.bankDetails));
  localStorage.setItem('adminCardDetails', JSON.stringify(adminDepositSettings.cardDetails));
  window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
}

function openDepositSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Deposit Settings</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="depositSettingsForm">
          <div class="form-group">
            <label>Crypto Currency</label>
            <input list="cryptoCurrencies" type="text" id="adminCryptoCurrency" value="${adminDepositSettings.cryptoCurrency}" placeholder="BTC, USDT, ETH" required>
            <datalist id="cryptoCurrencies">
              <option value="BTC"></option>
              <option value="USDT"></option>
              <option value="ETH"></option>
              <option value="BNB"></option>
              <option value="SOL"></option>
              <option value="MATIC"></option>
              <option value="TRX"></option>
            </datalist>
          </div>
          <div class="form-group">
            <label>Crypto Network</label>
            <input list="cryptoNetworks" type="text" id="adminCryptoNetwork" value="${adminDepositSettings.cryptoNetwork}" placeholder="TRC20, ERC20, BEP20" required>
            <datalist id="cryptoNetworks">
              <option value="TRC20"></option>
              <option value="ERC20"></option>
              <option value="BEP20"></option>
              <option value="SOLANA"></option>
              <option value="POLYGON"></option>
            </datalist>
          </div>
          <div class="form-group">
            <label>Allowed Deposit Methods</label>
            <div class="checkbox-group">
              <label><input type="checkbox" id="adminMethodCrypto" value="crypto" ${adminDepositSettings.enabledMethods.includes('crypto') ? 'checked' : ''}> Cryptocurrency</label>
              <label><input type="checkbox" id="adminMethodBank" value="bank" ${adminDepositSettings.enabledMethods.includes('bank') ? 'checked' : ''}> Bank Transfer</label>
              <label><input type="checkbox" id="adminMethodCard" value="card" ${adminDepositSettings.enabledMethods.includes('card') ? 'checked' : ''}> Debit/Credit Card</label>
            </div>
          </div>
          <div class="form-group">
            <label>Allowed Withdrawal Methods</label>
            <div class="checkbox-group">
              <label><input type="checkbox" id="adminWithdrawMethodWallet" value="wallet" ${adminDepositSettings.enabledWithdrawMethods.includes('wallet') ? 'checked' : ''}> Wallet Address</label>
              <label><input type="checkbox" id="adminWithdrawMethodBank" value="bank" ${adminDepositSettings.enabledWithdrawMethods.includes('bank') ? 'checked' : ''}> Bank Transfer</label>
              <label><input type="checkbox" id="adminWithdrawMethodPaypal" value="paypal" ${adminDepositSettings.enabledWithdrawMethods.includes('paypal') ? 'checked' : ''}> PayPal</label>
              <label><input type="checkbox" id="adminWithdrawMethodStripe" value="stripe" ${adminDepositSettings.enabledWithdrawMethods.includes('stripe') ? 'checked' : ''}> Credit/Debit Card (Stripe)</label>
              <label><input type="checkbox" id="adminWithdrawMethodSepa" value="sepa" ${adminDepositSettings.enabledWithdrawMethods.includes('sepa') ? 'checked' : ''}> SEPA Transfer</label>
            </div>
          </div>
          <div class="form-group">
            <label>Default Crypto Wallet Address</label>
            <input type="text" id="adminCryptoAddress" value="${adminDepositSettings.cryptoAddress}" required>
          </div>
          <div class="form-group">
            <label>BTC Wallet Address</label>
            <input type="text" id="adminBtcAddress" value="${adminDepositSettings.cryptoWallets.BTC.address}" required>
          </div>
          <div class="form-group">
            <label>BTC Network</label>
            <input type="text" id="adminBtcNetwork" value="${adminDepositSettings.cryptoWallets.BTC.network}" required>
          </div>
          <div class="form-group">
            <label>USDT Wallet Address</label>
            <input type="text" id="adminUsdtAddress" value="${adminDepositSettings.cryptoWallets.USDT.address}" required>
          </div>
          <div class="form-group">
            <label>USDT Network</label>
            <input type="text" id="adminUsdtNetwork" value="${adminDepositSettings.cryptoWallets.USDT.network}" required>
          </div>
          <div class="form-group">
            <label>ETH Wallet Address</label>
            <input type="text" id="adminEthAddress" value="${adminDepositSettings.cryptoWallets.ETH.address}" required>
          </div>
          <div class="form-group">
            <label>ETH Network</label>
            <input type="text" id="adminEthNetwork" value="${adminDepositSettings.cryptoWallets.ETH.network}" required>
          </div>
          <div class="form-group">
            <label>BNB Wallet Address</label>
            <input type="text" id="adminBnbAddress" value="${adminDepositSettings.cryptoWallets.BNB.address}" required>
          </div>
          <div class="form-group">
            <label>BNB Network</label>
            <input type="text" id="adminBnbNetwork" value="${adminDepositSettings.cryptoWallets.BNB.network}" required>
          </div>
          <div class="form-group">
            <label>SOL Wallet Address</label>
            <input type="text" id="adminSolAddress" value="${adminDepositSettings.cryptoWallets.SOL.address}" required>
          </div>
          <div class="form-group">
            <label>SOL Network</label>
            <input type="text" id="adminSolNetwork" value="${adminDepositSettings.cryptoWallets.SOL.network}" required>
          </div>
          <div class="form-group">
            <label>MATIC Wallet Address</label>
            <input type="text" id="adminMaticAddress" value="${adminDepositSettings.cryptoWallets.MATIC.address}" required>
          </div>
          <div class="form-group">
            <label>MATIC Network</label>
            <input type="text" id="adminMaticNetwork" value="${adminDepositSettings.cryptoWallets.MATIC.network}" required>
          </div>
          <div class="form-group">
            <label>TRX Wallet Address</label>
            <input type="text" id="adminTrxAddress" value="${adminDepositSettings.cryptoWallets.TRX.address}" required>
          </div>
          <div class="form-group">
            <label>TRX Network</label>
            <input type="text" id="adminTrxNetwork" value="${adminDepositSettings.cryptoWallets.TRX.network}" required>
          </div>
          <div class="form-group">
            <label>Bank Account Name</label>
            <input type="text" id="adminBankAccountName" value="${adminDepositSettings.bankDetails.accountName}" required>
          </div>
          <div class="form-group">
            <label>Bank Account Number</label>
            <input type="text" id="adminBankAccountNumber" value="${adminDepositSettings.bankDetails.accountNumber}" required>
          </div>
          <div class="form-group">
            <label>Bank Name</label>
            <input type="text" id="adminBankName" value="${adminDepositSettings.bankDetails.bankName}" required>
          </div>
          <div class="form-group">
            <label>SWIFT Code</label>
            <input type="text" id="adminBankSwift" value="${adminDepositSettings.bankDetails.swiftCode}" required>
          </div>
          <div class="form-group">
            <label>IBAN</label>
            <input type="text" id="adminBankIban" value="${adminDepositSettings.bankDetails.iban}" required>
          </div>
          <div class="form-group">
            <label>Card Payment Name</label>
            <input type="text" id="adminCardName" value="${adminDepositSettings.cardDetails.cardName}" required>
          </div>
          <div class="form-group">
            <label>Card Payment Number</label>
            <input type="text" id="adminCardNumber" value="${adminDepositSettings.cardDetails.cardNumber}" required>
          </div>
          <div class="form-group">
            <label>Card Bank Name</label>
            <input type="text" id="adminCardBankName" value="${adminDepositSettings.cardDetails.bankName}" required>
          </div>
          <div class="form-group">
            <label>Card Routing Number</label>
            <input type="text" id="adminRoutingNumber" value="${adminDepositSettings.cardDetails.routingNumber}" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.getElementById('depositSettingsForm').addEventListener('submit', function(event) {
    event.preventDefault();
    adminDepositSettings.cryptoCurrency = document.getElementById('adminCryptoCurrency').value.trim();
    adminDepositSettings.cryptoNetwork = document.getElementById('adminCryptoNetwork').value.trim();
    adminDepositSettings.enabledMethods = [
      ...(document.getElementById('adminMethodCrypto')?.checked ? ['crypto'] : []),
      ...(document.getElementById('adminMethodBank')?.checked ? ['bank'] : []),
      ...(document.getElementById('adminMethodCard')?.checked ? ['card'] : [])
    ];
    adminDepositSettings.cryptoAddress = document.getElementById('adminCryptoAddress').value.trim();
    adminDepositSettings.enabledWithdrawMethods = [
      ...(document.getElementById('adminWithdrawMethodWallet')?.checked ? ['wallet'] : []),
      ...(document.getElementById('adminWithdrawMethodBank')?.checked ? ['bank'] : []),
      ...(document.getElementById('adminWithdrawMethodPaypal')?.checked ? ['paypal'] : []),
      ...(document.getElementById('adminWithdrawMethodStripe')?.checked ? ['stripe'] : []),
      ...(document.getElementById('adminWithdrawMethodSepa')?.checked ? ['sepa'] : [])
    ];
    adminDepositSettings.cryptoWallets = {
      BTC: {
        address: document.getElementById('adminBtcAddress').value.trim(),
        network: document.getElementById('adminBtcNetwork').value.trim()
      },
      USDT: {
        address: document.getElementById('adminUsdtAddress').value.trim(),
        network: document.getElementById('adminUsdtNetwork').value.trim()
      },
      ETH: {
        address: document.getElementById('adminEthAddress').value.trim(),
        network: document.getElementById('adminEthNetwork').value.trim()
      },
      BNB: {
        address: document.getElementById('adminBnbAddress').value.trim(),
        network: document.getElementById('adminBnbNetwork').value.trim()
      },
      SOL: {
        address: document.getElementById('adminSolAddress').value.trim(),
        network: document.getElementById('adminSolNetwork').value.trim()
      },
      MATIC: {
        address: document.getElementById('adminMaticAddress').value.trim(),
        network: document.getElementById('adminMaticNetwork').value.trim()
      },
      TRX: {
        address: document.getElementById('adminTrxAddress').value.trim(),
        network: document.getElementById('adminTrxNetwork').value.trim()
      }
    };
    adminDepositSettings.cryptoWallets[adminDepositSettings.cryptoCurrency] = {
      address: adminDepositSettings.cryptoAddress,
      network: adminDepositSettings.cryptoNetwork
    };
    adminDepositSettings.bankDetails = {
      accountName: document.getElementById('adminBankAccountName').value.trim(),
      accountNumber: document.getElementById('adminBankAccountNumber').value.trim(),
      bankName: document.getElementById('adminBankName').value.trim(),
      swiftCode: document.getElementById('adminBankSwift').value.trim(),
      iban: document.getElementById('adminBankIban').value.trim()
    };
    adminDepositSettings.cardDetails = {
      cardName: document.getElementById('adminCardName').value.trim(),
      cardNumber: document.getElementById('adminCardNumber').value.trim(),
      bankName: document.getElementById('adminCardBankName').value.trim(),
      routingNumber: document.getElementById('adminRoutingNumber').value.trim()
    };

    saveAdminDepositSettings();
    this.closest('.modal-overlay').remove();
    updateDepositSettingsSummary();
    alert('Deposit settings saved successfully.');
  });
}

function updateDepositSettingsSummary() {
  const cryptoDisplay = document.getElementById('adminCryptoAddressDisplay');
  const bankDisplay = document.getElementById('adminBankDetailsDisplay');
  const cardDisplay = document.getElementById('adminCardDetailsDisplay');
  const enabledMethodsDisplay = document.getElementById('adminEnabledMethodsDisplay');

  if (cryptoDisplay) {
    cryptoDisplay.innerHTML = `${adminDepositSettings.cryptoCurrency} (${adminDepositSettings.cryptoNetwork}) ${adminDepositSettings.cryptoAddress}` +
      `<br><small>BTC: ${adminDepositSettings.cryptoWallets.BTC.address} (${adminDepositSettings.cryptoWallets.BTC.network})</small>` +
      `<br><small>USDT: ${adminDepositSettings.cryptoWallets.USDT.address} (${adminDepositSettings.cryptoWallets.USDT.network})</small>` +
      `<br><small>ETH: ${adminDepositSettings.cryptoWallets.ETH.address} (${adminDepositSettings.cryptoWallets.ETH.network})</small>` +
      `<br><small>BNB: ${adminDepositSettings.cryptoWallets.BNB.address} (${adminDepositSettings.cryptoWallets.BNB.network})</small>` +
      `<br><small>SOL: ${adminDepositSettings.cryptoWallets.SOL.address} (${adminDepositSettings.cryptoWallets.SOL.network})</small>` +
      `<br><small>MATIC: ${adminDepositSettings.cryptoWallets.MATIC.address} (${adminDepositSettings.cryptoWallets.MATIC.network})</small>` +
      `<br><small>TRX: ${adminDepositSettings.cryptoWallets.TRX.address} (${adminDepositSettings.cryptoWallets.TRX.network})</small>`;
  }
  if (bankDisplay) bankDisplay.textContent = `${adminDepositSettings.bankDetails.bankName} • ${adminDepositSettings.bankDetails.accountNumber}`;
  if (cardDisplay) cardDisplay.textContent = `${adminDepositSettings.cardDetails.cardName} • ${adminDepositSettings.cardDetails.cardNumber}`;
  if (enabledMethodsDisplay) {
    enabledMethodsDisplay.textContent = adminDepositSettings.enabledMethods.length ? adminDepositSettings.enabledMethods.join(', ').toUpperCase() : 'No payment methods enabled';
  }
  const enabledWithdrawMethodsDisplay = document.getElementById('adminEnabledWithdrawMethodsDisplay');
  if (enabledWithdrawMethodsDisplay) {
    enabledWithdrawMethodsDisplay.textContent = adminDepositSettings.enabledWithdrawMethods.length ? adminDepositSettings.enabledWithdrawMethods.join(', ').toUpperCase() : 'No withdrawal methods enabled';
  }
}

// Initialize deposit settings summary on admin page load
function initAdminDepositSettings() {
  updateDepositSettingsSummary();
}

function renderAdminManagementSections() {
  renderRolesTable();
  renderStaffTable();
  renderHolidaysTable();
  renderSchemasTable();
  renderCrowdSchemasTable();
  renderInvestmentsTable();
}

function getCustomerNotificationLogs() {
  const emailLog = JSON.parse(localStorage.getItem('emailLog') || '[]');
  const messageLog = JSON.parse(localStorage.getItem('messageLog') || '[]');

  const emailEntries = emailLog.map(log => ({
    recipient: log.recipient,
    subject: log.subject,
    sentDate: log.sentDate,
    status: log.status || 'Sent'
  }));

  const messageEntries = messageLog.map(log => ({
    recipient: log.recipient,
    subject: log.message,
    sentDate: log.sentDate,
    status: log.status || 'Delivered'
  }));

  return [...emailEntries, ...messageEntries].sort((a, b) => new Date(b.sentDate) - new Date(a.sentDate));
}

function renderNotificationsTable() {
  const logs = getCustomerNotificationLogs();
  const tbody = document.getElementById('notificationsTableBody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No notifications sent yet</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${log.recipient}</td>
      <td>${log.subject}</td>
      <td>${new Date(log.sentDate).toLocaleString()}</td>
      <td><span class="badge ${log.status.toLowerCase()}">${log.status}</span></td>
    </tr>
  `).join('');
}

function getAdminStorageData(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn('Unable to read admin storage', key, error);
    return fallback;
  }
}

function saveAdminStorageData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
}

function refreshAdminRealtimeSections() {
  try {
    initializeDashboardData();
    populateAllTransactions();
    loadAllCustomersTable();
    loadActiveCustomersTable();
    loadDisabledCustomersTable();
    loadExpertsTable();
    renderAdminManagementSections();
    renderKycTables();
    renderNotificationsTable();
    updateDepositSettingsSummary();
  } catch (error) {
    console.warn('Realtime admin refresh failed:', error);
  }
}

function renderRolesTable() {
  const tbody = document.getElementById('rolesTableBody');
  if (!tbody) return;
  const roles = getAdminStorageData('adminRoles', [
    { id: 1, name: 'Admin', description: 'Full system access', users: 5, permissions: 'All' },
    { id: 2, name: 'Manager', description: 'Customer and transaction oversight', users: 3, permissions: 'Customers, Transactions' },
    { id: 3, name: 'Support', description: 'Support and KYC handling', users: 7, permissions: 'KYC, Tickets' }
  ]);
  tbody.innerHTML = roles.map(role => `
    <tr>
      <td>${role.name}</td>
      <td>${role.description}</td>
      <td>${role.users}</td>
      <td>${role.permissions}</td>
      <td>
        <button class="action-btn" onclick="editRole('${role.id}')">Edit</button>
      </td>
    </tr>
  `).join('');
}

function renderStaffTable() {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;
  const staff = getAdminStorageData('adminStaff', [
    { id: 1, name: 'Mina Foster', email: 'mina@rivertrade.com', role: 'Manager', status: 'Active' },
    { id: 2, name: 'Daniel Cruz', email: 'daniel@rivertrade.com', role: 'Support', status: 'Active' }
  ]);
  tbody.innerHTML = staff.map(member => `
    <tr>
      <td>${member.name}</td>
      <td>${member.email}</td>
      <td>${member.role}</td>
      <td><span class="badge success">${member.status}</span></td>
      <td>
        <button class="action-btn" onclick="editStaff('${member.id}')">Edit</button>
        <button class="action-btn" onclick="removeStaff('${member.id}')">Remove</button>
      </td>
    </tr>
  `).join('');
}

function renderHolidaysTable() {
  const tbody = document.getElementById('holidaysTableBody');
  if (!tbody) return;
  const holidays = getAdminStorageData('adminHolidays', [
    { id: 1, name: 'New Year', date: '2025-01-01', type: 'Public Holiday' }
  ]);
  tbody.innerHTML = holidays.map(holiday => `
    <tr>
      <td>${holiday.name}</td>
      <td>${holiday.date}</td>
      <td>${holiday.type}</td>
      <td><button class="action-btn" onclick="deleteHoliday('${holiday.id}')">Delete</button></td>
    </tr>
  `).join('');
}

function renderSchemasTable() {
  const tbody = document.getElementById('schemasTableBody');
  if (!tbody) return;
  const schemas = getAdminStorageData('adminSchemas', [
    { id: 1, name: 'Gold Plan', minAmount: 1000, maxAmount: 10000, returnRate: 8.5, duration: '12 months' }
  ]);
  tbody.innerHTML = schemas.map(schema => `
    <tr>
      <td>${schema.name}</td>
      <td>$${schema.minAmount.toLocaleString()}</td>
      <td>$${schema.maxAmount.toLocaleString()}</td>
      <td>${schema.returnRate}%</td>
      <td>${schema.duration}</td>
      <td>
        <button class="action-btn" onclick="editSchema('${schema.id}')">Edit</button>
        <button class="action-btn" onclick="deleteSchema('${schema.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderCrowdSchemasTable() {
  const tbody = document.getElementById('crowdSchemasTableBody');
  if (!tbody) return;
  const crowdSchemas = getAdminStorageData('adminCrowdSchemas', [
    { id: 1, name: 'Crowd Investment 1', participants: 45, targetAmount: 50000, status: 'Active' }
  ]);
  tbody.innerHTML = crowdSchemas.map(schema => `
    <tr>
      <td>${schema.name}</td>
      <td>${schema.participants}</td>
      <td>$${schema.targetAmount.toLocaleString()}</td>
      <td><span class="badge success">${schema.status}</span></td>
      <td>
        <button class="action-btn" onclick="editCrowdSchema('${schema.id}')">Edit</button>
        <button class="action-btn" onclick="deleteCrowdSchema('${schema.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderInvestmentsTable() {
  const tbody = document.getElementById('investmentsTableBody');
  if (!tbody) return;
  const investments = getAdminStorageData('adminInvestments', [
    { id: 'INV-1001', user: 'Ada Lovelace', plan: 'Gold Plan', amount: 2500, status: 'Active', startDate: '2025-01-10', expectedReturn: '8.5%' }
  ]);
  tbody.innerHTML = investments.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.user}</td>
      <td>${item.plan}</td>
      <td>$${Number(item.amount).toLocaleString()}</td>
      <td><span class="badge success">${item.status}</span></td>
      <td>${item.startDate}</td>
      <td>${item.expectedReturn}</td>
    </tr>
  `).join('');
}

// KYC Management Functions
function approveKyc(id) {
  if (!confirm('Are you sure you want to approve this KYC request?')) {
    return;
  }

  const requests = getAdminKycRequests();
  const request = requests.find(r => String(r.id) === String(id));
  if (!request) {
    alert('KYC request not found');
    return;
  }

  request.status = 'Approved';
  request.reviewedAt = new Date().toISOString();
  request.reviewReason = 'Approved by admin';
  saveAdminKycRequests(requests);
  renderKycTables();
  alert('KYC request ' + id + ' approved successfully');
}

function rejectKyc(id) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Reject KYC Request</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="submitKycRejection(event, '${id}')">
          <div class="form-group">
            <label>Reason for Rejection</label>
            <textarea required placeholder="Explain why you're rejecting this KYC" rows="4"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Reject KYC</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function submitKycRejection(event, id) {
  event.preventDefault();
  const reason = event.target.querySelector('textarea')?.value.trim() || 'Rejected by admin';
  const requests = getAdminKycRequests();
  const request = requests.find(r => String(r.id) === String(id));
  if (!request) {
    alert('KYC request not found');
    event.target.closest('.modal-overlay').remove();
    return;
  }

  request.status = 'Rejected';
  request.reviewedAt = new Date().toISOString();
  request.reviewReason = reason;
  saveAdminKycRequests(requests);
  renderKycTables();
  alert('KYC request ' + id + ' rejected successfully');
  event.target.closest('.modal-overlay').remove();
}

function viewKycDetails(id) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content transaction-modal">
      <div class="modal-header">
        <h2>KYC Request #${id}</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="transaction-details">
          <div class="detail-row">
            <span class="detail-label">Request ID:</span>
            <span class="detail-value">#KYC${id}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">User Name:</span>
            <span class="detail-value">-- Loading from API --</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">-- Loading from API --</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Document Type:</span>
            <span class="detail-value">-- Loading from API --</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Submitted Date:</span>
            <span class="detail-value">-- Loading from API --</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value badge pending">Pending</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
        <button class="btn-primary" onclick="approveKyc(${id}); this.closest('.modal-overlay').remove()">Approve</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Default investment plans fallback for admin editor
const defaultInvestmentPlansAdmin = [
  { id: 'starter', name: 'Starter Plan', minAmount: 5000, maxAmount: 9000, duration: 45, roi: 6 },
  { id: 'deluxe', name: 'Deluxe Plan', minAmount: 10000, maxAmount: 29000, duration: 60, roi: 8 },
  { id: 'premium', name: 'Premium Plan', minAmount: 30000, maxAmount: 49000, duration: 90, roi: 12 },
  { id: 'vip', name: 'VIP Plan', minAmount: 100000, maxAmount: 150000, duration: 120, roi: 18 },
  { id: 'gold', name: 'Gold Plan', minAmount: 200000, maxAmount: 300000, duration: 150, roi: 22 },
  { id: 'vip_platinum', name: 'VIP Platinum', minAmount: 500000, maxAmount: 1000000, duration: 180, roi: 30 }
];

function getAdminInvestmentPlans() {
  try {
    const raw = localStorage.getItem('investmentPlans');
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : defaultInvestmentPlansAdmin;
  } catch (e) {
    return defaultInvestmentPlansAdmin;
  }
}

function saveAdminInvestmentPlans(plans) {
  try {
    localStorage.setItem('investmentPlans', JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
    return true;
  } catch (e) {
    console.error('Failed to save investment plans', e);
    return false;
  }
}

function showInvestmentPlansEditor() {
  const editor = document.getElementById('plansEditorModal');
  const list = document.getElementById('plansEditorList');
  const plans = getAdminInvestmentPlans();
  if (!editor || !list) return;
  list.innerHTML = plans.map((p, i) => `
    <div class="plan-row" data-index="${i}" style="border:1px solid #e6e9ee;padding:8px;border-radius:6px;margin-bottom:8px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="flex:1;min-width:160px;">
          <label style="font-size:12px;color:#333">Name</label>
          <input class="plan-name" value="${p.name}" placeholder="Starter Plan" style="width:100%">
        </div>
        <div style="width:90px;">
          <label style="font-size:12px;color:#333">Min USD</label>
          <input class="plan-min" value="${p.minAmount}" type="number" min="0" style="width:100%">
        </div>
        <div style="width:90px;">
          <label style="font-size:12px;color:#333">Max USD</label>
          <input class="plan-max" value="${p.maxAmount}" type="number" min="0" style="width:100%">
        </div>
        <div style="width:80px;">
          <label style="font-size:12px;color:#333">Days</label>
          <input class="plan-duration" value="${p.duration}" type="number" min="1" style="width:100%">
        </div>
        <div style="width:80px;">
          <label style="font-size:12px;color:#333">ROI %</label>
          <input class="plan-roi" value="${p.roi}" type="number" min="0" step="0.1" style="width:100%">
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button class="btn small" onclick="removePlanFromEditor(${i})">Remove</button>
        </div>
      </div>
      <div class="plan-error" style="color:#c0392b;font-size:12px;margin-top:6px;display:none"></div>
    </div>
  `).join('');
  editor.style.display = 'block';
}

function closePlansEditor() {
  const editor = document.getElementById('plansEditorModal');
  if (editor) editor.style.display = 'none';
}

function addPlanFromEditor() {
  const list = document.getElementById('plansEditorList');
  if (!list) return;
  const idx = list.children.length;
  const row = document.createElement('div');
  row.className = 'plan-row';
  row.dataset.index = idx;
  row.style = 'border:1px solid #e6e9ee;padding:8px;border-radius:6px;margin-bottom:8px;';
  row.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;">
      <div style="flex:1;min-width:160px;">
        <label style="font-size:12px;color:#333">Name</label>
        <input class="plan-name" value="New Plan" placeholder="New Plan" style="width:100%">
      </div>
      <div style="width:90px;">
        <label style="font-size:12px;color:#333">Min USD</label>
        <input class="plan-min" value="0" type="number" min="0" style="width:100%">
      </div>
      <div style="width:90px;">
        <label style="font-size:12px;color:#333">Max USD</label>
        <input class="plan-max" value="0" type="number" min="0" style="width:100%">
      </div>
      <div style="width:80px;">
        <label style="font-size:12px;color:#333">Days</label>
        <input class="plan-duration" value="30" type="number" min="1" style="width:100%">
      </div>
      <div style="width:80px;">
        <label style="font-size:12px;color:#333">ROI %</label>
        <input class="plan-roi" value="0" type="number" min="0" step="0.1" style="width:100%">
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <button class="btn small" onclick="removePlanFromEditor(${idx})">Remove</button>
      </div>
    </div>
    <div class="plan-error" style="color:#c0392b;font-size:12px;margin-top:6px;display:none"></div>
  `;
  list.appendChild(row);
}

function removePlanFromEditor(index) {
  const list = document.getElementById('plansEditorList');
  if (!list) return;
  const row = list.querySelector(`.plan-row[data-index="${index}"]`);
  if (row) row.remove();
  Array.from(list.children).forEach((c, i) => { c.dataset.index = i; const btn = c.querySelector('button'); if (btn) btn.setAttribute('onclick', `removePlanFromEditor(${i})`); });
}

function savePlansEditor() {
  const list = document.getElementById('plansEditorList');
  if (!list) return;
  // Clear previous errors
  Array.from(list.children).forEach(r => { const err = r.querySelector('.plan-error'); if (err) { err.style.display='none'; err.textContent=''; } });

  const plans = Array.from(list.children).map((row, idx) => {
    return {
      id: (row.querySelector('.plan-name')?.value || 'plan').toLowerCase().replace(/\s+/g,'_') + '_' + idx,
      name: row.querySelector('.plan-name')?.value?.trim() || '',
      minAmount: Number(row.querySelector('.plan-min')?.value || 0),
      maxAmount: Number(row.querySelector('.plan-max')?.value || 0),
      duration: Number(row.querySelector('.plan-duration')?.value || 0),
      roi: Number(row.querySelector('.plan-roi')?.value || 0)
    };
  });

  // Validate plans
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i];
    const row = list.children[i];
    const errEl = row.querySelector('.plan-error');
    if (!p.name) {
      errEl.style.display = 'block'; errEl.textContent = 'Name is required'; row.querySelector('.plan-name').focus(); return;
    }
    if (!(Number.isFinite(p.minAmount) && Number.isFinite(p.maxAmount))) {
      errEl.style.display = 'block'; errEl.textContent = 'Min and Max must be numbers'; row.querySelector('.plan-min').focus(); return;
    }
    if (p.minAmount < 0 || p.maxAmount < 0) {
      errEl.style.display = 'block'; errEl.textContent = 'Amounts must be >= 0'; row.querySelector('.plan-min').focus(); return;
    }
    if (p.minAmount > p.maxAmount) {
      errEl.style.display = 'block'; errEl.textContent = 'Min cannot exceed Max'; row.querySelector('.plan-min').focus(); return;
    }
    if (!Number.isFinite(p.duration) || p.duration <= 0) {
      errEl.style.display = 'block'; errEl.textContent = 'Duration must be a positive number of days'; row.querySelector('.plan-duration').focus(); return;
    }
    if (!Number.isFinite(p.roi) || p.roi < 0) {
      errEl.style.display = 'block'; errEl.textContent = 'ROI must be >= 0'; row.querySelector('.plan-roi').focus(); return;
    }
  }

  if (saveAdminInvestmentPlans(plans)) {
    closePlansEditor();
    showNotificationMessage('Investment plans updated');
  }
}

function seedAdminKycRequests() {
  const existing = localStorage.getItem('adminKycRequests');
  if (existing) {
    return;
  }

  const sampleRequests = [
    {
      id: '1001',
      userId: '1',
      userName: 'Alice Johnson',
      email: 'alice@example.com',
      status: 'Pending',
      submittedAt: '2025-05-15T09:42:00.000Z',
      details: 'Passport • A1234567'
    },
    {
      id: '1002',
      userId: '2',
      userName: 'Mark Rivera',
      email: 'mark@example.com',
      status: 'Rejected',
      submittedAt: '2025-05-13T15:30:00.000Z',
      reviewedAt: '2025-05-14T08:10:00.000Z',
      reviewReason: 'Photo not clear',
      details: 'ID Card • B9876543'
    }
  ];

  localStorage.setItem('adminKycRequests', JSON.stringify(sampleRequests));
}

function getAdminKycRequests() {
  seedAdminKycRequests();
  try {
    const stored = localStorage.getItem('adminKycRequests');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Unable to load KYC requests', e);
  }
  return [];
}

function saveAdminKycRequests(requests) {
  localStorage.setItem('adminKycRequests', JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
}

function renderKycTables() {
  const requests = getAdminKycRequests();
  const pendingBody = document.getElementById('pendingKycTableBody');
  const rejectedBody = document.getElementById('rejectedKycTableBody');
  const allBody = document.getElementById('allKycTableBody');

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const rejectedRequests = requests.filter(r => r.status === 'Rejected');

  if (pendingBody) {
    pendingBody.innerHTML = pendingRequests.length ? pendingRequests.map(req => `
      <tr>
        <td>#KYC-${req.id}</td>
        <td>${req.userName}</td>
        <td>${req.email}</td>
        <td>${new Date(req.submittedAt).toLocaleDateString()}</td>
        <td>
          <button class="action-btn" onclick="viewKycDetails('${req.id}')">View</button>
          <button class="action-btn" onclick="approveKyc('${req.id}')">Approve</button>
          <button class="action-btn" onclick="rejectKyc('${req.id}')">Reject</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 20px;">No pending KYC requests</td></tr>';
  }

  if (rejectedBody) {
    rejectedBody.innerHTML = rejectedRequests.length ? rejectedRequests.map(req => `
      <tr>
        <td>#KYC-${req.id}</td>
        <td>${req.userName}</td>
        <td>${new Date(req.reviewedAt).toLocaleDateString()}</td>
        <td>${req.reviewReason || 'No reason provided'}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align: center; padding: 20px;">No rejected KYC requests</td></tr>';
  }

  if (allBody) {
    allBody.innerHTML = requests.length ? requests.map(req => `
      <tr>
        <td>#KYC-${req.id}</td>
        <td>${req.userName}</td>
        <td><span class="badge ${req.status.toLowerCase()}">${req.status}</span></td>
        <td>${new Date(req.submittedAt).toLocaleDateString()}</td>
        <td>${req.details || 'N/A'}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 20px;">No KYC logs available</td></tr>';
  }
}

function submitKycForm(event) {
  event.preventDefault();
  const form = event.target;
  const userId = form.querySelector('input[placeholder="User ID"]')?.value.trim();
  const fullName = form.querySelector('input[placeholder="Full Name"]')?.value.trim();
  const email = form.querySelector('input[type="email"]')?.value.trim() || `${userId || 'user'}@example.com`;
  const docType = form.querySelector('select')?.value || 'Passport';
  const docNumber = form.querySelector('input[placeholder="Document Number"]')?.value.trim();

  if (!userId || !fullName || !docNumber) {
    alert('Please fill in all required fields');
    return;
  }

  const requests = getAdminKycRequests();
  const newRequest = {
    id: Date.now(),
    userId,
    userName: fullName,
    email,
    status: 'Pending',
    submittedAt: new Date().toISOString(),
    details: `${docType} • ${docNumber}`
  };
  requests.unshift(newRequest);
  saveAdminKycRequests(requests);
  renderKycTables();
  alert('KYC form submitted successfully');
  form.reset();
}

// Email and Message Functions
function sendEmailToAll(event) {
  event.preventDefault();
  
  const subject = event.target.querySelector('input').value;
  const message = event.target.querySelector('textarea').value;
  
  if (!subject || !message) {
    alert('Please fill in all fields');
    return;
  }
  
  const confirmSend = confirm(`Send email to all customers?\n\nSubject: ${subject}\nRecipients: All Customers`);
  
  if (confirmSend) {
    // Save email log
    const emailLog = JSON.parse(localStorage.getItem('emailLog') || '[]');
    emailLog.push({
      id: emailLog.length + 1,
      subject,
      message,
      recipient: 'All Customers',
      sentDate: new Date().toLocaleString(),
      status: 'Sent'
    });
    localStorage.setItem('emailLog', JSON.stringify(emailLog));
    renderNotificationsTable();
    alert('Email sent to all customers successfully!');
    event.target.reset();
  }
}

function sendMessageToAll(event) {
  event.preventDefault();
  
  const message = event.target.querySelector('textarea').value;
  
  if (!message) {
    alert('Please enter a message');
    return;
  }
  
  const confirmSend = confirm(`Send message to all customers?\n\nMessage: ${message.substring(0, 50)}...`);
  
  if (confirmSend) {
    // Save message log
    const messageLog = JSON.parse(localStorage.getItem('messageLog') || '[]');
    messageLog.push({
      id: messageLog.length + 1,
      message,
      recipient: 'All Customers',
      sentDate: new Date().toLocaleString(),
      status: 'Delivered'
    });
    localStorage.setItem('messageLog', JSON.stringify(messageLog));
    renderNotificationsTable();
    alert('Message sent to all customers successfully!');
    event.target.reset();
  }
}

// Role Management Functions
function editRole(id) {
  const roles = getAdminStorageData('adminRoles', []);
  const role = roles.find(item => String(item.id) === String(id)) || { id: Date.now(), name: '', description: '', users: 0, permissions: '' };
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${id === 'new' ? 'Add Role' : `Edit Role #${id}`}</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="saveRoleEdit(event, '${role.id}')">
          <div class="form-group">
            <label>Role Name</label>
            <input type="text" required placeholder="Role name" value="${role.name}">
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea required placeholder="Role description" rows="4">${role.description}</textarea>
          </div>
          <div class="form-group">
            <label>Permissions</label>
            <input type="text" required placeholder="e.g. Customers, KYC" value="${role.permissions}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Save Role</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveRoleEdit(event, id) {
  event.preventDefault();
  const roles = getAdminStorageData('adminRoles', []);
  const form = event.target;
  const roleData = {
    id: String(id) === 'new' ? Date.now() : String(id),
    name: form.querySelector('input[type="text"]').value.trim(),
    description: form.querySelector('textarea').value.trim(),
    users: 0,
    permissions: form.querySelectorAll('input[type="text"]')[1].value.trim()
  };
  const existingIndex = roles.findIndex(item => String(item.id) === String(roleData.id));
  if (existingIndex >= 0) {
    roles[existingIndex] = { ...roles[existingIndex], ...roleData };
  } else {
    roles.push(roleData);
  }
  saveAdminStorageData('adminRoles', roles);
  renderRolesTable();
  alert('Role saved successfully');
  form.closest('.modal-overlay').remove();
}

function addRole() {
  editRole('new');
}

// Staff Management Functions
function editStaff(id) {
  const staff = getAdminStorageData('adminStaff', []);
  const member = staff.find(item => String(item.id) === String(id)) || { id: Date.now(), name: '', email: '', role: 'Support', status: 'Active' };
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${id === 'new' ? 'Add Staff' : `Edit Staff #${id}`}</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="saveStaffEdit(event, '${member.id}')">
          <div class="form-group">
            <label>Staff Name</label>
            <input type="text" required placeholder="Staff name" value="${member.name}">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" required placeholder="Email address" value="${member.email}">
          </div>
          <div class="form-group">
            <label>Role</label>
            <select required>
              <option ${member.role === 'Admin' ? 'selected' : ''}>Admin</option>
              <option ${member.role === 'Manager' ? 'selected' : ''}>Manager</option>
              <option ${member.role === 'Support' ? 'selected' : ''}>Support</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveStaffEdit(event, id) {
  event.preventDefault();
  const staff = getAdminStorageData('adminStaff', []);
  const form = event.target;
  const memberData = {
    id: String(id) === 'new' ? Date.now() : String(id),
    name: form.querySelector('input[type="text"]').value.trim(),
    email: form.querySelector('input[type="email"]').value.trim(),
    role: form.querySelector('select').value,
    status: 'Active'
  };
  const existingIndex = staff.findIndex(item => String(item.id) === String(memberData.id));
  if (existingIndex >= 0) {
    staff[existingIndex] = { ...staff[existingIndex], ...memberData };
  } else {
    staff.push(memberData);
  }
  saveAdminStorageData('adminStaff', staff);
  renderStaffTable();
  alert('Staff saved successfully');
  form.closest('.modal-overlay').remove();
}

function removeStaff(id) {
  if (confirm('Are you sure you want to remove this staff member?')) {
    const staff = getAdminStorageData('adminStaff', []).filter(member => String(member.id) !== String(id));
    saveAdminStorageData('adminStaff', staff);
    renderStaffTable();
    alert('Staff removed successfully');
  }
}

function addStaff() {
  editStaff('new');
}

// Schedule Functions
function saveSchedule(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const startDate = formData.get('startDate') || event.target.querySelector('input[type="date"]:nth-of-type(1)').value;
  const endDate = formData.get('endDate') || event.target.querySelector('input[type="date"]:nth-of-type(2)').value;
  const description = event.target.querySelector('textarea')?.value || '';
  
  if (!startDate || !endDate) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Save schedule
  const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
  schedules.push({
    id: schedules.length + 1,
    startDate,
    endDate,
    description,
    createdAt: new Date().toLocaleString()
  });
  localStorage.setItem('schedules', JSON.stringify(schedules));
  
  alert('Schedule saved successfully');
  event.target.reset();
}

// Holiday Management Functions
function addHoliday() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Holiday</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="saveHoliday(event)">
          <div class="form-group">
            <label>Holiday Name</label>
            <input type="text" required placeholder="Holiday name">
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" required>
          </div>
          <div class="form-group">
            <label>Type</label>
            <select required>
              <option>Public Holiday</option>
              <option>Company Holiday</option>
              <option>Optional</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Add Holiday</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveHoliday(event) {
  event.preventDefault();
  const holidays = getAdminStorageData('adminHolidays', []);
  const form = event.target;
  holidays.push({
    id: Date.now(),
    name: form.querySelector('input[type="text"]').value.trim(),
    date: form.querySelector('input[type="date"]').value,
    type: form.querySelector('select').value
  });
  saveAdminStorageData('adminHolidays', holidays);
  renderHolidaysTable();
  alert('Holiday added successfully');
  form.closest('.modal-overlay').remove();
}

function deleteHoliday(id) {
  if (confirm('Are you sure you want to delete this holiday?')) {
    const holidays = getAdminStorageData('adminHolidays', []).filter(item => String(item.id) !== String(id));
    saveAdminStorageData('adminHolidays', holidays);
    renderHolidaysTable();
    alert('Holiday deleted successfully');
  }
}

// Schema Management Functions
function editSchema(id) {
  const schemas = getAdminStorageData('adminSchemas', []);
  const schema = schemas.find(item => String(item.id) === String(id)) || { id: Date.now(), name: '', minAmount: 0, maxAmount: 0, returnRate: 0, duration: '' };
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${id === 'new' ? 'Add Schema' : `Edit Schema #${id}`}</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="saveSchemaEdit(event, '${schema.id}')">
          <div class="form-group">
            <label>Schema Name</label>
            <input type="text" required placeholder="Schema name" value="${schema.name}">
          </div>
          <div class="form-group">
            <label>Min Amount</label>
            <input type="number" required placeholder="Minimum investment" value="${schema.minAmount}">
          </div>
          <div class="form-group">
            <label>Max Amount</label>
            <input type="number" required placeholder="Maximum investment" value="${schema.maxAmount}">
          </div>
          <div class="form-group">
            <label>Return %</label>
            <input type="number" step="0.1" required placeholder="Return percentage" value="${schema.returnRate}">
          </div>
          <div class="form-group">
            <label>Duration</label>
            <input type="text" required placeholder="e.g., 12 months" value="${schema.duration}">
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Save Schema</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveSchemaEdit(event, id) {
  event.preventDefault();
  const schemas = getAdminStorageData('adminSchemas', []);
  const form = event.target;
  const schemaData = {
    id: String(id) === 'new' ? Date.now() : String(id),
    name: form.querySelector('input[type="text"]').value.trim(),
    minAmount: Number(form.querySelectorAll('input[type="number"]')[0].value),
    maxAmount: Number(form.querySelectorAll('input[type="number"]')[1].value),
    returnRate: Number(form.querySelectorAll('input[type="number"]')[2].value),
    duration: form.querySelectorAll('input[type="text"]')[1].value.trim()
  };
  const existingIndex = schemas.findIndex(item => String(item.id) === String(schemaData.id));
  if (existingIndex >= 0) {
    schemas[existingIndex] = { ...schemas[existingIndex], ...schemaData };
  } else {
    schemas.push(schemaData);
  }
  saveAdminStorageData('adminSchemas', schemas);
  renderSchemasTable();
  alert('Schema saved successfully');
  form.closest('.modal-overlay').remove();
}

function deleteSchema(id) {
  if (confirm('Are you sure you want to delete this schema?')) {
    const schemas = getAdminStorageData('adminSchemas', []).filter(item => String(item.id) !== String(id));
    saveAdminStorageData('adminSchemas', schemas);
    renderSchemasTable();
    alert('Schema deleted successfully');
  }
}

function addSchema() {
  editSchema('new');
}

// Crowd Schema Functions
function editCrowdSchema(id) {
  const crowdSchemas = getAdminStorageData('adminCrowdSchemas', []);
  const schema = crowdSchemas.find(item => String(item.id) === String(id)) || { id: Date.now(), name: '', participants: 0, targetAmount: 0, status: 'Active' };
  const modal = document.createElement('div');
  modal.className = 'modal-overlay show';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${id === 'new' ? 'Add Crowd Schema' : `Edit Crowd Schema #${id}`}</h2>
        <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="modal-body">
        <form onsubmit="saveCrowdSchemaEdit(event, '${schema.id}')">
          <div class="form-group">
            <label>Schema Name</label>
            <input type="text" required placeholder="Schema name" value="${schema.name}">
          </div>
          <div class="form-group">
            <label>Target Amount</label>
            <input type="number" required placeholder="Target amount" value="${schema.targetAmount}">
          </div>
          <div class="form-group">
            <label>Max Participants</label>
            <input type="number" required placeholder="Maximum participants" value="${schema.participants}">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select required>
              <option ${schema.status === 'Active' ? 'selected' : ''}>Active</option>
              <option ${schema.status === 'Paused' ? 'selected' : ''}>Paused</option>
              <option ${schema.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button type="submit" class="btn-primary">Save Schema</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveCrowdSchemaEdit(event, id) {
  event.preventDefault();
  const crowdSchemas = getAdminStorageData('adminCrowdSchemas', []);
  const form = event.target;
  const schemaData = {
    id: String(id) === 'new' ? Date.now() : String(id),
    name: form.querySelector('input[type="text"]').value.trim(),
    participants: Number(form.querySelectorAll('input[type="number"]')[1].value),
    targetAmount: Number(form.querySelectorAll('input[type="number"]')[0].value),
    status: form.querySelector('select').value
  };
  const existingIndex = crowdSchemas.findIndex(item => String(item.id) === String(schemaData.id));
  if (existingIndex >= 0) {
    crowdSchemas[existingIndex] = { ...crowdSchemas[existingIndex], ...schemaData };
  } else {
    crowdSchemas.push(schemaData);
  }
  saveAdminStorageData('adminCrowdSchemas', crowdSchemas);
  renderCrowdSchemasTable();
  alert('Crowd schema saved successfully');
  form.closest('.modal-overlay').remove();
}

function deleteCrowdSchema(id) {
  if (confirm('Are you sure you want to delete this crowd schema?')) {
    const crowdSchemas = getAdminStorageData('adminCrowdSchemas', []).filter(item => String(item.id) !== String(id));
    saveAdminStorageData('adminCrowdSchemas', crowdSchemas);
    renderCrowdSchemasTable();
    alert('Crowd schema deleted successfully');
  }
}

function addCrowdSchema() {
  editCrowdSchema('new');
}

// ===== TRANSACTIONS MANAGEMENT =====

// Populate all transactions table
function getTransactionById(transactionId) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  return transactions.find(t => t.id === transactionId || t.transactionId === transactionId || t.timestamp === transactionId) || null;
}

function approveDeposit(transactionId) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const transaction = transactions.find(t => t.id === transactionId || t.transactionId === transactionId || t.timestamp === transactionId);
  if (!transaction || transaction.status !== 'Pending Approval') return;

  transaction.status = 'Approved';
  transaction.processed = true;

  const currentBalance = parseFloat(localStorage.getItem('userBalance') || '0');
  localStorage.setItem('userBalance', (currentBalance + (parseFloat(transaction.amount) || 0)).toString());

  localStorage.setItem('transactions', JSON.stringify(transactions));
  populateAllTransactions();
  alert('Deposit #' + (transaction.id || transaction.timestamp || transaction.transactionId) + ' approved.');
}

function rejectDeposit(transactionId) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const transaction = transactions.find(t => t.id === transactionId || t.transactionId === transactionId || t.timestamp === transactionId);
  if (!transaction || transaction.status !== 'Pending Approval') return;

  transaction.status = 'Rejected';
  localStorage.setItem('transactions', JSON.stringify(transactions));
  populateAllTransactions();
  alert('Deposit #' + (transaction.id || transaction.timestamp || transaction.transactionId) + ' rejected.');
}

function approveWithdraw(transactionId) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const transaction = transactions.find(t => t.id === transactionId || t.transactionId === transactionId || t.timestamp === transactionId);
  if (!transaction || transaction.status !== 'Pending Approval') return;

  const currentBalance = parseFloat(localStorage.getItem('userBalance') || '0');
  const amount = parseFloat(transaction.amount) || 0;
  if (currentBalance < amount) {
    alert('Insufficient user balance to approve withdrawal.');
    return;
  }

  transaction.status = 'Approved';
  transaction.processed = true;
  localStorage.setItem('userBalance', (currentBalance - amount).toString());
  localStorage.setItem('transactions', JSON.stringify(transactions));
  populateAllTransactions();
  alert('Withdrawal #' + (transaction.id || transaction.timestamp || transaction.transactionId) + ' approved.');
}

function rejectWithdraw(transactionId) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const transaction = transactions.find(t => t.id === transactionId || t.transactionId === transactionId || t.timestamp === transactionId);
  if (!transaction) return;

  transaction.status = 'Rejected';
  localStorage.setItem('transactions', JSON.stringify(transactions));
  populateAllTransactions();
  alert('Withdrawal #' + (transaction.id || transaction.timestamp || transaction.transactionId) + ' rejected.');
}

function populateAllTransactions() {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const tbody = document.getElementById('allTransactionsTbody');
  
  if (tbody) {
    tbody.innerHTML = transactions.map(t => `
      <tr>
        <td>#TXN-${t.id || t.transactionId || (t.timestamp ? t.timestamp.slice(-6) : 'unknown')}</td>
        <td>${t.user || 'Guest'}</td>
        <td><span class="badge-type ${t.type?.toLowerCase() || 'unknown'}">${t.type || 'Unknown'}</span></td>
        <td><strong>${t.amount || '0'}</strong></td>
        <td><span class="badge ${t.status?.toLowerCase() || 'unknown'}">${t.status || 'Unknown'}</span></td>
        <td>${t.date || (t.timestamp ? new Date(t.timestamp).toLocaleDateString() : 'N/A')}</td>
        <td>
          <button class="action-btn" onclick="viewTransaction('${t.id || t.transactionId || t.timestamp}')">View</button>
          ${((t.type === 'Deposit' || t.type === 'Withdraw') && (t.status === 'Pending Approval' || t.status === 'pending')) ? `
            <button class="action-btn" onclick="${t.type === 'Deposit' ? 'approveDeposit' : 'approveWithdraw'}('${t.id || t.transactionId || t.timestamp}')">Approve</button>
            <button class="action-btn" onclick="${t.type === 'Deposit' ? 'rejectDeposit' : 'rejectWithdraw'}('${t.id || t.transactionId || t.timestamp}')">Reject</button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  }
}

// Filter transactions
function filterTransactions() {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  const fromDate = document.getElementById('transFromDate')?.value;
  const toDate = document.getElementById('transToDate')?.value;
  const typeFilter = document.getElementById('transTypeFilter')?.value;
  
  let filtered = transactions;
  
  // Filter by type
  if (typeFilter) {
    filtered = filtered.filter(t => t.type === typeFilter);
  }
  
  // Filter by date range
  if (fromDate || toDate) {
    filtered = filtered.filter(t => {
      const tDate = t.date.split(' ')[0]; // Extract date part
      if (fromDate && tDate < fromDate) return false;
      if (toDate && tDate > toDate) return false;
      return true;
    });
  }
  
  // Display filtered results
  const tbody = document.getElementById('allTransactionsTbody');
  if (tbody) {
    tbody.innerHTML = filtered.length > 0 
      ? filtered.map(t => `
          <tr>
            <td>#TXN-${t.id}</td>
            <td>${t.user}</td>
            <td><span class="badge-type ${t.type.toLowerCase()}">${t.type}</span></td>
            <td><strong>${t.amount}</strong></td>
            <td><span class="badge ${t.status.toLowerCase()}">${t.status}</span></td>
            <td>${t.date}</td>
            <td><button class="action-btn" onclick="viewTransaction('${t.id}')">View</button></td>
          </tr>
        `).join('')
      : '<tr><td colspan="7" style="text-align:center; padding:20px;">No transactions found</td></tr>';
  }
  
  alert(filtered.length + ' transaction(s) found');
}

// Export transactions
function exportTransactions() {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  
  if (transactions.length === 0) {
    alert('No transactions to export');
    return;
  }
  
  // Create CSV content
  let csv = 'Transaction ID,User,Type,Amount,Status,Date\n';
  
  transactions.forEach(t => {
    csv += `"#TXN-${t.id}","${t.user}","${t.type}","${t.amount}","${t.status}","${t.date}"\n`;
  });
  
  // Download CSV
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
  element.setAttribute('download', 'transactions_' + new Date().toISOString().split('T')[0] + '.csv');
  element.style.display = 'none';
  
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  
  console.log('Transactions exported: ' + transactions.length + ' records');
}

// Add new transaction
function addNewTransaction(transactionData) {
  const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
  
  const newTransaction = {
    id: String(Math.max(...transactions.map(t => parseInt(t.id)), 0) + 1).padStart(5, '0'),
    user: transactionData.user,
    amount: transactionData.amount,
    type: transactionData.type,
    status: 'Pending',
    date: new Date().toLocaleString()
  };
  
  transactions.unshift(newTransaction);
  localStorage.setItem('transactions', JSON.stringify(transactions));
  
  // Update display
  populateAllTransactions();
  
  return newTransaction;
}

// ===== USER FINANCIAL MANAGEMENT FUNCTIONS =====

let selectedUserId = null;
let allUsers = [];
let selectedUserDashboardState = null;

// Get all users from localStorage
function getAllUsers() {
  allUsers = [];
  // Try to get users from different possible storage locations
  // First, check if there's a users object in localStorage
  const storedUsers = localStorage.getItem('users');
  if (storedUsers) {
    try {
      allUsers = JSON.parse(storedUsers);
      return allUsers;
    } catch (e) {
      console.log('Could not parse stored users');
    }
  }
  
  // If not, try to get individual user data
  // Scan localStorage for any userState keys
  for (let key in localStorage) {
    if (key.startsWith('userState_') || key === 'userState') {
      try {
        const userData = JSON.parse(localStorage.getItem(key));
        if (userData && userData.email) {
          allUsers.push({
            id: key.replace('userState_', ''),
            name: userData.name || 'Unknown User',
            email: userData.email || 'No email',
            balance: userData.balance || 0,
            brokerBalance: userData.brokerBalance || 0,
            investmentProfit: userData.investmentProfit || 0,
            cryptoHoldings: userData.cryptoHoldings || {},
            // Additional fields to allow admin edits of dashboard state
            activeInvestments: userData.activeInvestments || [],
            transactions: userData.transactions || [],
            swaps: userData.swaps || [],
            managedAccounts: userData.managedAccounts || [],
            referrals: userData.referrals || [],
            userData: userData.userData || {},
            storageKey: key
          });
        }
      } catch (e) {
        console.log('Could not parse user state:', key);
      }
    }
  }
  
  return allUsers;
}

function searchUsers(query) {
  if (!query || query.trim() === '') {
    document.getElementById('userSearchResults').style.display = 'none';
    return;
  }
  
  const users = getAllUsers();
  const searchTerm = query.toLowerCase();
  const results = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm) || 
    user.name.toLowerCase().includes(searchTerm)
  );
  
  displayUserSearchResults(results);
}

function displayUserSearchResults(results) {
  const resultsDiv = document.getElementById('userSearchResults');
  const tbody = document.getElementById('userSearchResultsBody');
  
  if (results.length === 0) {
    resultsDiv.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No users found</td></tr>';
    return;
  }
  
  tbody.innerHTML = results.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>$${user.balance.toFixed(2)}</td>
      <td>$${user.investmentProfit.toFixed(2)}</td>
      <td>
        <button class="btn-primary" onclick="selectUser('${user.id}', '${user.email}', '${user.name}')" style="padding: 6px 12px; font-size: 12px;">Select</button>
      </td>
    </tr>
  `).join('');
  
  resultsDiv.style.display = 'block';
}

function selectUser(userId, email, name) {
  selectedUserId = userId;
  // Try to load the user's full dashboard state first
  selectedUserDashboardState = loadSelectedUserState(userId);
  const users = getAllUsers();
  const user = selectedUserDashboardState || users.find(u => u.id === userId);
  
  if (!user) {
    alert('User not found');
    return;
  }
  
  displayUserDetails(user);
  document.getElementById('userDetailsModal').style.display = 'block';
  document.getElementById('userDetailsTitle').innerHTML = `Financial Details - ${name} (${email})`;
  
  // Clear input fields
  document.getElementById('topupBalanceAmount').value = '';
  document.getElementById('topupProfitAmount').value = '';
  document.getElementById('cryptoAmount').value = '';
  document.getElementById('topupBrokerAmount').value = '';
}

function displayUserDetails(user) {
  const content = document.getElementById('userDetailsContent');
  
  // Calculate total crypto value
  const cryptoPrices = {
    BTC: 30000,
    ETH: 2000,
    USDT: 1,
    BNB: 320,
    XRP: 0.45,
    DOGE: 0.07
  };
  
  let totalCryptoValue = 0;
  const cryptoHoldings = user.cryptoHoldings || {};
  
  for (let crypto in cryptoHoldings) {
    totalCryptoValue += (cryptoHoldings[crypto] || 0) * (cryptoPrices[crypto] || 0);
  }
  
  const cryptoHoldingsHTML = Object.entries(cryptoHoldings || {})
    .map(([crypto, amount]) => `<div><strong>${crypto}:</strong> ${parseFloat(amount).toFixed(6)}</div>`)
    .join('') || '<div>No holdings</div>';
  
  content.innerHTML = `
    <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #5e3fc9;">
      <h4>Available Balance</h4>
      <p style="font-size: 24px; font-weight: bold; color: #5e3fc9; margin: 10px 0;">$${user.balance.toFixed(2)}</p>
    </div>
    
    <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #00b894;">
      <h4>Investment Profit</h4>
      <p style="font-size: 24px; font-weight: bold; color: #00b894; margin: 10px 0;">$${user.investmentProfit.toFixed(2)}</p>
    </div>
    
    <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #ff6b6b;">
      <h4>Broker Balance</h4>
      <p style="font-size: 24px; font-weight: bold; color: #ff6b6b; margin: 10px 0;">$${user.brokerBalance.toFixed(2)}</p>
    </div>
    
    <div style="padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #ffa502;">
      <h4>Crypto Holdings</h4>
      <div style="font-size: 14px; margin-top: 10px;">
        ${cryptoHoldingsHTML}
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
          <strong>Total Value: $${totalCryptoValue.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  `;
}

function closeUserDetails() {
  document.getElementById('userDetailsModal').style.display = 'none';
  selectedUserId = null;
}

function clearUserSearch() {
  document.getElementById('userSearchInput').value = '';
  document.getElementById('userSearchResults').style.display = 'none';
  document.getElementById('userDetailsModal').style.display = 'none';
  selectedUserId = null;
}

function topupUserBalance() {
  if (!selectedUserId) {
    alert('Please select a user first');
    return;
  }
  
  const amount = parseFloat(document.getElementById('topupBalanceAmount').value);
  
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === selectedUserId);
  
  if (userIndex === -1) {
    alert('User not found');
    return;
  }
  
  const user = users[userIndex];
  const oldBalance = user.balance;
  user.balance = (user.balance || 0) + amount;
  
  // Update localStorage
  saveUserFinancialData(user);
  
  alert(`Successfully added $${amount.toFixed(2)} to ${user.name}'s balance.\nOld Balance: $${oldBalance.toFixed(2)}\nNew Balance: $${user.balance.toFixed(2)}`);
  
  // Refresh display
  displayUserDetails(user);
  document.getElementById('topupBalanceAmount').value = '';
}

function topupUserProfit() {
  if (!selectedUserId) {
    alert('Please select a user first');
    return;
  }
  
  const amount = parseFloat(document.getElementById('topupProfitAmount').value);
  
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === selectedUserId);
  
  if (userIndex === -1) {
    alert('User not found');
    return;
  }
  
  const user = users[userIndex];
  const oldProfit = user.investmentProfit || 0;
  user.investmentProfit = oldProfit + amount;
  
  // Update localStorage
  saveUserFinancialData(user);
  
  alert(`Successfully added $${amount.toFixed(2)} to ${user.name}'s investment profit.\nOld Profit: $${oldProfit.toFixed(2)}\nNew Profit: $${user.investmentProfit.toFixed(2)}`);
  
  // Refresh display
  displayUserDetails(user);
  document.getElementById('topupProfitAmount').value = '';
}

function addUserCrypto() {
  if (!selectedUserId) {
    alert('Please select a user first');
    return;
  }
  
  const crypto = document.getElementById('cryptoType').value;
  const amount = parseFloat(document.getElementById('cryptoAmount').value);
  
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === selectedUserId);
  
  if (userIndex === -1) {
    alert('User not found');
    return;
  }
  
  const user = users[userIndex];
  if (!user.cryptoHoldings) {
    user.cryptoHoldings = {};
  }
  
  const oldAmount = user.cryptoHoldings[crypto] || 0;
  user.cryptoHoldings[crypto] = oldAmount + amount;
  
  // Update localStorage
  saveUserFinancialData(user);
  
  alert(`Successfully added ${amount.toFixed(6)} ${crypto} to ${user.name}'s holdings.\nOld Amount: ${oldAmount.toFixed(6)}\nNew Amount: ${user.cryptoHoldings[crypto].toFixed(6)}`);
  
  // Refresh display
  displayUserDetails(user);
  document.getElementById('cryptoAmount').value = '';
}

function topupBrokerBalance() {
  if (!selectedUserId) {
    alert('Please select a user first');
    return;
  }
  
  const amount = parseFloat(document.getElementById('topupBrokerAmount').value);
  
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === selectedUserId);
  
  if (userIndex === -1) {
    alert('User not found');
    return;
  }
  
  const user = users[userIndex];
  const oldBrokerBalance = user.brokerBalance || 0;
  user.brokerBalance = oldBrokerBalance + amount;
  
  // Update localStorage
  saveUserFinancialData(user);
  
  alert(`Successfully added $${amount.toFixed(2)} to ${user.name}'s broker balance.\nOld Balance: $${oldBrokerBalance.toFixed(2)}\nNew Balance: $${user.brokerBalance.toFixed(2)}`);
  
  // Refresh display
  displayUserDetails(user);
  document.getElementById('topupBrokerAmount').value = '';
}

function saveUserFinancialData(user) {
  const storageKey = user && user.storageKey ? user.storageKey : null;
  if (typeof persistUserFinancialData === 'function') {
    return persistUserFinancialData(user, storageKey, { syncDashboard: true });
  }

  // Fallback: save back to localStorage using the original storage key
  if (storageKey) {
    const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const merged = {
      ...current,
      name: user.name,
      email: user.email,
      balance: user.balance,
      brokerBalance: user.brokerBalance,
      investmentProfit: user.investmentProfit,
      cryptoHoldings: user.cryptoHoldings || {},
      activeInvestments: user.activeInvestments || current.activeInvestments || [],
      transactions: user.transactions || current.transactions || [],
      swaps: user.swaps || current.swaps || [],
      managedAccounts: user.managedAccounts || current.managedAccounts || [],
      referrals: user.referrals || current.referrals || [],
      userData: user.userData || current.userData || {},
      disabled: user.disabled || current.disabled || false,
      disabledDate: user.disabledDate || current.disabledDate || null,
      disabledReason: user.disabledReason || current.disabledReason || null
    };
    localStorage.setItem(storageKey, JSON.stringify(merged));
  } else {
    const key = `userState_${user.id}`;
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    const merged = {
      ...current,
      name: user.name,
      email: user.email,
      balance: user.balance,
      brokerBalance: user.brokerBalance,
      investmentProfit: user.investmentProfit,
      cryptoHoldings: user.cryptoHoldings || {},
      activeInvestments: user.activeInvestments || current.activeInvestments || [],
      transactions: user.transactions || current.transactions || [],
      swaps: user.swaps || current.swaps || [],
      managedAccounts: user.managedAccounts || current.managedAccounts || [],
      referrals: user.referrals || current.referrals || [],
      userData: user.userData || current.userData || {},
      disabled: user.disabled || current.disabled || false,
      disabledDate: user.disabledDate || current.disabledDate || null,
      disabledReason: user.disabledReason || current.disabledReason || null
    };
    localStorage.setItem(key, JSON.stringify(merged));
  }
  return user;
}

function loadSelectedUserState(userId) {
  const key = `userState_${userId}`;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    if (!stored || !stored.email) return null;
    return {
      id: userId,
      name: stored.name || 'Unknown User',
      email: stored.email,
      balance: stored.balance || 0,
      brokerBalance: stored.brokerBalance || 0,
      investmentProfit: stored.investmentProfit || 0,
      cryptoHoldings: stored.cryptoHoldings || {},
      activeInvestments: stored.activeInvestments || [],
      transactions: stored.transactions || [],
      swaps: stored.swaps || [],
      managedAccounts: stored.managedAccounts || [],
      referrals: stored.referrals || [],
      userData: stored.userData || {},
      status: stored.status || 'active',
      disabled: stored.disabled || false,
      disabledDate: stored.disabledDate || null,
      disabledReason: stored.disabledReason || null,
      storageKey: key
    };
  } catch (e) {
    console.log('Could not load selected user state:', e);
    return null;
  }
}

// Prompt-based investments manager for admin (simple CLI-like flow)
function manageUserInvestments() {
  if (!selectedUserId) {
    alert('Please select a user first');
    return;
  }

  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === selectedUserId);
  if (userIndex === -1) {
    alert('User not found');
    return;
  }

  const storageKey = users[userIndex].storageKey || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}');
  userData.activeInvestments = userData.activeInvestments || [];

  while (true) {
    const list = userData.activeInvestments.map((inv, idx) => `${idx}: ${inv.planName || inv.planId || 'plan'} - $${(inv.amount||0).toFixed(2)} - ${inv.status||'active'}`).join('\n') || '(no investments)';
    const action = prompt(`Manage investments for ${users[userIndex].name} (${users[userIndex].email})\n\nCurrent:\n${list}\n\nType: add, edit:<index>, remove:<index>, clear, or done`);
    if (!action) return;
    if (action === 'done') break;

    if (action === 'add') {
      const planId = prompt('Enter plan id or name (e.g., Starter)');
      if (!planId) continue;
      const amountRaw = prompt('Enter amount in USD');
      const amount = parseFloat(amountRaw || '0');
      const newInv = { planId: planId, planName: planId, amount: amount, startDate: new Date().toISOString(), status: 'active' };
      userData.activeInvestments.push(newInv);
      alert('Investment added');
    } else if (action.startsWith('remove:')) {
      const idx = parseInt(action.split(':')[1], 10);
      if (isNaN(idx) || idx < 0 || idx >= userData.activeInvestments.length) { alert('Invalid index'); continue; }
      if (confirm(`Remove investment ${idx}?`)) {
        userData.activeInvestments.splice(idx,1);
        alert('Removed');
      }
    } else if (action.startsWith('edit:')) {
      const idx = parseInt(action.split(':')[1], 10);
      if (isNaN(idx) || idx < 0 || idx >= userData.activeInvestments.length) { alert('Invalid index'); continue; }
      const inv = userData.activeInvestments[idx];
      const newAmount = parseFloat(prompt('Enter new amount', inv.amount || 0) || inv.amount || 0);
      inv.amount = newAmount;
      const newStatus = prompt('Enter status', inv.status || 'active') || inv.status;
      inv.status = newStatus;
      alert('Updated');
    } else if (action === 'clear') {
      if (confirm('Clear all investments?')) { userData.activeInvestments = []; alert('Cleared'); }
    } else {
      alert('Unknown action');
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(userData));
  window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
  // Refresh modal view
  const refreshed = loadSelectedUserState(selectedUserId) || users[userIndex];
  displayUserDetails(refreshed);
}

function manageUserReferrals() {
  if (!selectedUserId) { alert('Please select a user first'); return; }
  const users = getAllUsers();
  const userIndex = users.findIndex(u => u.id === selectedUserId);
  if (userIndex === -1) { alert('User not found'); return; }
  const storageKey = users[userIndex].storageKey || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}');
  userData.referrals = userData.referrals || [];
  while (true) {
    const list = userData.referrals.map((r, i) => `${i}: ${r.email||r.code||'ref'} - bonus: ${r.bonus||0}`).join('\n') || '(no referrals)';
    const action = prompt(`Manage referrals for ${users[userIndex].name}\n\nCurrent:\n${list}\n\nType: add, remove:<index>, clear, or done`);
    if (!action) return;
    if (action === 'done') break;
    if (action === 'add') {
      const email = prompt('Referral email or code'); if (!email) continue;
      const bonus = parseFloat(prompt('Bonus amount', '0')||'0');
      userData.referrals.push({ email, bonus }); alert('Referral added');
    } else if (action.startsWith('remove:')) {
      const idx = parseInt(action.split(':')[1],10); if (isNaN(idx)||idx<0||idx>=userData.referrals.length){alert('Invalid index');continue;} userData.referrals.splice(idx,1); alert('Removed');
    } else if (action === 'clear') { if (confirm('Clear all referrals?')) { userData.referrals = []; alert('Cleared'); } }
    else alert('Unknown action');
  }
  localStorage.setItem(storageKey, JSON.stringify(userData));
  window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
  const refreshed = loadSelectedUserState(selectedUserId) || users[userIndex]; displayUserDetails(refreshed);
}

function manageUserSwaps() {
  if (!selectedUserId) { alert('Please select a user first'); return; }
  const users = getAllUsers(); const userIndex = users.findIndex(u => u.id === selectedUserId);
  if (userIndex === -1) { alert('User not found'); return; }
  const storageKey = users[userIndex].storageKey || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.swaps = userData.swaps || [];
  while (true) {
    const list = userData.swaps.map((s,i)=>`${i}: ${s.from || 'USD'} -> ${s.to || 'BTC'} : $${(s.amount||0).toFixed(2)} - ${s.status||'done'}`).join('\n') || '(no swaps)';
    const action = prompt(`Manage swaps for ${users[userIndex].name}\n\nCurrent:\n${list}\n\nType: add, remove:<index>, clear, or done`);
    if (!action) return; if (action === 'done') break;
    if (action === 'add') {
      const from = prompt('From (USD or symbol)')||'USD'; const to = prompt('To (symbol)')||'BTC'; const amount = parseFloat(prompt('Amount','0')||'0'); userData.swaps.push({ from, to, amount, date: new Date().toISOString(), status: 'done' }); alert('Swap added');
    } else if (action.startsWith('remove:')) { const idx = parseInt(action.split(':')[1],10); if (isNaN(idx)||idx<0||idx>=userData.swaps.length){alert('Invalid index');continue;} userData.swaps.splice(idx,1); alert('Removed'); }
    else if (action === 'clear') { if (confirm('Clear all swaps?')) { userData.swaps = []; alert('Cleared'); } } else alert('Unknown action');
  }
  localStorage.setItem(storageKey, JSON.stringify(userData)); window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
  const refreshed = loadSelectedUserState(selectedUserId) || users[userIndex]; displayUserDetails(refreshed);
}

function manageUserTransactions() {
  if (!selectedUserId) { alert('Please select a user first'); return; }
  const users = getAllUsers(); const userIndex = users.findIndex(u => u.id === selectedUserId);
  if (userIndex === -1) { alert('User not found'); return; }
  const storageKey = users[userIndex].storageKey || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.transactions = userData.transactions || [];
  while (true) {
    const list = userData.transactions.map((t,i)=>`${i}: ${t.type||'tx'} $${(t.amount||0).toFixed(2)} - ${t.status||'ok'}`).join('\n') || '(no transactions)';
    const action = prompt(`Manage transactions for ${users[userIndex].name}\n\nCurrent:\n${list}\n\nType: add, remove:<index>, clear, or done`);
    if (!action) return; if (action === 'done') break;
    if (action === 'add') {
      const type = prompt('Type (deposit/withdraw)')||'deposit'; const amount = parseFloat(prompt('Amount','0')||'0'); const status = prompt('Status','completed')||'completed'; userData.transactions.push({ type, amount, status, id: 'tx_'+Date.now(), date: new Date().toISOString() }); alert('Transaction added');
    } else if (action.startsWith('remove:')) { const idx = parseInt(action.split(':')[1],10); if (isNaN(idx)||idx<0||idx>=userData.transactions.length){alert('Invalid index');continue;} userData.transactions.splice(idx,1); alert('Removed'); }
    else if (action === 'clear') { if (confirm('Clear all transactions?')) { userData.transactions = []; alert('Cleared'); } } else alert('Unknown action');
  }
  localStorage.setItem(storageKey, JSON.stringify(userData)); window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
  const refreshed = loadSelectedUserState(selectedUserId) || users[userIndex]; displayUserDetails(refreshed);
}

// --- Inline editor UI handlers ---
function closeAdminEditors() {
  const modal = document.getElementById('adminEditorModal'); if (modal) modal.style.display = 'none';
  ['investmentsEditor','referralsEditor','swapsEditor','transactionsEditor'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}

function showAdminEditorTab(tabName) {
  const tabs = {
    investments: document.getElementById('investmentsEditor'),
    referrals: document.getElementById('referralsEditor'),
    swaps: document.getElementById('swapsEditor'),
    transactions: document.getElementById('transactionsEditor')
  };
  Object.entries(tabs).forEach(([key, el]) => {
    if (el) el.style.display = key === tabName ? 'block' : 'none';
  });
  const modal = document.getElementById('adminEditorModal');
  if (modal) modal.style.display = 'flex';
  if (tabName === 'investments') showInvestmentsEditor();
  if (tabName === 'referrals') showReferralsEditor();
  if (tabName === 'swaps') showSwapsEditor();
  if (tabName === 'transactions') showTransactionsEditor();
}

function showInvestmentsEditor() {
  if (!selectedUserId) { alert('Select a user first'); return; }
  const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId);
  const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.activeInvestments = userData.activeInvestments||[];
  const listEl = document.getElementById('investmentsList'); listEl.innerHTML = userData.activeInvestments.map((inv,i)=>`<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #f0f0f0;">${i}: <strong>${inv.planName||inv.planId||'plan'}</strong> - $${(inv.amount||0).toFixed(2)} - ${inv.status||'active'} <span><button class="btn-secondary" onclick="removeInvestment(${i})">Remove</button></span></div>`).join('') || '<div class="no-data">(no investments)</div>';
  const modal = document.getElementById('adminEditorModal'); if (modal) modal.style.display = 'flex';
  document.getElementById('investmentsEditor').style.display = 'block';
}

function addInvestmentFromEditor() {
  const plan = document.getElementById('newInvestmentPlan').value; const amount = parseFloat(document.getElementById('newInvestmentAmount').value||'0'); const status = document.getElementById('newInvestmentStatus').value||'active';
  if (!selectedUserId) { alert('Select a user first'); return; }
  const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.activeInvestments = userData.activeInvestments||[];
  userData.activeInvestments.push({ planId: plan, planName: plan, amount, startDate: new Date().toISOString(), status });
  localStorage.setItem(storageKey, JSON.stringify(userData));
  if (typeof persistUserFinancialData === 'function') {
    persistUserFinancialData({ ...userData, id: selectedUserId, storageKey }, storageKey, { syncDashboard: true });
  }
  showInvestmentsEditor();
}

function removeInvestment(index) {
  if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.activeInvestments = userData.activeInvestments||[];
  if (index<0 || index>=userData.activeInvestments.length) return; userData.activeInvestments.splice(index,1); localStorage.setItem(storageKey, JSON.stringify(userData)); showInvestmentsEditor();
}

function saveInvestmentsEditor() {
  if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`;
  // data already saved on add/remove; just refresh UI and modal
  window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
  const refreshed = loadSelectedUserState(selectedUserId) || users[idx]; displayUserDetails(refreshed); closeAdminEditors();
}

// Referrals editor
function showReferralsEditor() {
  if (!selectedUserId) { alert('Select a user first'); return; }
  const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`;
  const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.referrals = userData.referrals||[];
  const listEl = document.getElementById('referralsList'); listEl.innerHTML = userData.referrals.map((r,i)=>`<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0;">${i}: ${r.email||r.code||'ref'} - bonus: ${r.bonus||0} <button class="btn-secondary" onclick="removeReferral(${i})">Remove</button></div>`).join('') || '<div class="no-data">(no referrals)</div>';
  const modal = document.getElementById('adminEditorModal'); if (modal) modal.style.display = 'flex'; document.getElementById('referralsEditor').style.display = 'block';
}

function addReferralFromEditor() {
  const email = document.getElementById('newReferralEmail').value; const bonus = parseFloat(document.getElementById('newReferralBonus').value||'0'); if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey)||'{}'); userData.referrals = userData.referrals||[]; userData.referrals.push({ email, bonus }); localStorage.setItem(storageKey, JSON.stringify(userData)); if (typeof persistUserFinancialData === 'function') { persistUserFinancialData({ ...userData, id: selectedUserId, storageKey }, storageKey, { syncDashboard: true }); } showReferralsEditor(); }

function removeReferral(index) { if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey)||'{}'); userData.referrals = userData.referrals||[]; if (index<0||index>=userData.referrals.length) return; userData.referrals.splice(index,1); localStorage.setItem(storageKey, JSON.stringify(userData)); showReferralsEditor(); }

function saveReferralsEditor() { if (!selectedUserId) return; window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated')); const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const refreshed = loadSelectedUserState(selectedUserId) || users[idx]; displayUserDetails(refreshed); closeAdminEditors(); }

// Swaps editor
function showSwapsEditor() { if (!selectedUserId) { alert('Select a user first'); return; } const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.swaps = userData.swaps||[]; const listEl = document.getElementById('swapsList'); listEl.innerHTML = userData.swaps.map((s,i)=>`<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0;">${i}: ${s.from||'USD'} -> ${s.to||'BTC'} : $${(s.amount||0).toFixed(2)} <button class="btn-secondary" onclick="removeSwap(${i})">Remove</button></div>`).join('') || '<div class="no-data">(no swaps)</div>'; document.getElementById('adminEditorsContainer').style.display = 'block'; document.getElementById('swapsEditor').style.display = 'block'; }

function addSwapFromEditor() { const from = document.getElementById('newSwapFrom').value||'USD'; const to = document.getElementById('newSwapTo').value||'BTC'; const amount = parseFloat(document.getElementById('newSwapAmount').value||'0'); if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey)||'{}'); userData.swaps = userData.swaps||[]; userData.swaps.push({ from, to, amount, date: new Date().toISOString(), status: 'done' }); localStorage.setItem(storageKey, JSON.stringify(userData)); if (typeof persistUserFinancialData === 'function') { persistUserFinancialData({ ...userData, id: selectedUserId, storageKey }, storageKey, { syncDashboard: true }); } showSwapsEditor(); }

function removeSwap(index) { if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey)||'{}'); userData.swaps = userData.swaps||[]; if (index<0||index>=userData.swaps.length) return; userData.swaps.splice(index,1); localStorage.setItem(storageKey, JSON.stringify(userData)); showSwapsEditor(); }

function saveSwapsEditor() { if (!selectedUserId) return; window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated')); const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const refreshed = loadSelectedUserState(selectedUserId) || users[idx]; displayUserDetails(refreshed); closeAdminEditors(); }

// Transactions editor
function showTransactionsEditor() { if (!selectedUserId) { alert('Select a user first'); return; } const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey) || '{}'); userData.transactions = userData.transactions||[]; const listEl = document.getElementById('transactionsList'); listEl.innerHTML = userData.transactions.map((t,i)=>`<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0;">${i}: ${t.type||'tx'} $${(t.amount||0).toFixed(2)} - ${t.status||'ok'} <button class="btn-secondary" onclick="removeTransaction(${i})">Remove</button></div>`).join('') || '<div class="no-data">(no transactions)</div>'; document.getElementById('adminEditorsContainer').style.display = 'block'; document.getElementById('transactionsEditor').style.display = 'block'; }

function addTransactionFromEditor() { const type = document.getElementById('newTxType').value||'deposit'; const amount = parseFloat(document.getElementById('newTxAmount').value||'0'); const status = document.getElementById('newTxStatus').value||'completed'; if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey)||'{}'); userData.transactions = userData.transactions||[]; userData.transactions.push({ type, amount, status, id: 'tx_'+Date.now(), date: new Date().toISOString() }); localStorage.setItem(storageKey, JSON.stringify(userData)); if (typeof persistUserFinancialData === 'function') { persistUserFinancialData({ ...userData, id: selectedUserId, storageKey }, storageKey, { syncDashboard: true }); } showTransactionsEditor(); }

function removeTransaction(index) { if (!selectedUserId) return; const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const storageKey = (users[idx] && users[idx].storageKey) || `userState_${selectedUserId}`; const userData = JSON.parse(localStorage.getItem(storageKey)||'{}'); userData.transactions = userData.transactions||[]; if (index<0||index>=userData.transactions.length) return; userData.transactions.splice(index,1); localStorage.setItem(storageKey, JSON.stringify(userData)); showTransactionsEditor(); }

function saveTransactionsEditor() { if (!selectedUserId) return; window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated')); const users = getAllUsers(); const idx = users.findIndex(u=>u.id===selectedUserId); const refreshed = loadSelectedUserState(selectedUserId) || users[idx]; displayUserDetails(refreshed); closeAdminEditors(); }

// ===== EXPERT TRADER MANAGEMENT FUNCTIONS =====

let currentEditingExpertId = null;

function loadExpertsTable() {
  const experts = getAdminExpertTraders();
  const tbody = document.getElementById('expertsTableBody');
  
  if (!tbody) return;
  
  if (experts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No experts added yet</td></tr>';
    return;
  }
  
  tbody.innerHTML = experts.map(expert => `
    <tr>
      <td><strong>${expert.name}</strong></td>
      <td>${expert.title}</td>
      <td>${expert.experience}</td>
      <td>
        <span style="display: inline-block; background: ${expert.successRate >= 85 ? '#00b894' : expert.successRate >= 75 ? '#ffa502' : '#ff6b6b'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
          ${expert.successRate}%
        </span>
      </td>
      <td>
        <strong style="color: #5e3fc9;">${expert.avgROI}%</strong>
      </td>
      <td>${expert.totalFollowers.toLocaleString()}</td>
      <td>$${expert.minInvestment}</td>
      <td>${expert.verified ? '<span style="color: #00b894; font-weight: bold;">✓ Yes</span>' : '<span style="color: #999;">No</span>'}</td>
      <td>
        <button onclick="editExpert('${expert.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Edit</button>
        <button onclick="deleteExpert('${expert.id}')" class="btn-secondary" style="padding: 5px 10px; font-size: 12px;">Delete</button>
      </td>
    </tr>
  `).join('');
}

function getAdminExpertTraders() {
  try {
    const experts = localStorage.getItem('expertTraders');
    return experts ? JSON.parse(experts) : getDefaultExperts();
  } catch (e) {
    console.log('Error loading experts:', e);
    return getDefaultExperts();
  }
}

function getDefaultExperts() {
  return [
    {
      id: 'expert-001',
      name: 'Alex Sterling',
      title: 'Bitcoin Trading Specialist',
      experience: '8 years',
      successRate: 87,
      totalFollowers: 2450,
      avgROI: 24.5,
      minInvestment: 100,
      specialty: 'BTC/USD',
      bio: 'Specialized in Bitcoin technical analysis and trend following.',
      verified: true
    },
    {
      id: 'expert-002',
      name: 'Sarah Chen',
      title: 'Altcoin Expert',
      experience: '6 years',
      successRate: 82,
      totalFollowers: 1820,
      avgROI: 31.2,
      minInvestment: 50,
      specialty: 'ETH/ALT',
      bio: 'Expert in altcoin selection and DeFi opportunities.',
      verified: true
    },
    {
      id: 'expert-003',
      name: 'Marcus Johnson',
      title: 'Risk Management Guru',
      experience: '10 years',
      successRate: 91,
      totalFollowers: 3200,
      avgROI: 18.7,
      minInvestment: 200,
      specialty: 'Portfolio Diversification',
      bio: 'Focus on capital preservation and consistent returns.',
      verified: true
    },
    {
      id: 'expert-004',
      name: 'Elena Rodriguez',
      title: 'Day Trading Master',
      experience: '5 years',
      successRate: 79,
      totalFollowers: 1340,
      avgROI: 35.8,
      minInvestment: 100,
      specialty: 'Intraday Trading',
      bio: 'High-frequency trading and scalping techniques.',
      verified: true
    }
  ];
}

function openAddExpertModal() {
  currentEditingExpertId = null;
  document.getElementById('expertModalTitle').textContent = 'Add New Expert Trader';
  document.getElementById('expertForm').reset();
  document.getElementById('expertVerified').checked = true;
  document.getElementById('expertModal').style.display = 'flex';
}

function editExpert(expertId) {
  const experts = getAdminExpertTraders();
  const expert = experts.find(e => e.id === expertId);
  
  if (!expert) {
    alert('Expert not found');
    return;
  }
  
  currentEditingExpertId = expertId;
  document.getElementById('expertModalTitle').textContent = 'Edit Expert Trader';
  document.getElementById('expertName').value = expert.name;
  document.getElementById('expertTitle').value = expert.title;
  document.getElementById('expertBio').value = expert.bio;
  document.getElementById('expertExperience').value = expert.experience;
  document.getElementById('expertSpecialty').value = expert.specialty;
  document.getElementById('expertSuccessRate').value = expert.successRate;
  document.getElementById('expertAvgROI').value = expert.avgROI;
  document.getElementById('expertFollowers').value = expert.totalFollowers;
  document.getElementById('expertMinInvestment').value = expert.minInvestment;
  document.getElementById('expertVerified').checked = expert.verified;
  document.getElementById('expertModal').style.display = 'flex';
}

function closeExpertModal() {
  document.getElementById('expertModal').style.display = 'none';
  currentEditingExpertId = null;
}

function saveExpert(event) {
  event.preventDefault();
  
  const name = document.getElementById('expertName').value.trim();
  const title = document.getElementById('expertTitle').value.trim();
  const bio = document.getElementById('expertBio').value.trim();
  const experience = document.getElementById('expertExperience').value.trim();
  const specialty = document.getElementById('expertSpecialty').value.trim();
  const successRate = parseFloat(document.getElementById('expertSuccessRate').value);
  const avgROI = parseFloat(document.getElementById('expertAvgROI').value);
  const followers = parseInt(document.getElementById('expertFollowers').value);
  const minInvestment = parseFloat(document.getElementById('expertMinInvestment').value);
  const verified = document.getElementById('expertVerified').checked;
  
  if (!name || !title || !bio || !experience || !specialty) {
    alert('Please fill in all required fields');
    return;
  }
  
  if (isNaN(successRate) || isNaN(avgROI) || isNaN(followers) || isNaN(minInvestment)) {
    alert('Please enter valid numbers for rates and amounts');
    return;
  }
  
  if (successRate < 0 || successRate > 100) {
    alert('Success rate must be between 0 and 100');
    return;
  }
  
  let experts = getAdminExpertTraders();
  
  if (currentEditingExpertId) {
    // Update existing expert
    const expertIndex = experts.findIndex(e => e.id === currentEditingExpertId);
    if (expertIndex !== -1) {
      experts[expertIndex] = {
        id: currentEditingExpertId,
        name,
        title,
        bio,
        experience,
        specialty,
        successRate,
        avgROI,
        totalFollowers: followers,
        minInvestment,
        verified
      };
    }
    alert('Expert trader updated successfully');
  } else {
    // Add new expert
    const newExpert = {
      id: `expert-${Date.now()}`,
      name,
      title,
      bio,
      experience,
      specialty,
      successRate,
      avgROI,
      totalFollowers: followers,
      minInvestment,
      verified
    };
    experts.push(newExpert);
    alert('Expert trader added successfully');
  }
  
  localStorage.setItem('expertTraders', JSON.stringify(experts));
  closeExpertModal();
  loadExpertsTable();
}

function deleteExpert(expertId) {
  if (!confirm('Are you sure you want to delete this expert trader?')) {
    return;
  }
  
  let experts = getAdminExpertTraders();
  experts = experts.filter(e => e.id !== expertId);
  localStorage.setItem('expertTraders', JSON.stringify(experts));
  alert('Expert trader deleted successfully');
  loadExpertsTable();
}

// ===== CUSTOMER MANAGEMENT FUNCTIONS =====

function seedDefaultAdminUsers() {
  if ([...Object.keys(localStorage)].some(key => key.startsWith('userState_') || key === 'userState')) {
    return;
  }

  const sampleUsers = [
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      balance: 8200,
      brokerBalance: 3300,
      investmentProfit: 560,
      status: 'active',
      disabled: false,
      createdDate: '2025-01-15T09:30:00.000Z',
      cryptoHoldings: { BTC: 0.08, ETH: 1.4, USDT: 680, BNB: 0.9, XRP: 250, DOGE: 1200 },
      storageKey: 'userState_1'
    },
    {
      id: '2',
      name: 'Mark Rivera',
      email: 'mark@example.com',
      balance: 4500,
      brokerBalance: 1200,
      investmentProfit: 320,
      status: 'active',
      disabled: false,
      createdDate: '2025-02-02T14:55:00.000Z',
      cryptoHoldings: { BTC: 0.02, ETH: 0.7, USDT: 300, BNB: 0.5, XRP: 70, DOGE: 600 },
      storageKey: 'userState_2'
    },
    {
      id: '3',
      name: 'Sophia Kim',
      email: 'sophia@example.com',
      balance: 1200,
      brokerBalance: 600,
      investmentProfit: 95,
      status: 'disabled',
      disabled: true,
      disabledDate: '2025-04-10T08:20:00.000Z',
      disabledReason: 'Verification failed',
      createdDate: '2025-03-10T11:05:00.000Z',
      cryptoHoldings: { BTC: 0.01, ETH: 0.2, USDT: 125, BNB: 0.2, XRP: 15, DOGE: 80 },
      storageKey: 'userState_3'
    }
  ];

  sampleUsers.forEach(user => {
    const payload = { ...user };
    delete payload.storageKey;
    localStorage.setItem(user.storageKey, JSON.stringify(payload));
  });
}

function getAllAdminUsers() {
  let allUsers = [];
  
  // Seed sample users if none exist yet
  seedDefaultAdminUsers();

  // Scan localStorage for user data
  for (let key in localStorage) {
    if (key.startsWith('userState_') || key === 'userState') {
      try {
        const userData = JSON.parse(localStorage.getItem(key));
        if (userData && userData.email) {
          const userId = key.replace('userState_', '') || 'default';
          allUsers.push({
            id: userId,
            name: userData.name || 'Unknown User',
            email: userData.email || 'No email',
            balance: userData.balance || 0,
            brokerBalance: userData.brokerBalance || 0,
            investmentProfit: userData.investmentProfit || 0,
            status: userData.status || 'active',
            disabled: userData.disabled || false,
            disabledDate: userData.disabledDate || null,
            disabledReason: userData.disabledReason || null,
            createdDate: userData.createdDate || new Date().toISOString(),
            cryptoHoldings: userData.cryptoHoldings || {},
            storageKey: key
          });
        }
      } catch (e) {
        console.log('Could not parse user:', key);
      }
    }
  }
  
  return allUsers;
}

function loadAllCustomersTable() {
  const allUsers = getAllAdminUsers();
  const tbody = document.getElementById('allCustomersTableBody');
  
  if (!tbody) return;
  
  document.getElementById('totalUsersCount').textContent = allUsers.length;
  
  if (allUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No users found</td></tr>';
    return;
  }
  
  tbody.innerHTML = allUsers.map(user => `
    <tr>
      <td><strong>${user.id}</strong></td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>$${user.balance.toFixed(2)}</td>
      <td>
        <span class="status-badge ${user.disabled ? 'disabled' : 'active'}">
          ${user.disabled ? 'Disabled' : 'Active'}
        </span>
      </td>
      <td>${new Date(user.createdDate).toLocaleDateString()}</td>
      <td>
        <button onclick="viewUserDetails('${user.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">View</button>
        <button onclick="toggleUserStatus('${user.id}', ${user.disabled})" class="btn-secondary" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">${user.disabled ? 'Enable' : 'Disable'}</button>
        <button onclick="deleteAdminUser('${user.id}')" class="btn-danger" style="padding: 5px 10px; font-size: 12px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
      </td>
    </tr>
  `).join('');
}

function loadActiveCustomersTable() {
  const allUsers = getAllAdminUsers();
  const activeUsers = allUsers.filter(u => !u.disabled);
  const tbody = document.getElementById('activeCustomersTableBody');
  
  if (!tbody) return;
  
  document.getElementById('activeUsersCount').textContent = activeUsers.length;
  
  if (activeUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No active users</td></tr>';
    return;
  }
  
  tbody.innerHTML = activeUsers.map(user => `
    <tr>
      <td><strong>${user.id}</strong></td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>$${user.balance.toFixed(2)}</td>
      <td><span class="status-badge active">Active</span></td>
      <td>
        <button onclick="toggleUserStatus('${user.id}', false)" class="btn-secondary" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Disable</button>
        <button onclick="deleteAdminUser('${user.id}')" class="btn-danger" style="padding: 5px 10px; font-size: 12px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
      </td>
    </tr>
  `).join('');
}

function loadDisabledCustomersTable() {
  const allUsers = getAllAdminUsers();
  const disabledUsers = allUsers.filter(u => u.disabled);
  const tbody = document.getElementById('disabledCustomersTableBody');
  
  if (!tbody) return;
  
  document.getElementById('disabledUsersCount').textContent = disabledUsers.length;
  
  if (disabledUsers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No disabled customers</td></tr>';
    return;
  }
  
  tbody.innerHTML = disabledUsers.map(user => `
    <tr>
      <td><strong>${user.id}</strong></td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>$${user.balance.toFixed(2)}</td>
      <td>${new Date(user.disabledDate).toLocaleDateString()}</td>
      <td>
        <button onclick="toggleUserStatus('${user.id}', true)" class="btn-primary" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">Enable</button>
        <button onclick="deleteAdminUser('${user.id}')" class="btn-danger" style="padding: 5px 10px; font-size: 12px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
      </td>
    </tr>
  `).join('');
}

function toggleUserStatus(userId, isCurrentlyDisabled) {
  const allUsers = getAllAdminUsers();
  const user = allUsers.find(u => u.id === userId);
  
  if (!user) {
    alert('User not found');
    return;
  }
  
  if (isCurrentlyDisabled) {
    // Enable user
    if (confirm(`Enable ${user.name}?`)) {
      user.disabled = false;
      user.disabledDate = null;
      user.disabledReason = null;
      saveAdminUserData(user);
      alert(`${user.name} has been enabled`);
      loadAllCustomersTable();
      loadActiveCustomersTable();
      loadDisabledCustomersTable();
    }
  } else {
    // Disable user
    const reason = prompt(`Disable ${user.name}? Please enter reason (optional):`, 'Policy violation');
    if (reason !== null) {
      user.disabled = true;
      user.disabledDate = new Date().toISOString();
      user.disabledReason = reason;
      saveAdminUserData(user);
      alert(`${user.name} has been disabled`);
      loadAllCustomersTable();
      loadActiveCustomersTable();
      loadDisabledCustomersTable();
    }
  }
}

function deleteAdminUser(userId) {
  const allUsers = getAllAdminUsers();
  const user = allUsers.find(u => u.id === userId);
  
  if (!user) {
    alert('User not found');
    return;
  }
  
  if (confirm(`Are you sure you want to DELETE ${user.name}? This cannot be undone.`)) {
    if (confirm('FINAL WARNING: This will permanently delete all user data. Continue?')) {
      // Delete user data from localStorage
      localStorage.removeItem(user.storageKey);
      alert(`${user.name} has been permanently deleted`);
      loadAllCustomersTable();
      loadActiveCustomersTable();
      loadDisabledCustomersTable();
    }
  }
}

function saveAdminUserData(user) {
  if (user.storageKey) {
    const userData = JSON.parse(localStorage.getItem(user.storageKey) || '{}');
    userData.disabled = user.disabled;
    userData.disabledDate = user.disabledDate;
    userData.disabledReason = user.disabledReason;
    localStorage.setItem(user.storageKey, JSON.stringify(userData));
    window.dispatchEvent(new CustomEvent('rivertrade:admin-data-updated'));
  }
}

function viewUserDetails(userId) {
  const allUsers = getAllAdminUsers();
  const user = allUsers.find(u => u.id === userId);
  
  if (!user) {
    alert('User not found');
    return;
  }
  
  const details = `
User Details:
- ID: ${user.id}
- Name: ${user.name}
- Email: ${user.email}
- Balance: $${user.balance.toFixed(2)}
- Broker Balance: $${user.brokerBalance.toFixed(2)}
- Investment Profit: $${user.investmentProfit.toFixed(2)}
- Status: ${user.disabled ? 'DISABLED' : 'ACTIVE'}
- Created: ${new Date(user.createdDate).toLocaleDateString()}
${user.disabled ? `- Disabled Date: ${new Date(user.disabledDate).toLocaleDateString()}
- Reason: ${user.disabledReason || 'N/A'}` : ''}
  `;
  
  alert(details);
}

function filterCustomers() {
  const searchTerm = document.getElementById('customerSearchInput').value.toLowerCase();
  const tbody = document.getElementById('allCustomersTableBody');
  const rows = tbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}