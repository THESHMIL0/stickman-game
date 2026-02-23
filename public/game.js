// public/game.js
const socket = io(); // Connect to the server

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let players = {};

// When we connect, the server sends us all currently connected players
socket.on('currentPlayers', (serverPlayers) => {
    players = serverPlayers;
    console.log("Current players:", players);
});

// When a new player joins, add them to our local list
socket.on('newPlayer', (playerInfo) => {
    players[playerInfo.id] = playerInfo.player;
    console.log("New player joined:", playerInfo.id);
});

// When someone leaves, remove them from our local list
socket.on('playerDisconnected', (playerId) => {
    delete players[playerId];
    console.log("Player left:", playerId);
});

// We will add the drawing and movement code here next!