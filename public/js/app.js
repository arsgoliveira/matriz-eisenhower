// ── Config ───────────────────────────────────────────────────────────────────
const Q = {
    NOW:        { label:"Urgente — Now (Importante)",        cls:"q-now",     color:"#E57300" },
    PLAN:       { label:"Não Urgente — Plan (Importante)",   cls:"q-plan",    color:"#1565C0" },
    DELEGAR:    { label:"Delegar (Urgente + Não Importante)",cls:"q-delegar", color:"#F59E0B" },
    BACKLOG:    { label:"Backlog (Não Urgente + Não Imp.)",  cls:"q-backlog", color:"#546E7A" },
    FINALIZADO: { label:"Finalizados",                       cls:"q-fin",     color:"#2E7D32" },
};

const TAB_QUADRANT = {
    now:"NOW", plan:"PLAN", delegar:"DELEGAR",
    backlog:"BACKLOG", finalizado:"FINALIZADO",
};

const CAT_COLORS = {
    "SGS — 1º Acesso":            "#7B1FA2",
    "Chamado SGS":                "#D32F2F", // vermelho
    "Chamado Jira":               "#E65100", // laranja
    "Atendimento Interno":        "#0277BD",
    "Onboarding de Colaborador":  "#2E7D32",
    "Offboarding de Colaborador": "#880E4F",
    "Manutenção de Equipamentos": "#F9A825",
    "Desenvolvimento":            "#00695C",
    "Documentação / Manuais":     "#546E7A",
    "Outros":                     "#6D4C41",
};

const CAT_SHORT = {
    "SGS — 1º Acesso":            "SGS 1º Acesso",
    "Chamado SGS":                "Chamado SGS",
    "Chamado Jira":               "Chamado Jira",
    "Atendimento Interno":        "Atend. Interno",
    "Onboarding de Colaborador":  "Onboarding",
    "Offboarding de Colaborador": "Offboarding",
    "Manutenção de Equipamentos": "Manutenção",
    "Desenvolvimento":            "Desenvolvimento",
    "Documentação / Manuais":     "Documentação",
    "Outros":                     "Outros",
};

let chart   = null;
let editing = null;

// ── Tab navigation ────────────────────────────────────────────────────────────
function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    document.querySelector(`.tab-btn[data-tab="${tabName}"]`)?.classList.add("active");
    const content = document.getElementById(`tab-${tabName}`);
    content?.classList.add("active");

    if (tabName === "resumo") {
        loadResumo();
    } else {
        const q = TAB_QUADRANT[tabName];
        if (q && content) loadTaskTab(content, q);
    }
}

// ── RESUMO ────────────────────────────────────────────────────────────────────
function loadResumo() {
    const data = dbGetSummary();
    updateKpis(data.totals);
    renderSummaryTable(data);
    renderResumoChart(data);
}

function updateKpis(totals) {
    document.getElementById("kpi-now").textContent     = totals.NOW        ?? 0;
    document.getElementById("kpi-plan").textContent    = totals.PLAN       ?? 0;
    document.getElementById("kpi-delegar").textContent = totals.DELEGAR    ?? 0;
    document.getElementById("kpi-backlog").textContent = totals.BACKLOG    ?? 0;
    document.getElementById("kpi-fin").textContent     = totals.FINALIZADO ?? 0;
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
        const tr    = document.createElement("tr");
        const color = CAT_COLORS[r.cat] ?? "#555";
        tr.innerHTML = `<td><span class="cat-dot" style="background:${color}"></span>${escHtml(r.cat)}</td>`;
        tr.appendChild(mkCell(r.NOW,         "col-now"));
        tr.appendChild(mkCell(r.PLAN,        "col-plan"));
        tr.appendChild(mkCell(r.DELEGAR,     "col-delegar"));
        tr.appendChild(mkCell(r.BACKLOG,     "col-backlog"));
        tr.appendChild(mkCell(r.total_ativo, "col-tativo"));
        tr.appendChild(mkCell(r.FINALIZADO,  "col-tfin"));
        tr.appendChild(mkCell(r.grand_total, "col-grand"));
        tbody.appendChild(tr);
    });

    const tr = document.createElement("tr");
    tr.className = "totals";
    tr.innerHTML = `<td>TOTAL</td>`;
    tr.appendChild(mkCell(totals.NOW,         "col-now"));
    tr.appendChild(mkCell(totals.PLAN,        "col-plan"));
    tr.appendChild(mkCell(totals.DELEGAR,     "col-delegar"));
    tr.appendChild(mkCell(totals.BACKLOG,     "col-backlog"));
    tr.appendChild(mkCell(totals.total_ativo, "col-tativo"));
    tr.appendChild(mkCell(totals.FINALIZADO,  "col-tfin"));
    tr.appendChild(mkCell(totals.grand_total, "col-grand"));
    tbody.appendChild(tr);
}

