/*jshint esversion: 6 */
//const { ipcRenderer } = require('electron');
const $ = jQuery;
let autoScroll = 1;
const pubVotes = {};
const runningTotal = {};
let bans;
const allVotes = {};
const judgeVotes = {};
const judgeVotesPushed = {};
let judgeNames;

let webConnection;

function getUni(PK) {
	for (let index = 0; index < uni.length; index++) {
		if (uni[index].PK == PK) return uni[index]
	}
	return {
		"name": "undefined",
		"short": "undefined",
		"act": "undefined",
		"email": "undefined",
		"order": "undefined"
	}
}

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
    $uni = $('<td>'+getUni(vote.fromUni).name+'</td>');
    $act = $('<td>'+getUni(vote.act).act+'</td>');
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
  uni.forEach(act => {
    pubVotes[act.PK] = 0;
  });
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

      let numActs = Object.keys(uni).length;
      let points = numActs*2-1;

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
  uni.forEach(act => {
    $("#pubTot"+act.PK).html(pubVotes[act.PK]);
    $(`#allTot${act.PK}`).html(allVotes[act.PK]+pubVotes[act.PK])
    $("#pubVot"+act.PK).html(parseInt(totals[act.PK]));
    $("#pubTot"+act.PK).parent().data("points", pubVotes[act.PK]);
  });
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

function makeIdent(index, ident) {
  let $cont = $("#identsNormal");
  let $identCont = $("<div class='identCont'></div>");
  let $file = $("<input class='identFileIn' placeholder='File name'>");
  let $push = $("<button class='identPush'>PUSH</button>");
  let $pull = $("<button class='identPull'>PULL</button>");

  if (typeof index !== "undefined") {
    $file.val(ident[index].file);
  }

  $identCont.append($file);
  $identCont.append($push);
  $identCont.append($pull);
  $cont.append($identCont);
}

function buildIdent(array) {
  for (let index = 0; index < array.length; index++) {
    makeIdent(index, array);
  }
}

function loadIdent() {
  var file = document.getElementById('identform');

  if(file.files.length) {
    var reader = new FileReader();

    reader.onload = function(e) {
      buildIdent(JSON.parse(e.target.result));
    };

    reader.readAsBinaryString(file.files[0]);
  }
}

function saveIdent() {
  let retObj = [];
  let $rows = $(".identCont");
  $rows.each(function() {
    let obj = {};
    let file = $(this).find(".identFileIn").val();
    if (file !== '') {
      obj.file = file;
    }
    retObj.push(obj);
  });
  window.api.send('identSave', retObj);
  /*var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(retObj));
  var dlAnchorElem = document.getElementById('downloadAnchorElemIdent');
  dlAnchorElem.setAttribute("href",     dataStr     );
  dlAnchorElem.setAttribute("download", "identsAndClips.json");
  dlAnchorElem.click();*/
}


