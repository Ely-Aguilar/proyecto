// Desarrollador: Ely Yhanel Aguilar Jimenez - RU: e123375 / CI: 12625705
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 5000;
const DIAS_PRESTAMO = 7;
const DIAS_MAXIMO = 60;
const ROLES = ['ESTUDIANTE', 'DOCENTE', 'BIBLIOTECARIO', 'ADMINISTRADOR'];

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

const SELECT_LIBRO = {
  id: true,
  titulo: true,
  autor: true,
  isbn: true,
  categoria: true,
  stock: true,
};
const SELECT_USUARIO = { id: true, nombre: true, email: true, rol: true };
const SELECT_PRESTAMO = {
  id: true,
  fechaPrestamo: true,
  fechaLimite: true,
  fechaDevolucion: true,
  estado: true,
  usuario: { select: { nombre: true } },
  libro: { select: { titulo: true } },
};

const conDisponible = (libro) => ({ ...libro, disponible: libro.stock > 0 });
const conAtraso = (prestamo) => ({
  ...prestamo,
  atrasado:
    prestamo.estado !== 'DEVUELTO' && new Date(prestamo.fechaLimite) < new Date(),
});

function textoRequerido(valor, campo, max = 200) {
  const texto = String(valor ?? '').trim();
  if (!texto) throw new HttpError(400, `El campo ${campo} es obligatorio.`);
  if (texto.length > max) {
    throw new HttpError(400, `El campo ${campo} es demasiado largo.`);
  }
  return texto;
}

function idDeRuta(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'Identificador inválido.');
  }
  return id;
}

function validarLibro(body) {
  const { titulo, autor, isbn, categoria, stock } = body ?? {};
  const datos = {
    titulo: textoRequerido(titulo, 'título'),
    autor: textoRequerido(autor, 'autor'),
    isbn: textoRequerido(isbn, 'ISBN', 30),
    categoria: textoRequerido(categoria, 'categoría', 100),
    stock: Number(stock),
  };
  if (!Number.isInteger(datos.stock) || datos.stock < 0 || datos.stock > 10000) {
    throw new HttpError(400, 'El stock debe ser un número entero mayor o igual a 0.');
  }
  return datos;
}

function validarUsuario(body, passwordObligatoria) {
  const { nombre, email, password, rol } = body ?? {};
  const nombreOk = textoRequerido(nombre, 'nombre');
  const emailOk = textoRequerido(email, 'correo').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOk)) {
    throw new HttpError(400, 'El correo no tiene un formato válido.');
  }
  const rolOk = rol ?? 'ESTUDIANTE';
  if (!ROLES.includes(rolOk)) throw new HttpError(400, 'El rol no es válido.');

  const clave = String(password ?? '');
  if ((passwordObligatoria || clave) && (clave.length < 6 || clave.length > 72)) {
    throw new HttpError(400, 'La contraseña debe tener entre 6 y 72 caracteres.');
  }
  return { nombre: nombreOk, email: emailOk, rol: rolOk, clave };
}

async function verificarNoEsUltimoAdmin(usuario) {
  if (usuario.rol !== 'ADMINISTRADOR') return;
  const admins = await prisma.usuario.count({ where: { rol: 'ADMINISTRADOR' } });
  if (admins <= 1) {
    throw new HttpError(409, 'No se puede quitar al último administrador.');
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mensaje: 'Backend de BiblioSur funcionando' });
});

// ---------- LIBROS ----------

// HU01 (consultar catálogo) y HU02 (buscar por título o autor)
app.get('/api/libros', async (req, res) => {
  const texto = String(req.query.titulo ?? '').trim();
  const libros = await prisma.libro.findMany({
    where: texto
      ? {
          OR: [
            { titulo: { contains: texto, mode: 'insensitive' } },
            { autor: { contains: texto, mode: 'insensitive' } },
          ],
        }
      : {},
    orderBy: { titulo: 'asc' },
    select: SELECT_LIBRO,
  });
  res.json(libros.map(conDisponible));
});

