let {
  Card
} = require("./Card");

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

class Deck {


  constructor(size) {
    this.size = size;
    this.signs = ["heart", "club", "spade", "diamond"];
    this.suit_size = size / 4;
    this.heart = new Suit("heart", this.suit_size);
    this.club = new Suit("club", this.suit_size);
    this.spade = new Suit("spade", this.suit_size);
    this.diamond = new Suit("diamond", this.suit_size);
    this.number_of_card_left = size;
  }

  reset() {
    this.number_of_card_left = this.size;
    this.heart.reset(this.suit_size);
    this.club.reset(this.suit_size);
    this.diamond.reset(this.suit_size);
    this.spade.reset(this.suit_size);
  }

  distributeCard() {
    let card = undefined;
    if (this.number_of_card_left > 0) {
      while (!card) {
        let sign = this.signs[Math.floor(Math.random() * ((this.signs.length - 1) - 0 + 1)) + 0];
        if (this[sign].no_of_cards > 0) {
          let rank = this[sign].getRandomRank();
          card = new Card(sign, rank);
        }
      }
    }
    return card;
  }


}

module.exports = {
  Deck
}