function makeL3rd(index, l3rd) {
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

function buildL3rds(array) {
  for (let index = 0; index < array.length; index++) {
    makeL3rd(index, array);
  }
}

function loadL3rd() {
  var file = document.getElementById('lthirdform');

  if(file.files.length) {
    var reader = new FileReader();

    reader.onload = function(e) {
      buildL3rds(JSON.parse(e.target.result));
      //document.getElementById('lthirdNormal').innerHTML = e.target.result;
    };

    reader.readAsBinaryString(file.files[0]);
  }
}

function saveL3rd() {
  let retObj = [];
  let $rows = $(".l3rdCont");
  $rows.each(function() {
    let obj = {};
    let name = $(this).find(".l3rdNameIn").val();
    let role = $(this).find(".l3rdRoleIn").val();
    if (name !== '') {
      obj.name = name;
    }
    if (role !== '') {
      obj.role = role;
    }
    retObj.push(obj);
  });

  window.api.send('l3rdSave', retObj);
  /*var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(retObj));
  var dlAnchorElem = document.getElementById('downloadAnchorElem');
  dlAnchorElem.setAttribute("href",     dataStr     );
  dlAnchorElem.setAttribute("download", "lowerThirds.json");
  dlAnchorElem.click();*/
}

function saveJudge() {
  let retObj = [];
  let $rows = $(".judgeCont");
  $rows.each(function() {
    let name = $(this).find(".judgeNameIn").val();
    let PK = Number($(this).data("pk"));
    retObj[PK] = name;
  });
  judgeNames = retObj;
  window.api.send('judgeSave', retObj);
  /*var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(retObj));
  var dlAnchorElem = document.getElementById('downloadAnchorElem');
  dlAnchorElem.setAttribute("href",     dataStr     );
  dlAnchorElem.setAttribute("download", "lowerThirds.json");
  dlAnchorElem.click();*/
}

function updateTotals() {
  uni.forEach(act => {
    $(`#judgeTot${act.PK}`).html(allVotes[act.PK]);
    $(`#allTot${act.PK}`).html(allVotes[act.PK]+pubVotes[act.PK]);
    if (allVotes[act.PK] > 0) webConnection.send({"type":"voteJudge","act":act.PK,"points":allVotes[act.PK]});
  })
}

function renderUI() {
  const oldFormat = {};
  uni.forEach(act => {
    oldFormat[act.PK] = act;
  });

  window.api.send('casparCommand', {
    command: "unis",
    data: oldFormat
  });

  const $judgeCont = $("#lthirdJudge");
  $("#totalsCont").html("");
  $("#judgeTotalsCont").html("");
  $("#publicTotalsCont").html("");
  $("#voteActs_table").html("");
  $("#judgeCont").html("");
  uni.forEach(act => {

    pubVotes[act.PK] = 0;
    allVotes[act.PK] = 0;
    judgeVotes[act.PK] = 0;
    judgeVotesPushed[act.PK] = 0;

    webConnection.send({"type":"voteJudge","act":act.PK,"points":allVotes[act.PK]});

    let $tr = $("<tr></tr>");
    let $allName = $(`<td>${act.short}  -  ${act.act}</td>`);
    let $allTot = $(`<td id="allTot${act.PK}"></td>`);
    $tr.append($allName);
    $tr.append($allTot);
    $("#totalsCont").append($tr);

    let $jtr = $("<tr></tr>");
    let $jallName = $(`<td>${act.short}  -  ${act.act}</td>`);
    let $jallTot = $(`<td id="judgeTot${act.PK}"></td>`);
    $jtr.append($jallName);
    $jtr.append($jallTot);
    $("#judgeTotalsCont").append($jtr);

    let $ptr = $("<tr></tr>");
    let $pallName = $(`<td>${act.short}</td>`);
    let $pallTot = $(`<td id="pubTot${act.PK}"></td>`);
    let $pPush = $(`<td><button class="pushButPub" data-act="${act.PK}">PUSH</button></td>`);
    let $pPull = $(`<td><button class="pullButPub" data-act="${act.PK}">PULL</button></td>`);
    $ptr.append($pallName);
    $ptr.append($pallTot);
    $ptr.append($pPush);
    $ptr.append($pPull);
    $("#publicTotalsCont").append($ptr);


    let $cont = $(`<section class="judgeTotals"></section>`);
    let $title = $(`<div class="pubTitle">
      <div>Votes from ${act.short}</div>
      <button data-judge="${act.order}" class="cueJudge">Ident</button>
      <button data-judge="${act.PK}" class="selectJudge">Push</button>
    </div>`);
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

    uni.forEach(actS => {
        let opts;
        let numActs = Object.keys(uni).length;
        for (let index = 1; index < numActs; index++) {
          opts = `<option value="${index*2}">${index*2}</option>` + opts;
        }
        opts = '<option value="0">Nothing</option>'+opts;
        let $tr = $(`<tr>
          <td>${actS.short}</td>
          <td id="judge${act.PK}Tot${actS.PK}" data-from="${act.PK}" data-act="${actS.PK}">
            <select class="scoreChange">
              ${opts}
            </select>
          </td>
          <td>
            <button class="pushButJudge" data-from="${act.PK}" data-act="${actS.PK}">PUSH</button>
          </td>
          <td>
            <button class="pullButJudge" data-from="${act.PK}" data-act="${actS.PK}">PULL</button>
          </td>
        </tr>`);
        $tbody.append($tr);
    })

    let $tfoot = $(`<tfoot>
      <td colspan="4">
        <button id="judge${act.PK}PushRest" class="judgeRest" data-uni="${act.PK}">Push Bottom Scores</button>
        <button id="judge${act.PK}L3rd" class="judgeL3rd" data-uni="${act.PK}">Lower Third</button>
      </td>
    </tfoot>`);


    $tbl.append($tbody);
    $tbl.append($tfoot);
    $cont.append($tbl);
    $("#judgeCont").append($cont);

    let $row = $(`<tr data-pk="${act.PK}"></tr>`);
    for (var prop in act) {
      if (act.hasOwnProperty(prop)) {
        let $tr;
        if (prop == 'order') {
          $tr = $(`<td class="voteActs_cont">
            <button class="voteActs_move" data-direction="up" type="button">🡅</button>
            <input data-prop="${prop}" type="text" class="voteActs_place" readonly value="${act[prop]}">
            <button class="voteActs_move" data-direction="down" type="button">🡇</button>
          </td>`);
        } else if (prop != 'PK') {
          $tr = $(`<td><input class="voteActs_input" data-prop="${prop}" value="${act[prop]}"></td>`);
        }
        $row.append($tr);
      }
    }
    $row.append($(`<td><button type='button' class='voteActs_delete' data-pk='${act.PK}'>Delete</button></td>`));
    $("#voteActs_table").append($row);

    const value = typeof judgeNames[act.PK] === "undefined" ? "" : `value="${judgeNames[act.PK]}"`;
    console.log(value);
    $judgeCont.append(`<div class="judgeCont" data-PK="${act.PK}" data-order="${act.order}">
      <span>${act.name}</span>
      <input class="judgeNameIn" placeholder="Name" ${value}>
      <button class="judgePush">PUSH</button>
      <button class="judgePull">PULL</button>
    </div>`)

  });
}

function socketDoMessage(header, data) {
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
    webConnection.send({"type":"pong"});
  } else if (data.type == "voteTotal") {
    runningTotal[data.PK] = data.total;
    renderTotal(runningTotal);
  } else if (data.type == "voteTotals") {
    renderTotals(data.totals);
  } else if (data.type == "adminReset") {
    $("#vAdmin_feed_tbody").html("");
  }
}

