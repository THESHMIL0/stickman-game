// --- 1. PWA & Install Setup ---
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(console.log); }
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e; installBtn.style.display = 'block';
});
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.style.display = 'none';
        deferredPrompt = null;
    }
});

// --- 2. Menu & UI Logic ---
let gameState = 'MENU'; // Can be 'MENU' or 'PLAYING'
const mainMenu = document.getElementById('main-menu');
const inGameUI = document.getElementById('in-game-ui');
const settingsModal = document.getElementById('settings-modal');

document.getElementById('btn-play').addEventListener('click', () => {
    mainMenu.style.display = 'none';
    inGameUI.style.display = 'block';
    gameState = 'PLAYING';
});

// Settings buttons (from menu and in-game)
document.getElementById('btn-menu-settings').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('settings-btn').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.style.display = 'none');

// --- 3. Canvas & Game Objects Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let roadTop, roadBottom;

let player = {
    x: 100, y: 0, dx: 0, dy: 0, speed: 5,
    animationFrame: 0, recoil: 0 // Recoil handles the arm animation!
};

let projectiles = []; // Array to hold our lasers
let enemies = [];     // Array to hold the bad guys

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    roadTop = canvas.height - 220; roadBottom = canvas.height - 40;
    if(player.y === 0) player.y = canvas.height - 100; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); 

// --- 4. Inputs (Joystick & ATK) ---
const joystickManager = nipplejs.create({
    zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white'
});
joystickManager.on('move', (evt, data) => { player.dx = data.vector.x; player.dy = -data.vector.y; });
joystickManager.on('end', () => { player.dx = 0; player.dy = 0; });

document.getElementById('atk-btn').addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    attack(); 
});
document.getElementById('atk-btn').addEventListener('mousedown', attack);

function attack() {
    if(gameState !== 'PLAYING') return;
    player.recoil = 10; // Pull arm back
    
    // Spawn a laser
    projectiles.push({
        x: player.x + 50, // Start at the gun tip
        y: player.y + 6,
        speed: 15,
        width: 20,
        height: 6
    });
}

// --- 5. Drawing Functions ---
function drawWorld() {
    let skyGradient = ctx.createLinearGradient(0, 0, 0, roadTop);
    skyGradient.addColorStop(0, "#FF7E5F"); skyGradient.addColorStop(1, "#FEB47B");
    ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, canvas.width, roadTop);

    ctx.fillStyle = "#FFD700"; ctx.beginPath(); ctx.arc(canvas.width - 150, 100, 60, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, roadTop, canvas.width, canvas.height - roadTop);
    ctx.strokeStyle = '#FFC107'; ctx.lineWidth = 5; ctx.setLineDash([40, 30]);
    ctx.beginPath(); ctx.moveTo(0, roadTop + 90); ctx.lineTo(canvas.width, roadTop + 90); ctx.stroke();
    ctx.setLineDash([]); 
}

function drawStickman(x, y, isEnemy, damageFlash) {
    ctx.save();
    
    let isMoving = isEnemy ? true : (Math.abs(player.dx) > 0.1 || Math.abs(player.dy) > 0.1);
    let animFrame = isEnemy ? (Date.now() / 150) : player.animationFrame;
    
    // Body bobbing up and down when moving
    let bob = isMoving ? Math.abs(Math.sin(animFrame)) * 4 : 0;
    ctx.translate(x, y - bob);

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath(); ctx.ellipse(0, 50 + bob, 25, 8, 0, 0, Math.PI * 2); ctx.fill();

    let swing = Math.sin(animFrame) * 18; 

    // If taking damage, draw them red! Otherwise black.
    ctx.strokeStyle = damageFlash > 0 ? 'red' : '#111'; 
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Legs
    ctx.beginPath();
    ctx.moveTo(0, 20); ctx.lineTo(-10 + swing, 50); 
    ctx.moveTo(0, 20); ctx.lineTo(10 - swing, 50); 
    ctx.stroke();

    // Body
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 20); ctx.stroke();

    if (isEnemy) {
        // Enemy Arms (holding a bat)
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-20, 15); ctx.stroke(); // Left arm
        
        // Red Bandana
        ctx.fillStyle = 'red'; ctx.fillRect(-10, -30, 20, 15);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -25, 12, 0, Math.PI*2); ctx.fill();
        
        // Baseball bat
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 5; 
        ctx.beginPath(); ctx.moveTo(-20, 15); ctx.lineTo(-40, -10); ctx.stroke();
    } else {
        // Player Arm (with Recoil animation!)
        let armPush = player.recoil > 0 ? player.recoil : 0;
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(35 - armPush, 10); ctx.stroke();

        // Cyber Helmet
        ctx.fillStyle = '#222'; ctx.fillRect(-12, -35, 26, 28);
        ctx.fillStyle = '#00FFFF'; ctx.fillRect(2, -28, 14, 10); 

        // Gun
        ctx.fillStyle = '#777'; ctx.fillRect(35 - armPush, 5, 25, 8);
        ctx.fillStyle = '#00ccff'; ctx.fillRect(55 - armPush, 6, 8, 6);
    }
    ctx.restore();
}

// --- 6. The Main Game Loop ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld(); // Always draw the world in the background

    if (gameState === 'PLAYING') {
        // A. Update Player
        player.x += player.dx * player.speed;
        player.y += player.dy * player.speed;
        if (player.x < 20) player.x = 20;
        if (player.x > canvas.width - 20) player.x = canvas.width - 20;
        if (player.y < roadTop) player.y = roadTop; 
        if (player.y > roadBottom) player.y = roadBottom;

        if (player.recoil > 0) player.recoil -= 1; // Cool down the arm recoil
        if (Math.abs(player.dx) > 0.1 || Math.abs(player.dy) > 0.1) player.animationFrame += 0.25; 
        else player.animationFrame = 0;

        // B. Spawn & Update Enemies
        if (Math.random() < 0.02) { // 2% chance per frame to spawn an enemy
            enemies.push({ x: canvas.width + 50, y: roadTop + Math.random() * (roadBottom - roadTop), hp: 3, damageFlash: 0, speed: 2 + Math.random() });
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.x -= e.speed; // Move left
            if (e.damageFlash > 0) e.damageFlash -= 1; // Cool down damage flash
            
            // If enemy goes off screen to the left, remove it
            if (e.x < -50) enemies.splice(i, 1);
        }

        // C. Update Projectiles & Check Collisions
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            p.x += p.speed;
            
            // Check collision with enemies
            let hit = false;
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                // Simple box collision
                if (p.x > e.x - 20 && p.x < e.x + 20 && p.y > e.y - 40 && p.y < e.y + 20) {
                    e.hp -= 1;
                    e.damageFlash = 10; // Flash red for 10 frames
                    hit = true;
                    if (e.hp <= 0) enemies.splice(j, 1); // Enemy dies
                    break; 
                }
            }

            if (hit || p.x > canvas.width) {
                projectiles.splice(i, 1); // Remove laser if it hits or goes off screen
            }
        }

        // D. Draw Characters & Effects
        // Draw Enemies
        enemies.forEach(e => drawStickman(e.x, e.y, true, e.damageFlash));
        
        // Draw Player
        drawStickman(player.x, player.y, false, 0);

        // Draw Projectiles
        ctx.fillStyle = '#00ffff';
        projectiles.forEach(p => {
            ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0; // Reset shadow
        });
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();
