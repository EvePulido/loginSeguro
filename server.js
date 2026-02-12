const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware para parsear los datos de los formularios
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// "Base de datos" en memoria para almacenar usuarios
const users = {}; // Objeto para almacenar { username: { passwordHash, salt } }

// Objeto para rastrear intentos de login fallidos
const loginAttempts = {};
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 1000; // 2 minutos

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
            return res.status(400).send('Las contraseñas no coinciden.');
        }

        // 2. Comprobar si el usuario ya existe
        if (users[username]) {
            return res.status(400).send('El nombre de usuario ya está en uso.');
        }

        // 3. Hashing de la contraseña
        // bcrypt.hash incluye el salting automáticamente. El 10 es el "cost factor".
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Almacenar usuario
        users[username] = { passwordHash: hashedPassword };
        console.log('Usuario registrado:', users); // Para depuración

        // 5. Redirigir a la página de login
        res.redirect('/login.html');

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al registrar el usuario.');
    }
});

// Ruta para la autenticación de usuarios
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = users[username];
        const now = Date.now();

        // --- Lógica de limitación de intentos ---
        if (loginAttempts[username] && loginAttempts[username].lockUntil > now) {
            const waitTime = Math.ceil((loginAttempts[username].lockUntil - now) / 1000);
            return res.status(429).send(`Demasiados intentos fallidos. Por favor, espere ${waitTime} segundos.`);
        }
        // -----------------------------------------

        const genericError = () => {
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
            res.redirect('/error.html');
        };

        if (!user) {
            return genericError();
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (isMatch) {
            // Éxito: resetear contador de intentos y redirigir a la bienvenida dinámica
            delete loginAttempts[username];
            res.redirect(`/welcome?user=${encodeURIComponent(username)}`);
        } else {
            // Fallo: registrar intento y mostrar error
            return genericError();
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor durante la autenticación.');
    }
});

// Ruta para la página de bienvenida dinámica
app.get('/welcome', (req, res) => {
    const username = req.query.user;
    const user = users[username];

    if (!user) {
        // Si no hay usuario o el usuario no existe, redirigir al login
        return res.redirect('/login.html');
    }

    // Leer el template de bienvenida
    fs.readFile(path.join(__dirname, 'public', 'welcome.html'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar la página de bienvenida.');
        }

        // Reemplazar los placeholders con los datos reales del usuario
        const personalizedHtml = data
            .replace(/{{USERNAME}}/g, username)
            .replace('{{HASHED_PASSWORD}}', user.passwordHash);

        res.send(personalizedHtml);
    });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});
