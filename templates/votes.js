$(document).ready(function() {
  //$("main").removeClass("faded");
});

var currentJudge = 0;
var judgeCounts = {};
var ordering = [];
var uni = [];

//These 3 variables affect the speed of the boxes animating and the sizing of the boxes
var speed = 0.2;
var contsize = 700;

webcg.on('data', function(data) {
  switch (data.state) {
    case "unis":
      uni = data.data;

      buildElements();
      break;
    case "start":
      $(".scoresCont").children().each(function(){
        $(this).addClass("active");
      });
      break;
    case "stop":
      $(".scoresCont").children().each(function(){
        $(this).removeClass("active");
      });
      break;
    case "clear":
    case "reset":
      $(".scoreNew").removeClass("new");
      $("main").addClass("faded");
      $(".scoresCont").children().each(function(){
        $(this).removeClass("active");
      });
      break;
    case "update":
      let $new = $("#"+data.act+"-new");
      let $tot = $("#"+data.act+"-tot");
      let oldTotal = parseInt($tot.html());
      $tot.data("old", oldTotal);
      let total = data.score;
      let $cont = $("#act"+data.act);

      if (typeof data.from !== "undefined") {
        currentJudge = data.from;
        judgeCounts[currentJudge] = true;
      }

      $new.addClass("new");
      $new.html(total - oldTotal);
      $tot.html(total);
      $cont.data("score", total);

      if (data.reorder == true) {
        let rank = $cont.data("rank");
        let newRank = rank;
        $(".scoresCont").children().each(function(){
          if ($(this).attr("id") !== $cont.attr("id")) {
            let rnk = parseInt($(this).data("rank"));
            let scr = parseInt($(this).data("score"));
            if (total > scr && rank > rnk) {
              $(this).data("rank", rnk+1);
              $(this).removeClass("rank"+rnk);
              $(this).addClass("rank"+(rnk+1));
              newRank--;
            }
          }
        });
        $cont.data("rank", newRank);
        $cont.removeClass("rank"+rank);
        $cont.addClass("rank"+newRank);
      }
      break;
    case "downdate":
      let $newDD = $("#"+data.act+"-new");
      let $totDD = $("#"+data.act+"-tot");
      let totalDD = data.score;
      let oldTotalDD = $totDD.data("old");
      let $contDD = $("#act"+data.act);

      $newDD.removeClass("new");
      $newDD.html("");
      $totDD.html(oldTotalDD);
      $contDD.data("score", oldTotalDD);

      if (data.reorder == true) {
        let rankDD = $contDD.data("rank");
        let newRankDD = rankDD;
        $(".scoresCont").children().each(function(){
          if ($(this).attr("id") !== $contDD.attr("id")) {
            let rnkDD = parseInt($(this).data("rank"));
            let scrDD = parseInt($(this).data("score"));
            if (totalDD > scrDD && rankDD < rnkDD) {
              $(this).data("rank", rnkDD-1);
              $(this).removeClass("rank"+rnkDD);
              $(this).addClass("rank"+(rnkDD-1));
              newRankDD++;
            }
          }
        });
        $contDD.data("rank", newRankDD);
        $contDD.removeClass("rank"+rankDD);
        $contDD.addClass("rank"+newRankDD);
      }
      break;
    case "judge":
      $("main").removeClass("thisMadeMyLifeHard");
      $("main").removeClass("faded");
      $(".scoresCont").children().each(function(){
        $(this).addClass("active");
      });
      currentJudge = data.judge;
      $(".voting").addClass("voted");
      $(".voting").removeClass("voting");
      $("#tracker"+currentJudge).addClass("voting");
      let judgeName = "";
      for (let index = 0; index < uni.length; index++) {
        if (uni[index].PK == currentJudge) judgeName = uni[index].name;
      }
      $("#trackerLabel").html("Voting: "+judgeName);
      $("#trackerLabel").addClass("withText");
      judgeCounts[currentJudge] = true;
      $(".scoreNew").removeClass("new");
      break;
    case "public":
      $("main").addClass("thisMadeMyLifeHard");
      $("main").removeClass("faded");
      $(".scoresCont").children().each(function(){
        $(this).addClass("active");
      });
      $(".scoreNew").removeClass("new");
      $(".voting").addClass("voted");
      $(".voting").removeClass("voting");
      $("#trackerLabel").html("Counting the public vote");
      $("#trackerLabel").addClass("withText");
      break;
    case "reorder":
      $(".scoresCont").children().each(function(){
        let rank = $(this).data("rank");
        let score = parseInt($(this).data("score"))*5;
        if (ordering[score] !== undefined) {
          if (ordering[score-1] !== undefined) {
            if (ordering[score-2] !== undefined) {
              ordering[score-3] = {"rank": rank, element: this};
            } else {
              ordering[score-2] = {"rank": rank, element: this};
            }
          } else {
            ordering[score-1] = {"rank": rank, element: this};
          }
        } else {
          ordering[score] = {"rank": rank, element: this};
        }

      });
      ordering.sort();
      let ranks = 5;
      for (var i = 0; i < ordering.length; i++) {
        let $ele = $(ordering[i].element);
        $ele.removeClass("rank1");
        $ele.removeClass("rank2");
        $ele.removeClass("rank3");
        $ele.removeClass("rank4");
        $ele.removeClass("rank5");
        $ele.addClass("rank"+(i+1));
        ranks--;
      }
      break;
    default:

  }
});


