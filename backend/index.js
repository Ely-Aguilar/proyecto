// Desarrollador: Ely Yhanel Aguilar Jimenez - RU: e123375 / CI: 12625705
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 5000;
const DIAS_PRESTAMO = 7;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Backend de BiblioSur funcionando' });
});

// HU01 (consultar catálogo) y HU02 (buscar por título)
app.get('/api/libros', async (req, res) => {
  const titulo = String(req.query.titulo ?? '').trim();
  const libros = await prisma.libro.findMany({
    where: titulo ? { titulo: { contains: titulo, mode: 'insensitive' } } : {},
    orderBy: { titulo: 'asc' },
    select: {
      id: true,
      titulo: true,
      autor: true,
      isbn: true,
      categoria: true,
      stock: true,
    },
  });
  res.json(libros.map((libro) => ({ ...libro, disponible: libro.stock > 0 })));
});

// Lista de usuarios (sin passwordHash) para el selector de préstamos
app.get('/api/usuarios', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, email: true, rol: true },
  });
  res.json(usuarios);
});

// Lista de préstamos registrados
app.get('/api/prestamos', async (req, res) => {
  const prestamos = await prisma.prestamo.findMany({
    orderBy: { fechaPrestamo: 'desc' },
    select: {
      id: true,
      fechaPrestamo: true,
      fechaLimite: true,
      estado: true,
      usuario: { select: { nombre: true } },
      libro: { select: { titulo: true } },
    },
  });
  res.json(prestamos);
});

// HU03: registrar un préstamo
app.post('/api/prestamos', async (req, res) => {
  const { usuarioId, libroId } = req.body ?? {};
  const idUsuario = Number(usuarioId);
  const idLibro = Number(libroId);

  if (
    !Number.isInteger(idUsuario) || idUsuario < 1 ||
    !Number.isInteger(idLibro) || idLibro < 1
  ) {
    throw new HttpError(400, 'Debes seleccionar un usuario y un libro.');
  }

  const prestamo = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id: idUsuario } });
    if (!usuario) throw new HttpError(404, 'El usuario no existe.');

    const libro = await tx.libro.findUnique({ where: { id: idLibro } });
    if (!libro) throw new HttpError(404, 'El libro no existe.');

    const actualizado = await tx.libro.updateMany({
      where: { id: idLibro, stock: { gt: 0 } },
      data: { stock: { decrement: 1 } },
    });
    if (actualizado.count === 0) {
      throw new HttpError(409, 'El libro no está disponible.');
    }

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + DIAS_PRESTAMO);

    return tx.prestamo.create({
      data: {
        usuarioId: idUsuario,
        libroId: idLibro,
        fechaLimite,
        estado: 'ACTIVO',
      },
      select: {
        id: true,
        fechaLimite: true,
        estado: true,
        usuario: { select: { nombre: true } },
        libro: { select: { titulo: true } },
      },
    });
  });

  res.status(201).json(prestamo);
});

app.use((error, req, res, next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor BiblioSur corriendo en el puerto ${PORT}`);
});
