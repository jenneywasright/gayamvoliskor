const app = (function() {
  const STORAGE_KEY = 'volleyball_matches';
  let matches = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let currentMatch = null;
  let activeModalScoringTeam = null; // 'A' or 'B'

  // --- UTILS ---
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const getById = (id) => document.getElementById(id);
  
  // --- NAVIGATION ---
  const navTo = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    getById(viewId).classList.add('active');
  };

  // --- SETUP MATCH ---
  const startMatch = () => {
    const name = getById('setup-match-name').value || 'Pertandingan Tanpa Nama';
    const teamAName = getById('setup-team-a-name').value || 'Tim A';
    const teamBName = getById('setup-team-b-name').value || 'Tim B';
    
    // Parse players
    const parsePlayers = (str) => str.split(',').map(p => p.trim()).filter(p => p).map(name => ({ id: generateId(), name }));
    const playersA = parsePlayers(getById('setup-team-a-players').value);
    const playersB = parsePlayers(getById('setup-team-b-players').value);

    currentMatch = {
      id: generateId(),
      name,
      date: new Date().toLocaleString('id-ID'),
      status: 'LIVE',
      teamA: { id: 'A', name: teamAName, players: playersA },
      teamB: { id: 'B', name: teamBName, players: playersB },
      events: []
    };

    matches.push(currentMatch);
    save();
    
    // Reset form
    getById('setup-match-name').value = '';
    getById('setup-team-a-name').value = '';
    getById('setup-team-b-name').value = '';
    getById('setup-team-a-players').value = '';
    getById('setup-team-b-players').value = '';

    initLiveScoreboard();
  };

  // --- LIVE SCOREBOARD ---
  const initLiveScoreboard = () => {
    if (!currentMatch) return navTo('view-home');
    getById('live-match-name').textContent = currentMatch.name;
    getById('live-team-a-name').textContent = currentMatch.teamA.name;
    getById('live-team-b-name').textContent = currentMatch.teamB.name;
    
    renderScoreboard();
    navTo('view-live');
  };

  const renderScoreboard = () => {
    let scoreA = 0; let scoreB = 0;
    currentMatch.events.forEach(ev => {
      if (ev.scoringTeam === 'A') scoreA++;
      else if (ev.scoringTeam === 'B') scoreB++;
    });

    getById('live-score-a').textContent = scoreA;
    getById('live-score-b').textContent = scoreB;

    // Render Event List (last 3)
    const list = getById('live-event-list');
    list.innerHTML = '';
    const recentEvents = [...currentMatch.events].reverse().slice(0, 3);
    
    recentEvents.forEach(ev => {
      const isA = ev.scoringTeam === 'A';
      const scoringTeamName = isA ? currentMatch.teamA.name : currentMatch.teamB.name;
      const playerTeam = (ev.sourceType === 'ATTACK') ? (isA ? currentMatch.teamA : currentMatch.teamB) : (isA ? currentMatch.teamB : currentMatch.teamA);
      const player = playerTeam.players.find(p => p.id === ev.playerId);
      
      const typeText = ev.sourceType === 'ATTACK' ? 'Pukulan' : 'Error';
      const playerName = player ? player.name : 'Unknown';
      
      list.innerHTML += `<li><b>+1 ${scoringTeamName}</b> <span>${playerName} (${typeText})</span></li>`;
    });
  };

  // --- POINT RECORDING FLOW ---
  const promptPoint = (team) => {
    activeModalScoringTeam = team;
    const teamName = team === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name;
    getById('modal-scoring-team-name').textContent = teamName;
    
    getById('modal-step-source').classList.remove('hidden');
    getById('modal-step-player').classList.add('hidden');
    getById('modal-point').classList.remove('hidden');
  };

  const selectSource = (sourceType) => {
    const isTeamA = activeModalScoringTeam === 'A';
    // Jika attack, pilih pemain tim sendiri. Jika lawan error, pilih pemain lawan.
    const targetTeam = sourceType === 'ATTACK' ? 
      (isTeamA ? currentMatch.teamA : currentMatch.teamB) : 
      (isTeamA ? currentMatch.teamB : currentMatch.teamA);

    getById('modal-step-source').classList.add('hidden');
    getById('modal-step-player').classList.remove('hidden');
    
    getById('modal-player-prompt').textContent = sourceType === 'ATTACK' 
      ? `Siapa yang melakukan Attack? (${targetTeam.name})` 
      : `Siapa yang melakukan Error? (${targetTeam.name})`;

    const playerList = getById('modal-player-list');
    playerList.innerHTML = targetTeam.players.length === 0 ? '<p>Tidak ada pemain didaftarkan.</p>' : '';
    
    targetTeam.players.forEach(p => {
      playerList.innerHTML += `<button onclick="app.recordPoint('${sourceType}', '${p.id}')" class="btn-primary">${p.name}</button>`;
    });

    // Fallback jika lupa masukin pemain
    playerList.innerHTML += `<button onclick="app.recordPoint('${sourceType}', 'UNKNOWN')" class="btn-secondary" style="margin-top:10px;">Lewati (Pemain Tidak Diketahui)</button>`;
  };

  const recordPoint = (sourceType, playerId) => {
    currentMatch.events.push({
      id: generateId(),
      scoringTeam: activeModalScoringTeam,
      sourceType: sourceType,
      playerId: playerId,
      timestamp: new Date().getTime()
    });
    
    save();
    closeModal();
    renderScoreboard();
  };

  const undoLastPoint = () => {
    if (currentMatch.events.length === 0) return alert('Belum ada poin yang dicatat.');
    if (confirm('Batalkan poin terakhir?')) {
      currentMatch.events.pop();
      save();
      renderScoreboard();
    }
  };

  const closeModal = () => getById('modal-point').classList.add('hidden');

  // --- SUMMARY / STATS ---
  const finishMatch = () => {
    if(!confirm('Selesaikan pertandingan ini? Data tidak bisa diubah lagi.')) return;
    currentMatch.status = 'FINISHED';
    save();
    showSummary(currentMatch.id);
  };

  const showSummary = (matchId) => {
    currentMatch = matches.find(m => m.id === matchId);
    if(!currentMatch) return;

    let scoreA = 0; let scoreB = 0;
    const stats = {}; 
    // Format stats: { playerId: { name, attack: 0, error: 0 } }
    
    // Inisiasi stat semua pemain
    [...currentMatch.teamA.players, ...currentMatch.teamB.players].forEach(p => {
      stats[p.id] = { name: p.name, attack: 0, error: 0, team: (currentMatch.teamA.players.includes(p) ? 'A' : 'B') };
    });

    currentMatch.events.forEach(ev => {
      if (ev.scoringTeam === 'A') scoreA++;
      if (ev.scoringTeam === 'B') scoreB++;
      
      if (stats[ev.playerId]) {
        if (ev.sourceType === 'ATTACK') stats[ev.playerId].attack++;
        if (ev.sourceType === 'OPPONENT_ERROR') stats[ev.playerId].error++;
      }
    });

    getById('summary-match-name').textContent = currentMatch.name;
    getById('summary-final-score').textContent = `${scoreA} - ${scoreB}`;
    
    const container = getById('summary-stats-container');
    container.innerHTML = generateTeamStatTable(currentMatch.teamA.name, stats, 'A') + 
                          generateTeamStatTable(currentMatch.teamB.name, stats, 'B');

    navTo('view-summary');
  };

  const generateTeamStatTable = (teamName, statsDict, teamKey) => {
    const players = Object.values(statsDict).filter(p => p.team === teamKey);
    let rows = players.map(p => `
      <tr>
        <td>${p.name}</td>
        <td class="num">${p.attack}</td>
        <td class="num">${p.error}</td>
        <td class="num">${p.attack - p.error}</td>
      </tr>
    `).join('');

    if (players.length === 0) rows = `<tr><td colspan="4" class="text-center">Tidak ada data pemain</td></tr>`;

    return `
      <div class="card">
        <h3>Statistik ${teamName}</h3>
        <table>
          <thead><tr><th>Pemain</th><th class="num">Attack</th><th class="num">Error</th><th class="num">Net</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  // --- HISTORY ---
  const showHistory = () => {
    const list = getById('history-list');
    list.innerHTML = '';
    
    if (matches.length === 0) {
      list.innerHTML = '<p class="text-center">Belum ada pertandingan.</p>';
    } else {
      [...matches].reverse().forEach(m => {
        let scoreA = m.events.filter(e => e.scoringTeam === 'A').length;
        let scoreB = m.events.filter(e => e.scoringTeam === 'B').length;
        
        list.innerHTML += `
          <div class="card">
            <h4>${m.name}</h4>
            <p style="font-size:12px; color:gray; margin-bottom: 8px;">${m.date} - ${m.status}</p>
            <p><b>${m.teamA.name}</b> (${scoreA}) vs <b>${m.teamB.name}</b> (${scoreB})</p>
            <div style="margin-top: 10px;">
              ${m.status === 'LIVE' 
                ? `<button class="btn-primary btn-small" onclick="app.resumeMatch('${m.id}')">Lanjutkan</button>` 
                : `<button class="btn-secondary btn-small" onclick="app.showSummary('${m.id}')">Lihat Statistik</button>`
              }
            </div>
          </div>
        `;
      });
    }
    navTo('view-history');
  };

  const resumeMatch = (id) => {
    currentMatch = matches.find(m => m.id === id);
    initLiveScoreboard();
  };

  // Expose public API to HTML
  return {
    navTo, startMatch, promptPoint, selectSource, recordPoint, 
    closeModal, undoLastPoint, finishMatch, showSummary, showHistory, resumeMatch
  };
})();
