// ── Config ───────────────────────────────────────────────────────────────────
const Q = {
    NOW:      { label: "Urgente — Now (Importante)",        cls: "q-now",      color: "#E57300" },
    PLAN:     { label: "Não Urgente — Plan (Importante)",   cls: "q-plan",     color: "#1565C0" },
    DELEGAR:  { label: "Delegar (Urgente + Não Importante)","cls": "q-delegar", color: "#F59E0B" },
    BACKLOG:  { label: "Backlog (Não Urgente + Não Imp.)",  cls: "q-backlog",  color: "#546E7A" },
    FIN_NOW:  { label: "Finalizados — Now",                 cls: "q-fin-now",  color: "#2E7D32" },
    FIN_PLAN: { label: "Finalizados — Plan",                cls: "q-fin-plan", color: "#00695C" },
};

const TAB_QUADRANT = {
    now: "NOW", plan: "PLAN", delegar: "DELEGAR",
    backlog: "BACKLOG", fin_now: "FIN_NOW", fin_plan: "FIN_PLAN",
};

// ── State ─────────────────────────────────────────────────────────────────────
let team    = [];
let chart   = null;
let editing = null; // null = adding new | number = task id being edited

// ── API helpers ───────────────────────────────────────────────────────────────
const api = {
    async get(url)         { const r = await fetch(url);          return r.json(); },
    async post(url, body)  { const r = await fetch(url, { method: "POST",   headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); },
    async put(url, body)   { const r = await fetch(url, { method: "PUT",    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); },
    async del(url)         {         await fetch(url, { method: "DELETE" }); },
};

// ── Tab navigation ────────────────────────────────────────────────────────────
function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const content = document.getElementById(`tab-${tabName}`);
    if (btn)     btn.classList.add("active");
    if (content) content.classList.add("active");

    if (tabName === "resumo") {
        loadResumo();
    } else {
        const quadrant = TAB_QUADRANT[tabName];
        if (quadrant) loadTaskTab(content, quadrant);
    }
}

// ── RESUMO ────────────────────────────────────────────────────────────────────
async function loadResumo() {
    const data = await api.get("/api/summary");
    renderSummaryTable(data);
    populateChartFilter(data.rows);
    renderResumoChart(data, document.getElementById("chart-dev-filter").value);
}

function populateChartFilter(rows) {
    const sel     = document.getElementById("chart-dev-filter");
    const current = sel.value;
    sel.innerHTML = `<option value="all">🌐 Geral (Todos)</option>` +
        rows.map(r => `<option value="${escHtml(r.dev)}">${escHtml(r.dev)}</option>`).join("");
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

function renderSummaryTable({ rows, totals }) {
    const tbody = document.getElementById("summary-tbody");

    const mkCell = (val, cls) => {
        const td = document.createElement("td");
        td.className = cls + (val === 0 ? " zero" : "");
        td.textContent = val;
        return td;
    };

    tbody.innerHTML = "";
    rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${escHtml(r.dev)}</td>`;
        tr.appendChild(mkCell(r.NOW,        "col-now"));
        tr.appendChild(mkCell(r.PLAN,       "col-plan"));
        tr.appendChild(mkCell(r.DELEGAR,    "col-delegar"));
        tr.appendChild(mkCell(r.BACKLOG,    "col-backlog"));
        tr.appendChild(mkCell(r.total_ativo,"col-tativo"));
        tr.appendChild(mkCell(r.FIN_NOW,    "col-finnow"));
        tr.appendChild(mkCell(r.FIN_PLAN,   "col-finplan"));
        tr.appendChild(mkCell(r.total_fin,  "col-tfin"));
        tr.appendChild(mkCell(r.grand_total,"col-grand"));
        tbody.appendChild(tr);
    });

    // Totals row
    const tr = document.createElement("tr");
    tr.className = "totals";
    tr.innerHTML = `<td>TOTAL</td>`;
    tr.appendChild(mkCell(totals.NOW,        "col-now"));
    tr.appendChild(mkCell(totals.PLAN,       "col-plan"));
    tr.appendChild(mkCell(totals.DELEGAR,    "col-delegar"));
    tr.appendChild(mkCell(totals.BACKLOG,    "col-backlog"));
    tr.appendChild(mkCell(totals.total_ativo,"col-tativo"));
    tr.appendChild(mkCell(totals.FIN_NOW,    "col-finnow"));
    tr.appendChild(mkCell(totals.FIN_PLAN,   "col-finplan"));
    tr.appendChild(mkCell(totals.total_fin,  "col-tfin"));
    tr.appendChild(mkCell(totals.grand_total,"col-grand"));
    tbody.appendChild(tr);
}

function renderResumoChart({ rows }, filter = "all") {
    const filteredRows = filter === "all" ? rows : rows.filter(r => r.dev === filter);
    const devs    = filteredRows.map(r => r.dev);
    const ACTIVE  = ["NOW", "PLAN", "DELEGAR", "BACKLOG"];
    const colors  = { NOW: "#E57300", PLAN: "#1565C0", DELEGAR: "#F59E0B", BACKLOG: "#546E7A" };
    const labels  = { NOW: "Urgente Now", PLAN: "Não Urgente Plan", DELEGAR: "Delegar", BACKLOG: "Backlog" };

    const datasets = ACTIVE.map(q => ({
        label:           labels[q],
        data:            filteredRows.map(r => r[q]),
        backgroundColor: colors[q] + "CC",
        borderColor:     colors[q],
        borderWidth:     1.5,
        borderRadius:    4,
        borderSkipped:   false,
    }));

    if (chart) chart.destroy();
    const ctx = document.getElementById("resumo-chart").getContext("2d");
    chart = new Chart(ctx, {
        type: "bar",
        data: { labels: devs, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top", labels: { padding: 18, usePointStyle: true } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}` } },
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "#f0f0f0" } },
            },
        },
    });
}

