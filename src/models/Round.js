let {
  Player
} = require("./Player");
let {
  Hand
} = require("./Hand");
let {
  ipcMain
} = require("electron");

let io = undefined;
let connected_players_sockets = undefined;


class Round {


  constructor(id, trump_card, stating_turn_index, players, no_of_cards_for_each_player, rank_powers, connected_players_sockets, io) {
    this.id = id;
    this.trump_card = trump_card;
    this.no_of_cards_for_each_player = no_of_cards_for_each_player;
    this.starting_turn_index = stating_turn_index;
    this.first_turn_player = players[stating_turn_index];
    this.players = players;
    this.no_of_players = players.length;
    this.played_cards = [];
    this.rank_powers = rank_powers;
    this.starting_sign = undefined;
    this.stats = [];
    this.connected_players_sockets = connected_players_sockets;
    this.io = io;
  }

  async placeHandsBets() {
    try {
      for (const player of this.players) {
        let no_of_hands_bet = await askToPlaceBet(player, this.connected_players_sockets[player.name]);
        player.no_of_hands_bet = parseInt(no_of_hands_bet);
      }
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error);
    }
  }


  async dealCards(Deck) {
    try {
      let no_of_cards_distributed = 0;
      leftShift(this.players, this.starting_turn_index);
      while (this.no_of_cards_for_each_player != no_of_cards_distributed) {
        this.players.forEach((player) => {
          let card = Deck.distributeCard();
          player.addCard(card);
          Deck.number_of_card_left--;
        })
        no_of_cards_distributed++;
      }

      this.players.forEach((player) => {
        player.arrangeCards();
      })
      // await updateUIAfterCardDistribution(this.players);
    } catch (error) {
      return Promise.reject(error);
    }

  }


  async play() {
    try {
      let hand_count = 0;
      /**
       * Play all hands
       */
      for (let cards = this.no_of_cards_for_each_player; cards > 0; cards--) {
        await waitFunction(1000);
        await clearPlayedCardsEvent(this.io);
        let hand = new Hand(this.players, this.rank_powers, this.trump_card, this.connected_players_sockets, this.io);
        await hand.play(this.players[0]);
        let winner_player = hand.getWinner();
        console.log(`$$$$$$$$$$$$$$$$$$$ Winner ${winner_player.name} $$$$$$$$$$$$$$$$$$$`);
        winner_player.addHand();
        await updateWinnerInfo(winner_player,this.io);
        await updatePlayersHandEvent(this.players,this.io,this.id);
        let player_index = this.players.findIndex((player) => player.name == winner_player.name);
        leftShift(this.players, player_index);
        hand_count++;
      }

      /**
       * calculate round outcome
       */
      this.players.forEach((player) => {
        if (player.hands != player.no_of_hands_bet) {
          player.setRoundOutCome(this.id, "lost", 0);
          this.stats.push({
            player: player.name,
            points: 0
          })
        } else {
          let points = (player.no_of_hands_bet == 0) ? 5 : player.no_of_hands_bet * 10;
          player.setRoundOutCome(this.id, "won", points);
          this.stats.push({
            player: player.name,
            points: points
          })
        }
      })
      await updatePlayersStatsTable(this.players,this.io,this.id);
      console.log(` `);
      console.log(`:::::::::::::Round stats::::::::::::::::`);
      console.log(` `);
      console.log(this.stats);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }

  }

}

function askToPlaceBet(player, socket) {
  return new Promise((resolve, reject) => {
    socket.emit("place-bet", player);
    socket.on("placed-bet", (no_of_hands_bet) => {
      resolve(no_of_hands_bet);
    })
  })
}

function clearPlayedCardsEvent(io){
  return new Promise((resolve, reject) => {
    io.emit("clear-hand");
    setTimeout(()=>{
      resolve();
    },500);
  })
}

function waitFunction(duration) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration)
  })
}

function updatePlayersHandEvent(players,io,round_id){
  return new Promise((resolve, reject) => {
    io.emit("update-hands-info",players,round_id);
    setTimeout(()=>{
      resolve();
    },200);
  })
}

function updateWinnerInfo(player,io){
  return new Promise((resolve, reject) => {
    io.emit("update-winner-info",player);
    setTimeout(()=>{
      resolve();
    },2000);
  })
}


function updatePlayersStatsTable(players,io,round_id){
  return new Promise((resolve, reject) => {
    io.emit("update-players-stats-table",players,round_id);
    setTimeout(()=>{
      resolve();
    },1000);
  })
}


function leftShift(array, shifts) {
  while (shifts != 0) {
    let temp = array.shift();
    array.push(temp);
    shifts--;
  }
  return array;
}







module.exports = {
  Round,
  initRoundConfigs: (socket_server_io, players_sockets) => {
    io = socket_server_io,
      connected_players_sockets = players_sockets;
  }
}
