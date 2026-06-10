const SHEET_ID = "1ovUmy3PGl1zCvZlwJ4GUL4cIiYD_pDnMaDb3fK1BJdA";

// Google Apps Script 웹 앱 URL (이메일 발송 백엔드)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9KLfiEkakgZOSGJwrjzgspuJt1XskOUiQ0oPAfF_jqjdtdWZfmkbk6Ex3_2Qwf9Sq/exec";

const urls = {
  freelancers: `https://opensheet.elk.sh/${SHEET_ID}/Freelancers`,
  bookings: `https://opensheet.elk.sh/${SHEET_ID}/Bookings`,
  payroll: `https://opensheet.elk.sh/${SHEET_ID}/Payroll`,
  shops: `https://opensheet.elk.sh/${SHEET_ID}/Shops`
};

// 전역 데이터 관리 변수
let allShops = [];
let allFreelancers = [];
let allBookings = [];
let allPayroll = [];
let currentShop = null;

// Chart.js 인스턴스 참조 변수 (중복 렌더링 방지용)
let bookingChartInstance = null;
let roleChartInstance = null;
let payrollChartInstance = null;

// 돈 단위 파싱 및 포맷팅 헬퍼 함수
function parseMoney(value) {
  if (!value || value === "#N/A") return 0;
  return Number(String(value).replace(/[^0-9.-]/g, ""));
}

function formatMoney(value) {
  return "₩" + Math.round(value).toLocaleString("ko-KR");
}

