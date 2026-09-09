class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.facing = 1;
    this.lastShotAt = 0;
    this.lastPunchAt = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1b1b2f');
    this.physics.world.setBounds(0, 0, 2400, 216);

    this.add.rectangle(1200, 108, 2400, 216, 0x1b1b2f).setScrollFactor(0);
    this.add.rectangle(1200, 188, 2400, 56, 0x3a3a4f);

    this.platforms = this.physics.add.staticGroup();
    this.makePlatform(1200, 204, 2400, 24);
    this.makePlatform(420, 158, 140, 16);
    this.makePlatform(760, 136, 140, 16);
    this.makePlatform(1120, 166, 180, 16);
    this.makePlatform(1530, 145, 160, 16);
    this.makePlatform(1900, 120, 180, 16);

    this.player = this.physics.add.sprite(120, 150, null);
    this.player.setSize(18, 30);
    this.player.setDisplaySize(18, 30);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0);
    this.player.body.setGravityY(900);
    this.player.setTint(0xffd166);

    this.physics.add.collider(this.player, this.platforms);

    this.bullets = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group();

    [520, 880, 1320, 1680, 2140].forEach((x, i) => {
      const enemy = this.enemies.create(x, 160 - (i % 2) * 20, null);
      enemy.setSize(18, 28);
      enemy.setDisplaySize(18, 28);
      enemy.body.setGravityY(900);
      enemy.setTint(0xef476f);
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

    this.add.text(8, 8, 'A/D Move   Space Jump   J Punch   K Shoot   W+K Shoot Up', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff'
    }).setScrollFactor(0).setDepth(10);
  }

  makePlatform(x, y, width, height) {
    const platform = this.platforms.create(x, y, null);
    platform.setDisplaySize(width, height);
    platform.refreshBody();
    platform.setTint(0x6c757d);
    return platform;
  }

  update(time) {
    const speed = 120;
    const grounded = this.player.body.blocked.down || this.player.body.touching.down;

    if (this.keys.left.isDown) {
      this.player.setVelocityX(-speed);
      this.facing = -1;
    } else if (this.keys.right.isDown) {
      this.player.setVelocityX(speed);
      this.facing = 1;
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
    const bullet = this.bullets.create(this.player.x + this.facing * 14, this.player.y - 4, null);
    bullet.setDisplaySize(6, 3);
    bullet.setSize(6, 3);
    bullet.setTint(0x06d6a0);
    bullet.body.allowGravity = false;

    if (upward) {
      bullet.setPosition(this.player.x, this.player.y - 20);
      bullet.setVelocity(0, -300);
    } else {
      bullet.setVelocityX(this.facing * 360);
    }
  }

  punch() {
    const hitbox = this.add.rectangle(this.player.x + this.facing * 18, this.player.y, 24, 26, 0xffffff, 0.18);
    this.physics.add.existing(hitbox);
    hitbox.body.allowGravity = false;

    let spent = false;
    const overlap = this.physics.add.overlap(hitbox, this.enemies, (_h, enemy) => {
      if (spent || !enemy.active) return;
      spent = true;
      enemy.hp -= 2;
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(60, () => enemy.active && enemy.clearTint());
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
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(60, () => enemy.active && enemy.clearTint());
    if (enemy.hp <= 0) enemy.destroy();
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 384,
  height: 216,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: GameScene
};

new Phaser.Game(config);
