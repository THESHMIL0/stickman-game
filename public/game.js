if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(console.log); }
let deferredPrompt; const installBtn = document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.style.display = 'block'; });
installBtn.addEventListener('click', async () => { if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') installBtn.style.display = 'none'; deferredPrompt = null; } });

let gameState = 'MENU'; 
let myCoins = 0; let myGems = 0;

function loadGame() {
    let savedData = localStorage.getItem('stickmanSave');
    if (savedData) {
        let data = JSON.parse(savedData);
        myCoins = data.coins || 0; myGems = data.gems || 0; currentWave = data.wave || 1;
        updateUI();
    }
}
function saveGame() {
    localStorage.setItem('stickmanSave', JSON.stringify({ coins: myCoins, gems: myGems, wave: currentWave }));
    alert("Progress Saved Successfully! 💾");
}

const mainMenu = document.getElementById('main-menu');
const inGameUI = document.getElementById('in-game-ui');
const settingsModal = document.getElementById('settings-modal');
const multiModal = document.getElementById('multiplayer-modal');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverTitle = document.getElementById('game-over-title');

let joystickManager;
let socket = null;
let isMultiplayer = false;
let myRole = 'P1';
let isHost = true; // Player 1 is ALWAYS the host!
let teammate = null; 

document.getElementById('save-btn').addEventListener('click', saveGame);
document.getElementById('btn-play').addEventListener('click', () => startGame('SOLO'));
document.getElementById('btn-multi').addEventListener('click', () => multiModal.style.display = 'flex');
document.getElementById('close-multi-btn').addEventListener('click', () => multiModal.style.display = 'none');
document.getElementById('btn-p1').addEventListener('click', () => startGame('P1'));
document.getElementById('btn-p2').addEventListener('click', () => startGame('P2'));
document.getElementById('btn-menu-settings').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('settings-btn').addEventListener('click', () => settingsModal.style.display = 'flex');
document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.style.display = 'none');

function startGame(mode) {
    loadGame(); 
    myRole = mode;
    isHost = (myRole === 'P1' || myRole === 'SOLO');
    
    if (mode === 'P1' || mode === 'P2') {
        if (typeof io === 'undefined') { alert("Server booting up! Please wait and refresh. ⏳"); return; }
        isMultiplayer = true;
        socket = io(); 
        
        if (!isHost) {
            player.x = 260; player.gunColor = '#ff00ff'; player.visorColor = '#ff00ff'; 
        }

        socket.on('teammateMoved', (data) => { teammate = data; });
        socket.on('teammateShot', (bullet) => { projectiles.push(bullet); });
        
        // P2 Listens to the Host for the official Enemy Wave state
        socket.on('hostSync', (data) => {
            if (!isHost) {
                enemies = data.enemies;
                base.hp = data.baseHp;
                currentWave = data.wave;
                enemiesDefeated = data.defeated;
                updateUI();
            }
        });

        // Host listens for P2 hitting an enemy
        socket.on('enemyHit', (id) => {
            if (isHost) {
                let e = enemies.find(en => en.id === id);
                if (e) {
                    e.hp -= 1; e.damageFlash = 10; e.x += 10;
                    if (e.hp <= 0) { enemies = enemies.filter(en => en.id !== id); enemiesDefeated++; }
                }
            }
        });

        // Listen for global Game Over
        socket.on('gameOver', (data) => triggerGameOver(data.title, data.color));
    }

    mainMenu.style.display = 'none'; multiModal.style.display = 'none';
    inGameUI.style.display = 'block'; gameState = 'PLAYING';
    
    if (!joystickManager) {
        joystickManager = nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'rgba(255,255,255,0.7)' });
        joystickManager.on('move', (evt, data) => { if(data && data.vector) { player.dx = data.vector.x; player.dy = -data.vector.y; } });
        joystickManager.on('end', () => { player.dx = 0; player.dy = 0; });
    }
}

function updateUI() {
    document.getElementById('coin-count').innerText = myCoins; document.getElementById('gem-count').innerText = myGems;
    document.getElementById('wave-text').innerText = `Wave ${currentWave}`;
    document.getElementById('wave-progress-fill').style.width = `${(enemiesDefeated / enemiesInWave) * 100}%`;
}

function triggerGameOver(title, color) {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';
    gameOverTitle.innerText = title;
    gameOverTitle.style.color = color || "#ff3333";
    gameOverScreen.style.display = 'flex';
}

const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');

// --- THE CAMERA ZOOM FIX ---
const cameraScale = 0.55; 
let vWidth, vHeight, roadTop, roadBottom;
let currentWave = 1; let enemiesInWave = 5; let enemiesSpawned = 0; let enemiesDefeated = 0; let waveCooldown = 0;

