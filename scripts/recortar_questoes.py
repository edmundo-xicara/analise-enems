"""Recorta cada questão anotada dos cadernos oficiais do INEP (caderno azul) como imagem
WebP, para o simulado do site. Questões que continuam na outra coluna ou na página
seguinte viram uma imagem só, empilhando os pedaços.

Uso:  python scripts/recortar_questoes.py   (precisa dos PDFs em ENEMs/, ver README)
"""
import io
import json
import re
import time
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops

RAIZ = Path(__file__).resolve().parent.parent
ENEMS = RAIZ / "ENEMs"
SAIDA = RAIZ / "site" / "questoes"
RODAPE = re.compile(r"CADERNO|AZUL|ENEM\S*|\*\S+\*", re.I)
FOLGA = 1.5        # pt antes de cada "QUESTÃO NN": a alternativa E da anterior pode estar colada
ZOOM = 1.6          # ~115 dpi: legível no celular sem pesar demais
LARGURA_MAX = 760   # px


def pdf_da_questao(area: str, ano: int, q: int) -> Path:
    if area == "humanas":
        return ENEMS / f"{ano}.pdf"
    if q <= 90:  # Natureza no 1º dia (2015 e 2016)
        return ENEMS / f"{ano}.pdf"
    return ENEMS / "exatas" / f"{ano}_D2.pdf"


def cabecalhos(doc: pymupdf.Document) -> list[tuple[int, int, float, float]]:
    """(questão, página, x0, y0) de cada "QUESTÃO NN", em ordem de leitura."""
    achados = []
    for pn, pagina in enumerate(doc):
        palavras = pagina.get_text("words")
        for x0, y0, x1, y1, txt, *_ in palavras:
            if not re.fullmatch(r"QUEST[ÃA]O", txt, re.I):
                continue
            num = [w for w in palavras if abs(w[1] - y0) < 4 and x1 < w[0] < x1 + 40 and re.fullmatch(r"\d{1,3}", w[4])]
            if num:
                achados.append((int(num[0][4]), pn, x0, y0))
    return achados


class Layout:
    """Limites do corpo e das colunas de cada página."""

    def __init__(self, doc: pymupdf.Document, heads):
        self.doc = doc
        self.heads = heads
        # onde a coluna da direita começa de fato (em 2025 é um pouco antes do meio da página)
        w0 = doc[0].rect.width
        self.x_dir = min((x for _, _, x, _ in heads if x > w0 * 0.4), default=w0 / 2 + 9) - 4
        self.topo = min(y for _, _, _, y in heads) - 6
        self.duas_colunas = {}
        self.base = {}
        self.caixas = {}
        self.palavras = {}
        for pn, pagina in enumerate(doc):
            w, h = pagina.rect.width, pagina.rect.height
            meio = w / 2
            palavras = pagina.get_text("words")
            # rodapé: palavras típicas no fim da página ("CADERNO", "AZUL", logo "enem2021", código de barras)
            # texto vertical (a marca d'água "ENEM 2022" entre as colunas) não é rodapé nem corpo
            vertical = lambda p: (p[3] - p[1]) > 1.5 * (p[2] - p[0])
            rodape = [p for p in palavras if p[1] > h * 0.85 and RODAPE.fullmatch(p[4]) and not vertical(p)]
            pe = max((p[1] for p in rodape), default=h * 0.96)
            limite = min((p[1] for p in rodape if p[1] > pe - 25), default=pe) - 2
            corpo = [p for p in palavras if p[3] <= limite and not vertical(p)]
            self.palavras[pn] = corpo
            self.base[pn] = min(max((p[3] for p in corpo), default=limite) + 4, limite)
            tem_direita = any(p == pn and x > meio * 0.9 for _, p, x, _ in heads)
            atravessam = sum(1 for p in corpo if p[0] < meio - 25 and p[2] > meio + 25)
            self.duas_colunas[pn] = tem_direita or atravessam < 4
            imagens = [tuple(i["bbox"]) + ("<img>",) for i in pagina.get_image_info()]
            # trechos (spans), não linhas: o PyMuPDF às vezes junta numa "linha" textos das duas colunas
            linhas = [tuple(sp["bbox"]) + ("<linha>",) for bl in pagina.get_text("dict")["blocks"]
                      for l in bl.get("lines", []) for sp in l["spans"]
                      if sp["bbox"][1] < h * 0.93 and sp["text"].strip()]
            imagens = [i for i in imagens if i[2] - i[0] < w * 0.9]  # ignora fundos de página inteira
            self.caixas[pn] = linhas + imagens

    def sem_fatiar(self, pn: int, x0: float, x1: float, y: float) -> float:
        """Desce a linha de corte para baixo de qualquer linha de texto que ela atravessaria
        (a última linha de uma questão às vezes invade a altura do cabeçalho seguinte)."""
        coluna = [p for p in self.palavras[pn] if x0 <= p[0] <= x1]
        cortadas = [p[3] for p in coluna if p[1] + 1 < y < p[3] - 1]
        if not cortadas:
            return y
        abaixo = max(cortadas)
        # se as caixas da linha de cima e da de baixo se sobrepõem, corta no meio da sobreposição
        proxima = min((p[1] for p in coluna if y <= p[1] < abaixo), default=None)
        return (abaixo + proxima) / 2 if proxima is not None else abaixo + 0.5

    def largura_total(self, pn: int, y0: float, y1: float) -> bool:
        """Há texto ou figura atravessando o meio da página entre y0 e y1?"""
        meio = self.x_dir - 3
        linhas = figuras = 0
        for x0, a, x1, b, txt in self.caixas[pn]:
            folga = 40 if txt == "<img>" else 12
            if y0 <= (a + b) / 2 <= y1 and x0 < meio - folga and x1 > meio + folga:
                if txt == "<img>":
                    figuras += 1
                else:
                    linhas += 1
        return figuras >= 1 or linhas >= 1

    def colunas(self, pn: int) -> list[tuple[float, float]]:
        w = self.doc[pn].rect.width
        if self.duas_colunas[pn]:
            return [(18, self.x_dir - 6), (self.x_dir, w - 18)]
        return [(18, w - 18)]

    def coluna_de(self, pn: int, x: float) -> int:
        return 0 if (not self.duas_colunas[pn] or x < self.doc[pn].rect.width / 2 * 0.9) else 1


