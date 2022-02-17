/*jshint esversion: 6 */
//const { ipcRenderer } = require('electron');
var $ = jQuery;
var autoScroll = 1;
var pubVotes = {};
var pubVote = {};
var runningTotal = {};

function createRows(votesObj) {
  for (var i = 0; i < votesObj.length; i++) {
    let vote = votesObj[i];

    $old = $('#voteMeta_'+vote.PK);
    if ($old.length == 0){
      $tr = $('<tr></tr>');
      $tr.prop('id', 'voteMeta_'+vote.PK);
      $('#vAdmin_feed_table').append($tr);
    } else {
      $old.html("");
      $tr = $old;
      $old.removeClass("vAdmin_enabled_no_tr");
    }

    $tr.data('email', vote.email);
    $tr.data('fromUni', vote.fromUni);
    $tr.data('act', vote.act);
    $tr.data('IP', vote.IP);
    $tr.data('dateVote', vote.dateVote);

    $email = $('<td>'+vote.email+'</td>');
    $uni = $('<td>'+uni[vote.fromUni].name+'</td>');
    $act = $('<td>'+uni[vote.act].act+'</td>');
    $verify = $('<td></td>');
    if (vote.verified == "1") {
      $verify.html("Yes");
      $verify.addClass("vAdmin_verify_yes");
    } else {
      $verify.html("No");
      $verify.addClass("vAdmin_verify_no");
    }
    $enabled = $('<td>'+vote.enabled+'</td>');
    if (vote.enabled == "1") {
      $enabled.html("Yes");
      $enabled.addClass("vAdmin_enabled_yes");
    } else {
      $enabled.html("No");
      $enabled.addClass("vAdmin_enabled_no");
      $tr.addClass("vAdmin_enabled_no_tr");
    }
    $ip = $('<td>'+vote.IP+'</td>');
    $ban = $('<td></td>');
    if (bans.includes(vote.IP)) {
      $ban.addClass("vAdmin_ban_yes");
      $ban.html("Banned");
    } else {
      $ban.addClass("vAdmin_ban_no");
    }
    $time = $('<td>'+vote.dateVote+'</td>');

    $tr.append($email);
    $tr.append($uni);
    $tr.append($act);
    $tr.append($verify);
    $tr.append($enabled);
    $tr.append($ip);
    $tr.append($ban);
    $tr.append($time);
  }
  if (autoScroll) {
    $('#vAdmin_feed_cont').animate({ scrollTop: $('#vAdmin_feed_tbody > tr:last-child').offset().top}, 600);
  }
}

function renderTotal(totals) {
  for (var act in uni) {
    if (uni.hasOwnProperty(act)) {
      pubVotes[act] = 0;
    }
  }
  for (var variable in totals) {
    if (totals.hasOwnProperty(variable)) {
      let tots = totals[variable];
      let sorted = [];
      let tfootTotal = 0;
      for (var univer in tots) {
        if (tots.hasOwnProperty(univer)) {
          let score = tots[univer];
          tfootTotal += parseInt(score);
          if (sorted.hasOwnProperty(score)) {
            sorted[score].push(univer);
          } else {
            sorted[score] = [univer];
          }
        }
      }

      let points = 9;

      for (var i = sorted.length; i > 0; i--) {
        let rank = sorted[i-1];
        if (typeof rank !== "undefined") {
          let tie = rank.length;
          points = points - tie;
          for (var j = 0; j < rank.length; j++) {
            pubVotes[rank[j]] += points;
          }
          points = points - tie;
        }
      }
    }
  }
}

function renderTotals(totals) {
  for (var act in uni) {
    if (uni.hasOwnProperty(act)) {
      $("#pubTot"+act).html(pubVotes[act]);
      $(`#allTot${act}`).html(allVotes[act]+pubVotes[act])
      $("#pubVot"+act).html(parseInt(totals[act]));
      $("#pubTot"+act).parent().data("points", pubVotes[act]);
    }
  }
  sortTables();
}

function sortTables() {
  console.log("Sorting");
  $collection = $("#totalsCont").children();
  for (var i = 0; i < $collection.length; i++) {
    $collection.each(function() {
      while ($(this).data("points") < $(this).next().data("points")) {
        console.log($(this));
        console.log($(this).next());
        $(this).next().after($(this));
      }
    });
  }
}

