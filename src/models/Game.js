let {
  Player
} = require("./Player");
const {
  Deck
} = require("./Deck");
const {
  Round
} = require("./Round");
const {
  Card
} = require("./Card");


let {
  ipcMain
} = require("electron");

let game_window;

class Game {


  constructor() {
    this.deck = new Deck(52);
    this.ranks_power = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
    this.players = [];
    this.sign_sequence = ["spade", "diamond", "club", "heart"];
    this.no_of_cards_at_start = 10;
    this.rounds = [];
    let round = 0;
    while (this.no_of_cards_at_start != 0) {
      for (let index = 0; index < this.sign_sequence.length; index++) {
        if (this.no_of_cards_at_start != 0) {
          this.rounds.push({
            id: round,
            sign: this.sign_sequence[index],
            no_of_cards_at_start: this.no_of_cards_at_start
          })
          round++;
          this.no_of_cards_at_start--;
        } else {
          break;
        }
      }
    }


  }

  getPlayer(name) {
    let player_found = this.players.find((player) => {
      return player.name == name;
    });
    return player_found;
  }

  addPlayer(name, position) {
    let player = new Player(name, position);
    this.players.push(player);
  }

  removePlayer(name) {
    let player_index = this.players.findIndex((player) => player.name == name);
    this.players.splice(0, player_index);
  }

  async start() {
    try {
      let starting_turn = 0;
      for (const round of this.rounds) {
        if (starting_turn > this.players.length - 1) {
          starting_turn = 0;
        }
        let round1 = new Round(round.id, round.sign, starting_turn, this.players, round.no_of_cards_at_start, this.ranks_power);
        round1.dealCards(this.deck);
        game_window.webContents.send('all-players-info-after-deal-cards', this.players);
        await (() => {
          return new Promise((resolve, reject) => {
            ipcMain.on("done-rendering-cards", (event, status) => {
              resolve();
            })
          })
        })();
        await round1.placeHandsBets();
        await round1.play();
        this.resetPlayers();
        this.deck.reset();
        starting_turn++;
      }
    } catch (error) {
      console.log(error);
      return Promise.reject(error);
    }
  }

  getWinner() {
    this.players.sort((current_player, next_player) => next_player.total_points - current_player.total_points);
    return this.players[0];
  }

  getPointsOfAllPlayer() {
    let players_stat = []
    this.players.forEach((player) => {
      players_stat.push(`${player.name} has total points-${player.total_points}`);
    })
    return players_stat;
  }

  resetPlayers() {
    this.players.sort((current_player, next_player) => current_player.position - next_player.position);
    this.players.forEach((player) => {
      player.resetState();
    })

  }


}

module.exports = {
  Game,
  initWindowInGame: (win) => {
    game_window = win;
  }
}
