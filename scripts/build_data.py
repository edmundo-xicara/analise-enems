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


def limpar(df: pd.DataFrame, metodo: str, marcador: tuple[str, str] = ("Brasil", "brasil")) -> pd.DataFrame:
    """`marcador` é a coluna s/n da área: "Brasil" em Humanas, "Cálculo" em Exatas."""
    origem, destino = marcador
    colunas = {**COLUNAS, origem: destino}
    colunas.pop("Brasil") if origem != "Brasil" else None
    df = df.rename(columns=colunas)[list(colunas.values())].copy()
    for c in ["disciplina", "materia", "assuntos", "abordagem", "fonte", "tipo_fonte"]:
        df[c] = df[c].fillna("").astype(str).str.strip()
    df["materia"] = df["materia"].replace({"Idade antiga": "Idade Antiga"})
    df[destino] = df[destino].astype(str).str.strip().str.lower().eq("s")
    df["metodo"] = metodo
    return df


def gabarito() -> dict:
    """Resposta oficial do caderno azul por (ano, questão); "X" = anulada. Ver scripts/gabaritos.py."""
    arq = DADOS / "gabaritos.json"
    if not arq.exists():
        return {}
    return {(int(a), int(q)): r for a, qs in json.loads(arq.read_text()).items() for q, r in qs.items()}


GABARITO = gabarito()


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
            "metodo": q.metodo, "gab": GABARITO.get((int(q.ano), int(q.questao)), ""),
        })

    SITE.mkdir(parents=True, exist_ok=True)
    (SITE / "questoes.json").write_text(json.dumps(registros, ensure_ascii=False), encoding="utf-8")
    (SITE / "anual.json").write_text(json.dumps(anual, ensure_ascii=False), encoding="utf-8")
    print(f"{len(registros)} questões ({questoes['ano'].min()}–{questoes['ano'].max()}), {len(anual)} anos no resumo")

    exatas()


def exatas() -> None:
    """Matemática e Ciências da Natureza (2015–2025), classificadas com ajuda de IA."""
    frames = []
    for arq in sorted((DADOS / "anotacoes_exatas").glob("*.psv")):
        df = pd.read_csv(arq, sep="|", dtype=str, keep_default_na=False)
        df["Ano"] = int(arq.stem)
        df["Questão"] = df["Questão"].astype(int)
        frames.append(limpar(df, "ia", ("Cálculo", "calculo")))
    questoes = pd.concat(frames).sort_values(["ano", "questao"]).reset_index(drop=True)
    questoes.to_csv(DADOS / "questoes_exatas.csv", index=False, quoting=csv.QUOTE_NONNUMERIC)

    anual = [{
        "ano": int(ano), "fonte": "ia",
        "disciplinas": g["disciplina"].value_counts().to_dict(),
        "calculo": int(g["calculo"].sum()), "total": len(g),
    } for ano, g in questoes.groupby("ano")]
    registros = [{
        "ano": int(q.ano), "q": int(q.questao), "disciplina": q.disciplina,
        "materia": q.materia, "assuntos": separar(q.assuntos), "calculo": bool(q.calculo),
        "abordagem": q.abordagem, "fonte": q.fonte, "tipos": separar(q.tipo_fonte),
        "metodo": q.metodo, "gab": GABARITO.get((int(q.ano), int(q.questao)), ""),
    } for q in questoes.itertuples()]

    (SITE / "questoes_exatas.json").write_text(json.dumps(registros, ensure_ascii=False), encoding="utf-8")
    (SITE / "anual_exatas.json").write_text(json.dumps(anual, ensure_ascii=False), encoding="utf-8")
    print(f"Exatas: {len(registros)} questões")


if __name__ == "__main__":
    main()
