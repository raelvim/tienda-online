/* =========================================================
   data.js
   Capa de datos: TODO se guarda en el backend (MongoDB).
   NADA se guarda en localStorage (excepto token de sesión).
   ========================================================= */

// Configuración de la API
// En producción, auto-detecta el dominio. En desarrollo local, usa localhost:5000.
const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "/api";

// Cache de moneda para acceso síncrono (se actualiza al cargar la tienda)
let monedaCache = { simbolo: "$", locale: "es-MX", codigo: "MXN" };

// Función síncrona para obtener la moneda cacheada
function obtenerMonedaCache() {
  return monedaCache;
}

// Solo guardamos el token en localStorage (para autenticación)
const STORAGE_KEYS = {
  TOKEN: "tienda_token",
  ADMIN_SESION: "tienda_admin_sesion",
};

/* ================= HELPERS ================= */
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

/* ================= PRODUCTOS (API) ================= */

// Obtener todos los productos
async function obtenerProductos() {
  try {
    const respuesta = await fetch(`${API_URL}/productos`);
    if (!respuesta.ok) throw new Error("Error al obtener productos");
    return await respuesta.json();
  } catch (error) {
    console.error("Error en obtenerProductos:", error);
    return [];
  }
}

// Obtener un producto por ID
async function obtenerProductoPorId(id) {
  try {
    const respuesta = await fetch(`${API_URL}/productos/${id}`);
    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch (error) {
    console.error("Error en obtenerProductoPorId:", error);
    return null;
  }
}

// Guardar producto (crear o actualizar)
async function guardarProducto(producto) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) throw new Error("No hay sesión activa");

    let url = `${API_URL}/productos`;
    let method = "POST";

    if (producto._id) {
      url = `${API_URL}/productos/${producto._id}`;
      method = "PUT";
    }

    const respuesta = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        precio: Number(producto.precio),
        formaEnvio: producto.formaEnvio || "Envío estándar",
        imagen: producto.imagen || "",
      }),
    });

    if (!respuesta.ok) throw new Error("Error al guardar producto");
    const resultado = await respuesta.json();
    await registrarActividad(
      `Producto ${producto._id ? "editado" : "agregado"}: "${producto.nombre}"`,
    );
    return resultado;
  } catch (error) {
    console.error("Error en guardarProducto:", error);
    return null;
  }
}

// Eliminar producto
async function eliminarProducto(id) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) throw new Error("No hay sesión activa");

    const respuesta = await fetch(`${API_URL}/productos/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!respuesta.ok) throw new Error("Error al eliminar producto");

    await registrarActividad(`Producto eliminado (ID: ${id})`);
    return true;
  } catch (error) {
    console.error("Error en eliminarProducto:", error);
    return false;
  }
}

/* ================= CARRITO (API) ================= */

// Obtener carrito del usuario
async function obtenerCarrito() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return [];

    const respuesta = await fetch(`${API_URL}/carrito`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) return [];
    return await respuesta.json();
  } catch (error) {
    console.error("Error en obtenerCarrito:", error);
    return [];
  }
}

// Obtener carrito con detalles de productos
async function obtenerCarritoDetallado() {
  try {
    const carrito = await obtenerCarrito();
    const productos = await obtenerProductos();

    return carrito
      .map((item) => {
        const producto = productos.find((p) => p._id === item.productoId);
        if (!producto) return null;
        return {
          ...producto,
          cantidad: item.cantidad,
          subtotal: producto.precio * item.cantidad,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Error en obtenerCarritoDetallado:", error);
    return [];
  }
}

// Agregar al carrito
async function agregarACarrito(productoId, cantidad = 1) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      // Si no hay sesión, usar localStorage temporal
      return agregarACarritoLocal(productoId, cantidad);
    }

    const respuesta = await fetch(`${API_URL}/carrito`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productoId, cantidad }),
    });

    if (!respuesta.ok) throw new Error("Error al agregar al carrito");
    return await respuesta.json();
  } catch (error) {
    console.error("Error en agregarACarrito:", error);
    // Fallback a localStorage
    return agregarACarritoLocal(productoId, cantidad);
  }
}

// Actualizar cantidad en carrito
async function actualizarCantidadCarrito(productoId, cantidad) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      return actualizarCantidadCarritoLocal(productoId, cantidad);
    }

    const respuesta = await fetch(`${API_URL}/carrito/${productoId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cantidad }),
    });

    if (!respuesta.ok) throw new Error("Error al actualizar carrito");
    return await respuesta.json();
  } catch (error) {
    console.error("Error en actualizarCantidadCarrito:", error);
    return actualizarCantidadCarritoLocal(productoId, cantidad);
  }
}

