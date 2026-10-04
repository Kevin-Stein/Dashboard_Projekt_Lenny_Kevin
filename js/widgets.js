// Wiederverwendbare Widget-Kacheln: Quelle klonen, nicht pro Seite neu bauen.
(function (global) {
  const CHEVRON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

  function suffixIds(root, suffix) {
    [root, ...root.querySelectorAll("*")].forEach((el) => {
      if (el.id) el.id += "--" + suffix;
      ["fill", "stroke", "clip-path", "mask"].forEach((attr) => {
        const value = el.getAttribute(attr);
        if (value && value.includes("url(#"))
          el.setAttribute(attr, value.replace(/url\(#([^)]+)\)/g, `url(#$1--${suffix})`));
      });
    });
  }

  function clonePanel(src, suffix) {
    const clone = src.cloneNode(true);
    clone.querySelectorAll(".layout-handle, .layout-resize, .widget-slot").forEach((el) => el.remove());
    [clone, ...clone.querySelectorAll("*")].forEach((el) => {
      el.classList.remove("collapsed", "layout-group", "layout-dragging", "layout-resizing");
      el.removeAttribute("data-layout-id");
      el.removeAttribute("data-layout-item");
      el.removeAttribute("data-layout-grow");
      el.removeAttribute("data-layout-h");
      el.removeAttribute("data-layout-w");
      el.style.removeProperty("--layout-grow");
      el.style.removeProperty("--layout-h");
      el.style.removeProperty("--layout-w");
    });
    suffixIds(clone, suffix);
    clone.hidden = false;
    clone.removeAttribute("hidden");
    return clone;
  }

  function sourceNode(source, clone, node, suffix) {
    if (!node || !clone.contains(node)) return null;
    if (node === clone) return source;
    if (node.id && node.id.endsWith("--" + suffix)) {
      const base = node.id.slice(0, -(suffix.length + 2));
      if (source.id === base) return source;
      try {
        return source.querySelector("#" + CSS.escape(base));
      } catch (err) {
        return null;
      }
    }
    const path = [];
    let walk = node;
    while (walk && walk !== clone) {
      const parent = walk.parentElement;
      if (!parent) break;
      path.push([...parent.children].indexOf(walk));
      walk = parent;
    }
    let target = source;
    for (let i = path.length - 1; i >= 0; i--) {
      target = target.children[path[i]];
      if (!target) return null;
    }
    return target;
  }

  function bindCloneProxy(clone, source, suffix) {
    clone.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const orig = sourceNode(source, clone, e.target, suffix);
      if (!orig) return;
      orig.querySelectorAll("input, textarea, select").forEach((input) => {
        if (!input.id) return;
        const copy = clone.querySelector("#" + CSS.escape(input.id + "--" + suffix));
        if (copy && "value" in input) input.value = copy.value;
      });
      if (typeof orig.requestSubmit === "function") orig.requestSubmit();
      else orig.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    clone.addEventListener("click", (e) => {
      const hit = e.target.closest("button, a, .day, .water-item, [type=submit]");
      if (!hit || clone.querySelector(":scope > .ov-remove") === hit) return;
      if (hit.classList.contains("panel-toggle") || hit.classList.contains("ov-remove")) return;
      if (hit.closest("form") && hit.type !== "button") return;
      const orig = sourceNode(source, clone, hit, suffix);
      if (!orig || orig === hit) return;
      e.preventDefault();
      orig.click();
    });
  }

  function addRemoveButton(panel, title, onRemove) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ov-remove";
    btn.setAttribute("aria-label", title);
    btn.title = title;
    btn.textContent = "×";
    btn.addEventListener("click", onRemove);
    panel.appendChild(btn);
    return btn;
  }

  function ensureToggle(panel, title, setupToggle) {
    let toggle = panel.querySelector(":scope > .panel-toggle") || panel.querySelector(".panel-toggle");
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "panel-toggle auto-toggle";
      toggle.innerHTML = CHEVRON;
      panel.appendChild(toggle);
    }
    toggle.setAttribute("aria-label", title);
    if (!toggle.dataset.toggleReady) {
      toggle.dataset.toggleReady = "1";
      setupToggle(panel, toggle);
    }
    return toggle;
  }

  function mountClonedSource(board, type, def, api, options = {}) {
    const src = document.querySelector(def.source);
    if (!src) throw new Error(`Widget-Quelle fehlt: ${def.source}`);
    const key = options.key || type;
    const panelId = options.panelId || `${board.prefix}-${type}`;
    const suffix = panelId;
    const independent = Boolean(options.independent);
    const title = api.t(`widget.${type}.title`);
    const panel = clonePanel(src, suffix);
    panel.classList.add("ov-widget", "ov-clone");
    if (independent) panel.classList.add("ov-compare");
    if (def.wide) panel.classList.add("ov-wide");
    if (def.compact) panel.classList.add(def.compact);
    panel.id = panelId;
    panel.dataset.widgetKey = key;
    panel.setAttribute("aria-label", title);
    if (!panel.querySelector(":scope > .panel-title")) {
      const heading = document.createElement("div");
      heading.className = "panel-title";
      heading.textContent = title;
      panel.prepend(heading);
    }
    addRemoveButton(panel, api.t("widget.removeAria", { title }), () => {
      if (!document.body.classList.contains("layout-editing")) return;
      api.onRemove(key);
    });
    ensureToggle(panel, api.t("widget.toggleAria", { title }), api.setupToggle);
    api.applySavedSize(panel, api.loadLayoutSizes()[panel.id]);
    board.grid.appendChild(panel);
    if (independent) {
      const stop = api.bindIndependent?.(panel, type);
      return () => stop?.();
    }
    bindCloneProxy(panel, src, suffix);

    let queued = false;
    const refresh = () => {
      queued = false;
      if (panel.contains(document.activeElement)) return;
      const fresh = clonePanel(src, suffix);
      const remove = panel.querySelector(":scope > .ov-remove");
      const keepToggle = panel.querySelector(":scope > .panel-toggle.auto-toggle");
      const keepHandle = panel.querySelector(":scope > .layout-handle");
      const keepResize = panel.querySelector(":scope > .layout-resize");
      [...panel.children].forEach((child) => {
        if (child !== remove && child !== keepToggle && child !== keepHandle && child !== keepResize) child.remove();
      });
      [...fresh.children].forEach((child) => {
        if (child.classList.contains("ov-remove")) return;
        panel.insertBefore(child, remove || keepToggle || null);
      });
      ensureToggle(panel, api.t("widget.toggleAria", { title }), api.setupToggle);
    };
    const observer = new MutationObserver((records) => {
      const chrome = (node) =>
        node.nodeType === 1 &&
        (node.classList.contains("layout-handle") || node.classList.contains("layout-resize"));
      if (
        records.every((record) =>
          [...record.addedNodes, ...record.removedNodes].every((node) => node.nodeType !== 1 || chrome(node)),
        )
      )
        return;
      if (queued) return;
      queued = true;
      requestAnimationFrame(refresh);
    });
    observer.observe(src, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }

  function mountFragmentMirror(body, selectors, suffix, mirrorMembers) {
    const sources = selectors.map((s) => document.querySelector(s)).filter(Boolean);
    let queued = false;
    const update = () => {
      queued = false;
      body.replaceChildren(
        ...sources.map((src) => {
          const members = mirrorMembers(src);
          const clone = clonePanel(src, suffix);
          if (members) clone.replaceChildren(...members.map((el) => clonePanel(el, suffix)));
          return clone;
        }),
      );
    };
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    });
    const watched = sources.flatMap((src) => [src, ...(mirrorMembers(src) ? src._defaultOrder : [])]);
    watched.forEach((el) =>
      observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: true }),
    );
    update();
    return () => observer.disconnect();
  }

  function createShell(board, type, def, api, options = {}) {
    const key = options.key || type;
    const panelId = options.panelId || `${board.prefix}-${type}`;
    const title = api.t(`widget.${type}.title`);
    const panel = document.createElement("section");
    panel.className =
      "panel ov-widget" +
      (def.wide ? " ov-wide" : "") +
      (def.full ? " ov-full" : "") +
      (def.compact ? " " + def.compact : "");
    panel.id = panelId;
    panel.dataset.widgetKey = key;
    panel.setAttribute("aria-label", title);
    panel.innerHTML = `<div class="panel-title">${title}</div><div class="ov-body ov-body-${type}"></div>`;
    addRemoveButton(panel, api.t("widget.removeAria", { title }), () => {
      if (!document.body.classList.contains("layout-editing")) return;
      api.onRemove(key);
    });
    ensureToggle(panel, api.t("widget.toggleAria", { title }), api.setupToggle);
    api.applySavedSize(panel, api.loadLayoutSizes()[panel.id]);
    board.grid.appendChild(panel);
    return panel;
  }

  global.DashboardWidgets = {
    clonePanel,
    mountClonedSource,
    mountFragmentMirror,
    createShell,
  };
})(window);