let player = { x: 250, y: 0, dx: 0, dy: 0, speed: 8, hp: 100, maxHp: 100, animationFrame: 0, recoil: 0, gunColor: '#00ffff', visorColor: '#00ffff' };
let base = { x: 0, y: 0, width: 140, height: 0, hp: 200, maxHp: 200 };
let projectiles = []; let enemies = [];     

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    
    // Virtual resolution based on camera zoom!
    vWidth = canvas.width / cameraScale; 
    vHeight = canvas.height / cameraScale;

    roadTop = vHeight * 0.45; roadBottom = vHeight - 30;
    base.y = roadTop - 100; base.height = roadBottom - roadTop + 130;
    if(player.y === 0 || player.y < roadTop) player.y = vHeight * 0.7; 
}
window.addEventListener('resize', resizeCanvas); resizeCanvas(); 

document.getElementById('atk-btn').addEventListener('touchstart', (e) => { e.preventDefault(); attack(); });
document.getElementById('atk-btn').addEventListener('mousedown', attack);

function attack() {
    if(gameState !== 'PLAYING') return;
    player.recoil = 12; 
    let p = { x: player.x + 40, y: player.y + 5, speed: 22, width: 25, height: 6, color: player.gunColor, owner: myRole };
    projectiles.push(p);
    if (isMultiplayer && socket) socket.emit('shoot', p); 
}

