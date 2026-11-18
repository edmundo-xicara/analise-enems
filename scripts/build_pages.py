"""Gera as páginas de área do site (Humanas, Linguagens, Matemática e Natureza) a partir de um
molde único e sincroniza o cabeçalho e o rodapé de todas as páginas.

Uso:  python scripts/build_pages.py

As páginas de área são reescritas por inteiro. Nas outras (início, simulado, metodologia), só o
trecho entre os marcadores <!--topo-->…<!--/topo--> e <!--rodape-->…<!--/rodape--> é trocado.
"""
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
GITHUB = "https://github.com/edmundo-xicara/analise-enems"
INEP = "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos"

ABAS = [
    ("index.html", "Início", None),
    ("humanas.html", "Humanas", "humanas"),
    ("linguagens.html", "Linguagens", "linguagens"),
    ("matematica.html", "Matemática", "matematica"),
    ("natureza.html", "Natureza", "natureza"),
    ("simulado.html", "Simulado", None),
    ("metodologia.html", "Metodologia", None),
]

FONTES = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
          '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
          '  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400'
          '&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">')


def topo(atual: str) -> str:
    abas = "\n".join(
        f'        <a href="{href}"{" aria-current=\"page\"" if href == atual else ""}'
        f'{f" data-area=\"{area}\"" if area else ""}>{nome}</a>'
        for href, nome, area in ABAS)
    return f"""<!--topo-->
  <header class="barra">
    <div class="wrap barra-inner">
      <a class="marca" href="index.html">O que cai no <span>ENEM</span></a>
      <nav class="abas" aria-label="Seções do site">
{abas}
      </nav>
    </div>
  </header>
  <!--/topo-->"""


RODAPE = f"""<!--rodape-->
  <footer class="rodape">
    <div class="wrap rodape-inner">
      <p class="credito">Feito por <a href="https://byedstudio.com/" target="_blank" rel="noopener">Edmundo Pires Neto</a></p>
      <p class="rodape-links">
        <a href="https://byedstudio.com/" target="_blank" rel="noopener">Portfólio ↗</a>
        <a href="{GITHUB}" target="_blank" rel="noopener">Código e dados no GitHub ↗</a>
        <a href="metodologia.html">Metodologia</a>
        <span>Código MIT · dados CC BY 4.0</span>
      </p>
      <p class="aviso">Projeto independente e sem fins lucrativos, sem vínculo com o INEP ou o MEC. As provas e os gabaritos são publicações do INEP (<a href="{INEP}" target="_blank" rel="noopener">provas e gabaritos oficiais</a>), reproduzidas sem alteração e com indicação de fonte, para fins de estudo. Os textos e imagens citados em cada questão pertencem aos seus autores, indicados na própria questão. Se você é titular de algum conteúdo e quer que ele seja retirado, <a href="{GITHUB}/issues" target="_blank" rel="noopener">abra uma issue</a>.</p>
    </div>
  </footer>
  <!--/rodape-->"""

