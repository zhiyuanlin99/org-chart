window.addEventListener('DOMContentLoaded', init);

const API_URL = 'https://script.google.com/macros/s/AKfycbynNOWE7gXeM3-yqCooKgP7RhhNKuMDUjmRe8TnEGzGHXHSvslkluTrPF4YBjhZO9yhwA/exec';


let currentEditing = ''; // 记录旧名字

function init() {
  fetch(API_URL, { method: 'GET' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => renderByHierarchy(data))
    .catch(err => {
      console.error("加载数据失败：", err);
      alert("加载数据失败，请检查网络或控制台");
    });
}

function getRank(role) {
  const r = (role || '').toLowerCase();
  if (r.includes("founder") || r.includes("ceo")) return 1;
  if (r.includes("chief")) return 2;
  if (r.includes("director") || r.includes("head")) return 3;
  if (r.includes("manager")) return 4;
  if (r.includes("lead")) return 5;
  if (r.includes("developer") || r.includes("analyst") || r.includes("designer") || r.includes("writer")) return 6;
  if (r.includes("intern") || r.includes("assistant")) return 7;
  return 99;
}

function isLeader(role) {
  return getRank(role) <= 5;
}

function renderByHierarchy(data) {
  const tree = document.getElementById('tree');
  tree.innerHTML = '';

  data.sort((a, b) => getRank(a.Role) - getRank(b.Role));

  const grouped = {};
  data.forEach(p => {
    (grouped[p.Team] = grouped[p.Team] || []).push(p);
  });

  Object.entries(grouped).forEach(([teamName, members]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'team-group';

    const leaders = members.filter(p => isLeader(p.Role));
    const others  = members.filter(p => !isLeader(p.Role));
    const leader  = leaders.length ? leaders[0] : others.shift();

    const leadCard = document.createElement('div');
    leadCard.className = 'card team-lead';
    leadCard.setAttribute('data-rank', getRank(leader.Role));
    leadCard.innerHTML = `
      ${leader.Name}<br><small>${leader.Role}</small>
    `;
    leadCard.onclick = () => toggleTeam(teamName);
    groupDiv.appendChild(leadCard);

    const memsDiv = document.createElement('div');
    memsDiv.className = 'team-members';
    memsDiv.id = `team-${teamName}`;
    memsDiv.style.display = 'none';

    [...leaders.slice(1), ...others].forEach(p => {
      const m = document.createElement('div');
      m.className = 'card';
      m.setAttribute('data-rank', getRank(p.Role));
      m.innerHTML = `
        ${p.Name}<br><small>${p.Role}</small>
        <span class="edit" onclick="openEdit(event,'${p.Name}','${p.Role}','${p.Status}','${p.Team}')">✏️</span>
      `;
      memsDiv.appendChild(m);
    });

    groupDiv.appendChild(memsDiv);
    tree.appendChild(groupDiv);
  });
}

function toggleTeam(teamName) {
  const d = document.getElementById(`team-${teamName}`);
  if (d) d.style.display = d.style.display === 'none' ? 'flex' : 'none';
}

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

  // 用 URLSearchParams 发起 simple POST，不触发 CORS 预检
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
    init();  // 重新拉数据并渲染
  })
  .catch(err => {
    console.error("保存失败：", err);
    alert("保存失败，请检查控制台错误");
  });
}