// Quitar del carrito
async function quitarDelCarrito(productoId) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      return quitarDelCarritoLocal(productoId);
    }

    const respuesta = await fetch(`${API_URL}/carrito/${productoId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!respuesta.ok) throw new Error("Error al quitar del carrito");
    return true;
  } catch (error) {
    console.error("Error en quitarDelCarrito:", error);
    return quitarDelCarritoLocal(productoId);
  }
}

// Vaciar carrito
async function vaciarCarrito() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      vaciarCarritoLocal();
      return;
    }

    await fetch(`${API_URL}/carrito`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("Error en vaciarCarrito:", error);
    vaciarCarritoLocal();
  }
}

/* ================= CARRITO (FALLBACK LOCAL) ================= */
// Estas funciones solo se usan si no hay sesión activa
let carritoLocal = [];

function agregarACarritoLocal(productoId, cantidad = 1) {
  const existente = carritoLocal.find((item) => item.productoId === productoId);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carritoLocal.push({ productoId, cantidad });
  }
  return carritoLocal;
}

function actualizarCantidadCarritoLocal(productoId, cantidad) {
  if (cantidad <= 0) {
    carritoLocal = carritoLocal.filter(
      (item) => item.productoId !== productoId,
    );
  } else {
    const item = carritoLocal.find((item) => item.productoId === productoId);
    if (item) item.cantidad = cantidad;
  }
  return carritoLocal;
}

function quitarDelCarritoLocal(productoId) {
  carritoLocal = carritoLocal.filter((item) => item.productoId !== productoId);
  return true;
}

function vaciarCarritoLocal() {
  carritoLocal = [];
}

/* ================= FAVORITOS (API) ================= */

async function obtenerFavoritos() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return [];

    const respuesta = await fetch(`${API_URL}/favoritos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) return [];
    return await respuesta.json();
  } catch (error) {
    console.error("Error en obtenerFavoritos:", error);
    return [];
  }
}

async function esFavorito(productoId) {
  const favoritos = await obtenerFavoritos();
  return favoritos.includes(productoId);
}

