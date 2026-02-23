// --- 1. PWA Setup (For the Install pop-up) ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Service Worker registered!"))
        .catch(err => console.log("Service Worker failed", err));
}

// --- 2. Canvas & Assets Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load Images Safely
const bgImage = new Image();
bgImage.src = 'background.png';
let bgReady = false;
bgImage.onload = () => { bgReady = true; };

const playerImage = new Image();
playerImage.src = 'player.png';
let playerReady = false;
playerImage.onload = () => { playerReady = true; };

// Player object
let player = {
    x: 100,
    y: window.innerHeight / 2, // Start in the middle of the screen
    width: 100,
    height: 120,
    dx: 0,
    dy: 0,
    speed: 5
};

// Keep canvas sized correctly
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Call once to set initial size

// --- 3. Joystick Setup ---
const joystickManager = nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'white'
});

joystickManager.on('move', (event, data) => {
    player.dx = data.vector.x;
    player.dy = -data.vector.y; 
});
joystickManager.on('end', () => { 
    player.dx = 0; 
    player.dy = 0; 
});

// --- 4. Attack Button Setup ---
const atkBtn = document.getElementById('atk-btn');
atkBtn.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    console.log("Attack!"); 
    // You can add shooting logic here later!
});
atkBtn.addEventListener('mousedown', () => { 
    console.log("Attack!"); 
});

// --- 5. Game Loop ---
function gameLoop() {
    // A. Update Player Position
    player.x += player.dx * player.speed;
    player.y += player.dy * player.speed;

    // Keep player inside the screen bounds
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // B. Draw Everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (or a brown fallback if image is missing)
    if (bgReady) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#8B5A2B'; // Brown dirt color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw player (or a blue box fallback if image is missing)
    if (playerReady) {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = '#00ccff';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // C. Loop!
    requestAnimationFrame(gameLoop);
}

// Start the loop immediately!
gameLoop();
