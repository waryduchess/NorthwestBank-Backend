import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * @swagger
 * /api/pagos/cobrar:
 *   post:
 *     summary: Cobrar a una cuenta (simulacion de compra en tienda externa)
 *     tags: [Pagos Externos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [numero_cuenta, monto, descripcion]
 *             properties:
 *               numero_cuenta:
 *                 type: string
 *               monto:
 *                 type: number
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cobro realizado exitosamente
 *       400:
 *         description: Saldo insuficiente
 *       404:
 *         description: Cuenta no encontrada
 */
router.post('/cobrar', async (req: Request, res: Response) => {
  const { numero_cuenta, monto, descripcion } = req.body;

  if (!numero_cuenta || !monto || monto <= 0) {
    res.status(400).json({ mensaje: 'numero_cuenta y monto son requeridos' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Buscar cuenta y su tarjeta vinculada para determinar categoría
    const [rows]: any = await conn.query(
      `SELECT c.*, t.id AS tarjeta_id, t.saldo AS tarjeta_saldo,
              tt.categoria, tt.limite_credito AS tarjeta_limite
       FROM cuentas c
       JOIN tarjetas t ON t.cuenta_id = c.id
       JOIN tipos_tarjeta tt ON t.tipo_tarjeta_id = tt.id
       WHERE c.numero_cuenta = ? AND c.estado = 'activa'
       LIMIT 1 FOR UPDATE`,
      [numero_cuenta]
    );

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada o inactiva' });
      return;
    }

    const cuenta = rows[0];
    const esTarjetaCredito = cuenta.categoria === 'credito';

    if (esTarjetaCredito) {
      // Crédito: saldo vive en tarjetas.saldo (deuda acumulada)
      if (cuenta.tarjeta_limite !== null) {
        const deudaActual = Number(cuenta.tarjeta_saldo);
        if (deudaActual + monto > Number(cuenta.tarjeta_limite)) {
          res.status(400).json({ mensaje: 'Limite de credito insuficiente', credito_disponible: Number(cuenta.tarjeta_limite) - deudaActual });
          return;
        }
      }
      await conn.query('UPDATE tarjetas SET saldo = saldo + ? WHERE id = ?', [monto, cuenta.tarjeta_id]);
    } else {
      // Débito: saldo vive en cuentas.saldo
      if (Number(cuenta.saldo) < monto) {
        res.status(400).json({ mensaje: 'Saldo insuficiente' });
        return;
      }
      await conn.query('UPDATE cuentas SET saldo = saldo - ? WHERE id = ?', [monto, cuenta.id]);
    }

    const referencia = uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase();

    await conn.query(
      'INSERT INTO transacciones (cuenta_origen_id, tipo, monto, descripcion, referencia, estado) VALUES (?, "compra", ?, ?, ?, "completada")',
      [cuenta.id, monto, descripcion || 'Compra externa', referencia]
    );

    await conn.query(
      'INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, "Compra realizada", ?)',
      [cuenta.usuario_id, `Se realizo un cobro de $${monto} - ${descripcion || 'Compra externa'}. Ref: ${referencia}`]
    );

    await conn.commit();

    const saldoFinal = esTarjetaCredito
      ? { deuda_actual: Number(cuenta.tarjeta_saldo) + monto, credito_disponible: cuenta.tarjeta_limite !== null ? Number(cuenta.tarjeta_limite) - (Number(cuenta.tarjeta_saldo) + monto) : null }
      : { saldo_restante: Number(cuenta.saldo) - monto };

    res.json({ mensaje: 'Cobro realizado exitosamente', referencia, ...saldoFinal });
  } catch {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

/**
 * @swagger
 * /api/pagos/depositar:
 *   post:
 *     summary: Depositar a una cuenta (simulacion de deposito desde pagina externa)
 *     tags: [Pagos Externos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [numero_cuenta, monto]
 *             properties:
 *               numero_cuenta:
 *                 type: string
 *               monto:
 *                 type: number
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deposito realizado exitosamente
 *       404:
 *         description: Cuenta no encontrada
 */
router.post('/depositar', async (req: Request, res: Response) => {
  const { numero_cuenta, monto, descripcion } = req.body;

  if (!numero_cuenta || !monto || monto <= 0) {
    res.status(400).json({ mensaje: 'numero_cuenta y monto son requeridos' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows]: any = await conn.query(
      'SELECT * FROM cuentas WHERE numero_cuenta = ? AND estado = "activa" FOR UPDATE',
      [numero_cuenta]
    );

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada o inactiva' });
      return;
    }

    const cuenta = rows[0];

    await conn.query('UPDATE cuentas SET saldo = saldo + ? WHERE id = ?', [monto, cuenta.id]);

    const referencia = uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase();

    await conn.query(
      'INSERT INTO transacciones (cuenta_destino_id, tipo, monto, descripcion, referencia, estado) VALUES (?, "deposito", ?, ?, ?, "completada")',
      [cuenta.id, monto, descripcion || 'Deposito externo', referencia]
    );

    await conn.query(
      'INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, "Deposito recibido", ?)',
      [cuenta.usuario_id, `Se acredito $${monto} a tu cuenta. ${descripcion || 'Deposito externo'}. Ref: ${referencia}`]
    );

    await conn.commit();
    res.json({ mensaje: 'Deposito realizado exitosamente', referencia, nuevo_saldo: Number(cuenta.saldo) + monto });
  } catch {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

export default router;
