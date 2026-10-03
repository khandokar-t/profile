/* Shared behaviour for every page: profile links, the contact dialog
   (a pedestrian signal: WAIT, then WALK with a countdown) and toasts. */
(function () {
  "use strict";
  var SITE = window.SITE || { person: {}, links: {}, linkLabels: {} };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }
  window.toast = toast;

  /* ---------- profile links (empty URL = "coming soon") ---------- */
  function renderLinks(box) {
    box.textContent = "";
    Object.keys(SITE.linkLabels || {}).forEach(function (key) {
      var url = (SITE.links && SITE.links[key]) || "";
      var a = document.createElement("a");
      a.innerHTML = '<span class="dot" aria-hidden="true"></span>';
      a.appendChild(document.createTextNode(SITE.linkLabels[key]));
      if (url) {
        a.href = url; a.target = "_blank"; a.rel = "noopener";
      } else {
        a.href = "#"; a.setAttribute("data-empty", "true");
        a.addEventListener("click", function (e) { e.preventDefault(); toast(SITE.linkLabels[key] + " link coming soon"); });
      }
      box.appendChild(a);
    });
  }
  window.renderLinks = renderLinks;

  /* ---------- contact dialog ---------- */
  var dlg = null, timers = [];
  function buildDialog() {
    var email = (SITE.person && SITE.person.email) || "";
    dlg = document.createElement("dialog");
    dlg.className = "contact";
    dlg.setAttribute("aria-labelledby", "contact-title");
    dlg.innerHTML =
      '<button class="close" type="button" aria-label="Close">×</button>' +
      '<div class="contact-inner">' +
        '<div class="ped wait" aria-hidden="true">' +
          '<svg viewBox="0 0 84 96">' +
            '<g class="hand" fill="#FF8A3D"><rect x="24" y="40" width="36" height="34" rx="8"/><rect x="24" y="16" width="8" height="32" rx="4"/><rect x="33" y="11" width="8" height="36" rx="4"/><rect x="42" y="12" width="8" height="35" rx="4"/><rect x="51" y="18" width="8" height="30" rx="4"/><rect x="12" y="46" width="12" height="24" rx="5" transform="rotate(-32 18 58)"/></g>' +
            '<g class="man" fill="none" stroke="#F3F5F0" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><circle cx="45" cy="15" r="7.5" fill="#F3F5F0" stroke="none"/><path d="M43 27L39 58M42 33L28 49M42 33L57 45M39 58L27 86M39 58L55 84"/></g>' +
          '</svg>' +
          '<div class="count"></div><div class="word">WAIT</div>' +
        '</div>' +
        '<div>' +
          '<p class="mono" style="font-size:.72rem;letter-spacing:.1em;color:var(--ink-3)">PEDESTRIAN PUSH BUTTON</p>' +
          '<h2 id="contact-title">Let\'s talk.</h2>' +
          '<p style="color:var(--ink-2);margin-top:6px">Research, teaching or a role in transportation engineering: email is the fastest way to reach me.</p>' +
          '<div class="email"><code>' + email + '</code>' +
            '<button class="btn small sign" type="button" data-copy-email>Copy email</button>' +
            '<a class="btn small" href="mailto:' + email + '">Open mail app</a></div>' +
          '<div class="links" data-links></div>' +
          '<p class="note">' + ((SITE.person && SITE.person.location) || "") + '</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    renderLinks(dlg.querySelector("[data-links]"));
    dlg.querySelector(".close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", clearTimers);
    dlg.querySelector("[data-copy-email]").addEventListener("click", function () { copyText(email, "Email copied"); });
    var h = dlg.querySelector(".hand"), m = dlg.querySelector(".man");
    dlg._show = function (state) { h.style.display = state === "walk" ? "none" : ""; m.style.display = state === "walk" ? "" : "none"; };
  }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function openContact() {
    if (!dlg) buildDialog();
    clearTimers();
    var ped = dlg.querySelector(".ped"), word = ped.querySelector(".word"), count = ped.querySelector(".count");
    function set(state, w, c) {
      ped.classList.remove("wait", "walk"); ped.classList.add(state === "walk" ? "walk" : "wait");
      dlg._show(state); word.textContent = w; count.textContent = c;
    }
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    if (reduce) { set("walk", "WALK", ""); return; }
    set("wait", "WAIT", "");
    timers.push(setTimeout(function () {
      var n = 9; set("walk", "WALK", String(n));
      function tick() {
        n -= 1;
        if (n > 0) { set("walk", "WALK", String(n)); timers.push(setTimeout(tick, 1000)); }
        else { set("wait", "DON'T WALK", "0"); }
      }
      timers.push(setTimeout(tick, 1000));
    }, 1300));
  }
  window.openContact = openContact;

  function copyText(text, okMsg) {
    try {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () { toast(text); });
    } catch (e) { toast(text); }
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-contact]") : null;
    if (t) { e.preventDefault(); openContact(); }
  });

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-links]"), renderLinks);
    Array.prototype.forEach.call(document.querySelectorAll("[data-email]"), function (el) { el.textContent = SITE.person.email; });
  });
})();