function makeL3rd(index) {
  let $cont = $("#lthirdNormal");
  let $l3Cont = $("<div class='l3rdCont'></div>");
  let $name = $("<input class='l3rdNameIn' placeholder='Name'>");
  let $role = $("<input class='l3rdRoleIn' placeholder='Role/Uni'>");
  let $push = $("<button class='l3rdPush'>PUSH</button>");
  let $pull = $("<button class='l3rdPull'>PULL</button>");

  if (typeof index !== "undefined") {
    $name.val(l3rd[index].name);
    $role.val(l3rd[index].role);
  }

  $l3Cont.append($name);
  $l3Cont.append($role);
  $l3Cont.append($push);
  $l3Cont.append($pull);
  $cont.append($l3Cont);
}

function updateTotals() {
  for (var act in uni) {
    if (uni.hasOwnProperty(act)) {
      $(`#judgeTot${act}`).html(allVotes[act]);
      $(`#allTot${act}`).html(allVotes[act]+pubVotes[act]);
      conn.send(`{"type":"voteJudge","act":${act},"points":${allVotes[act]}}`);
    }
  }
}

function renderUI() {
  let payload = {
    command: "unis",
    data: uni
  };
  window.api.send('casparCommand', payload);
  $("#totalsCont").html("");
  $("#judgeTotalsCont").html("");
  $("#publicTotalsCont").html("");
  $("#voteActs_table").html("");
  $("#judgeCont").html("");
  for (var act in uni) {
    if (uni.hasOwnProperty(act)) {

      pubVotes[act] = 0;
      allVotes[act] = 0;
      judgeVotes[act] = 0;
      judgeVotesPushed[act] = 0;

      conn.send(`{"type":"voteJudge","act":${act},"points":${allVotes[act]}}`);

      let $tr = $("<tr></tr>");
      let $allName = $(`<td>${uni[act].short}  -  ${uni[act].act}</td>`);
      let $allTot = $(`<td id="allTot${act}"></td>`);
      $tr.append($allName);
      $tr.append($allTot);
      $("#totalsCont").append($tr);

      let $jtr = $("<tr></tr>");
      let $jallName = $(`<td>${uni[act].short}  -  ${uni[act].act}</td>`);
      let $jallTot = $(`<td id="judgeTot${act}"></td>`);
      $jtr.append($jallName);
      $jtr.append($jallTot);
      $("#judgeTotalsCont").append($jtr);

      let $ptr = $("<tr></tr>");
      let $pallName = $(`<td>${uni[act].short}</td>`);
      let $pallTot = $(`<td id="pubTot${act}"></td>`);
      let $pPush = $(`<td><button class="pushButPub" data-act="${act}">PUSH</button></td>`);
      let $pPull = $(`<td><button class="pullButPub" data-act="${act}">PULL</button></td>`);
      $ptr.append($pallName);
      $ptr.append($pallTot);
      $ptr.append($pPush);
      $ptr.append($pPull);
      $("#publicTotalsCont").append($ptr);


      let $cont = $(`<section class="judgeTotals"></section>`);
      let $title = $(`<div class="pubTitle"><div>Votes from ${uni[act].short}</div><button data-judge="${act}" class="selectJudge">Select</button></div>`);
      let $tbl = $("<table></table>");
      let $thead = $(`<thead>
        <tr>
          <th>Act</th>
          <th>Points</th>
          <th></th>
          <th></th>
        </tr>
      </thead>`);
      let $tbody = $("<tbody></tbody>");
      $cont.append($title);
      $tbl.append($thead);

      for (var actS in uni) {
        if (uni.hasOwnProperty(actS) && actS !== act) {
          let $tr = $(`<tr>
            <td>${uni[actS].short}</td>
            <td id="judge${act}Tot${actS}" data-from="${act}" data-act="${actS}">
              <select class="scoreChange">
                <option value="0">Nothing</option>
                <option value="8">8</option>
                <option value="6">6</option>
                <option value="4">4</option>
                <option value="2">2</option>
              </select>
            </td>
            <td>
              <button class="pushButJudge" data-from="${act}" data-act="${actS}">PUSH</button>
            </td>
            <td>
              <button class="pullButJudge" data-from="${act}" data-act="${actS}">PULL</button>
            </td>
          </tr>`);
         $tbody.append($tr);
        }
      }

      let $tfoot = $(`<tfoot>
        <td colspan="4"><button id="judge${act}L3rd" class="judgeL3rd" data-uni="${act}">Lower Third</button></td>
      </tfoot>`);


      $tbl.append($tbody);
      $tbl.append($tfoot);
      $cont.append($tbl);
      $("#judgeCont").append($cont);

      let $row = $(`<tr data-pk="${act}"></tr>`);
      for (var prop in uni[act]) {
        if (uni[act].hasOwnProperty(prop)) {
          let $tr = $(`<td><input class="voteActs_input" data-prop="${prop}" value="${uni[act][prop]}"></td>`);
          $row.append($tr);
        }
      }
      $row.append($(`<td><button type='button' class='voteActs_delete' data-pk='${act}'>Delete</button></td>`));
      $("#voteActs_table").append($row);
    }
  }
}

