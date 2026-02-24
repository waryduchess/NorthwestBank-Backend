# NorthwestBank - Banca Movil

## Descripcion del Proyecto

Aplicacion de banca movil que permite a los usuarios gestionar sus cuentas bancarias,
realizar transferencias, consultar movimientos.

---

## Decisiones Tecnicas

### Framework: Flutter (Dart)

- Compilacion nativa para Android
- Amplio ecosistema de plugins (biometria, notificaciones push, encriptacion)
- Comunidad activa y gran documentacion
- Alto rendimiento en dispositivos moviles

### Base de Datos del Backend: MySQL

- Base de datos relacional para garantizar integridad de datos financieros
- Integridad referencial con foreign keys
- Datos bancarios altamente estructurados (usuarios, cuentas, transacciones)

### Base de Datos Local (dispositivo): SQLite / Hive

- Cache local para datos offline
- Almacenamiento de sesion y preferencias del usuario
- Mejora de rendimiento evitando consultas repetidas al servidor

---

## Arquitectura General

```
App Flutter (cliente)
  |-- SQLite/Hive (cache local, sesion, preferencias)
  |
  |-- HTTPS / REST API
  |
Backend (API)
  |-- Autenticacion (JWT, 2FA, biometria)
  |-- Logica de negocio
  |-- Validaciones
  |
MySQL (base de datos centralizada)
  |-- Usuarios
  |-- Cuentas
  |-- Transacciones
  |-- Beneficiarios
  |-- Auditoria
```

---

## Modulos Planificados

1. Autenticacion - Login, biometria, 2FA, manejo de sesiones con JWT
2. Dashboard - Saldo actual, resumen de cuentas
3. Transferencias - Entre cuentas propias y a terceros
4. Historial de movimientos - Filtros por fecha, monto, tipo
5. Pagos de servicios - Agua, luz, telefono, etc.
6. Notificaciones push - Alertas de movimientos en tiempo real
7. Perfil y configuracion - Datos personales, seguridad, preferencias

---

## Estado del Proyecto

- [x] Definicion de idea y alcance
- [x] Seleccion de framework (Flutter)
- [x] Seleccion de base de datos (MySQL)
- [ ] Diseno del esquema de base de datos
- [ ] Diseno de la API REST
- [ ] Estructura del proyecto Flutter
- [ ] Prototipo de UI/UX
- [ ] Implementacion

---

## Notas

- Se considero MongoDB pero se descarto por la necesidad de integridad referencial
  y transacciones ACID que son criticas en datos financieros.
- Se considero MAUI pero se opto por Flutter por su mayor madurez en movil,
  mejor rendimiento y ecosistema de plugins mas amplio.
- PostgreSQL queda como alternativa viable si se necesitan funcionalidades avanzadas.
