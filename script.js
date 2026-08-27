const ICON_TROPHY = "https://cdn.brawlify.com/icon/trophy.png";
const ICON_3V3 = "https://cdn.brawlify.com/game-modes/regular/3v3.png";
const ICON_SOLO = "https://cdn.brawlify.com/game-modes/regular/soloShowdown.png";
const ICON_DUO = "https://cdn.brawlify.com/game-modes/regular/duoShowdown.png";
const ICON_EXP = "https://cdn.brawlify.com/icon/exp.png";
const ICON_CLUB = "https://cdn.brawlify.com/icon/club.png";

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
                            <div style="font-size: 12px; color: #aaa;">${member.role}</div>
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
            const res = await fetch(`/api/player/${tag}`);
            if (!res.ok) throw new Error('Jogador não encontrado ou erro na API');
            
            const player = await res.json();
            renderPlayerDetails(player);
        } catch (err) {
            alert(err.message);
        }
    });
}

function renderPlayerDetails(player) {
    // 1. Preenche as estatísticas básicas (com os novos ícones)
    const statsContainer = document.getElementById('player-result');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
        <div class="player-card" style="padding: 16px; background: #1e1e2e; border-radius: 8px; color: white; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #55ff55;">${player.name} <span style="font-size: 14px; color: #aaa;">(${player.tag})</span></h3>
            
            <p>
                <img src="${ICON_CLUB}" width="20" height="20" style="vertical-align: middle; margin-right: 6px;" alt="Clube">
                <strong>Clube:</strong> ${player.club?.name || 'Sem clube'}
            </p>
            <p>
                <img src="${ICON_TROPHY}" width="20" height="20" style="vertical-align: middle; margin-right: 6px;" alt="Troféus">
                <strong>Troféus:</strong> ${player.trophies?.toLocaleString() || 0}
            </p>
            <p>
                <img src="${ICON_3V3}" width="20" height="20" style="vertical-align: middle; margin-right: 6px;" alt="Vitórias 3v3">
                <strong>Vitórias 3v3:</strong> ${player['3vs3Victories']?.toLocaleString() || 0}
            </p>
            <p>
                <img src="${ICON_SOLO}" width="20" height="20" style="vertical-align: middle; margin-right: 6px;" alt="Vitórias Solo">
                <strong>Vitórias Solo:</strong> ${player.soloVictories?.toLocaleString() || 0}
            </p>
            <p>
                <img src="${ICON_DUO}" width="20" height="20" style="vertical-align: middle; margin-right: 6px;" alt="Vitórias Dupla">
                <strong>Vitórias Dupla:</strong> ${player.duoVictories?.toLocaleString() || 0}
            </p>
            <p>
                <img src="${ICON_EXP}" width="20" height="20" style="vertical-align: middle; margin-right: 6px;" alt="Nível de EXP">
                <strong>Nível de EXP:</strong> ${player.expLevel || 0}
            </p>
            <p>
                <strong>Brawlers:</strong> ${player.brawlers ? `${player.brawlers.length} / 80+` : 0}
            </p>
            <p>
                <strong>Qualificado p/ Campeonato:</strong> ${player.isQualifiedFromChampionshipChallenge ? 'Sim' : 'Não'}
            </p>
        </div>
    `;

    // 2. Preenche os Melhores/Piores Brawlers (mantendo sua lógica original)
    if (player.brawlers && player.brawlers.length > 0) {
        const sortedBrawlers = [...player.brawlers].sort((a, b) => b.trophies - a.trophies);
        
        const best = sortedBrawlers[0];
        const worst = sortedBrawlers[sortedBrawlers.length - 1];

        // Certifique-se que esses IDs existem no seu HTML
        const bestNameEl = document.getElementById('best-brawler-name');
        const bestTrophiesEl = document.getElementById('best-brawler-trophies');
        const worstNameEl = document.getElementById('worst-brawler-name');
        const worstTrophiesEl = document.getElementById('worst-brawler-trophies');

        if (bestNameEl) bestNameEl.textContent = best.name;
        if (bestTrophiesEl) bestTrophiesEl.innerHTML = `<img src="${ICON_TROPHY}" width="16" height="16" style="vertical-align: middle;"> ${best.trophies}`;
        
        if (worstNameEl) worstNameEl.textContent = worst.name;
        if (worstTrophiesEl) worstTrophiesEl.innerHTML = `<img src="${ICON_TROPHY}" width="16" height="16" style="vertical-align: middle;"> ${worst.trophies}`;
    }
}