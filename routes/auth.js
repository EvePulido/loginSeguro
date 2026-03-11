const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const fs = require('fs');
const path = require('path');

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

// Función para verificar reCAPTCHA v3
const verifyRecaptcha = async (token) => {
    if (!token) {
        console.log('RECAPTCHA: No se recibió ningún token.');
        return false;
    }
    
    try {
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
            method: 'POST'
        });
        const data = await response.json();
        
        console.log('\n--- Verificación de reCAPTCHA ---');
        console.log(`Fecha/Hora: ${new Date().toLocaleString()}`);
        console.log(`Resultado: ${data.success ? 'EXITOSO' : 'FALLIDO'}`);
        console.log(`Puntuación (Score): ${data.score}`);
        console.log('---------------------------------\n');

        return data.success && data.score >= 0.5;
    } catch (error) {
        console.error('Error verificando reCAPTCHA:', error);
        return false;
    }
};

router.post('/register', async (req, res) => {
    try {
        const { username, password, confirmPassword, 'g-recaptcha-response': recaptchaToken } = req.body;

        const isHuman = await verifyRecaptcha(recaptchaToken);
        if (!isHuman) {
            return res.redirect('/register.html?error=captcha');
        }

        if (!username || !password || !confirmPassword) {
            return res.status(400).send('Todos los campos son obligatorios.');
        }
        if (password !== confirmPassword) {
            return res.redirect('/register.html?error=mismatch');
        }

        if (db.users[username]) {
            return res.redirect('/register.html?error=exists');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        db.users[username] = { passwordHash: hashedPassword };

        res.redirect('/login.html?status=registered');

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor al registrar el usuario.');
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password, 'g-recaptcha-response': recaptchaToken } = req.body;
        const now = Date.now();

        const isHuman = await verifyRecaptcha(recaptchaToken);
        if (!isHuman) {
            return res.redirect('/login.html?error=captcha');
        }

        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            req.session.user = { username: username, role: 'admin' };
            return res.redirect('/admin');
        }

        const user = db.users[username];

        if (db.loginAttempts[username] && db.loginAttempts[username].lockUntil > now) {
            const waitTime = Math.ceil((db.loginAttempts[username].lockUntil - now) / 1000);
            return res.status(429).send(`Demasiados intentos fallidos. Por favor, espere ${waitTime} segundos.`);
        }

        const handleError = () => {
            if (!db.loginAttempts[username]) {
                db.loginAttempts[username] = { attempts: 1, lockUntil: 0 };
            } else {
                db.loginAttempts[username].attempts++;
            }

            if (db.loginAttempts[username].attempts >= MAX_ATTEMPTS) {
                db.loginAttempts[username].lockUntil = now + LOCK_TIME;
                console.log(`Usuario ${username} bloqueado por ${LOCK_TIME / 1000}s`);
            }

            res.redirect('/login.html?error=invalid');
        };

        if (!user) {
            return handleError();
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (isMatch) {
            delete db.loginAttempts[username];
            req.session.user = { username: username, role: 'user' };
            res.redirect('/welcome');
        } else {
            return handleError();
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor durante la autenticación.');
    }
});

router.get('/welcome', checkAuth, (req, res) => {
    const username = req.session.user.username;

    fs.readFile(path.join(__dirname, '..', 'public', 'welcome.html'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar la página de bienvenida.');
        }

        const personalizedHtml = data.replace(/{{USERNAME}}/g, username);
        res.send(personalizedHtml);
    });
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('No se pudo cerrar la sesión.');
        }
        res.redirect('/login.html');
    });
});

module.exports = router;
