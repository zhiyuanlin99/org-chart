window.addEventListener('DOMContentLoaded', init);

let currentEditing = ''; // 用于存储旧名字

function init() {
  // 用 opensheet.elk.sh 来获取 Sheet 数据，避免 CORS 问题
  fetch("https://opensheet.elk.sh/1jafM-dFLb4T-wb7nAxspx6befDCdTgMXdOwFBzE1LXA/Sheet1")
    .then(response => response.json())
    .then(data => renderByHierarchy(data))
    .catch(err => console.error("Error loading data:", err));
}

function getRank(role) {
  const r = role.toLowerCase();
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
  data.forEach(person => {
    if (!grouped[person.Team]) grouped[person.Team] = [];
    grouped[person.Team].push(person);
  });

  for (const [teamName, members] of Object.entries(grouped)) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'team-group';

    const leaders = members.filter(p => isLeader(p.Role));
    const others = members.filter(p => !isLeader(p.Role));
    const leader = leaders.length > 0 ? leaders[0] : others.shift();

    const leaderCard = document.createElement('div');
    leaderCard.className = 'card team-lead';
    leaderCard.setAttribute('data-rank', getRank(leader.Role));
    leaderCard.innerHTML = `
      ${leader.Name}<br><small>${leader.Role}</small>
    `;
    leaderCard.onclick = () => toggleTeam(teamName);
    groupDiv.appendChild(leaderCard);

    const membersDiv = document.createElement('div');
    membersDiv.className = 'team-members';
    membersDiv.id = `team-${teamName}`;
    membersDiv.style.display = 'none';

    [...leaders.slice(1), ...others].forEach(person => {
      const memberCard = document.createElement('div');
      memberCard.className = 'card';
      memberCard.setAttribute('data-rank', getRank(person.Role));
      memberCard.innerHTML = `
        ${person.Name}<br><small>${person.Role}</small>
        <span class="edit" onclick="openEdit(event, '${person.Name}', '${person.Role}', '${person.Status}', '${person.Team}')">✏️</span>
      `;
      membersDiv.appendChild(memberCard);
    });

    groupDiv.appendChild(membersDiv);
    tree.appendChild(groupDiv);
  }
}

function toggleTeam(teamName) {
  const teamDiv = document.getElementById(`team-${teamName}`);
  if (teamDiv) {
    teamDiv.style.display = teamDiv.style.display === 'none' ? 'flex' : 'none';
  }
}

function openEdit(event, name, role, status, team) {
  event.stopPropagation();
  currentEditing = name; // 记录原名字
  document.getElementById('editName').value = name;
  document.getElementById('editRole').value = role || '';
  document.getElementById('editStatus').value = status || 'Active';
  document.getElementById('editTeam').value = team || 'Operations';
  document.getElementById('editModal').style.display = 'flex';
}

function closeEdit() {
  document.getElementById('editModal').style.display = 'none';
}

function saveEdit() {
  const newName = document.getElementById('editName').value;
  const newRole = document.getElementById('editRole').value;
  const newStatus = document.getElementById('editStatus').value;
  const newTeam = document.getElementById('editTeam').value;

  fetch("https://script.google.com/macros/s/AKfycbxLHTcjQZ3ovUsl5VDo_E1zF7KfxwZiy_QDLRgPVQRrylBXkHLZ5etvV6W_lf3Sy0DGaA/exec", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      oldName: currentEditing,
      name: newName,
      role: newRole,
      status: newStatus,
      team: newTeam
    })
  })
  .then(response => response.text()) // ⬅️ 接收文本结果（"Updated" 或 "Added"）
  .then(text => {
    alert(`响应结果：${text}`);
    closeEdit();
    location.reload();
  })
  .catch(err => {
    alert("保存失败：" + err);
  });
}






