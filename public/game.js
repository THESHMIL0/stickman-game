// --- 1. PWA Setup ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.log);
}

// --- 2. Canvas & Assets Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load Images
const bgImage = new Image();
bgImage.src = 'background.png';
const playerImage = new Image();
playerImage.src = 'player.png';

let assetsLoaded = 0;
function onAssetLoad() {
    assetsLoaded++;
    // Only start the game loop once both images are loaded
    if (assetsLoaded === 2) {
        resizeCanvas();
        gameLoop();
    }
}
bgImage.onload = onAssetLoad;
playerImage.onload = onAssetLoad;

// Player object
let player = {
    x: 100,
    y: 300,
    width: 100, // Adjust based on your image aspect ratio
    height: 120,
    dx: 0,
    dy: 0,
    speed: 5
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

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
joystickManager.on('end', () => { player.dx = 0; player.dy = 0; });

// --- 4. Attack Button ---
const atkBtn = document.getElementById('atk-btn');
atkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); console.log("Attack!"); });
atkBtn.addEventListener('mousedown', () => { console.log("Attack!"); });

// --- 5. Game Loop ---
function gameLoop() {
    // A. Update Player Position
    player.x += player.dx * player.speed;
    player.y += player.dy * player.speed;

    // Boundary check
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // B. Drawing logic
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background (it will stretch to fill the screen)
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // 2. Draw Player Sprite
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);

    requestAnimationFrame(gameLoop);
}
// Note: gameLoop() is now called inside onAssetLoad