const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3001; // CAMBIAMOS AL 3001 PARA EVITAR EL OTRO SERVIDOR

// Middleware para parsear los datos de los formularios
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la sesión
app.use(session({
    secret: 'a_secret_key_that_is_very_secret_and_long', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// RUTA PRINCIPAL (Redirección al login)
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Conectar los Routers
app.use('/', authRoutes);
app.use('/admin', adminRoutes);

// Iniciar el servidor
app.listen(port, () => {
    console.log(`\n-----------------------------------------`);
    console.log(`TU SERVIDOR REAL ESTÁ CORRIENDO EN:`);
    console.log(`http://localhost:${port}`);
    console.log(`-----------------------------------------\n`);
});
