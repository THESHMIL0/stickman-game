// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Setup Express and our HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (like our HTML and client JS) from a folder called 'public'
app.use(express.static('public'));

// Store our players here
const players = {};

// Listen for connections from clients
io.on('connection', (socket) => {
    console.log(`A player connected: ${socket.id}`);

    // Add the new player to our state
    players[socket.id] = {
        x: 100, // starting X position
        y: 100, // starting Y position
        health: 100
    };

    // Send the current list of players to the newly connected player
    socket.emit('currentPlayers', players);

    // Tell all *other* players that a new player has joined
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Handle a player disconnecting
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        // Tell everyone else this player left
        io.emit('playerDisconnected', socket.id);
    });
});

// Start the server on port 3000 (or the port Render assigns)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});