# Textos de cada área. "recorte" é a coluna s/n analisada no bloco do meio.
AREAS = {
    "humanas": dict(
        arquivo="humanas.html", titulo="Humanas", nome="Ciências Humanas",
        descricao="Análise aberta das questões de Ciências Humanas do ENEM de 2009 a 2025: disciplinas, matérias, assuntos, fontes e questões ambientadas no Brasil.",
        lede="Li à mão as provas de Ciências Humanas do ENEM e anotei a disciplina, a matéria, os assuntos, a abordagem e a fonte de cada questão. Em 2026, com ajuda de IA, continuei a análise até a prova mais recente.",
        disc_lede="Quantas questões de cada disciplina caíram por prova. Os pontos vazados (2009–2014) vêm só dos totais da apresentação original; 2023 a 2025 foram classificados com ajuda de IA. <strong>Clique numa fatia</strong> para isolar a disciplina na página toda.",
        rec_titulo="Questões ambientadas no Brasil", rec_toc="Ambientadas no Brasil",
        rec_lede="Quantas questões têm recorte brasileiro, em quais disciplinas e em quais matérias. <strong>Clique numa barra de disciplina</strong> para isolá-la; o seletor filtra as matérias pelo recorte.",
        sim="No Brasil", nao="Fora do Brasil", col="BR",
        cap_ano="Questões ambientadas no Brasil por ano",
        cap_disc="Média de questões ambientadas no Brasil por disciplina",
        cap_mat="Proporção de questões ambientadas no Brasil por matéria",
        busca="escravidão, Foucault, Amazônia, IBGE…",
        fontes_lede="Toda questão do ENEM parte de um texto-base. <strong>Clique num tipo de fonte, numa fonte ou num autor</strong> para ver as abordagens das questões correspondentes.",
    ),
    "linguagens": dict(
        arquivo="linguagens.html", titulo="Linguagens", nome="Linguagens",
        descricao="Análise aberta das questões de Linguagens do ENEM de 2015 a 2025: Português, Literatura, Língua Estrangeira, Artes e Educação Física, com matérias, assuntos, fontes e uso de textos literários.",
        lede="As 45 questões de Linguagens, Códigos e suas Tecnologias de cada prova de 2015 a 2025, com o mesmo método de Humanas. Esta parte foi classificada com ajuda de IA.",
        disc_lede="Quantas questões de cada disciplina caíram por prova. Das 45 questões, cinco são de língua estrangeira (inglês ou espanhol, à escolha do candidato); as outras se dividem entre Português, Literatura, Artes e Educação Física. <strong>Clique numa fatia</strong> para isolar a disciplina na página toda.",
        rec_titulo="Texto literário × não literário", rec_toc="Texto literário",
        rec_lede="Quantas questões partem de um texto literário (poema, conto, romance, crônica, peça ou letra de canção) e quantas partem de notícias, campanhas, artigos e imagens. <strong>Clique numa barra de disciplina</strong> para isolá-la; o seletor filtra as matérias pelo recorte.",
        sim="Literário", nao="Não literário", col="Lit.",
        cap_ano="Questões com texto literário e não literário por ano",
        cap_disc="Média de questões com texto literário e não literário por disciplina",
        cap_mat="Proporção de questões com texto literário por matéria",
        busca="Machado de Assis, variação linguística, futebol, grafite…",
        fontes_lede="Em Linguagens, quase toda questão parte de um texto ou imagem com autoria: livros, canções, campanhas, reportagens e obras de arte. <strong>Clique num tipo de fonte, numa fonte ou num autor</strong> para ver as abordagens das questões correspondentes.",
    ),
    "matematica": dict(
        arquivo="matematica.html", titulo="Matemática", nome="Matemática",
        descricao="Análise aberta das 45 questões de Matemática de cada prova do ENEM de 2015 a 2025: matérias, assuntos, fontes e questões de cálculo × conceituais.",
        lede="As 45 questões de Matemática e suas Tecnologias de cada prova de 2015 a 2025, com o mesmo método de Humanas. Esta parte foi classificada com ajuda de IA.",
        disc_lede="Como as matérias de Matemática se revezam de prova em prova: as cinco que mais caem, ano a ano, e o peso médio de cada uma numa prova.",
        rec_titulo="Cálculo × conceitual", rec_toc="Cálculo × conceitual",
        rec_lede="Quase toda questão de Matemática pede conta, mas não todas. Veja quais matérias trazem questões só de interpretação ou de conceito.",
        sim="Exige cálculo", nao="Conceitual", col="Cálc.",
        cap_ano="Questões de cálculo e conceituais por ano",
        cap_disc="",
        cap_mat="Proporção de questões de cálculo por matéria",
        busca="porcentagem, escala, probabilidade, IBGE…",
        fontes_lede="Em Matemática, a maioria das questões não cita fonte: o enunciado é criado pela própria banca. <strong>Clique num tipo de fonte, numa fonte ou num autor</strong> para ver as abordagens das questões correspondentes.",
    ),
    "natureza": dict(
        arquivo="natureza.html", titulo="Natureza", nome="Ciências da Natureza",
        descricao="Análise aberta das questões de Ciências da Natureza (Biologia, Química e Física) do ENEM de 2015 a 2025: disciplinas, matérias, assuntos, fontes e questões de cálculo × conceituais.",
        lede="As 45 questões de Ciências da Natureza (Biologia, Química e Física) de cada prova de 2015 a 2025, com o mesmo método de Humanas. Esta parte foi classificada com ajuda de IA.",
        disc_lede="Quantas questões de cada disciplina caíram por prova. As 45 questões se dividem quase igualmente entre Biologia, Química e Física. <strong>Clique numa fatia</strong> para isolar a disciplina na página toda.",
        rec_titulo="Cálculo × conceitual", rec_toc="Cálculo × conceitual",
        rec_lede="Quantas questões exigem fazer conta e quantas cobram só o entendimento de um conceito, por disciplina e por matéria. <strong>Clique numa barra de disciplina</strong> para isolá-la; o seletor filtra as matérias pelo recorte.",
        sim="Exige cálculo", nao="Conceitual", col="Cálc.",
        cap_ano="Questões de cálculo e conceituais por ano",
        cap_disc="Média de questões de cálculo e conceituais por disciplina",
        cap_mat="Proporção de questões de cálculo por matéria",
        busca="DNA, pH, ondas, ecologia, energia…",
        fontes_lede="Em Natureza, muitas questões não citam fonte: o enunciado é criado pela própria banca. <strong>Clique num tipo de fonte, numa fonte ou num autor</strong> para ver as abordagens das questões correspondentes.",
    ),
}


