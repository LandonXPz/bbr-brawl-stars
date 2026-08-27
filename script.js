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
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <img src="https://cdn.brawlify.com/club-badges/regular/${club.badgeId}.png" 
                         alt="Badge ${club.name}" 
                         style="width: 48px; height: 48px; object-fit: contain;"
                         onerror="this.src='https://cdn.brawlify.com/club-badges/regular/0.png'">
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
    const detailsContainer = document.getElementById('player-details');
    if (detailsContainer) detailsContainer.classList.remove('hidden');

    const avatarImg = document.getElementById('player-avatar');
    if (avatarImg && player.icon && player.icon.id) {
        avatarImg.src = 'https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png';
        avatarImg.onerror = () => {
            avatarImg.src = 'https://cdn.brawlify.com/profile-icons/regular/28000000.png';
        };
    }

    document.getElementById('p-name').textContent = player.name;
    document.getElementById('p-tag').textContent = player.tag;
    document.getElementById('p-trophies').textContent = player.trophies?.toLocaleString() || 0;
    document.getElementById('p-highest').textContent = player.highestTrophies?.toLocaleString() || 0;
    document.getElementById('p-3v3').textContent = player['3vs3Victories']?.toLocaleString() || 0;

    if (player.brawlers && player.brawlers.length > 0) {
        const sortedBrawlers = [...player.brawlers].sort((a, b) => b.trophies - a.trophies);
        
        const best = sortedBrawlers[0];
        const worst = sortedBrawlers[sortedBrawlers.length - 1];

        document.getElementById('best-brawler-name').textContent = best.name;
        document.getElementById('best-brawler-trophies').textContent = `${best.trophies} 🏆`;

        document.getElementById('worst-brawler-name').textContent = worst.name;
        document.getElementById('worst-brawler-trophies').textContent = `${worst.trophies} 🏆`;
    }
}