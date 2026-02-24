const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    socket.on('syncMovement', data => socket.broadcast.emit('teammateMoved', data));
    socket.on('shoot', proj => socket.broadcast.emit('teammateShot', proj));
    
    // NEW: Player 1 sends the official enemy list, server bounces it to Player 2
    socket.on('hostSync', data => socket.broadcast.emit('hostSync', data));
    
    // NEW: Player 2 tells Player 1 they shot an enemy
    socket.on('enemyHit', id => socket.broadcast.emit('enemyHit', id));
    
    // NEW: Share the Game Over screen
    socket.on('gameOver', data => socket.broadcast.emit('gameOver', data));

    socket.on('disconnect', () => {
        console.log('A player disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
