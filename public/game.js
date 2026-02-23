// --- 1. PWA Setup (For the Install pop-up) ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Service Worker registered successfully!"))
        .catch(err => console.log("Service Worker failed", err));
}

// --- 2. Canvas & Player Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Our player object with position, velocity (dx, dy), and speed
let player = {
    x: 100,
    y: 100,
    size: 40,
    color: '#00ccff', // A nice bright blue
    dx: 0, // Horizontal movement direction (-1 to 1)
    dy: 0, // Vertical movement direction (-1 to 1)
    speed: 5 // How fast the player moves per frame
};

// Keep the canvas exactly the size of the window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Set size initially

// --- 3. Joystick Setup ---
// Create the joystick inside our 'joystick-zone' div
const joystickManager = nipplejs.create({
    zone: document.getElementById('joystick-zone'),
    mode: 'static', // Stays in one place
    position: { left: '50%', top: '50%' }, // Center of the zone
    color: 'white'
});

// When joystick moves, update player's movement direction
joystickManager.on('move', (event, data) => {
    // data.vector contains x and y values between -1 and 1
    player.dx = data.vector.x;
    // We make y negative because on a canvas, Y goes DOWN, but joystick Y goes UP
    player.dy = -data.vector.y; 
});

// When player lets go of the joystick, stop moving
joystickManager.on('end', () => {
    player.dx = 0;
    player.dy = 0;
});

// --- 4. Attack Button Setup ---
const atkBtn = document.getElementById('atk-btn');
atkBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Stop mobile browsers from zooming/scrolling
    player.color = 'yellow'; // Flash yellow when attacking
    
    // Change back to blue after a short delay
    setTimeout(() => { 
        player.color = '#00ccff'; 
    }, 150);
});
// Add mouse support for testing on a computer
atkBtn.addEventListener('mousedown', () => {
    player.color = 'yellow';
    setTimeout(() => { player.color = '#00ccff'; }, 150);
});

// --- 5. The Main Game Loop ---
function gameLoop() {
    // A. Update logic: Move the player based on the joystick
    player.x += player.dx * player.speed;
    player.y += player.dy * player.speed;

    // Boundary check: Don't let the player walk off the screen!
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x + player.size > canvas.width) player.x = canvas.width - player.size;
    if (player.y + player.size > canvas.height) player.y = canvas.height - player.size;

    // B. Drawing logic: Clear the old frame and draw the new one
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Wipe screen
    
    ctx.fillStyle = player.color; // Set brush color
    ctx.fillRect(player.x, player.y, player.size, player.size); // Draw player box

    // C. Loop it! Ask the browser to run this function again immediately
    requestAnimationFrame(gameLoop);
}

// Start the loop!
gameLoop();