def seg(chave: str, a: dict) -> str:
    return (f'<div class="seg" role="group" aria-label="Recorte" data-key="{chave}">'
            f'<button type="button" data-v="todos" aria-pressed="true">Todas</button>'
            f'<button type="button" data-v="sim" aria-pressed="false">{a["sim"]}</button>'
            f'<button type="button" data-v="nao" aria-pressed="false">{a["nao"]}</button></div>')


def pagina_area(chave: str, a: dict) -> str:
    uma_disc = chave == "matematica"
    bloco1 = (f"""
        <figure class="fig span2">
          <figcaption>As cinco matérias que mais caem, por ano</figcaption>
          <div class="chart tall" id="c-disc-ano"></div>
        </figure>
        <figure class="fig">
          <figcaption>Média por prova, por matéria <span class="hint" data-scope></span></figcaption>
          <div class="chart tall" id="c-disc-media"></div>
        </figure>""" if uma_disc else f"""
        <figure class="fig span2">
          <figcaption>Número de questões de cada disciplina por ano</figcaption>
          <div class="chart tall" id="c-disc-ano"></div>
        </figure>
        <figure class="fig">
          <figcaption>Média por prova, por disciplina <span class="hint" data-scope></span></figcaption>
          <div class="chart tall" id="c-disc-media"></div>
        </figure>""")
    fig_disc = "" if uma_disc else f"""
        <figure class="fig">
          <figcaption>{a["cap_disc"]} <span class="hint" data-scope></span></figcaption>
          <div class="chart" id="c-brasil-disc"></div>
        </figure>"""
    fig_ano_span = " span2" if uma_disc else ""
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{a["titulo"]} no ENEM · O que cai no ENEM</title>
  <meta name="description" content="{a["descricao"]}">
  <meta name="theme-color" content="#fbfcfe">
  {FONTES}
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="style.css">
  <script src="site.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="app.js" defer></script>