app.post('/api/libros', async (req, res) => {
  const datos = validarLibro(req.body);
  const existente = await prisma.libro.findUnique({ where: { isbn: datos.isbn } });
  if (existente) throw new HttpError(409, 'Ya existe un libro con ese ISBN.');

  const libro = await prisma.libro.create({ data: datos, select: SELECT_LIBRO });
  res.status(201).json(conDisponible(libro));
});

app.put('/api/libros/:id', async (req, res) => {
  const id = idDeRuta(req.params.id);
  const datos = validarLibro(req.body);

  const actual = await prisma.libro.findUnique({ where: { id } });
  if (!actual) throw new HttpError(404, 'El libro no existe.');

  const repetido = await prisma.libro.findFirst({
    where: { isbn: datos.isbn, NOT: { id } },
  });
  if (repetido) throw new HttpError(409, 'Ya existe otro libro con ese ISBN.');

  const libro = await prisma.libro.update({
    where: { id },
    data: datos,
    select: SELECT_LIBRO,
  });
  res.json(conDisponible(libro));
});

app.delete('/api/libros/:id', async (req, res) => {
  const id = idDeRuta(req.params.id);
  await prisma.$transaction(async (tx) => {
    const libro = await tx.libro.findUnique({ where: { id } });
    if (!libro) throw new HttpError(404, 'El libro no existe.');

    const pendientes = await tx.prestamo.count({
      where: { libroId: id, estado: { not: 'DEVUELTO' } },
    });
    if (pendientes > 0) {
      throw new HttpError(
        409,
        'No se puede eliminar: el libro está prestado. Registra primero su devolución.'
      );
    }

    await tx.prestamo.deleteMany({ where: { libroId: id } });
    await tx.reserva.deleteMany({ where: { libroId: id } });
    await tx.libro.delete({ where: { id } });
  });
  res.status(204).end();
});

// ---------- USUARIOS ----------

app.get('/api/usuarios', async (req, res) => {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { nombre: 'asc' },
    select: SELECT_USUARIO,
  });
  res.json(usuarios);
});

app.post('/api/usuarios', async (req, res) => {
  const { nombre, email, rol, clave } = validarUsuario(req.body, true);
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) throw new HttpError(409, 'Ya existe un usuario con ese correo.');

  const passwordHash = await bcrypt.hash(clave, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, email, rol, passwordHash },
    select: SELECT_USUARIO,
  });
  res.status(201).json(usuario);
});

app.put('/api/usuarios/:id', async (req, res) => {
  const id = idDeRuta(req.params.id);
  const { nombre, email, rol, clave } = validarUsuario(req.body, false);

  const actual = await prisma.usuario.findUnique({ where: { id } });
  if (!actual) throw new HttpError(404, 'El usuario no existe.');

  if (email !== actual.email) {
    const repetido = await prisma.usuario.findUnique({ where: { email } });
    if (repetido) throw new HttpError(409, 'Ya existe un usuario con ese correo.');
  }

  if (actual.rol === 'ADMINISTRADOR' && rol !== 'ADMINISTRADOR') {
    await verificarNoEsUltimoAdmin(actual);
  }

  const datos = { nombre, email, rol };
  if (clave) datos.passwordHash = await bcrypt.hash(clave, 10);

  const usuario = await prisma.usuario.update({
    where: { id },
    data: datos,
    select: SELECT_USUARIO,
  });
  res.json(usuario);
});

app.delete('/api/usuarios/:id', async (req, res) => {
  const id = idDeRuta(req.params.id);
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new HttpError(404, 'El usuario no existe.');
  await verificarNoEsUltimoAdmin(usuario);

  await prisma.$transaction(async (tx) => {
    const pendientes = await tx.prestamo.count({
      where: { usuarioId: id, estado: { not: 'DEVUELTO' } },
    });
    if (pendientes > 0) {
      throw new HttpError(
        409,
        'No se puede eliminar: el usuario tiene préstamos sin devolver.'
      );
    }
    await tx.prestamo.deleteMany({ where: { usuarioId: id } });
    await tx.reserva.deleteMany({ where: { usuarioId: id } });
    await tx.usuario.delete({ where: { id } });
  });
  res.status(204).end();
});

// ---------- PRÉSTAMOS ----------

