/* =========================================================
   store.js
   Lógica de la tienda pública: catálogo, favoritos y carrito.
   ========================================================= */

let vistaActual = "tienda";
let textoBusqueda = "";

document.addEventListener("DOMContentLoaded", () => {
  renderizarProductos();
  actualizarContadores();

  document.getElementById("input-buscar").addEventListener("input", (e) => {
    textoBusqueda = e.target.value.trim().toLowerCase();
    renderizarProductos();
  });

  document.querySelectorAll(".pestana").forEach((boton) => {
    boton.addEventListener("click", () => cambiarVista(boton.dataset.vista));
  });

  document
    .getElementById("btn-abrir-carrito")
    .addEventListener("click", abrirCarrito);
  document
    .getElementById("btn-abrir-favoritos")
    .addEventListener("click", () => cambiarVista("favoritos"));
  document
    .getElementById("btn-cerrar-carrito")
    .addEventListener("click", cerrarCarrito);
  document
    .getElementById("fondo-oscuro")
    .addEventListener("click", cerrarCarrito);
  document
    .getElementById("btn-finalizar")
    .addEventListener("click", finalizarCompra);

  document
    .querySelectorAll('input[name="forma-entrega"]')
    .forEach((input) =>
      input.addEventListener("change", () => cambiarFormaEntrega(input.value)),
    );
  document
    .getElementById("input-direccion-envio")
    .addEventListener("input", (e) => {
      guardarConfigEntrega({ metodo: "domicilio", direccion: e.target.value });
    });
});

function cambiarFormaEntrega(metodo) {
  const direccion = document.getElementById("input-direccion-envio").value;
  guardarConfigEntrega({ metodo, direccion });
  aplicarFormaEntregaUI();
  renderizarCarrito();
}

function aplicarFormaEntregaUI() {
  const config = obtenerConfigEntrega();
  const esRetiro = config.metodo === "retiro";

  document.getElementById("entrega-domicilio").checked = !esRetiro;
  document.getElementById("entrega-retiro").checked = esRetiro;
  document.getElementById("input-direccion-envio").value =
    config.direccion || "";

  document.getElementById("campo-direccion-envio").style.display = esRetiro
    ? "none"
    : "flex";

  const textoLocal = document.getElementById("texto-direccion-local");
  const direccionLocal = obtenerDireccionLocal();
  if (esRetiro) {
    textoLocal.style.display = "block";
    textoLocal.textContent = direccionLocal
      ? `📍 Retirás en: ${direccionLocal}`
      : "📍 El local aún no configuró una dirección de retiro.";
  } else {
    textoLocal.style.display = "none";
  }
}

function cambiarVista(vista) {
  vistaActual = vista;
  document.querySelectorAll(".pestana").forEach((b) => {
    b.classList.toggle("pestana--activa", b.dataset.vista === vista);
  });
  document.getElementById("titulo-vista").textContent =
    vista === "tienda" ? "Catálogo" : "Mis favoritos";
  renderizarProductos();
}

function renderizarProductos() {
  const grid = document.getElementById("grid-productos");
  let productos = obtenerProductos();

  if (vistaActual === "favoritos") {
    const favoritos = obtenerFavoritos();
    productos = productos.filter((p) => favoritos.includes(p.id));
  }

  if (textoBusqueda) {
    productos = productos.filter((p) =>
      p.nombre.toLowerCase().includes(textoBusqueda),
    );
  }

  if (!productos.length) {
    grid.innerHTML = `
      <div class="estado-vacio" style="grid-column: 1/-1;">
        <div class="estado-vacio__icono">${vistaActual === "favoritos" ? "💔" : "📦"}</div>
        <p>${
          vistaActual === "favoritos"
            ? "Aún no tienes productos favoritos."
            : "Todavía no hay productos cargados en la tienda."
        }</p>
      </div>`;
    return;
  }

  grid.innerHTML = productos.map((p) => tarjetaProductoHTML(p)).join("");

  grid.querySelectorAll("[data-agregar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      agregarACarrito(btn.dataset.agregar);
      actualizarContadores();
      mostrarToast("Producto agregado al carrito", "exito");
    });
  });

  grid.querySelectorAll("[data-favorito]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activo = alternarFavorito(btn.dataset.favorito);
      mostrarToast(activo ? "Agregado a favoritos" : "Quitado de favoritos");
      actualizarContadores();
      renderizarProductos();
    });
  });
}

function tarjetaProductoHTML(producto) {
  const favorito = esFavorito(producto.id);
  const imagen = producto.imagen || imagenMarcador();
  return `
    <div class="tarjeta-producto">
      <button class="boton-favorito ${favorito ? "boton-favorito--activo" : ""}" data-favorito="${producto.id}" title="Guardar en favoritos">
        ${favorito ? "❤️" : "🤍"}
      </button>
      <img class="tarjeta-producto__imagen" src="${imagen}" alt="${escaparHtml(producto.nombre)}" />
      <div class="tarjeta-producto__cuerpo">
        <div class="tarjeta-producto__nombre">${escaparHtml(producto.nombre)}</div>
        <div class="tarjeta-producto__desc">${escaparHtml(producto.descripcion)}</div>
        <span class="tarjeta-producto__envio">🚚 ${escaparHtml(producto.formaEnvio)}</span>
        <div class="tarjeta-producto__precio">${formatearDinero(producto.precio)}</div>
        <div class="tarjeta-producto__acciones">
          <button class="boton boton--primario boton--bloque" data-agregar="${producto.id}">Agregar al carrito</button>
        </div>
      </div>
    </div>`;
}

