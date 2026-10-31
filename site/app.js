// A mesma página serve as duas áreas; <body data-area="..."> escolhe qual.
const AREAS = {
  humanas: {
    disciplinas: ["História", "Geografia", "Filosofia", "Sociologia"],
    cores: { "História": "--hist", "Geografia": "--geo", "Filosofia": "--filo", "Sociologia": "--soc" },
    dados: ["data/questoes.json", "data/anual.json"],
    provas: "provas (2009–2025)",
    marcador: { campo: "brasil", sim: "No Brasil", nao: "Fora do Brasil", kpi: "ambientadas no Brasil (2015–2025)", icone: "🇧🇷" },
  },
  exatas: {
    disciplinas: ["Matemática", "Física", "Química", "Biologia"],
    cores: { "Matemática": "--mat", "Física": "--fis", "Química": "--qui", "Biologia": "--bio" },
    dados: ["data/questoes_exatas.json", "data/anual_exatas.json"],
    provas: "provas (2015–2025)",
    marcador: { campo: "calculo", sim: "Exige cálculo", nao: "Conceitual", kpi: "exigem cálculo (2015–2025)", icone: "✓" },
  },
};
const AREA = AREAS[document.body.dataset.area] || AREAS.humanas;
const DISCIPLINAS = AREA.disciplinas;
const COR_VAR = AREA.cores;
// Coluna s/n que o bloco 2 analisa: "ambientada no Brasil" em Humanas, "exige cálculo" em Exatas.
const M = AREA.marcador;
const TIPOS = ["Livros", "Notícias", "Revistas", "Artigos", "Imagens", "Músicas", "Poemas"];
const LIMITE = 40;

const estado = {
  ano: "todos", disc: new Set(DISCIPLINAS),
  brasil: "todos",                                              // bloco 2
  materia: null, assunto: null, brasilM: "todos", busca: "", limite: LIMITE, // bloco 3
  tipo: null, fonte: null, autor: null,                         // bloco 4
};
let QUESTOES = [], ANUAL = [];
const graficos = {};

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const cor = (d) => css(COR_VAR[d]);
const fmt = (n, c = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: c, minimumFractionDigits: 0 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const tag = (d) => `<span class="tag" style="--c:var(${COR_VAR[d]})">${d}</span>`;
const recorte = (q, v) => v === "todos" || q[M.campo] === (v === "sim");

// [2016, 2017, 2018, 2021] → "2016–2018, 2021"
function faixas(anos) {
  const grupos = [];
  for (const a of anos) {
    const g = grupos.at(-1);
    g && a === g[1] + 1 ? (g[1] = a) : grupos.push([a, a]);
  }
  return grupos.map(([i, f]) => (i === f ? i : `${i}–${f}`)).join(", ");
}

function contar(itens) {
  const m = new Map();
  for (const i of itens) m.set(i, (m.get(i) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0]));
}

// Questões dentro do filtro global (ano + disciplinas).
function base() {
  return QUESTOES.filter((q) =>
    estado.disc.has(q.disciplina) && (estado.ano === "todos" || q.ano === Number(estado.ano)));
}

const anosNoEscopo = () => (estado.ano === "todos" ? new Set(QUESTOES.map((q) => q.ano)).size : 1);
const escopoTexto = () => (estado.ano === "todos" ? "· 2015–2025" : `· ${estado.ano}`);

