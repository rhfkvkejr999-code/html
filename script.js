const SHEET_ID = "1ovUmy3PGl1zCvZlwJ4GUL4cIiYD_pDnMaDb3fK1BJdA";

const urls = {
  freelancers: `https://opensheet.elk.sh/${SHEET_ID}/Freelancers`,
  bookings: `https://opensheet.elk.sh/${SHEET_ID}/Bookings`,
  payroll: `https://opensheet.elk.sh/${SHEET_ID}/Payroll`,
  shops: `https://opensheet.elk.sh/${SHEET_ID}/Shops`
};

function parseMoney(value) {
  if (!value || value === "#N/A") return 0;
  return Number(String(value).replace(/,/g, ""));
}

function formatMoney(value) {
  return "₩" + value.toLocaleString("ko-KR");
}

async function loadDashboard() {

  const [
    freelancers,
    bookings,
    payroll,
    shops
  ] = await Promise.all([
    fetch(urls.freelancers).then(r => r.json()),
    fetch(urls.bookings).then(r => r.json()),
    fetch(urls.payroll).then(r => r.json()),
    fetch(urls.shops).then(r => r.json())
  ]);

  renderKPI(freelancers, bookings, payroll);
  renderShopTable(shops, bookings, payroll);

}

function renderKPI(freelancers, bookings, payroll) {

  const totalFreelancers = freelancers.length;

  const activeFreelancers =
    freelancers.filter(f => f.상태 === "활성").length;

  const totalBookings = bookings.length;

  const completedBookings =
    bookings.filter(
      b =>
        b.status === "Completed" ||
        b.status === "Worked" ||
        b.status === "Done"
    ).length;

  const pendingPay =
    payroll
      .filter(p => p.payment_status === "Pending")
      .reduce(
        (sum, p) => sum + parseMoney(p.gross_pay),
        0
      );

  const totalPay =
    payroll.reduce(
      (sum, p) => sum + parseMoney(p.gross_pay),
      0
    );

  const kpis = [
    {
      title: "총 프리랜서 수",
      value: totalFreelancers
    },
    {
      title: "활성 프리랜서 수",
      value: activeFreelancers
    },
    {
      title: "총 배정 건수",
      value: totalBookings
    },
    {
      title: "완료 건수",
      value: completedBookings
    },
    {
      title: "지급 예정 총액",
      value: formatMoney(pendingPay)
    },
    {
      title: "누적 총급여",
      value: formatMoney(totalPay)
    }
  ];

  const grid = document.getElementById("kpiGrid");

  grid.innerHTML = kpis.map(item => `
    <div class="card">
      <div class="card-title">${item.title}</div>
      <div class="card-value">${item.value}</div>
    </div>
  `).join("");
}

function renderShopTable(shops, bookings, payroll) {

  const rows = shops.map(shop => {

    const shopBookings =
      bookings.filter(
        b => b.shop_id === shop.shop_id
      );

    const shopPayroll =
      payroll.filter(
        p => p.shop_id === shop.shop_id
      );

    const totalPay =
      shopPayroll.reduce(
        (sum, p) =>
          sum + parseMoney(p.gross_pay),
        0
      );

    const unpaid =
      shopPayroll
        .filter(
          p => p.payment_status === "Pending"
        )
        .reduce(
          (sum, p) =>
            sum + parseMoney(p.gross_pay),
          0
        );

    return {
      shopId: shop.shop_id,
      shopName: shop.샵명,
      bookingCount: shopBookings.length,
      totalPay,
      unpaid
    };
  });

  const table =
    document.getElementById("paymentTable");

  table.innerHTML = rows.map(row => `
    <tr>
      <td>${row.shopId}</td>
      <td>${row.shopName}</td>
      <td>${row.bookingCount}</td>
      <td>${formatMoney(row.totalPay)}</td>
      <td>${formatMoney(row.unpaid)}</td>
    </tr>
  `).join("");
}

loadDashboard();