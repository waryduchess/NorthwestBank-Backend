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
| tipo | ENUM('ahorro','corriente') | Tipo de cuenta |
| saldo | DECIMAL(15,2) DEFAULT 0 | Saldo disponible |
| moneda | VARCHAR(3) DEFAULT 'MXN' | Moneda |
| estado | ENUM('activa','congelada','cerrada') | Estado |
| created_at | DATETIME | Fecha de apertura |

### 3. tipos_tarjeta  *(catalogo de productos)*
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| nombre | VARCHAR(50) UNIQUE | Nombre del producto |
| categoria | ENUM('debito','credito') | Categoria |
| limite_credito | DECIMAL(15,2) NULL | Limite (NULL = no aplica en debito / sin limite en Imperium) |
| moneda | VARCHAR(3) DEFAULT 'MXN' | Moneda del producto |

| Nombre | Categoria | Limite |
|---|---|---|
| Nexus | Debito | — |
| Vertex | Debito | — |
| Orbe | Credito | $50,000 MXN |
| Silverstone | Credito | $150,000 MXN |
| Imperium | Credito | Sin limite |

### 4. tarjetas  *(instancias por usuario)*
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| usuario_id | INT (FK → usuarios) | Dueno |
| cuenta_id | INT (FK → cuentas) | Cuenta bancaria vinculada |
| tipo_tarjeta_id | INT (FK → tipos_tarjeta) | Producto asignado |
| numero_tarjeta | VARCHAR(20) UNIQUE | Numero de tarjeta |
| saldo | DECIMAL(15,2) DEFAULT 0 | Debito: saldo disponible / Credito: deuda acumulada |
| estado | ENUM('activa','congelada','cerrada') | Estado |
| created_at | DATETIME | Fecha de emision |

> Para tarjetas de credito: `credito_disponible = tipos_tarjeta.limite_credito - tarjetas.saldo`

### 5. transacciones
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| cuenta_origen_id | INT (FK → cuentas) NULL | Cuenta que envia o se cobra |
| cuenta_destino_id | INT (FK → cuentas) NULL | Cuenta que recibe |
| tipo | ENUM('transferencia','retiro','compra','deposito') | Tipo de movimiento |
| monto | DECIMAL(15,2) | Cantidad |
| descripcion | VARCHAR(255) | Concepto |
| referencia | VARCHAR(50) UNIQUE | Codigo unico de transaccion |
| estado | ENUM('pendiente','completada','fallida','cancelada') | Estado |
| created_at | DATETIME | Fecha y hora |

### 6. notificaciones
| Campo | Tipo | Descripcion |
|---|---|---|
| id | INT (PK, AUTO_INCREMENT) | Identificador unico |
| usuario_id | INT (FK → usuarios) | Destinatario |
| titulo | VARCHAR(100) | Titulo |
| mensaje | VARCHAR(500) | Contenido |
| leida | BOOLEAN DEFAULT FALSE | Si fue leida |
| created_at | DATETIME | Fecha de envio |

---

## Relaciones

```
usuarios     (1) ──→ (N) cuentas
usuarios     (1) ──→ (N) tarjetas
cuentas      (1) ──→ (N) tarjetas
tipos_tarjeta(1) ──→ (N) tarjetas
cuentas      (1) ──→ (N) transacciones (origen o destino)
usuarios     (1) ──→ (N) notificaciones
```

---

## Decisiones tomadas

- Moneda unica: **MXN** en todas las tablas
- `tipos_tarjeta` centraliza las caracteristicas de cada producto (categoria, limite, moneda)
- `tarjetas` solo guarda la instancia del usuario (numero, saldo, estado)
- `cuentas` maneja unicamente cuentas bancarias (ahorro, corriente)
- Todas las tablas usan ENGINE=InnoDB para soporte de transacciones ACID
- Foto de perfil en Cloudinary, URL guardada en `foto_url`

---

## Datos de prueba

### Cuentas
| Usuario | Numero | Tipo | Saldo |
|---|---|---|---|
| Josefina | 4010000000000001 | ahorro | $15,000.00 |
| Erik | 4010000000000002 | corriente | $32,500.50 |
| Luis | 4010000000000003 | ahorro | $8,750.75 |
| Diego | 4010000000000004 | corriente | $21,000.00 |

### Tarjetas
| Usuario | Numero | Tipo | Categoria | Saldo |
|---|---|---|---|---|
| Josefina | 4010000000000001 | Nexus | Debito | $15,000.00 |
| Josefina | 4010000000000011 | Orbe | Credito | $0.00 |
| Erik | 4010000000000002 | Vertex | Debito | $32,500.50 |
| Erik | 4010000000000022 | Silverstone | Credito | $0.00 |
| Luis | 4010000000000003 | Nexus | Debito | $8,750.75 |
| Luis | 4010000000000033 | Imperium | Credito | $0.00 |
| Diego | 4010000000000004 | Vertex | Debito | $21,000.00 |
| Diego | 4010000000000044 | Orbe | Credito | $0.00 |