// 초기 앱 세팅 및 로그인 여부 확인
async function initApp() {
  try {
    // 1. 샵 목록 가져오기 및 드롭다운 채우기
    allShops = await fetch(urls.shops).then(r => r.json());
    populateShopSelect(allShops);
    
    // 2. 세션에 로그인 정보가 있는지 확인
    const sessionShop = sessionStorage.getItem("currentShop");
    if (sessionShop) {
      currentShop = JSON.parse(sessionShop);
      showDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error("앱 초기화 오류:", error);
    document.getElementById("loginError").textContent = "데이터를 불러오는 데 실패했습니다. 네트워크 상태를 확인하세요.";
  }
}

// 샵 목록 드롭다운 데이터 바인딩
function populateShopSelect(shops) {
  const select = document.getElementById("shopSelect");
  select.innerHTML = '<option value="" disabled selected>로그인할 가게를 선택하세요</option>';
  shops.forEach(shop => {
    const option = document.createElement("option");
    option.value = shop.shop_id;
    option.textContent = shop.샵명;
    select.appendChild(option);
  });
}

// 화면 보이기 제어
function showLogin() {
  document.getElementById("loginContainer").style.display = "flex";
  document.getElementById("dashboardContainer").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginContainer").style.display = "none";
  document.getElementById("dashboardContainer").style.display = "block";
  
  // 대시보드 타이틀 변경
  document.getElementById("shopTitle").textContent = `🏄 ${currentShop.샵명} 대시보드`;
  
  // 매장 상세 정보 바인딩
  document.getElementById("profileOwner").textContent = currentShop.대표자명 || "-";
  document.getElementById("profileContact").textContent = currentShop.연락처 || "-";
  document.getElementById("profileEmail").textContent = currentShop.이메일 || "-";
  document.getElementById("profileRegion").textContent = currentShop.지역 || "-";
  document.getElementById("profileSettlementDate").textContent = currentShop.정산일 ? `${currentShop.정산일}일` : "-";
  
  // 프로필 상태 뱃지 표시
  const statusBadge = document.getElementById("profileStatus");
  statusBadge.textContent = currentShop.운영상태 || "운영중";
  if (currentShop.운영상태 === "운영중") {
    statusBadge.className = "badge active-badge";
  } else {
    statusBadge.className = "badge warning";
  }

  // 대시보드 데이터 로드
  loadDashboardData();
}

// 로그인 처리 함수
function handleLogin(event) {
  event.preventDefault();
  const shopId = document.getElementById("shopSelect").value;
  const password = document.getElementById("passwordInput").value;
  const errorDiv = document.getElementById("loginError");
  
  if (!shopId) {
    errorDiv.textContent = "가게를 선택해 주세요.";
    return;
  }

  // localStorage에서 해당 가게 비밀번호 가져옴 (없으면 초기 비밀번호 "0000" 적용)
  const savedPassword = localStorage.getItem(`shop_pwd_${shopId}`) || "0000";
  
  if (password === savedPassword) {
    currentShop = allShops.find(s => s.shop_id === shopId);
    sessionStorage.setItem("currentShop", JSON.stringify(currentShop));
    errorDiv.textContent = "";
    document.getElementById("passwordInput").value = "";
    showDashboard();
  } else {
    errorDiv.textContent = "비밀번호가 올바르지 않습니다. (초기 비밀번호: 0000)";
  }
}

// 로그아웃 처리 함수
function handleLogout() {
  sessionStorage.removeItem("currentShop");
  currentShop = null;
  showLogin();
}

// 대시보드 데이터 로드 및 렌더링
async function loadDashboardData() {
  if (!currentShop) return;

  try {
    const [
      freelancers,
      bookings,
      payroll
    ] = await Promise.all([
      fetch(urls.freelancers).then(r => r.json()),
      fetch(urls.bookings).then(r => r.json()),
      fetch(urls.payroll).then(r => r.json())
    ]);

    allFreelancers = freelancers;
    allBookings = bookings;
    allPayroll = payroll;

    // 현재 가게 기준 데이터 필터링
    // 1. 예약 데이터 필터링 (shop_id 일치)
    const shopBookings = bookings.filter(b => b.shop_id === currentShop.shop_id);
    
    // 2. 정산 데이터 필터링 (shop_id 일치)
    const shopPayroll = payroll.filter(p => p.shop_id === currentShop.shop_id);

    // 3. 프리랜서 필터링 (이 매장에 예약 기록이 있거나, 주 활동지역이 해당 샵의 지역과 일치하는 인원)
    const bookedFreelancerIds = new Set(shopBookings.map(b => b.freelancer_id).filter(id => id));
    const shopFreelancers = freelancers.filter(f => 
      bookedFreelancerIds.has(f.freelancer_id) || f["주 활동지역"] === currentShop.지역
    );

    // KPI 렌더링
    renderKPI(shopFreelancers, shopBookings, shopPayroll);

    // 정산 현황 테이블 렌더링
    renderShopPayrollTable(shopPayroll, freelancers);

    // 예약 현황 테이블 렌더링
    renderBookingTable(shopBookings, freelancers);

    // 차트 생성 및 갱신
    createBookingChart(shopBookings);
    createRoleChart(shopBookings);
    createPayrollChart(shopPayroll, freelancers);

  } catch (error) {
    console.error("대시보드 데이터 갱신 오류:", error);
  }
}

// 1. KPI 렌더링
function renderKPI(shopFreelancers, shopBookings, shopPayroll) {
  const activeCount = shopFreelancers.filter(f => f.상태 === "활성" || f.상태 === "가능").length;
  
  // 완료된 예약 건수 (Completed 또는 Ended 상태 카운트)
  const completedBookings = shopBookings.filter(b => 
    b.status.toLowerCase() === "completed" || b.status.toLowerCase() === "ended"
  ).length;

  // 정산 대기 금액
  const pendingPay = shopPayroll
    .filter(p => p.payment_status === "Pending")
    .reduce((sum, p) => sum + parseMoney(p.gross_pay), 0);

  // 누적 정산 금액
  const totalPay = shopPayroll
    .reduce((sum, p) => sum + parseMoney(p.gross_pay), 0);

  const cards = [
    { title: "👥 소속 프리랜서", value: `${shopFreelancers.length}명` },
    { title: "🟢 활성 인원", value: `${activeCount}명` },
    { title: "📅 전체 배정 건수", value: `${shopBookings.length}건` },
    { title: "✅ 완료 건수", value: `${completedBookings}건` },
    { title: "💰 정산 대기금액", value: formatMoney(pendingPay) },
    { title: "📈 누적 정산금액", value: formatMoney(totalPay) }
  ];

  document.getElementById("kpiGrid").innerHTML = cards.map(card => `
    <div class="card">
      <div class="card-title">${card.title}</div>
      <div class="card-value">${card.value}</div>
    </div>
  `).join("");
}

// 2. 급여 정산 테이블 렌더링
function renderShopPayrollTable(shopPayroll, freelancers) {
  const tbody = document.getElementById("paymentTable");
  
  if (shopPayroll.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">조회된 정산 내역이 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = shopPayroll.map(p => {
    const freelancer = freelancers.find(f => f.freelancer_id === p.freelancer_id);
    const flName = freelancer ? freelancer.이름 : p.freelancer_id || "-";
    const flEmail = freelancer ? (freelancer.이메일 || "") : "";
    const statusClass = p.payment_status ? p.payment_status.toLowerCase() : "";
    // 메일 발송 버튼: 이메일이 없거나 정산 미완료(Pending)면 비활성화
    const hasEmail = flEmail.trim() !== "";
    const isPaid = p.payment_status && p.payment_status.toLowerCase() === "completed";
    const btnDisabled = (!hasEmail || !isPaid) ? "disabled title=\"" + (!hasEmail ? "프리랜서 이메일 미등록" : "정산 완료(Completed) 상태에서만 발송 가능") + "\"" : "";

    return `
      <tr>
        <td><strong>${p.payroll_id || "-"}</strong></td>
        <td>${p.booking_id || "-"}</td>
        <td>${flName}</td>
        <td><span class="badge info">${p.role || "-"}</span></td>
        <td>${p.worked_hours ? p.worked_hours + '시간' : "-"}</td>
        <td>${p.base_rate ? formatMoney(parseMoney(p.base_rate)) : "-"}</td>
        <td><strong>${p.gross_pay ? formatMoney(parseMoney(p.gross_pay)) : "₩0"}</strong></td>
        <td><span class="badge ${statusClass}">${p.payment_status || "-"}</span></td>
        <td>${p.memo || "-"}</td>
        <td>
          <button
            class="btn-email-send"
            ${btnDisabled}
            onclick="sendPayrollEmailHandler('${p.payroll_id}')"
          >📧 메일 발송</button>
        </td>
      </tr>
    `;
  }).join("");
}

