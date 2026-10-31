"""Junta a análise manual (2015–2022) com a continuação assistida por IA (2023–2025)
e gera os arquivos abertos em dados/ e os JSON usados pelo site.

Uso:  python scripts/build_data.py
"""
import csv
import json
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
DADOS = RAIZ / "dados"
SITE = RAIZ / "site" / "data"

COLUNAS = {
    "Ano": "ano", "Questão": "questao", "Disciplina": "disciplina", "Matéria": "materia",
    "Assuntos": "assuntos", "Brasil": "brasil", "Abordagem": "abordagem",
    "Fonte": "fonte", "Tipo de Fonte": "tipo_fonte",
}


def limpar(df: pd.DataFrame, metodo: str) -> pd.DataFrame:
    df = df.rename(columns=COLUNAS)[list(COLUNAS.values())].copy()
    for c in ["disciplina", "materia", "assuntos", "abordagem", "fonte", "tipo_fonte"]:
        df[c] = df[c].fillna("").astype(str).str.strip()
    df["materia"] = df["materia"].replace({"Idade antiga": "Idade Antiga"})
    df["brasil"] = df["brasil"].astype(str).str.strip().str.lower().eq("s")
    df["metodo"] = metodo
    return df


def separar(texto: str) -> list[str]:
    return [p.strip() for p in texto.split(",") if p.strip()]


def main() -> None:
    manual = pd.read_excel(DADOS / "originais" / "Tabela Completa.xlsx", index_col=0)
    manual = limpar(manual[manual["Ano"].between(2015, 2022)], "manual")

    ia = []
    for arq in sorted((DADOS / "anotacoes").glob("*.csv")):
        df = pd.read_csv(arq)
        df["Ano"] = int(arq.stem)
        ia.append(limpar(df, "ia"))

    questoes = pd.concat([manual, *ia]).sort_values(["ano", "questao"]).reset_index(drop=True)
    questoes.to_csv(DADOS / "questoes.csv", index=False, quoting=csv.QUOTE_NONNUMERIC)

    resumo = pd.read_csv(DADOS / "resumo_2009_2014_powerbi.csv")
    anual = []
    for r in resumo.itertuples():
        anual.append({
            "ano": r.ano, "fonte": "powerbi",
            "disciplinas": {"História": r.historia, "Geografia": r.geografia,
                            "Filosofia": r.filosofia, "Sociologia": r.sociologia},
            "brasil": r.brasil_sim, "total": r.brasil_sim + r.brasil_nao,
        })
    for ano, g in questoes.groupby("ano"):
        anual.append({
            "ano": int(ano), "fonte": g["metodo"].iloc[0],
            "disciplinas": g["disciplina"].value_counts().to_dict(),
            "brasil": int(g["brasil"].sum()), "total": len(g),
        })

    registros = []
    for q in questoes.itertuples():
        registros.append({
            "ano": int(q.ano), "q": int(q.questao), "disciplina": q.disciplina,
            "materia": q.materia, "assuntos": separar(q.assuntos), "brasil": bool(q.brasil),
            "abordagem": q.abordagem, "fonte": q.fonte, "tipos": separar(q.tipo_fonte),
            "metodo": q.metodo,
        })

    SITE.mkdir(parents=True, exist_ok=True)
    (SITE / "questoes.json").write_text(json.dumps(registros, ensure_ascii=False), encoding="utf-8")
    (SITE / "anual.json").write_text(json.dumps(anual, ensure_ascii=False), encoding="utf-8")
    print(f"{len(registros)} questões ({questoes['ano'].min()}–{questoes['ano'].max()}), {len(anual)} anos no resumo")


if __name__ == "__main__":
    main()
