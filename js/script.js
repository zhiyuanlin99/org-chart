// 当页面加载完毕后自动跑 init
window.addEventListener('DOMContentLoaded', init);

// ❶ 用刚才在「Publish to the web」里拿到的 CSV 链接
const CSV_URL = 
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4jvmV163o9sMRxS6m7LW2SIiv9SLSnAUB5zpdK4Bc-HS_kMlFfuo9oJN9HgOyOnm7X-wSA5urduaJ/pub?gid=0&single=true&output=csv';

// ❷ 用 Apps Script 部署出来的 exec URL，只用于 POST 更新
const API_URL = 
  'https://script.google.com/macros/s/AKfycbxOR4DB9BsaeUfufbyUhRUzU9rd1SAf7lYu_ESQWp-bb8kII-WJHRrQd5zaxxZnKSzEDA/exec';

// 当前正在编辑的 “旧名字”
let currentEditing = ''; 

// ─── 1. 拉取 CSV 并渲染 ──────────────────────────────────
function init() {
  fetch(CSV_URL)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(csv => {
      // 简单把 CSV 拆成数组
      const [headerLine, ...lines] = csv.trim().split('\n');
      const headers = headerLine.split(',');

      // 每行转对象
      const data = lines.map(line => {
        const cols = line.split(',');
        return headers.reduce((o, h, i) => {
          o[h] = cols[i];
          return o;
        }, {});
      });

      renderByHierarchy(data);
    })
    .catch(err => {
      console.error('加载数据失败：', err);
      alert('加载数据失败，请检查网络或控制台');
    });
}

// ─── 2. 渲染函数及辅助 ──────────────────────────────────
function getRank(role) {
  const r = (role||'').toLowerCase();
  if (r.includes('founder') || r.includes('ceo')) return 1;
  if (r.includes('chief')) return 2;
  if (r.includes('director')||r.includes('head')) return 3;
  if (r.includes('manager')) return 4;
  if (r.includes('lead')) return 5;
  if (r.includes('developer')||r.includes('analyst')||r.includes('designer')||r.includes('writer')) return 6;
  if (r.includes('intern')||r.includes('assistant')) return 7;
  return 99;
}
function isLeader(role) {
  return getRank(role) <= 5;
}

function renderByHierarchy(data) {
  const tree = document.getElementById('tree');
  tree.innerHTML = '';

  // 按职位排序
  data.sort((a, b) => getRank(a.Role) - getRank(b.Role));

  // 按 Team 分组
  const grouped = {};
  data.forEach(p => {
    (grouped[p.Team] = grouped[p.Team]||[]).push(p);
  });

  // 每个组渲染一个块
  Object.entries(grouped).forEach(([teamName, members]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'team-group';

    // 取这组的 leader 和 others
    const leaders = members.filter(p => isLeader(p.Role));
    const others  = members.filter(p => !isLeader(p.Role));
    const leader  = leaders.length ? leaders[0] : others.shift();

    // 领队卡片
    const leadCard = document.createElement('div');
    leadCard.className = 'card team-lead';
    leadCard.setAttribute('data-rank', getRank(leader.Role));
    leadCard.innerHTML = `
      ${leader.Name}<br><small>${leader.Role}</small>
    `;
    leadCard.onclick = () => toggleTeam(teamName);
    groupDiv.appendChild(leadCard);

    // 隐藏成员区
    const memsDiv = document.createElement('div');
    memsDiv.className = 'team-members';
    memsDiv.id        = `team-${teamName}`;
    memsDiv.style.display = 'none';

    // 剩下的成员
    [...leaders.slice(1), ...others].forEach(p => {
      const m = document.createElement('div');
      m.className = 'card';
      m.setAttribute('data-rank', getRank(p.Role));
      m.innerHTML = `
        ${p.Name}<br><small>${p.Role}</small>
        <span class="edit" 
              onclick="openEdit(event,'${p.Name}','${p.Role}','${p.Status}','${p.Team}')">
          ✏️
        </span>
      `;
      memsDiv.appendChild(m);
    });

    groupDiv.appendChild(memsDiv);
    tree.appendChild(groupDiv);
  });
}

function toggleTeam(teamName) {
  const d = document.getElementById(`team-${teamName}`);
  if (!d) return;
  d.style.display = d.style.display === 'none' ? 'flex' : 'none';
}

// ─── 3. 编辑弹窗 / 保存 ──────────────────────────────────
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
  .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
  .then(json => {
    alert(`操作成功：${json.action}`);
    closeEdit();
    init();  // 更新完再刷新一下
  })
  .catch(err => {
    console.error('保存失败：', err);
    alert('保存失败，请检查控制台错误');
  });
}








