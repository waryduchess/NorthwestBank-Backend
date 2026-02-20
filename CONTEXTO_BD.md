# NorthwestBank - Esquema de Base de Datos

## Tablas

### 1. usuarios
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| nombre | VARCHAR(100) | Nombre(s) del usuario |
| apellido_paterno | VARCHAR(100) | Apellido paterno |
| apellido_materno | VARCHAR(100) | Apellido materno |
| email | VARCHAR(150) UNIQUE | Correo electronico |
| telefono | VARCHAR(15) UNIQUE | Numero de telefono |
| password_hash | VARCHAR(255) | Contrasena encriptada con bcrypt |
| pin | VARCHAR(255) | PIN encriptado con bcrypt |
| foto_url | VARCHAR(500) NULL | URL de foto de perfil (Cloudinary) |
| biometria_activa | BOOLEAN DEFAULT FALSE | Si tiene biometria habilitada |
| estado | ENUM('activo','bloqueado','inactivo') | Estado del usuario |
| intentos_fallidos | INT DEFAULT 0 | Intentos de login fallidos |
| created_at | DATETIME | Fecha de registro |
| updated_at | DATETIME | Ultima actualizacion |

### 2. cuentas
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| usuario_id | INT (FK → usuarios) | Dueno de la cuenta |
| numero_cuenta | VARCHAR(20) UNIQUE | Numero de cuenta |
| tipo | ENUM('ahorro','corriente','orbe','silverstone','imperium') | Tipo de cuenta o tarjeta |
| saldo | DECIMAL(15,2) DEFAULT 0 | Saldo disponible (debito) o deuda acumulada (credito) |
| limite_credito | DECIMAL(15,2) NULL | Limite de credito (NULL = sin limite, solo Imperium) |
| moneda | VARCHAR(3) DEFAULT 'USD' | Tipo de moneda |
| estado | ENUM('activa','congelada','cerrada') | Estado de la cuenta |
| created_at | DATETIME | Fecha de apertura |

**Tarjetas de credito:**
| Tarjeta | Limite |
|---|---|
| Orbe | $50,000 |
| Silverstone | $150,000 |
| Imperium | Sin limite (limite_credito = NULL) |

> Para tarjetas de credito: `saldo` representa la deuda acumulada. `credito_disponible = limite_credito - saldo`

### 3. transacciones
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| cuenta_origen_id | INT (FK → cuentas) NULL | Cuenta que envia o se cobra |
| cuenta_destino_id | INT (FK → cuentas) NULL | Cuenta que recibe |
| tipo | ENUM('transferencia','retiro','compra','deposito') | Tipo de movimiento |
| monto | DECIMAL(15,2) | Cantidad |
| descripcion | VARCHAR(255) | Concepto o detalle |
| referencia | VARCHAR(50) UNIQUE | Codigo unico de transaccion |
| estado | ENUM('pendiente','completada','fallida','cancelada') | Estado |
| created_at | DATETIME | Fecha y hora de la operacion |

### 4. notificaciones
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| usuario_id | INT (FK → usuarios) | A quien va dirigida |
| titulo | VARCHAR(100) | Titulo de la notificacion |
| mensaje | VARCHAR(500) | Contenido |
| leida | BOOLEAN DEFAULT FALSE | Si fue leida |
| created_at | DATETIME | Fecha de envio |

---

## Relaciones

```
usuarios (1) ──→ (N) cuentas
usuarios (1) ──→ (N) notificaciones
cuentas  (1) ──→ (N) transacciones (origen o destino)
```

---

## Decisiones tomadas

- Foto de perfil almacenada en Cloudinary (servicio gratuito), se guarda la URL en `foto_url`
- Tablas eliminadas respecto al diseño inicial: `sesiones`, `beneficiarios`, `auditoria`
- Nombre dividido en `nombre`, `apellido_paterno`, `apellido_materno`
- Tarjetas de credito integradas en la tabla `cuentas` con campo `limite_credito`

---

## Datos de prueba

### Usuarios
| ID | Nombre | Apellido Paterno | Apellido Materno | Email | Telefono | Password | PIN |
|---|---|---|---|---|---|---|---|
| 1 | Josefina Isabel | Zacarías | Pérez | josefina.zacarias@email.com | 5551000001 | Password123! | 1234 |
| 2 | Erik Santiago | García | Rafael | erik.garcia@email.com | 5551000002 | Password123! | 2345 |
| 3 | Luis Arturo | Rivas | Barrera | luis.rivas@email.com | 5551000003 | Password123! | 3456 |
| 4 | Diego Alexander | Cordova | Alor | diego.cordova@email.com | 5551000004 | Password123! | 4567 |

### Cuentas
| Usuario | Numero de Cuenta | Tipo | Saldo Inicial | Limite Credito |
|---|---|---|---|---|
| Josefina Isabel | 4010000000000001 | ahorro | $15,000.00 | — |
| Josefina Isabel | 4010000000000011 | orbe | $0.00 | $50,000.00 |
| Erik Santiago | 4010000000000002 | corriente | $32,500.50 | — |
| Erik Santiago | 4010000000000022 | silverstone | $0.00 | $150,000.00 |
| Luis Arturo | 4010000000000003 | ahorro | $8,750.75 | — |
| Luis Arturo | 4010000000000033 | imperium | $0.00 | Sin limite |
| Diego Alexander | 4010000000000004 | corriente | $21,000.00 | — |
| Diego Alexander | 4010000000000044 | orbe | $0.00 | $50,000.00 |
