# NorthwestBank - Endpoints de la API

Base URL: `http://localhost:3000/api`
Documentacion Swagger: `http://localhost:3000/api/docs`

> ✅ Implementado &nbsp;&nbsp; ⬜ Pendiente

---

## Auth
| Estado | Metodo | Endpoint | Descripcion |
|---|---|---|---|
| ✅ | POST | `/auth/registro` | Registrar nuevo usuario |
| ✅ | POST | `/auth/login` | Iniciar sesion, retorna JWT |

---

## Usuarios
| Estado | Metodo | Endpoint | Descripcion |
|---|---|---|---|
| ✅ | GET | `/usuarios/perfil` | Obtener perfil del usuario autenticado |
| ✅ | POST | `/usuarios/foto` | Subir o actualizar foto de perfil (Cloudinary) |
| ⬜ | PATCH | `/usuarios/perfil` | Actualizar datos personales |

---

## Cuentas
| Estado | Metodo | Endpoint | Descripcion |
|---|---|---|---|
| ✅ | GET | `/cuentas` | Listar todas las cuentas y tarjetas del usuario |
| ✅ | GET | `/cuentas/:id` | Detalle de una cuenta (incluye credito disponible) |
| ✅ | POST | `/cuentas` | Abrir nueva cuenta o tarjeta |

---

## Transacciones
| Estado | Metodo | Endpoint | Descripcion |
|---|---|---|---|
| ✅ | GET | `/transacciones` | Historial de todas las transacciones del usuario |
| ✅ | POST | `/transacciones/transferir` | Transferencia entre cuentas |
| ⬜ | POST | `/transacciones/retiro` | Retirar dinero de una cuenta |
| ⬜ | POST | `/transacciones/pagar-tarjeta` | Pagar deuda de tarjeta de credito |
| ⬜ | GET | `/transacciones?cuenta_id=` | Filtrar historial por cuenta |

---

## Pagos Externos
| Estado | Metodo | Endpoint | Descripcion |
|---|---|---|---|
| ✅ | POST | `/pagos/cobrar` | Cobrar a una cuenta o tarjeta (simulacion de compra en tienda externa) |
| ✅ | POST | `/pagos/depositar` | Depositar a una cuenta (simulacion de deposito desde pagina externa) |

---

## Notificaciones
| Estado | Metodo | Endpoint | Descripcion |
|---|---|---|---|
| ⬜ | GET | `/notificaciones` | Listar notificaciones del usuario |
| ⬜ | PATCH | `/notificaciones/:id/leer` | Marcar notificacion como leida |
| ⬜ | PATCH | `/notificaciones/leer-todas` | Marcar todas como leidas |
