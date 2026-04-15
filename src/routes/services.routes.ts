import { Router, Response } from 'express';
import { verificarToken, AuthRequest } from '../middleware/auth.middleware';
import pool from '../db/connection';

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
  const { tarjeta_id, monto } = req.body;

  if (!tarjeta_id || !monto || Number(monto) <= 0) {
    res.status(400).json({ mensaje: 'tarjeta_id y monto son requeridos' });
    return;
  }

  try {
    // Verificar que la tarjeta pertenece al usuario y tiene saldo suficiente
    const [tarjetas]: any = await pool.query(
      `SELECT t.id, t.cuenta_id, c.saldo FROM tarjetas t
       INNER JOIN cuentas c ON t.cuenta_id = c.id
       WHERE t.id = ? AND c.usuario_id = ? AND t.estado = 'activa'`,
      [tarjeta_id, req.usuario!.id]
    );

    if (tarjetas.length === 0) {
      res.status(404).json({ mensaje: 'Tarjeta no encontrada' });
      return;
    }

    const saldo = parseFloat(tarjetas[0].saldo);
    const montoNum = parseFloat(monto);

    if (saldo < montoNum) {
      res.status(400).json({ mensaje: 'Saldo insuficiente', saldo_disponible: saldo });
      return;
    }

    // Descontar de cuentas (no de tarjetas)
    await pool.query('UPDATE cuentas SET saldo = saldo - ? WHERE id = ?', [montoNum, tarjetas[0].cuenta_id]);

    res.json({ mensaje: 'Pago realizado exitosamente', saldo_nuevo: saldo - montoNum });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;
