/* =========================================================
   store.js
   Lógica de la tienda pública: catálogo, favoritos y carrito.
   AHORA CON API (MongoDB)
   ========================================================= */

let vistaActual = "tienda";
let textoBusqueda = "";
let productosGlobales = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Renderizar estado de sesión
  renderizarUsuario();

  // Cargar config de moneda (para formatear precios)
  await obtenerConfigMoneda();

  // Cargar productos desde la API
  await cargarProductosIniciales();

  // Renderizar la tienda
  renderizarProductos();
  actualizarContadores();

  // Event listeners
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
    .addEventListener("click", () => {
      if (!haySesionCliente() && !haySesionAdmin()) {
        mostrarToast("Iniciá sesión para ver tus favoritos", "error");
        abrirLogin();
        return;
      }
      cambiarVista("favoritos");
    });
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

  // Modal login/registro
  document
    .getElementById("btn-mostrar-login")
    .addEventListener("click", abrirLogin);
  document
    .getElementById("btn-cerrar-login")
    .addEventListener("click", cerrarLogin);
  document
    .getElementById("fondo-oscuro-login")
    .addEventListener("click", cerrarLogin);
  document
    .getElementById("btn-login-cliente")
    .addEventListener("click", hacerLoginCliente);
  document
    .getElementById("btn-registro-cliente")
    .addEventListener("click", hacerRegistroCliente);
  document
    .getElementById("btn-mostrar-registro")
    .addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("vista-login-cliente").style.display = "none";
      document.getElementById("vista-registro-cliente").style.display = "block";
    });
  document
    .getElementById("btn-mostrar-login-desde-reg")
    .addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("vista-registro-cliente").style.display = "none";
      document.getElementById("vista-login-cliente").style.display = "block";
    });

  // Enter en campos de login/registro
  document.getElementById("login-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") hacerLoginCliente();
  });
  document.getElementById("reg-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") hacerRegistroCliente();
  });
});

/* ================= CARGAR PRODUCTOS ================= */
async function cargarProductosIniciales() {
  try {
    productosGlobales = await obtenerProductos();
    console.log("✅ Productos cargados desde API:", productosGlobales.length);
  } catch (error) {
    console.error("Error cargando productos:", error);
    productosGlobales = [];
  }
}

/* ================= CAMBIAR FORMA DE ENTREGA ================= */
async function cambiarFormaEntrega(metodo) {
  const direccion = document.getElementById("input-direccion-envio").value;
  await guardarConfigEntrega({ metodo, direccion });
  aplicarFormaEntregaUI();
  await renderizarCarrito();
}

async function aplicarFormaEntregaUI() {
  const config = await obtenerConfigEntrega();
  const esRetiro = config.metodo === "retiro";

  document.getElementById("entrega-domicilio").checked = !esRetiro;
  document.getElementById("entrega-retiro").checked = esRetiro;
  document.getElementById("input-direccion-envio").value =
    config.direccion || "";

  document.getElementById("campo-direccion-envio").style.display = esRetiro
    ? "none"
    : "flex";

  const textoLocal = document.getElementById("texto-direccion-local");
  const direccionLocal = await obtenerDireccionLocal();
  if (esRetiro) {
    textoLocal.style.display = "block";
    textoLocal.textContent = direccionLocal
      ? `📍 Retirás en: ${direccionLocal}`
      : "📍 El local aún no configuró una dirección de retiro.";
  } else {
    textoLocal.style.display = "none";
  }
}

/* ================= CAMBIAR VISTA ================= */
function cambiarVista(vista) {
  vistaActual = vista;
  document.querySelectorAll(".pestana").forEach((b) => {
    b.classList.toggle("pestana--activa", b.dataset.vista === vista);
  });
  document.getElementById("titulo-vista").textContent =
    vista === "tienda" ? "Catálogo" : "Mis favoritos";
  renderizarProductos();
}

/* ================= RENDERIZAR PRODUCTOS ================= */
function renderizarProductos() {
  const grid = document.getElementById("grid-productos");
  let productos = [...productosGlobales];

  if (!productos || productos.length === 0) {
    grid.innerHTML = `
      <div class="estado-vacio" style="grid-column: 1/-1;">
        <div class="estado-vacio__icono">📦</div>
        <p>Todavía no hay productos cargados en la tienda.</p>
        <p style="font-size:0.85rem;color:var(--color-texto-suave);">Agrega productos desde el panel de administración.</p>
      </div>`;
    return;
  }

  if (vistaActual === "favoritos") {
    const favoritos = obtenerFavoritos();
    productos = productos.filter((p) => favoritos.includes(p._id || p.id));
  }

  if (textoBusqueda) {
    productos = productos.filter((p) =>
      p.nombre.toLowerCase().includes(textoBusqueda),
    );
  }

  if (!productos.length) {
    grid.innerHTML = `
      <div class="estado-vacio" style="grid-column: 1/-1;">
        <div class="estado-vacio__icono">${vistaActual === "favoritos" ? "💔" : "🔍"}</div>
        <p>${
          vistaActual === "favoritos"
            ? "Aún no tienes productos favoritos."
            : "No se encontraron productos que coincidan con tu búsqueda."
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

/* ================= TARJETA PRODUCTO ================= */
function tarjetaProductoHTML(producto) {
  const id = producto._id || producto.id;
  const favorito = esFavorito(id);
  const imagen = producto.imagen || imagenMarcador();

  return `
    <div class="tarjeta-producto">
      <button class="boton-favorito ${favorito ? "boton-favorito--activo" : ""}" data-favorito="${id}" title="Guardar en favoritos">
        ${favorito ? "❤️" : "🤍"}
      </button>
      <img class="tarjeta-producto__imagen" src="${imagen}" alt="${escaparHtml(producto.nombre)}" />
      <div class="tarjeta-producto__cuerpo">
        <div class="tarjeta-producto__nombre">${escaparHtml(producto.nombre)}</div>
        <div class="tarjeta-producto__desc">${escaparHtml(producto.descripcion || "")}</div>
        <span class="tarjeta-producto__envio">🚚 ${escaparHtml(producto.formaEnvio || "Envío estándar")}</span>
        <div class="tarjeta-producto__precio">${formatearDinero(producto.precio)}</div>
        <div class="tarjeta-producto__acciones">
          <button class="boton boton--primario boton--bloque" data-agregar="${id}">Agregar al carrito</button>
        </div>
      </div>
    </div>`;
}

/* ================= IMAGEN POR DEFECTO ================= */
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

/* ================= CARRITO ================= */
async function abrirCarrito() {
  await aplicarFormaEntregaUI();
  await renderizarCarrito();
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

async function renderizarCarrito() {
  const lista = document.getElementById("lista-carrito");
  const items = await obtenerCarritoDetallado();

  if (!items || !items.length) {
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
            <button data-restar="${item._id || item.id}">−</button>
            <span>${item.cantidad}</span>
            <button data-sumar="${item._id || item.id}">+</button>
            <button data-quitar="${item._id || item.id}" title="Quitar" style="margin-left:auto;color:#d93025;border-color:#d93025;">🗑</button>
          </div>
        </div>
      </div>`,
      )
      .join("");

    lista.querySelectorAll("[data-sumar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = items.find((i) => (i._id || i.id) === btn.dataset.sumar);
        actualizarCantidadCarrito(btn.dataset.sumar, item.cantidad + 1);
        renderizarCarrito();
        actualizarContadores();
      }),
    );
    lista.querySelectorAll("[data-restar]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const item = items.find((i) => (i._id || i.id) === btn.dataset.restar);
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
  if (!items || !items.length) {
    document.getElementById("resumen-subtotal").textContent =
      formatearDinero(0);
    document.getElementById("resumen-envio").textContent = "Gratis";
    document.getElementById("resumen-total").textContent = formatearDinero(0);
    document.getElementById("btn-finalizar").disabled = true;
    return;
  }

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
  document.getElementById("btn-finalizar").disabled = false;
}

