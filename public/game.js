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

// --- 2. Game State & Save System ---
let gameState = 'MENU'; 
let myCoins = 0;
let myGems = 0;

// Save / Load System
function loadGame() {
    let savedData = localStorage.getItem('stickmanSave');
    if (savedData) {
        let data = JSON.parse(savedData);
        myCoins = data.coins || 0;
        myGems = data.gems || 0;
        currentWave = data.wave || 1;
        updateUI();
        console.log("Game Loaded!");
    }
}

function saveGame() {
    let data = { coins: myCoins, gems: myGems, wave: currentWave };
    localStorage.setItem('stickmanSave', JSON.stringify(data));
    alert("Progress Saved Successfully! 💾");
}

document.getElementById('save-btn').addEventListener('click', saveGame);

// --- 3. UI Logic ---
const mainMenu = document.getElementById('main-menu');
const inGameUI = document.getElementById('in-game-ui');
const settingsModal = document.getElementById('settings-modal');
const gameOverScreen = document.getElementById('game-over-screen');

let joystickManager;

document.getElementById('btn-play').addEventListener('click', () => {
    loadGame(); // Load when starting!
    mainMenu.style.display = 'none';
    inGameUI.style.display = 'block';
    gameState = 'PLAYING';
    
    if (!joystickManager) {
        joystickManager = nipplejs.create({
            zone: document.getElementById('joystick-zone'), 
            mode: 'static', position: { left: '50%', top: '50%' }, color: 'white'
        });
        joystickManager.on('move', (evt, data) => { 
            if(data && data.vector) { player.dx = data.vector.x; player.dy = -data.vector.y; }
        });
        joystickManager.on('end', () => { player.dx = 0; player.dy = 0; });
    }
});

document.getElementById('btn-menu-settings').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('settings-btn').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.style.display = 'none');

function updateUI() {
    document.getElementById('coin-count').innerText = myCoins;
    document.getElementById('gem-count').innerText = myGems;
    document.getElementById('wave-text').innerText = `Wave ${currentWave}`;
    let progress = (enemiesDefeated / enemiesInWave) * 100;
    document.getElementById('wave-progress-fill').style.width = `${progress}%`;
}

// --- 4. Game Objects & Waves Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let roadTop, roadBottom;

// Wave Logic Variables
let currentWave = 1;
let enemiesInWave = 5;
let enemiesSpawned = 0;
let enemiesDefeated = 0;
let waveCooldown = 0;

let player = {
    x: 200, y: 0, dx: 0, dy: 0, speed: 6, hp: 100, maxHp: 100,
    animationFrame: 0, recoil: 0, 
    gunColor: '#00ccff', visorColor: '#00FFFF' // Ready for skins!
};

// THE BASE (House)
let base = {
    x: 0, y: 0, width: 120, height: 0, // Height set in resize
    hp: 200, maxHp: 200
};

let projectiles = []; 
let enemies = [];     

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    roadTop = canvas.height * 0.45; 
    roadBottom = canvas.height - 30;
    
    base.y = roadTop - 40;
    base.height = roadBottom - roadTop + 50;

    if(player.y === 0 || player.y < roadTop) player.y = canvas.height * 0.7; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); 

document.getElementById('atk-btn').addEventListener('touchstart', (e) => { e.preventDefault(); attack(); });
document.getElementById('atk-btn').addEventListener('mousedown', attack);

function attack() {
    if(gameState !== 'PLAYING') return;
    player.recoil = 10; 
    projectiles.push({ x: player.x + 40, y: player.y + 5, speed: 18, width: 15, height: 5 });
}

