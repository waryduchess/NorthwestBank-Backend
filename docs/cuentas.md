# Endpoints de Cuentas

Base URL: `http://localhost:3000/api/cuentas`

Todos los endpoints requieren autenticación JWT:
```
Authorization: Bearer <token>
```

> Las cuentas son exclusivamente de tipo `ahorro` o `corriente`. El crédito disponible se maneja a nivel de tarjeta, no de cuenta.

---

## GET `/cuentas`

Lista todas las cuentas del usuario autenticado.

**Ejemplo de petición:**
```
GET /api/cuentas
```

**Respuesta 200:**
```json
[
  {
    "id": 2,
    "numero_cuenta": "4010000000000002",
    "tipo": "corriente",
    "saldo": "32500.50",
    "moneda": "MXN",
    "estado": "activa"
  }
]
```

---

## GET `/cuentas/:id`

Devuelve el detalle de una cuenta específica del usuario.

**Ejemplo de petición:**
```
GET /api/cuentas/2
```

**Respuesta 200:**
```json
{
  "id": 2,
  "numero_cuenta": "4010000000000002",
  "tipo": "corriente",
  "saldo": "32500.50",
  "moneda": "MXN",
  "estado": "activa",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

**Errores:**

| Código | Motivo |
|--------|--------|
| 404 | Cuenta no encontrada o no pertenece al usuario |

---

## POST `/cuentas`

Abre una nueva cuenta para el usuario autenticado.

**Body:**
```json
{
  "tipo": "ahorro"
}
```

**Tipos válidos:**

| Tipo | Descripción |
|------|-------------|
| `ahorro` | Cuenta de ahorro |
| `corriente` | Cuenta corriente |

**Respuesta 201:**
```json
{
  "mensaje": "Cuenta creada exitosamente",
  "id": 5,
  "numero_cuenta": "4010000000000099"
}
```

**Errores:**

| Código | Motivo |
|--------|--------|
| 400 | Tipo inválido o no enviado |
