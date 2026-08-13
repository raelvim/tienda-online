/* =========================================================
   admin.js
   Lógica del panel de administración: login, CRUD de productos,
   configuración de envío por tramos y actividad reciente.
   ========================================================= */

let imagenSeleccionada = "";

const MONEDAS_PRESET = [
  {
    codigo: "MXN",
    simbolo: "$",
    locale: "es-MX",
    etiqueta: "Peso mexicano ($ MXN)",
  },
  {
    codigo: "USD",
    simbolo: "US$",
    locale: "en-US",
    etiqueta: "Dólar estadounidense (US$)",
  },
  {
    codigo: "ARS",
    simbolo: "$",
    locale: "es-AR",
    etiqueta: "Peso argentino ($ ARS)",
  },
  {
    codigo: "COP",
    simbolo: "$",
    locale: "es-CO",
    etiqueta: "Peso colombiano ($ COP)",
  },
  {
    codigo: "CLP",
    simbolo: "$",
    locale: "es-CL",
    etiqueta: "Peso chileno ($ CLP)",
  },
  { codigo: "EUR", simbolo: "€", locale: "es-ES", etiqueta: "Euro (€)" },
  {
    codigo: "PERSONALIZADO",
    simbolo: "$",
    locale: "es-MX",
    etiqueta: "Personalizado...",
  },
];

document.addEventListener("DOMContentLoaded", async () => {
  await asegurarPasswordInicial();

  if (haySesionAdmin()) {
    mostrarPanel();
  }

  document
    .getElementById("btn-entrar")
    .addEventListener("click", intentarLogin);
  document.getElementById("input-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") intentarLogin();
  });
  document.getElementById("btn-cerrar-sesion").addEventListener("click", () => {
    cerrarSesionAdmin();
    location.reload();
  });

  document
    .getElementById("form-producto")
    .addEventListener("submit", guardarProductoDesdeForm);
  document
    .getElementById("btn-cancelar-edicion")
    .addEventListener("click", cancelarEdicion);
  document
    .getElementById("producto-imagen")
    .addEventListener("change", previsualizarImagen);

  document
    .getElementById("btn-agregar-tramo")
    .addEventListener("click", () => agregarFilaTramo());
  document
    .getElementById("btn-guardar-envio")
    .addEventListener("click", guardarTramosDesdeForm);

  inicializarSelectorMoneda();
  document
    .getElementById("moneda-preset")
    .addEventListener("change", actualizarVisibilidadSimboloCustom);
  document
    .getElementById("btn-guardar-moneda")
    .addEventListener("click", guardarMonedaDesdeForm);

  document
    .getElementById("btn-cambiar-password")
    .addEventListener("click", actualizarPassword);

  document
    .getElementById("btn-exportar-catalogo")
    .addEventListener("click", exportarCatalogoDesdeUI);
  document
    .getElementById("btn-importar-catalogo")
    .addEventListener("click", () => {
      document.getElementById("input-importar-catalogo").click();
    });
  document
    .getElementById("input-importar-catalogo")
    .addEventListener("change", importarCatalogoDesdeUI);
});

async function intentarLogin() {
  const password = document.getElementById("input-password").value;
  const mensaje = document.getElementById("mensaje-login");
  const valido = await verificarPassword(password);
  if (valido) {
    iniciarSesionAdmin();
    registrarActividad("Inicio de sesión en el panel de administración");
    mostrarPanel();
  } else {
    mensaje.textContent = "Contraseña incorrecta.";
  }
}

function mostrarPanel() {
  document.getElementById("vista-login").style.display = "none";
  document.getElementById("vista-panel").style.display = "block";
  renderizarTodo();
}

function renderizarTodo() {
  renderizarEstadisticas();
  renderizarTablaProductos();
  renderizarTramos();
  renderizarActividad();
}

/* ---------- Estadísticas ---------- */
function renderizarEstadisticas() {
  const productos = obtenerProductos();
  const valorCatalogo = productos.reduce((acc, p) => acc + p.precio, 0);
  const cantidadCarrito = obtenerCarrito().reduce(
    (acc, i) => acc + i.cantidad,
    0,
  );

  document.getElementById("stat-total-productos").textContent =
    productos.length;
  document.getElementById("stat-valor-catalogo").textContent =
    formatearDinero(valorCatalogo);
  document.getElementById("stat-favoritos").textContent =
    obtenerFavoritos().length;
  document.getElementById("stat-carrito").textContent = cantidadCarrito;
}

