// server.js (Node.js with Socket.io)
let connectedPlayers = 0;
let enemyState = { x: 100, y: 100, speed: 5, isAlive: true };

io.on('connection', (socket) => {
    connectedPlayers++;
    console.log('A player joined! Total:', connectedPlayers);

    // Goal 1: Only start when 2 players join
    if (connectedPlayers === 2) {
        io.emit('gameStart', enemyState); // Tell both phones to start!
    }

    // Goal 3: Syncing the kill
    socket.on('playerKilledEnemy', () => {
        if (enemyState.isAlive) {
            enemyState.isAlive = false;
            // Tell EVERYONE the enemy is dead
            io.emit('enemyDied'); 
        }
    });

    socket.on('disconnect', () => {
        connectedPlayers--;
    });
});
