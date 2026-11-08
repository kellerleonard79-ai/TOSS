// Admin page: sign in with the admin password, then edit the donation
// progress numbers shown on the home page. All checks happen on the server
// (functions/api/[[path]].js); this file only drives the forms.
(function () {
  const status = document.querySelector("[data-status]");
  const loginForm = document.querySelector("[data-login]");
  const loginMsg = document.querySelector("[data-login-msg]");
  const editor = document.querySelector("[data-editor]");
  const editorMsg = document.querySelector("[data-editor-msg]");
  const logoutBtn = document.querySelector("[data-logout]");

  const money = (n) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

  function show(view) {
    status.hidden = view !== "status";
    loginForm.hidden = view !== "login";
    editor.hidden = view !== "editor";
    if (view === "login") loginForm.password.focus();
  }

  async function api(path, options = {}) {
    const res = await fetch("/api/admin/" + path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }
    return { ok: res.ok, status: res.status, data };
  }

  function updatePreview() {
    const raised = Number(editor.raised.value) || 0;
    const goal = Number(editor.goal.value) || 0;
    const ratio = goal > 0 ? raised / goal : 0;
    document.querySelector("[data-progress-fill]").style.setProperty("--progress", Math.min(100, ratio * 100) + "%");
    document.querySelector("[data-raised-text]").textContent = money(raised);
    document.querySelector("[data-goal-text]").textContent = money(goal);
    document.querySelector("[data-percent-text]").textContent = Math.min(100, Math.round(ratio * 100)) + "%";
  }

  function fillEditor(campaign) {
    editor.raised.value = campaign.raised ?? "";
    editor.goal.value = campaign.goal ?? "";
    editorMsg.textContent = campaign.updatedAt
      ? "Last updated " + new Date(campaign.updatedAt).toLocaleString()
      : "Not saved yet. The home page is showing its built-in numbers.";
    updatePreview();
  }

  async function start() {
    status.textContent = "Checking sign-in…";
    show("status");
    try {
      const res = await api("campaign");
      if (res.ok) {
        fillEditor(res.data);
        show("editor");
      } else if (res.status === 401) {
        show("login");
      } else {
        status.textContent = res.data.error || "The admin service isn't available.";
      }
    } catch (e) {
      status.textContent = "Couldn't reach the server. Check your connection and reload.";
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = loginForm.querySelector("button");
    button.disabled = true;
    loginMsg.textContent = "";
    try {
      const res = await api("login", {
        method: "POST",
        body: JSON.stringify({ password: loginForm.password.value }),
      });
      if (res.ok) {
        loginForm.reset();
        await start();
      } else {
        loginMsg.textContent = res.data.error || "Sign in failed.";
        loginForm.password.select();
      }
    } catch (err) {
      loginMsg.textContent = "Couldn't reach the server.";
    } finally {
      button.disabled = false;
    }
  });

  editor.addEventListener("input", updatePreview);

  editor.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = editor.querySelector("button[type=submit]");
    button.disabled = true;
    editorMsg.textContent = "Saving…";
    try {
      const res = await api("campaign", {
        method: "PUT",
        body: JSON.stringify({ raised: Number(editor.raised.value), goal: Number(editor.goal.value) }),
      });
      if (res.ok) {
        fillEditor(res.data);
        editorMsg.textContent = "Saved. The home page will show the new numbers within about a minute.";
      } else if (res.status === 401) {
        loginMsg.textContent = "Your session ended. Sign in again.";
        show("login");
      } else {
        editorMsg.textContent = res.data.error || "Couldn't save.";
      }
    } catch (err) {
      editorMsg.textContent = "Couldn't reach the server. Nothing was saved.";
    } finally {
      button.disabled = false;
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try { await api("logout", { method: "POST" }); } catch (e) { /* ignore */ }
    loginMsg.textContent = "";
    show("login");
  });

  start();
})();