/* ---------- Productos ---------- */
function previsualizarImagen(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => {
    imagenSeleccionada = lector.result;
    const preview = document.getElementById("preview-imagen");
    preview.src = imagenSeleccionada;
    preview.style.display = "block";
  };
  lector.readAsDataURL(archivo);
}

function guardarProductoDesdeForm(e) {
  e.preventDefault();
  const id = document.getElementById("producto-id").value;
  const nombre = document.getElementById("producto-nombre").value.trim();
  const descripcion = document
    .getElementById("producto-descripcion")
    .value.trim();
  const precio = document.getElementById("producto-precio").value;
  const formaEnvio = document.getElementById("producto-forma-envio").value;

  if (!nombre || !descripcion || precio === "") return;

  const datos = { nombre, descripcion, precio, formaEnvio };
  if (id) datos.id = id;
  if (imagenSeleccionada) datos.imagen = imagenSeleccionada;

  guardarProducto(datos);
  mostrarToast(id ? "Producto actualizado" : "Producto agregado", "exito");
  cancelarEdicion();
  renderizarTodo();
}

function cancelarEdicion() {
  document.getElementById("form-producto").reset();
  document.getElementById("producto-id").value = "";
  document.getElementById("titulo-form-producto").textContent =
    "Agregar producto";
  document.getElementById("btn-cancelar-edicion").style.display = "none";
  document.getElementById("preview-imagen").style.display = "none";
  imagenSeleccionada = "";
}

function editarProducto(id) {
  const producto = obtenerProductoPorId(id);
  if (!producto) return;
  document.getElementById("producto-id").value = producto.id;
  document.getElementById("producto-nombre").value = producto.nombre;
  document.getElementById("producto-descripcion").value = producto.descripcion;
  document.getElementById("producto-precio").value = producto.precio;
  document.getElementById("producto-forma-envio").value = producto.formaEnvio;
  imagenSeleccionada = producto.imagen || "";
  const preview = document.getElementById("preview-imagen");
  if (producto.imagen) {
    preview.src = producto.imagen;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }
  document.getElementById("titulo-form-producto").textContent =
    "Editar producto";
  document.getElementById("btn-cancelar-edicion").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function confirmarEliminarProducto(id) {
  const producto = obtenerProductoPorId(id);
  if (!producto) return;
  if (
    confirm(
      `¿Eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`,
    )
  ) {
    eliminarProducto(id);
    mostrarToast("Producto eliminado", "exito");
    renderizarTodo();
  }
}

function renderizarTablaProductos() {
  const tbody = document.getElementById("tabla-productos");
  const productos = obtenerProductos();

  if (!productos.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-texto-suave);">No hay productos todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = productos
    .map(
      (p) => `
    <tr>
      <td><img src="${p.imagen || ""}" onerror="this.style.visibility='hidden'" alt="" /></td>
      <td>${escaparHtml(p.nombre)}</td>
      <td>${formatearDinero(p.precio)}</td>
      <td>${escaparHtml(p.formaEnvio)}</td>
      <td class="acciones-tabla">
        <button class="boton boton--fantasma" data-editar="${p.id}">Editar</button>
        <button class="boton boton--peligro" data-eliminar="${p.id}">Eliminar</button>
      </td>
    </tr>`,
    )
    .join("");

  tbody
    .querySelectorAll("[data-editar]")
    .forEach((btn) =>
      btn.addEventListener("click", () => editarProducto(btn.dataset.editar)),
    );
  tbody
    .querySelectorAll("[data-eliminar]")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        confirmarEliminarProducto(btn.dataset.eliminar),
      ),
    );
}

/* ---------- Tramos de envío ---------- */
function renderizarTramos() {
  const contenedor = document.getElementById("lista-tramos");
  contenedor.innerHTML = "";
  obtenerConfigEnvio().forEach((tramo) => agregarFilaTramo(tramo));
  document.getElementById("direccion-local").value = obtenerDireccionLocal();
}

function agregarFilaTramo(tramo = { desde: 1, costo: 0 }) {
  const contenedor = document.getElementById("lista-tramos");
  const simbolo = obtenerConfigMoneda().simbolo;
  const fila = document.createElement("div");
  fila.className = "fila-tramo";
  fila.innerHTML = `
    <div class="fila-tramo__grupo">
      <span class="fila-tramo__etiqueta">Cant.</span>
      <input type="number" min="1" placeholder="1" class="tramo-desde" value="${tramo.desde}" />
    </div>
    <div class="fila-tramo__grupo">
      <span class="fila-tramo__etiqueta">${escaparHtml(simbolo)}</span>
      <input type="number" min="0" step="0.01" placeholder="0" class="tramo-costo" value="${tramo.costo}" />
    </div>
    <button type="button" class="boton boton--peligro" title="Quitar tramo">🗑</button>
  `;
  fila.querySelector("button").addEventListener("click", () => fila.remove());
  contenedor.appendChild(fila);
}

