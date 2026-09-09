class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.facing = 1;
    this.lastShotAt = 0;
    this.lastPunchAt = 0;
  }

  createPixelTexture(key, width, height, color) {
    if (this.textures.exists(key)) return;

    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  create() {
    this.createPixelTexture('player', 18, 30, 0xffd166);
    this.createPixelTexture('enemy', 18, 28, 0xef476f);
    this.createPixelTexture('platform', 16, 16, 0x6c757d);
    this.createPixelTexture('bullet', 6, 3, 0x06d6a0);

    this.cameras.main.setBackgroundColor('#182033');
    this.physics.world.setBounds(0, 0, 2400, 216);

    // Simple parallax-like background shapes so the prototype is visibly alive.
    this.add.rectangle(192, 108, 384, 216, 0x182033)
      .setScrollFactor(0)
      .setDepth(-20);
    this.add.rectangle(192, 168, 384, 96, 0x232c45)
      .setScrollFactor(0)
      .setDepth(-19);

    for (let x = 40; x < 2400; x += 120) {
      const h = 25 + ((x / 40) % 4) * 9;
      this.add.rectangle(x, 185 - h / 2, 65, h, 0x2f3b59)
        .setDepth(-10);
    }

    this.platforms = this.physics.add.staticGroup();
    this.makePlatform(1200, 204, 2400, 24);
    this.makePlatform(420, 158, 140, 16);
    this.makePlatform(760, 136, 140, 16);
    this.makePlatform(1120, 166, 180, 16);
    this.makePlatform(1530, 145, 160, 16);
    this.makePlatform(1900, 120, 180, 16);

    this.player = this.physics.add.sprite(120, 150, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.body.setGravityY(900);

    this.physics.add.collider(this.player, this.platforms);

    this.bullets = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group();

    [520, 880, 1320, 1680, 2140].forEach((x, i) => {
      const enemy = this.enemies.create(x, 150 - (i % 2) * 18, 'enemy');
      enemy.body.setGravityY(900);
      enemy.hp = 3;
      enemy.setVelocityX(i % 2 === 0 ? -25 : 25);
    });

    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      punch: Phaser.Input.Keyboard.KeyCodes.J,
      shoot: Phaser.Input.Keyboard.KeyCodes.K
    });

    this.cameras.main.setBounds(0, 0, 2400, 216);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(150, 70);

    this.add.text(8, 8, 'PHASER RUN & GUN PROTOTYPE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffd166'
    }).setScrollFactor(0).setDepth(20);

    this.add.text(8, 23, 'A/D move  SPACE jump  J punch  K shoot  W+K up', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff'
    }).setScrollFactor(0).setDepth(20);

    this.add.text(8, 204, 'Prototype v0.2', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#8fa3c7'
    }).setScrollFactor(0).setDepth(20).setOrigin(0, 1);
  }

  makePlatform(x, y, width, height) {
    const platform = this.platforms.create(x, y, 'platform');
    platform.setDisplaySize(width, height);
    platform.refreshBody();
    return platform;
  }

  update(time) {
    const speed = 120;
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-speed);
      this.facing = -1;
      this.player.setFlipX(true);
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(speed);
      this.facing = 1;
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && grounded) {
      this.player.setVelocityY(-340);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.punch) && time - this.lastPunchAt > 250) {
      this.lastPunchAt = time;
      this.punch();
    }

    if (this.keys.shoot.isDown && time - this.lastShotAt > 180) {
      this.lastShotAt = time;
      this.shoot(this.keys.up.isDown);
    }

    this.enemies.children.iterate(enemy => {
      if (!enemy || !enemy.active) return;
      if (enemy.body.blocked.left) enemy.setVelocityX(25);
      if (enemy.body.blocked.right) enemy.setVelocityX(-25);
    });

    this.bullets.children.iterate(bullet => {
      if (!bullet || !bullet.active) return;
      if (bullet.x < 0 || bullet.x > 2400 || bullet.y < 0 || bullet.y > 216) {
        bullet.destroy();
      }
    });
  }

  shoot(upward) {
    const bullet = this.bullets.create(
      this.player.x + this.facing * 14,
      this.player.y - 4,
      'bullet'
    );
    bullet.body.allowGravity = false;

    if (upward) {
      bullet.setPosition(this.player.x, this.player.y - 20);
      bullet.setVelocity(0, -300);
    } else {
      bullet.setVelocity(this.facing * 360, 0);
    }
  }

  punch() {
    const hitbox = this.add.rectangle(
      this.player.x + this.facing * 18,
      this.player.y,
      24,
      26,
      0xffffff,
      0.22
    );

    this.physics.add.existing(hitbox);
    hitbox.body.allowGravity = false;

    let spent = false;
    const overlap = this.physics.add.overlap(hitbox, this.enemies, (_hitbox, enemy) => {
      if (spent || !enemy.active) return;
      spent = true;
      enemy.hp -= 2;
      enemy.setTint(0xffffff);
      this.time.delayedCall(70, () => {
        if (enemy.active) enemy.clearTint();
      });
      if (enemy.hp <= 0) enemy.destroy();
    });

    this.time.delayedCall(90, () => {
      overlap.destroy();
      hitbox.destroy();
    });
  }

  onBulletHit(bullet, enemy) {
    bullet.destroy();
    enemy.hp -= 1;
    enemy.setTint(0xffffff);
    this.time.delayedCall(70, () => {
      if (enemy.active) enemy.clearTint();
    });
    if (enemy.hp <= 0) enemy.destroy();
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 384,
  height: 216,
  backgroundColor: '#182033',
  pixelArt: true,
  render: {
    antialias: false,
    roundPixels: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 384,
    height: 216
  },
  scene: GameScene
};

new Phaser.Game(config);
