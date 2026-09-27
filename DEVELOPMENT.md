# Money for Nothing: Custom Kitchen Deliveries

Playable solo dual-hand web prototype. Three.js 0.180.0 + cannon-es 0.20.0, vendored locally. No build step, CDN runtime, texture art, backend, or copyrighted music recording is required. Serve this folder with an HTTP server (for example `python -m http.server 8000`) and open localhost:8000; ES modules cannot be loaded reliably from file://.

## Architecture

| File / component | Responsibility |
| --- | --- |
| `index.html` | Accessible game HUD, controls dialog, three level selectors, paycheck, invoice, start/pause/retry flows |
| `style.css` | Responsive dark console, acid-yellow accents and printed invoice |
| `game.js` / `setLevel` | Procedural levels, geometry, rigid-body scene construction and clean shift reset |
| `game.js` / `appliance` | Appliance profiles, damage collisions, mesh details, fragile-drop detection |
| `physics.js` / `PlayerController` | Dynamic character collider, camera-relative movement, grounded jump, two kinematic hand anchors |
| `physics.js` / `GrabTiltController` | Independent hand constraints, appliance torque controller, dynamic dolly chassis and hinge, release |
| `physics.js` / `DamageManager` | Dollar deductions, per-source cooldown and zero-paycheck failure |
| `game.js` / `step` | Fixed-step physics advancement, hazards, delivery recognition and win/fail transitions |
| `crt.js` / `CRTDisplay` | Render target and fullscreen curvature, RGB separation, scanlines, vignette, VHS damage tracking |
| `audio.js` / `RetroAudio` | Original procedural bass/drums/riff, cash register, clunk, grunt and browser speech shout |

A production iteration should split the procedural level builders, appliance factory, input manager and HUD out of game.js. The current boundaries keep the runnable first pass small. These are JavaScript modules, rather than Unity `.cs` scripts, because the requested engine is Three.js.

## Character controller and grab/tilt code

The full first-pass implementation is in `physics.js` and is used by the game directly.

1. A 75 kg dynamic sphere acts as the character collision body; the blocky worker mesh follows it. Horizontal velocity approaches a target with acceleration smoothing. The left stick or WASD is transformed by the camera yaw.
2. Two collision-disabled **kinematic rigid bodies** serve as hand anchors. Their velocity moves them toward positions in front of the worker. The worker is dynamic; the hands are kinematic gameplay targets, not a fully physical skeletal ragdoll.
3. Each held trigger adds a `C.PointToPointConstraint(hand, localHandPivot, appliance, localAppliancePivot, maxForce)`. Release removes only that hand's joint. E toggles both for keyboard convenience.
4. A quaternion-error torque servo steers the appliance toward requested yaw and tilt. Angular damping reduces oscillation. Its transform is never teleported while held; collisions and the solver can resist the servo.
5. The fridge creates a 12 kg dolly chassis and a **hinge constraint** at its lower edge. Both hand joints attach to the chassis. The fridge's center of gravity is above the hinge, so steering, gravity and impacts affect balance. An initial tilt-back input permits full pushing speed.
6. The real rigid-body up-vector determines the tip angle. More than 45° causes a $650 loss and releases the grip. A 1.2-second per-source damage cooldown prevents a single collision from charging every physics tick.
7. Releasing removes hand and dolly joints and records the appliance's release height. A microwave falling more than 1 m before floor contact ends the level.

### Appliance profiles

| Appliance | Mass | Base collider (m) | Handling |
| --- | ---: | --- | --- |
| Microwave | 6 kg | 0.92 × 0.62 × 0.66 | One or two hands; inertia carries it forward after release; drop limit 1 m |
| Refrigerator | 95 kg | 1.14 × 2.25 × 0.94 | Both hands; dolly hinge; slow acceleration; balance limit 45° |
| Television | 25 kg | 1.72 × 1.20 × 0.80 | Wide collider; right-stick vertical input rolls it through the 1.5 m doorway |
| Double-door fridge, level 3 | 95 kg | 1.45 × 2.40 × 1.05 | Wider collider on the spiral route |

Physics: gravity −9.82 m/s²; fixed 1/60-second steps; up to four substeps per frame; 16 solver iterations. Dimensions are gameplay approximations, not product measurements. The green zone checks center position, height, released state and speed below 0.7 m/s for one second. It then checks off that appliance. All three complete the shift.

## 1985 geometry and shader guide

The reference-inspired characters use cuboid heads, disconnected-looking limbs, geometric eyes, overalls, fluorescent shirts and pink sweatbands. Appliance handles, screens, buttons, dolly rails and wheels are geometry. There are no detail textures, smooth normals, shadows, ambient occlusion or PBR surface maps.

The shipped prototype uses **flat Lambert shading** with ambient fill and one hard directional light to preserve face separation. All forms use solid per-mesh colors. To choose a strictly unlit vertex-color variant, use this factory:

```js
function unlitFaceted(geometry, faceColors) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const colors = new Float32Array(g.attributes.position.count * 3);
  for (let face = 0; face < g.attributes.position.count / 3; face++) {
    const c = new THREE.Color(faceColors[face % faceColors.length]);
    for (let vertex = 0; vertex < 3; vertex++) {
      c.toArray(colors, (face * 3 + vertex) * 3);
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
}
```

Unlit rendering ignores scene lights. Bake different solid colors onto faces to retain the primitive, faceted appearance; no texture is needed. `flatShading` alone is not meaningful for MeshBasicMaterial because it has no lighting calculation.

### CRT pipeline

`CRTDisplay` renders the whole 3D scene to a WebGLRenderTarget, then samples it through a fullscreen ShaderMaterial. The actual vertex and fragment shader source is included in `crt.js`.

- Barrel distortion: recenter UV coordinates into −1…1, multiply by `1 + 0.025 * dot(p,p)`, then return to 0…1.
- RGB separation: read red and blue at ±0.0013 horizontal offsets; green remains centered.
- Scanlines: multiply by `0.93 + 0.07 * sin(uv.y * resolution.y * PI)`.
- Curved edges and vignette: darken radially and black out distorted samples outside the image.
- Damage tracking: animate a horizontal distortion band and increase random noise/RGB offset. The damage uniform decays after a charged collision.

The HTML HUD is intentionally outside the CRT pass for text readability. Tune curvature first; excessive distortion hides the delivery zone at the edges. The prototype has no soft shadows or AO.

## Levels and controls

1. **MTV Suburbs:** truck deck/ramp, narrow kitchen doorway, low-friction kitchen floor, breakable vases and a sleeping dog. Loud appliance collisions wake the dog; shouting makes it back off for five seconds.
2. **Yuppie Penthouse:** fragile glass tables with physical supports and a rotating, swinging kinematic fan collider that strikes tall loads.
3. **Spiral Staircase:** 30 ascending physical treads around a central column, wider fridge and elevated delivery platform. C rotates the orthographic camera; Space assists with threshold stepping while pushing the dolly.

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Move | WASD | Left stick |
| Both hands toggle | E | Hold both triggers |
| Individual grips | Hold Q / R | LT / RT |
| Rotate | Left / right arrows | Right stick X |
| Tilt / balance | Up / down arrows | Right stick Y |
| Jump / threshold step | Space | A / Cross |
| Shout | Y | Y / Triangle |
| Rotate camera | C / Shift+C | RB / LB |
| Pause | Escape | Start |

Sound starts only from its button, respecting browser audio activation. The synth-rock rhythm is original and generated with Web Audio; browser speech quality varies. Touch controls cover movement, grabbing and yaw rotation; keyboard or controller provides the complete control set.

## Validation and first-pass limits

Checked JavaScript module syntax; all three level construction paths; stable initial simulation without paycheck loss; microwave, fridge and TV grip creation; torque update and joint cleanup; microwave release; and all three delivery detections leading to victory. Physics tests run with the rendering/HUD boundary stubbed, using the actual cannon-es world and game logic. They are not browser or controller hardware playtests.

Browser rendering, audio output, shader compilation and complete player-driven routes have **not** been visually playtested in this environment. WebMCP actions are feature-detected; browser validation of registration was unavailable.

This is a solo dual-hand prototype, not networked co-op. The integrated dolly engages near the fridge; separate free-standing dolly alignment and manual strap attachment remain a next iteration. The dolly uses a sliding box chassis, with visual wheels, rather than separate wheel/suspension rigid bodies. The staircase's threshold assistance is an arcade aid. Colliders are simple boxes, property breaks change geometry rather than generating glass shards, and the worker is not a ragdoll. A controller tuning pass and player-driven completion tests are the next milestone before calling this a finished game.

Third-party license text is included under `vendor/`. Reference images are not redistributed in the game or source archive.

## Movement fix — 0.1.1

Character contacts now use zero physical friction; the movement controller handles acceleration and braking. World colliders explicitly use the default physics material so the character friction override applies. This fixes static contact friction cancelling WASD velocity. Appliance friction and collisions remain enabled. The spawn point is clear of the ramp edge.

The canvas is focusable, keyboard input uses physical KeyW/KeyA/KeyS/KeyD codes, WASD starts the shift, and focus-loss pauses resume with WASD or a canvas click. Intentional Escape pauses remain paused. A blocked gamepad API cannot stop the keyboard update loop.

Regression coverage: event-driven WASD movement in all three levels at 30, 60 and 120 Hz; key release; focus-loss pause recovery; intentional pause; unavailable gamepad API. Browser playtesting remains unverified.
