const BBR_CLUBS = [
    '#CQYU8RQP',
    '#2Q8LGGUQY',
    '#820QG8Q2V',
    '#2LVV8J8C8',
    '#80GYP9LCG',
    '#80LJYQ982',
    '#80VCJU8LV',
    '#2CRUQ29LL'
];

let clubChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSearch();
    loadDashboardData();
});

function initTabs() {
    const buttons = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            buttons.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}
async function verMembrosDoClube(tag) {
    const cleanTag = tag.replace('#', '');
    const modal = document.getElementById('club-modal');
    const nameEl = document.getElementById('modal-club-name');
    const tagEl = document.getElementById('modal-club-tag');
    const listEl = document.getElementById('modal-members-list');

    try {
        listEl.innerHTML = '<p>Carregando membros...</p>';
        modal.style.display = 'flex';

        const response = await fetch(`/api/club/${cleanTag}`);
        if (!response.ok) throw new Error('Clube não encontrado');
        
        const clubData = await response.json();
        nameEl.innerText = clubData.name;
        tagEl.innerText = clubData.tag;
        listEl.innerHTML = '';

        if (clubData.members && clubData.members.length > 0) {
            clubData.members.forEach(member => {
                const memberCard = document.createElement('div');
                memberCard.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333;';
                
                memberCard.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="https://cdn.brawlify.com/profile-icons/regular/${member.icon?.id || 28000000}.png" width="32" height="32" style="border-radius: 50%;">
                        <div>
                            <strong>${member.name}</strong>
                            <div style="font-size: 12px; color: #aaa;">${member.tag}</div>
                        </div>
                    </div>
                    <span>🏆 ${member.trophies.toLocaleString()}</span>
                `;
                listEl.appendChild(memberCard);
            });
        } else {
            listEl.innerHTML = '<p>Nenhum membro encontrado.</p>';
        }

    } catch (error) {
        console.error('Erro ao buscar membros:', error);
        listEl.innerHTML = '<p style="color: #ff5555;">Erro ao carregar membros do clube.</p>';
    }
}

async function fetchClubData(tag) {
    try {
        const cleanTag = tag.replace('#', '');
        const res = await fetch(`/api/club/${cleanTag}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        return null;
    }
}

async function loadDashboardData() {
    const clubGrid = document.getElementById('club-grid');
    
    if (clubGrid) clubGrid.innerHTML = '<p class="subtext">Carregando clubes...</p>';

    const clubPromises = BBR_CLUBS.map(tag => fetchClubData(tag));
    const clubResults = await Promise.all(clubPromises);
    
    const validClubs = clubResults.filter(club => club !== null);

    if (clubGrid) {
        clubGrid.innerHTML = '';
        if (validClubs.length === 0) {
            clubGrid.innerHTML = '<p class="subtext">Aguardando chave de API ou liberação de IP para carregar os dados.</p>';
        }
    }

    const clubNames = [];
    const clubTrophies = [];
    let allMembers = [];

    validClubs.forEach(club => {
        clubNames.push(club.name);
        clubTrophies.push(club.trophies || 0);

        if (clubGrid) {
            const card = document.createElement('div');
            card.className = 'club-card';
            card.style.cursor = 'pointer';
            card.onclick = () => verMembrosDoClube(club.tag);
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <img src="https://cdn.brawlify.com/club-badges/regular/${club.badgeId || 16000000}.png"
                         alt="Badge ${club.name}"
                         style="width: 48px; height: 48px; object-fit: contain;"
                         onerror="this.src='https://cdn.brawlify.com/club-badges/regular/16000000.png'">
                    <div>
                        <h3 style="margin: 0;">${club.name}</h3>
                        <p class="subtext" style="margin: 0;">${club.tag}</p>
                    </div>
                </div>
                <p><strong>Troféus:</strong> 🏆 ${club.trophies?.toLocaleString() || 0}</p>
                <p><strong>Membros:</strong> 👥 ${club.members?.length || 0}/30</p>
            `;
            clubGrid.appendChild(card);
        }

        if (club.members) {
            club.members.forEach(member => {
                allMembers.push({
                    name: member.name,
                    trophies: member.trophies,
                    clubName: club.name
                });
            });
        }
    });

    renderRanking(allMembers);
    if (clubNames.length > 0) {
        renderChart(clubNames, clubTrophies);
    }
}

function renderRanking(members) {
    const rankingTbody = document.getElementById('ranking-tbody');
    if (!rankingTbody) return;
    
    rankingTbody.innerHTML = '';

    if (members.length === 0) {
        rankingTbody.innerHTML = '<tr><td colspan="4">Nenhum dado disponível no momento.</td></tr>';
        return;
    }

    members.sort((a, b) => b.trophies - a.trophies);

    members.forEach((player, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${index + 1}</td>
            <td><strong>${player.name}</strong></td>
            <td>${player.clubName}</td>
            <td>🏆 ${player.trophies.toLocaleString()}</td>
        `;
        rankingTbody.appendChild(tr);
    });
}

function renderChart(labels, data) {
    const canvas = document.getElementById('clubTrophiesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (clubChart) clubChart.destroy();

    clubChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Troféus',
                data: data,
                backgroundColor: 'rgba(157, 78, 221, 0.7)',
                borderColor: '#c77dff',
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#b8b8d1' },
                    grid: { color: 'rgba(199, 125, 255, 0.1)' }
                },
                x: {
                    ticks: { color: '#b8b8d1' },
                    grid: { color: 'rgba(199, 125, 255, 0.1)' }
                }
            },
            plugins: {
                legend: { labels: { color: '#ffffff' } }
            }
        }
    });
}

