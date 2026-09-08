\# Reglas del Agente de IA - Proyecto BiblioSur



\## Propósito

Este documento define las instrucciones generales que debe seguir cualquier agente de IA

(Claude Code, Cursor, Copilot, etc.) al trabajar sobre este repositorio.



\## Arquitectura del proyecto

\- \*\*Backend\*\*: Node.js + Express + Prisma ORM + PostgreSQL

\- \*\*Frontend\*\*: React + Vite

\- \*\*Persistencia\*\*: PostgreSQL, gestionada mediante Prisma (`backend/prisma/prisma/schema.prisma`)

\- \*\*Despliegue\*\*: Docker Compose (3 servicios: backend, frontend, base de datos)



\## Skills disponibles

\- `skills/design-taste-frontend`: reglas de diseño visual para el frontend.

\- `skills/minimalist-ui`: guía de diseño de interfaz minimalista.

\- `skills/bibliosur-backend-rules`: reglas de negocio y persistencia específicas de BiblioSur.



\## Instrucciones generales

1\. Todo cambio en el modelo de datos debe reflejarse en `schema.prisma` y generarse

&#x20;  una migración correspondiente con Prisma.

2\. El código del backend debe seguir las reglas de negocio descritas en

&#x20;  `skills/bibliosur-backend-rules/SKILL.md`.

3\. El frontend debe seguir los lineamientos de diseño de

&#x20;  `skills/design-taste-frontend` y `skills/minimalist-ui`.

4\. Todo commit debe seguir la convención de Conventional Commits (feat, fix, docs, chore).

5\. Las contraseñas y datos sensibles nunca deben almacenarse en texto plano ni

&#x20;  subirse a Git (usar `.env`, incluido en `.gitignore`).