function baseOpcoes() {
  return {
    textStyle: { fontFamily: "Inter, system-ui, sans-serif", color: css("--ink") },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    tooltip: { trigger: "axis", backgroundColor: css("--surface"), borderColor: css("--line"), textStyle: { color: css("--ink") } },
    legend: { top: 0, left: 0, icon: "circle", textStyle: { color: css("--ink") } },
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

function grafico(id, opcoes, aoClicar) {
  const el = document.getElementById(id);
  if (!graficos[id]) {
    graficos[id] = echarts.init(el, null, { renderer: "svg" });
    if (aoClicar) graficos[id].on("click", (p) => aoClicar(p));
  }
  graficos[id].setOption(opcoes, true);
}

// Clicar numa disciplina isola ela no filtro global; clicar de novo volta para todas.
function isolarDisciplina(d) {
  const sozinha = estado.disc.size === 1 && estado.disc.has(d);
  estado.disc = new Set(sozinha ? DISCIPLINAS : [d]);
  document.querySelectorAll("#f-disc .chip").forEach((b) => b.setAttribute("aria-pressed", estado.disc.has(b.dataset.d)));
  estado.limite = LIMITE;
  atualizar();
}

/* ---------- Topo e filtros ---------- */

function renderKpis() {
  const anotadas = QUESTOES.length;
  const total = ANUAL.reduce((s, a) => s + a.total, 0);
  const brasil = QUESTOES.filter((q) => q[M.campo]).length / anotadas;
  const fontes = new Set(QUESTOES.map((q) => q.fonte).filter(Boolean)).size;
  document.getElementById("kpis").innerHTML = [
    [ANUAL.length, AREA.provas],
    [total === anotadas ? anotadas : total, total === anotadas ? "questões anotadas uma a uma" : `questões contadas, ${anotadas} anotadas uma a uma`],
    [`${fmt(brasil * 100, 0)}%`, M.kpi],
    [fontes, "fontes diferentes citadas"],
  ].map(([v, t]) => `<div class="kpi"><b>${v}</b><span>${t}</span></div>`).join("");
}

function renderFiltros() {
  const anos = [...new Set(QUESTOES.map((q) => q.ano))].sort((a, b) => b - a);
  const sel = document.getElementById("f-ano");
  sel.innerHTML = `<option value="todos">Todos (2015–2025)</option>` + anos.map((a) => `<option>${a}</option>`).join("");
  sel.onchange = () => { estado.ano = sel.value; estado.limite = LIMITE; atualizar(); };

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
    estado.limite = LIMITE;
    atualizar();
  };

  document.querySelectorAll(".seg").forEach((seg) => {
    seg.onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      estado[seg.dataset.key] = b.dataset.v;
      seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      estado.limite = LIMITE;
      atualizar();
    };
  });

  document.getElementById("f-materia").onchange = (e) => { estado.materia = e.target.value || null; estado.assunto = null; estado.limite = LIMITE; atualizar(); };
  document.getElementById("f-assunto").onchange = (e) => { estado.assunto = e.target.value || null; estado.limite = LIMITE; atualizar(); };
  document.getElementById("f-tipo").onchange = (e) => { estado.tipo = e.target.value || null; atualizar(); };

  document.querySelectorAll("[data-clear]").forEach((b) => {
    b.onclick = () => {
      if (b.dataset.clear === "materias") {
        Object.assign(estado, { materia: null, assunto: null, brasilM: "todos", busca: "", limite: LIMITE });
        document.getElementById("busca").value = "";
        document.querySelectorAll('[data-key="brasilM"] button').forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === "todos"));
      } else {
        Object.assign(estado, { tipo: null, fonte: null, autor: null });
      }
      atualizar();
    };
  });

  const busca = document.getElementById("busca");
  busca.oninput = () => { estado.busca = busca.value; estado.limite = LIMITE; renderQuestoes(); };
  document.getElementById("mais").onclick = () => { estado.limite += 60; renderQuestoes(); };
}

function opcoesSelect(id, rotuloTodos, valores, atual) {
  document.getElementById(id).innerHTML = `<option value="">${rotuloTodos}</option>` +
    valores.map(([v, c]) => `<option value="${esc(v)}"${v === atual ? " selected" : ""}>${esc(v)} (${c})</option>`).join("");
}

/* ---------- Bloco 1: disciplinas ---------- */

function renderDisciplinas() {
  grafico("c-disc-ano", {
    ...baseOpcoes(),
    xAxis: eixo({ type: "category", data: ANUAL.map((a) => a.ano), splitLine: { show: false } }),
    yAxis: eixo({ type: "value", minInterval: 1 }),
    series: DISCIPLINAS.filter((d) => estado.disc.has(d)).map((d) => ({
      name: d, type: "line", symbolSize: 7, color: cor(d), lineStyle: { width: 2.5 },
      data: ANUAL.map((a) => ({ value: a.disciplinas[d] || 0, symbol: a.fonte === "powerbi" ? "emptyCircle" : "circle" })),
      label: { show: estado.disc.size <= 2, position: "top", color: css("--muted"), fontSize: 11 },
    })),
  });

  const qs = base(), n = anosNoEscopo();
  grafico("c-disc-media", {
    ...baseOpcoes(),
    legend: { bottom: 0, left: "center", icon: "circle", itemGap: 12, selectedMode: false, textStyle: { color: css("--ink"), fontSize: 12 }, formatter: (n) => `${n}  ${fmt(+(qs.filter((q) => q.disciplina === n).length / anosNoEscopo()).toFixed(1))}` },
    tooltip: { trigger: "item", formatter: (p) => `${p.name}: ${fmt(p.value)} questões (${fmt(p.percent)}%)<br><small>Clique para isolar</small>` },
    series: [{
      type: "pie", radius: ["38%", "66%"], center: ["50%", "44%"], cursor: "pointer",
      data: DISCIPLINAS.filter((d) => estado.disc.has(d)).map((d) => ({
        name: d, value: +(qs.filter((q) => q.disciplina === d).length / n).toFixed(1), itemStyle: { color: cor(d) },
      })),
      label: { position: "inside", color: "#fff", fontSize: 11, fontWeight: 600, formatter: (p) => (p.percent >= 5 ? `${fmt(p.percent, 0)}%` : "") },
      itemStyle: { borderColor: css("--surface"), borderWidth: 2 },
    }],
  }, (p) => isolarDisciplina(p.name));
}

/* ---------- Bloco 2: Brasil ---------- */

function renderBrasil() {
  const todas = estado.disc.size === DISCIPLINAS.length;
  const linhas = todas ? ANUAL : ANUAL.filter((a) => a.fonte !== "powerbi").map((a) => {
    const qs = QUESTOES.filter((q) => q.ano === a.ano && estado.disc.has(q.disciplina));
    return { ano: a.ano, [M.campo]: qs.filter((q) => q[M.campo]).length, total: qs.length };
  });
  const mostra = (v) => estado.brasil === "todos" || estado.brasil === v;
  grafico("c-brasil-ano", {
    ...baseOpcoes(),
    xAxis: eixo({ type: "category", data: linhas.map((l) => l.ano), splitLine: { show: false } }),
    yAxis: eixo({ type: "value", minInterval: 1 }),
    series: [
      mostra("sim") && { name: M.sim, type: "line", color: css("--br-yes"), symbolSize: 6, lineStyle: { width: 2.5 }, data: linhas.map((l) => l[M.campo]) },
      mostra("nao") && { name: M.nao, type: "line", color: css("--br-no"), symbolSize: 6, lineStyle: { width: 2.5 }, data: linhas.map((l) => l.total - l[M.campo]) },
    ].filter(Boolean),
  });

  const qs = base(), n = anosNoEscopo();
  const discs = DISCIPLINAS.filter((d) => estado.disc.has(d));
  const media = (d, b) => +(qs.filter((q) => q.disciplina === d && q[M.campo] === b).length / n).toFixed(1);
  const rotulo = { show: true, position: "top", color: css("--muted"), formatter: (p) => fmt(p.value) };
  grafico("c-brasil-disc", {
    ...baseOpcoes(),
    tooltip: { ...baseOpcoes().tooltip, axisPointer: { type: "shadow" }, valueFormatter: (v) => fmt(v) },
    xAxis: eixo({ type: "category", data: discs, splitLine: { show: false }, triggerEvent: true }),
    yAxis: eixo({ type: "value" }),
    series: [
      mostra("nao") && { name: M.nao, type: "bar", color: css("--br-no"), barMaxWidth: 36, cursor: "pointer", data: discs.map((d) => media(d, false)), label: rotulo },
      mostra("sim") && { name: M.sim, type: "bar", color: css("--br-yes"), barMaxWidth: 36, cursor: "pointer", data: discs.map((d) => media(d, true)), label: rotulo },
    ].filter(Boolean),
  }, (p) => isolarDisciplina(p.name ?? p.value));

  // Matérias: em "Todas" mostra a proporção; em "No Brasil"/"Fora" mostra a média por prova daquele recorte.
  if (estado.brasil === "todos") {
    const minimo = estado.ano === "todos" ? 4 : 1;
    const props = contar(qs.map((q) => q.materia).filter(Boolean))
      .filter(([, c]) => c >= minimo)
      .map(([m, c]) => ({ m, p: qs.filter((q) => q.materia === m && q[M.campo]).length / c }))
      .sort((a, b) => b.p - a.p).slice(0, 20).reverse();
    grafico("c-materias-brasil", {
      ...baseOpcoes(),
      tooltip: { ...baseOpcoes().tooltip, axisPointer: { type: "shadow" }, valueFormatter: (v) => `${fmt(v, 0)}%` },
      xAxis: eixo({ type: "value", max: 100, axisLabel: { color: css("--muted"), formatter: "{value}%" } }),
      yAxis: eixo({ type: "category", data: props.map((x) => x.m), splitLine: { show: false }, axisLabel: { color: css("--ink"), width: 150, overflow: "truncate" } }),
      series: [
        { name: M.sim, type: "bar", stack: "p", color: css("--br-yes"), barMaxWidth: 18, data: props.map((x) => +(x.p * 100).toFixed(1)), label: { show: true, color: "#fff", fontSize: 11, formatter: (p) => (p.value >= 12 ? `${fmt(p.value, 0)}%` : "") } },
        { name: M.nao, type: "bar", stack: "p", color: css("--br-no"), barMaxWidth: 18, data: props.map((x) => +((1 - x.p) * 100).toFixed(1)), label: { show: true, color: "#fff", fontSize: 11, formatter: (p) => (p.value >= 12 ? `${fmt(p.value, 0)}%` : "") } },
      ],
    });
  } else {
    const sub = qs.filter((q) => recorte(q, estado.brasil));
    const top = contar(sub.map((q) => q.materia).filter(Boolean)).slice(0, 20).reverse();
    grafico("c-materias-brasil", {
      ...baseOpcoes(),
      legend: undefined,
      tooltip: { ...baseOpcoes().tooltip, axisPointer: { type: "shadow" }, valueFormatter: (v) => `${fmt(v, 2)} por prova` },
      xAxis: eixo({ type: "value" }),
      yAxis: eixo({ type: "category", data: top.map(([m]) => m), splitLine: { show: false }, axisLabel: { color: css("--ink"), width: 150, overflow: "truncate" } }),
      series: [{
        name: estado.brasil === "sim" ? M.sim : M.nao, type: "bar", barMaxWidth: 18,
        color: css(estado.brasil === "sim" ? "--br-yes" : "--br-no"),
        data: top.map(([, c]) => +(c / n).toFixed(2)),
        label: { show: true, position: "right", color: css("--muted"), formatter: (p) => fmt(p.value, 2) },
      }],
    });
  }
}

/* ---------- Bloco 3: matérias, assuntos e questões ---------- */

const bloco3 = () => base().filter((q) => recorte(q, estado.brasilM));
const temAssunto = (q) => !estado.assunto || q.assuntos.includes(estado.assunto);
const temMateria = (q) => !estado.materia || q.materia === estado.materia;

