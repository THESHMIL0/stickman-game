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

let gameState = 'MENU'; 
let myCoins = 0;
let myGems = 0;

const mainMenu = document.getElementById('main-menu');
const inGameUI = document.getElementById('in-game-ui');
const settingsModal = document.getElementById('settings-modal');

document.getElementById('btn-play').addEventListener('click', () => {
    mainMenu.style.display = 'none';
    inGameUI.style.display = 'block';
    gameState = 'PLAYING';
});

document.getElementById('btn-menu-settings').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('settings-btn').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.style.display = 'none');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let roadTop, roadBottom;

let player = {
    x: 100, y: 0, dx: 0, dy: 0, speed: 6,
    animationFrame: 0, recoil: 0 
};

let projectiles = []; 
let enemies = [];     

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    // FIX 1: We gave you way more room to walk up and down!
    roadTop = canvas.height * 0.45; 
    roadBottom = canvas.height - 30;
    if(player.y === 0 || player.y < roadTop) player.y = canvas.height * 0.7; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); 

const joystickManager = nipplejs.create({
    zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white'
});
// FIX 2: Safely check the joystick data to prevent it from getting stuck
joystickManager.on('move', (evt, data) => { 
    if(data && data.vector) {
        player.dx = data.vector.x; 
        player.dy = -data.vector.y; 
    }
});
joystickManager.on('end', () => { player.dx = 0; player.dy = 0; });

document.getElementById('atk-btn').addEventListener('touchstart', (e) => { e.preventDefault(); attack(); });
document.getElementById('atk-btn').addEventListener('mousedown', attack);

function attack() {
    if(gameState !== 'PLAYING') return;
    player.recoil = 10; 
    projectiles.push({ x: player.x + 50, y: player.y + 6, speed: 18, width: 20, height: 6 });
}

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
    let bob = isMoving ? Math.abs(Math.sin(animFrame)) * 4 : 0;
    
    ctx.translate(x, y - bob);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath(); ctx.ellipse(0, 50 + bob, 25, 8, 0, 0, Math.PI * 2); ctx.fill();

    let swing = Math.sin(animFrame) * 18; 
    ctx.strokeStyle = damageFlash > 0 ? 'red' : '#111'; 
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-10 + swing, 50); ctx.moveTo(0, 20); ctx.lineTo(10 - swing, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 20); ctx.stroke();

    if (isEnemy) {
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-20, 15); ctx.stroke(); 
        ctx.fillStyle = 'red'; ctx.fillRect(-10, -30, 20, 15);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -25, 12, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-20, 15); ctx.lineTo(-40, -10); ctx.stroke();
    } else {
        let armPush = player.recoil > 0 ? player.recoil : 0;
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(35 - armPush, 10); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.fillRect(-12, -35, 26, 28);
        ctx.fillStyle = '#00FFFF'; ctx.fillRect(2, -28, 14, 10); 
        ctx.fillStyle = '#777'; ctx.fillRect(35 - armPush, 5, 25, 8);
        ctx.fillStyle = '#00ccff'; ctx.fillRect(55 - armPush, 6, 8, 6);
    }
    ctx.restore();
}

// FIX 3: Delta Time variable setup
let lastTime = performance.now();

function gameLoop(currentTime) {
    // Delta Time Calculation (Fixes the 120Hz hyper-speed bug!)
    let dt = (currentTime - lastTime) / 1000;
    if (isNaN(dt) || dt > 0.1) dt = 0.016; // Prevent lag spikes
    lastTime = currentTime;
    
    // timeScale will be exactly 1.0 at 60fps, and 0.5 at 120fps.
    let timeScale = dt * 60; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld();

    if (gameState === 'PLAYING') {
        // Multiply movement by timeScale so it's consistent on all phone screens
        player.x += player.dx * player.speed * timeScale;
        player.y += player.dy * player.speed * timeScale;
        
        if (player.x < 20) player.x = 20;
        if (player.x > canvas.width - 20) player.x = canvas.width - 20;
        if (player.y < roadTop) player.y = roadTop; 
        if (player.y > roadBottom) player.y = roadBottom;

        if (player.recoil > 0) player.recoil -= 1; 
        if (Math.abs(player.dx) > 0.1 || Math.abs(player.dy) > 0.1) player.animationFrame += 0.25 * timeScale; 
        else player.animationFrame = 0;

        // Spawn Enemies (reduced rate to account for correct timing)
        if (Math.random() < 0.015 * timeScale) { 
            // Give them 2 HP now!
            enemies.push({ x: canvas.width + 50, y: roadTop + Math.random() * (roadBottom - roadTop), hp: 2, damageFlash: 0, speed: 1.5 + Math.random() });
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            e.x -= e.speed * timeScale; 
            if (e.damageFlash > 0) e.damageFlash -= 1; 
            if (e.x < -50) enemies.splice(i, 1);
        }

        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];
            p.x += p.speed * timeScale;
            
            // FIX 4: Proper AABB Collision checking (Much larger, accurate hitbox)
            let pRight = p.x + p.width;
            let pBottom = p.y + p.height;
            let hit = false;

            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                // Enemy hitbox bounds (Top to bottom, left to right)
                let eLeft = e.x - 30;
                let eRight = e.x + 30;
                let eTop = e.y - 45;
                let eBottom = e.y + 45;

                if (pRight > eLeft && p.x < eRight && pBottom > eTop && p.y < eBottom) {
                    e.hp -= 1;
                    e.damageFlash = 10; 
                    e.x += 15; // Knockback effect!
                    hit = true;
                    
                    if (e.hp <= 0) {
                        enemies.splice(j, 1);
                        myCoins += 10; // Give money!
                        document.getElementById('coin-count').innerText = myCoins;
                    }
                    break; 
                }
            }

            if (hit || p.x > canvas.width) {
                projectiles.splice(i, 1); 
            }
        }

        enemies.forEach(e => drawStickman(e.x, e.y, true, e.damageFlash));
        drawStickman(player.x, player.y, false, 0);

        ctx.fillStyle = '#00ffff';
        projectiles.forEach(p => {
            ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0; 
        });
    }

    requestAnimationFrame(gameLoop);
}

// Ensure lastTime is set correctly before starting loop
requestAnimationFrame((time) => {
    lastTime = time;
    gameLoop(time);
});
