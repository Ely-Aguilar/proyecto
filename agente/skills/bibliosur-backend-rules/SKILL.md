\---

name: bibliosur-backend-rules

description: Reglas de negocio y persistencia para el backend de BiblioSur (Sistema de Gestión de Biblioteca)

\---



\# Reglas del Backend - BiblioSur



\## Contexto del proyecto

BiblioSur es un sistema de gestión de biblioteca desarrollado con arquitectura

Backend (Node.js/Express) + Frontend (React) + Base de datos PostgreSQL con Prisma ORM.



\## Reglas de negocio obligatorias



\### Gestión de stock

\- Al registrar un préstamo, el stock del libro (`Libro.stock`) debe decrementarse en 1.

\- Al registrar una devolución, el stock debe incrementarse en 1.

\- No se debe permitir un préstamo si `stock <= 0`; en ese caso, sugerir crear una `Reserva`.



\### Préstamos

\- Todo préstamo debe registrar `fechaPrestamo` (automática) y `fechaLimite` (calculada, ej. +7 días).

\- El estado del préstamo (`EstadoPrestamo`) debe actualizarse a `VENCIDO` automáticamente

&#x20; cuando la fecha actual supere `fechaLimite` y no exista `fechaDevolucion`.

\- Al confirmar una devolución, se debe registrar `fechaDevolucion` y cambiar el estado a `DEVUELTO`.



\### Reservas

\- Solo se puede reservar un libro con `stock == 0`.

\- Al liberarse un ejemplar (por una devolución), la reserva más antigua en estado

&#x20; `PENDIENTE` debe pasar a `DISPONIBLE`.



\### Autenticación y roles

\- Las contraseñas deben almacenarse siempre con hash (bcrypt), nunca en texto plano.

\- Las rutas de administración (gestión de catálogo, roles) solo son accesibles

&#x20; para usuarios con rol `BIBLIOTECARIO` o `ADMINISTRADOR`.

\- Un `ESTUDIANTE` o `DOCENTE` solo puede consultar su propio historial de préstamos.



\### Validaciones

\- El campo `isbn` de `Libro` debe ser único.

\- El campo `email` de `Usuario` debe ser único y validado con formato de correo.



\## Aplicación de estas reglas

Toda lógica de negocio que involucre préstamos, devoluciones, reservas o control de acceso

debe seguir estas reglas al generar o modificar código del backend.