// 3. 예약 테이블 렌더링
function renderBookingTable(shopBookings, freelancers) {
  const tbody = document.getElementById("bookingTable");

  if (shopBookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">조회된 예약이 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = shopBookings.map(b => {
    const freelancer = freelancers.find(f => f.freelancer_id === b.freelancer_id);
    const flName = freelancer ? freelancer.이름 : b.freelancer_id || "-";
    const statusClass = b.status ? b.status.toLowerCase() : "";
    const timeDisplay = b.start_time ? `${b.start_time}${b.end_time ? ' ~ ' + b.end_time : ''}` : "-";

    return `
      <tr>
        <td><strong>${b.booking_id || "-"}</strong></td>
        <td>${b.booking_date || "-"}</td>
        <td>${timeDisplay}</td>
        <td>${flName}</td>
        <td><span class="badge info">${b.role || "-"}</span></td>
        <td>${b.lesson_type || "-"}</td>
        <td>${b.headcount ? b.headcount + '명' : "-"}</td>
        <td><span class="badge ${statusClass}">${b.status || "-"}</span></td>
      </tr>
    `;
  }).join("");
}

// 4. 예약 상태 비율 차트 (Doughnut)
function createBookingChart(shopBookings) {
  const counts = {};
  shopBookings.forEach(b => {
    if (b.status) {
      counts[b.status] = (counts[b.status] || 0) + 1;
    }
  });

  const ctx = document.getElementById("bookingChart");
  
  // 기존 차트 파괴
  if (bookingChartInstance) {
    bookingChartInstance.destroy();
  }

  if (Object.keys(counts).length === 0) {
    // 차트 데이터가 없는 경우
    bookingChartInstance = null;
    return;
  }

  // 세련된 색상 조합
  const colors = {
    Ended: "#10b981",
    Completed: "#10b981",
    Pending: "#f59e0b",
    Requested: "#3b82f6",
    Canceled: "#ef4444"
  };

  const backgroundColors = Object.keys(counts).map(key => colors[key] || "#cbd5e1");

  bookingChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { size: 12 }
          }
        }
      },
      cutout: "65%"
    }
  });
}