$(function() {

  for (var variable in l3rd) {
    if (l3rd.hasOwnProperty(variable)) {
      makeL3rd(variable);
    }
  }

  $("#load").click(function(){
    let Data = {
      command: "load"
    };
    window.api.send('casparCommand', Data);

    let payload = {
      command: "unis",
      data: uni
    };
    setTimeout(()=>{window.api.send('casparCommand', payload)},1000);
  });

  $("#ident").click(function(){
    let Data = {
      command: "ident"
    };
    window.api.send('casparCommand', Data);
  });

  $("#actsPush").click(function(){
    let Data = {
      command: "actsPush"
    };
    window.api.send('casparCommand', Data);
  });

  $("#actsPull").click(function(){
    let Data = {
      command: "actsPull"
    };
    window.api.send('casparCommand', Data);
  });

  $("#timerPush").click(function(){
    let Data = {
      command: "timerPush"
    };
    window.api.send('casparCommand', Data);
  });

  $("#timerPull").click(function(){
    let Data = {
      command: "timerPull"
    };
    window.api.send('casparCommand', Data);
  });

  $("#clear").click(function(){
    let Data = {
      command: "clear"
    };
    window.api.send('casparCommand', Data);
  });

  $("#clearAll").click(function(){
    let Data = {
      command: "clearAll"
    };
    window.api.send('casparCommand', Data);
  });

  $("#start").click(function(){
    let Data = {
      command: "start"
    };
    window.api.send('casparCommand', Data);
  });

  $("#stop").click(function(){
    let Data = {
      command: "stop"
    };
    window.api.send('casparCommand', Data);
  });

  $("#reset").click(function(){
    let Data = {
      command: "reset"
    };
    window.api.send('casparCommand', Data);
  });

  $("#lthirdAdd").click(function(){
    makeL3rd();
  });

  $("#scoresBut").click(function(){
    $(".mainCont").removeClass("active");
    $("#scoresCont").addClass("active");
  });

  $("#lthirdBut").click(function(){
    $(".mainCont").removeClass("active");
    $("#lthirdCont").addClass("active");
  });

  $("#creditBut").click(function(){
    $(".mainCont").removeClass("active");
    $("#creditsCont").addClass("active");
  });

  $("#scoresAdminBut").click(function(){
    $(".mainCont").removeClass("active");
    $("#scoresAdminCont").addClass("active");
  });

});

$(document).on("change", function(e) {
  let $target = $(e.target);
  if ($target.hasClass("scoreChange")) {
    let score = parseInt($target.val());
    let prev = $target.data("previous");
    $target.data("previous", score);
    $target.closest("tr").data("score", score);
    let $parent = $target.parent();
    let from = $parent.data("from");
    let act = $parent.data("act");
    if (typeof prev !== "undefined") {
      judgeVotes[act] -= prev;
      allVotes[act] -= prev;
    }
    judgeVotes[act] += score;
    allVotes[act] += score;
    updateTotals();
  } else if ($target.hasClass("voteActs_input")) {
    $target.parent().addClass("voteActs_changed");
    $target.parent().parent().addClass("voteActs_changed_row");
  }
});

