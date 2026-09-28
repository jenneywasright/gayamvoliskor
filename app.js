const app = (function() {
  const STORAGE_KEY = 'volleyball_matches';
  let matches = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let currentMatch = null;
  let activeModalScoringTeam = null; // 'A' or 'B'

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const getById = (id) => document.getElementById(id);
  
  const navTo = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    getById(viewId).classList.add('active');
  };

  const startMatch = () => {
    const name = getById('setup-match-name').value || 'Pertandingan Persahabatan';
    const teamAName = getById('setup-team-a-name').value || 'Tim A';
    const teamBName = getById('setup-team-b-name').value || 'Tim B';
    
    // Extract ID and Name if user types "A1 Budi"
    const parsePlayers = (str) => str.split(',').map(p => p.trim()).filter(p => p).map(raw => {
      const parts = raw.split(' ');
      const shortId = parts.length > 1 ? parts[0] : raw.substring(0,2).toUpperCase();
      const pName = parts.length > 1 ? parts.slice(1).join(' ') : raw;
      return { id: generateId(), shortId, name: pName };
    });

    currentMatch = {
      id: generateId(),
      name,
      date: new Date().toLocaleString('id-ID'),
      status: 'LIVE',
      teamA: { id: 'A', name: teamAName, players: parsePlayers(getById('setup-team-a-players').value) },
      teamB: { id: 'B', name: teamBName, players: parsePlayers(getById('setup-team-b-players').value) },
      events: []
    };

    matches.push(currentMatch);
    save();
    
    // Reset forms
    ['setup-match-name', 'setup-team-a-name', 'setup-team-b-name', 'setup-team-a-players', 'setup-team-b-players'].forEach(id => getById(id).value = '');
    initLiveScoreboard();
  };

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
    const playerStats = {}; 
    const allPlayers = [...currentMatch.teamA.players, ...currentMatch.teamB.players];
    
    allPlayers.forEach(p => {
      playerStats[p.id] = { ...p, attack: 0, error: 0, teamName: currentMatch.teamA.players.includes(p) ? currentMatch.teamA.name : currentMatch.teamB.name, teamKey: currentMatch.teamA.players.includes(p) ? 'A' : 'B' };
    });

    const enrichedEvents = currentMatch.events.map(ev => {
      if (ev.scoringTeam === 'A') scoreA++; else scoreB++;
      if (playerStats[ev.playerId]) {
        if (ev.sourceType === 'ATTACK') playerStats[ev.playerId].attack++;
        if (ev.sourceType === 'OPPONENT_ERROR') playerStats[ev.playerId].error++;
      }
      return { ...ev, scoreAtTime: `${scoreA} - ${scoreB}` };
    });

    getById('live-score-a').textContent = scoreA;
    getById('live-score-b').textContent = scoreB;

    renderTopSkor(Object.values(playerStats));
    renderTopError(Object.values(playerStats));
    renderSorotan(enrichedEvents, playerStats);
  };

  const renderTopSkor = (statsArray) => {
    const sorted = statsArray.filter(p => p.attack > 0).sort((a, b) => b.attack - a.attack).slice(0, 3);
    const list = getById('list-top-skor');
    list.innerHTML = sorted.length ? '' : '<p style="font-size:13px; color:#6e7a8a;">Belum ada data skor.</p>';
    
    sorted.forEach((p, index) => {
      const avatarClass = p.teamKey === 'A' ? 'avatar-blue' : 'avatar-red';
      list.innerHTML += `
        <div class="stat-item">
          <span class="stat-rank">${index + 1}.</span>
          <div class="player-avatar ${avatarClass}">${p.shortId}</div>
          <div class="stat-info">
            <div class="stat-name">${p.name}</div>
            <div class="stat-sub">${p.teamName}</div>
          </div>
          <div class="stat-value-container">
            <div class="stat-value">${p.attack}</div>
            <div class="stat-label">point</div>
          </div>
        </div>`;
    });
  };

  const renderTopError = (statsArray) => {
    const sorted = statsArray.filter(p => p.error > 0).sort((a, b) => b.error - a.error).slice(0, 3);
    const list = getById('list-top-error');
    list.innerHTML = sorted.length ? '' : '<p style="font-size:13px; color:#6e7a8a;">Belum ada data error.</p>';
    
    sorted.forEach((p, index) => {
      const avatarClass = p.teamKey === 'A' ? 'avatar-blue' : 'avatar-red';
      list.innerHTML += `
        <div class="stat-item">
          <span class="stat-rank">${index + 1}.</span>
          <div class="player-avatar ${avatarClass}">${p.shortId}</div>
          <div class="stat-info">
            <div class="stat-name">${p.name}</div>
            <div class="stat-sub">${p.teamName}</div>
          </div>
          <div class="stat-value-container">
            <div class="stat-value">${p.error}</div>
            <div class="stat-label">error</div>
          </div>
        </div>`;
    });
  };

  const renderSorotan = (events, statsDict) => {
    const recent = [...events].reverse().slice(0, 4);
    const list = getById('list-sorotan');
    list.innerHTML = recent.length ? '' : '<p style="font-size:13px; color:#6e7a8a;">Belum ada riwayat poin.</p>';

    recent.forEach((ev) => {
      const player = statsDict[ev.playerId] || { shortId: '?', name: 'Unknown', teamName: 'Unknown' };
      const isAttack = ev.sourceType === 'ATTACK';
      const iconHtml = isAttack ? '<span class="icon-up">↗</span>' : '<span class="icon-shield">🛡️</span>';
      
      list.innerHTML += `
        <div class="stat-item history-item">
          <div class="player-avatar">${iconHtml}</div>
          <div class="stat-info">
            <div class="stat-name" style="color: ${isAttack ? 'var(--blue)' : 'var(--red)'};">${player.shortId} <span style="font-weight:500; color:var(--text);">${isAttack ? 'Attack' : 'Error'}</span></div>
            <div class="stat-sub">${player.teamName}</div>
          </div>
          <div class="stat-value-container">
            <div class="stat-value">${ev.scoreAtTime}</div>
            <div class="stat-label">${new Date(ev.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
        </div>`;
    });
  };

  const promptPoint = (team) => {
    activeModalScoringTeam = team;
    getById('modal-scoring-team-name').textContent = team === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name;
    getById('modal-step-source').classList.remove('hidden');
    getById('modal-step-player').classList.add('hidden');
    getById('modal-point').classList.remove('hidden');
  };

  const selectSource = (sourceType) => {
    const targetTeam = sourceType === 'ATTACK' 
      ? (activeModalScoringTeam === 'A' ? currentMatch.teamA : currentMatch.teamB) 
      : (activeModalScoringTeam === 'A' ? currentMatch.teamB : currentMatch.teamA);

    getById('modal-step-source').classList.add('hidden');
    getById('modal-step-player').classList.remove('hidden');
    
    const actionText = sourceType === 'ATTACK' ? 'melakukan Attack' : 'melakukan Error';
    getById('modal-player-prompt').innerHTML = `Siapa dari <b>${targetTeam.name}</b> yang ${actionText}?`;

    const playerList = getById('modal-player-list');
    playerList.innerHTML = '';
    
    targetTeam.players.forEach(p => {
      const btnClass = targetTeam.id === 'A' ? 'btn-blue' : 'btn-danger';
      playerList.innerHTML += `<button onclick="app.recordPoint('${sourceType}', '${p.id}')" class="${btnClass}" style="padding: 10px;">${p.shortId} - ${p.name}</button>`;
    });
    
    playerList.innerHTML += `<button onclick="app.recordPoint('${sourceType}', 'UNKNOWN')" class="btn-outline" style="grid-column: 1 / -1;">Lewati (Pemain Tidak Diketahui)</button>`;
  };

  const recordPoint = (sourceType, playerId) => {
    currentMatch.events.push({
      id: generateId(), scoringTeam: activeModalScoringTeam, sourceType, playerId, timestamp: new Date().getTime()
    });
    save();
    closeModal();
    renderScoreboard();
  };

  const undoLastPoint = () => {
    if (currentMatch.events.length === 0) return;
    if (confirm('Batalkan riwayat poin terakhir?')) {
      currentMatch.events.pop();
      save();
      renderScoreboard();
    }
  };

  const closeModal = () => getById('modal-point').classList.add('hidden');

  const finishMatch = () => {
    if(!confirm('Akhiri pertandingan dan simpan hasil?')) return;
    currentMatch.status = 'FINISHED';
    save();
    showHistory();
  };

  const showHistory = () => {
    const list = getById('history-list');
    list.innerHTML = '';
    if (matches.length === 0) {
      list.innerHTML = '<p class="text-center" style="color:var(--secondary)">Belum ada pertandingan.</p>';
    } else {
      [...matches].reverse().forEach(m => {
        let sA = m.events.filter(e => e.scoringTeam === 'A').length;
        let sB = m.events.filter(e => e.scoringTeam === 'B').length;
        list.innerHTML += `
          <div class="card" style="margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h4 style="margin-bottom:4px;">${m.name}</h4>
              <p style="font-size:13px; color:var(--secondary)">${m.date} - ${m.status}</p>
              <p style="font-weight:600; margin-top:8px;">${m.teamA.name} (${sA}) vs ${m.teamB.name} (${sB})</p>
            </div>
            ${m.status === 'LIVE' ? `<button class="btn-blue" style="width:auto; padding:8px 16px;" onclick="app.resumeMatch('${m.id}')">Lanjut</button>` : ''}
          </div>`;
      });
    }
    navTo('view-history');
  };

  const resumeMatch = (id) => { currentMatch = matches.find(m => m.id === id); initLiveScoreboard(); };

  return { navTo, startMatch, promptPoint, selectSource, recordPoint, closeModal, undoLastPoint, finishMatch, showHistory, resumeMatch };
})();
