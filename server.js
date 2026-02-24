const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the 'public' folder to the internet
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Bounce movement data to the other player
    socket.on('syncMovement', (data) => {
        socket.broadcast.emit('teammateMoved', data);
    });

    // Bounce laser data to the other player
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
