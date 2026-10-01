(function () {
  "use strict";

  const state = {
    data: null,
    currentDate: null,
    view: "stories",
    expanded: new Set(),
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  async function loadData() {

    try {
      const res = await fetch("data/briefs.json", { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {

    }
    if (window.BRIEFS_DATA) {
      return window.BRIEFS_DATA;
    }
    throw new Error("无法加载 briefs 数据。请用本地 HTTP 服务打开，或确保 data/briefs.embed.js 存在。");
  }

  function tagChipClass(tag) {
    if (!tag) return "chip-tag-default";
    if (tag.includes("新故事")) return "chip-tag-new";
    if (tag.includes("实质新进展") || tag.includes("相对昨天")) return "chip-tag-progress";
    if (tag.includes("续报")) return "chip-tag-cont";
    if (tag.includes("简报")) return "chip-tag-brief";
    return "chip-tag-default";
  }

  function confChipClass(conf) {
    if (!conf) return "chip-conf-default";
    if (conf === "高") return "chip-conf-高";
    if (conf === "中高") return "chip-conf-中高";
    if (conf === "中") return "chip-conf-中";
    return "chip-conf-default";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function formatDateLabel(iso) {
    const [y, m, d] = iso.split("-");
    return `${y}-${m}-${d}`;
  }

  function renderDateBar() {
    const bar = $("#date-bar");
    const label = bar.querySelector(".date-bar-label");
    bar.innerHTML = "";
    if (label) bar.appendChild(label);
    else {
      const span = document.createElement("span");
      span.className = "date-bar-label";
      span.textContent = "日期";
      bar.appendChild(span);
    }

    state.data.briefs.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "date-chip" + (b.date === state.currentDate ? " active" : "");
      btn.textContent = formatDateLabel(b.date);
      btn.dataset.date = b.date;
      btn.setAttribute("aria-pressed", b.date === state.currentDate ? "true" : "false");
      btn.addEventListener("click", () => {
        if (state.currentDate === b.date) return;
        state.currentDate = b.date;
        state.expanded.clear();
        render();
      });
      bar.appendChild(btn);
    });
  }

  function currentBrief() {
    return state.data.briefs.find((b) => b.date === state.currentDate) || state.data.briefs[0];
  }

  function renderDayMeta(brief) {
    const el = $("#day-meta");
    let html = `<h2>${escapeHtml(brief.title || "简报")} · ${escapeHtml(brief.date)}</h2>`;
    html += `<div class="meta-row"><span>${(brief.stories || []).length} 则故事</span>`;
    if (brief.index && brief.index.length) {
      html += `<span>索引 ${brief.index.length} 条</span>`;
    }
    html += `</div>`;

    if (brief.windowNote) {
      html += `<div class="window-note"><strong>时间窗</strong> · ${escapeHtml(brief.windowNote)}</div>`;
    }
    if (brief.vsYesterday) {
      html += `<div class="vs-yesterday"><strong>相对昨天</strong> · ${escapeHtml(brief.vsYesterday)}</div>`;
    }
    if (brief.thinDay || brief.thinDayNote) {
      html += `<div class="thin-note"><strong>Thin day</strong> · ${escapeHtml(brief.thinDayNote || "当日实质新闻偏少")}</div>`;
    }
    el.innerHTML = html;
  }

  function previewFacts(facts) {
    const items = (facts || []).slice(0, 3);
    if (!items.length) return "<p class='facts-preview' style='padding-left:0;color:var(--text-muted)'>暂无 FACTS</p>";
    return (
      "<ul class='facts-preview'>" +
      items.map((f) => `<li>${escapeHtml(f)}</li>`).join("") +
      (facts.length > 3 ? `<li style=\"list-style:none;color:var(--text-muted);padding-left:0;margin-left:-1.1rem\">…另有 ${facts.length - 3} 条</li>` : "") +
      "</ul>"
    );
  }

  function sectionBlock(label, contentHtml) {
    if (!contentHtml) return "";
    return (
      `<div class=\"section\">` +
      `<div class=\"section-label\">${escapeHtml(label)}</div>` +
      `<div class=\"section-content\">${contentHtml}</div>` +
      `</div>`
    );
  }

  function renderCard(story, briefDate) {
    const key = `${briefDate}::${story.id}`;
    const expanded = state.expanded.has(key);
    const tag = story.tag || "";
    const conf = story.confidence || "";

    const chips = [];
    if (tag) {
      chips.push(`<span class=\"chip ${tagChipClass(tag)}\">${escapeHtml(tag)}</span>`);
    }
    if (conf) {
      chips.push(`<span class=\"chip ${confChipClass(conf)}\">置信度 ${escapeHtml(conf)}</span>`);
    }

    const factsList =
      (story.facts || []).length > 0
        ? `<ul>${story.facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
        : "";

    const sourcesHtml =
      (story.sources || []).length > 0
        ? `<ul class=\"sources-list\">${story.sources
            .map(
              (s) =>
                `<li><a href=\"${escapeHtml(s.url)}\" target=\"_blank\" rel=\"noopener noreferrer\">${escapeHtml(
                  s.label || s.url
                )}</a></li>`
            )
            .join("")}</ul>`
        : "";

    const body =
      sectionBlock("FACTS", factsList) +
      sectionBlock("解读 A", escapeHtml(story.readingA || "")) +
      sectionBlock("解读 B", escapeHtml(story.readingB || "")) +
      sectionBlock("DISAGREE", escapeHtml(story.disagree || "")) +
      sectionBlock("SYNTHESIS", escapeHtml(story.synthesis || "")) +
      sectionBlock("UNKNOWN", escapeHtml(story.unknown || "")) +
      sectionBlock("CONFIDENCE", escapeHtml(conf ? `置信度：${conf}` : "")) +
      sectionBlock("SOURCES", sourcesHtml);

    return `
      <article class=\"story-card${expanded ? \" expanded\" : \"\"}\" data-key=\"${escapeHtml(key)}\" data-id=\"${escapeHtml(String(story.id))}\">
        <div class=\"card-header\" data-toggle=\"1\">
          <div class=\"card-top\">
            <span class=\"card-num\">${escapeHtml(String(story.id))}</span>
            <h3 class=\"card-title\">${escapeHtml(story.title)}</h3>
          </div>
          <div class=\"chips\">${chips.join("")}</div>
          <div class=\"facts-preview-wrap\">${previewFacts(story.facts)}</div>
        </div>
        <div class=\"card-actions\">
          <button type=\"button\" class=\"expand-btn\" data-toggle=\"1\">${expanded ? "收起" : "展开"}</button>
          <span class=\"expand-hint\">${expanded ? "点击收起完整分析" : "FACTS · 双解读 · 分歧 · 综合"}</span>
        </div>
        <div class=\"card-body\">${body}</div>
      </article>
    `;
  }

  function renderCards(brief) {
    const grid = $("#card-grid");
    grid.innerHTML = (brief.stories || []).map((s) => renderCard(s, brief.date)).join("");

    grid.querySelectorAll("[data-toggle]").forEach((el) => {
      el.addEventListener("click", (e) => {

        if (e.target.closest("a")) return;
        const card = el.closest(".story-card");
        if (!card) return;
        const key = card.dataset.key;
        if (state.expanded.has(key)) state.expanded.delete(key);
        else state.expanded.add(key);

        renderCards(currentBrief());

        const fresh = grid.querySelector(`[data-key="${CSS.escape(key)}"]`);
        if (fresh && state.expanded.has(key)) {
          fresh.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });
    });
  }

  function renderIndex(brief) {
    const list = $("#index-list");
    const items = brief.index || [];
    if (!items.length) {
      list.innerHTML = `<li class=\"index-item\"><span class=\"index-n\">—</span><span class=\"index-title\">本日暂无索引</span></li>`;
      return;
    }
    list.innerHTML = items
      .map((item) => {
        const title = item.url
          ? `<a href=\"${escapeHtml(item.url)}\" target=\"_blank\" rel=\"noopener noreferrer\">${escapeHtml(item.title)}</a>`
          : escapeHtml(item.title);
        return `
          <li class=\"index-item\">
            <span class=\"index-n\">${escapeHtml(String(item.n))}</span>
            <span class=\"index-title\">${title}</span>
            <span class=\"index-outlet\">${escapeHtml(item.outlet || "")}</span>
          </li>`;
      })
      .join("");
  }

  function renderViewTabs() {
    $$(".view-tab").forEach((tab) => {
      const active = tab.dataset.view === state.view;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    $("#stories-panel").classList.toggle("hidden", state.view !== "stories");
    $("#index-panel").classList.toggle("visible", state.view === "index");
  }

  function render() {
    const brief = currentBrief();
    if (!brief) return;
    state.currentDate = brief.date;
    renderDateBar();
    renderDayMeta(brief);
    renderCards(brief);
    renderIndex(brief);
    renderViewTabs();
    $("#status").classList.add("hidden");
    $("#content").classList.remove("hidden");
  }

  function bindTabs() {
    $$(".view-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.view = tab.dataset.view;
        renderViewTabs();
      });
    });
  }

  async function init() {
    bindTabs();
    try {
      state.data = await loadData();
      if (state.data.site) {
        $("#site-title").textContent = state.data.site.title || "News Honestly";
        $("#site-subtitle").textContent = state.data.site.subtitle || "";
        document.title = state.data.site.title || "News Honestly";
      }
      if (!state.data.briefs || !state.data.briefs.length) {
        throw new Error("briefs 数组为空");
      }
      state.currentDate = state.data.briefs[0].date;
      render();
    } catch (err) {
      const status = $("#status");
      status.classList.add("error");
      status.textContent = err.message || String(err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
