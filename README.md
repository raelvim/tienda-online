# 🛍️ Mi Tienda Online

Tienda online completa con panel de administración, carrito de compras, favoritos y gestión de envíos.

## Arquitectura

```
├── index.html          # Tienda pública (clientes)
├── admin.html          # Panel de administración
├── css/styles.css      # Estilos compartidos
├── js/
│   ├── data.js         # Capa de datos (API + localStorage)
│   ├── ui.js           # Utilidades visuales (toasts, formato)
│   ├── store.js        # Lógica de la tienda pública
│   └── admin.js        # Lógica del panel admin
└── backend/
    └── src/
        ├── server.js   # Servidor Express
        ├── db.js       # Conexión MongoDB
        ├── models/     # Modelos Mongoose (Producto, Config, Actividad, Usuario)
        ├── routes/     # Rutas API (auth, productos, config, carrito, favoritos, actividad)
        ├── middleware/  # Auth JWT (verificarToken, soloAdmin)
        └── utils/      # Cloudinary (subida de imágenes)
```

## Stack

- **Frontend**: HTML + CSS + JavaScript vanilla (sin framework)
- **Backend**: Node.js + Express
- **Base de datos**: MongoDB Atlas
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Imágenes**: Cloudinary (almacenamiento en la nube)
- **Deploy**: Render (backend) + Netlify (frontend)

## Variables de entorno

Crea un archivo `backend/.env` basado en `.env.example`:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tienda
JWT_SECRET=tu-secreto-largo-y-aleatorio
ADMIN_PASSWORD=tu-password-admin
PORT=4000
CORS_ORIGIN=https://tu-tienda.netlify.app,http://localhost:5500
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

## Desarrollo local

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Editar con tus datos
npm run dev

# Frontend (usar Live Server de VS Code o similar en puerto 5500)
```

## Despliegue

### Backend (Render)
1. Crear cuenta en [render.com](https://render.com)
2. Conectar tu repositorio GitHub
3. Crear un "Web Service" apuntando a la carpeta `backend`
4. Configurar las variables de entorno en el dashboard de Render
5. El backend se desplegará en `https://tu-backend.onrender.com`

### Frontend (Netlify)
1. Crear cuenta en [netlify.com](https://netlify.com)
2. Conectar tu repositorio GitHub
3. Editar `netlify.toml` → reemplazar `tu-backend-en-render.onrender.com` con la URL real de tu backend
4. Desplegar

### MongoDB Atlas (gratis)
1. Crear cuenta en [mongodb.com/atlas](https://mongodb.com/atlas)
2. Crear un cluster gratuito (M0)
3. Crear un usuario de base de datos
4. Whitelist: `0.0.0.0/0` (acceso desde cualquier IP)
5. Copiar la URI de conexión a `MONGODB_URI`

### Cloudinary (gratis)
1. Crear cuenta en [cloudinary.com](https://cloudinary.com)
2. Copiar Cloud Name, API Key y API Secret al `.env`

## Funcionalidades

### Tienda pública (`index.html`)
- ✅ Catálogo de productos con búsqueda
- ✅ Sistema de favoritos (❤️)
- ✅ Carrito de compras con cantidades
- ✅ Envío a domicilio o retiro en local
- ✅ Configuración de costo de envío por tramos
- ✅ Múltiples monedas (MXN, USD, ARS, COP, CLP, EUR, personalizada)
- ✅ Registro e inicio de sesión de clientes

### Panel admin (`admin.html`)
- ✅ Login con contraseña (bcrypt + JWT)
- ✅ CRUD de productos (crear, editar, eliminar)
- ✅ Subida de imágenes (Cloudinary)
- ✅ Configuración de envío por tramos
- ✅ Configuración de moneda
- ✅ Dirección de retiro en local
- ✅ Cambio de contraseña
- ✅ Estadísticas (productos, valor catálogo, favoritos, carritos)
- ✅ Registro de actividad reciente
- ✅ Exportar/importar catálogo (respaldo JSON)

## Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración (7 días admin, 30 días clientes)
- Rutas admin protegidas con middleware `soloAdmin`
- CORS configurado por dominio
- `JWT_SECRET` obligatorio en producción
- Límite de tamaño en uploads (5MB)
