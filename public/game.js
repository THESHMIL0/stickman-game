const socket = io(); 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let players = {};

// --- MULTIPLAYER SETUP (GROUP) ---
socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; });
socket.on('newPlayer', (playerInfo) => { players[playerInfo.id] = playerInfo.player; });
socket.on('playerDisconnected', (playerId) => { delete players[playerId]; });

// Listen for other players moving
socket.on('playerMoved', (playerInfo) => {
    if (players[playerInfo.id]) {
        players[playerInfo.id].x = playerInfo.x;
        players[playerInfo.id].y = playerInfo.y;
    }
});

// --- CONTROLS ---
// Track which keys are currently being pressed
const keys = { w: false, a: false, s: false, d: false };

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// --- CHARACTER DRAWING ---
function drawStickman(x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    
    // Head
    ctx.arc(x, y - 40, 15, 0, Math.PI * 2);
    // Body spine
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x, y + 10);
    // Arms
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x - 20, y - 5);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x + 20, y - 5);
    // Legs
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x - 15, y + 40);
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + 15, y + 40);
    
    ctx.stroke();
}

// --- GAME LOOP ---
const speed = 5;

function update() {
    // 1. Clear the canvas from the last frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Move our own player
    if (players[socket.id]) {
        let myPlayer = players[socket.id];
        let moved = false;

        if (keys.w) { myPlayer.y -= speed; moved = true; }
        if (keys.s) { myPlayer.y += speed; moved = true; }
        if (keys.a) { myPlayer.x -= speed; moved = true; }
        if (keys.d) { myPlayer.x += speed; moved = true; }

        // If we moved, tell the server!
        if (moved) {
            socket.emit('playerMovement', { x: myPlayer.x, y: myPlayer.y });
        }
    }

    // 3. Draw all players
    for (let id in players) {
        let p = players[id];
        // Make our own player blue, and everyone else red
        let color = (id === socket.id) ? 'blue' : 'red'; 
        drawStickman(p.x, p.y, color);
    }

    // 4. Repeat the loop
    requestAnimationFrame(update);
}

// Start the game loop!
update();