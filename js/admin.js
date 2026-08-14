/* =========================================================
   admin.js
   Lógica del panel de administración: login, CRUD de productos,
   configuración de envío por tramos y actividad reciente.
   AHORA CON API (MongoDB)
   ========================================================= */

let imagenSeleccionada = "";
let productoEditando = null;

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
  // Verificar si hay sesión activa
  if (haySesionAdmin()) {
    mostrarPanel();
  }

  // Event listeners
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

/* ================= LOGIN ================= */
async function intentarLogin() {
  const password = document.getElementById("input-password").value;
  const mensaje = document.getElementById("mensaje-login");

  if (!password) {
    mensaje.textContent = "Ingresa la contraseña.";
    return;
  }

  const valido = await iniciarSesionAdmin(password);
  if (valido) {
    mensaje.textContent = "";
    document.getElementById("input-password").value = "";
    mostrarPanel();
  } else {
    mensaje.textContent = "Contraseña incorrecta.";
  }
}

/* ================= PANEL PRINCIPAL ================= */
function mostrarPanel() {
  document.getElementById("vista-login").style.display = "none";
  document.getElementById("vista-panel").style.display = "block";
  renderizarTodo();
}

async function renderizarTodo() {
  await renderizarEstadisticas();
  await renderizarTablaProductos();
  renderizarTramos();
  await renderizarActividad();
}

