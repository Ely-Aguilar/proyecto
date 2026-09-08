// Desarrollador: Ely Yhanel Aguilar Jimenez - RU: e123375 / CI: 12625705
// Script de poblado inicial - BiblioSur

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando el proceso de Seeding (BiblioSur)...');

  // Usuarios
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@biblisosur.edu.bo' },
    update: {},
    create: {
      nombre: 'Administrador General',
      email: 'admin@biblisosur.edu.bo',
      passwordHash,
      rol: 'ADMINISTRADOR',
    },
  });

  const bibliotecario = await prisma.usuario.upsert({
    where: { email: 'bibliotecario@biblisosur.edu.bo' },
    update: {},
    create: {
      nombre: 'Ely Aguilar',
      email: 'bibliotecario@biblisosur.edu.bo',
      passwordHash,
      rol: 'BIBLIOTECARIO',
    },
  });

  const estudiante = await prisma.usuario.upsert({
    where: { email: 'estudiante@biblisosur.edu.bo' },
    update: {},
    create: {
      nombre: 'Juan Pérez',
      email: 'estudiante@biblisosur.edu.bo',
      passwordHash,
      rol: 'ESTUDIANTE',
    },
  });

  console.log('✅ Usuarios base creados.');

  // Libros
  const libro1 = await prisma.libro.upsert({
    where: { isbn: '978-84-376-0494-7' },
    update: {},
    create: {
      titulo: 'Cien Años de Soledad',
      autor: 'Gabriel García Márquez',
      isbn: '978-84-376-0494-7',
      categoria: 'Literatura',
      stock: 5,
    },
  });

  const libro2 = await prisma.libro.upsert({
    where: { isbn: '978-0-13-468599-1' },
    update: {},
    create: {
      titulo: 'Introduction to Algorithms',
      autor: 'Thomas H. Cormen',
      isbn: '978-0-13-468599-1',
      categoria: 'Tecnología',
      stock: 3,
    },
  });

  const libro3 = await prisma.libro.upsert({
    where: { isbn: '978-84-9838-497-1' },
    update: {},
    create: {
      titulo: 'El Principito',
      autor: 'Antoine de Saint-Exupéry',
      isbn: '978-84-9838-497-1',
      categoria: 'Literatura Infantil',
      stock: 4,
    },
  });

  console.log('✅ Libros cargados al catálogo.');

  // Préstamo de ejemplo
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + 7);

  await prisma.prestamo.create({
    data: {
      usuarioId: estudiante.id,
      libroId: libro1.id,
      fechaLimite,
      estado: 'ACTIVO',
    },
  });

  console.log('✅ Préstamo de ejemplo registrado.');
  console.log('🚀 ¡Seeding completado con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });