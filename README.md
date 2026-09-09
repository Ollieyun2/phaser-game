# Phaser Run-and-Gun Prototype

A minimal 16-bit style side-scrolling prototype built with Phaser 4.2.1.

## Controls

- `A / D`: Move
- `Space`: Jump
- `J`: Punch
- `K`: Shoot horizontally
- `W + K`: Shoot upward

## Current prototype features

- Horizontal movement
- Jumping with gravity
- Separate melee and gun controls
- Upward shooting
- Simple enemies with HP
- Bullet collision and punch hitbox
- Platforms
- Side-scrolling camera with deadzone
- Pixel-art friendly 384x216 internal resolution

## Run locally

Because the prototype loads Phaser from a CDN, serve the repository with any local static server.

For example with VS Code Live Server, open `index.html` through Live Server.

You can also use Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Next steps

- Replace colored rectangles with 16-bit sprites
- Add player animations
- Improve enemy AI
- Add player health / damage
- Add level art and props
- Tune movement and attack feel
