import json
import os
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
DATA_FILE = os.path.join(os.path.dirname(__file__), "tasks.json")

INITIAL_TEAM = [
    "Bruno", "Danilo", "Daniel (AjeSoft)", "Joary", "José Cavalcante",
    "Kaliary", "Sophia", "Vanessa", "Renan (Externo)", "Guilherme"
]

INITIAL_TASKS = [
    # ── URGENTE NOW ──────────────────────────────────────────────────────
    {"id":  1, "code":  2, "responsible": "Bruno",            "desc": "Migrar Python 3.x",                                                              "deadline": "30/06",           "status": "Ativo", "quadrant": "NOW"},
    {"id":  2, "code":  3, "responsible": "Danilo",           "desc": "Integrar Dados Públicos - Sismo (inicio: 19/02)",                                 "deadline": "",                "status": "Ativo", "quadrant": "NOW"},
    {"id":  3, "code":  7, "responsible": "Vanessa",          "desc": "DeepBlue - Visibilidade (Forcast finalizado, NowCast em andamento) - TRSP",       "deadline": "Em andamento",    "status": "Ativo", "quadrant": "NOW"},
    {"id":  4, "code": 10, "responsible": "Sophia",           "desc": "Alarmes unificados (fase de Validação)",                                          "deadline": "",                "status": "Ativo", "quadrant": "NOW"},
    {"id":  5, "code": 11, "responsible": "Daniel (AjeSoft)", "desc": "Projeto Medição Boia Santarém (ES) - Ajesoft",                                    "deadline": "",                "status": "Ativo", "quadrant": "NOW"},
    {"id":  6, "code": 15, "responsible": "Bruno",            "desc": "Desativação de Estação (Tracker Tubarão) — não está desativando alertas",         "deadline": "",                "status": "Ativo", "quadrant": "NOW"},
    {"id":  7, "code": 17, "responsible": "Kaliary",          "desc": "Cálculo SLA (HM-3884) para relatório automatizado",                               "deadline": "Início 13/04",    "status": "Ativo", "quadrant": "NOW"},
    {"id":  8, "code": 21, "responsible": "Sophia",           "desc": "Alerta estação fora do Ar (6hs — e-mail e WhatsApp)",                             "deadline": "",                "status": "Ativo", "quadrant": "NOW"},
    {"id":  9, "code": 23, "responsible": "Kaliary",          "desc": "VIEWS - Dry run e Classificação dos dados — Ocultar inválidos",                   "deadline": "15/04",           "status": "Ativo", "quadrant": "NOW"},
    {"id": 10, "code": 24, "responsible": "José Cavalcante",  "desc": "Modelagem - CPEA Seeds 2.0 - Navio incluído (2026) - Hidrodinâmica",              "deadline": "",                "status": "Ativo", "quadrant": "NOW"},
    {"id": 11, "code": 26, "responsible": "Joary",            "desc": "THunder - Processamento pelo Gateway",                                            "deadline": "",                "status": "Ativo", "quadrant": "NOW"},
    # ── NÃO URGENTE — PLAN ───────────────────────────────────────────────
    {"id": 12, "code":  3, "responsible": "Sophia",           "desc": "Módulo Agenda Retomar - Escopo",                                                  "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 13, "code":  6, "responsible": "Vanessa",          "desc": "Relacionamento Modelos DeepBlue x Est. Sismo",                                    "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 14, "code":  7, "responsible": "Kaliary",          "desc": "Restrição de acesso de usuário por período e parâmetro",                          "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 15, "code":  8, "responsible": "Vanessa",          "desc": "SismoDQ - Classificação de qualidade dos dados — após TRSP",                      "deadline": "2ª quinzena maio","status": "Ativo", "quadrant": "PLAN"},
    {"id": 16, "code":  9, "responsible": "José Cavalcante",  "desc": "SismoDQ - QARTOD (Horário dado pelo gateway e teste de vizinhança)",               "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 17, "code": 10, "responsible": "Bruno",            "desc": "Integrar alarme do VIEWS (Sismo e DeepBlue) com WhatsApp",                        "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 18, "code": 12, "responsible": "Kaliary",          "desc": "Monitorar volumetria de dado conforme processamento",                              "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 19, "code": 13, "responsible": "José Cavalcante",  "desc": "Flag dados retroativos Loggernet",                                                 "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 20, "code": 14, "responsible": "Joary",            "desc": "Thunder deslocamento de raio",                                                    "deadline": "Prev. 04/05",     "status": "Ativo", "quadrant": "PLAN"},
    {"id": 21, "code": 17, "responsible": "Kaliary",          "desc": "VIEWS - Logs de acesso pelo Aplicativo",                                           "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 22, "code": 20, "responsible": "Vanessa",          "desc": "DeepBlue Melhoria previsão de Vento (Celba, HBSA e TGPM)",                        "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 23, "code": 22, "responsible": "Vanessa",          "desc": "SISMODQ - Unificação dos dados das estações MAREN e MARES",                       "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    {"id": 24, "code": 23, "responsible": "Joary",            "desc": "Termo de uso Views e APP — aceite e gravar no banco",                             "deadline": "",                "status": "Ativo", "quadrant": "PLAN"},
    # ── DELEGAR ──────────────────────────────────────────────────────────
    {"id": 25, "code":  1, "responsible": "Vanessa",          "desc": "SISMOBLUE - Retomar planejamento",                                                 "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 26, "code":  2, "responsible": "Sophia",           "desc": "VIEWS - Export - Melhoria Permissão/Liberação",                                   "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 27, "code":  3, "responsible": "Sophia",           "desc": "Padronização tela de busca do VIEWS",                                              "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 28, "code":  4, "responsible": "Bruno",            "desc": "Atualização RDS MySql",                                                            "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 29, "code":  5, "responsible": "Kaliary",          "desc": "Tracker - melhoria boletim utilizar mapa VIEWS",                                   "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 30, "code":  6, "responsible": "Sophia",           "desc": "VIEWS - Melhoria Menus/SubMenus",                                                  "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 31, "code":  7, "responsible": "Kaliary",          "desc": "Export - Excluir após 30 dias",                                                    "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 32, "code":  8, "responsible": "Kaliary",          "desc": "Melhoria do fluxo de exclusão de parâmetros",                                      "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    {"id": 33, "code":  9, "responsible": "Sophia",           "desc": "Melhoria do fluxo de liberação de parâmetros e export (escopo aprovado 11/02)",   "deadline": "",                "status": "Ativo", "quadrant": "DELEGAR"},
    # ── BACKLOG ───────────────────────────────────────────────────────────
    {"id": 34, "code":  1, "responsible": "Kaliary",          "desc": "VIEWS - Outras melhorias dos logs",                                                "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 35, "code":  2, "responsible": "Sophia",           "desc": "Thunder tela atualiza e o usuário perde a configuração (Chamado 434 VIEWS)",       "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 36, "code":  3, "responsible": "Sophia",           "desc": "Cadastro Token API não consigo liberar somente Spec (Chamado 421 VIEWS)",          "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 37, "code":  4, "responsible": "Sophia",           "desc": "Cadastro de Estação permitir anexo (imagem)",                                      "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 38, "code":  5, "responsible": "Sophia",           "desc": "Área de Administração HM - mensagem para cliente (ex estão fora do ar)",           "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 39, "code":  6, "responsible": "Sophia",           "desc": "Ordenar Dashboard",                                                                "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 40, "code":  7, "responsible": "José Cavalcante",  "desc": "SismoDQ - QARTOD um teste para cada parâmetro",                                    "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 41, "code":  8, "responsible": "Bruno",            "desc": "Migrar - Monitor VIEWS",                                                           "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 42, "code":  9, "responsible": "Bruno",            "desc": "Migrar - Gateway VIEWS",                                                           "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 43, "code": 10, "responsible": "Danilo",           "desc": "Automatizar Relatórios DeepBlue",                                                  "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 44, "code": 11, "responsible": "Sophia",           "desc": "Gestão de Token (quem liberou?)",                                                  "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 45, "code": 12, "responsible": "Sophia",           "desc": "VIEWS - requisições incluir anexos",                                               "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 46, "code": 13, "responsible": "Vanessa",          "desc": "Reunião em cima da hora (AUREN - Monitoramento de Bacias)",                        "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 47, "code": 14, "responsible": "Vanessa",          "desc": "Projeto HMNimbus - a entender ????",                                               "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 48, "code": 15, "responsible": "Vanessa",          "desc": "Projeto Norsul - Tráfego de Navegação Marítima (Estimativa de Horas)",             "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 49, "code": 16, "responsible": "Joary",            "desc": "Integrar VIEWS x AD e analisar fator MFA - Solicitação Cliente",                  "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    {"id": 50, "code": 17, "responsible": "Joary",            "desc": "Thunder - Alertas de Raios próximo às Zonas criadas — notificações whatsapp",      "deadline": "",                "status": "Ativo", "quadrant": "BACKLOG"},
    # ── FINALIZADOS NOW ───────────────────────────────────────────────────
    {"id": 51, "code":  1, "responsible": "Bruno",            "desc": "Automatização Boletim - UBU - P - 21/01 E.0 09/02",                               "deadline": "09/02",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 52, "code":  4, "responsible": "Danilo",           "desc": "DeepBlue Mapa de Chuva (radar) - TRSP",                                            "deadline": "",                "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 53, "code":  5, "responsible": "Sophia",           "desc": "Dashboard - Série temporal cruzar dados",                                          "deadline": "",                "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 54, "code":  6, "responsible": "Bruno",            "desc": "Ajustes integração AIS (se houver) - avaliar sem timestamp",                       "deadline": "",                "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 55, "code":  7, "responsible": "Vanessa",          "desc": "DeepBlue - Visibilidade (Forcast finalizado 19/02) - TRSP",                        "deadline": "19/02",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 56, "code":  8, "responsible": "José Cavalcante",  "desc": "Modelagem - Senner 2.0 (sem estaca ponte) Finalizado 05/03",                       "deadline": "05/03",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 57, "code":  9, "responsible": "José Cavalcante",  "desc": "Modelagem - CAMEngenharia (Ecotecnos) - Acompanhamento Zé (finalizado 18/03)",     "deadline": "18/03",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 58, "code": 12, "responsible": "Vanessa",          "desc": "DeepBlue - Desenvolvimento novo modelo de ondas Tapajos - NowCast",               "deadline": "10/02",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 59, "code": 13, "responsible": "Joary",            "desc": "Thunder - Totalizador de Raios por Município (sol Gabriel)",                       "deadline": "",                "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 60, "code": 14, "responsible": "Renan (Externo)",  "desc": "Modelagem - CPEA Rio Sandi e Diana (Renan) 20/02",                                 "deadline": "20/02",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 61, "code": 16, "responsible": "José Cavalcante",  "desc": "DeepBlue - Melhoria previsão de vento (PSE) - Prioridade renovação",               "deadline": "",                "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 62, "code": 18, "responsible": "Joary",            "desc": "Integração Saniarto (Protocolo MQTT) - Prazo 14/03",                               "deadline": "14/03",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 63, "code": 19, "responsible": "Kaliary",          "desc": "Estação loggernet - redundante modem físico",                                       "deadline": "",                "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 64, "code": 20, "responsible": "José Cavalcante",  "desc": "DeepBlue - Santarém (vento - entrega 13/03, corrente e onda) - Zé",                "deadline": "13/03",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 65, "code": 22, "responsible": "Vanessa",          "desc": "DeepBlue - NowCast de Vento - TRSP - finalizado 14/04",                            "deadline": "14/04",           "status": "Finalizado", "quadrant": "FIN_NOW"},
    {"id": 66, "code": 25, "responsible": "Danilo",           "desc": "Preenchimento gaps Petrobras - Dados harmônico (TRAMANDAI-TRAMARE) Entrega 30/04/26","deadline": "30/04/26",        "status": "Finalizado", "quadrant": "FIN_NOW"},
    # ── FINALIZADOS PLAN ─────────────────────────────────────────────────
    {"id": 67, "code":  1, "responsible": "Danilo",           "desc": "Port-Information",                                                                 "deadline": "",                "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 68, "code":  2, "responsible": "Danilo",           "desc": "DeepBlue Mapa de Chuva (radar) - HBSA e TGPM",                                     "deadline": "",                "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 69, "code":  4, "responsible": "Kaliary",          "desc": "Aplicativo Mobile (VIEWS)",                                                        "deadline": "",                "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 70, "code":  5, "responsible": "Kaliary",          "desc": "Desenvolvimento Pág Cliente Porto Suape (entregue 11/02 Cliente)",                 "deadline": "11/02",           "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 71, "code": 11, "responsible": "Kaliary",          "desc": "Export de precipitação total acumulado diário (Cliente TIG)",                      "deadline": "",                "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 72, "code": 15, "responsible": "Joary",            "desc": "Thunder processamento",                                                             "deadline": "",                "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 73, "code": 16, "responsible": "Joary",            "desc": "Thunder Zonas Virtuais",                                                           "deadline": "",                "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 74, "code": 19, "responsible": "Joary",            "desc": "RGPilots - Novo desenvolvimento (FTP) - Desen. cancelado (cliente adquiriu datalogger)","deadline": "",           "status": "Finalizado", "quadrant": "FIN_PLAN"},
    {"id": 75, "code": 21, "responsible": "Joary",            "desc": "Thunder modo polígonos",                                                            "deadline": "",                "status": "Finalizado", "quadrant": "FIN_PLAN"},
]


def load_data():
    if not os.path.exists(DATA_FILE):
        data = {"team": INITIAL_TEAM, "next_id": 76, "tasks": INITIAL_TASKS}
        save_data(data)
        return data
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/team", methods=["GET"])
def get_team():
    return jsonify(load_data()["team"])


@app.route("/api/team", methods=["POST"])
def add_team_member():
    data = load_data()
    name = (request.json or {}).get("name", "").strip()
    if name and name not in data["team"]:
        data["team"].append(name)
        save_data(data)
    return jsonify(data["team"])


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
    # Only show internal team in summary table (exclude external/empty slots)
    EXCLUDE = {"Renan (Externo)", "Guilherme"}
    rows = {}
    for dev in data["team"]:
        if dev not in EXCLUDE:
            rows[dev] = {"NOW": 0, "PLAN": 0, "DELEGAR": 0, "BACKLOG": 0, "FIN_NOW": 0, "FIN_PLAN": 0}

    for t in data["tasks"]:
        dev = t["responsible"]
        q = t["quadrant"]
        if dev in rows and q in rows[dev]:
            rows[dev][q] += 1

    result, totals = [], {"NOW": 0, "PLAN": 0, "DELEGAR": 0, "BACKLOG": 0, "FIN_NOW": 0, "FIN_PLAN": 0}
    for dev, c in rows.items():
        active = c["NOW"] + c["PLAN"] + c["DELEGAR"] + c["BACKLOG"]
        fin    = c["FIN_NOW"] + c["FIN_PLAN"]
        if active + fin == 0:
            continue
        result.append({
            "dev": dev, **c,
            "total_ativo": active, "total_fin": fin, "grand_total": active + fin
        })
        for k in totals:
            totals[k] += c[k]

    total_ativo = sum(totals[k] for k in ["NOW", "PLAN", "DELEGAR", "BACKLOG"])
    total_fin   = totals["FIN_NOW"] + totals["FIN_PLAN"]
    return jsonify({
        "rows": result,
        "totals": {**totals, "total_ativo": total_ativo, "total_fin": total_fin, "grand_total": total_ativo + total_fin}
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
