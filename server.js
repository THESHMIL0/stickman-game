const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Tell the server to serve your 'public' folder
app.use(express.static('public'));

// When a player connects...
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // When Player 1 or 2 moves, send their data to everyone else
    socket.on('syncMovement', (data) => {
        socket.broadcast.emit('teammateMoved', data);
    });

    // When a player shoots, send the bullet to the other player
    socket.on('shoot', (projectile) => {
        socket.broadcast.emit('teammateShot', projectile);
    });

    socket.on('disconnect', () => {
        console.log('A player disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
