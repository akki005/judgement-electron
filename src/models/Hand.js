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
  constructor(players, rank_power, trump_sign) {
    this.players = players;
    this.rank_power = rank_power;
    this.trump_sign = trump_sign;
    this.winner = undefined;
    this.plays = [];
    this.starting_sign = undefined;
  }

  async play(first_turn_player) {
    try {

      for (const player of this.players) {
        console.log(``);
        console.log(`=====================${player.name} Turn ===========================`);
        let availability;
        let played_card;
        let card_index;

        availability = player.getAvailableCardsToPlay(this.starting_sign);
        console.log(``);
        console.log(`********Available Cards********`);
        console.log(` `);
        console.log(availability.available_cards);
        console.log(` `);
        console.log("Hands left to collect-", (player.no_of_hands_bet - player.hands));

        do {
          console.log(` `);
          card_index = await askToPlayHand(player.name, availability.start_index, availability.end_index);
        } while (card_index > availability.end_index || card_index < availability.start_index)

        played_card = player.playCard(card_index);

        if (player.name == first_turn_player.name) {
          this.starting_sign = played_card.sign;
        }
        console.log(` `);
        console.log(`${player.name} played -->${JSON.stringify(played_card)}`);

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
    console.log(` `);
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



function askToPlayHand(player_name, start_index, end_index) {
  return new Promise((resolve, reject) => {
    rl.question(`${player_name} play a card between ${start_index}-${end_index}`, (card_index) => {
      resolve(card_index);
    });
  });
}




module.exports = {
  Hand
}
