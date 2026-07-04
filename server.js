// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configuration de Socket.io avec gestion du CORS pour éviter les blocages de sécurité
const io = new Server(server, {
    cors: { origin: "*" }
});

// Rend accessible tout ton dossier actuel (index.html, les dossiers js/, assets/, etc.)
app.use(express.static(path.join(__dirname, '/')));

// Base de données temporaire des joueurs connectés
let players = {};

io.on('connection', (socket) => {
    console.log(`📡 Nouveau joueur connecté au réseau : ${socket.id}`);

    // Un joueur entre dans la partie multijoueur
    socket.on('joinGame', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || "Chaser-Anonyme",
            character: data.character || "Chaser-01",
            x: 0, y: 0, z: 0,
            score: 0,
            isDead: false
        };

        // 1. On lui envoie la liste des joueurs déjà présents
        socket.emit('currentPlayers', players);
        
        // 2. On signale son arrivée aux autres joueurs connectés
        socket.broadcast.emit('newPlayer', players[socket.id]);
        
        // 3. On actualise le tableau des scores global
        io.emit('leaderboardUpdate', getLeaderboard());
    });

    // Réception et diffusion des mouvements/positions en temps réel
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].score = movementData.score;

            // Optimisation : On envoie la position UNIQUEMENT aux autres (pas à soi-même)
            socket.broadcast.emit('playerMoved', players[socket.id]);
            
            // Envoi du classement mis à jour à tout le monde
            io.emit('leaderboardUpdate', getLeaderboard());
        }
    });

    // Réception d'un message du Tchat Rapide [Touches 1, 2, 3]
    socket.on('quickChat', (messageText) => {
        if (players[socket.id]) {
            io.emit('playerMessage', {
                id: socket.id,
                name: players[socket.id].name,
                text: messageText
            });
        }
    });

    // Quand un joueur percute un obstacle
    socket.on('playerDied', () => {
        if (players[socket.id]) {
            players[socket.id].isDead = true;
            // On le retire de la simulation visuelle des autres écrans
            io.emit('playerLogOut', socket.id);
            io.emit('leaderboardUpdate', getLeaderboard());
        }
    });

    // Déconnexion (fermeture de l'onglet ou perte de réseau)
    socket.on('disconnect', () => {
        console.log(`❌ Joueur déconnecté : ${socket.id}`);
        delete players[socket.id];
        io.emit('playerLogOut', socket.id);
        io.emit('leaderboardUpdate', getLeaderboard());
    });
});

// Fonction utilitaire pour générer le classement (trie les scores du plus haut au plus bas)
function getLeaderboard() {
    return Object.values(players)
        .filter(p => !p.isDead) // On n'affiche pas les joueurs morts
        .sort((a, b) => b.score - a.score)
        .map(p => ({ name: p.name, score: p.score }));
}

// Lancement du serveur sur le port 3000 (ou celui de ton hébergeur)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SERVEUR CYBER RUNNER DEMARRÉ !`);
    console.log(`🎮 Mode Solo/Multi dispo sur : http://localhost:${PORT}`);
    console.log(`====================================================`);
});