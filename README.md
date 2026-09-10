# Sistema Inteligente de Gestión de Biblioteca (BiblioSur)

**Materia:** Sistemas Paralelos
**Docente:** Ing. Elias Cassal Baldiviezo
**Integrante:** Ely Yhanel Aguilar Jimenez - RU: e123375 / CI: 12625705

Proyecto desarrollado bajo la metodología **Scrum**, aplicando la arquitectura técnica de SysLab 2.0 (Backend + Frontend + PostgreSQL + Prisma + Agente de IA). La aplicación gestiona catálogo, préstamos y usuarios de una biblioteca.

## Descripción general

BiblioSur busca digitalizar y optimizar los procesos de una biblioteca: registro de libros, control de préstamos y devoluciones, gestión de usuarios y generación de reportes, todo desde una interfaz web moderna.

---

## Arquitectura de Tecnologías

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Base de datos:** PostgreSQL con Prisma ORM
- **Despliegue:** Docker Compose (3 contenedores: backend, frontend, base de datos)
- **Agente de IA:** reglas y skills de TasteSkill (https://www.tasteskill.dev/)

## Estructura del Repositorio
proyecto-sistemas-paralelos/
├── agente/
│ ├── rules.md
│ └── skills/
│ ├── design-taste-frontend/
│ ├── minimalist-ui/
│ └── bibliosur-backend-rules/
├── backend/
│ ├── index.js
│ ├── Dockerfile
│ └── prisma/
│ └── prisma/
│ ├── schema.prisma
│ └── seed.js
├── frontend/
│ ├── src/
│ └── Dockerfile
├── docker-compose.yml
└── README.md
## Cómo ejecutar el proyecto

1. Clonar el repositorio
2. Crear el archivo `.env` en la raíz con las variables necesarias
3. Ejecutar:
4. Backend disponible en `http://localhost:5000`
5. Frontend disponible en `http://localhost:5173`

---

## Requerimientos Funcionales (RF)

| ID | Requerimiento |
|----|----------------|
| RF01 | El sistema debe permitir registrar, editar y eliminar libros del catálogo (título, autor, ISBN, categoría, stock). |
| RF02 | El sistema debe permitir buscar libros por título, autor, categoría o ISBN. |
| RF03 | El sistema debe permitir registrar usuarios (estudiantes, docentes, bibliotecarios) con roles diferenciados. |
| RF04 | El sistema debe permitir registrar préstamos de libros, asociando usuario, libro y fecha límite de devolución. |
| RF05 | El sistema debe permitir registrar devoluciones y actualizar el stock disponible automáticamente. |
| RF06 | El sistema debe notificar (visual o por correo) cuando un préstamo esté próximo a vencer o vencido. |
| RF07 | El sistema debe permitir reservar libros que no estén disponibles en el momento. |
| RF08 | El sistema debe generar reportes de préstamos, devoluciones y libros más solicitados. |
| RF09 | El sistema debe permitir autenticación de usuarios (login) con control de acceso según rol. |
| RF10 | El bibliotecario debe poder consultar el historial de préstamos de cada usuario. |

---

## Requerimientos No Funcionales (RNF)

| ID | Requerimiento |
|----|----------------|
| RNF01 | **Usabilidad:** la interfaz debe ser intuitiva y utilizable sin necesidad de capacitación previa. |
| RNF02 | **Rendimiento:** las búsquedas de catálogo deben responder en menos de 2 segundos. |
| RNF03 | **Seguridad:** las contraseñas deben almacenarse cifradas y el acceso debe estar protegido por autenticación. |
| RNF04 | **Escalabilidad:** el sistema debe soportar el crecimiento del catálogo y la base de usuarios sin degradar el rendimiento. |
| RNF05 | **Disponibilidad:** el sistema debe estar disponible al menos el 99% del tiempo en horario académico. |
| RNF06 | **Compatibilidad:** debe funcionar correctamente en los navegadores más usados (Chrome, Firefox, Edge). |
| RNF07 | **Mantenibilidad:** el código debe estar modularizado y documentado para facilitar futuras mejoras. |
| RNF08 | **Portabilidad:** el sistema debe poder desplegarse en distintos entornos (local, nube) sin cambios mayores. |

---

## Historias de Usuario

### Módulo de Catálogo
**HU01 –** Como *bibliotecario*, quiero registrar nuevos libros en el sistema, para mantener el catálogo actualizado.
> **Criterios de aceptación:** el formulario valida ISBN único; el libro aparece inmediatamente en las búsquedas.

**HU02 –** Como *estudiante*, quiero buscar libros por título o autor, para saber si están disponibles antes de acercarme a la biblioteca.
> **Criterios de aceptación:** los resultados muestran disponibilidad en tiempo real.

### Módulo de Préstamos
**HU03 –** Como *bibliotecario*, quiero registrar un préstamo asociando usuario y libro, para llevar control de quién tiene cada ejemplar.
> **Criterios de aceptación:** el stock del libro disminuye automáticamente al confirmar el préstamo.

**HU04 –** Como *estudiante*, quiero recibir una notificación cuando mi préstamo esté por vencer, para evitar sanciones.
> **Criterios de aceptación:** la notificación se muestra 2 días antes del vencimiento.

**HU05 –** Como *estudiante*, quiero reservar un libro que no está disponible, para asegurar mi turno cuando sea devuelto.
> **Criterios de aceptación:** el sistema encola la reserva y notifica cuando el libro se libera.

### Módulo de Usuarios
**HU06 –** Como *administrador*, quiero gestionar los roles de los usuarios (estudiante, docente, bibliotecario), para controlar los permisos de acceso.
> **Criterios de aceptación:** cada rol solo ve las opciones que le corresponden.

**HU07 –** Como *bibliotecario*, quiero consultar el historial de préstamos de un usuario, para verificar su comportamiento antes de aprobar un nuevo préstamo.
> **Criterios de aceptación:** el historial muestra fechas, libros y estado (devuelto/pendiente/vencido).

### Módulo de Reportes
**HU08 –** Como *administrador*, quiero generar reportes de los libros más solicitados, para tomar decisiones sobre nuevas adquisiciones.
> **Criterios de aceptación:** el reporte se puede filtrar por rango de fechas y exportar.