def recortes(layout: Layout, inicio, fim):
    """Lista de (página, retângulo) do cabeçalho `inicio` até o cabeçalho `fim` (exclusive).
    Trechos com texto ou figura em largura total usam a página inteira."""
    pn, col = inicio[1], layout.coluna_de(inicio[1], inicio[2])
    x0, x1 = layout.colunas(pn)[col]
    y = layout.sem_fatiar(pn, x0, x1, inicio[3] - FOLGA)
    pedacos = []
    for _ in range(6):  # uma questão nunca ocupa mais que algumas colunas
        x0, x1 = layout.colunas(pn)[col]
        fim_aqui = fim if (fim and fim[1] == pn and fim[3] > y) else None
        mesma_coluna = fim_aqui and layout.coluna_de(pn, fim_aqui[2]) == col
        y_fim = layout.sem_fatiar(pn, x0, x1, fim_aqui[3] - FOLGA) if mesma_coluna else layout.base[pn]
        y_fim_total = layout.sem_fatiar(pn, 18, layout.doc[pn].rect.width - 18, fim_aqui[3] - FOLGA) if fim_aqui else layout.base[pn]
        invade = any(h is not inicio and h[1] == pn and y + 8 < h[3] < y_fim_total for h in layout.heads)
        if y_fim_total - y > 40 and not invade and layout.largura_total(pn, y, y_fim):
            largura = layout.doc[pn].rect.width
            y_fim = y_fim_total
            pedacos.append((pn, pymupdf.Rect(18, y, largura - 18, y_fim)))
            if fim_aqui or fim is None or pn + 1 >= len(layout.doc):
                return pedacos
            pn, col, y = pn + 1, 0, layout.topo
            continue
        pedacos.append((pn, pymupdf.Rect(x0, y, x1, y_fim)))
        if fim is None:
            return pedacos + continuacao_da_ultima(layout, pn, col, pedacos[-1][1])
        if mesma_coluna:
            return pedacos
        col += 1
        if col >= len(layout.colunas(pn)):
            pn, col = pn + 1, 0
            if pn >= len(layout.doc):
                return pedacos
        y = layout.topo
    return pedacos


