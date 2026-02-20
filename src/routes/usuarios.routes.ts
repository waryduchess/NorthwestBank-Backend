import { Router, Response } from 'express';
import multer from 'multer';
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
