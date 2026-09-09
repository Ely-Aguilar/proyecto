// Desarrollador: Ely Yhanel Aguilar Jimenez - RU: e123375 / CI: 12625705
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Backend de BiblioSur funcionando' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor BiblioSur corriendo en el puerto ${PORT}`);
});