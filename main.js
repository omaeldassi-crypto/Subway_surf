// js/main.js

let scene, camera, renderer;
let player, trackManager;
let score = 0;
let isGameOver = false;
let clock = new THREE.Clock();

// --- VARIABLES SYNC NETWORKING ---
let isMultiplayer = false;
let socket;
let remotePlayers = {}; 

function init() {
    // Étape A : Analyser l'URL pour savoir si on active le multijoueur
    const urlParams = new URLSearchParams(window.location.search);
    isMultiplayer = urlParams.get('mode') === 'multiplayer';

    // Si on est en solo, on masque proprement l'UI réseau pour ne pas encombrer l'écran
    if (!isMultiplayer) {
        const lbBox = document.getElementById('leaderboard-box');
        const chatHelp = document.getElementById('chat-help');
        if (lbBox) lbBox.style.display = 'none';
        if (chatHelp) chatHelp.style.display = 'none';
    }

    // Étape B : Initialisation de la scène 3D Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    // Caméra de poursuite (placée légèrement derrière et au-dessus du joueur)
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 7);
    camera.lookAt(0, 1, -5);

    // Moteur de rendu WebGL
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Éclairage de la scène
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Étape C : Chargement du joueur local et de la piste
    const chosenCharacter = localStorage.getItem('selectedCharacter') || "Chaser-01";
    const savedName = localStorage.getItem('multiplayer_username') || "Chaser-Anonyme";
    
    player = new Player(scene, chosenCharacter);
    if (isMultiplayer) player.name = savedName;

    // Gestionnaire de piste (génère le sol et fait défiler le décor)
    trackManager = new TrackSoloManager(scene);

    // Étape D : Connexion au serveur si le mode multijoueur est activé
    if (isMultiplayer) {
        setupNetwork();
    }

    // Gestion du redimensionnement de la fenêtre de navigation
    window.addEventListener('resize', onWindowResize, false);
    
    // Lancement de la boucle d'animation
    animate();
}

function setupNetwork() {
    // Connexion automatique au serveur qui héberge la page
    socket = io();

    // Signaler au serveur qu'on rejoint la course
    socket.emit('joinGame', {
        name: player.name,
        character: player.characterName
    });

    // Recevoir la liste des joueurs déjà en ligne à notre arrivée
    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (players[id].id !== socket.id) {
                createRemotePlayer(players[id]);
            }
        });
    });

    // Écouter quand un nouveau rival se connecte
    socket.on('newPlayer', (playerInfo) => {
        createRemotePlayer(playerInfo);
    });

    // Mettre à jour les positions 3D des rivaux lorsqu'ils bougent
    socket.on('playerMoved', (playerInfo) => {
        if (remotePlayers[playerInfo.id]) {
            remotePlayers[playerInfo.id].position.x = playerInfo.x;
            remotePlayers[playerInfo.id].position.y = playerInfo.y;
            remotePlayers[playerInfo.id].position.z = playerInfo.z;
        }
    });

    // Mise à jour en temps réel du classement HTML (Haut-Droit)
    socket.on('leaderboardUpdate', (leaderboard) => {
        const listContainer = document.getElementById('leaderboard-list');
        if (!listContainer) return;
        listContainer.innerHTML = ""; 

        leaderboard.forEach((p, index) => {
            const item = document.createElement('div');
            item.className = "leaderboard-item";
            // On colore notre propre nom en vert néon pour se repérer instantanément
            item.style.color = p.name === player.name ? "#00ffcc" : "#fff";
            item.innerHTML = `<span>${index + 1}. ${p.name}</span> <b>${p.score}m</b>`;
            listContainer.appendChild(item);
        });
    });

    // Réception et affichage d'un tchat rapide envoyé par un adversaire
    socket.on('playerMessage', (data) => {
        createTmpNotification(`${data.name}: ${data.text}`);
    });

    // Capture des touches 1, 2, 3 pour envoyer des messages prédéfinis
    window.addEventListener('keydown', (e) => {
        if (e.key === '1') socket.emit('quickChat', "Trop lent ! 🏃‍♂️");
        if (e.key === '2') socket.emit('quickChat', "Aïe ! 💥");
        if (e.key === '3') socket.emit('quickChat', "Regarde derrière toi ! 👀");
    });

    // Supprimer le modèle 3D d'un joueur s'il quitte ou perd
    socket.on('playerLogOut', (id) => {
        if (remotePlayers[id]) {
            scene.remove(remotePlayers[id]);
            delete remotePlayers[id];
        }
    });
}

