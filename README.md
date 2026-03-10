# Login Seguro

**Login Seguro** es un sistema de autenticación y gestión de sesiones desarrollado en Node.js. Proporciona un mecanismo robusto para el registro y el inicio de sesión de usuarios, diferenciando entre roles de **administrador** y **usuario estándar**, con una interfaz moderna y accesible construida con Bootstrap 5.

## 🚀 Características principales

*   **Autenticación segura:** Hashing de contraseñas utilizando `bcrypt` para proteger las credenciales de los usuarios.
*   **Gestión de sesiones:** Uso de `express-session` para mantener sesiones activas y seguras.
*   **Control de acceso basado en roles (RBAC):**
    *   **Administrador:** Acceso a un panel de control exclusivo (`/admin`) para visualizar todos los usuarios registrados.
    *   **Usuario:** Acceso a una pantalla de bienvenida personalizada (`/welcome`).
*   **Seguridad:**
    *   Protección contra ataques de fuerza bruta (bloqueo temporal tras múltiples intentos fallidos).
    *   Uso de variables de entorno para credenciales sensibles.
    *   **Google reCAPTCHA v3:** Protección invisible contra bots y scripts automatizados en el inicio de sesión y registro.
*   **Interfaz moderna:** Diseño responsivo y accesible utilizando Bootstrap 5.
*   **Retroalimentación visual:** Notificaciones (*toasts* y modales) para informar al usuario sobre el estado de sus acciones (éxito, error, advertencia).

## 🛡️ Implementación de Google reCAPTCHA v3

Se ha integrado reCAPTCHA v3 para asegurar que las interacciones en los formularios de acceso y registro sean realizadas por humanos, sin interrumpir la experiencia del usuario.

### 1. Configuración de Credenciales (`.env`)
Se debe configurar la llave secreta proporcionada por Google en el archivo de entorno:

```env
RECAPTCHA_SECRET_KEY=tu_llave_secreta_aqui
```

### 2. Verificación en el Servidor (`server.js`)
El servidor valida el token enviado por el cliente consultando la API de Google. Se ha establecido un umbral de confianza de **0.5** (donde 1.0 es un humano y 0.0 es un bot).

```javascript
const verifyRecaptcha = async (token) => {
    // Consulta a https://www.google.com/recaptcha/api/siteverify
    // Retorna true si data.score >= 0.5
};
```

Además, el servidor imprime en consola el resultado de cada verificación para monitoreo en tiempo real:
- **Resultado:** EXITOSO / FALLIDO
- **Puntuación (Score):** Valor asignado por Google (ej. 0.9)

### 3. Integración en el Frontend
Se carga el script de Google y se intercepta el envío de los formularios para generar el token de seguridad:

```javascript
grecaptcha.execute('tu_llave_de_sitio', {action: 'login/register'}).then(function(token) {
    document.getElementById('recaptchaResponse').value = token;
    document.getElementById('formId').submit();
});
```

## 🛠️ Tecnologías utilizadas

*   **Backend:**
    *   [Node.js](https://nodejs.org/) - Entorno de ejecución para JavaScript.
    *   [Express](https://expressjs.com/) - Framework web para Node.js.
    *   [bcrypt](https://www.npmjs.com/package/bcrypt) - Librería para el hashing de contraseñas.
    *   [express-session](https://www.npmjs.com/package/express-session) - Middleware para la gestión de sesiones.
    *   [dotenv](https://www.npmjs.com/package/dotenv) - Carga de variables de entorno.
*   **Frontend:**
    *   HTML5 y CSS3.
    *   [Bootstrap 5](https://getbootstrap.com/) - Framework CSS para diseño responsivo.
    *   JavaScript (ES6+) - Lógica del lado del cliente.

## 📋 Requisitos previos

*   Tener instalado [Node.js](https://nodejs.org/) (v14 o superior recomendado).
*   Tener instalado [npm](https://www.npmjs.com/) (normalmente viene con Node.js).
*   Un editor de código como Visual Studio Code.

## ⚙️ Instalación y configuración

Sigue estos pasos para ejecutar el proyecto en tu entorno local:

1.  **Clonar el repositorio:**

    ```bash
    git clone https://github.com/EvePulido/loginSeguro.git
    cd loginSeguro
    ```

2.  **Instalar las dependencias:**

    ```bash
    npm install
    ```

3.  **Configurar las variables de entorno:**

    Crea un archivo llamado `.env` en la raíz del proyecto (al mismo nivel que `server.js` y `package.json`). Copia y pega el siguiente contenido, ajustando las credenciales según tu preferencia:

    ```env
    # Credenciales del administrador del sistema
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=admin123
    ```

    > **Nota:** El archivo `.env` es ignorado por git por seguridad, por lo que debes crearlo manualmente.

4.  **Iniciar el servidor:**

    ```bash
    npm start
    ```
    
    Verás un mensaje en la consola indicando: `Servidor iniciado en http://localhost:3000`.

## 📖 Uso

1.  Abre tu navegador web y visita `http://localhost:3000`.
2.  **Registro de usuario:**
    *   Ve a la opción "Regístrate aquí".
    *   Crea una cuenta nueva. Si el usuario ya existe, verás un modal de error.
3.  **Inicio de sesión (usuario):**
    *   Inicia sesión con las credenciales que acabas de crear.
    *   Serás redirigido a la pantalla de bienvenida con la barra de navegación azul.
4.  **Inicio de sesión (admin):**
    *   Utiliza las credenciales definidas en tu archivo `.env` (ej. `admin` / `admin123`).
    *   Accederás al **panel de administración** donde podrás ver la tabla de usuarios registrados.

## 📂 Estructura del proyecto

```text
loginSeguro/
├── .env                # Variables de entorno (NO se sube al repo)
├── .gitignore          # Archivos ignorados por Git
├── package.json        # Dependencias y scripts
├── server.js           # Lógica del servidor (Entry point)
└── public/             # Archivos estáticos (Frontend)
    ├── login.html      # Página de inicio de sesión
    ├── register.html   # Página de registro
    ├── welcome.html    # Dashboard de usuario
    └── admin.html      # Dashboard de administrador
```

---
Desarrollado con ❤️ para un desarrollo seguro.
