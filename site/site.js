// Comportamentos comuns a todas as páginas: o grifo animado da aba clicada e o aparecer ao rolar.
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Abas ---------- */

const abas = document.querySelector(".abas");
const centralizar = (a, suave) => {
  if (!abas || !a || abas.scrollWidth <= abas.clientWidth) return;
  abas.scrollTo({ left: a.offsetLeft - (abas.clientWidth - a.offsetWidth) / 2, behavior: suave ? "smooth" : "instant" });
};

if (abas) {
  const atual = abas.querySelector('[aria-current="page"]');
  centralizar(atual, false);  // no celular, a aba da página fica à vista

  abas.addEventListener("click", (ev) => {
    const a = ev.target.closest("a");
    if (!a || a === atual || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    if (calmo) return;  // sem animação: navega direto
    ev.preventDefault();
    atual?.removeAttribute("aria-current");  // o grifo antigo recolhe…
    a.classList.add("grifando");             // …e o novo é riscado
    centralizar(a, true);
    setTimeout(() => { location.href = a.href; }, 300);
  });

  // Voltar pelo navegador pode trazer esta página do cache já com o grifo trocado: desfaz.
  addEventListener("pageshow", (ev) => {
    if (!ev.persisted) return;
    abas.querySelectorAll(".grifando").forEach((a) => a.classList.remove("grifando"));
    atual?.setAttribute("aria-current", "page");
    centralizar(atual, false);
  });
}

/* ---------- Aparecer ao rolar ---------- */

const SELETORES = [
  "main > section > h2", "main > section > .section-lede", "main > section > .group-filters",
  ".fig", ".area-linha", ".prosa > *", ".numeros li", ".prose > section > *", ".sim-config .folha",
].join(",");

function revelar(raiz = document) {
  if (calmo || !("IntersectionObserver" in window)) return;
  const io = revelar.io ||= new IntersectionObserver((itens) => {
    for (const it of itens) {
      if (!it.isIntersecting) continue;
      it.target.classList.add("visto");
      io.unobserve(it.target);
    }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

  const contagem = new Map();
  for (const el of raiz.querySelectorAll(SELETORES)) {
    if (el.classList.contains("revelar")) continue;
    if (el.getBoundingClientRect().top < innerHeight) continue;  // o que já está na tela fica como está
    // irmãos que entram juntos (figuras de uma grade, linhas de uma lista) aparecem em sequência curta
    const n = contagem.get(el.parentElement) || 0;
    contagem.set(el.parentElement, n + 1);
    el.style.setProperty("--atraso", `${Math.min(n, 3) * 70}ms`);
    el.classList.add("revelar");
    io.observe(el);
  }
}

revelar();