async function alternarFavorito(productoId) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      console.warn("No hay sesión para guardar favoritos");
      return false;
    }

    const respuesta = await fetch(`${API_URL}/favoritos/${productoId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!respuesta.ok) throw new Error("Error al alternar favorito");
    const resultado = await respuesta.json();
    return resultado.esFavorito;
  } catch (error) {
    console.error("Error en alternarFavorito:", error);
    return false;
  }
}

/* ================= ENVÍO (API) ================= */

async function obtenerConfigEnvio() {
  try {
    const respuesta = await fetch(`${API_URL}/config/envio`);
    if (!respuesta.ok) return [{ desde: 1, costo: 100 }];
    return await respuesta.json();
  } catch (error) {
    console.error("Error en obtenerConfigEnvio:", error);
    return [{ desde: 1, costo: 100 }];
  }
}

async function guardarConfigEnvio(tramos) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) throw new Error("No hay sesión activa");

    const respuesta = await fetch(`${API_URL}/config/envio`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tramos),
    });

    if (!respuesta.ok)
      throw new Error("Error al guardar configuración de envío");
    await registrarActividad("Configuración de envío actualizada");
    return await respuesta.json();
  } catch (error) {
    console.error("Error en guardarConfigEnvio:", error);
    return tramos;
  }
}

async function calcularCostoEnvio(cantidadTotalUnidades) {
  const tramos = await obtenerConfigEnvio();
  if (!tramos || !tramos.length || cantidadTotalUnidades <= 0) return 0;
  const ordenados = [...tramos].sort((a, b) => a.desde - b.desde);
  let costo = ordenados[0].costo;
  for (const tramo of ordenados) {
    if (cantidadTotalUnidades >= tramo.desde) {
      costo = tramo.costo;
    }
  }
  return costo;
}

/* ================= DIRECCIÓN LOCAL (API) ================= */

async function obtenerDireccionLocal() {
  try {
    const respuesta = await fetch(`${API_URL}/config/direccion-local`);
    if (!respuesta.ok) return "";
    const data = await respuesta.json();
    return data.direccion || "";
  } catch (error) {
    console.error("Error en obtenerDireccionLocal:", error);
    return "";
  }
}

async function guardarDireccionLocal(direccion) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) throw new Error("No hay sesión activa");

    const respuesta = await fetch(`${API_URL}/config/direccion-local`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ direccion }),
    });

    if (!respuesta.ok) throw new Error("Error al guardar dirección");
    await registrarActividad("Dirección de retiro actualizada");
    return direccion;
  } catch (error) {
    console.error("Error en guardarDireccionLocal:", error);
    return direccion;
  }
}

/* ================= MONEDA (API) ================= */

async function obtenerConfigMoneda() {
  try {
    const respuesta = await fetch(`${API_URL}/config/moneda`);
    if (!respuesta.ok) return monedaCache;
    const config = await respuesta.json();
    monedaCache = config;
    return config;
  } catch (error) {
    console.error("Error en obtenerConfigMoneda:", error);
    return monedaCache;
  }
}

async function guardarConfigMoneda(config) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) throw new Error("No hay sesión activa");

    const respuesta = await fetch(`${API_URL}/config/moneda`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });

    if (!respuesta.ok) throw new Error("Error al guardar moneda");
    await registrarActividad(
      `Moneda actualizada a ${config.simbolo} (${config.codigo})`,
    );
    return await respuesta.json();
  } catch (error) {
    console.error("Error en guardarConfigMoneda:", error);
    return config;
  }
}

/* ================= FORMA DE ENTREGA (API) ================= */

async function obtenerConfigEntrega() {
  try {
    const respuesta = await fetch(`${API_URL}/config/entrega`);
    if (!respuesta.ok) return { metodo: "domicilio", direccion: "" };
    return await respuesta.json();
  } catch (error) {
    console.error("Error en obtenerConfigEntrega:", error);
    return { metodo: "domicilio", direccion: "" };
  }
}

async function guardarConfigEntrega(config) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      console.warn("No hay sesión, guardando en localStorage temporal");
      guardar("tienda_entrega_temp", config);
      return config;
    }

    const respuesta = await fetch(`${API_URL}/config/entrega`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });

    if (!respuesta.ok)
      throw new Error("Error al guardar configuración de entrega");
    return await respuesta.json();
  } catch (error) {
    console.error("Error en guardarConfigEntrega:", error);
    return config;
  }
}

/* ================= RESPALDO (EXPORTAR/IMPORTAR) ================= */

async function exportarCatalogo() {
  const productos = await obtenerProductos();
  const envio = await obtenerConfigEnvio();
  return JSON.stringify(
    {
      productos: productos,
      envio: envio,
      exportadoEl: new Date().toISOString(),
    },
    null,
    2,
  );
}

async function importarCatalogo(jsonTexto) {
  const datos = JSON.parse(jsonTexto);
  if (!Array.isArray(datos.productos)) {
    throw new Error(
      "El archivo no tiene un formato válido (falta 'productos').",
    );
  }

  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) throw new Error("No hay sesión activa");

  // Eliminar productos existentes
  const actuales = await obtenerProductos();
  for (const p of actuales) {
    await fetch(`${API_URL}/productos/${p._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Insertar nuevos productos
  for (const producto of datos.productos) {
    await fetch(`${API_URL}/productos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        precio: Number(producto.precio),
        formaEnvio: producto.formaEnvio || "Envío estándar",
        imagen: producto.imagen || "",
      }),
    });
  }

  if (Array.isArray(datos.envio)) {
    await guardarConfigEnvio(datos.envio);
  }

  await registrarActividad("Catálogo importado desde archivo de respaldo");
}

/* ================= ACTIVIDAD (API) ================= */

async function registrarActividad(mensaje) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    await fetch(`${API_URL}/actividad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mensaje }),
    });
  } catch (error) {
    console.error("Error en registrarActividad:", error);
  }
}

