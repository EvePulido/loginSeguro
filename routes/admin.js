const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.redirect('/login.html');
    }
}

router.get('/', checkAdmin, (req, res) => {
    const username = req.session.user.username;

    // Generar filas de la tabla
    let tableRows = '';
    for (const [user, data] of Object.entries(db.users)) {
        tableRows += `<tr>
            <td>${user}</td>
            <td>${data.passwordHash}</td>
            <td>
                <button class="btn btn-sm btn-warning edit-btn" data-username="${user}">Editar</button>
                <button class="btn btn-sm btn-danger delete-btn" data-username="${user}">Eliminar</button>
            </td>
        </tr>`;
    }

    // Leer el template de admin
    fs.readFile(path.join(__dirname, '..', 'public', 'admin.html'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar el panel de administración.');
        }

        const personalizedHtml = data
            .replace(/{{USERNAME}}/g, username)
            .replace('{{TABLE_ROWS}}', tableRows);

        res.send(personalizedHtml);
    });
});

router.post('/edit-user', checkAdmin, async (req, res) => {
    const { username, newUsername, newPassword } = req.body;

    if (!db.users[username]) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    let currentUsername = username;

    if (newUsername && newUsername !== username) {
        if (db.users[newUsername]) {
            return res.status(400).json({ success: false, message: 'El nuevo nombre de usuario ya está en uso' });
        }
        db.users[newUsername] = db.users[username];
        delete db.users[username];
        currentUsername = newUsername;

        if (db.loginAttempts[username]) {
            db.loginAttempts[newUsername] = db.loginAttempts[username];
            delete db.loginAttempts[username];
        }
    }

    if (newPassword && newPassword.length > 0) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        db.users[currentUsername].passwordHash = hashedPassword;
    }

    res.json({ success: true });
});

router.post('/delete-user', checkAdmin, (req, res) => {
    const { username } = req.body;
    if (db.users[username]) {
        delete db.users[username];
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
});

module.exports = router;
