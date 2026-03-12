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

## 🛡️ Implementación Detallada de Google reCAPTCHA v3

A continuación se describe el proceso técnico de integración paso a paso:

### Paso 1: Configuración de Seguridad (`.env`)
Para que el servidor pueda comunicarse con la API de Google de forma privada, guardé tu **Llave Secreta** en el archivo de variables de entorno.

**Código implementado:**
```env
RECAPTCHA_SECRET_KEY=
```
*   **Por qué:** Esto evita que la llave secreta sea visible en el código del navegador (frontend), protegiendo tu cuenta de Google de usos no autorizados.

---

### Paso 2: El "Cerebro" de Verificación (`server.js`)
Creé una función asíncrona llamada `verifyRecaptcha` que se encarga de hablar con los servidores de Google para validar si el usuario es un humano.

**Código implementado:**
```javascript
const verifyRecaptcha = async (token) => {
    if (!token) {
        console.log('RECAPTCHA: No se recibió ningún token.');
        return false;
    }

    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        // Petición POST a la API de Google
        const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
            method: 'POST'
        });
        const data = await response.json();

        // Logs detallados para que tú veas el funcionamiento en consola
        console.log('\n--- Verificación de reCAPTCHA ---');
        console.log(`Resultado: ${data.success ? 'EXITOSO' : 'FALLIDO'}`);
        console.log(`Puntuación (Score): ${data.score}`); // 1.0 es humano, 0.0 es bot
        console.log('---------------------------------\n');

        // Retorna true si Google confirma éxito y la puntuación es aceptable (>= 0.5)
        return data.success && data.score >= 0.5;
    } catch (error) {
        console.error('Error verificando reCAPTCHA:', error);
        return false;
    }
};
```

---

### Paso 3: Protección de los Formularios (`public/login.html` y `public/register.html`)
Modifiqué el frontend para que, antes de enviar los datos, le pida un "token de confianza" a Google.

**Código implementado (HTML):**
Primero, incluí la librería de Google y un campo oculto en el formulario:
```html
<!-- Script de Google con tu Llave de Sitio -->
<script src="https://www.google.com/recaptcha/api.js?render=6LcP8oUsAAAAADZHB-5SX59Ey8qgoMbUS9rBogoB"></script>

<!-- Campo oculto dentro del form -->
<input type="hidden" name="g-recaptcha-response" id="recaptchaResponse">
```

**Código implementado (JavaScript):**
Intercepté el evento de "submit" para generar el token:
```javascript
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Detiene el envío normal
    grecaptcha.ready(function() {
        // Ejecuta la validación invisible
        grecaptcha.execute('6LcP8oUsAAAAADZHB-5SX59Ey8qgoMbUS9rBogoB', {action: 'login'}).then(function(token) {
            // Guarda el token en el campo oculto y envía el formulario
            document.getElementById('recaptchaResponse').value = token;
            document.getElementById('loginForm').submit();
        });
    });
});
```

---

### Paso 4: Validación Obligatoria en las Rutas (`server.js`)
Actualicé las rutas de `/login` y `/register` para que el reCAPTCHA sea la primera línea de defensa.

**Código implementado (Ejemplo en `/login`):**
```javascript
app.post('/login', async (req, res) => {
    try {
        // Extraemos el token que viene del campo oculto 'g-recaptcha-response'
        const { username, password, 'g-recaptcha-response': recaptchaToken } = req.body;

        // Validamos con la función del Paso 2
        const isHuman = await verifyRecaptcha(recaptchaToken);
        if (!isHuman) {
            // Si falla, detenemos todo y avisamos al usuario
            return res.redirect('/login.html?error=captcha');
        }

        // ... El resto del código de login sigue aquí ...
    } catch (error) { /* ... */ }
});
```

---

### Paso 5: Mensajes de Error en la Interfaz
Por último, añadí lógica para que el usuario sepa por qué falló su acceso si el CAPTCHA lo bloquea.

**Código implementado (JavaScript en el HTML):**
```javascript
if (error === 'captcha') {
    message = 'Error en la verificación de seguridad (CAPTCHA).';
    type = 'danger'; // Color rojo en el aviso de Bootstrap
}
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
├── db.js               # Conexión y configuración de la base de datos
├── package.json        # Dependencias y scripts
├── server.js           # Lógica principal del servidor (Entry point)
├── public/             # Archivos estáticos (Frontend)
│   ├── admin.html      # Dashboard de administrador
│   ├── login.html      # Página de inicio de sesión
│   ├── register.html   # Página de registro
│   └── welcome.html    # Dashboard de usuario
└── routes/             # Definición de rutas de la aplicación
    ├── admin.js        # Rutas administrativas
    └── auth.js         # Rutas de autenticación
```

## 👥 Integrantes

*   **Juan Pablo Jiménez Ramírez**
*   **Ian Anthony Pérez González**
*   **Evelyn Damarys Pulido Méndez**
*   **Omar Imanol Rodríguez Rodríguez**

---
Desarrollado con ❤️ para un desarrollo seguro.
