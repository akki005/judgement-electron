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


let http = require("http");
let os = require("os");
let port = 8080;
let socket_io = require("socket.io");
var socket_client = require('socket.io-client');
let server = undefined;
let io = undefined;
console.log("Game")

class Game {


  constructor() {
    this.ip = undefined;
    this.port = 8080;
    this.max_players = 5;
    this.no_players_to_be_expected_to_join = undefined;
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


  setNoOfPlayers(no_of_players) {
    this.max_players = this.no_players_to_be_expected_to_join = no_of_players;
  }

  getPlayers() {
    return this.players;
  }

  getPlayer(name) {
    let player_found = this.players.find((player) => {
      return player.name == name;
    });
    return player_found;
  }

  addPlayer(name, id) {
    if (this.max_players == this.players.length) {
      return false;
    }
    let position = this.players.length - 1;
    let player = new Player(name, position, id);
    this.players.push(player);
    return true;
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
        await round1.dealCards(this.deck);
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


  startServer() {
    let connected_clients = new Map();
    let ips = os.networkInterfaces();
    this.ip = ips.wlp4s0[0].address;

    server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-type': 'text/plan'
      });
      res.write('Hello Node JS Server Response');
      res.end();
    });
    server.listen(this.port, this.ip);
    server.on("error", (error) => {
      console.error(error);
    });
    server.on("listening", () => {
      console.log(`server started on ${this.ip}:${this.port}`);
    })

    io = socket_io(server);

    io.on("connection", (socket) => {
      console.log("connection requested");

      /**
       * handle player disconnect
       */
      socket.on("disconnect", () => {
        let player_name = connected_clients.get(socket.id);
        if (player_name) {
          console.log(`Player ${JSON.stringify(player_name)} disconnected`);
          this.removePlayer(player_name);
          updateJoinedPlayersUI(this.players, this.no_players_to_be_expected_to_join);
        } else {
          console.log("someone left");
        }
      })

      /**
       * handle player game join
       */
      socket.on("join-game", (player_data) => {
        if (player_data && player_data.name && player_data.id) {
          connected_clients.set(socket.id, player_data.name);
          if (!this.addPlayer(player_data.name, player_data.id)) {
            socket.emit("maximum-players-reached");
            socket.disconnect(true);
          } else {
            updateJoinedPlayersUI(this.players, this.no_players_to_be_expected_to_join);
          }
        } else {
          socket.disconnect(true);
        }
      })
    })
  }


  startClient(){
    socket_client(this.ip);
  }

  stopServer() {
    io.close();
    server.close();
    console.log("killed server");
  }

}


function updateJoinedPlayersUI(players, no_players_to_be_expected_to_join) {
  $('#noOfPlayersConnected').val(players.length);
  if (players.length == no_players_to_be_expected_to_join) {
    $("#startGameAfterPlayersJoined").prop('disabled', false);
  }
}



function renderAddNoOfPlayersUI() {

}




module.exports = {
  Game
}
