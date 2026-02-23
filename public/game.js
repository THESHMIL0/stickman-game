// --- 1. PWA Setup & Settings Menu ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.log);
}

let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');

// Open/Close Settings Menu
settingsBtn.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
closeSettingsBtn.addEventListener('click', () => { settingsModal.style.display = 'none'; });

// Catch the install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block'; // Show install button in settings!
});

// Handle Install Click
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') { installBtn.style.display = 'none'; }
        deferredPrompt = null;
    }
});

// --- 2. Canvas & Player Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player = {
    x: 100,
    y: 0, // Will be set in resizeCanvas
    dx: 0, dy: 0,
    speed: 6, // Slightly faster!
    animationFrame: 0 
};

// The playable area boundaries
let roadTop, roadBottom;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Define the walking field (The road)
    roadTop = canvas.height - 220;
    roadBottom = canvas.height - 40;

    // Put player on the road
    if(player.y === 0) player.y = canvas.height - 100; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); 

// --- 3. Joystick Setup ---
const joystickManager = nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static', position: { left: '50%', top: '50%' }, color: 'white'
});

joystickManager.on('move', (event, data) => {
    player.dx = data.vector.x;
    player.dy = -data.vector.y; 
});
joystickManager.on('end', () => { player.dx = 0; player.dy = 0; });

// --- 4. Attack Button ---
const atkBtn = document.getElementById('atk-btn');
atkBtn.addEventListener('touchstart', (e) => { e.preventDefault(); console.log("Attack!"); });

// --- 5. Upgraded Graphics Functions ---
function drawWorld() {
    // 1. Gradient Sky
    let skyGradient = ctx.createLinearGradient(0, 0, 0, roadTop);
    skyGradient.addColorStop(0, "#FF7E5F"); // Sunset Orange
    skyGradient.addColorStop(1, "#FEB47B"); // Soft Peach
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, roadTop);

    // 2. The Sun
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(canvas.width - 150, 100, 60, 0, Math.PI * 2);
    ctx.fill();

    // 3. The Battlefield (Road)
    ctx.fillStyle = '#4a4a4a'; // Asphalt
    ctx.fillRect(0, roadTop, canvas.width, canvas.height - roadTop);
    
    // 4. Road Lines
    ctx.strokeStyle = '#FFC107'; ctx.lineWidth = 5; ctx.setLineDash([40, 30]);
    ctx.beginPath();
    ctx.moveTo(0, roadTop + 90); ctx.lineTo(canvas.width, roadTop + 90);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash for character
}

function drawStickman(x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Draw Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 50, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    let isMoving = Math.abs(player.dx) > 0.1 || Math.abs(player.dy) > 0.1;
    if (isMoving) player.animationFrame += 0.25; 
    else player.animationFrame = 0; 
    
    let swing = Math.sin(player.animationFrame) * 18; 

    ctx.strokeStyle = '#111'; // Almost black
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Legs
    ctx.beginPath();
    ctx.moveTo(0, 20); ctx.lineTo(-10 + swing, 50); // Left
    ctx.moveTo(0, 20); ctx.lineTo(10 - swing, 50); // Right
    ctx.stroke();

    // Body & Arm
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(0, 20); // Spine
    ctx.moveTo(0, 5); ctx.lineTo(35, 10); // Gun arm pointing right
    ctx.stroke();

    // Cyber Helmet
    ctx.fillStyle = '#222';
    ctx.fillRect(-12, -35, 26, 28);
    ctx.fillStyle = '#00FFFF'; // Visor
    ctx.fillRect(2, -28, 14, 10); 

    // Blaster Gun
    ctx.fillStyle = '#777';
    ctx.fillRect(35, 5, 25, 8);
    ctx.fillStyle = '#00ccff';
    ctx.fillRect(55, 6, 8, 6); // Gun tip

    ctx.restore();
}

// --- 6. The Main Game Loop ---
function gameLoop() {
    // A. Smooth Movement Update
    player.x += player.dx * player.speed;
    player.y += player.dy * player.speed;

    // B. STRICT COLLISION (Keep player inside the field)
    if (player.x < 20) player.x = 20;
    if (player.x > canvas.width - 20) player.x = canvas.width - 20;
    // Lock Y axis to the road area ONLY!
    if (player.y < roadTop) player.y = roadTop; 
    if (player.y > roadBottom) player.y = roadBottom;

    // C. Draw Everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld();
    drawStickman(player.x, player.y);

    requestAnimationFrame(gameLoop);
}

gameLoop();
