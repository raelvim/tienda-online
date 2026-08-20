/* =========================================================
   ui.js
   Utilidades visuales compartidas: notificaciones (toasts),
   formato de moneda y confirmaciones. Sistema visual de control
   para que siempre se vea feedback de cada acción.
   ========================================================= */

function formatearDinero(numero) {
  const valor = Number(numero) || 0;
  const moneda =
    typeof obtenerMonedaCache === "function"
      ? obtenerMonedaCache()
      : { simbolo: "$", locale: "es-MX" };
  return (
    moneda.simbolo +
    valor.toLocaleString(moneda.locale, { maximumFractionDigits: 2 })
  );
}

function mostrarToast(mensaje, tipo = "info") {
  let contenedor = document.getElementById("toast-container");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toast-container";
    document.body.appendChild(contenedor);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${tipo}`;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function formatearFecha(iso) {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}
