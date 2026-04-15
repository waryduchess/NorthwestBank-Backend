import { Router, Response } from 'express';
import { verificarToken, AuthRequest } from '../middleware/auth.middleware';
import pool from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * @swagger
 * /api/servicios/servicio:
 *   post:
 *     summary: Pagar un servicio descontando de una tarjeta seleccionada
 *     tags: [Servicios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tarjeta_id, monto]
 *             properties:
 *               tarjeta_id:
 *                 type: integer
 *                 description: ID de la tarjeta seleccionada
 *               monto:
 *                 type: number
 *                 description: Monto a descontar
 *     responses:
 *       200:
 *         description: Pago realizado exitosamente
 *       400:
 *         description: Saldo insuficiente o datos inválidos
 *       404:
 *         description: Tarjeta no encontrada
 */
router.post('/servicio', verificarToken, async (req: AuthRequest, res: Response) => {
  const { tarjeta_id, monto, descripcion } = req.body;

  if (!tarjeta_id || !monto || Number(monto) <= 0) {
    res.status(400).json({ mensaje: 'tarjeta_id y monto son requeridos' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [tarjetas]: any = await conn.query(
      `SELECT t.id, t.saldo AS tarjeta_saldo, t.cuenta_id,
              c.saldo AS cuenta_saldo,
              tt.categoria, tt.limite_credito
       FROM tarjetas t
       INNER JOIN cuentas c ON t.cuenta_id = c.id
       INNER JOIN tipos_tarjeta tt ON t.tipo_tarjeta_id = tt.id
       WHERE t.id = ? AND c.usuario_id = ? AND t.estado = 'activa'
       FOR UPDATE`,
      [tarjeta_id, req.usuario!.id]
    );

    if (tarjetas.length === 0) {
      res.status(404).json({ mensaje: 'Tarjeta no encontrada' });
      return;
    }

    const tarjeta = tarjetas[0];
    const montoNum = parseFloat(monto);
    const esCredito = tarjeta.categoria === 'credito';

    if (esCredito) {
      const deudaActual = parseFloat(tarjeta.tarjeta_saldo);
      const limite = tarjeta.limite_credito !== null ? parseFloat(tarjeta.limite_credito) : Infinity;
      if (deudaActual + montoNum > limite) {
        res.status(400).json({ mensaje: 'Límite de crédito insuficiente', credito_disponible: limite - deudaActual });
        return;
      }
      await conn.query('UPDATE tarjetas SET saldo = saldo + ? WHERE id = ?', [montoNum, tarjeta.id]);
    } else {
      const saldoCuenta = parseFloat(tarjeta.cuenta_saldo);
      if (saldoCuenta < montoNum) {
        res.status(400).json({ mensaje: 'Saldo insuficiente', saldo_disponible: saldoCuenta });
        return;
      }
      await conn.query('UPDATE cuentas SET saldo = saldo - ? WHERE id = ?', [montoNum, tarjeta.cuenta_id]);
    }

    const referencia = uuidv4().replace(/-/g, '').substring(0, 20).toUpperCase();

    await conn.query(
      'INSERT INTO transacciones (cuenta_origen_id, tipo, monto, descripcion, referencia, estado) VALUES (?, "servicio", ?, ?, ?, "completada")',
      [tarjeta.cuenta_id, montoNum, descripcion || 'Pago de servicio', referencia]
    );

    await conn.query(
      'INSERT INTO notificaciones (usuario_id, titulo, mensaje) VALUES (?, "Pago de servicio", ?)',
      [req.usuario!.id, `Pago de $${montoNum.toFixed(2)} realizado. ${descripcion || 'Pago de servicio'}`]
    );

    await conn.commit();

    const saldoFinal = esCredito
      ? { credito_disponible: (tarjeta.limite_credito !== null ? parseFloat(tarjeta.limite_credito) : 0) - (parseFloat(tarjeta.tarjeta_saldo) + montoNum) }
      : { saldo_nuevo: parseFloat(tarjeta.cuenta_saldo) - montoNum };

    res.json({ mensaje: 'Pago realizado exitosamente', ...saldoFinal });
  } catch (err) {
    await conn.rollback();
    console.error('Error en POST /servicios/servicio:', err);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

export default router;
