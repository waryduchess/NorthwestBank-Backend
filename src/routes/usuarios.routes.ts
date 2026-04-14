import { Router, Response } from 'express';
import multer from 'multer';
import bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import { verificarToken, AuthRequest } from '../middleware/auth.middleware';
import pool from '../db/connection';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * @swagger
 * /api/usuarios/perfil:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario
 */
router.get('/perfil', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, nombre, apellido_paterno, apellido_materno, email, telefono, foto_url, biometria_activa, estado, created_at FROM usuarios WHERE id = ?',
      [req.usuario!.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json(rows[0]);
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/usuarios/perfil:
 *   patch:
 *     summary: Actualizar datos del perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido_paterno:
 *                 type: string
 *               apellido_materno:
 *                 type: string
 *               email:
 *                 type: string
 *               telefono:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *       400:
 *         description: No se enviaron campos para actualizar o email/telefono ya en uso
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/perfil', verificarToken, async (req: AuthRequest, res: Response) => {
  const { nombre, apellido_paterno, apellido_materno, email, telefono } = req.body;

  const camposPermitidos: Record<string, any> = { nombre, apellido_paterno, apellido_materno, email, telefono };
  const campos: string[] = [];
  const valores: any[] = [];

  for (const [clave, valor] of Object.entries(camposPermitidos)) {
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      campos.push(`${clave} = ?`);
      valores.push(String(valor).trim());
    }
  }

  if (campos.length === 0) {
    res.status(400).json({ mensaje: 'No se enviaron campos para actualizar' });
    return;
  }

  valores.push(req.usuario!.id);

  try {
    const [result]: any = await pool.query(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    const [rows]: any = await pool.query(
      'SELECT id, nombre, apellido_paterno, apellido_materno, email, telefono, foto_url, biometria_activa, estado, created_at FROM usuarios WHERE id = ?',
      [req.usuario!.id]
    );

    res.json({ mensaje: 'Perfil actualizado exitosamente', usuario: rows[0] });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ mensaje: 'El email o teléfono ya está en uso' });
    } else {
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
});

/**
 * @swagger
 * /api/usuarios/password:
 *   patch:
 *     summary: Cambiar contraseña del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password_actual, password_nueva]
 *             properties:
 *               password_actual:
 *                 type: string
 *               password_nueva:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Faltan campos requeridos
 *       401:
 *         description: La contraseña actual es incorrecta
 */
router.patch('/password', verificarToken, async (req: AuthRequest, res: Response) => {
  const { password_actual, password_nueva } = req.body;

  if (!password_actual || !password_nueva) {
    res.status(400).json({ mensaje: 'La contraseña actual y la nueva son requeridas' });
    return;
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [req.usuario!.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    const passwordValido = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!passwordValido) {
      res.status(401).json({ mensaje: 'La contraseña actual es incorrecta' });
      return;
    }

    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [nuevoHash, req.usuario!.id]);

    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/usuarios/biometria:
 *   patch:
 *     summary: Activar o desactivar la biometría del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [activa]
 *             properties:
 *               activa:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Biometría actualizada exitosamente
 *       400:
 *         description: El campo activa es requerido
 */
router.patch('/biometria', verificarToken, async (req: AuthRequest, res: Response) => {
  const { activa } = req.body;

  if (activa === undefined || activa === null) {
    res.status(400).json({ mensaje: 'El campo activa es requerido' });
    return;
  }

  try {
    const [result]: any = await pool.query(
      'UPDATE usuarios SET biometria_activa = ? WHERE id = ?',
      [activa ? 1 : 0, req.usuario!.id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json({ mensaje: `Biometría ${activa ? 'activada' : 'desactivada'} exitosamente` });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/usuarios/foto:
 *   post:
 *     summary: Subir o actualizar foto de perfil
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               foto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Foto actualizada exitosamente
 */
router.post('/foto', verificarToken, upload.single('foto'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ mensaje: 'No se envio ninguna imagen' });
    return;
  }

  try {
    const resultado = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'northwestbank/usuarios', public_id: `usuario_${req.usuario!.id}`, overwrite: true },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        }
      );
      stream.end(req.file!.buffer);
    });

    await pool.query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [resultado, req.usuario!.id]);

    res.json({ mensaje: 'Foto actualizada exitosamente', foto_url: resultado });
  } catch {
    res.status(500).json({ mensaje: 'Error al subir la imagen' });
  }
});

export default router;
