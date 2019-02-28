let {
  ipcRenderer
} = require("electron");
let this_player = {
  name: "Akash",
  id: 1
}
let {
  Game
} = require("./src/models/Game");

let this_game;




$("#main").on("click", "#startGameBtn", function () {
  console.log("Renderer");
  $("#spinner-div").show();
  $("#main").prop('disabled', true);
  this_game = new Game();
  this_game.addPlayer(this_player.name,this_player.id);
  this_game.startServer();
  $("#main").prop('disabled', false);
  $('#GameStartModal').modal('show');
})

$("#main").on("click", "#noOfPlayersSubmit", function () {
  this_game.setNoOfPlayers($("#noOfPlayers").val());
  $("#spinner-div").hide();  
  $("#startGameAfterPlayersJoined").prop('disabled',true);
  $('#GameStartModal').modal('hide');
  $('#GameStartModal').on('hidden.bs.modal', function (e) {
    $("#spinner-div").hide();
    $('#playersConnectModal').modal('show');
    $('#noOfPlayersConnected').val(this_game.players.length);
    $('#serverIp').text(`${this_game.ip}:${this_game.port}`);
  })
})





$("#main").on("click", "#closeStartedGame,#closeStartedGameAfterPlayerNumbers", function () {
  this_game.stopServer();
  this_game=null;
})


$("#main").on("click", "#closeStartedGame", function () {
  this_game.stopServer();
})


$("#main").on("click","#startGameAfterPlayersJoined",function(){
  this_game.start();
})