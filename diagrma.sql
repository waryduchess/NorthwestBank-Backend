  CREATE TABLE IF NOT EXISTS usuarios (
    id                INT          PRIMARY KEY AUTO_INCREMENT,
    nombre            VARCHAR(100) NOT NULL,
    apellido_paterno  VARCHAR(100) NOT NULL,
    apellido_materno  VARCHAR(100) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    telefono          VARCHAR(15)  NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    pin               VARCHAR(255) NOT NULL,
    foto_url          VARCHAR(500) NULL,
    biometria_activa  BOOLEAN      NOT NULL DEFAULT FALSE,
    estado            ENUM('activo','bloqueado','inactivo') NOT NULL DEFAULT 'activo',
    intentos_fallidos INT          NOT NULL DEFAULT 0,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cuentas (
    id             INT           PRIMARY KEY AUTO_INCREMENT,
    usuario_id     INT           NOT NULL,
    numero_cuenta  VARCHAR(20)   NOT NULL UNIQUE,
    tipo           ENUM('ahorro','corriente') NOT NULL,
    saldo          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    moneda         VARCHAR(3)    NOT NULL DEFAULT 'MXN',
    estado         ENUM('activa','congelada','cerrada') NOT NULL DEFAULT 'activa',
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS tipos_tarjeta (
    id              INT           PRIMARY KEY AUTO_INCREMENT,
    nombre          VARCHAR(50)   NOT NULL UNIQUE,
    categoria       ENUM('debito','credito') NOT NULL,
    limite_credito  DECIMAL(15,2) NULL,
    moneda          VARCHAR(3)    NOT NULL DEFAULT 'MXN'
  );

  CREATE TABLE IF NOT EXISTS tarjetas (
    id               INT           PRIMARY KEY AUTO_INCREMENT,
    usuario_id       INT           NOT NULL,
    cuenta_id        INT           NOT NULL,
    tipo_tarjeta_id  INT           NOT NULL,
    numero_tarjeta   VARCHAR(20)   NOT NULL UNIQUE,
    saldo            DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    estado           ENUM('activa','congelada','cerrada') NOT NULL DEFAULT 'activa',
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)      REFERENCES usuarios(id),
    FOREIGN KEY (cuenta_id)       REFERENCES cuentas(id),
    FOREIGN KEY (tipo_tarjeta_id) REFERENCES tipos_tarjeta(id)
  );

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
    FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id)
  );

  CREATE TABLE IF NOT EXISTS notificaciones (
    id         INT          PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT          NOT NULL,
    titulo     VARCHAR(100) NOT NULL,
    mensaje    VARCHAR(500) NOT NULL,
    leida      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );