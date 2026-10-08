/** STIVIUM hire-force: real ERC-8183 BSC Testnet only. No local mock. No x402. No Altana on hire. */
(function () {
  "use strict";

  function getErc8183Provider(agent, activation) {
    const p = String((agent && agent.erc8183Provider) || (activation && activation.erc8183Provider) || "").trim();
    return /^0x[a-fA-F0-9]{40}$/.test(p) ? p : "";
  }

  function forceHireHandlers() {
    const overlay = document.getElementById("overlay");
    const modalBody = document.getElementById("modalBody");
    if (!overlay || !modalBody) return;

    modalBody.addEventListener("click", async function (event) {
      const btn = event.target && event.target.closest && event.target.closest("#confirmActivate");
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const name = (modalBody.querySelector("h2") || {}).textContent || "";
      const catalog = (typeof getAgentCatalog === "function") ? getAgentCatalog() : (window.AGENTS || []);
      const a = catalog.find(function (x) { return x.name === name; }) || {};
      // Access internal activations via renderModal closure is hard; use localStorage
      var activations = {};
      try { activations = JSON.parse(localStorage.getItem("stivium-activations-v1") || localStorage.getItem("stivium-activations-v2") || "{}"); } catch (_) {}
      const state = activations[name] || {};

      const originalText = btn.textContent;
      const setStatus = function (msg) { btn.textContent = msg; };
      btn.disabled = true;

      state.onchain = false;
      state.x402 = false;
      state.x402Paid = false;
      state.x402Ref = null;
      state.shadow = false;
      state.txHash = null;
      state.explorer = null;
      state.altanaError = null;
      state.authorityVerified = false;
      state.authority = null;
      state.erc8183 = true;
      state.erc8183Provider = getErc8183Provider(a, state);
      state.erc8183JobId = null;
      state.erc8183FundTxHash = null;
      state.erc8183Error = null;

      const expirySelect = modalBody.querySelector("#expirySelect");
      const expiry = (expirySelect && expirySelect.value) || state.expiry || "30";

      try {
        if (!state.erc8183Provider) throw new Error("No ERC-8183 provider is configured for this agent.");
        if (!window.__stiviumPrivy || typeof window.__stiviumPrivy.hireErc8183Testnet !== "function")
          throw new Error("Privy is still loading. Please wait a moment and try again.");
        if (!window.__stiviumPrivy.walletAddress) {
          setStatus("Connecting wallet…");
          if (typeof window.__stiviumPrivy.login === "function") await window.__stiviumPrivy.login();
          if (!window.__stiviumPrivy.walletAddress) throw new Error("Connect Privy wallet first.");
        }
        setStatus("Switching to BSC Testnet…");
        if (typeof window.__stiviumPrivy.ensureBsc === "function") await window.__stiviumPrivy.ensureBsc();
        setStatus("Checking U balance…");
        setStatus("Creating ERC-8183 job…");
        const hire = await window.__stiviumPrivy.hireErc8183Testnet({
          provider: state.erc8183Provider,
          description: "STIVIUM hire: " + name + " · " + (a.cat || ""),
          budgetTokens: "0.1",
          expirySeconds: Math.max(3600, Number(expiry || 30) * 86400),
          onProgress: function (step) {
            var labels = {
              switch: "Switching to BSC Testnet…", balance: "Checking U balance…",
              create: "Creating ERC-8183 job…", register: "Registering job…",
              budget: "Setting budget…", approve: "Approving U…", fund: "Funding job…"
            };
            if (labels[step]) setStatus(labels[step]);
          }
        });
        if (!hire || !hire.fundTxHash) throw new Error("fund() did not return a successful receipt.");
        state.erc8183JobId = hire.jobId;
        state.erc8183FundTxHash = hire.fundTxHash;
        state.stage = "done";
        activations[name] = state;
        try { localStorage.setItem("stivium-activations-v2", JSON.stringify(activations)); } catch (_) {}
        if (typeof renderModal === "function") renderModal(name);
        if (typeof render === "function") render();
        else location.reload();
      } catch (e) {
        state.erc8183Error = (e && e.message) ? e.message : String(e);
        state.erc8183JobId = null;
        state.erc8183FundTxHash = null;
        state.stage = "setup";
        var errBox = modalBody.querySelector("[data-hire-error]");
        if (!errBox) {
          errBox = document.createElement("div");
          errBox.setAttribute("data-hire-error", "1");
          errBox.style.cssText = "margin:10px 0;padding:10px 12px;border:1px solid rgba(240,80,80,.35);border-radius:10px;background:rgba(240,80,80,.08);font-size:12px;color:var(--coral);line-height:1.45;";
          var actions = modalBody.querySelector(".modal-actions");
          if (actions) actions.parentNode.insertBefore(errBox, actions);
          else modalBody.appendChild(errBox);
        }
        errBox.textContent = "Hire failed: " + state.erc8183Error;
      }
      btn.disabled = false;
      btn.textContent = originalText || "Hire on BSC Testnet";
    }, true);
  }

  var obs = new MutationObserver(function () {
    var confirm = document.getElementById("confirmActivate");
    if (confirm && confirm.textContent.indexOf("Hire on BSC") < 0) {
      confirm.textContent = "Hire on BSC Testnet";
    }
    var x402 = document.getElementById("x402Pay");
    if (x402 && x402.closest) {
      var row = x402.closest("label") || x402.closest(".chk");
      if (row) row.style.display = "none";
    }
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", forceHireHandlers);
  } else {
    forceHireHandlers();
  }
  setInterval(forceHireHandlers, 2000);
})();