async function obtenerActividad() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return [];

    const respuesta = await fetch(`${API_URL}/actividad`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) return [];
    return await respuesta.json();
  } catch (error) {
    console.error("Error en obtenerActividad:", error);
    return [];
  }
}

/* ================= ADMIN (AUTENTICACIÓN) ================= */

async function iniciarSesionAdmin(contraseña) {
  try {
    const respuesta = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: contraseña }),
    });

    if (!respuesta.ok) return false;

    const datos = await respuesta.json();
    localStorage.setItem(STORAGE_KEYS.TOKEN, datos.token);
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESION, "1");
    await registrarActividad("Inicio de sesión de administrador");
    return true;
  } catch (error) {
    console.error("Error en iniciarSesionAdmin:", error);
    return false;
  }
}

async function verificarPassword(intento) {
  try {
    const respuesta = await fetch(`${API_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: intento }),
    });
    return respuesta.ok;
  } catch (error) {
    console.error("Error en verificarPassword:", error);
    return false;
  }
}

async function cambiarPassword(nueva) {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) throw new Error("No hay sesión activa");

    const respuesta = await fetch(`${API_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword: nueva }),
    });

    if (respuesta.ok) {
      await registrarActividad("Contraseña de administrador actualizada");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error en cambiarPassword:", error);
    return false;
  }
}

function cerrarSesionAdmin() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESION);
  registrarActividad("Cierre de sesión de administrador");
}

function haySesionAdmin() {
  return (
    sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESION) === "1" &&
    localStorage.getItem(STORAGE_KEYS.TOKEN) !== null
  );
}

/* ================= CLIENTE (AUTENTICACIÓN) ================= */

async function registrarCliente(nombre, email, password) {
  try {
    const respuesta = await fetch(`${API_URL}/client-auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password }),
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || "Error al registrarse");

    localStorage.setItem(STORAGE_KEYS.TOKEN, datos.token);
    localStorage.setItem(
      "tienda_usuario",
      JSON.stringify(datos.usuario),
    );
    return { exito: true, usuario: datos.usuario };
  } catch (error) {
    console.error("Error en registrarCliente:", error);
    return { exito: false, error: error.message };
  }
}

async function loginCliente(email, password) {
  try {
    const respuesta = await fetch(`${API_URL}/client-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error || "Error al iniciar sesión");

    localStorage.setItem(STORAGE_KEYS.TOKEN, datos.token);
    localStorage.setItem(
      "tienda_usuario",
      JSON.stringify(datos.usuario),
    );
    return { exito: true, usuario: datos.usuario };
  } catch (error) {
    console.error("Error en loginCliente:", error);
    return { exito: false, error: error.message };
  }
}

function logoutCliente() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem("tienda_usuario");
}

function obtenerUsuarioActual() {
  try {
    const datos = localStorage.getItem("tienda_usuario");
    return datos ? JSON.parse(datos) : null;
  } catch {
    return null;
  }
}

function haySesionCliente() {
  return (
    !haySesionAdmin() && localStorage.getItem(STORAGE_KEYS.TOKEN) !== null
  );
}
