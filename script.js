const SHEET_ID = "1ovUmy3PGl1zCvZlwJ4GUL4cIiYD_pDnMaDb3fK1BJdA";

const urls = {
  freelancers: `https://opensheet.elk.sh/${SHEET_ID}/Freelancers`,
  bookings: `https://opensheet.elk.sh/${SHEET_ID}/Bookings`,
  payroll: `https://opensheet.elk.sh/${SHEET_ID}/Payroll`,
  shops: `https://opensheet.elk.sh/${SHEET_ID}/Shops`
};

function parseMoney(value){
  if(!value || value === "#N/A") return 0;
  return Number(String(value).replace(/,/g,""));
}

function formatMoney(value){
  return "₩" + value.toLocaleString("ko-KR");
}

async function loadDashboard(){

  const [
    freelancers,
    bookings,
    payroll,
    shops
  ] = await Promise.all([
    fetch(urls.freelancers).then(r=>r.json()),
    fetch(urls.bookings).then(r=>r.json()),
    fetch(urls.payroll).then(r=>r.json()),
    fetch(urls.shops).then(r=>r.json())
  ]);

  renderKPI(freelancers, bookings, payroll);
  renderShopTable(shops, bookings, payroll);
  renderBookingTable(bookings, shops);

  createBookingChart(bookings);
  createRegionChart(freelancers);
  createPayrollChart(shops, payroll);

}

function renderKPI(freelancers, bookings, payroll){

  const active =
    freelancers.filter(f=>f.상태==="활성").length;

  const completed =
    bookings.filter(
      b=>b.status==="Completed"
    ).length;

  const pendingPay =
    payroll
      .filter(p=>p.payment_status==="Pending")
      .reduce(
        (sum,p)=>sum+parseMoney(p.gross_pay),
        0
      );

  const totalPay =
    payroll.reduce(
      (sum,p)=>sum+parseMoney(p.gross_pay),
      0
    );

  const cards = [
    ["👥 총 프리랜서", freelancers.length],
    ["🟢 활성 인원", active],
    ["📅 배정 건수", bookings.length],
    ["✅ 완료 건수", completed],
    ["💰 지급 예정", formatMoney(pendingPay)],
    ["📈 누적 급여", formatMoney(totalPay)]
  ];

  document.getElementById("kpiGrid").innerHTML =
    cards.map(card=>`
      <div class="card">
        <div class="card-title">${card[0]}</div>
        <div class="card-value">${card[1]}</div>
      </div>
    `).join("");
}

function renderShopTable(shops, bookings, payroll){

  const table =
    document.getElementById("paymentTable");

  table.innerHTML = shops.map(shop=>{

    const shopBookings =
      bookings.filter(
        b=>b.shop_id===shop.shop_id
      );

    const shopPayroll =
      payroll.filter(
        p=>p.shop_id===shop.shop_id
      );

    const totalPay =
      shopPayroll.reduce(
        (sum,p)=>sum+parseMoney(p.gross_pay),
        0
      );

    const unpaid =
      shopPayroll
        .filter(
          p=>p.payment_status==="Pending"
        )
        .reduce(
          (sum,p)=>sum+parseMoney(p.gross_pay),
          0
        );

    return `
      <tr>
        <td>${shop.shop_id}</td>
        <td>${shop.샵명}</td>
        <td>${shopBookings.length}</td>
        <td>${formatMoney(totalPay)}</td>
        <td>${formatMoney(unpaid)}</td>
      </tr>
    `;

  }).join("");
}

function renderBookingTable(bookings, shops){

  const tbody =
    document.getElementById("bookingTable");

  tbody.innerHTML =
    bookings.map(b=>{

      const shop =
        shops.find(
          s=>s.shop_id===b.shop_id
        );

      return `
      <tr>
        <td>${b.booking_id}</td>
        <td>${b.booking_date}</td>
        <td>${shop?.샵명 || "-"}</td>
        <td>${b.role}</td>
        <td>
          <span class="badge ${b.status.toLowerCase()}">
            ${b.status}
          </span>
        </td>
      </tr>
      `;
    }).join("");
}

function createBookingChart(bookings){

  const counts = {};

  bookings.forEach(b=>{
    counts[b.status] =
      (counts[b.status] || 0) + 1;
  });

  new Chart(
    document.getElementById("bookingChart"),
    {
      type:"doughnut",
      data:{
        labels:Object.keys(counts),
        datasets:[{
          data:Object.values(counts)
        }]
      }
    }
  );
}

function createRegionChart(freelancers){

  const counts = {};

  freelancers.forEach(f=>{
    counts[f["주 활동지역"]] =
      (counts[f["주 활동지역"]] || 0)+1;
  });

  new Chart(
    document.getElementById("regionChart"),
    {
      type:"pie",
      data:{
        labels:Object.keys(counts),
        datasets:[{
          data:Object.values(counts)
        }]
      }
    }
  );
}

function createPayrollChart(shops, payroll){

  const labels = [];
  const values = [];

  shops.forEach(shop=>{

    labels.push(shop.샵명);

    const total =
      payroll
        .filter(
          p=>p.shop_id===shop.shop_id
        )
        .reduce(
          (sum,p)=>
            sum+parseMoney(p.gross_pay),
          0
        );

    values.push(total);

  });

  new Chart(
    document.getElementById("payrollChart"),
    {
      type:"bar",
      data:{
        labels,
        datasets:[{
          label:"총 급여",
          data:values
        }]
      }
    }
  );
}

setInterval(loadDashboard,30000);

loadDashboard();