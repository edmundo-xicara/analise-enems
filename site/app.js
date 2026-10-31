const DISCIPLINAS = ["História", "Geografia", "Filosofia", "Sociologia"];
const COR_VAR = { "História": "--hist", "Geografia": "--geo", "Filosofia": "--filo", "Sociologia": "--soc" };
const TIPOS = ["Livros", "Notícias", "Revistas", "Artigos", "Imagens", "Músicas", "Poemas"];

const estado = { ano: "todos", disc: new Set(DISCIPLINAS), busca: "", limite: 40 };
let QUESTOES = [], ANUAL = [];
const graficos = {};

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const cor = (d) => css(COR_VAR[d]);
const fmt = (n, c = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: c, minimumFractionDigits: 0 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function contar(itens) {
  const m = new Map();
  for (const i of itens) m.set(i, (m.get(i) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function filtradas() {
  return QUESTOES.filter((q) =>
    estado.disc.has(q.disciplina) && (estado.ano === "todos" || q.ano === Number(estado.ano)));
}

function anosNoEscopo() {
  return estado.ano === "todos" ? new Set(QUESTOES.map((q) => q.ano)).size : 1;
}

function escopoTexto() {
  return estado.ano === "todos" ? "· 2015–2025" : `· ${estado.ano}`;
}

function baseOpcoes() {
  return {
    textStyle: { fontFamily: "Inter, system-ui, sans-serif", color: css("--ink") },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", backgroundColor: css("--surface"), borderColor: css("--line"), textStyle: { color: css("--ink") } },
  };
}

function eixo(extra = {}) {
  return {
    axisLine: { lineStyle: { color: css("--line") } },
    axisLabel: { color: css("--muted") },
    splitLine: { lineStyle: { color: css("--line") } },
    ...extra,
  };
}

function grafico(id, opcoes) {
  const el = document.getElementById(id);
  if (!graficos[id]) graficos[id] = echarts.init(el, null, { renderer: "svg" });
  graficos[id].setOption(opcoes, true);
}

function renderKpis() {
  const anotadas = QUESTOES.length;
  const total = ANUAL.reduce((s, a) => s + a.total, 0);
  const brasil = QUESTOES.filter((q) => q.brasil).length / anotadas;
  const fontes = new Set(QUESTOES.map((q) => q.fonte).filter(Boolean)).size;
  document.getElementById("kpis").innerHTML = [
    [ANUAL.length, "provas (2009–2025)"],
    [total, `questões contadas, ${anotadas} anotadas uma a uma`],
    [`${fmt(brasil * 100, 0)}%`, "ambientadas no Brasil (2015–2025)"],
    [fontes, "fontes diferentes citadas"],
  ].map(([v, t]) => `<div class="kpi"><b>${v}</b><span>${t}</span></div>`).join("");
}

function renderFiltros() {
  const anos = [...new Set(QUESTOES.map((q) => q.ano))].sort((a, b) => b - a);
  const sel = document.getElementById("f-ano");
  sel.innerHTML = `<option value="todos">Todos (2015–2025)</option>` + anos.map((a) => `<option>${a}</option>`).join("");
  sel.onchange = () => { estado.ano = sel.value; estado.limite = 40; atualizar(); };
  const chips = document.getElementById("f-disc");
  chips.innerHTML = DISCIPLINAS.map((d) =>
    `<button class="chip" type="button" aria-pressed="true" data-d="${d}" style="--c:var(${COR_VAR[d]})"><i></i>${d}</button>`).join("");
  chips.onclick = (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const d = b.dataset.d;
    if (estado.disc.has(d) && estado.disc.size === 1) return;
    estado.disc.has(d) ? estado.disc.delete(d) : estado.disc.add(d);
    b.setAttribute("aria-pressed", estado.disc.has(d));
    estado.limite = 40;
    atualizar();
  };
}

function renderTendencias() {
  const anos = ANUAL.map((a) => a.ano);
  const series = DISCIPLINAS.filter((d) => estado.disc.has(d)).map((d) => ({
    name: d, type: "line", smooth: false, symbolSize: 7,
    color: cor(d), lineStyle: { width: 2.5 },
    data: ANUAL.map((a) => ({
      value: a.disciplinas[d] || 0,
      symbol: a.fonte === "powerbi" ? "emptyCircle" : "circle",
    })),
    label: { show: estado.disc.size <= 2, position: "top", color: css("--muted"), fontSize: 11 },
  }));
  grafico("c-disc-ano", {
    ...baseOpcoes(),
    legend: { top: 0, left: 0, icon: "circle", textStyle: { color: css("--ink") } },
    xAxis: eixo({ type: "category", data: anos, splitLine: { show: false } }),
    yAxis: eixo({ type: "value", minInterval: 1 }),
    series,
    markArea: undefined,
  });

  // Brasil por ano: com todas as disciplinas usa os totais desde 2009; com filtro, só os anos anotados.
  const todas = estado.disc.size === DISCIPLINAS.length;
  const linhas = todas ? ANUAL : ANUAL.filter((a) => a.fonte !== "powerbi").map((a) => {
    const qs = QUESTOES.filter((q) => q.ano === a.ano && estado.disc.has(q.disciplina));
    return { ano: a.ano, brasil: qs.filter((q) => q.brasil).length, total: qs.length, fonte: a.fonte };
  });
  grafico("c-brasil-ano", {
    ...baseOpcoes(),
    legend: { top: 0, left: 0, icon: "circle", textStyle: { color: css("--ink") } },
    xAxis: eixo({ type: "category", data: linhas.map((l) => l.ano), splitLine: { show: false } }),
    yAxis: eixo({ type: "value", minInterval: 1 }),
    series: [
      { name: "No Brasil", type: "line", color: css("--br-yes"), symbolSize: 6, lineStyle: { width: 2.5 }, data: linhas.map((l) => l.brasil) },
      { name: "Fora do Brasil", type: "line", color: css("--br-no"), symbolSize: 6, lineStyle: { width: 2.5 }, data: linhas.map((l) => l.total - l.brasil) },
    ],
  });

  const qs = filtradas(), n = anosNoEscopo();
  const porDisc = DISCIPLINAS.filter((d) => estado.disc.has(d)).map((d) => ({
    name: d, value: +(qs.filter((q) => q.disciplina === d).length / n).toFixed(1), itemStyle: { color: cor(d) },
  }));
  grafico("c-disc-media", {
    ...baseOpcoes(),
    tooltip: { trigger: "item", formatter: (p) => `${p.name}: ${fmt(p.value)} questões (${fmt(p.percent)}%)` },
    series: [{
      type: "pie", radius: ["42%", "70%"], center: ["50%", "55%"], data: porDisc,
      label: { color: css("--ink"), formatter: (p) => `${p.name}\n${fmt(p.value)} (${fmt(p.percent, 0)}%)` },
      itemStyle: { borderColor: css("--surface"), borderWidth: 2 },
    }],
  });

  const discs = DISCIPLINAS.filter((d) => estado.disc.has(d));
  const media = (d, b) => +(qs.filter((q) => q.disciplina === d && q.brasil === b).length / n).toFixed(1);
  grafico("c-brasil-disc", {
    ...baseOpcoes(),
    legend: { top: 0, left: 0, icon: "circle", textStyle: { color: css("--ink") } },
    xAxis: eixo({ type: "category", data: discs, splitLine: { show: false } }),
    yAxis: eixo({ type: "value" }),
    series: [
      { name: "Fora do Brasil", type: "bar", color: css("--br-no"), barMaxWidth: 36, data: discs.map((d) => media(d, false)), label: { show: true, position: "top", color: css("--muted"), formatter: (p) => fmt(p.value) } },
      { name: "No Brasil", type: "bar", color: css("--br-yes"), barMaxWidth: 36, data: discs.map((d) => media(d, true)), label: { show: true, position: "top", color: css("--muted"), formatter: (p) => fmt(p.value) } },
    ],
  });
}

function renderMaterias() {
  const qs = filtradas(), n = anosNoEscopo();
  const top = contar(qs.map((q) => q.materia).filter(Boolean)).slice(0, 18).map(([m]) => m).reverse();
  const discs = DISCIPLINAS.filter((d) => estado.disc.has(d));
  grafico("c-materias", {
    ...baseOpcoes(),
    tooltip: { ...baseOpcoes().tooltip, axisPointer: { type: "shadow" }, valueFormatter: (v) => fmt(v) },
    legend: { top: 0, left: 0, icon: "circle", textStyle: { color: css("--ink") } },
    xAxis: eixo({ type: "value" }),
    yAxis: eixo({ type: "category", data: top, splitLine: { show: false }, axisLabel: { color: css("--ink"), width: 140, overflow: "truncate" } }),
    series: discs.map((d) => ({
      name: d, type: "bar", stack: "m", color: cor(d), barMaxWidth: 18,
      data: top.map((m) => +(qs.filter((q) => q.materia === m && q.disciplina === d).length / n).toFixed(2) || null),
    })),
  });

  const minimo = estado.ano === "todos" ? 4 : 1;
  const props = contar(qs.map((q) => q.materia).filter(Boolean))
    .filter(([, c]) => c >= minimo)
    .map(([m, c]) => ({ m, p: qs.filter((q) => q.materia === m && q.brasil).length / c }))
    .sort((a, b) => b.p - a.p).slice(0, 18).reverse();
  grafico("c-materias-brasil", {
    ...baseOpcoes(),
    tooltip: { ...baseOpcoes().tooltip, axisPointer: { type: "shadow" }, valueFormatter: (v) => `${fmt(v, 0)}%` },
    legend: { top: 0, left: 0, icon: "circle", textStyle: { color: css("--ink") } },
    xAxis: eixo({ type: "value", max: 100, axisLabel: { color: css("--muted"), formatter: "{value}%" } }),
    yAxis: eixo({ type: "category", data: props.map((x) => x.m), splitLine: { show: false }, axisLabel: { color: css("--ink"), width: 140, overflow: "truncate" } }),
    series: [
      { name: "No Brasil", type: "bar", stack: "p", color: css("--br-yes"), barMaxWidth: 18, data: props.map((x) => +(x.p * 100).toFixed(1)) },
      { name: "Fora do Brasil", type: "bar", stack: "p", color: css("--br-no"), barMaxWidth: 18, data: props.map((x) => +((1 - x.p) * 100).toFixed(1)) },
    ],
  });

  const assuntos = contar(qs.flatMap((q) => [...new Set(q.assuntos)])).slice(0, 24);
  const max = assuntos[0]?.[1] || 1;
  document.getElementById("t-assuntos").innerHTML =
    `<thead><tr><th>Assunto</th><th>Disciplinas</th><th>Anos</th><th class="num">Questões</th></tr></thead><tbody>` +
    assuntos.map(([a, c]) => {
      const rel = qs.filter((q) => q.assuntos.includes(a));
      const anos = [...new Set(rel.map((q) => q.ano))].sort().join(", ");
      const ds = [...new Set(rel.map((q) => q.disciplina))].map((d) => `<span class="tag" style="--c:var(${COR_VAR[d]})">${d}</span>`).join(" ");
      return `<tr><td>${esc(a)}<div class="bar" style="width:${(c / max) * 100}%"></div></td><td>${ds}</td><td>${anos}</td><td class="num">${c}</td></tr>`;
    }).join("") + "</tbody>";
}

function separarFontes(fonte) {
  // "Título - Autor, Outro título - Autor B" → [{titulo, autor}]
  return fonte.split(/,\s(?=[^,]*(?: - |$))/).map((p) => {
    const i = p.lastIndexOf(" - ");
    return i > 0 ? { titulo: p.slice(0, i).trim(), autor: p.slice(i + 3).trim() } : { titulo: p.trim(), autor: "" };
  }).filter((f) => f.titulo);
}

function renderFontes() {
  const qs = filtradas();
  const tipos = contar(qs.flatMap((q) => q.tipos)).filter(([t]) => TIPOS.includes(t));
  const paleta = [css("--hist"), css("--soc"), css("--filo"), css("--geo"), css("--br-yes"), css("--muted"), css("--br-no")];
  grafico("c-tipos", {
    ...baseOpcoes(),
    tooltip: { trigger: "item", formatter: (p) => `${p.name}: ${p.value} (${fmt(p.percent)}%)` },
    series: [{
      type: "pie", radius: ["42%", "70%"], center: ["50%", "52%"],
      data: tipos.map(([t, c], i) => ({ name: t, value: c, itemStyle: { color: paleta[i % paleta.length] } })),
      label: { color: css("--ink"), formatter: (p) => `${p.name}\n${fmt(p.percent, 0)}%` },
      itemStyle: { borderColor: css("--surface"), borderWidth: 2 },
    }],
  });

  const partes = qs.flatMap((q) => separarFontes(q.fonte));
  const tabela = (id, titulo, linhas) => {
    document.getElementById(id).innerHTML =
      `<thead><tr><th>${titulo}</th><th class="num">Questões</th></tr></thead><tbody>` +
      linhas.map(([n, c]) => `<tr><td>${esc(n)}</td><td class="num">${c}</td></tr>`).join("") + "</tbody>";
  };
  tabela("t-fontes", "Fonte", contar(partes.filter((p) => !p.autor).map((p) => p.titulo)).slice(0, 15));
  const autores = partes.flatMap((p) => p.autor.split(";").map((a) => a.trim()).filter((a) => a.length > 2));
  tabela("t-autores", "Autor", contar(autores).slice(0, 15));
}

function renderQuestoes() {
  const termo = estado.busca.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const qs = filtradas().filter((q) => !termo ||
    norm([q.materia, q.abordagem, q.fonte, q.assuntos.join(" ")].join(" ")).includes(termo))
    .sort((a, b) => b.ano - a.ano || a.q - b.q);
  document.getElementById("busca-count").textContent = `${qs.length} questões`;
  document.querySelector("#t-questoes tbody").innerHTML = qs.slice(0, estado.limite).map((q) => `
    <tr>
      <td>${q.ano}${q.metodo === "ia" ? ' <span class="tag" title="Classificada com ajuda de IA, ainda sem revisão humana">IA</span>' : ""}</td>
      <td class="num">${q.q}</td>
      <td><span class="tag" style="--c:var(${COR_VAR[q.disciplina]})">${q.disciplina}</span></td>
      <td>${esc(q.materia)}</td>
      <td>${esc(q.abordagem || "—")}<div class="assuntos">${esc(q.assuntos.join(" · "))}</div></td>
      <td>${esc(q.fonte || "—")}</td>
      <td>${q.brasil ? "🇧🇷" : ""}</td>
    </tr>`).join("");
  document.getElementById("mais").hidden = qs.length <= estado.limite;
}

function atualizar() {
  document.querySelectorAll("[data-scope]").forEach((el) => (el.textContent = escopoTexto()));
  const parcial = estado.disc.size < DISCIPLINAS.length;
  document.getElementById("f-note").textContent = parcial
    ? "Com filtro de disciplina, o gráfico do Brasil por ano mostra só 2015–2025."
    : "";
  renderTendencias();
  renderMaterias();
  renderFontes();
  renderQuestoes();
}

async function iniciar() {
  [QUESTOES, ANUAL] = await Promise.all([
    fetch("data/questoes.json").then((r) => r.json()),
    fetch("data/anual.json").then((r) => r.json()),
  ]);
  renderKpis();
  renderFiltros();
  const busca = document.getElementById("busca");
  busca.oninput = () => { estado.busca = busca.value; estado.limite = 40; renderQuestoes(); };
  document.getElementById("mais").onclick = () => { estado.limite += 60; renderQuestoes(); };
  atualizar();
  window.addEventListener("resize", () => Object.values(graficos).forEach((g) => g.resize()));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", atualizar);
}

iniciar();