function renderMaterias() {
  const qs = bloco3(), n = anosNoEscopo();
  if (estado.materia && !qs.some((q) => q.materia === estado.materia)) estado.materia = null;

  opcoesSelect("f-materia", "Todas", contar(qs.map((q) => q.materia).filter(Boolean)), estado.materia);
  const escopoAssuntos = qs.filter(temMateria);
  if (estado.assunto && !escopoAssuntos.some((q) => q.assuntos.includes(estado.assunto))) estado.assunto = null;
  opcoesSelect("f-assunto", "Todos", contar(escopoAssuntos.flatMap((q) => [...new Set(q.assuntos)])), estado.assunto);
  document.querySelector('[data-clear="materias"]').hidden =
    !estado.materia && !estado.assunto && estado.brasilM === "todos" && !estado.busca;

  // Gráfico de matérias: respeita o assunto escolhido e destaca a matéria selecionada.
  const doGrafico = qs.filter(temAssunto);
  let top = contar(doGrafico.map((q) => q.materia).filter(Boolean)).slice(0, 20).map(([m]) => m);
  if (estado.materia && !top.includes(estado.materia)) top = [...top.slice(0, 19), estado.materia];
  top.reverse();
  const discs = DISCIPLINAS.filter((d) => estado.disc.has(d));
  grafico("c-materias", {
    ...baseOpcoes(),
    tooltip: { ...baseOpcoes().tooltip, axisPointer: { type: "shadow" }, valueFormatter: (v) => (v == null ? "—" : fmt(v, 2)) },
    xAxis: eixo({ type: "value" }),
    yAxis: eixo({
      type: "category", data: top, splitLine: { show: false }, triggerEvent: true,
      axisLabel: {
        width: 150, overflow: "truncate",
        color: css("--ink"),
        fontWeight: (v) => (v === estado.materia ? 700 : 400),
        formatter: (v) => (v === estado.materia ? `▸ ${v}` : v),
      },
    }),
    series: discs.map((d) => ({
      name: d, type: "bar", stack: "m", color: cor(d), barMaxWidth: 18, cursor: "pointer",
      data: top.map((m) => {
        const v = +(doGrafico.filter((q) => q.materia === m && q.disciplina === d).length / n).toFixed(2) || null;
        return { value: v, itemStyle: { opacity: !estado.materia || m === estado.materia ? 1 : 0.28 } };
      }),
    })),
  }, (p) => {
    const m = p.componentType === "yAxis" ? p.value : p.name;
    estado.materia = estado.materia === m ? null : m;
    estado.assunto = null;
    estado.limite = LIMITE;
    atualizar();
  });

  // Tabela de assuntos dentro da matéria escolhida.
  const assuntos = contar(escopoAssuntos.flatMap((q) => [...new Set(q.assuntos)])).slice(0, 60);
  document.getElementById("h-assuntos").textContent = estado.materia ? `· ${estado.materia}` : escopoTexto();
  const max = assuntos[0]?.[1] || 1;
  const t = document.getElementById("t-assuntos");
  t.innerHTML = `<thead><tr><th>Assunto</th><th>Disciplinas</th><th>Anos</th><th class="num">Questões</th></tr></thead><tbody>` +
    (assuntos.length ? assuntos.map(([a, c]) => {
      const rel = escopoAssuntos.filter((q) => q.assuntos.includes(a));
      const anos = faixas([...new Set(rel.map((q) => q.ano))].sort());
      const ds = [...new Set(rel.map((q) => q.disciplina))].map(tag).join(" ");
      return `<tr data-v="${esc(a)}"${a === estado.assunto ? ' class="sel"' : ""}><td>${esc(a)}<div class="bar" style="width:${(c / max) * 100}%"></div></td><td>${ds}</td><td>${anos}</td><td class="num">${c}</td></tr>`;
    }).join("") : `<tr><td colspan="4" class="empty">Sem assuntos anotados neste recorte.</td></tr>`) + "</tbody>";
  t.onclick = (e) => {
    const tr = e.target.closest("tr[data-v]");
    if (!tr) return;
    estado.assunto = estado.assunto === tr.dataset.v ? null : tr.dataset.v;
    estado.limite = LIMITE;
    atualizar();
  };

  renderQuestoes();
}

