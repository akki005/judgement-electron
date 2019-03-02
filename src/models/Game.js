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

class Game {


  constructor() {
    this.io = undefined;
    this.connected_players_socket = {};
    this.player = undefined;
    this.dealt_acknowledgement = 0;
    this.remote_ip = undefined;
    this.host = false;
    this.ip = undefined;
    this.port = this.remote_port = 8080;
    this.max_players = 5;
    this.no_players_to_be_expected_to_join = undefined;
    this.deck = new Deck(52);
    this.ranks_power = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
    this.players = [];
    this.sign_sequence = ["spade", "diamond", "club", "heart"];
    this.no_of_cards_at_start = 3;
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

  setThisClientMeta(
    name,
    id
  ) {
    this.player = {
      name,
      id
    };
  }

  getServerAddress() {
    return `http://${this.ip}:${this.port}`;
  }


  setRemoteServerProps(ip, port) {
    this.remote_ip = ip;
    this.remote_port = port;
  }


  getRemoteServerAddress() {
    return `http://${this.remote_ip}:${this.remote_port}`;
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
      this.io.emit("create-player-stats-table",this.rounds,this.players);
      for (const round of this.rounds) {
        if (starting_turn > this.players.length - 1) {
          starting_turn = 0;
        }
        this.io.emit("round-start", round);
        await waitFunction(500);
        this.dealt_acknowledgement = 0;
        let round1 = new Round(round.id, round.sign, starting_turn, this.players, round.no_of_cards_at_start, this.ranks_power, this.connected_players_socket, this.io);
        await round1.dealCards(this.deck);
        this.io.emit("dealt-cards", this.players);
        while (this.dealt_acknowledgement != this.players.length) {
          await waitFunction(50);
        }
        await round1.placeHandsBets();
        await round1.play();
        this.resetPlayers();
        this.deck.reset();
        starting_turn++;
      }
    } catch (error) {
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
    this.ip = this.remote_ip = ips.wlp4s0[0].address;

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

    this.io = socket_io(server);

    this.io.on("connection", (socket) => {
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
            this.connected_players_socket[player_data.name] = socket;
            updateJoinedPlayersUI(this.players, this.no_players_to_be_expected_to_join);
            socket.emit("game-joined");
          }
        } else {
          socket.disconnect(true);
        }
      })

      socket.on("played-card", (player, card) => {
        this.io.emit("update-ui-played-card", player, card);
      })

      socket.on("dealt-card-acknowledgement", () => {
        this.dealt_acknowledgement++;
      })

    })
    this.host = true;
    this.startClient();
  }


  startClient() {
    console.log("starting client");
    let client = socket_client(this.getRemoteServerAddress());


    client.on("connect", () => {
    })

    client.emit("join-game", this.player);

    client.on("dealt-cards", (players) => {
      let current_player_data = players.filter((player) => player.name == this.player.name)[0];
      updateUIAfterCardDistribution(players, current_player_data).then(() => client.emit("dealt-card-acknowledgement"))
    })

    if (!this.host) {
      client.on("game-joined", () => {
        updateUIAfterGameJoined();
      })
    }

    client.on("place-bet", (player) => {
      updateUIAndPlaceBet(player, (no_of_hands) => {
        client.emit("placed-bet", no_of_hands);
      });
    })

    client.on("play-card", ({
      player,
      start_index,
      end_index
    }, fn) => {
      playCard(player, start_index, end_index, (card) => {
        client.emit("played-card", player, card);
        fn(card);
      })
    })

    client.on("update-ui-played-card", (player, card) => {
      updateUIAfterCardPlay(card, () => {})
    })


    client.on("update-remaining-card", (player, fn) => {
      updateRemainingCardsOfPlayerInUI(player);
      fn();
    })

    client.on("round-start", (round) => {
      updateRoundInfo(round);
    })

    client.on("clear-hand", () => {
      clearPlayedCardsInUI();
    });

    client.on("update-hands-info", (players, round_id) => {
      updateHandsInfoInUI(players, this.player, round_id);
    })

    client.on("update-winner-info", (player) => {
      showWinnerInfoInUI(player);
    })

    client.on("update-players-stats-table", (players, round_id) => {
      updatePlayersStatsTableInUI(players, round_id);
    })

    client.on("create-player-stats-table", (rounds,players) => {
       createPlayersStatsTableInUI(rounds, players);
    })
  }

  stopServer() {
    if (this.io) {
      this.io.close();
    }
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



function updateUIAfterCardDistribution(players, current_player) {
  return new Promise((resolve, reject) => {
    let images_base = "./images/"
    let html = ``;
    players.forEach((player) => {
      html += `<div id=${player.name} class="row single-player-area">
      <div class="row player-box-header">
      <h4 class="player-name"> ${player.name}<i class="far fa-dot-circle play-dot" id="${player.name}-play-dot"></i>
      </h4>
      <h4 id="${player.name}-round-stats" class="round-stats"></h4>
      </div>`

      if (player.name == current_player.name) {
        html += `<div id="${player.name}_cards" class="row cards-area">`
        player.cards.forEach((card, index) => {
          let card_class = index == 0 ? "first-card" : "other-cards";
          html += `
          <div id="${player.name}_card_${index}" class="${player.name}_cards d-inline-block all-cards" data-card-rank="${card.rank}" data-card-sign="${card.sign}" data-card-index="${index}" >
          <img src="${images_base+card.rank}_of_${card.sign}s.png" class="card-image">
          </div>`
        })
      } else {
        html += `<div id="${player.name}_cards" class="col-md-12 cards-area">`
        player.cards.forEach((card, index) => {
          let card_class = index == 0 ? "first-card" : "other-cards";
          html += `
          <div class="d-inline-block all-cards">
          <img src="${images_base}back.png" class="card-image" id="${player.name}_card_${index}">
          </div>`
        })
      }
      html += `</div></div>`;
      $(`.${player.name}_cards`).off("click");
    })
    $("#playArea").html(html);
    $(".play-dot").hide();
    setTimeout(() => {
      resolve();
    }, 2000);
  });
}


function waitFunction(duration) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration)
  })
}


