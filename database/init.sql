-- =============================================================
-- NorthwestBank - Esquema de Base de Datos
-- Motor: InnoDB (ACID compliant)
-- =============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS usuarios (
  id                INT          PRIMARY KEY AUTO_INCREMENT,
  nombre            VARCHAR(100) NOT NULL,
  apellido_paterno  VARCHAR(100) NOT NULL,
  apellido_materno  VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL UNIQUE,
  telefono          VARCHAR(15)  NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  pin               VARCHAR(255) NULL,
  foto_url          VARCHAR(500) NULL,
  biometria_activa  BOOLEAN      NOT NULL DEFAULT FALSE,
  estado            ENUM('activo','bloqueado','inactivo') NOT NULL DEFAULT 'activo',
  intentos_fallidos INT          NOT NULL DEFAULT 0,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cuentas (
  id             INT           PRIMARY KEY AUTO_INCREMENT,
  usuario_id     INT           NOT NULL,
  numero_cuenta  VARCHAR(20)   NOT NULL UNIQUE,
  tipo           ENUM('ahorro','corriente') NOT NULL,
  saldo          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  moneda         VARCHAR(3)    NOT NULL DEFAULT 'MXN',
  estado         ENUM('activa','congelada','cerrada') NOT NULL DEFAULT 'activa',
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_cuentas_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- CATALOGO DE PRODUCTOS DE TARJETA
-- Centraliza nombre, categoria, limite y moneda de cada tipo
-- =============================================================
CREATE TABLE IF NOT EXISTS tipos_tarjeta (
  id              INT           PRIMARY KEY AUTO_INCREMENT,
  nombre          VARCHAR(50)   NOT NULL UNIQUE,
  categoria       ENUM('debito','credito') NOT NULL,
  limite_credito  DECIMAL(15,2) NULL,    -- NULL en debito (no aplica) e Imperium (sin limite)
  moneda          VARCHAR(3)    NOT NULL DEFAULT 'MXN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- TARJETAS  (instancias por usuario)
-- =============================================================
CREATE TABLE IF NOT EXISTS tarjetas (
  id               INT           PRIMARY KEY AUTO_INCREMENT,
  usuario_id       INT           NOT NULL,
  cuenta_id        INT           NOT NULL,
  tipo_tarjeta_id  INT           NOT NULL,
  numero_tarjeta   VARCHAR(20)   NOT NULL UNIQUE,
  cvv              VARCHAR(3)    NOT NULL,
  fecha_expiracion VARCHAR(5)    NOT NULL,
  saldo            DECIMAL(15,2) NOT NULL DEFAULT 0.00, -- debito: disponible / credito: deuda acumulada
  estado           ENUM('activa','congelada','cerrada') NOT NULL DEFAULT 'activa',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)      REFERENCES usuarios(id),
  FOREIGN KEY (cuenta_id)       REFERENCES cuentas(id),
  FOREIGN KEY (tipo_tarjeta_id) REFERENCES tipos_tarjeta(id),
  INDEX idx_tarjetas_usuario (usuario_id),
  INDEX idx_tarjetas_cuenta  (cuenta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transacciones (
  id                 INT           PRIMARY KEY AUTO_INCREMENT,
  cuenta_origen_id   INT           NULL,
  cuenta_destino_id  INT           NULL,
  tipo               ENUM('transferencia','retiro','compra','deposito') NOT NULL,
  monto              DECIMAL(15,2) NOT NULL,
  descripcion        VARCHAR(255)  NULL,
  referencia         VARCHAR(50)   NOT NULL UNIQUE,
  estado             ENUM('pendiente','completada','fallida','cancelada') NOT NULL DEFAULT 'pendiente',
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cuenta_origen_id)  REFERENCES cuentas(id),
  FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id),
  INDEX idx_tx_origen  (cuenta_origen_id),
  INDEX idx_tx_destino (cuenta_destino_id),
  INDEX idx_tx_fecha   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notificaciones (
  id         INT          PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT          NOT NULL,
  titulo     VARCHAR(100) NOT NULL,
  mensaje    VARCHAR(500) NOT NULL,
  leida      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_notif_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -------------------------------------------------------
-- Datos de prueba
-- Passwords: Password123! | PINs: 1234, 2345, 3456, 4567
-- -------------------------------------------------------

INSERT INTO usuarios (nombre, apellido_paterno, apellido_materno, email, telefono, password_hash, pin) VALUES
  ('Josefina Isabel', 'Zacarías',  'Pérez',   'josefina.zacarias@email.com', '5551000001', '$2b$10$Oh8/BOzpGKm4hKJ74DbpsOlC6pY3RM1y3Ckd2KTICQo.sFoTsQYZC', '$2b$10$G8.1p6YLqw7jP8FZTUSaseljnHiNlOP8ALo3QVeVb24FjaQs8aomG'),
  ('Erik Santiago',   'García',    'Rafael',  'erik.garcia@email.com',       '5551000002', '$2b$10$ykhpJ0UJV/Q1QCHLv0qnE.//KHsqUab2mDZKzzgns/Tdg/NF5FbPi', '$2b$10$VbsrJQufmpW3fZ8tQUipPuqHf75nX9x57k/umGbDXo0WW8Rp6bZla'),
  ('Luis Arturo',     'Rivas',     'Barrera', 'luis.rivas@email.com',        '5551000003', '$2b$10$TwtiCK0RbzgjuWFgX8MdleZm.OMQv9GkLOTOJ6EPnedVN68YXckye', '$2b$10$/rCETuh0iQ5pEYfX1uQlkO7FhSi6wiczsxJ/XjXbcg4JZMTgbZn5K'),
  ('Diego Alexander', 'Cordova',   'Alor',    'diego.cordova@email.com',     '5551000004', '$2b$10$WPHyJtM9YIbfSSjckxDpve0g3fQs9B/THwSqWi49xWGQV358vRa0S', '$2b$10$5HHnOpvqVS9wLR.3YmGnxunGigp.2YH6nLisMES/wGj20r3tFRRde');

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo, saldo) VALUES
  (1, '4010000000000001', 'ahorro',    15000.00),
  (2, '4010000000000002', 'corriente', 32500.50),
  (3, '4010000000000003', 'ahorro',     8750.75),
  (4, '4010000000000004', 'corriente', 21000.00);

-- Catalogo de productos (moneda MXN en todos)
INSERT INTO tipos_tarjeta (nombre, categoria, limite_credito, moneda) VALUES
  ('Nexus',       'debito',  NULL,      'MXN'),
  ('Vertex',      'debito',  NULL,      'MXN'),
  ('Orbe',        'credito', 50000.00,  'MXN'),
  ('Silverstone', 'credito', 150000.00, 'MXN'),
  ('Imperium',    'credito', NULL,      'MXN');  -- NULL = sin limite

-- Tarjetas por usuario  (tipo_tarjeta_id: 1=Nexus, 2=Vertex, 3=Orbe, 4=Silverstone, 5=Imperium)
INSERT INTO tarjetas (usuario_id, cuenta_id, tipo_tarjeta_id, numero_tarjeta, cvv, fecha_expiracion, saldo) VALUES
  (1, 1, 1, '4030000000000001', '123', '05/28', 15000.00),  -- Josefina  Nexus
  (1, 1, 3, '4010000000000011', '456', '08/29',     0.00),  -- Josefina  Orbe
  (2, 2, 2, '4040000000000002', '789', '11/27', 32500.50),  -- Erik      Vertex
  (2, 2, 4, '4020000000000022', '321', '02/28',     0.00),  -- Erik      Silverstone
  (3, 3, 1, '4030000000000003', '654', '07/29',  8750.75),  -- Luis      Nexus
  (3, 3, 5, '4030000000000033', '987', '01/30',     0.00),  -- Luis      Imperium
  (4, 4, 2, '4040000000000004', '147', '09/27', 21000.00),  -- Diego     Vertex
  (4, 4, 3, '4010000000000044', '258', '04/28',     0.00);  -- Diego     Orbe
