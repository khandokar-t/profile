/* The opening: "Hi, I am Khandokar Tanvir Rahman", then the name flies into the header.
   Runs before three.js has loaded, so the 3D scene can load in the background. */
window.Intro = (function () {
  "use strict";
  var body = document.body;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem("ktr-intro") === "1"; } catch (e) {}
  var skip = seen || reduce || /^#p[1-8]$/.test(location.hash);

  var intro = document.getElementById("intro"), hiName = document.getElementById("hi-name");
  var brandName = document.getElementById("brand-name"), gate = document.getElementById("gate");
  var waiting = [], nameDone = false;

  function finishName() {
    nameDone = true;
    body.classList.remove("name-on");
    waiting.forEach(function (f) { f(); }); waiting = [];
  }

  if (skip) {
    body.classList.add("skip-intro");
    intro.classList.add("clear");
    nameDone = true;
  } else {
    body.classList.add("name-on");
    var fly = function () {
      var s = hiName.getBoundingClientRect(), t = brandName.getBoundingClientRect();
      var k = t.height / s.height;
      hiName.style.transformOrigin = "0 0";
      hiName.style.transform = "translate(" + (t.left - s.left) + "px," + (t.top - s.top) + "px) scale(" + k + ")";
      intro.classList.add("flying");
      setTimeout(function () {
        body.classList.add("named");                     // the header name takes over
        intro.classList.add("clear");
        setTimeout(finishName, 450);
      }, 950);
    };
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () { setTimeout(fly, 1500); });
  }

  return {
    skip: skip,
    onNameDone: function (f) { if (nameDone) f(); else waiting.push(f); },
    showGate: function (x, y, below) {
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