function renderQuestoes() {
  const termo = norm(estado.busca);
  const qs = bloco3().filter(temMateria).filter(temAssunto).filter((q) => !termo ||
    norm([q.materia, q.abordagem, q.fonte, q.assuntos.join(" ")].join(" ")).includes(termo))
    .sort((a, b) => b.ano - a.ano || a.q - b.q);
  const partes = [estado.materia, estado.assunto, estado.brasilM !== "todos" && (estado.brasilM === "sim" ? M.sim : M.nao).toLowerCase()].filter(Boolean);
  document.getElementById("h-questoes").textContent = partes.length ? `· ${partes.join(" · ")}` : escopoTexto();
  document.getElementById("busca-count").textContent = `${qs.length} questões`;
  document.querySelector("#t-questoes tbody").innerHTML = qs.length ? qs.slice(0, estado.limite).map((q) => `
    <tr>
      <td>${q.ano}${q.metodo === "ia" ? ' <span class="tag" title="Classificada com ajuda de IA, ainda sem revisão humana">IA</span>' : ""}</td>
      <td class="num">${q.q}</td>
      <td>${tag(q.disciplina)}</td>
      <td>${esc(q.materia)}</td>
      <td>${esc(q.abordagem || "—")}<div class="assuntos">${esc(q.assuntos.join(" · "))}</div></td>
      <td>${esc(q.fonte || "—")}</td>
      <td>${q[M.campo] ? M.icone : ""}</td>
    </tr>`).join("") : `<tr><td colspan="7" class="empty">Nenhuma questão neste filtro.</td></tr>`;
  document.getElementById("mais").hidden = qs.length <= estado.limite;
}

/* ---------- Bloco 4: fontes ---------- */

// "Título - Autor, Outro título - Autor B" → [{titulo, autor, tipo}]
function separarFontes(q) {
  const partes = q.fonte.split(/,\s(?=[^,]*(?: - |$))/).map((p) => {
    const i = p.lastIndexOf(" - ");
    return i > 0 ? { titulo: p.slice(0, i).trim(), autor: p.slice(i + 3).trim() } : { titulo: p.trim(), autor: "" };
  }).filter((f) => f.titulo);
  return partes.map((p, i) => ({ ...p, tipo: partes.length === q.tipos.length ? q.tipos[i] : q.tipos[0] }));
}

const autoresDe = (p) => p.autor.split(";").map((a) => a.trim()).filter((a) => a.length > 2);
const passaTipo = (p) => !estado.tipo || p.tipo === estado.tipo;
const passaFonte = (p) => !estado.fonte || (!p.autor && p.titulo === estado.fonte);
const passaAutor = (p) => !estado.autor || autoresDe(p).includes(estado.autor);

