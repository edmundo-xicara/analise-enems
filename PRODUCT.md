# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primário (confirmado): estudantes que vão prestar o ENEM e querem saber o que estudar. Chegam pelo celular ou pelo computador, entre uma sessão de estudo e outra, com a pergunta "o que mais cai na minha prova?". Usam os filtros por ano/disciplina para priorizar conteúdos e o simulado para treinar com questões reais.

Secundários (inferidos do conteúdo, não priorizados): professores e cursinhos que citam os dados; leitores curiosos e quem chega pelo portfólio do autor.

## Product Purpose

Mostrar, com dados abertos e verificáveis, o que cai em cada área do ENEM: disciplina, matéria, assuntos, abordagem, fonte do texto-base e outros recortes por área. Sucesso: o estudante sai sabendo onde concentrar o estudo e consegue treinar com questões reais filtradas por esse recorte.

## Positioning

Análise feita questão a questão: as provas de Humanas de 2015–2022 foram lidas e anotadas à mão pelo autor; 2023–2025 e as demais áreas foram classificadas com ajuda de IA com o mesmo esquema. Tudo é aberto (CSV no GitHub, CC BY 4.0), com metodologia publicada. Concorrentes (cursinhos, blogs, "Raio X" em PDF) mostram rankings estáticos e não abrem os dados.

## Operating Context

Site estático publicado na Vercel (pasta `site/`). Abas atuais: Ciências Humanas, Linguagens, Matemática e Natureza, Simulado, Metodologia. Cada área tem: números-resumo, proporção por disciplina por ano, matérias/assuntos, fontes, explorador de questões com link para a questão original e gabarito.

## Capabilities and Constraints

- HTML + CSS + JS puro, gráficos com Apache ECharts; dados em JSON gerados por `scripts/build_data.py`.
- Cobertura: Humanas 2009–2025 (2009–2014 só totais), Linguagens, Matemática e Natureza 2015–2025.
- Simulado: sorteia questões reais (imagens recortadas dos cadernos do INEP) e corrige pelo gabarito oficial.
- Decisão do usuário: separar "Matemática e Natureza" em duas abas, Matemática e Ciências da Natureza.
- As imagens das provas pertencem ao INEP; projeto independente, sem vínculo com INEP/MEC.

## Brand Commitments

- Rodapé com crédito "Feito por Edmundo Pires Neto" com link para o portfólio https://byedstudio.com/.
- Tom em português, direto e em primeira pessoa quando conta a história do projeto.

## Evidence on Hand

- `dados/questoes*.csv`, `dados/gabaritos.json`, `site/questoes/` (recortes), `README.md` (história e metodologia), `divulgacao/prints`.
- Não há depoimentos, números de acesso ou parcerias; não inventar.

## Product Principles

1. A pergunta do estudante vem primeiro: "o que mais cai?" se responde no primeiro olhar de cada área.
2. Dado sempre verificável: método (manual/IA), período e fonte visíveis junto ao número.
3. Do dado à prática: todo recorte leva a questões reais para treinar.
4. Celular é cenário principal de uso.
