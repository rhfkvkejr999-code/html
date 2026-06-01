const SHEET_URL =
"https://opensheet.elk.sh/1ovUmy3PGl1zCvZlwJ4GUL4cIiYD_pDnMaDb3fK1BJdA/DashboardData";

fetch(SHEET_URL)
.then(res => res.json())
.then(data => {

    const cards = document.getElementById("cards");

    cards.innerHTML = `
        <div class="card">
            <h3>총 프리랜서</h3>
            <p>5명</p>
        </div>

        <div class="card">
            <h3>활성 프리랜서</h3>
            <p>4명</p>
        </div>

        <div class="card">
            <h3>총 배정 건수</h3>
            <p>3건</p>
        </div>

        <div class="card">
            <h3>지급 예정 금액</h3>
            <p>₩458,000</p>
        </div>
    `;

});