$(document).on("click", function(e) {
  let $target = $(e.target);
  let $parent = $target.parent();
  if ($target.hasClass("l3rdPush")) {
    let name = $parent.find(".l3rdNameIn").val();
    let role = $parent.find(".l3rdRoleIn").val();
    $parent.addClass("pushed");
    console.log(name);
    console.log(role);
    let cmdData = {};
    cmdData.command = "l3rd";
    cmdData.name = name;
    cmdData.role = role;
    window.api.send('casparCommand', cmdData);
  } else if ($target.hasClass("l3rdPull")) {
    let cmdData = {};
    $(".l3rdCont.pushed").removeClass("pushed");
    cmdData.command = "l3rdPull";
    window.api.send('casparCommand', cmdData);
  } else if ($target.hasClass("judgeL3rd")) {
    let Data = {
      command: "l3rdJudge",
      judge: $target.data("uni")
    };
    window.api.send('casparCommand', Data);
    console.log(Data);
  } else if ($target.hasClass("pushButPub")) {
    let pushed = $target.parent().parent().data("pushed");
    if (pushed !== true) {
      let act = $target.data("act");
      $target.parent().parent().data("pushed", true);
      $target.parent().parent().addClass("pushed");
      updateTotals();
      let Data = {
        command: "pushScore",
        act: act,
        score: pubVotes[act]+allVotes[act]
      };
      window.api.send('casparCommand', Data);
      console.log(Data);
    }
  } else if ($target.hasClass("pushButJudge")) {
    let pushed = $target.parent().parent().data("pushed");
    if (pushed !== true) {
      let act = $target.data("act");
      let from = $target.data("from");
      let $select = $("#judge"+from+"Tot"+act).find("select");
      let selected = parseInt($target.closest("tr").data("score"));
      judgeVotesPushed[act] += selected;
      let score = judgeVotesPushed[act];
      if (score !== 0) {
        $select.attr("disabled", true);
        $target.parent().parent().data("pushed", true);
        $target.parent().parent().addClass("pushed");
        let Data = {
          command: "pushScore",
          act: act,
          score: score,
          from: from,
          reorder: true
        };
        window.api.send('casparCommand', Data);
        console.log(Data);
      }
    }
  } else if ($target.hasClass("pullButPub")) {
    let pushed = $target.parent().parent().data("pushed");
    if (pushed == true) {
      $target.parent().parent().data("pushed", false);
      $target.parent().parent().removeClass("pushed");
      let act = $target.data("act");
      let Data = {
        command: "pullScore",
        act: act,
        score: pubVotes[act]+allVotes[act]
      };
      window.api.send('casparCommand', Data);
      console.log(Data);
      updateTotals();
    }
  } else if ($target.hasClass("pullButJudge")) {
    let pushed = $target.parent().parent().data("pushed");
    if (pushed == true) {
      $target.parent().parent().data("pushed", false);
      $target.parent().parent().removeClass("pushed");
      let act = $target.data("act");
      let from = $target.data("from");
      let $select = $("#judge"+from+"Tot"+act).find("select");
      $select.removeAttr("disabled");
      let selected = parseInt($target.closest("tr").data("score"));
      judgeVotesPushed[act] -= selected;
      let score = judgeVotesPushed[act];
      let Data = {
        command: "pullScore",
        act: act,
        score: score,
        from: from,
        reorder: true
      };
      window.api.send('casparCommand', Data);
      console.log(Data);
      updateTotals();
    }
  } else if ($target.hasClass("selectJudge")) {
    let judge = $target.data("judge");
    let Data = {
      command: "selectJudge",
      judge: judge,
    };
    window.api.send('casparCommand', Data);
    console.log(Data);
  } else if ($target.hasClass("selectPublic")) {
    let judge = $target.data("judge");
    let Data = {
      command: "selectPublic"
    };
    window.api.send('casparCommand', Data);
    console.log(Data);
  } else if ($target.hasClass("l3rdQPush")) {
    let $par = $target.parent();
    let leftText = $par.find(".leftText").html();
    let rightText = $par.find(".rightText").html();
    let left = $par.find(".l3rdQLeft").val();
    let right = $par.find(".l3rdQRight").val();
    let Data = {
      command: "l3rdQuiz",
      leftText: leftText,
      rightText: rightText,
      left: left,
      right: right
    };
    window.api.send('casparCommand', Data);
  } else if ($target.is("#reorder")) {
    let Data = {
      command: "reorder"
    };
    window.api.send('casparCommand', Data);
    console.log(Data);
  } else if ($target.is("#voteAdmin_open")) {
    let wsMsg = {};
    wsMsg.type = "voteAdmin";
    wsMsg.command = "status";
    wsMsg.status = "OPEN";
    conn.send(JSON.stringify(wsMsg));
    $target.blur();
  } else if ($target.is("#voteAdmin_close")) {
    let wsMsg = {};
    wsMsg.type = "voteAdmin";
    wsMsg.command = "status";
    wsMsg.status = "CLOSED";
    conn.send(JSON.stringify(wsMsg));
    $target.blur();
  } else if ($target.is("#voteAdmin_early")) {
    let wsMsg = {};
    wsMsg.type = "voteAdmin";
    wsMsg.command = "status";
    wsMsg.status = "EARLY";
    conn.send(JSON.stringify(wsMsg));
    $target.blur();
  } else if ($target.is("#voteAdmin_editActs") || $target.is("#voteActs_close")) {
    $("#voteActs_cont").toggleClass("hidden");
  } else if ($target.is("#voteActs_save")) {
    let $rows = $(".voteActs_changed_row");
    let data = {};
    for (var i = 0; i < $rows.length; i++) {
      let $row = $($rows[i]);
      let PK = $row.data("pk");
      data[PK] = {};
      $row.children(".voteActs_changed").each(function() {
        let $input = $(this).find("input");
        data[PK][$input.data("prop")] = $input.val();
      });
    }
    $(".voteActs_changed").removeClass("voteActs_changed");
    $rows.removeClass("voteActs_changed_row");
    let wsMsg = {};
    wsMsg.type = "voteEdit";
    wsMsg.command = "save";
    wsMsg.data = data;
    conn.send(JSON.stringify(wsMsg));
  } else if ($target.is("#voteActs_new")) {
    let wsMsg = {};
    wsMsg.type = "voteEdit";
    wsMsg.command = "new";
    conn.send(JSON.stringify(wsMsg));
  } else if ($target.is("#voteAdmin_reset")) {
    if (confirm('This will delete ALL votes, this cannot be undone...')) {
      let wsMsg = {};
      wsMsg.type = "voteAdmin";
      wsMsg.command = "reset";
      conn.send(JSON.stringify(wsMsg));
    }
  } else if ($target.hasClass("voteActs_delete")) {
    if (confirm('Deleting a University cannot be undone and will remove ALL votes that come from this uni or are for this uni')) {
      let wsMsg = {};
      wsMsg.type = "voteEdit";
      wsMsg.command = "delete";
      wsMsg.PK = $target.data("pk");
      conn.send(JSON.stringify(wsMsg));
    }
  } else if ($target.hasClass('vAdmin_ban_no')) {
    let IP = $target.parent().data('IP');
    conn.send('{"type":"voteAdmin","command":"banIP","IP":"'+IP+'"}');
  } else if ($target.hasClass('vAdmin_ban_yes')) {
    let IP = $target.parent().data('IP');
    conn.send('{"type":"voteAdmin","command":"unBanIP","IP":"'+IP+'"}');
  } else if ($target.hasClass('vAdmin_enabled_no')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    conn.send('{"type":"voteAdmin","command":"include","PK":"'+PK+'"}');
  } else if ($target.hasClass('vAdmin_enabled_yes')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    conn.send('{"type":"voteAdmin","command":"exclude","PK":"'+PK+'"}');
  } else if ($target.hasClass('vAdmin_verify_yes')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    let email = $target.parent().data('email');
    let act = $target.parent().data('act');
    let IP = $target.parent().data('IP');
    let dateVote = $target.parent().data('dateVote');
    conn.send('{"type":"voteAdmin","command":"unVerify","PK":"'+PK+'","email":"'+email+'","act":"'+act+'","IP":"'+IP+'","dateVote":"'+dateVote+'"}');
  } else if ($target.hasClass('vAdmin_verify_no')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    let email = $target.parent().data('email');
    let act = $target.parent().data('act');
    let IP = $target.parent().data('IP');
    let dateVote = $target.parent().data('dateVote');
    conn.send('{"type":"voteAdmin","command":"verify","PK":"'+PK+'","email":"'+email+'","act":"'+act+'","IP":"'+IP+'","dateVote":"'+dateVote+'"}');
  } else if ($target.is('#vAdmin_autoScroll')) {
    $target.toggleClass("vote_bttn_active");
    autoScroll = $target.hasClass("vote_bttn_active");
    $target.blur();
  }
});

window.api.receive('casparMeta', (data) => {
  switch (data.header) {
    case "STRING":
      $("#pong").html(data.value);
      break;
    case "CG-CONNECTION":
      $("#status").attr("title", data.value);
      $("#status").attr("class", "");
      switch (data.value) {
        case "CONNECTED":
          $("#status").addClass("green");
          let payload = {
            command: "unis",
            data: uni
          };
          setTimeout(()=>{window.api.send('casparCommand', payload)},1200)
          break;
        case "CONNECTING":
          $("#status").addClass("orange");
          break;
        case "ERROR":
          $("#status").addClass("red");
          break;
        default:
          $("#status").addClass("red");
      }
      break;
    case "CG-RECEIVED-DATA":
      $("#info").html(data.value);
      break;
    default:

  }
  console.log(data);
});
