let {
  ipcMain
} = require("electron");
let {
  Game,
  initWindowInGame
} = require("./models/Game");
let {
  Round,
  initWindowInRound
} = require("./models/Round");

let game_window;
let game;

ipcMain.on("players-names", (event, player_names) => {
  game = new Game();
  player_names.forEach((name, index) => {
    game.addPlayer(name, index);
  });
  game_window.webContents.send('players-added');
  ipcMain.on("done-loading-game-page", () => {
    game.start();
  })
})


module.exports.init = (win) => {
  game_window = win;
  initWindowInGame(win);
  initWindowInRound(win);
}
