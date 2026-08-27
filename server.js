const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Descobre e exibe o IP público do Render nos Logs
fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => {
        console.log('--------------------------------------------------');
        console.log('>>> SEU IP DE SAÍDA NO RENDER É:', data.ip);
        console.log('>>> Cole este IP no painel da Supercell!');
        console.log('--------------------------------------------------');
    })
    .catch(err => console.error('Erro ao buscar IP:', err));

app.get('/api/club/:tag', async (req, res) => {
    const clubTag = req.params.tag;
    const apiKey = process.env.SUPERCELL_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API não configurada.' });
    }

    try {
        const response = await fetch(`https://api.brawlstars.com/v1/clubs/%23${clubTag}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Erro ao buscar clube' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

app.get('/api/player/:tag', async (req, res) => {
    const playerTag = req.params.tag;
    const apiKey = process.env.SUPERCELL_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API não configurada.' });
    }

    try {
        const response = await fetch(`https://api.brawlstars.com/v1/players/%23${playerTag}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Erro ao buscar jogador' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});