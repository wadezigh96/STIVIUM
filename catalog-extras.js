/**
 * Catalog extras loaded after app.js.
 * Search, builder-list, LIVE/YOURS badges, keyboard shortcuts.
 * Does not replace the 16 judging agents.
 */
(function () {
  const LISTED_KEY = "stivium-listed-v1";
  let searchQuery = "";

  function listedAgents() {
    try {
      const raw = JSON.parse(localStorage.getItem(LISTED_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }
  function persistListed(list) {
    try {
      localStorage.setItem(LISTED_KEY, JSON.stringify(list));
    } catch (_) {}
  }
  function mergeListed() {
    if (!Array.isArray(window.AGENTS)) return;
    const have = new Set(window.AGENTS.map((a) => String(a.name).toLowerCase()));
    listedAgents().forEach((a) => {
      if (!a || !a.name) return;
      const key = String(a.name).toLowerCase();
      if (have.has(key)) return;
      window.AGENTS.push(a);
      have.add(key);
    });
  }
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function matchesSearch(a, q) {
    if (!q) return true;
    const hay = [a.name, a.cat, a.desc, a.keyLabel, a.keyValue, a.live ? "live 8004scan" : "", a.listed ? "listed yours" : ""].join(" ").toLowerCase();
    return hay.includes(q);
  }
  function defaultKey(cat) {
    if (cat === "Rebalancing") return { keyLabel: "Rebalances / wk", keyValue: "8" };
    if (cat === "Grid Trading") return { keyLabel: "Max drawdown", keyValue: "-4.0%" };
    if (cat === "Yield Optimisation") return { keyLabel: "Net APY", keyValue: "12.0%" };
    return { keyLabel: "Min HF maintained", keyValue: "1.40" };
  }

  const origRender = window.render;
  window.render = function render() {
    if (typeof origRender !== "function") return;
    origRender();
    const grid = document.getElementById("grid");
    if (!grid) return;
    const q = searchQuery.trim().toLowerCase();
    const scored = typeof computeScores === "function" ? computeScores(window.AGENTS) : window.AGENTS;
    const visible = [];
    grid.querySelectorAll(".card").forEach((card) => {
      const name = card.dataset.name;
      const a = scored.find((x) => x.name === name);
      if (!a) return;
      const show = matchesSearch(a, q);
      card.style.display = show ? "" : "none";
      if (show) visible.push(a);
      const tag = card.querySelector(".cat-tag");
      if (tag && !tag.dataset.pills) {
        tag.dataset.pills = "1";
        const bits = [];
        if (a.live) bits.push('<span class="src-pill live">LIVE</span>');
        if (a.listed) bits.push('<span class="src-pill listed">YOURS</span>');
        if (a.x402) bits.push('<span class="src-pill x402">x402</span>');
        if (bits.length) tag.insertAdjacentHTML("beforeend", " " + bits.join(""));
      }
    });
    const floor = document.getElementById("floorCount");
    if (floor && q) floor.textContent = visible.length + " agents available";
    if (q && !visible.length) {
      grid.innerHTML = '<div class="empty">No agents match this filter. Clear search or pick another category.</div>';
    }
  };

  function bindSearch() {
    const input = document.getElementById("catalogSearch");
    if (!input || input.dataset.bound) return;
    input.dataset.bound = "1";
    input.addEventListener("input", () => {
      searchQuery = input.value || "";
      window.render();
    });
  }

  function openListBuilder() {
    const overlay = document.getElementById("overlay");
    const modalBody = document.getElementById("modalBody");
    if (!overlay || !modalBody) return;
    overlay.classList.add("open");
    modalBody.innerHTML = `<div class="modal-head"><div><h2>List an agent</h2><div class="cat-tag">Builder claim · local only</div></div><button class="modal-close" id="xClose" type="button" aria-label="Close">×</button></div>
      <p class="modal-desc">Adds a card to <em>your</em> browser catalog. The 16 judging agents stay untouched. This is the claim/list surface — not an on-chain registry write.</p>
      <div class="activate-box">
        <div class="field"><label for="listName">Agent name</label><input id="listName" type="text" placeholder="e.g. DriftNote" maxlength="48"></div>
        <div class="field"><label for="listCat">Category</label><select class="expiry" id="listCat">
          <option>Rebalancing</option><option>Grid Trading</option><option>Yield Optimisation</option><option>Health Factor Monitoring</option>
        </select></div>
        <div class="field"><label for="listDesc">What it does</label><input id="listDesc" type="text" placeholder="One sentence strategy" maxlength="220"></div>
        <div class="field"><label for="listKey">Category metric value</label><input id="listKey" type="text" placeholder="e.g. 10 or 1.35 or 16.2%" maxlength="16"></div>
      </div>
      <div class="modal-actions"><button class="hire-btn" id="confirmList" type="button">Publish to my catalog</button><button class="hire-btn ghost" id="closeBtn" type="button">Cancel</button></div>`;
    const close = () => {
      overlay.classList.remove("open");
      modalBody.innerHTML = "";
    };
    modalBody.querySelector("#xClose").addEventListener("click", close);
    modalBody.querySelector("#closeBtn").addEventListener("click", close);
    modalBody.querySelector("#confirmList").addEventListener("click", () => {
      const name = (modalBody.querySelector("#listName").value || "").trim();
      const cat = modalBody.querySelector("#listCat").value;
      const desc = (modalBody.querySelector("#listDesc").value || "").trim();
      const keyValue = (modalBody.querySelector("#listKey").value || "").trim();
      if (!name) {
        modalBody.querySelector("#listName").focus();
        return;
      }
      if (window.AGENTS.some((a) => String(a.name).toLowerCase() === name.toLowerCase())) {
        modalBody.querySelector("#listName").value = name + " (yours)";
        return;
      }
      const keys = defaultKey(cat);
      const agent = {
        name,
        cat,
        peerCount: 12,
        uptimeDays: 1,
        successRate: 80,
        tvl: 25000,
        verified: false,
        h24n: 2,
        h24p: 1,
        h7n: 6,
        h7p: 4,
        hist7: [1, 1, 2, 2, 2, 3, 3],
        keyLabel: keys.keyLabel,
        keyValue: keyValue || keys.keyValue,
        desc: desc || "Builder-listed agent. Local catalog only.",
        listed: true,
      };
      persistListed(listedAgents().concat(agent));
      window.AGENTS.push(agent);
      close();
      if (window.StiviumApp && typeof window.StiviumApp.refresh === "function") window.StiviumApp.refresh();
      else window.render();
    });
  }

  document.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("overlay");
    if (e.key === "Escape" && overlay && overlay.classList.contains("open")) {
      overlay.classList.remove("open");
      const modalBody = document.getElementById("modalBody");
      if (modalBody) modalBody.innerHTML = "";
    }
    const tag = document.activeElement && document.activeElement.tagName;
    if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
      const input = document.getElementById("catalogSearch");
      if (input) {
        e.preventDefault();
        input.focus();
      }
    }
  });

  function boot() {
    mergeListed();
    bindSearch();
    const listBtn = document.getElementById("listAgentBtn");
    if (listBtn && !listBtn.dataset.bound) {
      listBtn.dataset.bound = "1";
      listBtn.addEventListener("click", openListBuilder);
    }
    if (typeof window.render === "function") window.render();
  }

  window.StiviumCatalog = { escapeHtml, mergeListed, boot };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