app.get('/api/prestamos', async (req, res) => {
  const prestamos = await prisma.prestamo.findMany({
    orderBy: { fechaPrestamo: 'desc' },
    select: SELECT_PRESTAMO,
  });
  res.json(prestamos.map(conAtraso));
});

// HU03: registrar un préstamo
app.post('/api/prestamos', async (req, res) => {
  const { usuarioId, libroId, dias } = req.body ?? {};
  const idUsuario = Number(usuarioId);
  const idLibro = Number(libroId);
  const diasPrestamo =
    dias === undefined || dias === '' ? DIAS_PRESTAMO : Number(dias);

  if (
    !Number.isInteger(idUsuario) || idUsuario < 1 ||
    !Number.isInteger(idLibro) || idLibro < 1
  ) {
    throw new HttpError(400, 'Debes seleccionar un usuario y un libro.');
  }
  if (!Number.isInteger(diasPrestamo) || diasPrestamo < 1 || diasPrestamo > DIAS_MAXIMO) {
    throw new HttpError(400, `Los días de préstamo deben estar entre 1 y ${DIAS_MAXIMO}.`);
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
    fechaLimite.setDate(fechaLimite.getDate() + diasPrestamo);

    return tx.prestamo.create({
      data: {
        usuarioId: idUsuario,
        libroId: idLibro,
        fechaLimite,
        estado: 'ACTIVO',
      },
      select: SELECT_PRESTAMO,
    });
  });

  res.status(201).json(conAtraso(prestamo));
});

// Registrar la devolución de un préstamo
app.patch('/api/prestamos/:id/devolver', async (req, res) => {
  const id = idDeRuta(req.params.id);
  const prestamo = await prisma.$transaction(async (tx) => {
    const actual = await tx.prestamo.findUnique({ where: { id } });
    if (!actual) throw new HttpError(404, 'El préstamo no existe.');

    const marcado = await tx.prestamo.updateMany({
      where: { id, estado: { not: 'DEVUELTO' } },
      data: { estado: 'DEVUELTO', fechaDevolucion: new Date() },
    });
    if (marcado.count === 0) {
      throw new HttpError(409, 'Este préstamo ya fue devuelto.');
    }

    await tx.libro.update({
      where: { id: actual.libroId },
      data: { stock: { increment: 1 } },
    });
    return tx.prestamo.findUnique({ where: { id }, select: SELECT_PRESTAMO });
  });
  res.json(conAtraso(prestamo));
});

// ---------- INFORMES ----------

app.get('/api/informes', async (req, res) => {
  const ahora = new Date();
  const [titulos, stock, prestados, atrasados, usuarios, prestamos, ranking] =
    await Promise.all([
      prisma.libro.count(),
      prisma.libro.aggregate({ _sum: { stock: true } }),
      prisma.prestamo.count({ where: { estado: { not: 'DEVUELTO' } } }),
      prisma.prestamo.count({
        where: { estado: { not: 'DEVUELTO' }, fechaLimite: { lt: ahora } },
      }),
      prisma.usuario.count(),
      prisma.prestamo.count(),
      prisma.prestamo.groupBy({
        by: ['libroId'],
        _count: { libroId: true },
        orderBy: { _count: { libroId: 'desc' } },
        take: 5,
      }),
    ]);

  const libros = await prisma.libro.findMany({
    where: { id: { in: ranking.map((fila) => fila.libroId) } },
    select: { id: true, titulo: true, autor: true },
  });
  const masPrestados = ranking.map((fila) => {
    const libro = libros.find((l) => l.id === fila.libroId);
    return {
      titulo: libro?.titulo ?? 'Libro eliminado',
      autor: libro?.autor ?? '',
      veces: fila._count.libroId,
    };
  });

  res.json({
    titulos,
    ejemplaresDisponibles: stock._sum.stock ?? 0,
    prestados,
    atrasados,
    usuarios,
    prestamos,
    masPrestados,
  });
});

app.use((error, req, res, next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor.' });
  }
  if (error.code === 'P2003') {
    return res.status(409).json({
      error: 'No se puede completar: el registro está relacionado con otros datos.',
    });
  }
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor BiblioSur corriendo en el puerto ${PORT}`);
});
