import json
import os
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
DATA_FILE = os.path.join(os.path.dirname(__file__), "tasks.json")

TASK_CATEGORIES = [
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
]

INITIAL_TASKS = [
    # ── URGENTE NOW ──────────────────────────────────────────────────────────
    {"id": 1, "code": 1, "category": "SGS — 1º Acesso",           "desc": "Responder solicitação de 1º acesso — usuário novo portal SGS",       "chamado": "",                    "deadline": "Hoje",  "status": "Em Andamento", "quadrant": "NOW"},
    {"id": 2, "code": 2, "category": "Chamado SGS",               "desc": "Abrir chamado SGS — falha no sistema de monitoramento",               "chamado": "sgsservicedesk@sgs.com","deadline": "",      "status": "Ativo",        "quadrant": "NOW"},
    {"id": 3, "code": 3, "category": "Atendimento Interno",       "desc": "Suporte urgente a usuário interno — reset de senha",                  "chamado": "",                    "deadline": "Hoje",  "status": "Em Andamento", "quadrant": "NOW"},
    # ── NÃO URGENTE — PLAN ───────────────────────────────────────────────────
    {"id": 4, "code": 1, "category": "Documentação / Manuais",    "desc": "Formatar manual de acesso ao sistema VIEWS",                          "chamado": "",                    "deadline": "30/05", "status": "Ativo",        "quadrant": "PLAN"},
    {"id": 5, "code": 2, "category": "Desenvolvimento",           "desc": "Melhorias no painel de controle interno",                             "chamado": "",                    "deadline": "",      "status": "Ativo",        "quadrant": "PLAN"},
    {"id": 6, "code": 3, "category": "Onboarding de Colaborador", "desc": "Preparar ambiente, e-mails e acessos para novo colaborador",          "chamado": "",                    "deadline": "10/06", "status": "Ativo",        "quadrant": "PLAN"},
    # ── DELEGAR ──────────────────────────────────────────────────────────────
    {"id": 7, "code": 1, "category": "Chamado Jira",              "desc": "Encaminhar chamado Jira para equipe de desenvolvimento",              "chamado": "",                    "deadline": "",      "status": "Ativo",        "quadrant": "DELEGAR"},
    # ── BACKLOG ───────────────────────────────────────────────────────────────
    {"id": 8, "code": 1, "category": "Manutenção de Equipamentos","desc": "Levantamento do estado dos equipamentos internos — inventário",       "chamado": "",                    "deadline": "",      "status": "Ativo",        "quadrant": "BACKLOG"},
    {"id": 9, "code": 2, "category": "Documentação / Manuais",    "desc": "Atualizar manual de onboarding de colaboradores",                     "chamado": "",                    "deadline": "",      "status": "Ativo",        "quadrant": "BACKLOG"},
]


def load_data():
    if not os.path.exists(DATA_FILE):
        data = {"categories": TASK_CATEGORIES, "next_id": 10, "tasks": INITIAL_TASKS}
        save_data(data)
        return data
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Migrate old schema (team → categories) if needed
    if "team" in data and "categories" not in data:
        data = {"categories": TASK_CATEGORIES, "next_id": 10, "tasks": INITIAL_TASKS}
        save_data(data)
    return data


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/categories", methods=["GET"])
def get_categories():
    return jsonify(load_data()["categories"])


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    data = load_data()
    q = request.args.get("quadrant")
    tasks = data["tasks"]
    if q:
        tasks = [t for t in tasks if t["quadrant"] == q]
    return jsonify(sorted(tasks, key=lambda t: t["code"]))


@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = load_data()
    task = request.json
    task["id"] = data["next_id"]
    data["next_id"] += 1
    data["tasks"].append(task)
    save_data(data)
    return jsonify(task), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    data = load_data()
    for i, t in enumerate(data["tasks"]):
        if t["id"] == task_id:
            data["tasks"][i] = {**t, **request.json, "id": task_id}
            save_data(data)
            return jsonify(data["tasks"][i])
    return jsonify({"error": "Not found"}), 404


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    data = load_data()
    data["tasks"] = [t for t in data["tasks"] if t["id"] != task_id]
    save_data(data)
    return "", 204


@app.route("/api/summary", methods=["GET"])
def get_summary():
    data = load_data()
    QUADS = ["NOW", "PLAN", "DELEGAR", "BACKLOG", "FINALIZADO"]
    rows = {}
    for cat in data["categories"]:
        rows[cat] = {q: 0 for q in QUADS}

    for t in data["tasks"]:
        cat = t.get("category", "Outros")
        q   = t["quadrant"]
        # compatibilidade com dados antigos (FIN_NOW / FIN_PLAN → FINALIZADO)
        if q in ("FIN_NOW", "FIN_PLAN"):
            q = "FINALIZADO"
        if cat not in rows:
            rows[cat] = {q2: 0 for q2 in QUADS}
        if q in rows[cat]:
            rows[cat][q] += 1

    result, totals = [], {q: 0 for q in QUADS}
    for cat, c in rows.items():
        active = c["NOW"] + c["PLAN"] + c["DELEGAR"] + c["BACKLOG"]
        fin    = c["FINALIZADO"]
        if active + fin == 0:
            continue
        result.append({
            "cat": cat, **c,
            "total_ativo": active, "total_fin": fin, "grand_total": active + fin
        })
        for k in totals:
            totals[k] += c[k]

    total_ativo = sum(totals[k] for k in ["NOW", "PLAN", "DELEGAR", "BACKLOG"])
    return jsonify({
        "rows": result,
        "totals": {**totals, "total_ativo": total_ativo, "total_fin": totals["FINALIZADO"], "grand_total": total_ativo + totals["FINALIZADO"]}
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
