import { Router, Request, Response } from 'express';
import pool from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Busca la cuenta (y su tarjeta) por numero_cuenta o numero_tarjeta
async function findCuentaConTarjeta(conn: any, identifier: string, byTarjeta: boolean) {
  const condicion = byTarjeta
    ? 't.numero_tarjeta = ?'
    : 'c.numero_cuenta = ?';

  const [rows]: any = await conn.query(
    `SELECT c.id, c.saldo, c.usuario_id, c.numero_cuenta,
            t.id AS tarjeta_id, t.saldo AS tarjeta_saldo,
            tt.categoria, tt.limite_credito AS tarjeta_limite
     FROM cuentas c
     JOIN tarjetas t ON t.cuenta_id = c.id
     JOIN tipos_tarjeta tt ON t.tipo_tarjeta_id = tt.id
     WHERE ${condicion} AND c.estado = 'activa'
     LIMIT 1 FOR UPDATE`,
    [identifier]
  );
  return rows;
}

/**
 * @swagger
 * /api/pagos/cobrar:
 *   post:
 *     summary: Cobrar a una cuenta o tarjeta (simulacion de compra en tienda externa)
 *     tags: [Pagos Externos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero_cuenta:
 *                 type: string
 *               numero_tarjeta:
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
  const { numero_cuenta, numero_tarjeta, monto, descripcion } = req.body;

  const identifier = numero_tarjeta || numero_cuenta;
  const byTarjeta = !!numero_tarjeta;

  if (!identifier || !monto || monto <= 0) {
    res.status(400).json({ mensaje: 'numero_cuenta o numero_tarjeta, y monto son requeridos' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rows = await findCuentaConTarjeta(conn, identifier, byTarjeta);

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta o tarjeta no encontrada o inactiva' });
      return;
    }

    const cuenta = rows[0];
    const esCredito = cuenta.categoria === 'credito';

    if (esCredito) {
      if (cuenta.tarjeta_limite !== null) {
        const deudaActual = Number(cuenta.tarjeta_saldo);
        if (deudaActual + monto > Number(cuenta.tarjeta_limite)) {
          res.status(400).json({
            mensaje: 'Límite de crédito insuficiente',
            credito_disponible: Number(cuenta.tarjeta_limite) - deudaActual,
          });
          return;
        }
      }
      await conn.query('UPDATE tarjetas SET saldo = saldo + ? WHERE id = ?', [monto, cuenta.tarjeta_id]);
    } else {
      if (Number(cuenta.saldo) < monto) {
        res.status(400).json({ mensaje: 'Saldo insuficiente', saldo_disponible: Number(cuenta.saldo) });
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
      [cuenta.usuario_id, `Se realizó un cobro de $${monto} — ${descripcion || 'Compra externa'}. Ref: ${referencia}`]
    );

    await conn.commit();

    const saldoFinal = esCredito
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
 *     summary: Depositar a una cuenta o tarjeta (simulacion de deposito externo)
 *     tags: [Pagos Externos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero_cuenta:
 *                 type: string
 *               numero_tarjeta:
 *                 type: string
 *               monto:
 *                 type: number
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Depósito realizado exitosamente
 *       404:
 *         description: Cuenta no encontrada
 */
router.post('/depositar', async (req: Request, res: Response) => {
  const { numero_cuenta, numero_tarjeta, monto, descripcion } = req.body;

  const identifier = numero_tarjeta || numero_cuenta;
  const byTarjeta = !!numero_tarjeta;

  if (!identifier || !monto || monto <= 0) {
    res.status(400).json({ mensaje: 'numero_cuenta o numero_tarjeta, y monto son requeridos' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rows = await findCuentaConTarjeta(conn, identifier, byTarjeta);

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta o tarjeta no encontrada o inactiva' });
      return;
    }

    const cuenta = rows[0];

    await conn.query('UPDATE cuentas SET saldo = saldo + ? WHERE id = ?', [monto, cuenta.id]);

    const referencia = uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase();

    await conn.query(
      'INSERT INTO transacciones (cuenta_destino_id, tipo, monto, descripcion, referencia, estado) VALUES (?, "deposito", ?, ?, ?, "completada")',
      [cuenta.id, monto, descripcion || 'Depósito externo', referencia]
    );

    await conn.query(
      'INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, "Depósito recibido", ?)',
      [cuenta.usuario_id, `Se acreditaron $${monto} a tu cuenta. ${descripcion || 'Depósito externo'}. Ref: ${referencia}`]
    );

    await conn.commit();
    res.json({ mensaje: 'Depósito realizado exitosamente', referencia, nuevo_saldo: Number(cuenta.saldo) + monto });
  } catch {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

/**
 * @swagger
 * /api/pagos/retirar:
 *   post:
 *     summary: Retiro de efectivo de una cuenta o tarjeta débito (simulacion de cajero externo)
 *     tags: [Pagos Externos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               numero_cuenta:
 *                 type: string
 *               numero_tarjeta:
 *                 type: string
 *               monto:
 *                 type: number
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Retiro realizado exitosamente
 *       400:
 *         description: Saldo insuficiente o tarjeta de crédito no permitida
 *       404:
 *         description: Cuenta no encontrada
 */
router.post('/retirar', async (req: Request, res: Response) => {
  const { numero_cuenta, numero_tarjeta, monto, descripcion } = req.body;

  const identifier = numero_tarjeta || numero_cuenta;
  const byTarjeta = !!numero_tarjeta;

  if (!identifier || !monto || monto <= 0) {
    res.status(400).json({ mensaje: 'numero_cuenta o numero_tarjeta, y monto son requeridos' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rows = await findCuentaConTarjeta(conn, identifier, byTarjeta);

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta o tarjeta no encontrada o inactiva' });
      return;
    }

    const cuenta = rows[0];

    if (cuenta.categoria === 'credito') {
      res.status(400).json({ mensaje: 'No se puede realizar retiro con tarjeta de crédito' });
      return;
    }

    if (Number(cuenta.saldo) < monto) {
      res.status(400).json({ mensaje: 'Saldo insuficiente', saldo_disponible: Number(cuenta.saldo) });
      return;
    }

    await conn.query('UPDATE cuentas SET saldo = saldo - ? WHERE id = ?', [monto, cuenta.id]);

    const referencia = uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase();

    await conn.query(
      'INSERT INTO transacciones (cuenta_origen_id, tipo, monto, descripcion, referencia, estado) VALUES (?, "retiro", ?, ?, ?, "completada")',
      [cuenta.id, monto, descripcion || 'Retiro en cajero', referencia]
    );

    await conn.query(
      'INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, "Retiro realizado", ?)',
      [cuenta.usuario_id, `Se realizó un retiro de $${monto}. ${descripcion || 'Retiro en cajero'}. Ref: ${referencia}`]
    );

    await conn.commit();
    res.json({ mensaje: 'Retiro realizado exitosamente', referencia, saldo_restante: Number(cuenta.saldo) - monto });
  } catch {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

export default router;