// ── TASK TABS ─────────────────────────────────────────────────────────────────
async function loadTaskTab(container, quadrant) {
    const tasks = await api.get(`/api/tasks?quadrant=${quadrant}`);
    renderTaskTab(container, quadrant, tasks);
}

function renderTaskTab(container, quadrant, tasks) {
    const q      = Q[quadrant];
    const tabKey = Object.keys(TAB_QUADRANT).find(k => TAB_QUADRANT[k] === quadrant);

    container.innerHTML = `
        <div class="card">
            <div class="task-tab-header">
                <div>
                    <p class="section-title">${escHtml(q.label)}</p>
                    <p class="section-sub">
                        ${quadrant.startsWith("FIN") ? "Tarefas finalizadas" : "Tarefas ativas"}
                        &nbsp;·&nbsp; ${tasks.length} item${tasks.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <button type="button" class="btn-add" data-quadrant="${quadrant}">
                    + Adicionar Tarefa
                </button>
            </div>
            <div class="task-table-wrap">
                <table class="task-table ${q.cls}">
                    <thead>
                        <tr>
                            <th class="col-w-code">#</th>
                            <th class="col-w-resp">Responsável</th>
                            <th>Descrição</th>
                            <th class="col-w-deadline">Prazo</th>
                            <th class="col-w-status">Status</th>
                            <th class="col-w-quadrant">Quadrante</th>
                            <th class="col-w-actions">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-${tabKey}">
                        ${tasks.length === 0 ? buildEmptyRow() : tasks.map(buildTaskRow).join("")}
                    </tbody>
                </table>
            </div>
        </div>`;

    // Add button
    container.querySelector(".btn-add").addEventListener("click", () => {
        openModal(null, quadrant);
    });

    // Row actions (edit / delete)
    container.querySelector(`#tbody-${tabKey}`).addEventListener("click", async e => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === "edit") {
            const task = tasks.find(t => t.id === id);
            if (task) openModal(task);
        } else if (btn.dataset.action === "delete") {
            if (!confirm("Remover esta tarefa?")) return;
            await api.del(`/api/tasks/${id}`);
            loadTaskTab(container, quadrant);
            if (document.getElementById("tab-resumo").classList.contains("active")) loadResumo();
        }
    });
}