/* ================= ESTADÍSTICAS ================= */
async function renderizarEstadisticas() {
  const productos = await obtenerProductos();
  const valorCatalogo = productos.reduce((acc, p) => acc + (p.precio || 0), 0);
  const cantidadCarrito = obtenerCarrito().reduce(
    (acc, i) => acc + (i.cantidad || 0),
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

/* ================= PRODUCTOS ================= */
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

async function guardarProductoDesdeForm(e) {
  e.preventDefault();

  const id = document.getElementById("producto-id").value;
  const nombre = document.getElementById("producto-nombre").value.trim();
  const descripcion = document
    .getElementById("producto-descripcion")
    .value.trim();
  const precio = document.getElementById("producto-precio").value;
  const formaEnvio = document.getElementById("producto-forma-envio").value;

  if (!nombre || !descripcion || precio === "") {
    mostrarToast("Completa todos los campos", "error");
    return;
  }

  const datos = {
    nombre,
    descripcion,
    precio: Number(precio),
    formaEnvio,
  };

  if (id) datos.id = id;
  if (imagenSeleccionada) datos.imagen = imagenSeleccionada;

  const resultado = await guardarProducto(datos);
  if (resultado) {
    mostrarToast(id ? "Producto actualizado" : "Producto agregado", "exito");
    cancelarEdicion();
    await renderizarTodo();
  } else {
    mostrarToast("Error al guardar el producto", "error");
  }
}

function cancelarEdicion() {
  document.getElementById("form-producto").reset();
  document.getElementById("producto-id").value = "";
  document.getElementById("titulo-form-producto").textContent =
    "Agregar producto";
  document.getElementById("btn-cancelar-edicion").style.display = "none";
  document.getElementById("preview-imagen").style.display = "none";
  imagenSeleccionada = "";
  productoEditando = null;
}

async function editarProducto(id) {
  const producto = await obtenerProductoPorId(id);
  if (!producto) {
    mostrarToast("Producto no encontrado", "error");
    return;
  }

  productoEditando = producto;
  document.getElementById("producto-id").value = producto._id || producto.id;
  document.getElementById("producto-nombre").value = producto.nombre;
  document.getElementById("producto-descripcion").value = producto.descripcion;
  document.getElementById("producto-precio").value = producto.precio;
  document.getElementById("producto-forma-envio").value =
    producto.formaEnvio || "Envío estándar";

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

async function confirmarEliminarProducto(id) {
  const producto = await obtenerProductoPorId(id);
  if (!producto) {
    mostrarToast("Producto no encontrado", "error");
    return;
  }

  if (
    confirm(
      `¿Eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`,
    )
  ) {
    const resultado = await eliminarProducto(id);
    if (resultado) {
      mostrarToast("Producto eliminado", "exito");
      await renderizarTodo();
    } else {
      mostrarToast("Error al eliminar el producto", "error");
    }
  }
}

async function renderizarTablaProductos() {
  const tbody = document.getElementById("tabla-productos");
  const productos = await obtenerProductos();

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
      <td>${escaparHtml(p.formaEnvio || "Envío estándar")}</td>
      <td class="acciones-tabla">
        <button class="boton boton--fantasma" data-editar="${p._id || p.id}">Editar</button>
        <button class="boton boton--peligro" data-eliminar="${p._id || p.id}">Eliminar</button>
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

/* ================= TRAMOS DE ENVÍO ================= */
function renderizarTramos() {
  const contenedor = document.getElementById("lista-tramos");
  contenedor.innerHTML = "";
  const tramos = obtenerConfigEnvio();
  if (tramos.length) {
    tramos.forEach((tramo) => agregarFilaTramo(tramo));
  } else {
    agregarFilaTramo({ desde: 1, costo: 0 });
  }
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
  fila.querySelector("button").addEventListener("click", () => {
    if (document.querySelectorAll(".fila-tramo").length > 1) {
      fila.remove();
    } else {
      mostrarToast("Debe haber al menos un tramo", "error");
    }
  });
  contenedor.appendChild(fila);
}

function guardarTramosDesdeForm() {
  const filas = document.querySelectorAll(".fila-tramo");
  const tramos = Array.from(filas).map((fila) => ({
    desde: Number(fila.querySelector(".tramo-desde").value) || 1,
    costo: Number(fila.querySelector(".tramo-costo").value) || 0,
  }));

  // Validar que los tramos estén ordenados
  const ordenados = [...tramos].sort((a, b) => a.desde - b.desde);

  guardarConfigEnvio(ordenados);
  guardarDireccionLocal(document.getElementById("direccion-local").value);
  mostrarToast("Configuración de envío guardada", "exito");
  renderizarTramos();
  renderizarActividad();
}

/* ================= MONEDA ================= */
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
          simbolo:
            document.getElementById("moneda-simbolo-custom").value || "$",
          locale: "es-MX",
        }
      : preset;

  guardarConfigMoneda(config);
  mostrarToast("Moneda actualizada", "exito");
  renderizarTodo();
}

/* ================= CONTRASEÑA ================= */
async function actualizarPassword() {
  const actual = document.getElementById("password-actual").value;
  const nueva = document.getElementById("nueva-password").value;
  const confirmar = document.getElementById("confirmar-password").value;
  const mensaje = document.getElementById("mensaje-password");

  if (!actual || !nueva || !confirmar) {
    mensaje.style.color = "var(--color-error)";
    mensaje.textContent = "Completa todos los campos.";
    return;
  }

  if (nueva.length < 4) {
    mensaje.style.color = "var(--color-error)";
    mensaje.textContent =
      "La nueva contraseña debe tener al menos 4 caracteres.";
    return;
  }

  if (nueva !== confirmar) {
    mensaje.style.color = "var(--color-error)";
    mensaje.textContent = "Las contraseñas no coinciden.";
    return;
  }

  // Verificar contraseña actual
  const valido = await verificarPassword(actual);
  if (!valido) {
    mensaje.style.color = "var(--color-error)";
    mensaje.textContent = "La contraseña actual es incorrecta.";
    return;
  }

  const resultado = await cambiarPassword(nueva);
  if (resultado) {
    mensaje.style.color = "var(--color-exito)";
    mensaje.textContent = "✅ Contraseña actualizada correctamente.";
    document.getElementById("password-actual").value = "";
    document.getElementById("nueva-password").value = "";
    document.getElementById("confirmar-password").value = "";
    await renderizarActividad();
  } else {
    mensaje.style.color = "var(--color-error)";
    mensaje.textContent = "Error al actualizar la contraseña.";
  }
}

/* ================= ACTIVIDAD ================= */
async function renderizarActividad() {
  const lista = document.getElementById("lista-actividad");
  const registros = await obtenerActividad();

  if (!registros || !registros.length) {
    lista.innerHTML = `<li>Sin actividad todavía.</li>`;
    return;
  }

  lista.innerHTML = registros
    .slice(0, 20)
    .map(
      (r) => `
    <li>
      ${escaparHtml(r.mensaje)}
      <time>${formatearFecha(r.fecha)}</time>
    </li>`,
    )
    .join("");
}

/* ================= RESPALDO ================= */
async function exportarCatalogoDesdeUI() {
  const contenido = await exportarCatalogo();
  const blob = new Blob([contenido], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `catalogo-tienda-${new Date().toISOString().slice(0, 10)}.json`;
  enlace.click();
  URL.revokeObjectURL(url);
  mostrarToast("Catálogo exportado", "exito");
}

async function importarCatalogoDesdeUI(e) {
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
  lector.onload = async () => {
    try {
      await importarCatalogo(lector.result);
      mostrarToast("Catálogo importado correctamente", "exito");
      await renderizarTodo();
    } catch (error) {
      mostrarToast("No se pudo importar: " + error.message, "error");
    }
    e.target.value = "";
  };
  lector.readAsText(archivo);
}
