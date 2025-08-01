// Run init after page finishes loading
window.addEventListener('DOMContentLoaded', init);

// CSV data URL
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4jvmV163o9sMRxS6m7LW2SIiv9SLSnAUB5zpdK4Bc-HS_kMlFfuo9oJN9HgOyOnm7X-wSA5urduaJ/pub?gid=0&single=true&output=csv';

// Apps Script POST API
const API_URL =
  'https://script.google.com/macros/s/AKfycbxOR4DB9BsaeUfufbyUhRUzU9rd1SAf7lYu_ESQWp-bb8kII-WJHRrQd5zaxxZnKSzEDA/exec';

// Currently editing member's old name
let currentEditing = '';

// ─── 1. Load data and render ─────────────────────────────
function init() {
  fetch(CSV_URL)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(csv => {
      const [headerLine, ...lines] = csv.trim().split('\n');
      const headers = headerLine.split(',');

      const data = lines.map(line => {
        const cols = line.split(',');
        return headers.reduce((o, h, i) => {
          o[h] = cols[i];
          return o;
        }, {});
      });

      // Only render members whose state is Active
      const filteredData = data.filter(p => p.Status === 'Active');
      renderThreeLevels(filteredData);
    })
    .catch(err => {
      console.error('加载 CSV 失败：', err);
      alert('加载数据失败，请检查网络或控制台');
    });
}


// ─── 2. Determine rank level ─────────────────────────────
function getRank(role = '') {
  const r = role.toLowerCase();
  if (r.includes('founder') || r.includes('ceo')) return 1;
  if (r.includes('chief')) return 2;
  if (r.includes('director') || r.includes('head')) return 3;
  if (r.includes('manager')) return 4;
  return 99;
}

// ─── 3. Render organizational structure ──────────────────
function renderThreeLevels(data) {
  const tree = document.getElementById('tree');
  tree.innerHTML = '';

  data.sort((a, b) => {
    const rankDiff = getRank(a.Role) - getRank(b.Role);
    return rankDiff || a.Name.localeCompare(b.Name);
  });

  const founder = data.find(p => getRank(p.Role) === 1);
  if (!founder) {
    tree.textContent = 'Please ensure there is a Founder/CEO';
    return;
  }

  const founderCard = document.createElement('div');
  founderCard.className = 'card founder';
  founderCard.innerHTML = `${founder.Name}<br><small>${founder.Role}</small>`;
  tree.appendChild(founderCard);

  const managerContainer = document.createElement('div');
  managerContainer.className = 'managers-row';

  const managers = data.filter(p => {
    const r = getRank(p.Role);
    return r >= 2 && r <= 4;
  });

  managers.forEach(m => {
    const wrapper = document.createElement('div');
    wrapper.className = 'manager-wrapper';

    const mCard = document.createElement('div');
    mCard.className = 'card manager';
    mCard.setAttribute('data-rank', getRank(m.Role));
    mCard.innerHTML = `
      ${m.Name}<br><small>${m.Role}</small>
      <span class="edit"
            onclick="openEdit(event,'${m.Name}','${m.Role}','${m.Status}','${m.Team}')">
      </span>
    `;
    wrapper.appendChild(mCard);

    const reportContainer = document.createElement('div');
    reportContainer.className = 'reports-row';
    reportContainer.style.display = 'none';

    data
      .filter(p => p.Team === m.Team && getRank(p.Role) > getRank(m.Role))
      .forEach(r => {
        const rCard = document.createElement('div');
        rCard.className = 'card report';
        rCard.setAttribute('data-rank', getRank(r.Role));
        rCard.innerHTML = `
          ${r.Name}<br><small>${r.Role}</small>
          <span class="edit"
                onclick="openEdit(event,'${r.Name}','${r.Role}','${r.Status}','${r.Team}')">
          </span>
        `;
        reportContainer.appendChild(rCard);
      });

    mCard.addEventListener('click', e => {
      e.stopPropagation();
      reportContainer.style.display =
        reportContainer.style.display === 'none' ? 'flex' : 'none';
    });

    wrapper.appendChild(reportContainer);
    managerContainer.appendChild(wrapper);
  });

  tree.appendChild(managerContainer);
}

// ─── 4. Edit modal & save ────────────────────────────────
function openEdit(e, name, role, status, team) {
  e.stopPropagation();
  currentEditing = name; // Save old name
  document.getElementById('editName').value   = name;
  document.getElementById('editRole').value   = role   || '';
  document.getElementById('editStatus').value = status || 'Active';
  document.getElementById('editTeam').value   = team   || '';
  document.getElementById('editModal').style.display = 'flex';
}

function closeEdit() {
  document.getElementById('editModal').style.display = 'none';
}

function saveEdit() {
  const newName   = document.getElementById('editName').value.trim();
  const newRole   = document.getElementById('editRole').value.trim();
  const newStatus = document.getElementById('editStatus').value;
  const newTeam   = document.getElementById('editTeam').value;

  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      oldName: currentEditing,
      name:    newName,
      role:    newRole,
      status:  newStatus,
      team:    newTeam
    })
  })
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(json => {
    alert(`Success: ${json.action}`);
    closeEdit();
    init();
  })
  .catch(err => {
    console.error('Save failed:', err);
    alert('Save failed. Please check the console.');
  });
}