function actualizarContadores() {
  const totalCarrito = obtenerCarrito().reduce((acc, i) => acc + i.cantidad, 0);
  document.getElementById("contador-carrito").textContent = totalCarrito;
  document.getElementById("contador-favoritos").textContent =
    obtenerFavoritos().length;
}

/* ================= FINALIZAR COMPRA ================= */
async function finalizarCompra() {
  const items = await obtenerCarritoDetallado();
  if (!items || !items.length) {
    mostrarToast("El carrito está vacío", "error");
    return;
  }

  const config = await obtenerConfigEntrega();
  const esRetiro = config.metodo === "retiro";
  if (!esRetiro && !config.direccion.trim()) {
    mostrarToast("Ingresá una dirección de envío para continuar", "error");
    document.getElementById("input-direccion-envio").focus();
    return;
  }

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const cantidadTotal = items.reduce((acc, i) => acc + i.cantidad, 0);
  const envio = esRetiro ? 0 : await calcularCostoEnvio(cantidadTotal);
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

/* ================= AUTH DE CLIENTES ================= */

function abrirLogin() {
  document.getElementById("modal-login").style.display = "block";
  document.getElementById("fondo-oscuro-login").classList.add("fondo-oscuro--visible");
  document.getElementById("vista-login-cliente").style.display = "block";
  document.getElementById("vista-registro-cliente").style.display = "none";
  document.getElementById("mensaje-login-cliente").textContent = "";
  document.getElementById("mensaje-registro-cliente").textContent = "";
}

function cerrarLogin() {
  document.getElementById("modal-login").style.display = "none";
  document.getElementById("fondo-oscuro-login").classList.remove("fondo-oscuro--visible");
}

async function hacerLoginCliente() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  const msg = document.getElementById("mensaje-login-cliente");

  if (!email || !pass) {
    msg.textContent = "Completá todos los campos.";
    return;
  }

  const resultado = await loginCliente(email, pass);
  if (resultado.exito) {
    msg.textContent = "";
    cerrarLogin();
    renderizarUsuario();
    mostrarToast(`¡Hola, ${resultado.usuario.nombre}! 👋`, "exito");
  } else {
    msg.textContent = resultado.error || "Credenciales incorrectas.";
  }
}

async function hacerRegistroCliente() {
  const nombre = document.getElementById("reg-nombre").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-pass").value;
  const msg = document.getElementById("mensaje-registro-cliente");

  if (!nombre || !email || !pass) {
    msg.textContent = "Completá todos los campos.";
    return;
  }

  const resultado = await registrarCliente(nombre, email, pass);
  if (resultado.exito) {
    msg.textContent = "";
    cerrarLogin();
    renderizarUsuario();
    mostrarToast(`¡Bienvenido/a, ${resultado.usuario.nombre}! 🎉`, "exito");
  } else {
    msg.textContent = resultado.error || "Error al registrarse.";
  }
}

function renderizarUsuario() {
  const area = document.getElementById("area-usuario");
  const usuario = obtenerUsuarioActual();

  if (usuario) {
    area.innerHTML = `
      <button class="boton-icono" id="btn-mostrar-login" title="Mi cuenta">
        <span aria-hidden="true">👤</span>
        <span class="boton-icono__texto">${escaparHtml(usuario.nombre)}</span>
      </button>
      <button class="boton-icono" id="btn-logout" title="Cerrar sesión" style="font-size:0.8rem;">
        🚪 Salir
      </button>
    `;
    document.getElementById("btn-mostrar-login").addEventListener("click", abrirLogin);
    document.getElementById("btn-logout").addEventListener("click", () => {
      logoutCliente();
      renderizarUsuario();
      actualizarContadores();
      renderizarProductos();
      mostrarToast("Sesión cerrada");
    });
  } else {
    area.innerHTML = `
      <button class="boton-icono" id="btn-mostrar-login" title="Mi cuenta">
        <span aria-hidden="true">👤</span>
        <span class="boton-icono__texto">Iniciar sesión</span>
      </button>
    `;
    document.getElementById("btn-mostrar-login").addEventListener("click", abrirLogin);
  }
}
