const KPI_URL =
"https://opensheet.elk.sh/1ovUmy3PGl1zCvZlwJ4GUL4cIiYD_pDnMaDb3fK1BJdA/DashboardData";

const SHOP_URL =
"https://opensheet.elk.sh/1ovUmy3PGl1zCvZlwJ4GUL4cIiYD_pDnMaDb3fK1BJdA/ShopPayments";

async function loadDashboard() {

  const kpiData = await fetch(KPI_URL).then(r => r.json());
  const shopData = await fetch(SHOP_URL).then(r => r.json());

  renderKPI(kpiData);
  renderTable(shopData);

}

function renderKPI(data){

  const grid = document.getElementById("kpiGrid");

  grid.innerHTML = data.map(item => `
    <div class="card">
      <div class="card-title">${item.KPI}</div>
      <div class="card-value">${item.값}</div>
    </div>
  `).join("");

}

function renderTable(data){

  const table = document.getElementById("paymentTable");

  table.innerHTML = data.map(shop => `
    <tr>
      <td>${shop.shop_id}</td>
      <td>${shop.샵명}</td>
      <td>${shop.배정건수}</td>
      <td>${shop.총급여}</td>
      <td>${shop.미지급금액}</td>
    </tr>
  `).join("");

}

loadDashboard();