def continuacao_da_ultima(layout: Layout, pn: int, col: int, ret: pymupdf.Rect):
    """A última questão da prova não tem "próxima questão" para servir de limite. Se ela
    chega ao pé da coluna, segue o bloco de texto contínuo do topo da coluna seguinte."""
    palavras = layout.doc[pn].get_text("words")
    if max((w[3] for w in palavras if ret.x0 <= w[0] <= ret.x1 and ret.y0 <= w[1] <= ret.y1), default=0) < ret.y1 - 45:
        return []
    col += 1
    if col >= len(layout.colunas(pn)):
        pn, col = pn + 1, 0
        if pn >= len(layout.doc):
            return []
    x0, x1 = layout.colunas(pn)[col]
    linhas = sorted(w[1:4:2] for w in layout.doc[pn].get_text("words")
                    if x0 <= w[0] <= x1 and layout.topo - 4 <= w[1] <= layout.base[pn])
    if not linhas or linhas[0][0] - layout.topo > 60:
        return []
    fim_y = linhas[0][1]
    for y0, y1 in linhas[1:]:
        if y0 - fim_y > 28:  # um espaço grande separa o fim da questão do que vem depois
            break
        fim_y = max(fim_y, y1)
    return [(pn, pymupdf.Rect(x0, layout.topo, x1, fim_y + 6))]


def renderizar(doc, pedacos) -> Image.Image:
    imagens = []
    for pn, ret in pedacos:
        if ret.height < 12:
            continue
        pix = doc[pn].get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), clip=ret)
        imagens.append(Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB"))
    largura = max(i.width for i in imagens)
    final = Image.new("RGB", (largura, sum(i.height for i in imagens)), "white")
    y = 0
    for i in imagens:
        final.paste(i, (0, y))
        y += i.height
    final = aparar(final)
    if final.width > LARGURA_MAX:
        final = final.resize((LARGURA_MAX, round(final.height * LARGURA_MAX / final.width)))
    return final


def aparar(img: Image.Image, margem: int = 10) -> Image.Image:
    """Corta o branco que sobra embaixo e nas laterais (fim de coluna, linhas finas de borda)."""
    cinza = img.convert("L").point(lambda v: 255 if v > 235 else 0)
    caixa = ImageChops.invert(cinza).getbbox()
    if not caixa:
        return img
    x0, y0, x1, y1 = caixa
    return img.crop((max(0, x0 - margem), max(0, y0 - margem), min(img.width, x1 + margem), min(img.height, y1 + margem)))


def main() -> None:
    alvos = {}
    for area, arq in (("humanas", "questoes.json"), ("exatas", "questoes_exatas.json")):
        for q in json.loads((RAIZ / "site" / "data" / arq).read_text(encoding="utf-8")):
            alvos.setdefault(pdf_da_questao(area, q["ano"], q["q"]), []).append((area, q["ano"], q["q"]))

    falhas = []
    for pdf, lista in sorted(alvos.items()):
        doc = pymupdf.open(pdf)
        heads = sorted(cabecalhos(doc), key=lambda h: (h[1], 0 if h[2] < doc[h[1]].rect.width * 0.45 else 1, h[3]))
        # mantém só a primeira ocorrência de cada número (ignora instruções que citam "questão 1")
        vistos, ordem = set(), []
        for h in heads:
            if h[0] not in vistos:
                vistos.add(h[0])
                ordem.append(h)
        layout = Layout(doc, ordem)
        pos = {h[0]: i for i, h in enumerate(ordem)}
        for area, ano, q in lista:
            if q not in pos:
                falhas.append((ano, q))
                continue
            i = pos[q]
            fim = ordem[i + 1] if i + 1 < len(ordem) else None
            img = renderizar(doc, recortes(layout, ordem[i], fim))
            destino = SAIDA / area / f"{ano}-{q}.webp"
            destino.parent.mkdir(parents=True, exist_ok=True)
            for tentativa in range(5):  # o OneDrive às vezes segura o arquivo por um instante
                try:
                    img.save(destino, "WEBP", quality=62, method=6)
                    break
                except OSError:
                    time.sleep(1 + tentativa)
        print(pdf.name, len(lista), "questões")
    total = sum(f.stat().st_size for f in SAIDA.rglob("*.webp"))
    print(f"Falhas: {falhas}\nTotal: {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