function buildTaskRow(t) {
    const statusCls = { "Ativo": "ativo", "Finalizado": "finalizado", "Em Andamento": "andamento" }[t.status] ?? "ativo";
    const qLabel    = Q[t.quadrant]?.label ?? t.quadrant;
    return `
        <tr>
            <td><span class="code-badge">${t.code}</span></td>
            <td>${escHtml(t.responsible)}</td>
            <td>${escHtml(t.desc)}</td>
            <td>${t.deadline ? `<span class="deadline-chip">${escHtml(t.deadline)}</span>` : "—"}</td>
            <td><span class="status-chip ${statusCls}">${escHtml(t.status)}</span></td>
            <td class="col-quadrant-label">${escHtml(qLabel)}</td>
            <td>
                <button type="button" class="btn-icon edit"   data-action="edit"   data-id="${t.id}" title="Editar">✏️</button>
                <button type="button" class="btn-icon delete" data-action="delete" data-id="${t.id}" title="Remover">🗑️</button>
            </td>
        </tr>`;
}

function buildEmptyRow() {
    return `<tr class="empty-row"><td colspan="7">Nenhuma tarefa neste quadrante.</td></tr>`;
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
const modal = document.getElementById("task-modal");

function openModal(task, defaultQuadrant) {
    editing = task ? task.id : null;

    document.getElementById("modal-title").textContent = task ? "Editar Tarefa" : "Adicionar Tarefa";
    document.getElementById("modal-task-id").value  = task ? task.id       : "";
    document.getElementById("modal-code").value     = task ? task.code     : "";
    document.getElementById("modal-desc").value     = task ? task.desc     : "";
    document.getElementById("modal-deadline").value = task ? task.deadline : "";

    // Responsible dropdown
    const selResp = document.getElementById("modal-responsible");
    selResp.innerHTML = team.map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join("");
    if (task) selResp.value = task.responsible;

    // Quadrant
    const selQ = document.getElementById("modal-quadrant");
    selQ.value = task ? task.quadrant : (defaultQuadrant ?? "NOW");

    // Status
    const selStatus = document.getElementById("modal-status");
    selStatus.value = task ? task.status : "Ativo";

    modal.showModal();
}

function closeModal() { modal.close(); }

document.getElementById("modal-close-btn").addEventListener("click",  closeModal);
document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);

document.getElementById("modal-save-btn").addEventListener("click", async () => {
    const task = {
        code:        Number(document.getElementById("modal-code").value) || 0,
        responsible: document.getElementById("modal-responsible").value,
        desc:        document.getElementById("modal-desc").value.trim(),
        deadline:    document.getElementById("modal-deadline").value.trim(),
        status:      document.getElementById("modal-status").value,
        quadrant:    document.getElementById("modal-quadrant").value,
    };

    if (!task.desc) { alert("A descrição é obrigatória."); return; }

    if (editing !== null) {
        await api.put(`/api/tasks/${editing}`, task);
    } else {
        await api.post("/api/tasks", task);
    }

    closeModal();
    refreshCurrentTab(task.quadrant);
    if (document.getElementById("tab-resumo").classList.contains("active")) loadResumo();
});

function refreshCurrentTab(quadrant) {
    const tabKey    = Object.keys(TAB_QUADRANT).find(k => TAB_QUADRANT[k] === quadrant);
    if (!tabKey) return;
    const container = document.getElementById(`tab-${tabKey}`);
    if (container && container.classList.contains("active")) {
        loadTaskTab(container, quadrant);
    }
}

// Close on backdrop click
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

// ── Utilities ─────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function init() {
    team = await api.get("/api/team");

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    document.getElementById("chart-dev-filter").addEventListener("change", async () => {
        const data   = await api.get("/api/summary");
        const filter = document.getElementById("chart-dev-filter").value;
        renderResumoChart(data, filter);
    });

    switchTab("resumo");
}

init();
