// Página inicial: atualiza as três matérias que mais caem em cada área e o total de questões.
// O HTML já traz os valores atuais, então a página funciona mesmo se os dados não carregarem.
const contar = (lista) => {
  const m = new Map();
  for (const i of lista) if (i) m.set(i, (m.get(i) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function iniciar() {
  const [h, l, e] = await Promise.all(["questoes", "questoes_linguagens", "questoes_exatas"]
    .map((n) => fetch(`data/${n}.json`).then((r) => r.json())));
  const areas = {
    humanas: h,
    linguagens: l.filter((q) => !q.esp),
    matematica: e.filter((q) => q.disciplina === "Matemática"),
    natureza: e.filter((q) => q.disciplina !== "Matemática"),
  };
  for (const [area, qs] of Object.entries(areas)) {
    const el = document.querySelector(`[data-top="${area}"]`);
    if (el) el.innerHTML = contar(qs.map((q) => q.materia)).slice(0, 3)
      .map(([m, c]) => `<span><b>${esc(m)}</b> ${c}</span>`).join("");
  }
  const total = Object.values(areas).reduce((s, qs) => s + qs.length, 0);
  document.querySelector("#numeros b").textContent = total.toLocaleString("pt-BR");
}

iniciar().catch(() => { /* sem os dados, fica o texto que já está no HTML */ });
