"""Lê os PDFs de gabarito oficiais do INEP (caderno azul) e gera dados/gabaritos.json."""
import json
import re
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "ENEMs" / "gabaritos"


def ler(pdf: Path) -> dict[int, str]:
    """Pareia cada número de questão com a resposta à direita, na mesma linha.
    "anulada" ou "*" viram "X"."""
    resp = {}
    for pagina in pymupdf.open(pdf):
        palavras = pagina.get_text("words")
        for x0, y0, x1, y1, txt, *_ in palavras:
            if not (re.fullmatch(r"\d{1,3}", txt) and 1 <= int(txt) <= 180):
                continue
            vizinhas = sorted((w for w in palavras if abs((w[1] + w[3]) / 2 - (y0 + y1) / 2) < 5
                               and x1 < w[0] < x1 + 110), key=lambda w: w[0])
            for w in vizinhas:
                v = w[4].upper()
                if re.fullmatch(r"[A-E]", v) or v.startswith("ANULAD") or v == "*":
                    resp.setdefault(int(txt), v if len(v) == 1 and v != "*" else "X")
                    break
    return resp


def main() -> None:
    gab = {}
    for ano in range(2015, 2026):
        d1, d2 = ler(PASTA / f"{ano}_D1.pdf"), ler(PASTA / f"{ano}_D2.pdf")
        gab[ano] = {**d1, **d2}
        print(ano, len(d1), len(d2), sum(v == "X" for v in gab[ano].values()), "anuladas")
    (RAIZ / "dados" / "gabaritos.json").write_text(json.dumps(gab, indent=0), encoding="utf-8")


if __name__ == "__main__":
    main()