// --- 5. Drawing World & Base ---
function drawWorld() {
    // Sky
    let skyGradient = ctx.createLinearGradient(0, 0, 0, roadTop);
    skyGradient.addColorStop(0, "#FF7E5F"); skyGradient.addColorStop(1, "#FEB47B");
    ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, canvas.width, roadTop);
    
    // Sun
    ctx.fillStyle = "#FFD700"; ctx.beginPath(); ctx.arc(canvas.width - 150, 100, 60, 0, Math.PI * 2); ctx.fill();
    
    // Road
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, roadTop, canvas.width, canvas.height - roadTop);
    ctx.strokeStyle = '#FFC107'; ctx.lineWidth = 4; ctx.setLineDash([30, 20]);
    ctx.beginPath(); ctx.moveTo(0, roadTop + ((roadBottom-roadTop)/2)); ctx.lineTo(canvas.width, roadTop + ((roadBottom-roadTop)/2)); ctx.stroke();
    ctx.setLineDash([]); 

    // Draw BASE
    ctx.fillStyle = '#2c3e50'; // Dark metal bunker
    ctx.fillRect(base.x, base.y, base.width, base.height);
    ctx.fillStyle = '#34495e';
    ctx.fillRect(base.x + base.width - 20, base.y, 20, base.height); // Depth
    
    // Base HP Bar
    let hpPercent = base.hp / base.maxHp;
    ctx.fillStyle = 'red'; ctx.fillRect(base.x + 10, base.y - 20, base.width - 20, 10);
    ctx.fillStyle = 'lime'; ctx.fillRect(base.x + 10, base.y - 20, (base.width - 20) * hpPercent, 10);
}

// --- 6. Stickman Drawing (Now Scaled Down!) ---
function drawStickman(x, y, isEnemy, stateData) {
    ctx.save();
    
    // CAMERA ZOOM FIX: This scales the character down by 25% so the screen feels bigger!
    ctx.translate(x, y);
    ctx.scale(0.75, 0.75); 
    
    let isMoving = (Math.abs(stateData.dx || 0) > 0.1 || Math.abs(stateData.dy || 0) > 0.1);
    let animFrame = stateData.animFrame || 0;
    let bob = isMoving ? Math.abs(Math.sin(animFrame)) * 4 : 0;
    
    ctx.translate(0, -bob);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath(); ctx.ellipse(0, 50 + bob, 25, 8, 0, 0, Math.PI * 2); ctx.fill();

    let swing = Math.sin(animFrame) * 18; 
    ctx.strokeStyle = stateData.damageFlash > 0 ? 'red' : '#111'; 
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Legs
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-10 + swing, 50); ctx.moveTo(0, 20); ctx.lineTo(10 - swing, 50); ctx.stroke();
    // Body
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 20); ctx.stroke();

    if (isEnemy) {
        // Enemy Attack Animation Math
        let batSwing = 0;
        if (stateData.attackTimer > 30) batSwing = (stateData.attackTimer - 30) * 2; // Pull back
        else if (stateData.attackTimer > 0) batSwing = -stateData.attackTimer * 3;  // Smash forward

        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-20, 15); ctx.stroke(); 
        ctx.fillStyle = 'red'; ctx.fillRect(-10, -30, 20, 15);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -25, 12, 0, Math.PI*2); ctx.fill();
        
        // Bat
        ctx.save();
        ctx.translate(-20, 15);
        ctx.rotate((batSwing * Math.PI) / 180);
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 5; 
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -25); ctx.stroke();
        ctx.restore();
    } else {
        // Player HP Bar
        ctx.fillStyle = 'red'; ctx.fillRect(-20, -50, 40, 5);
        ctx.fillStyle = 'lime'; ctx.fillRect(-20, -50, 40 * (player.hp/player.maxHp), 5);

        let armPush = player.recoil > 0 ? player.recoil : 0;
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(35 - armPush, 10); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.fillRect(-12, -35, 26, 28);
        ctx.fillStyle = player.visorColor; ctx.fillRect(2, -28, 14, 10); 
        ctx.fillStyle = '#777'; ctx.fillRect(35 - armPush, 5, 25, 8);
        ctx.fillStyle = player.gunColor; ctx.fillRect(55 - armPush, 6, 8, 6);
    }
    ctx.restore();
}

// --- 7. The Main Game Loop ---
let lastTime = performance.now();

