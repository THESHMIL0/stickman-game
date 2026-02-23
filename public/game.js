const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- MOBILE FULLSCREEN SETUP ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Call once to set initial size

let players = {};

// --- MULTIPLAYER SETUP ---
socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; });
socket.on('newPlayer', (playerInfo) => { players[playerInfo.id] = playerInfo.player; });
socket.on('playerDisconnected', (playerId) => { delete players[playerId]; });

socket.on('playerUpdated', (data) => {
    if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
        players[data.id].isAttacking = data.isAttacking;
        players[data.id].facingRight = data.facingRight;
    }
});

// --- MOBILE CONTROLS (Nipple.js & Attack Button) ---
let joystickVector = { x: 0, y: 0 };
let myPlayerState = { isAttacking: false, facingRight: true };

// Initialize Joystick
const joystick = nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'blue'
});

// Read joystick input
joystick.on('move', (evt, data) => {
    // data.vector gives us a normalized value (between -1 and 1) for x and y
    joystickVector.x = data.vector.x;
    // Nipplejs Y is inverted compared to canvas Y
    joystickVector.y = -data.vector.y; 
    
    // Determine facing direction
    if (joystickVector.x > 0) myPlayerState.facingRight = true;
    if (joystickVector.x < 0) myPlayerState.facingRight = false;
});

joystick.on('end', () => {
    joystickVector = { x: 0, y: 0 };
});

// Read Attack Button input
const attackBtn = document.getElementById('attack-btn');
// Use pointer events for better touch support
attackBtn.addEventListener('pointerdown', () => { myPlayerState.isAttacking = true; });
attackBtn.addEventListener('pointerup', () => { myPlayerState.isAttacking = false; });
attackBtn.addEventListener('pointerleave', () => { myPlayerState.isAttacking = false; });


// --- ANIMATION & DRAWING ---
let frameCount = 0; // Used to track time for animations

function drawStickman(x, y, color, isAttacking, facingRight, isMoving) {
    ctx.save();
    ctx.translate(x, y);
    
    // Flip canvas horizontally if facing left
    if (!facingRight) {
        ctx.scale(-1, 1);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    
    // Calculate animation variables
    // Math.sin creates an oscillating number back and forth over time
    let walkCycle = isMoving ? Math.sin(frameCount * 0.2) * 15 : 0; 
    let armSwing = isMoving ? Math.sin(frameCount * 0.2) * 10 : 0;
    
    // Head
    ctx.beginPath();
    ctx.arc(0, -40, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // Legs (Animated walking)
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-15 + walkCycle, 40); // Back leg
    ctx.moveTo(0, 10);
    ctx.lineTo(15 - walkCycle, 40);  // Front leg
    ctx.stroke();

    // Arms & Sword (Animated)
    if (isAttacking) {
        // Attack Animation (Sword swing)
        // Back arm holds steady
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-20, 5);
        ctx.stroke();
        
        // Front arm swings down
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(25, -5); // Arm forward
        ctx.stroke();
        
        // Draw Sword (Grey line)
        ctx.strokeStyle = "grey";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(25, -5); // Handle at hand
        ctx.lineTo(50, 10); // Blade points down
        ctx.stroke();
        
    } else {
        // Idle/Walking Arms
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-20 + armSwing, -5); // Back arm
        ctx.moveTo(0, -15);
        ctx.lineTo(20 - armSwing, -5);  // Front arm
        ctx.stroke();
    }
    
    ctx.restore();
}

// --- GAME LOOP ---
const speed = 4;

function update() {
    frameCount++; // Advance time
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (players[socket.id]) {
        let myPlayer = players[socket.id];
        let oldX = myPlayer.x;
        let oldY = myPlayer.y;

        // Apply joystick movement
        myPlayer.x += joystickVector.x * speed;
        myPlayer.y += joystickVector.y * speed;
        
        // Keep player inside the canvas
        myPlayer.x = Math.max(20, Math.min(canvas.width - 20, myPlayer.x));
        myPlayer.y = Math.max(50, Math.min(canvas.height - 50, myPlayer.y));

        let hasMovedOrAttacked = 
            (myPlayer.x !== oldX) || 
            (myPlayer.y !== oldY) || 
            (myPlayer.isAttacking !== myPlayerState.isAttacking);

        // Update local state
        myPlayer.isAttacking = myPlayerState.isAttacking;
        myPlayer.facingRight = myPlayerState.facingRight;

        // Send updates to server
        if (hasMovedOrAttacked) {
            socket.emit('playerUpdate', { 
                x: myPlayer.x, 
                y: myPlayer.y,
                isAttacking: myPlayer.isAttacking,
                facingRight: myPlayer.facingRight
            });
        }
    }

    // Draw everyone
    for (let id in players) {
        let p = players[id];
        let color = (id === socket.id) ? 'blue' : 'red'; 
        
        // We consider them "moving" if they are updating positions rapidly
        // (For simplicity in this step, we'll animate walking if they are moving locally, 
        // though true network animation sync requires a bit more logic we can add later).
        let isMovingLocal = (id === socket.id && (joystickVector.x !== 0 || joystickVector.y !== 0));
        
        drawStickman(p.x, p.y, color, p.isAttacking, p.facingRight, isMovingLocal);
    }

    requestAnimationFrame(update);
}

update();