</head>
<!-- Gerado por scripts/build_pages.py: edite o molde lá, não aqui. -->
<body data-area="{chave}">
  {topo(a["arquivo"])}

  <header class="capa">
    <div class="wrap capa-grid">
      <div class="capa-texto">
        <h1>O que cai em <mark>{a["nome"]}</mark></h1>
        <p class="lede">{a["lede"]}</p>
        <p class="capa-meta" id="capa-meta"></p>
      </div>
      <div class="ranking" id="ranking" aria-live="polite">
        <h2 class="ranking-titulo">As cinco matérias que mais caem</h2>
        <ol class="ranking-lista" id="ranking-lista"></ol>
        <a class="btn" id="ranking-treinar" href="simulado.html">Treinar essas matérias</a>
      </div>
    </div>
  </header>

  <div class="filtros" id="filters">
    <div class="wrap filtros-inner">
      <label class="field">Ano <select id="f-ano"></select></label>
      <div class="chips" id="f-disc" role="group" aria-label="Disciplinas"{" hidden" if uma_disc else ""}></div>
      <span class="filter-note" id="f-note"></span>
      <nav class="sumario" aria-label="Nesta página">
        <a href="#disciplinas">{"Matérias por ano" if uma_disc else "Disciplinas"}</a>
        <a href="#brasil">{a["rec_toc"]}</a>
        <a href="#materias">Questões</a>
        <a href="#fontes">Fontes</a>
      </nav>
    </div>
  </div>

  <main class="wrap">
    <section id="disciplinas">
      <h2>{"Como as matérias se revezam" if uma_disc else "Como a prova se divide"}</h2>
      <p class="section-lede">{a["disc_lede"]}</p>
      <div class="grid g3">{bloco1}
      </div>
    </section>

    <section id="brasil">
      <h2>{a["rec_titulo"]}</h2>
      <p class="section-lede">{a["rec_lede"]}</p>
      <div class="group-filters" id="gf-brasil">{seg("brasil", a)}</div>
      <div class="grid g2">
        <figure class="fig{fig_ano_span}">
          <figcaption>{a["cap_ano"]}</figcaption>
          <div class="chart" id="c-brasil-ano"></div>
        </figure>{fig_disc}
        <figure class="fig span2">
          <figcaption>{a["cap_mat"]} <span class="hint" data-scope></span></figcaption>
          <div class="chart xtall" id="c-materias-brasil"></div>
        </figure>
      </div>
    </section>

    <section id="materias">
      <h2>Matérias, assuntos e questões</h2>
      <p class="section-lede">Que matérias mais caem, que assuntos aparecem dentro delas e quais foram as questões. <strong>Clique numa matéria ou num assunto</strong> para filtrar o resto do bloco, ou use os seletores.</p>
      <div class="group-filters" id="gf-materias">
        <label class="field">Matéria <select id="f-materia"></select></label>
        <label class="field">Assunto <select id="f-assunto"></select></label>
        {seg("brasilM", a)}
        <button type="button" class="clear" data-clear="materias">Limpar filtros</button>
      </div>
      <div class="grid g2">
        <figure class="fig">
          <figcaption>Média de questões por prova de cada matéria <span class="hint" data-scope></span></figcaption>
          <div class="chart xtall" id="c-materias"></div>
        </figure>
        <figure class="fig">
          <figcaption>Assuntos abordados <span class="hint" id="h-assuntos"></span></figcaption>
          <p class="escala" aria-hidden="true">Marca-texto em tamanhos fixos: <span class="f1"></span>1 <span class="f2"></span>2 <span class="f3"></span>3–4 <span class="f4"></span>5–9 <span class="f5"></span>10+ questões</p>
          <div class="table-wrap xtall-table"><table class="data clickable" id="t-assuntos"></table></div>
        </figure>
        <figure class="fig span2" id="explorar">
          <figcaption>Explorar questões <span class="hint" id="h-questoes"></span></figcaption>
          <div class="search-row">
            <input id="busca" type="search" placeholder="Buscar: {a["busca"]}" aria-label="Buscar questões">
            <span class="count" id="busca-count"></span>
            <a class="btn btn-sec" id="treinar-filtro" href="simulado.html">Treinar este recorte</a>
          </div>
          <div class="table-wrap tall-table">
            <table class="data questions" id="t-questoes">
              <thead><tr><th>Questão</th><th>Disciplina</th><th>Matéria</th><th>Abordagem</th><th>Fonte</th><th>{a["col"]}</th><th><span class="sr-only">Ver questão</span></th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <button class="more" id="mais" type="button">Mostrar mais</button>
        </figure>
      </div>
    </section>

    <section id="fontes">
      <h2>De onde vêm os textos</h2>
      <p class="section-lede">{a["fontes_lede"]}</p>
      <div class="group-filters" id="gf-fontes">
        <label class="field">Tipo de fonte <select id="f-tipo"></select></label>
        <span class="pills" id="p-fontes"></span>
        <button type="button" class="clear" data-clear="fontes">Limpar filtros</button>
      </div>
      <div class="grid g3">
        <figure class="fig">
          <figcaption>Tipo de fonte <span class="hint" data-scope></span></figcaption>
          <div class="chart" id="c-tipos"></div>
        </figure>
        <figure class="fig">
          <figcaption>Fontes mais citadas</figcaption>
          <div class="table-wrap"><table class="data clickable" id="t-fontes"></table></div>
        </figure>
        <figure class="fig">
          <figcaption>Autores mais citados</figcaption>
          <div class="table-wrap"><table class="data clickable" id="t-autores"></table></div>
        </figure>
        <figure class="fig span3">
          <figcaption>Abordagens <span class="hint" id="h-abordagens"></span></figcaption>
          <div class="table-wrap"><table class="data" id="t-abordagens"></table></div>
        </figure>
      </div>
    </section>
  </main>

  {RODAPE}
</body>
</html>
"""


def sincronizar(arq: Path) -> None:
    html = arq.read_text(encoding="utf-8")
    novo = re.sub(r"<!--topo-->.*?<!--/topo-->", lambda _: topo(arq.name), html, flags=re.S)
    novo = re.sub(r"<!--rodape-->.*?<!--/rodape-->", lambda _: RODAPE, novo, flags=re.S)
    if novo != html:
        arq.write_text(novo, encoding="utf-8")
        print(f"atualizado: {arq.name}")


def main() -> None:
    for chave, a in AREAS.items():
        (SITE / a["arquivo"]).write_text(pagina_area(chave, a), encoding="utf-8")
        print(f"gerado: {a['arquivo']}")
    for nome in ("index.html", "simulado.html", "metodologia.html"):
        sincronizar(SITE / nome)


if __name__ == "__main__":
    main()
