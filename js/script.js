// 页面加载完毕后跑 init
window.addEventListener('DOMContentLoaded', init);

// ❶ 从「Publish to the web」拿到的 CSV 链接，用于 GET 渲染
const CSV_URL = 
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4jvmV163o9sMRxS6m7LW2SIiv9SLSnAUB5zpdK4Bc-HS_kMlFfuo9oJN9HgOyOnm7X-wSA5urduaJ/pub?gid=0&single=true&output=csv';

// ❷ Apps Script Web App exec URL，用于 POST 更新
const API_URL = 
  'https://script.google.com/macros/s/AKfycbxOR4DB9BsaeUfufbyUhRUzU9rd1SAf7lYu_ESQWp-bb8kII-WJHRrQd5zaxxZnKSzEDA/exec';

// 正在编辑的旧名字
let currentEditing = '';

// ─── 1. 拉 CSV 并 start 三层渲染 ───────────────────────
function init() {
  fetch(CSV_URL)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(csv => {
      const [headerLine, ...lines] = csv.trim().split('\n');
      const headers = headerLine.split(',');

      // CSV → 对象数组
      const data = lines.map(line => {
        const cols = line.split(',');
        return headers.reduce((o, h, i) => {
          o[h] = cols[i];
          return o;
        }, {});
      });

      renderThreeLevels(data);
    })
    .catch(err => {
      console.error('加载 CSV 失败：', err);
      alert('加载数据失败，请检查网络或控制台');
    });
}

// ─── 2. Rank 辅助 ──────────────────────────────────────
function getRank(role='') {
  const r = role.toLowerCase();
  if (r.includes('founder') || r.includes('ceo'))    return 1;
  if (r.includes('chief'))                           return 2;
  if (r.includes('director') || r.includes('head'))  return 3;
  if (r.includes('manager'))                         return 4;
  return 99;
}
function isLeader(role) {
  return getRank(role) <= 4; // 把 Manager 也当作第二层
}

// ─── 3. 三层渲染 ──────────────────────────────────────
function renderThreeLevels(data) {
  const tree = document.getElementById('tree');
  tree.innerHTML = '';

  // 先按 Rank、再按 Name 排序
  data.sort((a,b) => {
    const dr = getRank(a.Role) - getRank(b.Role);
    return dr || a.Name.localeCompare(b.Name);
  });

  // 找到 Founder（Rank=1）
  const founder = data.find(p => getRank(p.Role) === 1);
  if (!founder) {
    tree.textContent = '⚠️ 请保证有一位 Founder/CEO';
    return;
  }

  // 一层：Founder 卡片
  const fCard = document.createElement('div');
  fCard.className = 'card team-lead';
  fCard.innerHTML = `
    ${founder.Name}<br><small>${founder.Role}</small>
  `;
  tree.appendChild(fCard);

  // 二层容器：所有 管理层（Rank 2–4）
  const mgrContainer = document.createElement('div');
  mgrContainer.className = 'team-members';
  mgrContainer.style.display = 'none';
  fCard.onclick = () => {
    mgrContainer.style.display =
      mgrContainer.style.display === 'none' ? 'flex' : 'none';
  };

  const managers = data.filter(p => getRank(p.Role) >= 2 && getRank(p.Role) <= 4);
  managers.forEach(m => {
    const mCard = document.createElement('div');
    mCard.className = 'card';
    mCard.innerHTML = `
      ${m.Name}<br><small>${m.Role}</small>
      <span class="edit"
            onclick="openEdit(event,'${m.Name}','${m.Role}','${m.Status}','${m.Team}')">
        ✏️
      </span>
    `;
    mgrContainer.appendChild(mCard);

    // 三层：该管理层下属
    const rptContainer = document.createElement('div');
    rptContainer.className = 'team-members';
    rptContainer.style.display = 'none';
    mCard.onclick = e => {
      e.stopPropagation(); // 阻止 Founder 的展开
      rptContainer.style.display =
        rptContainer.style.display === 'none' ? 'flex' : 'none';
    };

    // 找同 Team 且 Rank > m
    const reports = data.filter(p =>
      p.Team === m.Team && getRank(p.Role) > getRank(m.Role)
    );
    reports.forEach(r => {
      const rCard = document.createElement('div');
      rCard.className = 'card';
      rCard.innerHTML = `
        ${r.Name}<br><small>${r.Role}</small>
        <span class="edit"
              onclick="openEdit(event,'${r.Name}','${r.Role}','${r.Status}','${r.Team}')">
          ✏️
        </span>
      `;
      rptContainer.appendChild(rCard);
    });

    mgrContainer.appendChild(rptContainer);
  });

  tree.appendChild(mgrContainer);
}

// ─── 4. 编辑弹窗 / 保存 ─────────────────────────────────
function openEdit(e, name, role, status, team) {
  e.stopPropagation();
  currentEditing = name;
  document.getElementById('editName').value   = name;
  document.getElementById('editRole').value   = role   || '';
  document.getElementById('editStatus').value = status || 'Active';
  document.getElementById('editTeam').value   = team   || 'Operations';
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
    alert(`操作成功：${json.action}`);
    closeEdit();
    init(); // 重新拉 CSV 并渲染
  })
  .catch(err => {
    console.error('保存失败：', err);
    alert('保存失败，请检查控制台');
  });
}