function initSearch() {
    const searchBtn = document.getElementById('search-btn');
    const input = document.getElementById('player-tag-input');

    if (!searchBtn || !input) return;

    searchBtn.addEventListener('click', async () => {
        const tag = input.value.trim().replace('#', '');
        if (!tag) return alert('Por favor, digite uma Tag válida.');

       try {
            const res = await fetch(`/api/players/${tag}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao buscar jogador');
            }

            renderPlayerDetails(data);
        } catch (err) {
            alert(err.message);
        }
    });
}

function renderPlayerDetails(player) {
    document.getElementById('player-details').classList.remove('hidden');
    const updateText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };
    updateText('p-name', player.name);
updateText('p-tag', player.tag);

const avatarImg = document.getElementById('player-avatar');
if (avatarImg && player.icon) {
    avatarImg.src = `https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png`;
}

    updateText('p-club', player.club?.name || 'Sem Clube');
    updateText('p-trophies', player.trophies?.toLocaleString() || 0);
    updateText('p-highest', player.highestTrophies?.toLocaleString() || 0);
    updateText('p-3v3', player['3vs3Victories']?.toLocaleString() || 0);
    updateText('p-solo', player.soloVictories?.toLocaleString() || 0);
    updateText('p-duo', player.duoVictories?.toLocaleString() || 0);
    updateText('p-exp', player.expLevel || 0);

    updateText('p-brawlers-count', player.brawlers ? `${player.brawlers.length} / 80+` : '0');
    updateText('p-champ', player.isQualifiedFromChampionshipChallenge ? 'Sim' : 'Não');

    if (player.brawlers && player.brawlers.length > 0) {
        const sortedBrawlers = [...player.brawlers].sort((a, b) => b.trophies - a.trophies);
        
        const best = sortedBrawlers[0];
        const worst = sortedBrawlers[sortedBrawlers.length - 1];

        updateText('best-brawler-name', best.name);
        updateText('best-brawler-trophies', `${best.trophies} 🏆`);

        updateText('worst-brawler-name', worst.name);
        updateText('worst-brawler-trophies', `${worst.trophies} 🏆`);
    }
}

initSearch();