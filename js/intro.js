/* The opening: "Hi, I am Khandokar Tanvir Rahman" on a blank page, then the header appears
   and the square intersection takes over. Runs before three.js has loaded. */
window.Intro = (function () {
  "use strict";
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem("ktr-intro") === "1"; } catch (e) {}
  var skip = seen || reduce || /^#p[1-8]$/.test(location.hash);

  var intro = document.getElementById("intro"), gate = document.getElementById("gate");
  var waiting = [], nameDone = false;
  function finishName() { nameDone = true; waiting.forEach(function (f) { f(); }); waiting = []; }

  if (skip) {
    body.classList.add("skip-intro");
    intro.classList.add("clear");
    nameDone = true;
  } else {
    body.classList.add("name-on");
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      setTimeout(function () {
        intro.classList.add("clear");                  // the greeting fades with the blank page
        body.classList.remove("name-on");              // and the header appears, as on every page
        setTimeout(finishName, 500);
      }, 1900);
    });
  }

  return {
    skip: skip,
    onNameDone: function (f) { if (nameDone) f(); else waiting.push(f); },
    showGate: function (x, y, below) {                 // x, y in the stage's own coordinates
      gate.hidden = false;
      gate.classList.toggle("below", !!below);
      gate.style.left = x + "px"; gate.style.top = y + "px";
      gate.classList.remove("go");
      requestAnimationFrame(function () { gate.classList.add("show"); });
    },
    gateGreen: function () { gate.classList.add("go"); },
    hideGate: function () { gate.classList.remove("show"); setTimeout(function () { if (!gate.classList.contains("show")) gate.hidden = true; }, 350); },
    onGateClick: function (f) { gate.addEventListener("click", f); }
  };
})();
