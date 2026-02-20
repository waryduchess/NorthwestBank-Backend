import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import authRoutes from './routes/auth.routes';
import usuariosRoutes from './routes/usuarios.routes';
import cuentasRoutes from './routes/cuentas.routes';
import transaccionesRoutes from './routes/transacciones.routes';
import pagosRoutes from './routes/pagos.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NorthwestBank API',
      version: '1.0.0',
      description: 'API REST para la app de banca movil NorthwestBank',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/cuentas', cuentasRoutes);
app.use('/api/transacciones', transaccionesRoutes);
app.use('/api/pagos', pagosRoutes);

app.listen(PORT, () => {
  console.log(`NorthwestBank API corriendo en http://localhost:${PORT}`);
  console.log(`Documentacion en http://localhost:${PORT}/api/docs`);
});
