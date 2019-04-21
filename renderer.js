let {
  ipcRenderer
} = require("electron");
var uniqid = require('uniqid');
let debug = require("debug")("JM");

let {
  Game
} = require("./src/models/Game");

let this_game;

ipcRenderer.on("back-to-lobby", () => {
  if (this_game) {
    this_game = undefined;
  }
  let open_modals = $('.modal.show').length;
  if (open_modals > 0) {
    $(".modal").modal("hide");
    $("#main").load("./templates/home.html")
  } else {
    $("#main").load("./templates/home.html")
  }
})


$(window).keypress(function (e) {
  if (e.keyCode == 13) {
    e.preventDefault();
  }
});

$("#main").on("click", "#startGameBtn", function () {
  $("#main").prop('disabled', true);
  this_game = new Game();
  $("#main").prop('disabled', false);
  $('#GameStartModal').modal('show');
})

$("#main").on("click", "#noOfPlayersSubmit", function () {
  this_game.setNoOfPlayers($("#noOfPlayers").val());
  let player_name = $('#playerNameStartGame').val();
  let player_id = uniqid();
  this_game.setThisClientMeta(player_name, player_id);
  this_game.startServer().then(() => {
    $("#startGameAfterPlayersJoined").prop('disabled', true);
    $('#GameStartModal').modal('hide');
    $('#GameStartModal').on('hidden.bs.modal', function (e) {
      $('#GameStartModal').off();
      $('#playersConnectModal').modal('show');
      $('#noOfPlayersConnected').val(this_game.players.length);
    })
  });

})





$("#main").on("click", "#closeStartedGame,#closeStartedGameAfterPlayerNumbers", function () {
  this_game.stopServer();
  this_game = undefined;
})


$("#main").on("click", "#startGameAfterPlayersJoined", function () {
  $('#playersConnectModal').modal('hide');
  $('#playersConnectModal').on('hidden.bs.modal', function (e) {
    $('#playersConnectModal').off();
    $("#main").load("./templates/playarea.html", function () {
      this_game.stopUdpServer();
      this_game.start();
    })
  })
})


$("#main").on("click", "#joinGameBtn", function () {
  $('#searchGameModal').modal('show');
  $("#joinGameSubmit").prop('disabled', true);
  this_game = new Game();
  this_game.startClient();
})



$("#main").on("click", "#joinGameSubmit", function () {

  let player_name = $("#playerNameJoinGame").val();
  let game_to_join = $('#availableGames').val();
  if (!player_name) {
    $("#playerNameJoinGame").focus()
  } else if (!game_to_join) {
    $("#availableGames").focus()
  } else {
    $("#main").prop('disabled', false);
    $('#searchGameModal').modal('hide');
    $('#searchGameModal').on('hidden.bs.modal', function (e) {
      $('#searchGameModal').off();
      this_game = new Game();
      let player_name = $('#playerNameJoinGame').val();
      let player_id = uniqid();
      let id = $('#availableGames').val();
      let ip = id.split("_")[1].trim();
      let port = id.split("_")[2].trim();
      this_game.setThisClientMeta(player_name, player_id);
      this_game.setRemoteServerProps(ip, port);
      this_game.startSocketClient();
    })
  }
})

$("#main").on("click", "#restartGame", function () {
  $("#restartGame").prop('disabled', true);
  $("#restartGame").remove();
  this_game.restart();
})

$("#main").on('click', "#closeJoinGame", function () {
  $("option.available-games-options").remove();
  $("#playerNameJoinGame").val(``);
  this_game = undefined;
})
