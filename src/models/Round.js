let {
  Hand
} = require("./Hand");


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
        let no_of_hands_bet = await askToPlaceBet(player, this.connected_players_sockets[player.id],this.io);
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
    } catch (error) {
      return Promise.reject(error);
    }

  }


  async play() {
    try {
      /**
       * Play all hands
       */
      for (let cards = this.no_of_cards_for_each_player; cards > 0; cards--) {
        await clearPlayedCardsEvent(this.io);
        let hand = new Hand(this.players, this.rank_powers, this.trump_card, this.connected_players_sockets, this.io);
        await hand.play(this.players[0]);
        let winner_player = hand.getWinner();
        console.log(`$$$$$$$$$$$$$$$$$$$ Winner ${winner_player.name} $$$$$$$$$$$$$$$$$$$`);
        winner_player.addHand();
        await updateWinnerInfo(winner_player,this.io);
        await updatePlayersHandEvent(this.players,this.io,this.id);
        let player_index = this.players.findIndex((player) => player.id == winner_player.id);
        leftShift(this.players, player_index);
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

function askToPlaceBet(player, socket,io) {
  return new Promise((resolve, reject) => {
    io.emit("placing-bet", player);
    socket.emit("place-bet", player,(no_of_hands_bet)=>{
      io.emit("placed-bet", player,no_of_hands_bet);
      resolve(no_of_hands_bet);
    });
  })
}

function clearPlayedCardsEvent(io){
  return new Promise((resolve, reject) => {
    io.emit("clear-hand");
    setTimeout(()=>{
      resolve();
    },100);
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
    },100);
  })
}

function updateWinnerInfo(player,io){
  return new Promise((resolve, reject) => {
    io.emit("update-winner-info",player);
    setTimeout(()=>{
      resolve();
    },1350);
  })
}


function updatePlayersStatsTable(players,io,round_id){
  return new Promise((resolve, reject) => {
    io.emit("update-players-stats-table",players,round_id);
    setTimeout(()=>{
      resolve();
    },250);
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
  Round
}
