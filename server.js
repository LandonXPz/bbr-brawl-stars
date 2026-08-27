require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const API_BASE_URL = 'https://api.brawlstars.com/v1';
const HEADERS = () => ({
    Authorization: `Bearer ${process.env.SUPERCELL_API_KEY}`
});

app.get('/api/meu-ip', async (req, res) => {
    try {
        const ipRes = await axios.get('https://api.ipify.org?format=json');
        res.json({ ip: ipRes.data.ip });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter IP' });
    }
});

app.get('/api/club/:tag', async (req, res) => {
    try {
        const clubTag = encodeURIComponent(req.params.tag.replace('#', ''));
        const response = await axios.get(`${API_BASE_URL}/clubs/%23${clubTag}`, { headers: HEADERS() });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: 'Erro ao buscar dados do clube.' });
    }
});

app.get('/api/club/:tag/members', async (req, res) => {
    try {
        const clubTag = encodeURIComponent(req.params.tag.replace('#', ''));
        const response = await axios.get(`${API_BASE_URL}/clubs/%23${clubTag}/members`, { headers: HEADERS() });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: 'Erro ao buscar membros do clube.' });
    }
});

app.get('/api/player/:tag', async (req, res) => {
    try {
        const playerTag = encodeURIComponent(req.params.tag.replace('#', ''));
        const response = await axios.get(`${API_BASE_URL}/players/%23${playerTag}`, { headers: HEADERS() });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: 'Erro ao buscar perfil do jogador.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});