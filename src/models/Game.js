let {
  Player
} = require("./Player");
const {
  Deck
} = require("./Deck");
const {
  Round
} = require("./Round");



let _ = require("lodash");
let dgram = require('dgram');
let http = require("http");
let ip_module = require("ip");
let os = require("os");
let socket_io = require("socket.io");
var socket_client = require('socket.io-client');
let server = undefined;
let portfinder = require('portfinder');
let constants = require("../constant");
let debug = require("debug")("JM");

class Game {


  constructor() {
    this.client = undefined;
    this.udp_server = undefined;
    this.udp_client = undefined
    this.broadcast_address = undefined;
    this.broadcast_port = 8080;
    this.upd_server_broadcast_interval;
    this.hosts = [];
    this.io = undefined;
    this.connected_players_socket = {};
    this.player = undefined;
    this.dealt_acknowledgement = 0;
    this.remote_ip = undefined;
    this.host = false;
    this.ip = undefined;
    this.port = this.remote_port = undefined;
    this.max_players = 5;
    this.no_players_to_be_expected_to_join = undefined;
    this.deck = new Deck(52);
    this.ranks_power = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
    this.players = [];
    this.sign_sequence = ["spade", "diamond", "club", "heart"];
    this.initRoundsInfo();
  }

  initRoundsInfo() {
    this.no_of_cards_at_start = 10;
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

  restart() {
    this.deck.reset();
    this.initRoundsInfo();
    this.players.forEach((player) => {
      player.restartGameResetState();
    })
    this.io.emit("restart-game");
    setTimeout(() => {
      this.start();
    }, 2000);
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

  getPlayer(id) {
    let player_found = this.players.find((player) => {
      return player.id == id;
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

  removePlayer(id) {
    let player_index = this.players.findIndex((player) => player.id == id);
    this.players.splice(0, player_index);
  }

  async start() {
    try {
      debug("-----Starting Game---");
      debug("All Players", this.players);
      let starting_turn = 0;
      this.io.emit("create-player-stats-table", this.rounds, this.players);
      for (const round of this.rounds) {
        if (starting_turn > this.players.length - 1) {
          starting_turn = 0;
        }
        debug("Starting Round-->", round.id);
        this.io.emit("round-start", round);
        await waitFunction(100);
        this.dealt_acknowledgement = 0;
        let round1 = new Round(round.id, round.sign, starting_turn, this.players, round.no_of_cards_at_start, this.ranks_power, this.connected_players_socket, this.io);
        debug("Dealing Cards for round-->", round.id);
        await round1.dealCards(this.deck);
        this.io.emit("dealt-cards", this.players);
        while (this.dealt_acknowledgement != this.players.length) {
          await waitFunction(50);
        }
        await round1.placeHandsBets();
        await round1.play();
        this.io.emit("round-end", this.players);
        this.resetPlayers();
        this.deck.reset();
        starting_turn++;
      }
      this.io.emit("show-game-stats");
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
  

  async startServer() {

    let connected_clients = new Map();
    this.ip = this.remote_ip = ip_module.address();

    server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-type': 'text/plan'
      });
      res.write('Hello Node JS Server Response');
      res.end();
    });

    this.port = this.remote_port = await portfinder.getPortPromise();

    server.listen(this.port, this.ip);
    server.on("error", (error) => {
      console.error(error);
    });
    server.on("listening", () => {
      debug(`${constants.console_signs.check} server started on ${this.ip}:${this.port}`);
    })

    this.broadcast_address = getBroadCastAddress(this.ip);

    this.udp_server = dgram.createSocket({
      type: 'udp4'
    });

    this.udp_server.bind(() => {
      this.udp_server.setBroadcast(true);
      this.upd_server_broadcast_interval = setInterval(() => {
        let message = new Buffer.from(`Judgment Host --${this.player.name}::${this.ip}::${this.port}`);
        this.udp_server.send(message, 0, message.length, this.broadcast_port, this.broadcast_address, function () {
          debug("Sent '" + message + "'");
        });
      }, 3000);
    });


    this.io = socket_io(server);

    this.io.on("connection", (socket) => {
      /**
       * handle player disconnect
       */
      socket.on("disconnect", () => {
        let player_id = connected_clients.get(socket.id);
        if (player_id) {
          debug(`${constants.console_signs.cross} Player ${JSON.stringify(player_id)} disconnected`);
          this.removePlayer(player_id);
          updateJoinedPlayersUI(this.players, this.no_players_to_be_expected_to_join);
        } else {
          debug("someone left");
        }
      })

      /**
       * handle player game join
       */
      socket.on("join-game", (player_data) => {
        if (player_data && player_data.name && player_data.id) {
          connected_clients.set(socket.id, player_data.id);
          debug(`Join Game Request from -> ${player_data.name}`);
          if (!this.addPlayer(player_data.name, player_data.id)) {
            socket.emit("maximum-players-reached");
            socket.disconnect(true);
          } else {
            this.connected_players_socket[player_data.id] = socket;
            updateJoinedPlayersUI(this.players, this.no_players_to_be_expected_to_join);
            debug(`${constants.console_signs.check} ${player_data.name} joined game`);
            socket.emit("game-joined");
          }
        } else {
          socket.disconnect(true);
        }
      })

      socket.on("dealt-card-acknowledgement", () => {
        this.dealt_acknowledgement++;
      })

    })
    this.host = true;
    this.startSocketClient();
  }


  stopUdpServer() {
    clearInterval(this.upd_server_broadcast_interval);
    this.udp_server.close();
  }

  startClient() {

    this.ip = this.remote_ip = ip_module.address();
    this.broadcast_address = getBroadCastAddress(this.ip);

    this.udp_client = dgram.createSocket({
      type: 'udp4'
    });

    this.udp_client.on('listening', () => {
      var address = this.udp_client.address();
      debug(`${constants.console_signs.check} UDP Client listening on ${address.address}:${address.port}`);
      this.udp_client.setBroadcast(true);
    });

    this.udp_client.on('message', (message, rinfo) => {
      message = message.toString();
      debug('Message from: ' + rinfo.address + ':' + rinfo.port + ' - ' + message);
      if (message.includes("Judgment Host")) {
        debug("Message from Judgment host");
        let judgment_host_info = message.split("--")[1];
        let [name, ip, port] = judgment_host_info.split("::");
        if (!this.hosts.includes(ip)) {
          this.hosts.push(ip)
          debug(`Judgment host name:${name},ip:${ip},port:${port}`);
          updateUIOnHostFound(name, ip, port);
          this.udp_client.close();
        }
      }
    });

    this.udp_client.bind(this.broadcast_port);


  }


  startSocketClient() {

    this.client = socket_client(this.getRemoteServerAddress());

    this.client.on("connect", () => {})

    this.client.on("disconnect", () => {
      updateUIOnHostDisconnect();
    });

    this.client.emit("join-game", this.player);

    this.client.on("dealt-cards", (players) => {
      let current_player_data = players.filter((player) => player.id == this.player.id)[0];
      updateUIAfterCardDistribution(players, current_player_data).then(() => this.client.emit("dealt-card-acknowledgement"))
    })

    if (!this.host) {
      this.client.on("game-joined", () => {
        updateUIAfterGameJoined();
      })
    }

    this.client.on("place-bet", (player, fn) => {
      updateUIAndPlaceBet(player, (no_of_hands) => {
        fn(no_of_hands);
      });
    })

    this.client.on("placing-bet", (player) => {
      updateUIWhilePlayerIsPlacingBet(player, this.player);
    })


    this.client.on("play-card", ({
      player,
      start_index,
      end_index
    }, fn) => {
      playCard(player, start_index, end_index, (card) => {
        // client.emit("played-card", player, card);
        fn(card);
      })
    })

    this.client.on("update-ui-played-card", (player, card) => {
      updateUIAfterCardPlay(player, card, () => {})
    })


    this.client.on("update-remaining-card", (player, fn) => {
      updateRemainingCardsOfPlayerInUI(player);
      fn();
    })

    this.client.on("round-start", (round) => {
      updateRoundInfo(round);
    })

    this.client.on("clear-hand", () => {
      clearPlayedCardsInUI();
    });

    this.client.on("update-hands-info", (players, round_id) => {
      updateHandsInfoInUI(players, this.player, round_id);
    })

    this.client.on("update-winner-info", (player) => {
      showWinnerInfoInUI(player);
    })

    this.client.on("update-players-stats-table", (players, round_id) => {
      updatePlayersStatsTableInUI(players, round_id);
    })

    this.client.on("create-player-stats-table", (rounds, players) => {
      createPlayerTurnTableInUI(rounds, players);
      createPlayersStatsTableInUI(rounds, players);
    })

    this.client.on("placed-bet", (player, hands, total_hands_bet, total_card_for_round) => {
      updateAllClientsUIAfterPlayerBets(player, hands, total_hands_bet, total_card_for_round);
    })

    this.client.on("wait-to-play-card", (player) => {
      updateTurnTableInUI(player);
    })

    this.client.on("show-game-stats", () => {
      showGameStatsAtEnd(this.host);
    })

    this.client.on("restart-game", () => {
      restartGame();
    })

    this.client.on("round-end", (players) => {
      updateUIAfterRoundEnd(players);
    })
  }



  stopServer() {
    if (this.io) {
      this.io.close();
    }
    if (server) {
      server.close();
    }
    if (this.udp_client) {
      this.udp_client.close();
    }
    if (this.udp_server) {
      clearInterval(this.upd_server_broadcast_interval);
      this.udp_server.close();
    }
    console.log("killed server");
  }

}

function updateUIOnHostDisconnect() {
  $("#availableGames").html(``);
}


function updateUIOnHostFound(name, ip, port) {
  $("#joinGameSubmit").prop('disabled', false);
  $("#availableGames").append(`<option value="${name}_${ip}_${port}" class="available-games-options">${name}</option>`);
}


function updateTurnTableInUI(player) {
  $(`#${player.id}-turn-table-dot`).show();
}


function updateAllClientsUIAfterPlayerBets(player, hands, total_hands_bet, total_card_for_round) {
  $('#playerBetWaitModal').modal('hide');
  $(`#${player.id}-hands-bet-table`).html(hands);
  $(`#${player.id}-hands-left-table`).html(hands);
  let hands_left=total_card_for_round - total_hands_bet;
  if(hands_left==0){
    $(`#total-hands-bet`).css('color','green');
  }else{
    $(`#total-hands-bet`).css('color','red');
  }
  $(`#total-hands-bet`).html(hands_left);

}


function updateUIWhilePlayerIsPlacingBet(player, current_player) {
  if (player.id != current_player.id) {
    $("#player-bet-wait-info").html(`Waiting for - ${player.name} to place bet`);
    $('#playerBetWaitModal').modal('show');
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
    $("#showStatsHeader").show();
    $("#roundinfo-header-row").show();
    $("#players-stats-div").show();
    $("#playerJoinWaitModal").modal('hide');
    let images_base = "./images/"
    let html = ``;
    players.forEach((player) => {
      if (player.id == current_player.id) {
        html += `<div id="${player.id}" class="row single-player-area">
      <div class="row player-box-header">
      </div>`
        html += `<div id="${player.id}_cards" class="row cards-area">`
        player.cards.forEach((card, index) => {
          let card_class = index == 0 ? "first-card" : "other-cards";
          html += `
          <div id="${player.id}_card_${index}" class="${player.id}_cards d-inline-block all-cards" data-card-rank="${card.rank}" data-card-sign="${card.sign}" data-card-index="${index}" >
          <img src="${images_base+card.rank}_of_${card.sign}s.png" class="card-image">
          </div>`
        })
        html += `</div></div>`;
        $(`.${player.id}_cards`).off("click");
      }
    })
    $("#playArea").html(html);
    $(".play-dot").hide();
    setTimeout(() => {
      resolve();
    }, 500);
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
    $("#roundinfo-header-row").hide();
    $("#players-stats-div").hide();
    $("#playerJoinWaitModal").modal('show');
  });
}

function updateUIAndPlaceBet(player, callback) {
  $('#playerBetWaitModal').modal('hide');
  $('#playerBetModal').modal('show');
  $("#playerTurnNotification").trigger('play');
  $('#playerBetModal').on('shown.bs.modal', function (e) {
    $("#noOfHandsSubmit").click(() => {
      $('#playerBetModal').on('hidden.bs.modal', function () {
        $("#playerBetModal").off();
        let no_of_hands = $("#noOfHands").val();
        let html = `Bet-${no_of_hands},Hands-${0}`;
        $(`#${player.id}-round-stats`).html(html);
        callback(no_of_hands);
      });
    })
  })
}

function playCard(player, start_index, end_index, callback) {

  $("#playerTurnNotification").trigger('play');

  let flash = setInterval(() => {
    blink();
  }, 500)

  function blink() {
    $(`#${player.id}-play-dot`).fadeOut(250);
    $(`#${player.id}-play-dot`).fadeIn(250);
  }
  $(`.${player.id}_cards`).on("click");

  for (let index_of_card = start_index; index_of_card <= end_index; index_of_card++) {
    $(`#${player.id}_card_${index_of_card}`).addClass("active-cards");
  }


  $(`.${player.id}_cards`).click(function () {
    clearInterval(flash);
    $(`#${player.id}-play-dot`).fadeOut("fast");
    let rank = $(this).data("card-rank");
    let sign = $(this).data("card-sign");
    let index = $(this).data("card-index");
    if (index >= start_index && index <= end_index) {
      $(`#${player.id}-play-message`).hide();
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
    <div id="${player.id}_card_${index}" class="${player.id}_cards d-inline-block all-cards" data-card-rank="${card.rank}" data-card-sign="${card.sign}" data-card-index="${index}" >
      <img src="${images_base+card.rank}_of_${card.sign}s.png" class="card-image">
    </div>`

  })
  $(`#${player.id}_cards`).html(html);
  $(`.${player.id}_cards`).off("click");
}



function updateUIAfterCardPlay(player, card, callback) {
  $(`#${player.id}-turn-table-dot`).hide();
  let images_base = "./images/"
  let html = `<div class="single-played-card hvr-grow" id="${player.id}-played-card"><img src="${images_base+card.rank}_of_${card.sign}s.png" class="card-image"><h6 class="player-name-below-card">${player.name}</h6></div>`;
  $("#playedCard").append(html);
  callback();
}


function updateRoundInfo(round) {
  let images_base = "./images/"
  $("#playedCard").html(``);
  let html = `
    <h4><img class="round-info-img" src="${images_base}${round.sign}.png"></h4>`
  // <img src="${images_base}A_of_${round.sign}s.png" align="middle">
  $("#roundInfo").html(html);
}


function clearPlayedCardsInUI() {
  $("#playedCard").html(``);
}


function showWinnerInfoInUI(player) {
  $(`#${player.id}-played-card`).addClass("winner-player-card");
  $("#winner-info").html(`${player.name}`);
  $('#playerWonModal').modal('show');
  setTimeout(() => {
    $('#playerWonModal').modal('hide');
  }, 1500)
}


function updateHandsInfoInUI(players, current_player, round_id) {

  let table_html = ''
  players.forEach((player) => {
    if (player.id == current_player.id) {
      let html = `Bet-${player.no_of_hands_bet},Hands-${player.hands}`;
      $(`#${player.id}-round-stats`).html(html);
    }
    $(`#${player.id}-hands-bet-table`).html(player.no_of_hands_bet);
    $(`#${player.id}-hands-left-table`).html(player.no_of_hands_bet - player.hands);
  })
}


function updateUIAfterRoundEnd(players) {
  players.forEach((player) => {
    $(`#${player.id}-hands-bet-table`).html(``);
    $(`#${player.id}-hands-left-table`).html(``);
  })
  $(`#total-hands-bet`).html(``);
}

function updatePlayersStatsTableInUI(players, round_id) {
  players.forEach((player) => {
    let round_stat = player.rounds_stats.filter((round) => round.id == round_id)[0];
    $(`#${player.id}-${round_id}-row`).html(`${round_stat.points}`);
    $(`#${player.id}-total-row`).html(`${player.total_points}`);
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
      table_row += `<td id=${player.id}-${round.id}-row></td>`
    })
    table_row += `</tr>`;
    table_body += table_row;
  })

  let table_row_total = `<tr><td>Total</td>`;

  players.forEach((player) => {
    table_row_total += `<td id=${player.id}-total-row></td>`;
  })

  table_row_total += `</tr>`;
  table_body += table_row_total;
  let table_html = table_head_html + table_body

  $("#playersStatsTable").html(table_html);
  debug("Created players stats table");

}

function createPlayerTurnTableInUI(rounds, players) {

  let table_head_html = `<thead><tr><th>Player</th><th>Turn</th><th>Hands Bet</th><th>Hands Left</th>`;

  let table_body = `<tbody>`;

  players.forEach((player) => {
    let table_row = `
    <tr id="${player.id}-table-turn">
      <td>${player.name}</td>
      <td><i class="far fa-dot-circle play-dot" id="${player.id}-turn-table-dot"></i></td>
      <td id="${player.id}-hands-bet-table"></td>
      <td id="${player.id}-hands-left-table"></td>
    </tr>`;
    table_body += table_row;
  })

  table_body += `<tr id="total-cards">
  <td>Total Cards - Total Bet</td><td></td><td id="total-hands-bet"></td><td></td>
  </tr>`


  table_body += `</tbody>`;

  let table_html = table_head_html + table_body
  $("#playersTurn").html(table_html);
  debug("Created players turn table");
}

function showGameStatsAtEnd(isHost) {
  if (isHost) {
    let html_button_restart_game = `
    <div class="modal-footer">
     <button type="button" id="restartGame" class="btn btn-primary" data-dismiss="modal" >Restart Game</button>
    </div>`
    $("#playerStatsBody").append(html_button_restart_game);
  }
  $("#playersStatsModal").modal('show');
}

function restartGame() {
  $("#playersStatsModal").modal('hide');
}

function getBroadCastAddress(ip) {
  let broadcast_address;
  let ifaces = os.networkInterfaces();

  Object.keys(ifaces).forEach((interface) => {
    let network_details = _.find(ifaces[interface], {
      address: ip
    });
    if (network_details) {
      broadcast_address = ip_module.subnet(ip, network_details.netmask).broadcastAddress;
    }
  })
  console.log(`Broadcast Address-->`, broadcast_address);
  return broadcast_address;
}


module.exports = {
  Game
}