function gameLoop(currentTime) {
    let dt = (currentTime - lastTime) / 1000;
    if (isNaN(dt) || dt > 0.1) dt = 0.016; 
    lastTime = currentTime;
    let timeScale = dt * 60; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld();

    if (gameState === 'PLAYING') {
        
        // Player Movement
        player.x += player.dx * player.speed * timeScale;
        player.y += player.dy * player.speed * timeScale;
        
        if (player.x < base.width + 10) player.x = base.width + 10; // Don't walk into base
        if (player.x > canvas.width - 20) player.x = canvas.width - 20;
        if (player.y < roadTop) player.y = roadTop; 
        if (player.y > roadBottom) player.y = roadBottom;

        if (player.recoil > 0) player.recoil -= 1; 
        if (Math.abs(player.dx) > 0.1 || Math.abs(player.dy) > 0.1) player.animationFrame += 0.25 * timeScale; 
        else player.animationFrame = 0;

        // Wave Spawning System
        if (waveCooldown > 0) {
            waveCooldown -= 1 * timeScale;
        } else if (enemiesSpawned < enemiesInWave) {
            if (Math.random() < 0.02 * timeScale) { 
                enemies.push({ 
                    x: canvas.width + 50, y: roadTop + Math.random() * (roadBottom - roadTop), 
                    hp: 2 + Math.floor(currentWave / 2), // HP increases with waves
                    damageFlash: 0, 
                    speed: 1.2 + (currentWave * 0.1) + Math.random(), // Faster each wave
                    animFrame: Math.random() * 10, dx: -1, dy: 0,
                    attackTimer: 0
                });
                enemiesSpawned++;
            }
        } else if (enemies.length === 0) {
            // Wave Complete!
            currentWave++;
            enemiesInWave += 5; // Next wave is harder
            enemiesSpawned = 0;
            enemiesDefeated = 0;
            waveCooldown = 180; // Wait 3 seconds before next wave
            myCoins += 50; // Wave completion bonus
            updateUI();
        }

        // Enemy AI & Movement
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            
            // Distance to player
            let distToPlayerX = player.x - e.x;
            let distToPlayerY = player.y - e.y;
            let distToPlayer = Math.sqrt(distToPlayerX*distToPlayerX + distToPlayerY*distToPlayerY);

            // AI Decision Making
            if (distToPlayer < 60) {
                // Attack Player
                e.dx = 0; e.dy = 0;
                e.attackTimer -= 1 * timeScale;
                if (e.attackTimer <= 0) {
                    player.hp -= 10;
                    e.attackTimer = 60; // 1 second cooldown
                }
            } else if (e.x < base.width + 40) {
                // Attack Base
                e.dx = 0; e.dy = 0;
                e.attackTimer -= 1 * timeScale;
                if (e.attackTimer <= 0) {
                    base.hp -= 10;
                    e.attackTimer = 60;
                    if (base.hp <= 0) {
                        gameState = 'GAMEOVER';
                        gameOverScreen.style.display = 'flex';
                    }
                }
            } else {
                // Walk Forward
                e.dx = -1;
                e.x += e.dx * e.speed * timeScale; 
                e.animFrame += 0.2 * timeScale;
                e.attackTimer = 0;
            }

            if (e.damageFlash > 0) e.damageFlash -= 1; 
            if (e.x < -50) enemies.splice(i, 1);
        }

        // Projectile Collisions
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            p.x += p.speed * timeScale;
            let hit = false;

            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                // Adjusted hitbox for 75% scale
                if (p.x + p.width > e.x - 20 && p.x < e.x + 20 && p.y + p.height > e.y - 30 && p.y < e.y + 30) {
                    e.hp -= 1;
                    e.damageFlash = 10; 
                    e.x += 10; // Knockback
                    hit = true;
                    
                    if (e.hp <= 0) {
                        enemies.splice(j, 1);
                        enemiesDefeated++;
                        myCoins += 10; 
                        if(Math.random() < 0.1) myGems += 1; // 10% chance for a gem
                        updateUI();
                    }
                    break; 
                }
            }
            if (hit || p.x > canvas.width) projectiles.splice(i, 1); 
        }

        // Drawing Phase
        enemies.forEach(e => drawStickman(e.x, e.y, true, e));
        drawStickman(player.x, player.y, false, player);

        ctx.fillStyle = player.gunColor;
        projectiles.forEach(p => {
            ctx.shadowBlur = 10; ctx.shadowColor = player.gunColor;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0; 
        });
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame((time) => {
    lastTime = time;
    gameLoop(time);
});
