const DISC = {
  humanas: ["História", "Geografia", "Filosofia", "Sociologia"],
  exatas: ["Matemática", "Física", "Química", "Biologia"],
};
const COR = {
  "História": "--hist", "Geografia": "--geo", "Filosofia": "--filo", "Sociologia": "--soc",
  "Matemática": "--mat", "Física": "--fis", "Química": "--qui", "Biologia": "--bio",
};
const LETRAS = ["A", "B", "C", "D", "E"];
const CHAVE_HISTORICO = "simulado-enem-historico";

let BANCO = [];
const filtro = { area: "todas", disc: new Set([...DISC.humanas, ...DISC.exatas]), de: 2015, ate: 2025, materias: null, qtd: 10 };
let sessao = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tag = (d) => `<span class="tag" style="--c:var(${COR[d]})">${d}</span>`;
const norm = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function lerHistorico() {
  try { return JSON.parse(localStorage.getItem(CHAVE_HISTORICO)) || { feitas: 0, acertos: 0 }; } catch { return { feitas: 0, acertos: 0 }; }
}
function salvarHistorico(h) {
  try { localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(h)); } catch { /* navegação privada: segue sem salvar */ }
}

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Configuração ---------- */

function disciplinasDaArea() {
  return filtro.area === "todas" ? [...DISC.humanas, ...DISC.exatas] : DISC[filtro.area];
}

// Questões que passam por área, disciplina e anos (antes do filtro de matéria).
function preFiltradas() {
  const discs = new Set(disciplinasDaArea().filter((d) => filtro.disc.has(d)));
  return BANCO.filter((q) => discs.has(q.disciplina) && q.ano >= filtro.de && q.ano <= filtro.ate);
}

function pool() {
  return preFiltradas().filter((q) => !filtro.materias || filtro.materias.has(`${q.disciplina}|${q.materia}`));
}

function renderDisciplinas() {
  $("s-disc").innerHTML = disciplinasDaArea().map((d) =>
    `<button class="chip" type="button" data-d="${d}" aria-pressed="${filtro.disc.has(d)}" style="--c:var(${COR[d]})"><i></i>${d}</button>`).join("");
}

function renderMaterias() {
  const termo = norm($("s-busca-mat").value || "");
  const contagem = new Map();
  for (const q of preFiltradas()) {
    const k = `${q.disciplina}|${q.materia}`;
    contagem.set(k, (contagem.get(k) || 0) + 1);
  }
  const grupos = {};
  for (const [k, n] of contagem) {
    const [d, m] = k.split("|");
    if (termo && !norm(m).includes(termo)) continue;
    (grupos[d] ||= []).push([m, n, k]);
  }
  const html = disciplinasDaArea().filter((d) => grupos[d]).map((d) => `
    <fieldset class="sim-grupo">
      <legend>${tag(d)}</legend>
      ${grupos[d].sort((a, b) => b[1] - a[1]).map(([m, n, k]) => `
        <label class="sim-check"><input type="checkbox" value="${esc(k)}" ${!filtro.materias || filtro.materias.has(k) ? "checked" : ""}>
          <span>${esc(m)}</span><small>${n}</small></label>`).join("")}
    </fieldset>`).join("");
  $("s-materias").innerHTML = html || `<p class="empty">Nenhuma matéria encontrada.</p>`;
  atualizarDisponiveis();
}

function atualizarDisponiveis() {
  const n = pool().length;
  $("s-disponiveis").textContent = `${n} questões disponíveis com esses filtros`;
  $("s-comecar").disabled = n === 0;
}

function renderHistorico() {
  const h = lerHistorico();
  $("s-historico").textContent = h.feitas
    ? `Seu histórico neste navegador: ${h.acertos} acertos em ${h.feitas} questões (${Math.round((h.acertos / h.feitas) * 100)}%).`
    : "";
}

