import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/connection';

const router = Router();

/**
 * @swagger
 * /api/auth/registro:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido_paterno, apellido_materno, email, telefono, password, pin]
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
 *               password:
 *                 type: string
 *               pin:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Email o telefono ya registrado
 */
router.post('/registro', async (req: Request, res: Response) => {
  const { nombre, apellido_paterno, apellido_materno, email, telefono, password, pin } = req.body;

  if (!nombre || !apellido_paterno || !apellido_materno || !email || !telefono || !password || !pin) {
    res.status(400).json({ mensaje: 'Todos los campos son requeridos' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(pin, 10);

    const [result]: any = await pool.query(
      'INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, email, telefono, password_hash, pin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, apellido_paterno, apellido_materno, email, telefono, passwordHash, pinHash]
    );

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente', id: result.insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ mensaje: 'Email o telefono ya registrado' });
    } else {
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesion
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso, retorna token JWT
 *       401:
 *         description: Credenciales incorrectas
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ mensaje: 'Email y password son requeridos' });
    return;
  }

  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM usuarios WHERE email = ? AND estado = "activo"',
      [email]
    );

    if (rows.length === 0) {
      res.status(401).json({ mensaje: 'Credenciales incorrectas' });
      return;
    }

    const usuario = rows[0];
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      res.status(401).json({ mensaje: 'Credenciales incorrectas' });
      return;
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido_paterno: usuario.apellido_paterno,
        apellido_materno: usuario.apellido_materno,
        email: usuario.email,
      },
    });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;