function guardarTramosDesdeForm() {
  const filas = document.querySelectorAll(".fila-tramo");
  const tramos = Array.from(filas).map((fila) => ({
    desde: fila.querySelector(".tramo-desde").value || 1,
    costo: fila.querySelector(".tramo-costo").value || 0,
  }));

  if (!tramos.length) {
    mostrarToast("Agrega al menos un tramo de envío", "error");
    return;
  }

  guardarConfigEnvio(tramos);
  guardarDireccionLocal(document.getElementById("direccion-local").value);
  mostrarToast("Configuración de envío guardada", "exito");
  renderizarTramos();
  renderizarActividad();
}

/* ---------- Moneda ---------- */
function inicializarSelectorMoneda() {
  const select = document.getElementById("moneda-preset");
  select.innerHTML = MONEDAS_PRESET.map(
    (m) => `<option value="${m.codigo}">${escaparHtml(m.etiqueta)}</option>`,
  ).join("");

  const actual = obtenerConfigMoneda();
  const coincide = MONEDAS_PRESET.some(
    (m) => m.codigo === actual.codigo && m.codigo !== "PERSONALIZADO",
  );
  select.value = coincide ? actual.codigo : "PERSONALIZADO";
  document.getElementById("moneda-simbolo-custom").value = actual.simbolo;
  actualizarVisibilidadSimboloCustom();
}

function actualizarVisibilidadSimboloCustom() {
  const esPersonalizado =
    document.getElementById("moneda-preset").value === "PERSONALIZADO";
  document.getElementById("campo-moneda-simbolo").style.display =
    esPersonalizado ? "flex" : "none";
}

function guardarMonedaDesdeForm() {
  const codigo = document.getElementById("moneda-preset").value;
  const preset = MONEDAS_PRESET.find((m) => m.codigo === codigo);

  const config =
    codigo === "PERSONALIZADO"
      ? {
          codigo: "PERSONALIZADO",
          simbolo: document.getElementById("moneda-simbolo-custom").value,
          locale: "es-MX",
        }
      : preset;

  guardarConfigMoneda(config);
  mostrarToast("Moneda actualizada", "exito");
  renderizarTodo();
}

/* ---------- Contraseña ---------- */
async function actualizarPassword() {
  const nueva = document.getElementById("nueva-password").value;
  if (!nueva || nueva.length < 4) {
    mostrarToast("La contraseña debe tener al menos 4 caracteres", "error");
    return;
  }
  await cambiarPassword(nueva);
  document.getElementById("nueva-password").value = "";
  mostrarToast("Contraseña actualizada", "exito");
  renderizarActividad();
}

/* ---------- Actividad ---------- */
function renderizarActividad() {
  const lista = document.getElementById("lista-actividad");
  const registros = obtenerActividad();

  if (!registros.length) {
    lista.innerHTML = `<li>Sin actividad todavía.</li>`;
    return;
  }

  lista.innerHTML = registros
    .map(
      (r) => `
    <li>
      ${escaparHtml(r.mensaje)}
      <time>${formatearFecha(r.fecha)}</time>
    </li>`,
    )
    .join("");
}

/* ---------- Respaldo (exportar / importar catálogo) ---------- */
function exportarCatalogoDesdeUI() {
  const contenido = exportarCatalogo();
  const blob = new Blob([contenido], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `catalogo-tienda-${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  URL.revokeObjectURL(url);
  mostrarToast("Catálogo exportado", "exito");
}

function importarCatalogoDesdeUI(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;

  if (
    !confirm(
      "Esto reemplazará los productos y la configuración de envío actuales. ¿Continuar?",
    )
  ) {
    e.target.value = "";
    return;
  }

  const lector = new FileReader();
  lector.onload = () => {
    try {
      importarCatalogo(lector.result);
      mostrarToast("Catálogo importado correctamente", "exito");
      renderizarTodo();
    } catch (error) {
      mostrarToast("No se pudo importar: " + error.message, "error");
    }
    e.target.value = "";
  };
  lector.readAsText(archivo);
}
