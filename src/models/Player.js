let {
  Suit
} = require("./Suit");

let {
  ipcMain
} = require("electron");

let game_window;

module.exports.init = (win) => {
  game_window = win;
}

class Player {

  constructor(name, position) {
    this.name = name;
    this.no_of_hands_bet = 0;
    this.cards = [];
    this.hands = 0;
    this.spades = [];
    this.hearts = [];
    this.diamonds = [];
    this.clubs = [];
    this.position = position;
    this.rounds_stats = [];
    this.total_points = 0;
  }

  resetState() {
    this.no_of_hands_bet = 0;
    this.cards = [];
    this.hands = 0;
    this.spades = [];
    this.hearts = [];
    this.diamonds = [];
    this.clubs = [];
  }

  addHand() {
    this.hands++;
  }


  addCard(Card) {

    this[Card.sign + "s"].push(Card);
    this.cards.push(Card);
  }

  getAvailableCardsToPlay(sign_to_play = undefined) {
    let start_index;
    let end_index;
    if (sign_to_play && this[sign_to_play + "s"].length > 0) {
      start_index = this.cards.findIndex(Card => Card.sign == sign_to_play);
      end_index = start_index + this[sign_to_play + "s"].length - 1;
    } else {
      if (sign_to_play) console.log(`${this.name} doesn't have any ${sign_to_play}`);
      start_index = 0;
      end_index = this.cards.length - 1;
    }
    let available_cards = this.cards.slice(start_index, end_index + 1);
    return {
      start_index,
      end_index,
      available_cards
    }
  }

  playCard(index) {
    let played_card;
    played_card = this.cards[index];
    this[played_card.sign + "s"] = this[played_card.sign + "s"].filter((card) => {
      return played_card.rank != card.rank
    })
    this.cards.splice(index, 1)
    return played_card;
  }

  arrangeCards() {
    this.cards = this.spades.concat(this.hearts).concat(this.diamonds).concat(this.clubs);
  }

  setRoundOutCome(id, outcome, points) {
    if (outcome == "won") {
      this.total_points += points;
    }
    this.rounds_stats.push({
      status: outcome,
      id: id,
      no_of_hands_bet: this.no_of_hands_bet,
      hands: this.hands
    })
  }




}

module.exports.Player = Player;
