CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  telefono VARCHAR(15) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  pin VARCHAR(255) NOT NULL,
  foto_url VARCHAR(500),
  biometria_activa BOOLEAN DEFAULT FALSE,
  estado ENUM('activo', 'bloqueado', 'inactivo') DEFAULT 'activo',
  intentos_fallidos INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cuentas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  numero_cuenta VARCHAR(20) NOT NULL UNIQUE,
  tipo ENUM('ahorro', 'corriente', 'orbe', 'silverstone', 'imperium') NOT NULL,
  saldo DECIMAL(15, 2) DEFAULT 0,
  limite_credito DECIMAL(15, 2) DEFAULT NULL,
  moneda VARCHAR(3) DEFAULT 'USD',
  estado ENUM('activa', 'congelada', 'cerrada') DEFAULT 'activa',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS transacciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cuenta_origen_id INT,
  cuenta_destino_id INT,
  tipo ENUM('transferencia', 'retiro', 'compra', 'deposito') NOT NULL,
  monto DECIMAL(15, 2) NOT NULL,
  descripcion VARCHAR(255),
  referencia VARCHAR(50) NOT NULL UNIQUE,
  estado ENUM('pendiente', 'completada', 'fallida', 'cancelada') DEFAULT 'pendiente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cuenta_origen_id) REFERENCES cuentas(id),
  FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id)
);

CREATE TABLE IF NOT EXISTS notificaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  titulo VARCHAR(100) NOT NULL,
  mensaje VARCHAR(500) NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
