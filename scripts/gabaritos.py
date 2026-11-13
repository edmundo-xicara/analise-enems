"""Lê os PDFs de gabarito oficiais do INEP (caderno azul) e gera dados/gabaritos.json."""
import json
import re
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / "ENEMs" / "gabaritos"


def ler(pdf: Path) -> dict[str, str]:
    """Pareia cada número de questão com a resposta à direita, na mesma linha.
    "anulada" ou "*" viram "X". A versão em espanhol das questões de língua estrangeira
    fica na chave "N-esp"."""
    resp = {}
    for pagina in pymupdf.open(pdf):
        palavras = pagina.get_text("words")
        for x0, y0, x1, y1, txt, *_ in palavras:
            if not (re.fullmatch(r"\d{1,3}", txt) and 1 <= int(txt) <= 180):
                continue
            vizinhas = sorted((w for w in palavras if abs((w[1] + w[3]) / 2 - (y0 + y1) / 2) < 5
                               and x1 < w[0] < x1 + 170), key=lambda w: w[0])
            letras = []
            for w in vizinhas:
                v = w[4].upper()
                if re.fullmatch(r"\d{1,3}", v):  # chegou na coluna da próxima questão
                    break
                if re.fullmatch(r"[A-E]", v) or v.startswith("ANULAD") or v == "*":
                    letras.append(v if len(v) == 1 and v != "*" else "X")
            if letras:
                resp.setdefault(txt, letras[0])
                # questões 1–5 (91–95 em 2015–2016) têm uma coluna para inglês e outra para espanhol
                if len(letras) > 1 and (int(txt) - 1) % 90 < 5:
                    resp.setdefault(f"{txt}-esp", letras[1])
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
