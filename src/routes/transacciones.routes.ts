import { Router, Response } from 'express';
import { verificarToken, AuthRequest } from '../middleware/auth.middleware';
import pool from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * @swagger
 * /api/transacciones:
 *   get:
 *     summary: Historial de transacciones del usuario
 *     tags: [Transacciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de transacciones
 */
router.get('/', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT t.id, t.tipo, t.monto, t.descripcion, t.referencia, t.estado, t.created_at,
              co.numero_cuenta AS cuenta_origen, cd.numero_cuenta AS cuenta_destino
       FROM transacciones t
       LEFT JOIN cuentas co ON t.cuenta_origen_id = co.id
       LEFT JOIN cuentas cd ON t.cuenta_destino_id = cd.id
       WHERE co.usuario_id = ? OR cd.usuario_id = ?
       ORDER BY t.created_at DESC`,
      [req.usuario!.id, req.usuario!.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/transacciones/transferir:
 *   post:
 *     summary: Realizar una transferencia
 *     tags: [Transacciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cuenta_origen_id, numero_cuenta_destino, monto]
 *             properties:
 *               cuenta_origen_id:
 *                 type: integer
 *               numero_cuenta_destino:
 *                 type: string
 *               monto:
 *                 type: number
 *               descripcion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transferencia realizada
 *       400:
 *         description: Saldo insuficiente o datos invalidos
 */
router.post('/transferir', verificarToken, async (req: AuthRequest, res: Response) => {
  const { cuenta_origen_id, numero_cuenta_destino, numero_tarjeta_destino, monto, descripcion } = req.body;

  if (!cuenta_origen_id || (!numero_cuenta_destino && !numero_tarjeta_destino) || !monto || monto <= 0) {
    res.status(400).json({ mensaje: 'Se requiere cuenta_origen_id, monto y numero_cuenta_destino o numero_tarjeta_destino' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [origen]: any = await conn.query(
      'SELECT * FROM cuentas WHERE id = ? AND usuario_id = ? AND estado = "activa" FOR UPDATE',
      [cuenta_origen_id, req.usuario!.id]
    );

    if (origen.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta origen no encontrada' });
      return;
    }

    if (Number(origen[0].saldo) < monto) {
      res.status(400).json({ mensaje: 'Saldo insuficiente' });
      return;
    }

    // Resolver cuenta destino por número de tarjeta o número de cuenta
    let destino: any[];
    let destinoTarjeta: any = null;

    if (numero_tarjeta_destino) {
      const [rows]: any = await conn.query(
        `SELECT c.*, t.id AS tarjeta_id, t.saldo AS tarjeta_saldo, tt.categoria
         FROM cuentas c
         JOIN tarjetas t ON t.cuenta_id = c.id
         JOIN tipos_tarjeta tt ON tt.id = t.tipo_tarjeta_id
         WHERE t.numero_tarjeta = ? AND c.estado = 'activa'`,
        [numero_tarjeta_destino]
      );
      destino = rows;
      if (rows.length > 0) destinoTarjeta = rows[0];
    } else {
      const [rows]: any = await conn.query(
        'SELECT * FROM cuentas WHERE numero_cuenta = ? AND estado = "activa"',
        [numero_cuenta_destino]
      );
      destino = rows;
    }

    if (destino.length === 0) {
      res.status(404).json({ mensaje: 'Tarjeta o cuenta destino no encontrada' });
      return;
    }

    // Validar que no se pague más de la deuda en tarjeta de crédito
    if (destinoTarjeta?.categoria === 'credito' && monto > Number(destinoTarjeta.tarjeta_saldo)) {
      res.status(400).json({ mensaje: `El monto supera la deuda actual de la tarjeta ($${Number(destinoTarjeta.tarjeta_saldo).toFixed(2)})` });
      return;
    }

    await conn.query('UPDATE cuentas SET saldo = saldo - ? WHERE id = ?', [monto, cuenta_origen_id]);

    if (destinoTarjeta?.categoria === 'credito') {
      // Pago de tarjeta de crédito: reduce la deuda
      await conn.query('UPDATE tarjetas SET saldo = saldo - ? WHERE id = ?', [monto, destinoTarjeta.tarjeta_id]);
    } else {
      // Transferencia a cuenta o tarjeta débito: suma al saldo de la cuenta
      await conn.query('UPDATE cuentas SET saldo = saldo + ? WHERE id = ?', [monto, destino[0].id]);
    }

    const referencia = uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase();

    await conn.query(
      'INSERT INTO transacciones (cuenta_origen_id, cuenta_destino_id, tipo, monto, descripcion, referencia, estado) VALUES (?, ?, "transferencia", ?, ?, ?, "completada")',
      [cuenta_origen_id, destino[0].id, monto, descripcion || null, referencia]
    );

    await conn.commit();
    res.json({ mensaje: 'Transferencia realizada exitosamente', referencia });
  } catch {
    await conn.rollback();
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

export default router;