function buildElements() {
  const $tracker = $(".trackerCont");
  const $scores = $(".scoresCont");
  const styleSheet = document.createElement("style");
  const quant = uni.length;
  const offset = contsize / quant;
  let styles = "";

  uni.forEach(act => {
    judgeCounts[act.PK] = false;
    $tracker.append(`<div id="tracker${act.PK}" class="tracker">${act.short}</div>`);
    $scores.append(`<div id="act${act.PK}" class="scoreBoxCont rank${act.order}" data-score="0" data-rank="${act.order}">
      <div class="scoreBox">
        <div class="scoreBoxFront scoresBoxFace">
          <div id="${act.PK}-new" class="scoreNew"></div>
          <div class="scoreName"><div class='uniName'>${act.name}</div><div class='actName'>${act.act}</div></div>
          <div id="${act.PK}-tot" class="scoreTotal">0</div>
        </div>
        <div class="scoresBoxTop scoresBoxFace"></div>
        <div class="scoresBoxBottom scoresBoxFace"></div>
        <div class="scoresBoxLeft scoresBoxFace"></div>
        <div class="scoresBoxRight scoresBoxFace"></div>
        <div class="scoresBoxBack scoresBoxFace"></div>
      </div>
    </div>`);

    styles += `.scoresCont .rank${act.order}.active,
    .scoresCont .rank${act.order}.active * {
      transition: 0.5s ${0.3+(act.order*speed)}s, width 0.5s 0s, background-color 0.5s 0s, padding 0.5s 0s, color 0.5s 0s;
    }
    .scoresCont .rank${act.order},
    .scoresCont .rank${act.order} * {
      transition: ${speed}s ${(act.order-1)*speed}s;
    }
    .rank${act.order} {
      transform: translateY(${(act.order-1)*offset}px);
    }`;
  });

  const boxSpacing = offset/5;
  const dimension = offset - boxSpacing;
  styles += `.scoreBox {
    height: ${dimension}px;
  }
  .scoreBoxFront {
    transform: translate3d(0, 0, ${dimension/2}px);
  }.scoresBoxBack {
    transform: rotateY(180deg) translate3d(0, 0, ${dimension/2}px);
  }
  
  .scoresBoxLeft {
    transform: rotateY(-90deg) translate3d(0, 0, ${dimension/2}px);
    width: ${dimension}px;
  }
  
  .scoresBoxRight {
    transform: rotateY(90deg) translate3d(0, 0, ${600-(dimension/2)}px);
    width: ${dimension}px;
  }
  
  .scoresBoxTop {
    transform: rotateX(90deg) translate3d(0, 0, ${dimension/2}px);
  }

  .scoresBoxBottom {
    transform: rotateX(-90deg) translate3d(0, 0, ${dimension/2}px);
  }
  .scoreName {
    padding: ${(dimension-65)/2}px;
    padding-left: 20px;
  }
  .scoreTotal {
    padding: ${(dimension-35)/2}px 17px;
  }
  .scoreNew.new {
    padding: ${(dimension-35)/2}px 25px;
  }`;
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

function log(json) {
  let obj = {};
  if (typeof json == "object") {
    obj = json;
  } else {
    obj = JSON.parse(json);
  }
  $("#log").html(`<pre>${JSON.stringify(obj)}</pre>`);
}