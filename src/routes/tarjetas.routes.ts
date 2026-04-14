import { Router, Response } from 'express';
import { verificarToken, AuthRequest } from '../middleware/auth.middleware';
import pool from '../db/connection';

const router = Router();

const PREFIJOS_DEBITO = ['4040', '4050'];

const PREFIJOS_CREDITO: Record<string, string> = {
  orbe: '4010',
  silverstone: '4020',
  imperium: '4030',
};

function generarNumero(prefijo: string): string {
  let resto = '';
  for (let i = 0; i < 12; i++) {
    resto += Math.floor(Math.random() * 10).toString();
  }
  return prefijo + resto;
}

function generarCVV(): string {
  return Math.floor(100 + Math.random() * 900).toString();
}

function generarNIP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generarFechaExpiracion(): string {
  const hoy = new Date();
  const anios = 3 + Math.floor(Math.random() * 3);
  const mes = Math.floor(1 + Math.random() * 12);
  const anio = hoy.getFullYear() + anios;
  return `${mes.toString().padStart(2, '0')}/${anio.toString().slice(-2)}`;
}

/**
 * @swagger
 * /api/tarjetas/generar-credito:
 *   get:
 *     summary: Generar datos aleatorios para una tarjeta de crédito
 *     description: |
 *       Genera número, CVV y fecha de expiración para la tarjeta de crédito indicada.
 *       Prefijos: Orbe=4010, Silverstone=4020, Imperium=4030.
 *       Usar los datos generados en POST /api/tarjetas para registrar la tarjeta.
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         required: true
 *         schema:
 *           type: string
 *           enum: [orbe, silverstone, imperium]
 *     responses:
 *       200:
 *         description: Datos generados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 numero_tarjeta:
 *                   type: string
 *                   example: "4010837261948302"
 *                 cvv:
 *                   type: string
 *                   example: "741"
 *                 fecha_expiracion:
 *                   type: string
 *                   example: "03/30"
 *                 tipo_tarjeta_id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 limite_credito:
 *                   type: number
 *                   nullable: true
 *                 nip:
 *                   type: string
 *                   example: "4823"
 *       400:
 *         description: Tipo inválido
 */
