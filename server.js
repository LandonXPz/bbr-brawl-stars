const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve arquivos estáticos da pasta atual ou da pasta public
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal (Garante o envio do index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        }
    });
});

// Imprime o IP nos logs
https.get('https://api.ipify.org', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('>>> IP DE SAIDA NO RENDER:', data.trim());
    });
}).on('error', () => {});

app.get('/api/club/:tag', async (req, res) => {
    const clubTag = req.params.tag;
    const apiKey = process.env.SUPERCELL_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Chave de API não configurada.' });

    try {
        const response = await fetch(`https://api.brawlstars.com/v1/clubs/%23${clubTag}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return res.status(response.status).json({ error: 'Erro ao buscar clube' });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

app.get('/api/players/:tag', async (req, res) => {
    const playerTag = req.params.tag;
    const apiKey = process.env.SUPERCELL_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'Chave de API não configurada.' });

    try {
       const response = await fetch(`https://api.brawlstars.com/v1/players/%23${playerTag}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return res.status(response.status).json({ error: 'Erro ao buscar jogador' });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});


/* Teste isolado do Megacofre — histórico de batalhas */
const megaPigTestCache = new Map();
let megaPigLastRequest = 0;
const MEGAPIG_TEST_CACHE_MS = 5 * 60 * 1000;

app.get('/api/megacofre/teste/:tag', async (req, res) => {
    const tag = String(req.params.tag || '')
        .replace(/^#/, '')
        .toUpperCase();

    if (!/^[0289PYLQGRJCUV]{3,15}$/.test(tag)) {
        return res.status(400).json({
            error: 'Tag de jogador inválida'
        });
    }

    const apiKey = process.env.SUPERCELL_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'Chave da API não configurada'
        });
    }

    const cached = megaPigTestCache.get(tag);

    if (
        cached &&
        Date.now() - cached.time < MEGAPIG_TEST_CACHE_MS
    ) {
        return res.json({
            ...cached.data,
            cached: true
        });
    }

    // Limita novos testes a uma consulta por minuto.
    if (Date.now() - megaPigLastRequest < 60000) {
        res.set('Retry-After', '60');

        return res.status(429).json({
            error: 'Aguarde um minuto para outro teste'
        });
    }

    megaPigLastRequest = Date.now();

    try {
        const response = await fetch(
            'https://api.brawlstars.com/v1/players/%23' +
                tag + '/battlelog',
            {
                headers: {
                    Authorization: 'Bearer ' + apiKey,
                    Accept: 'application/json'
                },
                signal: AbortSignal.timeout(12000)
            }
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Falha ao consultar o histórico',
                status: response.status
            });
        }

        const data = await response.json();

        const items = Array.isArray(data.items)
            ? data.items
            : [];

        const result = {
            playerTag: '#' + tag,
            checkedAt: new Date().toISOString(),
            totalBattles: items.length,
            note: 'Teste de identificação de partidas. A API não informa diretamente ingressos restantes.',
            battles: items.map(item => ({
                battleTime: item.battleTime || null,
                eventId: item.event?.id ?? null,
                eventMode: item.event?.mode || null,
                eventMap: item.event?.map || null,
                battleMode: item.battle?.mode || null,
                battleType: item.battle?.type || null,
                result: item.battle?.result || null,
                duration: item.battle?.duration ?? null
            }))
        };

        megaPigTestCache.set(tag, {
            time: Date.now(),
            data: result
        });

        if (megaPigTestCache.size > 100) {
            megaPigTestCache.delete(
                megaPigTestCache.keys().next().value
            );
        }

        res.json(result);

    } catch (error) {
        console.error(
            'Falha no teste do Megacofre:',
            error.message
        );

        res.status(502).json({
            error: 'Não foi possível consultar o histórico'
        });
    }
});

app.get('/api/halloween', (req, res) => {
    try {
        const data = require('./halloween.json');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar dados do Halloween' });
    }
});


/* Ranking Ranqueado BBR — inicialmente Esports */
const RANKED_CLUB_TAGS = ['882UJP9GR'];
const RANKED_CACHE_MS = 15 * 60 * 1000;
let rankedCache = null;
let rankedCacheTime = 0;
let rankedRefreshPromise = null;

async function fetchRankedAPI(endpoint, apiKey) {
    const response = await fetch(
        `https://api.brawlstars.com/v1/${endpoint}`,
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(12000)
        }
    );

    if (!response.ok) {
        throw new Error(`API retornou HTTP ${response.status}`);
    }

    return response.json();
}

async function updateRankedRanking(apiKey) {
    const players = [];

    for (const clubTag of RANKED_CLUB_TAGS) {
        const club = await fetchRankedAPI(
            `clubs/%23${clubTag}`,
            apiKey
        );

        for (const member of club.members || []) {
            players.push({
                tag: member.tag,
                clubName: club.name
            });
        }
    }

    const ranking = [];
    const errors = [];

    // Consulta três jogadores por vez
    for (let i = 0; i < players.length; i += 3) {
        const batch = players.slice(i, i + 3);

        const results = await Promise.allSettled(
            batch.map(async (member) => {
                const tag = member.tag.replace('#', '');

                const player = await fetchRankedAPI(
                    `players/%23${tag}`,
                    apiKey
                );

                return {
                    tag: player.tag,
                    name: player.name,
                    iconId: player.icon?.id || 28000000,
                    clubName: member.clubName,
                    rankedElo: Number(player.rankedElo || 0),
                    rankedRank: player.rankedRank,
                    rankedRankName: player.rankedRankName
                };
            })
        );

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                ranking.push(result.value);
            } else {
                errors.push(batch[index].tag);
            }
        });
    }

    ranking.sort((a, b) => b.rankedElo - a.rankedElo);

    return {
        updatedAt: new Date().toISOString(),
        totalPlayers: players.length,
        loadedPlayers: ranking.length,
        failedPlayers: errors.length,
        complete: errors.length === 0,
        ranking
    };
}

app.get('/api/ranked', async (req, res) => {
    const apiKey = process.env.SUPERCELL_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'Chave da API não configurada'
        });
    }

    try {
        if (
            rankedCache &&
            Date.now() - rankedCacheTime < RANKED_CACHE_MS
        ) {
            return res.json(rankedCache);
        }

        if (!rankedRefreshPromise) {
            rankedRefreshPromise = updateRankedRanking(apiKey)
                .then((data) => {
                    if (data.complete) {
                        rankedCache = data;
                        rankedCacheTime = Date.now();
                    }
                    return data;
                })
                .finally(() => {
                    rankedRefreshPromise = null;
                });
        }

        const data = await rankedRefreshPromise;
        res.json(data);
    } catch (error) {
        console.error('Erro no ranking ranqueado:', error);

        if (rankedCache) {
            return res.json({
                ...rankedCache,
                stale: true
            });
        }

        res.status(502).json({
            error: 'Não foi possível atualizar o ranking'
        });
    }
});
 app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