function createRemotePlayer(playerInfo) {
    // Création d'un avatar 3D temporaire pour représenter les autres joueurs
    const remoteMesh = new THREE.Group();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9900ff, roughness: 0.4 });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = 0.5;
    remoteMesh.add(body);
    remoteMesh.position.set(playerInfo.x, playerInfo.y, playerInfo.z);
    
    scene.add(remoteMesh);
    remotePlayers[playerInfo.id] = remoteMesh;
}

function createTmpNotification(text) {
    // Génère une bulle de notification CSS éphémère sur l'écran
    const notif = document.createElement('div');
    notif.style.position = "absolute";
    notif.style.bottom = "120px";
    notif.style.left = "20px";
    notif.style.background = "rgba(15, 15, 35, 0.9)";
    notif.style.borderLeft = "4px solid #00ffcc";
    notif.style.color = "#fff";
    notif.style.padding = "10px 18px";
    notif.style.borderRadius = "4px";
    notif.style.fontFamily = "sans-serif";
    notif.style.fontSize = "13px";
    notif.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
    notif.style.zIndex = "100";
    notif.innerText = text;
    
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000); // Disparaît après 3 secondes
}

function animate() {
    if (isGameOver) return;

    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Mise à jour de la physique du joueur et de la piste
    trackManager.update(player.mesh.position.z, elapsedTime);
    player.update(trackManager.windForce);

    // Envoi de notre position et score au serveur (uniquement si connecté)
    if (isMultiplayer && socket && socket.connected) {
        socket.emit('playerMovement', {
            x: player.mesh.position.x,
            y: player.mesh.position.y,
            z: player.mesh.position.z,
            score: score
        });
    }

    // Placement dynamique de la caméra fluide derrière le joueur
    camera.position.z = player.mesh.position.z + 7;
    camera.lookAt(player.mesh.position.x, player.mesh.position.y + 1, player.mesh.position.z - 5);

    // Calcul du score basé sur la distance parcourue sur l'axe Z
    score = Math.floor(Math.abs(player.mesh.position.z));
    document.getElementById('hud-score').innerText = `Score: ${score}`;

    checkCollisions();
    renderer.render(scene, camera);
}

function checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(player.mesh);
    playerBox.expandByScalar(-0.1); // Réduit légèrement la hitbox pour plus de tolérance visuelle

    for (let i = 0; i < trackManager.obstacles.length; i++) {
        const obstacleMesh = trackManager.obstacles[i];
        const obstacleBox = new THREE.Box3().setFromObject(obstacleMesh);

        if (playerBox.intersectsBox(obstacleBox)) {
            // Système de bouclier (Graphene Vest)
            if (player.equipped && player.equipped.body === "graphene_vest") {
                player.equipped.body = "none";
                scene.remove(obstacleMesh);
                trackManager.obstacles.splice(i, 1);
                break; 
            } else {
                triggerGameOver();
                break;
            }
        }
    }
}

function triggerGameOver() {
    isGameOver = true;
    localStorage.setItem('lastScore', score);

    if (isMultiplayer && socket) {
        socket.emit('playerDied');
    }

    document.getElementById('game-over-screen').style.display = "flex";
    document.getElementById('final-score').innerText = score;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Lancement automatique au chargement complet de la page web
window.onload = init;