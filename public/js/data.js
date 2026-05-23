// ── Categorias de tarefa ──────────────────────────────────────────────────────
const TASK_CATEGORIES = [
    "SGS — 1º Acesso",
    "Chamado SGS",
    "Chamado Jira",
    "Atendimento Interno",
    "Onboarding de Colaborador",
    "Offboarding de Colaborador",
    "Manutenção de Equipamentos",
    "Desenvolvimento",
    "Documentação / Manuais",
    "Outros",
];

// ── Dados iniciais ────────────────────────────────────────────────────────────
const INITIAL_TASKS = [
    // ── URGENTE NOW ──────────────────────────────────────────────────────────
    {id:1, code:1, category:"SGS — 1º Acesso",          desc:"Responder solicitação de 1º acesso — usuário novo portal SGS",        chamado:"",                    deadline:"Hoje",  status:"Em Andamento", quadrant:"NOW"},
    {id:2, code:2, category:"Chamado SGS",               desc:"Abrir chamado SGS — falha no sistema de monitoramento",                chamado:"sgsservicedesk@sgs.com", deadline:"",    status:"Ativo",        quadrant:"NOW"},
    {id:3, code:3, category:"Atendimento Interno",       desc:"Suporte urgente a usuário interno — reset de senha",                   chamado:"",                    deadline:"Hoje",  status:"Em Andamento", quadrant:"NOW"},
    // ── NÃO URGENTE — PLAN ───────────────────────────────────────────────────
    {id:4, code:1, category:"Documentação / Manuais",    desc:"Formatar manual de acesso ao sistema VIEWS",                           chamado:"",                    deadline:"30/05", status:"Ativo",        quadrant:"PLAN"},
    {id:5, code:2, category:"Desenvolvimento",           desc:"Melhorias no painel de controle interno",                              chamado:"",                    deadline:"",      status:"Ativo",        quadrant:"PLAN"},
    {id:6, code:3, category:"Onboarding de Colaborador", desc:"Preparar ambiente, e-mails e acessos para novo colaborador",           chamado:"",                    deadline:"10/06", status:"Ativo",        quadrant:"PLAN"},
    // ── DELEGAR ──────────────────────────────────────────────────────────────
    {id:7, code:1, category:"Chamado Jira",              desc:"Encaminhar chamado Jira para equipe de desenvolvimento",               chamado:"",                    deadline:"",      status:"Ativo",        quadrant:"DELEGAR"},
    // ── BACKLOG ───────────────────────────────────────────────────────────────
    {id:8, code:1, category:"Manutenção de Equipamentos",desc:"Levantamento do estado dos equipamentos internos — inventário",        chamado:"",                    deadline:"",      status:"Ativo",        quadrant:"BACKLOG"},
    {id:9, code:2, category:"Documentação / Manuais",    desc:"Atualizar manual de onboarding de colaboradores",                      chamado:"",                    deadline:"",      status:"Ativo",        quadrant:"BACKLOG"},
];

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_TASKS  = "hm_tasks_v2";
const STORAGE_NEXTID = "hm_next_id_v2";

function storageInit() {
    if (!localStorage.getItem(STORAGE_TASKS)) {
        localStorage.setItem(STORAGE_TASKS,  JSON.stringify(INITIAL_TASKS));
        localStorage.setItem(STORAGE_NEXTID, "10");
    }
}

function storageTasks()      { return JSON.parse(localStorage.getItem(STORAGE_TASKS)  || "[]"); }
function storageNextId()     { return Number(localStorage.getItem(STORAGE_NEXTID)     || "10"); }
function storageSaveTasks(t) { localStorage.setItem(STORAGE_TASKS,  JSON.stringify(t)); }
function storageNextIdBump() {
    const n = storageNextId();
    localStorage.setItem(STORAGE_NEXTID, String(n + 1));
    return n;
}

// ── Data API (espelha o Flask) ────────────────────────────────────────────────
function dbGetCategories() { return TASK_CATEGORIES; }

function dbGetTasks(quadrant) {
    const all = storageTasks();
    return quadrant ? all.filter(t => t.quadrant === quadrant) : all;
}

function dbCreate(task) {
    const tasks   = storageTasks();
    const newTask = { ...task, id: storageNextIdBump() };
    storageSaveTasks([...tasks, newTask]);
    return newTask;
}

function dbUpdate(id, updates) {
    const tasks = storageTasks();
    const idx   = tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    tasks[idx] = { ...tasks[idx], ...updates, id };
    storageSaveTasks(tasks);
    return tasks[idx];
}

function dbDelete(id) {
    storageSaveTasks(storageTasks().filter(t => t.id !== id));
}

function dbGetSummary() {
    const tasks = storageTasks();
    const QUADS = ["NOW", "PLAN", "DELEGAR", "BACKLOG", "FIN_NOW", "FIN_PLAN"];
    const rows  = {};

    for (const cat of TASK_CATEGORIES) {
        rows[cat] = Object.fromEntries(QUADS.map(q => [q, 0]));
    }
    for (const t of tasks) {
        const cat = t.category || "Outros";
        if (!rows[cat]) rows[cat] = Object.fromEntries(QUADS.map(q => [q, 0]));
        if (t.quadrant in rows[cat]) rows[cat][t.quadrant]++;
    }

    const result = [];
    const totals = Object.fromEntries(QUADS.map(q => [q, 0]));

    for (const [cat, c] of Object.entries(rows)) {
        const active = c.NOW + c.PLAN + c.DELEGAR + c.BACKLOG;
        const fin    = c.FIN_NOW + c.FIN_PLAN;
        if (active + fin === 0) continue;
        result.push({ cat, ...c, total_ativo: active, total_fin: fin, grand_total: active + fin });
        for (const k of QUADS) totals[k] += c[k];
    }

    const total_ativo = totals.NOW + totals.PLAN + totals.DELEGAR + totals.BACKLOG;
    const total_fin   = totals.FIN_NOW + totals.FIN_PLAN;
    return { rows: result, totals: { ...totals, total_ativo, total_fin, grand_total: total_ativo + total_fin } };
}