function renderResumoChart({ rows }) {
    const active  = rows.filter(r => r.total_ativo > 0);
    const labels  = active.map(r => CAT_SHORT[r.cat] ?? r.cat);
    const ACTIVE  = ["NOW", "PLAN", "DELEGAR", "BACKLOG"];
    const colors  = { NOW:"#E57300", PLAN:"#1565C0", DELEGAR:"#F59E0B", BACKLOG:"#546E7A" };
    const labelsQ = { NOW:"Urgente Now", PLAN:"Não Urgente Plan", DELEGAR:"Delegar", BACKLOG:"Backlog" };

    const datasets = ACTIVE.map(q => ({
        label:           labelsQ[q],
        data:            active.map(r => r[q]),
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
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position:"top", labels:{ padding:18, usePointStyle:true } },
                tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}` } },
            },
            scales: {
                x: { grid:{ display:false }, ticks:{ maxRotation:30 } },
                y: { beginAtZero:true, ticks:{ stepSize:1 }, grid:{ color:"#f0f0f0" } },
            },
        },
    });
}

// ── TASK TABS ─────────────────────────────────────────────────────────────────
function loadTaskTab(container, quadrant) {
    const tasks = dbGetTasks(quadrant).sort((a, b) => a.code - b.code);
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
                <button type="button" class="btn-add" data-quadrant="${quadrant}">+ Adicionar Tarefa</button>
            </div>
            <div class="task-table-wrap">
                <table class="task-table ${q.cls}">
                    <thead>
                        <tr>
                            <th class="col-w-code">#</th>
                            <th class="col-w-cat">Tipo de Tarefa</th>
                            <th>Descrição</th>
                            <th class="col-w-chamado">Chamado</th>
                            <th class="col-w-deadline">Prazo</th>
                            <th class="col-w-status">Status</th>
                            <th class="col-w-actions">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-${tabKey}">
                        ${tasks.length === 0 ? buildEmptyRow() : tasks.map(buildTaskRow).join("")}
                    </tbody>
                </table>
            </div>
        </div>`;

    container.querySelector(".btn-add").addEventListener("click", () => openModal(null, quadrant));

    container.querySelector(`#tbody-${tabKey}`).addEventListener("click", e => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === "edit") {
            const task = dbGetTasks().find(t => t.id === id);
            if (task) openModal(task);
        } else if (btn.dataset.action === "delete") {
            if (!confirm("Remover esta tarefa?")) return;
            dbDelete(id);
            loadTaskTab(container, quadrant);
            if (document.getElementById("tab-resumo").classList.contains("active")) loadResumo();
        }
    });
}

function buildTaskRow(t) {
    const statusCls = { "Ativo":"ativo", "Finalizado":"finalizado", "Em Andamento":"andamento" }[t.status] ?? "ativo";
    const color = CAT_COLORS[t.category] ?? "#555";
    const chamadoHtml = t.chamado
        ? `<span class="chamado-chip">${escHtml(t.chamado)}</span>`
        : `<span class="chamado-empty">—</span>`;
    return `
        <tr>
            <td><span class="code-badge">${t.code}</span></td>
            <td><span class="cat-badge" style="border-left-color:${color}">${escHtml(t.category ?? "")}</span></td>
            <td>${escHtml(t.desc)}</td>
            <td>${chamadoHtml}</td>
            <td>${t.deadline ? `<span class="deadline-chip">${escHtml(t.deadline)}</span>` : "—"}</td>
            <td><span class="status-chip ${statusCls}">${escHtml(t.status)}</span></td>
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

    document.getElementById("modal-title").textContent  = task ? "Editar Tarefa" : "Adicionar Tarefa";
    document.getElementById("modal-task-id").value      = task ? task.id       : "";
    document.getElementById("modal-code").value         = task ? task.code     : "";
    document.getElementById("modal-desc").value         = task ? task.desc     : "";
    document.getElementById("modal-chamado").value      = task ? (task.chamado ?? "") : "";
    document.getElementById("modal-deadline").value     = task ? task.deadline : "";
    document.getElementById("modal-category").value    = task ? (task.category ?? "Outros") : "Outros";
    document.getElementById("modal-quadrant").value    = task ? task.quadrant : (defaultQuadrant ?? "NOW");
    document.getElementById("modal-status").value      = task ? task.status   : "Ativo";

    modal.showModal();
}

function closeModal() { modal.close(); }

document.getElementById("modal-close-btn").addEventListener("click",  closeModal);
document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

document.getElementById("modal-save-btn").addEventListener("click", () => {
    const task = {
        code:     Number(document.getElementById("modal-code").value) || 0,
        category: document.getElementById("modal-category").value,
        desc:     document.getElementById("modal-desc").value.trim(),
        chamado:  document.getElementById("modal-chamado").value.trim(),
        deadline: document.getElementById("modal-deadline").value.trim(),
        status:   document.getElementById("modal-status").value,
        quadrant: document.getElementById("modal-quadrant").value,
    };

    if (!task.desc) { alert("A descrição é obrigatória."); return; }

    // Ao finalizar, move para FINALIZADO; ao reativar, volta para NOW
    if (task.status === "Finalizado") {
        task.quadrant = "FINALIZADO";
    } else if (task.quadrant === "FINALIZADO") {
        task.quadrant = "NOW";
    }

    if (editing !== null) {
        dbUpdate(editing, task);
    } else {
        dbCreate(task);
    }

    closeModal();
    refreshCurrentTab(task.quadrant);
    if (document.getElementById("tab-resumo").classList.contains("active")) loadResumo();
});

function refreshCurrentTab(quadrant) {
    const tabKey    = Object.keys(TAB_QUADRANT).find(k => TAB_QUADRANT[k] === quadrant);
    if (!tabKey) return;
    const container = document.getElementById(`tab-${tabKey}`);
    if (container?.classList.contains("active")) loadTaskTab(container, quadrant);
}

// ── Util ──────────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str ?? "")
        .replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
storageInit();

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

switchTab("resumo");
