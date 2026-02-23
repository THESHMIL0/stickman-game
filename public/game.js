// --- 1. PWA & Install Button Setup ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.log);
}

let deferredPrompt;
const installBtn = document.getElementById('install-btn');

// This catches the browser's hidden install event and shows our custom button
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block'; // Show the install button
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt(); // Trigger the browser pop-up
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.style.display = 'none'; // Hide if installed
        deferredPrompt = null;
    }
});

// --- 2. Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- 3. Player Object ---
let player = {
    x: canvas.width / 2, // Start in middle
    y: canvas.height / 2 + 50,
    dx: 0,
    dy: 0,
    speed: 5,
    isAttacking: false,
    animTimer: 0 // Used to track how long we've been moving for animations
};

// --- 4. Controls Setup ---
const joystickManager = nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static', position: { left: '50%', top: '50%' }, color: 'white'
});

joystickManager.on('move', (event, data) => {
    player.dx = data.vector.x;
    player.dy = -data.vector.y; 
});
joystickManager.on('end', () => { player.dx = 0; player.dy = 0; });

const atkBtn = document.getElementById('atk-btn');
// Function to handle attack animation
function triggerAttack(e) {
    if (e) e.preventDefault();
    player.isAttacking = true;
    setTimeout(() => { player.isAttacking = false; }, 150); // Stop attacking after 150ms
}
atkBtn.addEventListener('touchstart', triggerAttack);
atkBtn.addEventListener('mousedown', triggerAttack);

// --- 5. Drawing Functions ---

// Function to draw our custom animated stickman
function drawStickman(x, y, isMoving, isAttacking) {
    ctx.strokeStyle = "white"; // Stickman color
    ctx.lineWidth = 6;         // Thickness of the lines
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Calculate arm and leg swing using Math.sin if moving
    let swing = isMoving ? Math.sin(player.animTimer * 0.25) * 20 : 0;
    
    ctx.beginPath();
    
    // 1. Draw Head
    ctx.arc(x, y - 40, 15, 0, Math.PI * 2);
    
    // 2. Draw Body
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x, y + 20);
    
    // 3. Draw Legs
    ctx.moveTo(x, y + 20);
    ctx.lineTo(x - 10 + swing, y + 50); // Left leg swings one way
    ctx.moveTo(x, y + 20);
    ctx.lineTo(x + 10 - swing, y + 50); // Right leg swings the opposite way
    
    // 4. Draw Arms
    ctx.moveTo(x, y - 10);
    if (isAttacking) {
        // Attack Animation: Punch straight forward!
        ctx.lineTo(x + 35, y - 10); 
    } else {
        // Normal Animation: Swing arms opposite to legs
        ctx.lineTo(x - 15 - swing, y + 10); // Left arm
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x + 15 + swing, y + 10); // Right arm
    }
    
    ctx.stroke();

    // 5. Draw a cool slash effect if attacking
    if (isAttacking) {
        ctx.fillStyle = "#00ffff"; // Cyan color
        ctx.fillRect(x + 40, y - 15, 30, 8); // A laser or slash projectile
    }
}

// Function to draw a simple landscape
function drawWorld() {
    // Draw Sky (Dark blue)
    ctx.fillStyle = "#1a252c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Ground (Dark green)
    ctx.fillStyle = "#273c2a";
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Draw a divider line between ground and sky
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.6);
    ctx.lineTo(canvas.width, canvas.height * 0.6);
    ctx.stroke();
}

// --- 6. The Game Loop ---
function gameLoop() {
    // Check if player is actively moving
    let isMoving = player.dx !== 0 || player.dy !== 0;

    // Update position
    player.x += player.dx * player.speed;
    player.y += player.dy * player.speed;

    // Advance animation timer if moving, reset if standing still
    if (isMoving) player.animTimer++;
    else player.animTimer = 0; 

    // Keep player on the screen
    if (player.x < 20) player.x = 20;
    if (player.y < 20) player.y = 20;
    if (player.x > canvas.width - 20) player.x = canvas.width - 20;
    if (player.y > canvas.height - 20) player.y = canvas.height - 20;

    // Clear and draw everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawWorld(); // Draw background first
    drawStickman(player.x, player.y, isMoving, player.isAttacking); // Draw player on top

    requestAnimationFrame(gameLoop);
}

// Start the game immediately!
gameLoop();
