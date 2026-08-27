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

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});