let {
  Player
} = require("./Player");
let {
  Hand
} = require("./Hand");
let {
  ipcMain
} = require("electron");

let game_window;

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});



class Round {


  constructor(id, trump_card, stating_turn_index, players, no_of_cards_for_each_player, rank_powers) {
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
  }

  async placeHandsBets() {
    try {
      for (const player of this.players) {
        console.log(` `);
        console.log(`=====================${player.name} Turn ===========================`);
        console.log(">>>>> Trump card - ", this.trump_card);
        console.log(` `);
        console.log("*****All Available Cards*****");
        console.log(` `);
        console.log(player.cards);
        console.log(` `);
        let no_of_hands_bet = await askToPlaceBet(player.name);
        console.log(`${player.name} has bet ${no_of_hands_bet}`);
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
      await updateUIAfterCardDistribution(this.players);
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
        console.log(` `);
        console.log(`>>>>>>>>>>>>>>>>>>>>Hand Start ${hand_count}<<<<<<<<<<<<<<<<<<<<`);
        let hand = new Hand(this.players, this.rank_powers, this.trump_card);
        await hand.play(this.players[0]);
        let winner_player = hand.getWinner();
        console.log(`$$$$$$$$$$$$$$$$$$$ Winner ${winner_player.name} $$$$$$$$$$$$$$$$$$$`);
        winner_player.addHand();
        let player_index = this.players.findIndex((player) => player.name == winner_player.name);
        leftShift(this.players, player_index);
        console.log(` `);
        console.log(`>>>>>>>>>>>>>>>>>>>>Hand End ${hand_count}<<<<<<<<<<<<<<<<<<<<`);
        console.log(` `);
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

function askToPlaceBet(player_name) {
  return new Promise((resolve, reject) => {
    game_window.webContents.send("place-bet", player_name);
    ipcMain.on("placed-bet", function (event, bet) {
      resolve(bet);
    })
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


function updateUIAfterCardDistribution(players) {
  return new Promise((resolve, reject) => {
    $('#playersConnectModal').modal('hide');
    $('#playersConnectModal').on('hidden.bs.modal', function (e) {
      $("#main").load("./templates/playarea.html", function () {
        let images_base = "./images/"
        let html = '';
        players.forEach((player) => {
          html += `<h1> Player - ${player.name}</h1>`
          player.cards.forEach((card, index) => {
            html += `<img src="${images_base+card.rank}_of_${card.sign}s.png" height="80" width="80" id="${player.name}_card_${index}" class="cards">`
          })
        })
        $("#playArea").html(html);
        setTimeout(() => {
          resolve();
        }, 2000);
      });

    })
  })

}




module.exports = {
  Round,
  initWindowInRound: (win) => {
    game_window = win;
  }
}