function drawWorld() {
    let skyGradient = ctx.createLinearGradient(0, 0, 0, roadTop);
    skyGradient.addColorStop(0, "#1a0b2e"); skyGradient.addColorStop(0.5, "#56144d"); skyGradient.addColorStop(1, "#c84a22");
    ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, vWidth, roadTop);
    
    let sunX = vWidth - 250; let sunY = roadTop - 60;
    let sunGradient = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
    sunGradient.addColorStop(0, "rgba(255, 230, 100, 1)"); sunGradient.addColorStop(0.3, "rgba(255, 150, 0, 0.8)"); sunGradient.addColorStop(1, "rgba(255, 100, 0, 0)");
    ctx.fillStyle = sunGradient; ctx.beginPath(); ctx.arc(sunX, sunY, 180, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#0d0514"; ctx.beginPath(); ctx.moveTo(0, roadTop);
    ctx.lineTo(100, roadTop - 80); ctx.lineTo(200, roadTop - 30); ctx.lineTo(350, roadTop - 130);
    ctx.lineTo(550, roadTop - 50); ctx.lineTo(750, roadTop - 160); ctx.lineTo(950, roadTop - 70);
    ctx.lineTo(vWidth, roadTop - 100); ctx.lineTo(vWidth, roadTop); ctx.fill();

    let roadGradient = ctx.createLinearGradient(0, roadTop, 0, vHeight);
    roadGradient.addColorStop(0, "#2c3e50"); roadGradient.addColorStop(1, "#111820");
    ctx.fillStyle = roadGradient; ctx.fillRect(0, roadTop, vWidth, vHeight - roadTop);
    
    ctx.strokeStyle = 'rgba(255, 193, 7, 0.5)'; ctx.lineWidth = 6; ctx.setLineDash([50, 40]);
    ctx.beginPath(); ctx.moveTo(0, roadTop + ((roadBottom-roadTop)/2)); ctx.lineTo(vWidth, roadTop + ((roadBottom-roadTop)/2)); ctx.stroke(); ctx.setLineDash([]); 

    // --- HD DETAILED BASE ---
    let baseGrad = ctx.createLinearGradient(base.x, base.y, base.x + base.width, base.y);
    baseGrad.addColorStop(0, "#1a2533"); baseGrad.addColorStop(1, "#2c3e50");
    ctx.fillStyle = baseGrad; ctx.fillRect(base.x, base.y, base.width, base.height);
    
    // Armor Plates
    ctx.fillStyle = "#34495e";
    ctx.fillRect(base.x + 10, base.y + 20, base.width - 20, 40);
    ctx.fillRect(base.x + 10, base.y + 80, base.width - 20, 50);
    
    // Glowing Vents
    ctx.fillStyle = "#00ffff"; 
    ctx.fillRect(base.x + base.width - 15, base.y + 40, 6, 25);
    ctx.fillRect(base.x + base.width - 15, base.y + 90, 6, 25);
    
    // Radar Dish
    ctx.fillStyle = "#555";
    ctx.beginPath(); ctx.arc(base.x + 60, base.y - 10, 30, 0, Math.PI, true); ctx.fill();
    ctx.strokeStyle = "#0cf"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(base.x + 60, base.y - 10); ctx.lineTo(base.x + 80, base.y - 40); ctx.stroke();
    ctx.fillStyle = "#0cf"; ctx.beginPath(); ctx.arc(base.x + 80, base.y - 40, 5, 0, Math.PI*2); ctx.fill();

    // Energy Shield Dome!
    let hpPercent = Math.max(0, base.hp / base.maxHp);
    if (hpPercent > 0) {
        ctx.beginPath();
        ctx.ellipse(base.x + base.width, base.y + base.height/2, 50, base.height/2 + 20, 0, -Math.PI/2, Math.PI/2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${hpPercent})`; 
        ctx.lineWidth = 6; ctx.stroke();
    }
    
    // Base HP Bar
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(base.x + 10, base.y - 40, base.width - 20, 20);
    ctx.fillStyle = '#ff0000'; ctx.fillRect(base.x + 12, base.y - 38, base.width - 24, 16);
    ctx.fillStyle = '#00ff00'; ctx.fillRect(base.x + 12, base.y - 38, (base.width - 24) * hpPercent, 16);
}

function drawStickman(x, y, isEnemy, stateData) {
    if (!stateData) return; 
    ctx.save();
    ctx.translate(x, y); // No more manual scale here, it's done globally!
    
    let isMoving = (Math.abs(stateData.dx || 0) > 0.1 || Math.abs(stateData.dy || 0) > 0.1);
    let animFrame = stateData.animFrame || 0;
    let bob = isMoving ? Math.abs(Math.sin(animFrame)) * 4 : 0;
    
    ctx.translate(0, -bob);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.beginPath(); ctx.ellipse(0, 50 + bob, 25, 8, 0, 0, Math.PI * 2); ctx.fill();

    let swing = Math.sin(animFrame) * 20; 
    ctx.strokeStyle = stateData.damageFlash > 0 ? '#ff0000' : '#050505'; 
    ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-10 + swing, 50); ctx.moveTo(0, 20); ctx.lineTo(10 - swing, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 20); ctx.stroke();

    if (isEnemy) {
        let batSwing = 0;
        if (stateData.attackTimer > 30) batSwing = (stateData.attackTimer - 30) * 2.5; else if (stateData.attackTimer > 0) batSwing = -stateData.attackTimer * 4;  
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(-20, 15); ctx.stroke(); 
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -25, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ff0000'; ctx.fillRect(-8, -28, 6, 4); ctx.fillRect(2, -28, 6, 4); 
        ctx.save(); ctx.translate(-20, 15); ctx.rotate((batSwing * Math.PI) / 180);
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -35); ctx.stroke(); ctx.restore();
    } else {
        let pHPPercent = Math.max(0, stateData.hp / stateData.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-22, -52, 44, 9); ctx.fillStyle = '#ff0000'; ctx.fillRect(-20, -50, 40, 5); ctx.fillStyle = '#00ff00'; ctx.fillRect(-20, -50, 40 * pHPPercent, 5);
        let armPush = stateData.recoil > 0 ? stateData.recoil : 0;
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(35 - armPush, 10); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.fillRect(-14, -38, 30, 32); 
        ctx.fillStyle = stateData.visorColor; ctx.fillRect(2, -30, 16, 12); ctx.shadowBlur = 10; ctx.shadowColor = stateData.visorColor; ctx.fillRect(2, -30, 16, 12); ctx.shadowBlur = 0;
        ctx.fillStyle = '#555'; ctx.fillRect(35 - armPush, 2, 30, 12); ctx.fillStyle = '#333'; ctx.fillRect(45 - armPush, 14, 10, 8); 
        ctx.fillStyle = stateData.gunColor; ctx.fillRect(60 - armPush, 4, 10, 8); 
    }
    ctx.restore();
}

let lastTime = performance.now();

function gameLoop(currentTime) {
    let dt = (currentTime - lastTime) / 1000;
    if (isNaN(dt) || dt > 0.1) dt = 0.016; 
    lastTime = currentTime; let timeScale = dt * 60; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // APPLY GLOBAL CAMERA ZOOM
    ctx.save();
    ctx.scale(cameraScale, cameraScale);
    
    drawWorld();

    if (gameState === 'PLAYING') {
        player.x += player.dx * player.speed * timeScale;
        player.y += player.dy * player.speed * timeScale;
        
        if (player.x < base.width + 60) player.x = base.width + 60; 
        if (player.x > vWidth - 20) player.x = vWidth - 20;
        if (player.y < roadTop) player.y = roadTop; 
        if (player.y > roadBottom) player.y = roadBottom;

        if (player.recoil > 0) player.recoil -= 1; 
        if (Math.abs(player.dx) > 0.1 || Math.abs(player.dy) > 0.1) player.animationFrame += 0.25 * timeScale; else player.animationFrame = 0;

        if (isMultiplayer && socket) {
            socket.emit('syncMovement', { x: player.x, y: player.y, dx: player.dx, dy: player.dy, hp: player.hp, maxHp: player.maxHp, recoil: player.recoil, animFrame: player.animationFrame, gunColor: player.gunColor, visorColor: player.visorColor });
        }

        // --- HOST AUTHORITY LOGIC ---
        if (isHost) {
            if (waveCooldown > 0) {
                waveCooldown -= 1 * timeScale;
            } else if (enemiesSpawned < enemiesInWave) {
                if (Math.random() < 0.02 * timeScale) { 
                    // Give enemies a unique ID so P2 can shoot them!
                    let uniqueId = Math.random().toString(36).substr(2, 9);
                    enemies.push({ id: uniqueId, x: vWidth + 50, y: roadTop + Math.random() * (roadBottom - roadTop), hp: 2 + Math.floor(currentWave / 2), damageFlash: 0, speed: 1.5 + (currentWave * 0.1) + Math.random(), animFrame: Math.random() * 10, dx: -1, dy: 0, attackTimer: 0 });
                    enemiesSpawned++;
                }
            } else if (enemies.length === 0) {
                currentWave++; enemiesInWave += 5; enemiesSpawned = 0; enemiesDefeated = 0; waveCooldown = 180; myCoins += 50; updateUI();
            }

            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                let distToPlayer = Math.sqrt(Math.pow(player.x - e.x, 2) + Math.pow(player.y - e.y, 2));
                let distToTeammate = (isMultiplayer && teammate) ? Math.sqrt(Math.pow(teammate.x - e.x, 2) + Math.pow(teammate.y - e.y, 2)) : 9999;

                if (distToPlayer < 60 || distToTeammate < 60) {
                    e.dx = 0; e.dy = 0; e.attackTimer -= 1 * timeScale;
                    if (e.attackTimer <= 0) {
                        if (distToPlayer < 60) {
                            player.hp -= 10;
                            if (player.hp <= 0) { player.hp = 0; triggerGameOver("YOU DIED"); if(isMultiplayer) socket.emit('gameOver', {title: "TEAMMATE DIED", color: "#ff3333"}); }
                        }
                        e.attackTimer = 60; 
                    }
                } else if (e.x < base.width + 40) {
                    e.dx = 0; e.dy = 0; e.attackTimer -= 1 * timeScale;
                    if (e.attackTimer <= 0) {
                        base.hp -= 10;
                        if (base.hp <= 0) { base.hp = 0; triggerGameOver("BASE DESTROYED", "#ffaa00"); if(isMultiplayer) socket.emit('gameOver', {title: "BASE DESTROYED", color: "#ffaa00"}); }
                        e.attackTimer = 60;
                    }
                } else { e.dx = -1; e.x += e.dx * e.speed * timeScale; e.animFrame += 0.2 * timeScale; e.attackTimer = 0; }

                if (e.damageFlash > 0) e.damageFlash -= 1; 
                if (e.x < -50) enemies.splice(i, 1);
            }

            // Host syncs official data to P2!
            if (isMultiplayer && socket) {
                socket.emit('hostSync', { enemies: enemies, baseHp: base.hp, wave: currentWave, defeated: enemiesDefeated });
            }
        }

        // --- BULLET COLLISION (Applies to Host AND P2) ---
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i]; p.x += p.speed * timeScale; let hit = false;
            
            // Only check collisions for YOUR OWN bullets!
            if (p.owner === myRole || myRole === 'SOLO') {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    let e = enemies[j];
                    if (p.x + p.width > e.x - 20 && p.x < e.x + 20 && p.y + p.height > e.y - 30 && p.y < e.y + 30) {
                        hit = true;
                        if (isHost) {
                            e.hp -= 1; e.damageFlash = 10; e.x += 10;
                            if (e.hp <= 0) { enemies.splice(j, 1); enemiesDefeated++; myCoins += 10; if(Math.random() < 0.1) myGems += 1; updateUI(); }
                        } else {
                            // P2 tells the host they hit an enemy!
                            socket.emit('enemyHit', e.id);
                            e.hp -= 1; // Optimistic update
                            if (e.hp <= 0) { enemies.splice(j, 1); myCoins += 10; if(Math.random() < 0.1) myGems += 1; updateUI(); }
                        }
                        break; 
                    }
                }
            }
            if (hit || p.x > vWidth) projectiles.splice(i, 1); 
        }

        if (isMultiplayer && teammate) drawStickman(teammate.x, teammate.y, false, teammate);
        drawStickman(player.x, player.y, false, player);
        enemies.forEach(e => drawStickman(e.x, e.y, true, e));

        projectiles.forEach(p => {
            ctx.fillStyle = p.color || '#00ffff'; 
            ctx.shadowBlur = 15; ctx.shadowColor = p.color || '#00ffff';
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.shadowBlur = 0; 
        });
    }
    ctx.restore(); // END CAMERA ZOOM
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame((time) => { lastTime = time; gameLoop(time); });
