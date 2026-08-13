/* =========================================================
   data.js
   Capa de datos: todo se guarda en localStorage (navegador).
   Aquí NO hay diseño ni HTML, solo lógica de datos.
   ========================================================= */

const STORAGE_KEYS = {
  PRODUCTOS: "tienda_productos",
  CARRITO: "tienda_carrito",
  FAVORITOS: "tienda_favoritos",
  ENVIO: "tienda_config_envio",
  DIRECCION_LOCAL: "tienda_direccion_local",
  ENTREGA: "tienda_entrega",
  MONEDA: "tienda_config_moneda",
  LOG: "tienda_log",
  ADMIN_HASH: "tienda_admin_hash",
  ADMIN_SESION: "tienda_admin_sesion",
};

/* ---------- Helpers genéricos de almacenamiento ---------- */
function leer(clave, valorPorDefecto) {
  try {
    const guardado = localStorage.getItem(clave);
    return guardado !== null ? JSON.parse(guardado) : valorPorDefecto;
  } catch (error) {
    console.error(`Error leyendo "${clave}" de localStorage:`, error);
    return valorPorDefecto;
  }
}

function guardar(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

function generarId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ================= PRODUCTOS ================= */
function obtenerProductos() {
  return leer(STORAGE_KEYS.PRODUCTOS, []);
}

function obtenerProductoPorId(id) {
  return obtenerProductos().find((p) => p.id === id) || null;
}

function guardarProducto(producto) {
  const productos = obtenerProductos();
  if (producto.id) {
    const indice = productos.findIndex((p) => p.id === producto.id);
    if (indice !== -1) {
      productos[indice] = { ...productos[indice], ...producto };
      guardar(STORAGE_KEYS.PRODUCTOS, productos);
      registrarActividad(`Producto editado: "${producto.nombre}"`);
      return productos[indice];
    }
  }
  const nuevo = {
    id: generarId(),
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    precio: Number(producto.precio),
    formaEnvio: producto.formaEnvio || "Envío estándar",
    imagen: producto.imagen || "",
    creado: new Date().toISOString(),
  };
  productos.unshift(nuevo);
  guardar(STORAGE_KEYS.PRODUCTOS, productos);
  registrarActividad(`Producto agregado: "${nuevo.nombre}"`);
  return nuevo;
}

function eliminarProducto(id) {
  const productos = obtenerProductos();
  const producto = productos.find((p) => p.id === id);
  const restantes = productos.filter((p) => p.id !== id);
  guardar(STORAGE_KEYS.PRODUCTOS, restantes);

  // Limpieza en cascada: quitar de carrito y favoritos si estaba ahí
  guardar(
    STORAGE_KEYS.CARRITO,
    obtenerCarrito().filter((item) => item.id !== id),
  );
  guardar(
    STORAGE_KEYS.FAVORITOS,
    obtenerFavoritos().filter((favId) => favId !== id),
  );

  if (producto) registrarActividad(`Producto eliminado: "${producto.nombre}"`);
}

/* ================= CARRITO ================= */
function obtenerCarrito() {
  return leer(STORAGE_KEYS.CARRITO, []);
}

function obtenerCarritoDetallado() {
  const productos = obtenerProductos();
  return obtenerCarrito()
    .map((item) => {
      const producto = productos.find((p) => p.id === item.id);
      if (!producto) return null;
      return {
        ...producto,
        cantidad: item.cantidad,
        subtotal: producto.precio * item.cantidad,
      };
    })
    .filter(Boolean);
}

function agregarACarrito(idProducto, cantidad = 1) {
  const carrito = obtenerCarrito();
  const existente = carrito.find((item) => item.id === idProducto);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({ id: idProducto, cantidad });
  }
  guardar(STORAGE_KEYS.CARRITO, carrito);
}

function actualizarCantidadCarrito(idProducto, cantidad) {
  let carrito = obtenerCarrito();
  if (cantidad <= 0) {
    carrito = carrito.filter((item) => item.id !== idProducto);
  } else {
    const item = carrito.find((item) => item.id === idProducto);
    if (item) item.cantidad = cantidad;
  }
  guardar(STORAGE_KEYS.CARRITO, carrito);
}

function quitarDelCarrito(idProducto) {
  guardar(
    STORAGE_KEYS.CARRITO,
    obtenerCarrito().filter((item) => item.id !== idProducto),
  );
}

function vaciarCarrito() {
  guardar(STORAGE_KEYS.CARRITO, []);
}

/* ================= FAVORITOS ================= */
function obtenerFavoritos() {
  return leer(STORAGE_KEYS.FAVORITOS, []);
}

function esFavorito(idProducto) {
  return obtenerFavoritos().includes(idProducto);
}

function alternarFavorito(idProducto) {
  const favoritos = obtenerFavoritos();
  const indice = favoritos.indexOf(idProducto);
  if (indice === -1) {
    favoritos.push(idProducto);
  } else {
    favoritos.splice(indice, 1);
  }
  guardar(STORAGE_KEYS.FAVORITOS, favoritos);
  return favoritos.includes(idProducto);
}

/* ================= ENVÍO (configurable por tramos de cantidad) ================= */
// Ejemplo: desde 1 unidad = 100, desde 5 unidades = 70, desde 10 = 0 (gratis)
const TRAMOS_ENVIO_DEFECTO = [
  { desde: 1, costo: 100 },
  { desde: 5, costo: 70 },
  { desde: 10, costo: 0 },
];