function imagenMarcador() {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='300' height='160'>
      <rect width='100%' height='100%' fill='#eef1f4'/>
      <text x='50%' y='50%' font-size='16' fill='#9aa4ad' text-anchor='middle' dominant-baseline='middle'>Sin imagen</text>
    </svg>`)
  );
}

/* ---------- Carrito ---------- */
function abrirCarrito() {
  aplicarFormaEntregaUI();
  renderizarCarrito();
  document
    .getElementById("panel-carrito")
    .classList.add("panel-lateral--abierto");
  document
    .getElementById("fondo-oscuro")
    .classList.add("fondo-oscuro--visible");
}

function cerrarCarrito() {
  document
    .getElementById("panel-carrito")
    .classList.remove("panel-lateral--abierto");
  document
    .getElementById("fondo-oscuro")
    .classList.remove("fondo-oscuro--visible");
}

function renderizarCarrito() {
  const lista = document.getElementById("lista-carrito");
  const items = obtenerCarritoDetallado();

  if (!items.length) {
    lista.innerHTML = `
      <div class="estado-vacio">
        <div class="estado-vacio__icono">🛒</div>
        <p>Tu carrito está vacío.</p>
      </div>`;
  } else {
    lista.innerHTML = items
      .map(
        (item) => `
      <div class="item-carrito">
        <img class="item-carrito__imagen" src="${item.imagen || imagenMarcador()}" alt="" />
        <div class="item-carrito__info">
          <div class="item-carrito__nombre">${escaparHtml(item.nombre)}</div>
          <div class="item-carrito__precio">${formatearDinero(item.precio)} c/u</div>
          <div class="selector-cantidad">
            <button data-restar="${item.id}">−</button>
            <span>${item.cantidad}</span>
            <button data-sumar="${item.id}">+</button>
            <button data-quitar="${item.id}" title="Quitar" style="margin-left:auto;color:#d93025;border-color:#d93025;">🗑</button>
          </div>
        </div>
      </div>`,
      )
      .join("");

    lista.querySelectorAll("[data-sumar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = items.find((i) => i.id === btn.dataset.sumar);
        actualizarCantidadCarrito(btn.dataset.sumar, item.cantidad + 1);
        renderizarCarrito();
        actualizarContadores();
      }),
    );
    lista.querySelectorAll("[data-restar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = items.find((i) => i.id === btn.dataset.restar);
        actualizarCantidadCarrito(btn.dataset.restar, item.cantidad - 1);
        renderizarCarrito();
        actualizarContadores();
      }),
    );
    lista.querySelectorAll("[data-quitar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        quitarDelCarrito(btn.dataset.quitar);
        renderizarCarrito();
        actualizarContadores();
        mostrarToast("Producto quitado del carrito");
      }),
    );
  }

  actualizarResumen(items);
}

function actualizarResumen(items) {
  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);
  const esRetiro = obtenerConfigEntrega().metodo === "retiro";
  const envio = esRetiro ? 0 : calcularCostoEnvio(cantidadTotal);
  const total = subtotal + envio;

  document.getElementById("resumen-subtotal").textContent =
    formatearDinero(subtotal);
  document.getElementById("resumen-envio").textContent = esRetiro
    ? "Retiro en el local"
    : envio === 0
      ? "Gratis"
      : formatearDinero(envio);
  document.getElementById("resumen-total").textContent = formatearDinero(total);
  document.getElementById("btn-finalizar").disabled = items.length === 0;
}

function actualizarContadores() {
  const totalCarrito = obtenerCarrito().reduce((acc, i) => acc + i.cantidad, 0);
  document.getElementById("contador-carrito").textContent = totalCarrito;
  document.getElementById("contador-favoritos").textContent =
    obtenerFavoritos().length;
}

function finalizarCompra() {
  const items = obtenerCarritoDetallado();
  if (!items.length) return;

  const config = obtenerConfigEntrega();
  const esRetiro = config.metodo === "retiro";
  if (!esRetiro && !config.direccion.trim()) {
    mostrarToast("Ingresá una dirección de envío para continuar", "error");
    document.getElementById("input-direccion-envio").focus();
    return;
  }

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);
  const envio = esRetiro ? 0 : calcularCostoEnvio(cantidadTotal);
  const total = subtotal + envio;
  const entregaTexto = esRetiro
    ? "retiro en el local"
    : `envío a domicilio (${config.direccion})`;

  registrarActividad(
    `Compra realizada por ${formatearDinero(total)} (${cantidadTotal} unidades, ${entregaTexto})`,
  );
  vaciarCarrito();
  renderizarCarrito();
  actualizarContadores();
  mostrarToast("¡Gracias por tu compra! 🎉", "exito");
  cerrarCarrito();
}
