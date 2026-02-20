const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware para parsear los datos de los formularios
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la sesión
app.use(session({
    secret: 'a_secret_key_that_is_very_secret_and_long', // Cambia esto por una clave secreta real y segura
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Para desarrollo. En producción, usa true y HTTPS
}));

// "Base de datos" en memoria para almacenar usuarios
const users = {}; // Objeto para almacenar { username: { passwordHash, salt } }

// Objeto para rastrear intentos de login fallidos
const loginAttempts = {};
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 1000; // 2 minutos

// Middleware para proteger rutas
const checkAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login.html');
    }
};


// Ruta principal que ahora redirige a la página de login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Ruta para el registro de usuarios
app.post('/register', async (req, res) => {
    try {
        const { username, password, confirmPassword } = req.body;

        // 1. Validar entradas
        if (!username || !password || !confirmPassword) {
            return res.status(400).send('Todos los campos son obligatorios.');
        }
        if (password !== confirmPassword) {
            return res.redirect('/register.html?error=mismatch');
        }

        // 2. Comprobar si el usuario ya existe
        if (users[username]) {
            return res.redirect('/register.html?error=exists');
        }

        // 3. Hashing de la contraseña
        // bcrypt.hash incluye el salting automáticamente. El 10 es el "cost factor".
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Almacenar usuario
        users[username] = { passwordHash: hashedPassword };

        // 5. Redirigir a la página de login con un mensaje de éxito
        res.redirect('/login.html?status=registered');

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al registrar el usuario.');
    }
});

// Ruta para la autenticación de usuarios
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const now = Date.now();

        // Verificar si es admin
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            req.session.user = { username: username, role: 'admin' };
            return res.redirect('/admin');
        }

        const user = users[username];

        // --- Lógica de limitación de intentos ---
        if (loginAttempts[username] && loginAttempts[username].lockUntil > now) {
            const waitTime = Math.ceil((loginAttempts[username].lockUntil - now) / 1000);
            return res.status(429).send(`Demasiados intentos fallidos. Por favor, espere ${waitTime} segundos.`);
        }
        // -----------------------------------------

        const handleError = () => {
            // Incrementar intentos fallidos
            if (!loginAttempts[username]) {
                loginAttempts[username] = { attempts: 1, lockUntil: 0 };
            } else {
                loginAttempts[username].attempts++;
            }

            // Bloquear si se excede el límite
            if (loginAttempts[username].attempts >= MAX_ATTEMPTS) {
                loginAttempts[username].lockUntil = now + LOCK_TIME;
                console.log(`Usuario ${username} bloqueado por ${LOCK_TIME / 1000}s`);
            }

            console.log('Intentos fallidos para', username, ':', loginAttempts[username]); // Para depuración
            res.redirect('/login.html?error=invalid');
        };

        if (!user) {
            return handleError();
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (isMatch) {
            // Éxito: resetear contador de intentos y crear la sesión
            delete loginAttempts[username];
            req.session.user = { username: username, role: 'user' };
            res.redirect('/welcome');
        } else {
            // Fallo: registrar intento y mostrar error
            return handleError();
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor durante la autenticación.');
    }
});

// Ruta de logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('No se pudo cerrar la sesión.');
        }
        res.redirect('/login.html');
    });
});


// Ruta para la página de bienvenida dinámica, ahora protegida
app.get('/welcome', checkAuth, (req, res) => {
    const username = req.session.user.username;

    // Leer el template de bienvenida
    fs.readFile(path.join(__dirname, 'public', 'welcome.html'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar la página de bienvenida.');
        }

        // Reemplazar los placeholders con los datos reales del usuario
        const personalizedHtml = data
            .replace(/{{USERNAME}}/g, username);

        res.send(personalizedHtml);
    });
});

// Middleware para verificar admin
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/login.html');
    }
};

// Ruta para el panel de administración
app.get('/admin', checkAdmin, (req, res) => {
    const username = req.session.user.username;

    // Generar filas de la tabla
    let tableRows = '';
    for (const [user, data] of Object.entries(users)) {
        tableRows += `<tr>
            <td>${user}</td>
            <td>${data.passwordHash}</td>
        </tr>`;
    }

    // Leer el template de admin
    fs.readFile(path.join(__dirname, 'public', 'admin.html'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar el panel de administración.');
        }

        // Reemplazar los placeholders
        const personalizedHtml = data
            .replace(/{{USERNAME}}/g, username)
            .replace('{{TABLE_ROWS}}', tableRows);

        res.send(personalizedHtml);
    });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});