$(function() {

  webConnection = new webSocket('vote.univision.show', 'Browser', '3.2.1', true);
	webConnection.addEventListener('message', event => {
		const [header, payload] = event.detail;
		socketDoMessage(header, payload);
	});
	webConnection.addEventListener('open', () => {
    $("#WSstatus").attr("class","green");
    $("#WSstatus").attr("title", "CONNECTED");
    webConnection.send({"type":"voteAdmin","command":"getMeta"});
	});
	webConnection.addEventListener('close', () => {
    $("#WSstatus").attr("class","red");
    $("#WSstatus").attr("title", "DISCONNECTED");
	});


  $("#lthirdLoad").click(function() {
    loadL3rd();
  });

  $("#lthirdSave").click(function() {
    saveL3rd();
  });

  $("#identLoad").click(function() {
    loadIdent();
  });

  $("#identSave").click(function() {
    saveIdent();
  });

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
    window.api.send('casparCommand', {command: "actsStart"});
    window.api.send('casparCommand', {command: "actsPush"});
  });

  $("#actsPull").click(function(){
    let Data = {
      command: "actsPull"
    };
    window.api.send('casparCommand', Data);
  });

  $("#creditsPush").click(function(){
    let Data = {
      command: "creditsPush"
    };
    window.api.send('casparCommand', Data);
  });

  $("#creditsPull").click(function(){
    let Data = {
      command: "creditsPull"
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

  $("#identAdd").click(function(){
    makeIdent();
  });

  $("#scoresBut").click(function(){
    $(".mainCont").removeClass("active");
    $("#scoresCont").addClass("active");
  });

  $("#lthirdBut").click(function(){
    $(".mainCont").removeClass("active");
    $("#lthirdCont").addClass("active");
  });

  $("#identsBut").click(function(){
    $(".mainCont").removeClass("active");
    $("#identsCont").addClass("active");
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
  } else if ($target.hasClass("l3rdRoleIn") || $target.hasClass("l3rdNameIn")) {
    saveL3rd();
  } else if ($target.hasClass("identFileIn")) {
    saveIdent();
  } else if ($target.hasClass("judgeNameIn")) {
    saveJudge();
  }
});

$(document).on("click", function(e) {
  let $target = $(e.target);
  let $parent = $target.parent();
  if ($target.hasClass("l3rdPush")) {
    let name = $parent.find(".l3rdNameIn").val();
    let role = $parent.find(".l3rdRoleIn").val();
    $parent.addClass("pushed");
    let cmdData = {};
    cmdData.command = "l3rd";
    cmdData.name = name;
    cmdData.role = role;
    window.api.send('casparCommand', cmdData);
  } else if ($target.hasClass("judgeRest")) {
    let $cont = $target.closest(".judgeTotals");
    $cont.find("select").each(function(){
      let $select = $(this);
      let value = parseInt($select.val());
      console.log(value);
      let numActs = Object.keys(uni).length;
      if (value < ((numActs * 2) - 7)) {
        setTimeout(function(){
          $select.closest("tr").find(".pushButJudge").trigger("click");
        }, 100*value)
      }
    });
  } else if ($target.hasClass("identPush")) {
    let file = $parent.find(".identFileIn").val();
    $parent.addClass("pushed");
    console.log(file);
    let cmdData = {};
    cmdData.command = "clip";
    cmdData.data = file;
    window.api.send('casparCommand', cmdData);
  } else if ($target.hasClass("identPull")) {
    let cmdData = {};
    $(".identCont.pushed").removeClass("pushed");
    cmdData.command = "clipClear";
    window.api.send('casparCommand', cmdData);
  } else if ($target.hasClass("l3rdPull")) {
    let cmdData = {};
    $(".l3rdCont.pushed").removeClass("pushed");
    cmdData.command = "l3rdPull";
    window.api.send('casparCommand', cmdData);
  } else if ($target.hasClass("judgeL3rd")) {
    const PK = Number($target.data("uni"));
    const name = document.querySelector(`.judgeCont[data-pk="${PK}"] > .judgeNameIn`).value;
    window.api.send('casparCommand', {
      "command": "l3rd",
      "name": name,
      "role": getUni(PK).name
    });
    setTimeout(() => {
      window.api.send('casparCommand', {"command":"l3rdPull"});
    }, 8000);
  } else if ($target.hasClass("judgePush")) {
    const $parent = $target.parent();
    const PK = Number($parent.data("pk"));
    $parent.addClass("pushed");
    const name = $parent.find(".judgeNameIn").val();
    window.api.send('casparCommand', {
      "command": "l3rd",
      "name": name,
      "role": getUni(PK).name
    });
  } else if ($target.hasClass("judgePull")) {
    const $parent = $target.parent();
    $parent.removeClass("pushed");
    window.api.send('casparCommand', {"command":"l3rdPull"});
  } else if ($target.hasClass("pushButPub")) {
    let pushed = $target.parent().parent().data("pushed");
    if (pushed !== true) {
      let act = $target.data("act");
      $target.parent().parent().data("pushed", true);
      $target.parent().parent().addClass("pushed");
      updateTotals();
      window.api.send('casparCommand', {
        command: "pushScore",
        act: act,
        score: pubVotes[act]+allVotes[act]
      });
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
  } else if ($target.hasClass("cueJudge")) {
    let judge = $target.data("judge");
    let Data = {
      command: "cueJudge",
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
    webConnection.send(wsMsg);
    $target.blur();
  } else if ($target.is("#voteAdmin_close")) {
    let wsMsg = {};
    wsMsg.type = "voteAdmin";
    wsMsg.command = "status";
    wsMsg.status = "CLOSED";
    webConnection.send(wsMsg);
    $target.blur();
  } else if ($target.is("#voteAdmin_early")) {
    let wsMsg = {};
    wsMsg.type = "voteAdmin";
    wsMsg.command = "status";
    wsMsg.status = "EARLY";
    webConnection.send(wsMsg);
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
    webConnection.send(wsMsg);
  } else if ($target.is("#voteActs_new")) {
    let wsMsg = {};
    wsMsg.type = "voteEdit";
    wsMsg.command = "new";
    webConnection.send(wsMsg);
  } else if ($target.is("#voteAdmin_reset")) {
    if (confirm('This will delete ALL votes, this cannot be undone...')) {
      let wsMsg = {};
      wsMsg.type = "voteAdmin";
      wsMsg.command = "reset";
      webConnection.send(wsMsg);
    }
  } else if ($target.hasClass("voteActs_delete")) {
    if (confirm('Deleting a University cannot be undone and will remove ALL votes that come from this uni or are for this uni')) {
      let wsMsg = {};
      wsMsg.type = "voteEdit";
      wsMsg.command = "delete";
      wsMsg.PK = $target.data("pk");
      webConnection.send(wsMsg);
    }
  } else if ($target.hasClass('vAdmin_ban_no')) {
    let IP = $target.parent().data('IP');
    webConnection.send({"type":"voteAdmin","command":"banIP","IP":IP});
  } else if ($target.hasClass('vAdmin_ban_yes')) {
    let IP = $target.parent().data('IP');
    webConnection.send({"type":"voteAdmin","command":"unBanIP","IP":IP});
  } else if ($target.hasClass('vAdmin_enabled_no')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    webConnection.send({"type":"voteAdmin","command":"include","PK":PK});
  } else if ($target.hasClass('vAdmin_enabled_yes')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    webConnection.send({"type":"voteAdmin","command":"exclude","PK":PK});
  } else if ($target.hasClass('vAdmin_verify_yes')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    let email = $target.parent().data('email');
    let act = $target.parent().data('act');
    let IP = $target.parent().data('IP');
    let dateVote = $target.parent().data('dateVote');
    webConnection.send({"type":"voteAdmin","command":"unVerify","PK":PK,"email":email,"act":act,"IP":IP,"dateVote":dateVote});
  } else if ($target.hasClass('vAdmin_verify_no')) {
    let PK = $target.parent().attr('id').replace("voteMeta_", "");
    let email = $target.parent().data('email');
    let act = $target.parent().data('act');
    let IP = $target.parent().data('IP');
    let dateVote = $target.parent().data('dateVote');
    webConnection.send({"type":"voteAdmin","command":"verify","PK":PK,"email":email,"act":act,"IP":IP,"dateVote":dateVote});
  } else if ($target.is('#vAdmin_autoScroll')) {
    $target.toggleClass("vote_bttn_active");
    autoScroll = $target.hasClass("vote_bttn_active");
    $target.blur();
  } else if ($target.hasClass("voteActs_move")) {
    const $place = $($target.siblings('.voteActs_place')[0]);
    const $row = $target.closest('tr');
    $place.parent().addClass('voteActs_changed');
    $row.addClass('voteActs_changed_row');
    const count = $('#voteActs_table').children().length;
    const place = Number($place.val());
    if ($target.data('direction') == 'up') {
      if (place > 1) {
        $place.val(place-1);
        $row.prev().addClass('voteActs_changed_row');
        const $prevPlace = $row.prev().find('.voteActs_place');
        $prevPlace.parent().addClass('voteActs_changed');
        const prevVal = Number($prevPlace.val());
        $prevPlace.val(prevVal+1)
        $row.prev().before($row);
      }
    } else {
      if (place < count) {
        $place.val(place+1);
        $row.next().addClass('voteActs_changed_row');
        const $nextPlace = $row.next().find('.voteActs_place');
        $nextPlace.parent().addClass('voteActs_changed');
        const nextVal = Number($nextPlace.val());
        $nextPlace.val(nextVal-1)
        $row.next().after($row);
      }
    }
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

window.api.receive('l3rdLoad', (data) => {
  buildL3rds(data);
})

window.api.receive('identLoad', (data) => {
  buildIdent(data);
})

window.api.receive('judgeLoad', (data) => {
  judgeNames = data;
})