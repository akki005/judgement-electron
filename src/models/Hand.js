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
          card_index = await askToPlayHand(player, availability.start_index, availability.end_index, this.connected_players_sockets[player.id], this.io);
        } while (card_index > availability.end_index || card_index < availability.start_index)

        played_card = player.playCard(card_index);

        await updateRemainingCardsInUI(player,this.connected_players_sockets[player.id]);

        if (player.id == first_turn_player.id) {
          this.starting_sign = played_card.sign;
        }
       
        this.plays.push({
          player_id: player.id,
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
      winner = played_trump_cards[0];
    } else if (played_trump_cards.length == 1) {
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
    }
    this.winner = this.players.find((player) => player.id == winner.player_id);
    return this.winner;
  }

}



function askToPlayHand(player, start_index, end_index, socket,io) {
  return new Promise((resolve, reject) => {
    io.emit("wait-to-play-card",player);
    socket.emit("play-card", {
      player,
      start_index,
      end_index
    }, (played_card) => {
      io.emit("update-ui-played-card", player, played_card);
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
