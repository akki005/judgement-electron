let {
  ipcRenderer
} = require("electron");
let uuid = require("uuid/v1");
let this_player = {
  name: "Akash",
  id: 1
}
let {
  Game
} = require("./src/models/Game");

let this_game;




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
  this_game.startServer();
  $("#spinner-div").hide();
  $("#startGameAfterPlayersJoined").prop('disabled', true);
  $('#GameStartModal').modal('hide');
  $('#GameStartModal').on('hidden.bs.modal', function (e) {
    $("#spinner-div").hide();
    $('#playersConnectModal').modal('show');
    $('#noOfPlayersConnected').val(this_game.players.length);
    $('#serverIp').text(`${this_game.ip}:${this_game.port}`);
  })
})





$("#main").on("click", "#closeStartedGame,#closeStartedGameAfterPlayerNumbers", function () {

  $("#spinner-div").hide();
  this_game.stopServer();
  this_game = null;
})


$("#main").on("click", "#startGameAfterPlayersJoined", function () {
  $('#playersConnectModal').modal('hide');
  $('#playersConnectModal').on('hidden.bs.modal', function (e) {
    $("#main").load("./templates/playarea.html", function () {
      this_game.start();
    })
  })
})

$("#main").on("click", "#joinGameBtn", function () {
  $("#spinner-div").show();
  $("#main").prop('disabled', true);
  $('#joinGameModal').modal('show');
})

$("#main").on("click", "#joinGameSubmit", function () {
  $("#spinner-div").hide();
  $("#main").prop('disabled', false);
  $('#joinGameModal').modal('hide');
  $('#joinGameModal').on('hidden.bs.modal', function (e) {
    this_game = new Game();
    let player_name = $('#playerNameJoinGame').val();
    let player_id = uuid();
    let ip = $('#ipToJoin').val();
    let port = $('#portToJoin').val();
    this_game.setThisClientMeta(player_name, player_id);
    this_game.setRemoteServerProps(ip, port);
    this_game.startClient();
  })
})
