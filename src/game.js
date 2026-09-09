class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.facing = 1;
    this.lastShotAt = 0;
    this.lastPunchAt = 0;
    this.worldWidth = 2400;
    this.gravity = 900;
  }

  create() {
    this.cameras.main.setBackgroundColor('#182033');
    this.cameras.main.setBounds(0, 0, this.worldWidth, 216);

    // Background
    this.add.rectangle(1200, 108, 2400, 216, 0x182033).setDepth(-30);
    this.add.rectangle(1200, 174, 2400, 84, 0x232c45).setDepth(-25);

    for (let x = 40; x < this.worldWidth; x += 110) {
      const h = 24 + ((x / 110) % 4) * 10;
      this.add.rectangle(x, 188 - h / 2, 62, h, 0x2f3b59).setDepth(-20);
    }

    // Platforms are simple rectangles with manual collision.
    this.platforms = [
      { x: 1200, y: 204, w: 2400, h: 24 },
      { x: 420, y: 158, w: 140, h: 16 },
      { x: 760, y: 136, w: 140, h: 16 },
      { x: 1120, y: 166, w: 180, h: 16 },
      { x: 1530, y: 145, w: 160, h: 16 },
      { x: 1900, y: 120, w: 180, h: 16 }
    ];

    this.platforms.forEach(p => {
      this.add.rectangle(p.x, p.y, p.w, p.h, 0x6c757d);
      p.left = p.x - p.w / 2;
      p.right = p.x + p.w / 2;
      p.top = p.y - p.h / 2;
      p.bottom = p.y + p.h / 2;
    });

    this.player = {
      x: 120,
      y: 150,
      w: 18,
      h: 30,
      vx: 0,
      vy: 0,
      grounded: false,
      view: this.add.rectangle(120, 150, 18, 30, 0xffd166)
    };

    this.enemies = [520, 880, 1320, 1680, 2140].map((x, i) => ({
      x,
      y: 150 - (i % 2) * 18,
      w: 18,
      h: 28,
      vx: i % 2 === 0 ? -25 : 25,
      vy: 0,
      hp: 3,
      alive: true,
      view: this.add.rectangle(x, 150 - (i % 2) * 18, 18, 28, 0xef476f)
    }));

    this.bullets = [];
    this.punchFlash = null;

    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      punch: Phaser.Input.Keyboard.KeyCodes.J,
      shoot: Phaser.Input.Keyboard.KeyCodes.K
    });

    this.titleText = this.add.text(8, 8, 'PHASER RUN & GUN PROTOTYPE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffd166'
    }).setScrollFactor(0).setDepth(50);

    this.add.text(8, 23, 'A/D move  SPACE jump  J punch  K shoot  W+K up', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff'
    }).setScrollFactor(0).setDepth(50);

    this.add.text(8, 204, 'Prototype v0.3', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#8fa3c7'
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(50);

    this.add.text(300, 8, 'LIVE', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#06d6a0'
    }).setScrollFactor(0).setDepth(50);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.033);
    const speed = 120;

    if (this.keys.left.isDown) {
      this.player.vx = -speed;
      this.facing = -1;
    } else if (this.keys.right.isDown) {
      this.player.vx = speed;
      this.facing = 1;
    } else {
      this.player.vx = 0;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && this.player.grounded) {
      this.player.vy = -340;
      this.player.grounded = false;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.punch) && time - this.lastPunchAt > 250) {
      this.lastPunchAt = time;
      this.punch();
    }

    if (this.keys.shoot.isDown && time - this.lastShotAt > 180) {
      this.lastShotAt = time;
      this.shoot(this.keys.up.isDown);
    }

    this.moveActor(this.player, dt, true);

    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      this.moveActor(enemy, dt, false);
      if (enemy.x < 20 || enemy.x > this.worldWidth - 20) enemy.vx *= -1;
      enemy.view.setPosition(enemy.x, enemy.y);
    });

    this.updateBullets(dt);

    this.player.view.setPosition(this.player.x, this.player.y);
    this.player.view.setScale(this.facing, 1);

    const targetScroll = Phaser.Math.Clamp(this.player.x - 150, 0, this.worldWidth - 384);
    this.cameras.main.scrollX += (targetScroll - this.cameras.main.scrollX) * 0.12;
  }

  moveActor(actor, dt, isPlayer) {
    const previousY = actor.y;

    actor.vy += this.gravity * dt;
    actor.x += actor.vx * dt;
    actor.y += actor.vy * dt;

    actor.x = Phaser.Math.Clamp(actor.x, actor.w / 2, this.worldWidth - actor.w / 2);
    actor.grounded = false;

    const prevBottom = previousY + actor.h / 2;
    const nextBottom = actor.y + actor.h / 2;
    const left = actor.x - actor.w / 2;
    const right = actor.x + actor.w / 2;

    for (const p of this.platforms) {
      const horizontal = right > p.left && left < p.right;
      const crossedTop = prevBottom <= p.top + 2 && nextBottom >= p.top;

      if (horizontal && crossedTop && actor.vy >= 0) {
        actor.y = p.top - actor.h / 2;
        actor.vy = 0;
        actor.grounded = true;
        break;
      }
    }

    if (actor.y > 260) {
      actor.y = 120;
      actor.vy = 0;
      if (!isPlayer) actor.x = Phaser.Math.Clamp(actor.x, 30, this.worldWidth - 30);
    }
  }

  shoot(upward) {
    const bullet = {
      x: upward ? this.player.x : this.player.x + this.facing * 16,
      y: upward ? this.player.y - 20 : this.player.y - 4,
      vx: upward ? 0 : this.facing * 360,
      vy: upward ? -300 : 0,
      w: upward ? 3 : 6,
      h: upward ? 6 : 3,
      view: null
    };

    bullet.view = this.add.rectangle(bullet.x, bullet.y, bullet.w, bullet.h, 0x06d6a0);
    this.bullets.push(bullet);
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.view.setPosition(bullet.x, bullet.y);

      let remove = bullet.x < 0 || bullet.x > this.worldWidth || bullet.y < 0 || bullet.y > 216;

      if (!remove) {
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (this.overlap(bullet, enemy)) {
            this.damageEnemy(enemy, 1);
            remove = true;
            break;
          }
        }
      }

      if (remove) {
        bullet.view.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  punch() {
    const hitbox = {
      x: this.player.x + this.facing * 20,
      y: this.player.y,
      w: 26,
      h: 26
    };

    if (this.punchFlash) this.punchFlash.destroy();
    this.punchFlash = this.add.rectangle(hitbox.x, hitbox.y, hitbox.w, hitbox.h, 0xffffff, 0.22);

    for (const enemy of this.enemies) {
      if (enemy.alive && this.overlap(hitbox, enemy)) {
        this.damageEnemy(enemy, 2);
        break;
      }
    }

    this.time.delayedCall(90, () => {
      if (this.punchFlash) {
        this.punchFlash.destroy();
        this.punchFlash = null;
      }
    });
  }

  damageEnemy(enemy, damage) {
    enemy.hp -= damage;
    enemy.view.setFillStyle(0xffffff);

    this.time.delayedCall(70, () => {
      if (enemy.alive) enemy.view.setFillStyle(0xef476f);
    });

    if (enemy.hp <= 0) {
      enemy.alive = false;
      enemy.view.destroy();
    }
  }

  overlap(a, b) {
    return Math.abs(a.x - b.x) * 2 < (a.w + b.w) &&
           Math.abs(a.y - b.y) * 2 < (a.h + b.h);
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
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 384,
    height: 216
  },
  scene: GameScene
};

new Phaser.Game(config);
