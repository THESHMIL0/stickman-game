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

    // Add state for attacking
    players[socket.id] = {
        x: 400, 
        y: 300, 
        isAttacking: false,
        facingRight: true
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Handle movement AND attack state updates
    socket.on('playerUpdate', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].isAttacking = data.isAttacking;
            players[socket.id].facingRight = data.facingRight;
            
            // Broadcast the full update to everyone else
            socket.broadcast.emit('playerUpdated', { 
                id: socket.id, 
                x: data.x, 
                y: data.y,
                isAttacking: data.isAttacking,
                facingRight: data.facingRight
            });
        }
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