// 5. 프리랜서 역할 분포 차트 (Pie)
function createRoleChart(shopBookings) {
  const counts = {};
  shopBookings.forEach(b => {
    if (b.role) {
      counts[b.role] = (counts[b.role] || 0) + 1;
    }
  });

  const ctx = document.getElementById("roleChart");
  
  if (roleChartInstance) {
    roleChartInstance.destroy();
  }

  if (Object.keys(counts).length === 0) {
    roleChartInstance = null;
    return;
  }

  const colors = ["#0f5d67", "#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899"];

  roleChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: colors.slice(0, Object.keys(counts).length),
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { size: 12 }
          }
        }
      }
    }
  });
}

// 6. 프리랜서별 급여 현황 차트 (Bar)
function createPayrollChart(shopPayroll, freelancers) {
  const freelancerPays = {};
  
  shopPayroll.forEach(p => {
    const freelancer = freelancers.find(f => f.freelancer_id === p.freelancer_id);
    const name = freelancer ? freelancer.이름 : p.freelancer_id || "기타";
    const amount = parseMoney(p.gross_pay);
    freelancerPays[name] = (freelancerPays[name] || 0) + amount;
  });

  const ctx = document.getElementById("payrollChart");
  
  if (payrollChartInstance) {
    payrollChartInstance.destroy();
  }

  const labels = Object.keys(freelancerPays);
  const values = Object.values(freelancerPays);

  if (labels.length === 0) {
    payrollChartInstance = null;
    return;
  }

  payrollChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "지급 급여 합계",
        data: values,
        backgroundColor: "rgba(15, 93, 103, 0.85)",
        hoverBackgroundColor: "rgba(15, 93, 103, 1)",
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `지급액: ${formatMoney(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return "₩" + (value / 10000).toLocaleString() + "만";
            }
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// 비밀번호 변경 기능 로직
// -------------------------------------------------------------

function openPasswordModal() {
  document.getElementById("passwordModal").style.display = "flex";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("passwordSuccess").textContent = "";
}

function closePasswordModal() {
  document.getElementById("passwordModal").style.display = "none";
  document.getElementById("passwordForm").reset();
}

function handleChangePassword(event) {
  event.preventDefault();
  
  if (!currentShop) return;

  const currentPwdInput = document.getElementById("currentPassword").value;
  const newPwdInput = document.getElementById("newPassword").value;
  const confirmPwdInput = document.getElementById("newPasswordConfirm").value;

  const errorDiv = document.getElementById("passwordError");
  const successDiv = document.getElementById("passwordSuccess");

  errorDiv.textContent = "";
  successDiv.textContent = "";

  // 1. 현재 비밀번호 검증
  const savedPassword = localStorage.getItem(`shop_pwd_${currentShop.shop_id}`) || "0000";
  if (currentPwdInput !== savedPassword) {
    errorDiv.textContent = "현재 비밀번호가 일치하지 않습니다.";
    return;
  }

  // 2. 신규 비밀번호 길이 제한 및 유효성 검사 (예: 최소 4자리)
  if (newPwdInput.length < 4) {
    errorDiv.textContent = "새 비밀번호는 최소 4자리 이상이어야 합니다.";
    return;
  }

  // 3. 비밀번호 확인 매칭 검사
  if (newPwdInput !== confirmPwdInput) {
    errorDiv.textContent = "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.";
    return;
  }

  // 4. 비밀번호 저장
  localStorage.setItem(`shop_pwd_${currentShop.shop_id}`, newPwdInput);
  successDiv.textContent = "비밀번호가 성공적으로 변경되었습니다!";

  // 1.5초 후 모달 닫기
  setTimeout(() => {
    closePasswordModal();
  }, 1500);
}

// -------------------------------------------------------------
// 📧 급여 정산 완료 메일 발송 핸들러
// -------------------------------------------------------------

async function sendPayrollEmailHandler(payrollId) {
  // 정산 레코드 조회
  const payroll = allPayroll.find(p => p.payroll_id === payrollId);
  if (!payroll) {
    alert('정산 내역을 찾을 수 없습니다.');
    return;
  }

  // 프리랜서 정보 조회
  const freelancer = allFreelancers.find(f => f.freelancer_id === payroll.freelancer_id);
  if (!freelancer || !freelancer.이메일) {
    alert('프리랜서의 이메일 주소가 등록되어 있지 않습니다.');
    return;
  }

  // 예약 정보 조회 (근무 일자/시간 등 가져오기)
  const booking = allBookings.find(b => b.booking_id === payroll.booking_id) || {};

  // 현재 로그인한 샵 정보
  const shopName = currentShop ? currentShop.샵명 : (payroll.shop_id || '-');

  // 발송 확인 다이얼로그
  const confirmMsg = [
    `프리랜서: ${freelancer.이름}`,
    `수신 이메일: ${freelancer.이메일}`,
    `근무 일자: ${booking.booking_date || '-'}`,
    `지급 총액: ${payroll.gross_pay || '-'}`,
    '',
    '위 주소로 급여 지급 완료 메일을 발송하시겠습니까?'
  ].join('\n');

  if (!confirm(confirmMsg)) return;

  // 발송 버튼 UI 상태 변경 (비활성화)
  const btn = document.querySelector(`button[onclick="sendPayrollEmailHandler('${payrollId}')"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '발송 중...';
  }

  // Apps Script API 호출 - JSONP 방식으로 CORS 우회
  const params = {
    action: 'sendPayrollEmail',
    freelancerEmail: freelancer.이메일,
    freelancerName: freelancer.이름,
    shopName: shopName,
    bookingDate: booking.booking_date || '-',
    startTime: booking.start_time || '-',
    endTime: booking.end_time || '-',
    role: payroll.role || '-',
    lessonType: booking.lesson_type || '-',
    headcount: booking.headcount || '-',
    workedHours: payroll.worked_hours || '-',
    baseRate: payroll.base_rate || '-',
    grossPay: payroll.gross_pay || '-',
    paymentDate: payroll.payment_date || '-',
    payrollId: payroll.payroll_id || '-',
    memo: payroll.memo || '-'
  };

  try {
    const result = await jsonpRequest(APPS_SCRIPT_URL, params);

    if (result.success) {
      showEmailToast(`✅ ${freelancer.이름} 강사님에게 메일을 성공적으로 발송했습니다.`, 'success');
      if (btn) {
        btn.textContent = '✅ 발송 완료';
        btn.style.background = 'var(--success)';
        btn.style.color = 'white';
      }
    } else {
      throw new Error(result.message || '알 수 없는 오류');
    }
  } catch (err) {
    showEmailToast(`❌ 메일 발송 실패: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📧 메일 발송';
    }
  }
}

// -------------------------------------------------------------
// JSONP 헬퍼 함수 - CORS 없이 Google Apps Script API 호출
// script 태그를 동적으로 생성하여 브라우저 CORS 정책을 우회합니다.
// -------------------------------------------------------------
function jsonpRequest(url, params) {
  return new Promise((resolve, reject) => {
    // 고유한 콜백 함수명 생성 (충돌 방지)
    const callbackName = 'surfhire_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    params.callback = callbackName;

    const script = document.createElement('script');
    script.src = url + '?' + new URLSearchParams(params).toString();

    // 15초 타임아웃 가드
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('요청 시간이 초과되었습니다 (15초). Apps Script 배포 상태를 확인해 주세요.'));
    }, 15000);

    function cleanup() {
      clearTimeout(timer);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    // Apps Script가 호출할 전역 콜백 함수 등록
    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('스크립트 로드 실패. Apps Script URL 또는 배포 설정을 확인해 주세요.'));
    };

    document.head.appendChild(script);
  });
}

// 토스트 알림 (이메일 발송 전용)
function showEmailToast(message, type) {
  // 기존 토스트 제거
  const existing = document.getElementById('emailToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'emailToast';
  toast.style.cssText = `
    position: fixed; bottom: 30px; right: 30px; z-index: 9999;
    padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    background: ${type === 'success' ? '#ecfdf5' : '#fef2f2'};
    color: ${type === 'success' ? '#065f46' : '#991b1b'};
    border: 1px solid ${type === 'success' ? '#6ee7b7' : '#fca5a5'};
    animation: slideUpFade 0.3s ease-out forwards;
    max-width: 360px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// 30초마다 데이터 자동 리프레시 (로그인된 상태에서만 작동)
setInterval(() => {
  if (currentShop) {
    loadDashboardData();
  }
}, 30000);

// 페이지 로드 시 앱 초기화 실행
window.addEventListener("DOMContentLoaded", initApp);
