import { Router, Response } from 'express';
import { verificarToken, AuthRequest } from '../middleware/auth.middleware';
import pool from '../db/connection';

const router = Router();

const LIMITES_TARJETA: Record<string, number | null> = {
  orbe: 50000,
  silverstone: 150000,
  imperium: null,
};

/**
 * @swagger
 * /api/cuentas:
 *   get:
 *     summary: Obtener todas las cuentas del usuario
 *     tags: [Cuentas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de cuentas
 */
router.get('/', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, numero_cuenta, tipo, saldo, limite_credito, moneda, estado,
              CASE
                WHEN tipo IN ('orbe','silverstone','imperium') AND limite_credito IS NOT NULL
                THEN limite_credito - saldo
                ELSE NULL
              END AS credito_disponible
       FROM cuentas WHERE usuario_id = ?`,
      [req.usuario!.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/cuentas/{id}:
 *   get:
 *     summary: Obtener detalle de una cuenta
 *     tags: [Cuentas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de la cuenta
 *       404:
 *         description: Cuenta no encontrada
 */
router.get('/:id', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, numero_cuenta, tipo, saldo, limite_credito, moneda, estado, created_at,
              CASE
                WHEN tipo IN ('orbe','silverstone','imperium') AND limite_credito IS NOT NULL
                THEN limite_credito - saldo
                ELSE NULL
              END AS credito_disponible
       FROM cuentas WHERE id = ? AND usuario_id = ?`,
      [req.params['id'], req.usuario!.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada' });
      return;
    }

    res.json(rows[0]);
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/cuentas:
 *   post:
 *     summary: Abrir una nueva cuenta o tarjeta
 *     tags: [Cuentas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo]
 *             properties:
 *               tipo:
 *                 type: string
 *                 enum: [ahorro, corriente, orbe, silverstone, imperium]
 *     responses:
 *       201:
 *         description: Cuenta creada exitosamente
 */
router.post('/', verificarToken, async (req: AuthRequest, res: Response) => {
  const { tipo } = req.body;
  const tiposValidos = ['ahorro', 'corriente', 'orbe', 'silverstone', 'imperium'];

  if (!tipo || !tiposValidos.includes(tipo)) {
    res.status(400).json({ mensaje: `Tipo invalido. Opciones: ${tiposValidos.join(', ')}` });
    return;
  }

  try {
    const numeroCuenta = Date.now().toString().slice(-16).padStart(16, '4');
    const limiteCredito = LIMITES_TARJETA[tipo] ?? null;

    const [result]: any = await pool.query(
      'INSERT INTO cuentas (usuario_id, numero_cuenta, tipo, limite_credito) VALUES (?, ?, ?, ?)',
      [req.usuario!.id, numeroCuenta, tipo, limiteCredito]
    );

    res.status(201).json({ mensaje: 'Cuenta creada exitosamente', id: result.insertId, numero_cuenta: numeroCuenta });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;
