/*jshint esversion: 6 */

var connecting = 0;
var conn;
var bans;
var pubVotes = {};
var allVotes = {};
var judgeTot = {};
var judgeVotes = {};
var judgeVotesPushed = {};
var judgeVotesPushed = {};

function socketConnect() {
  if (connecting == 0) {
    connecting = 1;
    $("#WSstatus").attr("class","orange");
    $("#WSstatus").attr("title", "CONNECTING");
    console.log("Connecting");
    conn = new WebSocket('wss://vote.univision.show');
    console.log("Sent request");

    conn.onopen = function(e) {
      console.log("Connection established!");
      $("#WSstatus").attr("class","green");
      $("#WSstatus").attr("title", "CONNECTED");
      connecting = 0;
      conn.send('{"type":"voteAdmin","command":"getMeta"}');
    };

    conn.onmessage = function(e) {
      let data = JSON.parse(e.data);
      if (data.type == "voteMeta") {
        createRows(data.votes);
      } else if (data.type == "voteBans") {
        bans = data.IPs;
      } else if (data.type == "voteStatus") {
        if (data.status == "OPEN") {
          $('#voteAdmin_open').addClass('vote_bttn_active');
          $('#voteAdmin_open').siblings().removeClass("vote_bttn_active");
        } else if (data.status == "CLOSED") {
          $('#voteAdmin_close').addClass('vote_bttn_active');
          $('#voteAdmin_close').siblings().removeClass("vote_bttn_active");
        } else {
          $('#voteAdmin_early').addClass('vote_bttn_active');
          $('#voteAdmin_early').siblings().removeClass("vote_bttn_active");
        }
      } else if (data.type == "voteActs") {
        uni = data.data;
        renderUI();
      } else if (data.type == "ping") {
        conn.send('{"type":"pong"}');
      } else if (data.type == "voteTotal") {
        runningTotal[data.PK] = data.total;
        renderTotal(runningTotal);
      } else if (data.type == "voteTotals") {
        renderTotals(data.totals);
      } else if (data.type == "adminReset") {
        $("#vAdmin_feed_tbody").html("");
      }
    };

    conn.onclose = function(e) {
      console.log('Disconnected!');
      $("#WSstatus").attr("class","red");
      $("#WSstatus").attr("title", "DISCONNECTED");
      connecting = 0;
      setTimeout(function(){socketConnect();}, 2000);
    };
  }
}

socketConnect();