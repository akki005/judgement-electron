let {
  ipcRenderer
} = require("electron");
let isHost = false;
let server_started = false;
let total_no_of_players = 1;
let no_of_players_connected = 1;
let players = [{
  name: "akash",
  position: 0
}]
let ip_to_connect = undefined;
let port_to_connect = undefined;

console.log("Renderer");

/* ipcRenderer.on("players-added", () => {
  $('#GameStartModal').on('hidden.bs.modal', function (e) {
    $("#main").load("./templates/game.html", function () {
      ipcRenderer.send("done-loading-game-page");
    });
  })
})


ipcRenderer.on("place-bet", (event, player_name) => {
  $('#betPlayerName').html(player_name);
  $('#BetModal').modal('show');
})

$("#main").on("click","#betPlaced",() => {
  let bet = $("#hands-bet").val();
  $('#BetModal').modal('hide');
   ipcRenderer.send("placed-bet",bet);
})



ipcRenderer.on("all-players-info-after-deal-cards", (event, players) => {
  players.forEach(player => {
    console.log(player);
  });

  let images_base = "./images/playing-cards-assets/png/"
  let html = '';
  players.forEach((player) => {
    html += `<h1> Player - ${player.name}</h1>`
    player.cards.forEach((card, index) => {
      html += `<img src="${images_base+card.rank}_of_${card.sign}s.png" height="80" width="80" id="${player.name}_card_${index}" class="cards">`
      //html += `<p>${card.sign}|${card.rank}</p>`
    })
  })

  $("#playersInfo").html(html);
  cardPlayHandler();
  setTimeout(() => {
    ipcRenderer.send("done-rendering-cards", true);
  }, 2000);
})


function cardPlayHandler() {
  $('#playersInfo').on("click", ".cards", function (event) {
    var id = $(this).attr('id');
    console.log(id);
  });
}



$("#main").on("click", "#gameStart", function () {
  let players = [$("#player1").val(), $("#player2").val()];
  ipcRenderer.send("players-names", players);
})


$("#main").on("click", "#backToHome", function () {
  $("#main").load("./templates/gameStart.html");
})
*/

ipcRenderer.on("player-join-request", (event, {
  player_name,
  player_id
}) => {
  if (no_of_players_connected != total_no_of_players) {
    let player_position = players.length;
    players.push({
      name: player_name,
      player_position: player_position,
      id: player_id
    })
    no_of_players_connected++;
    $('#noOfPlayersConnected').val(no_of_players_connected);
    if (no_of_players_connected == total_no_of_players) {
      $("#startGameAfterPlayersJoined").prop('disabled', false);
    }
  } else {
    ipcRenderer.send("reject-player-connection");
  }
})

ipcRenderer.on("player-disconnect", (event, {
  player_name,
  player_id
}) => {
  no_of_players_connected--;
  $('#noOfPlayersConnected').val(no_of_players_connected);
})




$('#main').on("click", "#noOfPlayersSubmit", function (event) {
  total_no_of_players = $("#noOfPlayers").val();
  $('#GameStartModal').modal('hide');
  $('#GameStartModal').on('hidden.bs.modal', function (e) {
    $('#playersConnectModal').modal('show');
    $('#noOfPlayersConnected').val(no_of_players_connected);
    if (no_of_players_connected != total_no_of_players) {
      $("#startGameAfterPlayersJoined").prop('disabled', true);
    }
    // $('#noOfPlayersConnected').prop('disabled', true);
    $('#serverIp').html(`<p>${ip_to_connect}:${port_to_connect}</p>`);
  })
})


$('#main').on("click", "#startGameBtn", function () {
  isHost = true;
  ipcRenderer.send("start-game");
  $("#spinner-div").show();
  $("#main").prop('disabled', true);
  ipcRenderer.on("started-game", (event, {
    ip,
    port
  }) => {
    ip_to_connect = ip;
    port_to_connect = port;
    server_started = true;
    $("#spinner-div").hide();
    $("#main").prop('disabled', false);
    $('#noOfPlayersConnected').val(no_of_players_connected);
    $('#noOfPlayers').val(total_no_of_players);
    $('#GameStartModal').modal('show');
  })
})

$('#main').on("click", "#closeStartedGame,#closeStartedGameAfterPlayerNumbers", function () {
  if (server_started) {
    total_no_of_players = 1;
    no_of_players_connected = 1;
    players.splice
    $("#spinner-div").show();
    ipcRenderer.send("kill-server");
    ipcRenderer.on("server-killed", () => {
      $("#spinner-div").hide();
    })
  }
})
