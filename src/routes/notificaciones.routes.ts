import { Router, Response } from 'express';
import { verificarToken, AuthRequest } from '../middleware/auth.middleware';
import pool from '../db/connection';

const router = Router();

/**
 * @swagger
 * /api/notificaciones:
 *   get:
 *     summary: Listar notificaciones del usuario autenticado
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificaciones ordenadas por fecha descendente
 */
router.get('/', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT id, titulo, mensaje, leida, created_at
       FROM notificaciones
       WHERE usuario_id = ?
       ORDER BY created_at DESC`,
      [req.usuario!.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notificaciones/leer-todas:
 *   patch:
 *     summary: Marcar todas las notificaciones como leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las notificaciones marcadas como leídas
 */
router.patch('/leer-todas', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ? AND leida = FALSE',
      [req.usuario!.id]
    );
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/notificaciones/{id}/leer:
 *   patch:
 *     summary: Marcar una notificación como leída
 *     tags: [Notificaciones]
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
 *         description: Notificación marcada como leída
 *       404:
 *         description: Notificación no encontrada
 */
router.patch('/:id/leer', verificarToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const [result]: any = await pool.query(
      'UPDATE notificaciones SET leida = TRUE WHERE id = ? AND usuario_id = ?',
      [id, req.usuario!.id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ mensaje: 'Notificación no encontrada' });
      return;
    }

    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;