function obtenerConfigEnvio() {
  return leer(STORAGE_KEYS.ENVIO, TRAMOS_ENVIO_DEFECTO);
}

function guardarConfigEnvio(tramos) {
  const limpios = tramos
    .map((t) => ({ desde: Number(t.desde), costo: Number(t.costo) }))
    .sort((a, b) => a.desde - b.desde);
  guardar(STORAGE_KEYS.ENVIO, limpios);
  registrarActividad("Configuración de envío actualizada");
  return limpios;
}

function calcularCostoEnvio(cantidadTotalUnidades) {
  const tramos = obtenerConfigEnvio();
  if (!tramos.length || cantidadTotalUnidades <= 0) return 0;
  const ordenados = [...tramos].sort((a, b) => a.desde - b.desde);
  let costo = ordenados[0].costo;
  for (const tramo of ordenados) {
    if (cantidadTotalUnidades >= tramo.desde) {
      costo = tramo.costo;
    }
  }
  return costo;
}

/* ================= DIRECCIÓN DEL LOCAL (para retiro) ================= */
function obtenerDireccionLocal() {
  return leer(STORAGE_KEYS.DIRECCION_LOCAL, "");
}

function guardarDireccionLocal(direccion) {
  const limpia = (direccion || "").trim();
  guardar(STORAGE_KEYS.DIRECCION_LOCAL, limpia);
  registrarActividad("Dirección de retiro en el local actualizada");
  return limpia;
}

/* ================= FORMA DE ENTREGA elegida por el cliente ================= */
const ENTREGA_DEFECTO = { metodo: "domicilio", direccion: "" };

function obtenerConfigEntrega() {
  return leer(STORAGE_KEYS.ENTREGA, ENTREGA_DEFECTO);
}

function guardarConfigEntrega(config) {
  guardar(STORAGE_KEYS.ENTREGA, {
    metodo: config.metodo === "retiro" ? "retiro" : "domicilio",
    direccion: config.direccion || "",
  });
}

/* ================= MONEDA ================= */
const MONEDA_DEFECTO = { codigo: "MXN", simbolo: "$", locale: "es-MX" };

function obtenerConfigMoneda() {
  return leer(STORAGE_KEYS.MONEDA, MONEDA_DEFECTO);
}

function guardarConfigMoneda(config) {
  const limpio = {
    codigo: config.codigo || "PERSONALIZADO",
    simbolo: (config.simbolo || "$").trim() || "$",
    locale: config.locale || "es-MX",
  };
  guardar(STORAGE_KEYS.MONEDA, limpio);
  registrarActividad(
    `Moneda actualizada a ${limpio.simbolo} (${limpio.codigo})`,
  );
  return limpio;
}

/* ================= RESPALDO (exportar/importar catálogo) ================= */
// Permite mover productos y config. de envío entre navegadores/dispositivos
// sin necesidad de un backend (útil para compartir el catálogo).
function exportarCatalogo() {
  return JSON.stringify(
    {
      productos: obtenerProductos(),
      envio: obtenerConfigEnvio(),
      exportadoEl: new Date().toISOString(),
    },
    null,
    2,
  );
}

function importarCatalogo(jsonTexto) {
  const datos = JSON.parse(jsonTexto);
  if (!Array.isArray(datos.productos)) {
    throw new Error(
      "El archivo no tiene un formato válido (falta 'productos').",
    );
  }
  guardar(STORAGE_KEYS.PRODUCTOS, datos.productos);
  if (Array.isArray(datos.envio)) {
    guardar(STORAGE_KEYS.ENVIO, datos.envio);
  }
  registrarActividad("Catálogo importado desde archivo de respaldo");
}

/* ================= REGISTRO DE ACTIVIDAD (control visual) ================= */
function registrarActividad(mensaje) {
  const log = leer(STORAGE_KEYS.LOG, []);
  log.unshift({ mensaje, fecha: new Date().toISOString() });
  guardar(STORAGE_KEYS.LOG, log.slice(0, 50));
}

function obtenerActividad() {
  return leer(STORAGE_KEYS.LOG, []);
}

/* ================= ADMIN (protección simple con hash) ================= */
async function calcularHash(texto) {
  const datos = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function asegurarPasswordInicial() {
  if (!localStorage.getItem(STORAGE_KEYS.ADMIN_HASH)) {
    const hashDefecto = await calcularHash("admin123");
    localStorage.setItem(STORAGE_KEYS.ADMIN_HASH, hashDefecto);
  }
}

async function verificarPassword(intento) {
  await asegurarPasswordInicial();
  const hashGuardado = localStorage.getItem(STORAGE_KEYS.ADMIN_HASH);
  const hashIntento = await calcularHash(intento);
  return hashIntento === hashGuardado;
}

async function cambiarPassword(nueva) {
  const hash = await calcularHash(nueva);
  localStorage.setItem(STORAGE_KEYS.ADMIN_HASH, hash);
  registrarActividad("Contraseña de administrador actualizada");
}

function iniciarSesionAdmin() {
  sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESION, "1");
}

function cerrarSesionAdmin() {
  sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESION);
}

function haySesionAdmin() {
  return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESION) === "1";
}
