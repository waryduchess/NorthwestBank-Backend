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

-- -------------------------------------------------------
-- Datos de prueba
-- Passwords: Password123! | PINs: 1234, 2345, 3456, 4567
-- -------------------------------------------------------

INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, email, telefono, password_hash, pin) VALUES
  ('Josefina Isabel', 'Zacarías',  'Pérez',   'josefina.zacarias@email.com', '5551000001', '$2b$10$Oh8/BOzpGKm4hKJ74DbpsOlC6pY3RM1y3Ckd2KTICQo.sFoTsQYZC', '$2b$10$G8.1p6YLqw7jP8FZTUSaseljnHiNlOP8ALo3QVeVb24FjaQs8aomG'),
  ('Erik Santiago',   'García',    'Rafael',   'erik.garcia@email.com',       '5551000002', '$2b$10$ykhpJ0UJV/Q1QCHLv0qnE.//KHsqUab2mDZKzzgns/Tdg/NF5FbPi', '$2b$10$VbsrJQufmpW3fZ8tQUipPuqHf75nX9x57k/umGbDXo0WW8Rp6bZla'),
  ('Luis Arturo',     'Rivas',     'Barrera',  'luis.rivas@email.com',        '5551000003', '$2b$10$TwtiCK0RbzgjuWFgX8MdleZm.OMQv9GkLOTOJ6EPnedVN68YXckye', '$2b$10$/rCETuh0iQ5pEYfX1uQlkO7FhSi6wiczsxJ/XjXbcg4JZMTgbZn5K'),
  ('Diego Alexander', 'Cordova',   'Alor',     'diego.cordova@email.com',     '5551000004', '$2b$10$WPHyJtM9YIbfSSjckxDpve0g3fQs9B/THwSqWi49xWGQV358vRa0S', '$2b$10$5HHnOpvqVS9wLR.3YmGnxunGigp.2YH6nLisMES/wGj20r3tFRRde');

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo, saldo, limite_credito) VALUES
  (1, '4010000000000001', 'ahorro',      15000.00, NULL),
  (1, '4010000000000011', 'orbe',            0.00, 50000.00),
  (2, '4010000000000002', 'corriente',   32500.50, NULL),
  (2, '4010000000000022', 'silverstone',     0.00, 150000.00),
  (3, '4010000000000003', 'ahorro',       8750.75, NULL),
  (3, '4010000000000033', 'imperium',        0.00, NULL),
  (4, '4010000000000004', 'corriente',   21000.00, NULL),
  (4, '4010000000000044', 'orbe',            0.00, 50000.00);