function ligarConfiguracao() {
  const anos = [...new Set(BANCO.map((q) => q.ano))].sort();
  $("s-de").innerHTML = anos.map((a) => `<option ${a === filtro.de ? "selected" : ""}>${a}</option>`).join("");
  $("s-ate").innerHTML = anos.map((a) => `<option ${a === filtro.ate ? "selected" : ""}>${a}</option>`).join("");
  $("s-de").onchange = (e) => { filtro.de = +e.target.value; if (filtro.de > filtro.ate) { filtro.ate = filtro.de; $("s-ate").value = filtro.ate; } renderMaterias(); };
  $("s-ate").onchange = (e) => { filtro.ate = +e.target.value; if (filtro.ate < filtro.de) { filtro.de = filtro.ate; $("s-de").value = filtro.de; } renderMaterias(); };

  segmentado("s-area", (v) => { filtro.area = v; filtro.materias = null; renderDisciplinas(); renderMaterias(); });
  segmentado("s-qtd", (v) => { filtro.qtd = +v; });

  $("s-disc").onclick = (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const d = b.dataset.d;
    const ativas = disciplinasDaArea().filter((x) => filtro.disc.has(x));
    if (filtro.disc.has(d) && ativas.length === 1) return;
    filtro.disc.has(d) ? filtro.disc.delete(d) : filtro.disc.add(d);
    b.setAttribute("aria-pressed", filtro.disc.has(d));
    renderMaterias();
  };

  $("s-materias").onchange = (e) => {
    if (e.target.type !== "checkbox") return;
    if (!filtro.materias) filtro.materias = new Set([...$("s-materias").querySelectorAll("input")].map((i) => i.value)
      .concat(preFiltradas().map((q) => `${q.disciplina}|${q.materia}`)));
    e.target.checked ? filtro.materias.add(e.target.value) : filtro.materias.delete(e.target.value);
    atualizarDisponiveis();
  };
  $("s-busca-mat").oninput = renderMaterias;
  $("s-todas-mat").onclick = () => { filtro.materias = null; renderMaterias(); };
  $("s-nenhuma-mat").onclick = () => { filtro.materias = new Set(); renderMaterias(); };
  $("s-comecar").onclick = comecar;
}

function segmentado(id, aoMudar) {
  $(id).onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $(id).querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    aoMudar(b.dataset.v);
  };
}

/* ---------- Prova ---------- */

function comecar() {
  const sorteadas = embaralhar(pool());
  const fila = filtro.qtd ? sorteadas.slice(0, filtro.qtd) : sorteadas;
  sessao = { fila, i: 0, escolha: null, respondida: false, respostas: [] };
  mostrar("prova");
  renderQuestao();
}

function mostrar(secao) {
  for (const s of ["config", "prova", "resultado"]) $(s).hidden = s !== secao;
  window.scrollTo({ top: document.querySelector("main").offsetTop - 12, behavior: "smooth" });
}

function renderQuestao() {
  const q = sessao.fila[sessao.i];
  const total = sessao.fila.length;
  sessao.escolha = null;
  sessao.respondida = false;
  $("p-contador").textContent = `Questão ${sessao.i + 1} de ${total}`;
  const acertos = sessao.respostas.filter((r) => r.certa).length;
  $("p-placar").textContent = sessao.respostas.length ? `${acertos} de ${sessao.respostas.length} certas` : "";
  $("p-barra").style.width = `${(sessao.i / total) * 100}%`;
  $("p-meta").innerHTML = `ENEM ${q.ano} · questão ${q.q} · ${tag(q.disciplina)} <span class="sim-materia">${esc(q.materia)}</span>`;
  const img = $("p-img");
  img.src = `questoes/${q.area}/${q.ano}-${q.q}.webp`;
  img.alt = `Questão ${q.q} do ENEM ${q.ano} (${q.disciplina}, ${q.materia})`;
  $("p-alts").innerHTML = LETRAS.map((l) => `<button type="button" class="sim-alt" data-l="${l}">${l}</button>`).join("");
  $("p-feedback").hidden = true;
  $("p-confirmar").textContent = "Confirmar";
  $("p-confirmar").disabled = true;
  $("p-pular").hidden = false;
  // pré-carrega a próxima imagem
  const prox = sessao.fila[sessao.i + 1];
  if (prox) new Image().src = `questoes/${prox.area}/${prox.ano}-${prox.q}.webp`;
}

function escolher(l) {
  if (sessao.respondida) return;
  sessao.escolha = l;
  $("p-alts").querySelectorAll(".sim-alt").forEach((b) => b.classList.toggle("sel", b.dataset.l === l));
  $("p-confirmar").disabled = false;
}

function confirmar() {
  if (sessao.respondida) return proxima();
  if (!sessao.escolha) return;
  const q = sessao.fila[sessao.i];
  const certa = sessao.escolha === q.gab;
  sessao.respondida = true;
  sessao.respostas.push({ q, escolha: sessao.escolha, certa });
  const h = lerHistorico();
  salvarHistorico({ feitas: h.feitas + 1, acertos: h.acertos + (certa ? 1 : 0) });

  $("p-alts").querySelectorAll(".sim-alt").forEach((b) => {
    b.classList.toggle("certa", b.dataset.l === q.gab);
    b.classList.toggle("errada", b.dataset.l === sessao.escolha && !certa);
    b.disabled = true;
  });
  const fb = $("p-feedback");
  fb.className = `sim-feedback ${certa ? "ok" : "erro"}`;
  fb.innerHTML = `<strong>${certa ? "Resposta certa!" : `Resposta errada. A correta é a ${q.gab}.`}</strong>
    ${q.abordagem ? `<p>${esc(q.abordagem)}</p>` : ""}
    ${q.assuntos.length ? `<p class="assuntos">${esc(q.assuntos.join(" · "))}</p>` : ""}`;
  fb.hidden = false;
  $("p-pular").hidden = true;
  $("p-confirmar").textContent = sessao.i + 1 < sessao.fila.length ? "Próxima questão" : "Ver resultado";
  $("p-placar").textContent = `${sessao.respostas.filter((r) => r.certa).length} de ${sessao.respostas.length} certas`;
}