function renderFontes() {
  const partes = base().flatMap((q) => separarFontes(q).map((p) => ({ ...p, q })));
  const ativos = partes.filter((p) => passaTipo(p) && passaFonte(p) && passaAutor(p));

  opcoesSelect("f-tipo", "Todos", contar(partes.filter((p) => passaFonte(p) && passaAutor(p)).map((p) => p.tipo).filter((t) => TIPOS.includes(t))), estado.tipo);
  const pills = [estado.fonte && ["fonte", `Fonte: ${estado.fonte}`], estado.autor && ["autor", `Autor: ${estado.autor}`]].filter(Boolean);
  const pEl = document.getElementById("p-fontes");
  pEl.innerHTML = pills.map(([k, t]) => `<button type="button" class="pill" data-k="${k}">${esc(t)}</button>`).join("");
  pEl.onclick = (e) => { const b = e.target.closest(".pill"); if (b) { estado[b.dataset.k] = null; atualizar(); } };
  document.querySelector('[data-clear="fontes"]').hidden = !estado.tipo && !estado.fonte && !estado.autor;

  const tipos = contar(partes.filter((p) => passaFonte(p) && passaAutor(p)).map((p) => p.tipo)).filter(([t]) => TIPOS.includes(t));
  const paleta = [css("--hist"), css("--soc"), css("--filo"), css("--geo"), css("--br-yes"), css("--muted"), css("--br-no")];
  grafico("c-tipos", {
    ...baseOpcoes(),
    legend: { bottom: 0, left: "center", icon: "circle", itemGap: 12, selectedMode: false, textStyle: { color: css("--ink"), fontSize: 12 }, formatter: (n) => `${n}  ${tipos.find(([t]) => t === n)?.[1] ?? ""}` },
    tooltip: { trigger: "item", formatter: (p) => `${p.name}: ${p.value} (${fmt(p.percent)}%)<br><small>Clique para filtrar</small>` },
    series: [{
      type: "pie", radius: ["38%", "66%"], center: ["50%", "42%"], cursor: "pointer",
      data: tipos.map(([t, c], i) => ({
        name: t, value: c,
        itemStyle: { color: paleta[i % paleta.length], opacity: !estado.tipo || estado.tipo === t ? 1 : 0.3 },
      })),
      label: { position: "inside", color: "#fff", fontSize: 11, fontWeight: 600, formatter: (p) => (p.percent >= 5 ? `${fmt(p.percent, 0)}%` : "") },
      itemStyle: { borderColor: css("--surface"), borderWidth: 2 },
    }],
  }, (p) => { estado.tipo = estado.tipo === p.name ? null : p.name; atualizar(); });

  const tabela = (id, titulo, linhas, atual, chave) => {
    const t = document.getElementById(id);
    t.innerHTML = `<thead><tr><th>${titulo}</th><th class="num">Questões</th></tr></thead><tbody>` +
      (linhas.length ? linhas.map(([n, c]) => `<tr data-v="${esc(n)}"${n === atual ? ' class="sel"' : ""}><td>${esc(n)}</td><td class="num">${c}</td></tr>`).join("")
        : `<tr><td colspan="2" class="empty">Nada neste filtro.</td></tr>`) + "</tbody>";
    t.onclick = (e) => {
      const tr = e.target.closest("tr[data-v]");
      if (!tr) return;
      estado[chave] = estado[chave] === tr.dataset.v ? null : tr.dataset.v;
      atualizar();
    };
  };
  tabela("t-fontes", "Fonte", contar(partes.filter((p) => !p.autor && passaTipo(p) && passaAutor(p)).map((p) => p.titulo)).slice(0, 30), estado.fonte, "fonte");
  tabela("t-autores", "Autor", contar(partes.filter((p) => passaTipo(p) && passaFonte(p)).flatMap(autoresDe)).slice(0, 30), estado.autor, "autor");

  // Abordagens das questões que batem com os filtros do bloco.
  const qs = [...new Map(ativos.map((p) => [`${p.q.ano}-${p.q.q}`, p.q])).values()]
    .filter((q) => q.abordagem).sort((a, b) => b.ano - a.ano || a.q - b.q);
  const filtro = [estado.tipo, estado.fonte, estado.autor].filter(Boolean).join(" · ");
  document.getElementById("h-abordagens").textContent = `· ${qs.length} questões${filtro ? ` · ${filtro}` : ""}`;
  document.getElementById("t-abordagens").innerHTML =
    `<thead><tr><th>Abordagem</th><th>Fonte</th><th>Disciplina</th><th class="num">Ano</th></tr></thead><tbody>` +
    qs.slice(0, 80).map((q) => `<tr><td>${esc(q.abordagem)}</td><td>${esc(q.fonte)}</td><td>${tag(q.disciplina)}</td><td class="num">${q.ano}</td></tr>`).join("") + "</tbody>";
}

/* ---------- Orquestração ---------- */

function atualizar() {
  document.querySelectorAll("[data-scope]").forEach((el) => (el.textContent = escopoTexto()));
  document.getElementById("f-note").textContent = estado.disc.size < DISCIPLINAS.length && ANUAL.some((a) => a.fonte === "powerbi")
    ? "Com filtro de disciplina, o gráfico do Brasil por ano mostra só 2015–2025." : "";
  renderDisciplinas();
  renderBrasil();
  renderMaterias();
  renderFontes();
}

async function iniciar() {
  [QUESTOES, ANUAL] = await Promise.all([
    fetch(AREA.dados[0]).then((r) => r.json()),
    fetch(AREA.dados[1]).then((r) => r.json()),
  ]);
  renderKpis();
  renderFiltros();
  atualizar();
  window.addEventListener("resize", () => Object.values(graficos).forEach((g) => g.resize()));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", atualizar);
}

iniciar();