router.get('/generar-credito', verificarToken, async (req: AuthRequest, res: Response) => {
  const tipo = (req.query['tipo'] as string)?.toLowerCase();

  if (!tipo || !PREFIJOS_CREDITO[tipo]) {
    res.status(400).json({ mensaje: 'tipo requerido. Opciones: orbe, silverstone, imperium' });
    return;
  }

  try {
    const [tipos]: any = await pool.query(
      "SELECT id, nombre, limite_credito FROM tipos_tarjeta WHERE LOWER(nombre) = ? AND categoria = 'credito'",
      [tipo]
    );

    if (tipos.length === 0) {
      res.status(400).json({ mensaje: 'Tipo de tarjeta no encontrado' });
      return;
    }

    const prefijo = PREFIJOS_CREDITO[tipo];
    let numero_tarjeta: string;
    let intentos = 0;

    do {
      numero_tarjeta = generarNumero(prefijo);
      const [existente]: any = await pool.query(
        'SELECT id FROM tarjetas WHERE numero_tarjeta = ?',
        [numero_tarjeta]
      );
      if (existente.length === 0) break;
      intentos++;
    } while (intentos < 10);

    if (intentos >= 10) {
      res.status(500).json({ mensaje: 'No se pudo generar un número de tarjeta único' });
      return;
    }

    const tipoDB = tipos[0];
    res.json({
      numero_tarjeta,
      cvv: generarCVV(),
      fecha_expiracion: generarFechaExpiracion(),
      nip: generarNIP(),
      tipo_tarjeta_id: tipoDB.id,
      nombre: tipoDB.nombre,
      limite_credito: tipoDB.limite_credito,
    });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/tarjetas:
 *   get:
 *     summary: Listar tarjetas del usuario autenticado
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tarjetas
 */
router.get('/', verificarToken, async (req: AuthRequest, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT t.id, t.cuenta_id, t.numero_tarjeta, t.cvv, t.nip, t.fecha_expiracion,
              CASE
                WHEN tt.categoria = 'debito' THEN c.saldo
                ELSE t.saldo
              END AS saldo,
              t.estado, t.created_at,
              tt.nombre AS tipo, tt.categoria, tt.limite_credito,
              c.numero_cuenta,
              CASE
                WHEN tt.categoria = 'credito' AND tt.limite_credito IS NOT NULL
                THEN tt.limite_credito - t.saldo
                ELSE NULL
              END AS credito_disponible
       FROM tarjetas t
       JOIN tipos_tarjeta tt ON t.tipo_tarjeta_id = tt.id
       JOIN cuentas c ON t.cuenta_id = c.id
       WHERE t.usuario_id = ?`,
      [req.usuario!.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

/**
 * @swagger
 * /api/tarjetas:
 *   post:
 *     summary: Registrar una tarjeta (débito o crédito)
 *     description: |
 *       Registra una tarjeta en la cuenta indicada.
 *       - Débito (Nexus/Vertex): el usuario ingresa el número manualmente, debe iniciar con 4030 o 4040.
 *       - Orbe: prefijo 4010 | Silverstone: prefijo 4020 | Imperium: prefijo 4030.
 *     tags: [Tarjetas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cuenta_id, tipo_tarjeta_id, numero_tarjeta, cvv, fecha_expiracion, nip]
 *             properties:
 *               cuenta_id:
 *                 type: integer
 *               tipo_tarjeta_id:
 *                 type: integer
 *               numero_tarjeta:
 *                 type: string
 *                 description: 16 dígitos con el prefijo correspondiente al tipo
 *               cvv:
 *                 type: string
 *                 description: 3 dígitos
 *                 example: "741"
 *               fecha_expiracion:
 *                 type: string
 *                 description: Formato MM/YY
 *                 example: "03/30"
 *               nip:
 *                 type: string
 *                 description: 4 dígitos numéricos
 *                 example: "1234"
 *     responses:
 *       201:
 *         description: Tarjeta registrada exitosamente
 *       400:
 *         description: Datos inválidos o prefijo incorrecto para el tipo
 *       404:
 *         description: Cuenta no encontrada
 *       409:
 *         description: Número de tarjeta ya registrado
 */
router.post('/', verificarToken, async (req: AuthRequest, res: Response) => {
  const { cuenta_id, tipo_tarjeta_id, numero_tarjeta, cvv, fecha_expiracion, nip } = req.body;

  if (!cuenta_id || !tipo_tarjeta_id || !numero_tarjeta || !cvv || !fecha_expiracion || !nip) {
    res.status(400).json({ mensaje: 'cuenta_id, tipo_tarjeta_id, numero_tarjeta, cvv, fecha_expiracion y nip son requeridos' });
    return;
  }

  if (!/^\d{16}$/.test(numero_tarjeta)) {
    res.status(400).json({ mensaje: 'El número de tarjeta debe tener exactamente 16 dígitos' });
    return;
  }

  if (!/^\d{3}$/.test(cvv)) {
    res.status(400).json({ mensaje: 'El CVV debe tener exactamente 3 dígitos' });
    return;
  }

  if (!/^\d{2}\/\d{2}$/.test(fecha_expiracion)) {
    res.status(400).json({ mensaje: 'La fecha de expiración debe tener formato MM/YY' });
    return;
  }

  if (!/^\d{4}$/.test(nip)) {
    res.status(400).json({ mensaje: 'El NIP debe tener exactamente 4 dígitos' });
    return;
  }

  try {
    // Verificar que el número no esté ya registrado
    const [existente]: any = await pool.query(
      'SELECT id FROM tarjetas WHERE numero_tarjeta = ?',
      [numero_tarjeta]
    );
    if (existente.length > 0) {
      res.status(409).json({ mensaje: 'El número de tarjeta ya está registrado' });
      return;
    }

    // Obtener el tipo de tarjeta
    const [tipos]: any = await pool.query(
      'SELECT id, nombre, categoria FROM tipos_tarjeta WHERE id = ?',
      [tipo_tarjeta_id]
    );
    if (tipos.length === 0) {
      res.status(400).json({ mensaje: 'Tipo de tarjeta no encontrado' });
      return;
    }

    const tipo = tipos[0];
    const prefijo = numero_tarjeta.slice(0, 4);

    // Validar prefijo según categoría y nombre
    if (tipo.categoria === 'debito') {
      if (!PREFIJOS_DEBITO.includes(prefijo)) {
        res.status(400).json({ mensaje: 'Tarjeta débito debe iniciar con 4030 o 4040' });
        return;
      }
    } else {
      const prefijoEsperado = PREFIJOS_CREDITO[tipo.nombre.toLowerCase()];
      if (prefijo !== prefijoEsperado) {
        res.status(400).json({
          mensaje: `Tarjeta ${tipo.nombre} debe iniciar con ${prefijoEsperado}`,
        });
        return;
      }
    }

    // Verificar que la cuenta pertenece al usuario y está activa
    const [cuentas]: any = await pool.query(
      "SELECT id FROM cuentas WHERE id = ? AND usuario_id = ? AND estado = 'activa'",
      [cuenta_id, req.usuario!.id]
    );
    if (cuentas.length === 0) {
      res.status(404).json({ mensaje: 'Cuenta no encontrada o no está activa' });
      return;
    }

    const [result]: any = await pool.query(
      'INSERT INTO tarjetas (usuario_id, cuenta_id, tipo_tarjeta_id, numero_tarjeta, cvv, fecha_expiracion, nip) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.usuario!.id, cuenta_id, tipo_tarjeta_id, numero_tarjeta, cvv, fecha_expiracion, nip]
    );

    res.status(201).json({
      mensaje: 'Tarjeta registrada exitosamente',
      id: result.insertId,
      numero_tarjeta,
      tipo: tipo.nombre,
      categoria: tipo.categoria,
    });
  } catch {
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});

export default router;
