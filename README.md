# O que cai no ENEM: Humanas (2009–2025) e Exatas (2015–2025)

Análise aberta das questões de **Ciências Humanas** e de **Matemática e Ciências da Natureza** do ENEM: disciplina, matéria, assuntos, abordagem, fonte do texto-base e se a questão é ambientada no Brasil.

**Site:** abra `site/index.html` com um servidor local (veja abaixo) ou acesse a versão publicada na Vercel (a configuração está em `vercel.json`, que publica a pasta `site/`).

## A história

Entre o fim de 2022 e o início de 2023, antes do boom da IA generativa, eu li **à mão** as 45 questões de Humanas de cada prova do ENEM e anotei tudo numa planilha. Depois, organizei os dados em Python e montei uma apresentação no Power BI.

Em 2025, com *vibe coding* (o Claude, da Anthropic, como assistente de programação), transformei esse trabalho em um projeto aberto:

1. extraí o modelo de dados do arquivo `.pbix` do Power BI;
2. continuei a análise para **2023, 2024 e 2025** com o mesmo esquema de classificação;
3. consolidei tudo em um CSV único;
4. construí este site para substituir a apresentação do Power BI;
5. apliquei o mesmo método às **990 questões de Matemática e Ciências da Natureza** de 2015 a 2025 (aba *Matemática e Natureza* do site), também com ajuda de IA;
6. criei um **simulado**: o usuário filtra disciplinas, matérias e anos e resolve questões reais sorteadas, corrigidas pelo gabarito oficial.

## O que tem aqui

| Caminho | Conteúdo |
|---|---|
| `dados/originais/` | As planilhas e o `.pbix` originais, exatamente como foram feitos em 2022/2023 |
| `dados/anotacoes/2023.csv` … `2025.csv` | A continuação (2023–2025), classificada com ajuda de IA |
| `dados/resumo_2009_2014_powerbi.csv` | Totais de 2009–2014, transcritos da apresentação original |
| `dados/questoes.csv` | **Base consolidada**: 495 questões de 2015 a 2025 |
| `dados/anotacoes_exatas/2015.psv` … `2025.psv` | Matemática e Natureza, classificadas com ajuda de IA (separador `\|`) |
| `dados/questoes_exatas.csv` | **Base consolidada de Exatas**: 990 questões de 2015 a 2025. Mesmas colunas de Humanas, mas `brasil` é trocada por `calculo` (`True` se a questão exige conta) |
| `scripts/build_data.py` | Gera `dados/questoes.csv`, `dados/questoes_exatas.csv` e os JSON do site |
| `dados/gabaritos.json` | Gabarito oficial do caderno azul, 2015–2025 (`X` = anulada) |
| `scripts/gabaritos.py` | Lê os PDFs de gabarito do INEP e gera `dados/gabaritos.json` |
| `scripts/recortar_questoes.py` | Recorta cada questão dos cadernos oficiais como imagem para o simulado (`site/questoes/`) |
| `site/` | Site estático (HTML + CSS + JS + Apache ECharts) |

### Colunas de `dados/questoes.csv`

| Coluna | Descrição |
|---|---|
| `ano`, `questao` | Ano da prova e número da questão no caderno azul do 1º dia |
| `disciplina` | História, Geografia, Filosofia ou Sociologia |
| `materia` | Recorte dentro da disciplina (ex.: Brasil República, Climatologia, Ética) |
| `assuntos` | Palavras-chave separadas por vírgula |
| `brasil` | `True` se a questão é ambientada no Brasil |
| `abordagem` | Uma frase resumindo o que a questão discute |
| `fonte`, `tipo_fonte` | Texto-base (`Título - Autor` para livros) e tipo (Livros, Notícias, Revistas, Artigos, Imagens, Músicas, Poemas) |
| `metodo` | `manual` (análise original) ou `ia` (continuação assistida por IA, ainda sem revisão humana) |

## Cobertura e limitações

- **2009–2014**: só os totais por disciplina e o número de questões ambientadas no Brasil. As planilhas questão a questão desses anos não estão no repositório (a de 2014 está incompleta).
- **2015–2022**: análise manual completa. Em 2015 e 2016, parte das questões não tem assuntos nem abordagem.
- **2023–2025**: classificadas com ajuda de IA a partir dos cadernos oficiais do INEP. Ainda passarão por uma revisão humana.
- Os prints da apresentação do Power BI mostram 2017 (Geografia 18 / História 15) e 2020 (Geografia 18 / História 16), mas as planilhas trazem 17/16 e 17/17. O site usa as planilhas.

## Ferramentas open source

- [pbixray](https://github.com/Hugoberry/pbixray): leitura do modelo de dados do Power BI (`.pbix`)
- [enem.dev](https://enem.dev): API aberta com as questões do ENEM até 2023
- [pypdf](https://pypdf.readthedocs.io) e [pandas](https://pandas.pydata.org): extração e tratamento dos dados
- [Apache ECharts](https://echarts.apache.org): gráficos

## Como rodar

```bash
pip install pandas openpyxl
python scripts/build_data.py
python -m http.server 8000 --directory site
```

Depois é só abrir http://localhost:8000.

As provas originais ficam em [Provas e gabaritos do INEP](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos). Os PDFs não são versionados aqui (pasta `ENEMs/` no `.gitignore`).

## Contribuindo

Achou uma classificação errada? Abra uma *issue* ou um *pull request* editando o CSV do ano em `dados/anotacoes/` ou, para 2015–2022, apontando a questão.

## Licença

Código sob licença MIT. Dados e anotações sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.pt_BR). As provas do ENEM são publicações do INEP.