function proxima() {
  sessao.i += 1;
  if (sessao.i >= sessao.fila.length) return resultado();
  renderQuestao();
  window.scrollTo({ top: $("prova").offsetTop - 12, behavior: "smooth" });
}

/* ---------- Resultado ---------- */

function resultado() {
  const rs = sessao.respostas;
  const acertos = rs.filter((r) => r.certa).length;
  const pct = rs.length ? Math.round((acertos / rs.length) * 100) : 0;
  $("r-titulo").textContent = rs.length ? `Você acertou ${acertos} de ${rs.length} questões (${pct}%)` : "Nenhuma questão respondida";
  $("r-kpis").innerHTML = [
    [rs.length, "respondidas"], [acertos, "certas"], [rs.length - acertos, "erradas"], [`${pct}%`, "aproveitamento"],
  ].map(([v, t]) => `<div class="kpi"><b>${v}</b><span>${t}</span></div>`).join("");

  const porMateria = new Map();
  for (const r of rs) {
    const k = `${r.q.disciplina}|${r.q.materia}`;
    const v = porMateria.get(k) || { d: r.q.disciplina, m: r.q.materia, n: 0, c: 0 };
    v.n += 1; v.c += r.certa ? 1 : 0;
    porMateria.set(k, v);
  }
  const linhas = [...porMateria.values()].sort((a, b) => a.c / a.n - b.c / b.n || b.n - a.n);
  $("r-materias").innerHTML = `<thead><tr><th>Matéria</th><th>Disciplina</th><th class="num">Certas</th><th class="num">%</th></tr></thead><tbody>` +
    linhas.map((v) => `<tr><td>${esc(v.m)}</td><td>${tag(v.d)}</td><td class="num">${v.c}/${v.n}</td><td class="num">${Math.round((v.c / v.n) * 100)}%</td></tr>`).join("") + "</tbody>";

  const erros = rs.filter((r) => !r.certa);
  $("r-erros").innerHTML = erros.length ? erros.map((r) => `
    <details class="sim-erro">
      <summary>ENEM ${r.q.ano} · questão ${r.q.q} · ${esc(r.q.materia)} — você marcou ${r.escolha}, a certa é ${r.q.gab}</summary>
      <img src="questoes/${r.q.area}/${r.q.ano}-${r.q.q}.webp" alt="Questão ${r.q.q} do ENEM ${r.q.ano}" loading="lazy">
      ${r.q.abordagem ? `<p>${esc(r.q.abordagem)}</p>` : ""}
    </details>`).join("") : `<p class="empty">Nenhum erro. Mandou bem!</p>`;
  renderHistorico();
  mostrar("resultado");
}

/* ---------- Início ---------- */

async function iniciar() {
  const [h, e] = await Promise.all([
    fetch("data/questoes.json").then((r) => r.json()),
    fetch("data/questoes_exatas.json").then((r) => r.json()),
  ]);
  // Questões anuladas ou sem gabarito ficam de fora do simulado.
  BANCO = [...h.map((q) => ({ ...q, area: "humanas" })), ...e.map((q) => ({ ...q, area: "exatas" }))]
    .filter((q) => LETRAS.includes(q.gab));
  ligarConfiguracao();
  renderDisciplinas();
  renderMaterias();
  renderHistorico();

  $("p-alts").onclick = (ev) => { const b = ev.target.closest(".sim-alt"); if (b) escolher(b.dataset.l); };
  $("p-confirmar").onclick = confirmar;
  $("p-pular").onclick = proxima;
  $("p-encerrar").onclick = resultado;
  $("r-novo").onclick = comecar;
  $("r-config").onclick = () => mostrar("config");
  document.addEventListener("keydown", (ev) => {
    if ($("prova").hidden || ev.target.matches("input, select, textarea")) return;
    const l = ev.key.toUpperCase();
    if (LETRAS.includes(l)) escolher(l);
    else if (ev.key === "Enter" && !$("p-confirmar").disabled) confirmar();
  });
}

iniciar();
