const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

let usersOnline = {};
let games = [];

function getUsersOnline() {
  return Object.values(usersOnline).map(u => u.username);
}

function getGameById(id) {
  return games.find(g => g.id === id);
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

io.on("connection", (socket) => {
  let currentUser = null;

  socket.on("login", (username) => {
    if (!username || username.trim().length === 0) {
      socket.emit("login_error", "Nombre de usuario inválido");
      return;
    }
    currentUser = username.trim();
    usersOnline[socket.id] = { username: currentUser };

    socket.emit("login_ok", { username: currentUser, games, usersOnline: getUsersOnline() });
    io.emit("users_update", getUsersOnline());
    io.emit("games_update", games);
  });

  socket.on("add_game", (gameName) => {
    if (!currentUser) return;
    if (!gameName || gameName.trim().length === 0) return;
    if (games.find(g => g.name.toLowerCase() === gameName.trim().toLowerCase())) return;

    games.push({ id: generateId(), name: gameName.trim(), voters: [] });
    io.emit("games_update", games);
  });

  socket.on("vote_game", (gameId) => {
    if (!currentUser) return;
    const game = getGameById(gameId);
    if (!game) return;

    const hasVoted = game.voters.includes(currentUser);

    if (hasVoted) {
      game.voters = game.voters.filter(v => v !== currentUser);
    } else {
      game.voters.push(currentUser);
    }
    io.emit("games_update", games);
  });

  socket.on("delete_game", (gameId) => {
    if (currentUser !== "IronFly222") return;
    games = games.filter(g => g.id !== gameId);
    io.emit("games_update", games);
  });

  socket.on("clear_games", () => {
    if (currentUser !== "IronFly222") return;
    games = [];
    io.emit("games_update", games);
  });

  socket.on("disconnect", () => {
    delete usersOnline[socket.id];
    io.emit("users_update", getUsersOnline());
  });
});

http.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
