# Endpoints de Tarjetas

Base URL: `http://localhost:3000/api/tarjetas`

Todos los endpoints requieren autenticación JWT:
```
Authorization: Bearer <token>
```

---

## GET `/tarjetas`

Lista todas las tarjetas del usuario autenticado.

**Respuesta 200:**
```json
[
  {
    "id": 3,
    "numero_tarjeta": "4040000000000002",
    "saldo": 32500.50,
    "estado": "activa",
    "created_at": "2025-01-01T00:00:00.000Z",
    "tipo": "Vertex",
    "categoria": "debito",
    "limite_credito": null,
    "numero_cuenta": "4010000000000002"
  },
  {
    "id": 4,
    "numero_tarjeta": "4020000000000022",
    "saldo": 0.00,
    "estado": "activa",
    "created_at": "2025-01-01T00:00:00.000Z",
    "tipo": "Silverstone",
    "categoria": "credito",
    "limite_credito": 150000.00,
    "numero_cuenta": "4010000000000002"
  }
]
```

> Para tarjetas de crédito, el crédito disponible se calcula como `limite_credito - saldo`.

---

## GET `/tarjetas/generar-credito?tipo=`

Genera los datos necesarios para registrar una tarjeta de crédito. El número generado se verifica como único en la base de datos (hasta 10 intentos).

**Query params:**

| Param | Requerido | Valores |
|-------|-----------|---------|
| `tipo` | Sí | `orbe`, `silverstone`, `imperium` |

**Ejemplo de petición:**
```
GET /api/tarjetas/generar-credito?tipo=silverstone
```

**Respuesta 200:**
```json
{
  "numero_tarjeta": "4020911403251158",
  "cvv": "812",
  "fecha_expiracion": "06/31",
  "nip": "2058",
  "tipo_tarjeta_id": 4,
  "nombre": "Silverstone",
  "limite_credito": 150000.00
}
```

**Errores:**

| Código | Motivo |
|--------|--------|
| 400 | `tipo` inválido o no enviado |
| 500 | No se pudo generar un número único tras 10 intentos |

> Los datos devueltos deben usarse directamente en `POST /tarjetas` para registrar la tarjeta.

---

## POST `/tarjetas`

Registra una tarjeta (débito o crédito) vinculada a una cuenta del usuario.

**Body:**
```json
{
  "cuenta_id": 2,
  "tipo_tarjeta_id": 4,
  "numero_tarjeta": "4020911403251158",
  "cvv": "812",
  "fecha_expiracion": "06/31",
  "nip": "2058"
}
```

**Campos:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cuenta_id` | integer | ID de la cuenta a vincular (debe pertenecer al usuario) |
| `tipo_tarjeta_id` | integer | ID del tipo de tarjeta (1=Nexus, 2=Vertex, 3=Orbe, 4=Silverstone, 5=Imperium) |
| `numero_tarjeta` | string | 16 dígitos con el prefijo correspondiente al tipo |
| `cvv` | string | Exactamente 3 dígitos |
| `fecha_expiracion` | string | Formato `MM/YY` |
| `nip` | string | Exactamente 4 dígitos — se guarda hasheado con bcrypt |

**Prefijos válidos por tipo:**

| Tipo | Categoría | Prefijo |
|------|-----------|---------|
| Nexus | Débito | `4030` |
| Vertex | Débito | `4040` |
| Orbe | Crédito | `4010` |
| Silverstone | Crédito | `4020` |
| Imperium | Crédito | `4030` |

**Respuesta 201:**
```json
{
  "mensaje": "Tarjeta registrada exitosamente",
  "id": 9,
  "numero_tarjeta": "4020911403251158",
  "tipo": "Silverstone",
  "categoria": "credito"
}
```

**Errores:**

| Código | Motivo |
|--------|--------|
| 400 | Campos faltantes, formato inválido o prefijo incorrecto para el tipo |
| 404 | Cuenta no encontrada o no está activa |
| 409 | Número de tarjeta ya registrado |

---

## Flujo completo para tarjeta de crédito

```
1. GET /api/tarjetas/generar-credito?tipo=orbe
        ↓
   Recibe: numero_tarjeta, cvv, fecha_expiracion, nip, tipo_tarjeta_id

2. POST /api/tarjetas
   Body: { cuenta_id, tipo_tarjeta_id, numero_tarjeta, cvv, fecha_expiracion, nip }
        ↓
   Tarjeta registrada en BD (nip guardado como hash bcrypt)
```
