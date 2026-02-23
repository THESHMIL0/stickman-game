const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const players = {};

io.on('connection', (socket) => {
    console.log(`A player connected: ${socket.id}`);

    // Add new player to the center of the screen
    players[socket.id] = {
        x: 400, 
        y: 300, 
        health: 100
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // NEW: Listen for movement from a player
    socket.on('playerMovement', (movementData) => {
        // Update the server's record of this player
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        
        // Tell all OTHER players about this movement
        socket.broadcast.emit('playerMoved', { id: socket.id, x: movementData.x, y: movementData.y });
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});