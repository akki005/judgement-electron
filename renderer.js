let {
  ipcRenderer
} = require("electron");
let uuid = require("uuid/v1");

let {
  Game
} = require("./src/models/Game");

let this_game;

ipcRenderer.on("back-to-lobby", () => {
  if (this_game) {
    this_game = null;
  }
  console.log($('.modal.show').length)
  if ($('.modal.show').length>0) {
    $(".modal").on("hidden.bs.modal", () => {
      $(".modal").off();
      $("#main").load("./templates/home.html")
    })
    $(".modal").modal("hide");
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
  $("#spinner-div").show();
  $("#main").prop('disabled', true);
  this_game = new Game();
  $("#main").prop('disabled', false);
  $('#GameStartModal').modal('show');
})

$("#main").on("click", "#noOfPlayersSubmit", function () {
  this_game.setNoOfPlayers($("#noOfPlayers").val());
  let player_name = $('#playerNameStartGame').val();
  let player_id = uuid();
  this_game.setThisClientMeta(player_name, player_id);
  this_game.startServer().then(() => {
    $("#spinner-div").hide();
    $("#startGameAfterPlayersJoined").prop('disabled', true);
    $('#GameStartModal').modal('hide');
    $('#GameStartModal').on('hidden.bs.modal', function (e) {
      $('#GameStartModal').off();
      $("#spinner-div").hide();
      $('#playersConnectModal').modal('show');
      $('#noOfPlayersConnected').val(this_game.players.length);
      $('#serverIp').text(`${this_game.ip}:${this_game.port}`);
    })
  });

})





$("#main").on("click", "#closeStartedGame,#closeStartedGameAfterPlayerNumbers", function () {

  $("#spinner-div").hide();
  this_game.stopServer();
  this_game = null;
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
    $("#spinner-div").hide();
    $("#main").prop('disabled', false);
    $('#searchGameModal').modal('hide');
    $('#searchGameModal').on('hidden.bs.modal', function (e) {
      $('#searchGameModal').off();
      this_game = new Game();
      let player_name = $('#playerNameJoinGame').val();
      let player_id = uuid();
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