function updateUIAfterGameJoined() {
  $("#main").load("./templates/playarea.html", function () {
    $("#playArea").text("Waiting other players to join");
  });
}

function updateUIAndPlaceBet(player, callback) {
  $('#playerBetModal').modal('show');
  $('#playerBetModal').on('shown.bs.modal', function (e) {
    $("#noOfHandsSubmit").click(() => {
      let no_of_hands = $("#noOfHands").val();
      let html = `Bet-${no_of_hands},Hands-${0}`;
      $(`#${player.name}-round-stats`).html(html);
      callback(no_of_hands);
    })
  })
}

function playCard(player, start_index, end_index, callback) {

  let flash = setInterval(() => {
    blink();
  }, 1000)

  function blink() {
    // $(`#${player.name}-play-dot`).hide("click");
    $(`#${player.name}-play-dot`).fadeOut(500);
    $(`#${player.name}-play-dot`).fadeIn(500);
  }
  $(`.${player.name}_cards`).on("click");
  // $(`#${player.name}`).append("<h2>Play a card</h2>");

  for (let index_of_card = start_index; index_of_card <= end_index; index_of_card++) {
    $(`#${player.name}_card_${index_of_card}`).addClass("active-cards");
  }


  $(`.${player.name}_cards`).click(function () {
    clearInterval(flash);
    $(`#${player.name}-play-dot`).fadeOut("fast");
    let rank = $(this).data("card-rank");
    let sign = $(this).data("card-sign");
    let index = $(this).data("card-index");
    if (index >= start_index && index <= end_index) {
      $(`#${player.name}-play-message`).hide();
      callback({
        rank,
        sign,
        index
      })
    }
  })

}


function updateRemainingCardsOfPlayerInUI(player) {
  let images_base = "./images/";
  let html = ``;
  player.cards.forEach((card, index) => {
    html += `
    <div id="${player.name}_card_${index}" class="${player.name}_cards d-inline-block all-cards" data-card-rank="${card.rank}" data-card-sign="${card.sign}" data-card-index="${index}" >
      <img src="${images_base+card.rank}_of_${card.sign}s.png" class="card-image">
    </div>`

  })
  $(`#${player.name}_cards`).html(html);
  $(`.${player.name}_cards`).off("click");
}



function updateUIAfterCardPlay(card, callback) {
  let images_base = "./images/"
  let html = `<div class="played-card-area col-md-3 col-sm-3"><img src="${images_base+card.rank}_of_${card.sign}s.png" class="card-image"></div>`;
  $("#playedCard").append(html);
  callback();
}


function updateRoundInfo(round) {
  let html = `
    <h4> Round - ${round.id+1}, Trump - ${round.sign}, Total Cards - ${round.no_of_cards_at_start}</h4>`
  $("#roundInfo").html(html);
}


function clearPlayedCardsInUI() {
  let html = `<div class="played-card-area col-md-3"></div>`
  $("#playedCard").html(html);
}


function showWinnerInfoInUI(player) {
  $("#winner-info").html(`${player.name} won the round`);
  $('#playerWonModal').modal('show');
  setTimeout(() => {
    $('#playerWonModal').modal('hide');
  }, 2000)
}


function updateHandsInfoInUI(players, current_player, round_id) {

  let table_html = ''
  players.forEach((player) => {
    if (player.name == current_player.name) {
      let html = `Bet-${player.no_of_hands_bet},Hands-${player.hands}`;
      $(`#${player.name}-round-stats`).html(html);
    }
  })
}


function updatePlayersStatsTableInUI(players, round_id) {
  players.forEach((player) => {
    let round_stat = player.rounds_stats.filter((round) => round.id == round_id)[0];
    $(`#${player.name}-${round_id}-row`).html(`${round_stat.points}`);
  })
}


function createPlayersStatsTableInUI(rounds, players) {

    let table_head_html = `<thead><tr><th>Trump</th>`;

    players.forEach((player) => {
      table_head_html += `<th>${player.name}</th>`
    })

    table_head_html += ` </tr></thead>`;

    let table_body = `<tbody>`;

    rounds.forEach((round) => {
      let table_row = `<tr><td>${round.sign}</td>`;
      players.forEach((player) => {
        table_row += `<td id=${player.name}-${round.id}-row></td>`
      })
      table_row += `</tr>`;
      table_body += table_row;
    })

    table_body += `</tbody>`;

    let table_html = table_head_html + table_body
    $("#playersStatsTable").html(table_html);


}

module.exports = {
  Game
}
