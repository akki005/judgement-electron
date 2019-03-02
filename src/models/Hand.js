let {
  ipcMain
} = require("electron");

let game_window;

module.exports.init = (win) => {
  game_window = win;
}

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const QUESTION_PLAY_CARD = 'Play a card';



class Hand {
  constructor(players, rank_power, trump_sign, connected_players_sockets, io) {
    this.players = players;
    this.rank_power = rank_power;
    this.trump_sign = trump_sign;
    this.winner = undefined;
    this.plays = [];
    this.starting_sign = undefined;
    this.connected_players_sockets = connected_players_sockets;
    this.io = io;
  }

  async play(first_turn_player) {
    try {

      for (const player of this.players) {
        let availability;
        let played_card;
        let card_index;

        availability = player.getAvailableCardsToPlay(this.starting_sign);
        do {
          card_index = await askToPlayHand(player, availability.start_index, availability.end_index, this.connected_players_sockets[player.name], this.io);
        } while (card_index > availability.end_index || card_index < availability.start_index)

        played_card = player.playCard(card_index);

        await updateRemainingCardsInUI(player,this.connected_players_sockets[player.name]);

        if (player.name == first_turn_player.name) {
          this.starting_sign = played_card.sign;
        }
       
        this.plays.push({
          player: player.name,
          card: played_card
        });

      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  getWinner() {
    let winner;
    let played_trump_cards = this.plays.filter((play) => play.card.sign == this.trump_sign);

    if (played_trump_cards.length > 1) {
      played_trump_cards.sort((play_current, play_next) => {
        return this.rank_power.indexOf(play_current.card.rank) - this.rank_power.indexOf(play_next.card.rank)
      })
      // console.log(`sorted plays`,played_trump_cards);
      winner = played_trump_cards[0];
    } else if (played_trump_cards.length == 1) {
      // console.log(`sorted plays`,played_trump_cards);
      winner = played_trump_cards[0]
    } else {

      let power_sign = this.plays[0].card.sign;

      let plays_with_power_sign = this.plays.filter((play) => play.card.sign == power_sign);

      if (plays_with_power_sign.length != 0) {
        plays_with_power_sign.sort((play_current, play_next) => {
          return this.rank_power.indexOf(play_current.card.rank) - this.rank_power.indexOf(play_next.card.rank)
        })
        // console.log(`sorted plays`);
        winner = plays_with_power_sign[0];
      } else {
        // console.log(`sorted plays`,this.plays);
        winner = this.plays[0]
      }

      /*       this.plays.sort((play_current, play_next) => {
              return this.rank_power.indexOf(play_current.card.rank) - this.rank_power.indexOf(play_next.card.rank)
            })
            winner = this.plays[0] */
    }
    this.winner = this.players.find((player) => player.name == winner.player);
    return this.winner;
  }

}



function askToPlayHand(player, start_index, end_index, socket) {
  return new Promise((resolve, reject) => {
    socket.emit("play-card", {
      player,
      start_index,
      end_index
    }, (played_card) => {
      resolve(played_card.index);
    });
  });
}

function updateRemainingCardsInUI(player,socket){
  return new Promise((resolve, reject) => {
    socket.emit("update-remaining-card",player, () => {
      resolve();
    });
  });
}





module.exports = {
  Hand
}
