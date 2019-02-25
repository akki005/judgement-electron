let {
  ipcMain
} = require("electron");

let game_window;

module.exports.init = (win) => {
  game_window = win;
}

class Suit {


  constructor(sign, no_of_cards) {
    this.sign = sign;
    this.no_of_cards = no_of_cards;
    this.cards = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  }

  reset(no_of_cards) {
    this.no_of_cards = no_of_cards;
    this.cards = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  }

  removeFromSuit(rank_to_remove) {
    this.cards = this.cards.filter((rank) => {
      if (rank == rank_to_remove) {
        return false
      } else {
        return true;
      }
    })
    this.no_of_cards--;
  }


  getRandomRank() {
    let min = Math.ceil(0);
    let max = Math.floor(this.no_of_cards - 1);
    let card_index = Math.floor(Math.random() * (max - min + 1)) + min;
    let rank = this.cards[card_index]
    this.removeFromSuit(rank);
    return rank;
  }

  orderByRank(cards) {
    cards.sort((current_card, next_card) => {
      return this.ranks.indexOf(current_card.rank) - this.ranks.indexOf(next_card.rank);
    })
    return cards;
  }

}

module.exports = {
  Suit
}
