# Making the castle scenes look like Prisoner of Azkaban

Research for the `intro` and `gates` scenes. Covers what causes the current problems, what the sources say, a prioritised fix plan and free assets.
Versions checked in `node_modules`: three 0.186.1, @react-three/postprocessing 3.2.0, postprocessing 6.39.5, R3F 9.

Items marked **[unsure]** were not verified against a source or the code. Tune them by eye.

---

## 1. Diagnosis

### 1.1 The huge speckled "sun" moon

There are three causes, and they stack.

**A. The disc is about 10x too big and far too bright.** `src/three/Sky.jsx:27`

```glsl
col += vec3(0.9, 0.93, 1.0) * smoothstep(0.9988, 0.9991, m) * 2.2;
```

- `acos(0.9991)` = 2.43° and `acos(0.9988)` = 2.81°. That is a disc radius of about 2.6°, so a diameter of about **5.3°**.
- The real moon is **0.52°** across.
- With `fov: 40` (`World.jsx:121`) at 1080p that is about 27 px per degree, so the disc is about 145 px across.
- The halo terms on lines 28–29 (`pow(m,120)`: half-intensity radius 6.2°; `pow(m,12)`: about 19°) add a bright blob roughly 12° across.
- Peak linear value is about **(2.6, 2.75, 3.25)**. Bloom (`World.jsx:164`, threshold 0.85, intensity 1.1) spreads it further.
- `MOON_DIR` (`Sky.jsx:9`) is 11.5° up and 21.6° left, which puts the blob right beside the castle in the intro shot.

**B. Nothing is tone mapped, so HDR values reach the final blends.**
- R3F sets ACES on the renderer by default (`@react-three/fiber/dist/events-*.js`: `gl.toneMapping = flat ? NoToneMapping : ACESFilmicToneMapping`).
- `<EffectComposer>` **overrides that**: `node_modules/@react-three/postprocessing/dist/index.js:481–482` runs `gl.toneMapping = NoToneMapping` while the composer is mounted.
- It renders to a `HalfFloatType` buffer (`index.js:365`), so values above 1 survive.
- `World.jsx:163–168` has no `<ToneMapping>` effect. So the scene has **no tone mapping at all**: no filmic toe or shoulder, and anything above 1 hard-clips at the screen.
- The postprocessing README says this outright: keep the renderer on `NoToneMapping` and "use a `ToneMappingEffect` at the end of the pipeline" (https://github.com/pmndrs/postprocessing). Three.js Journey says the same for R3F (https://threejs-journey.com/lessons/post-processing-with-r3f).

**C. Noise with `SOFT_LIGHT` + `premultiply` on HDR input is what makes the coloured speckles.** `World.jsx:167`
- The noise shader in postprocessing 6.39.5 (`build/index.js`, `noise.frag`) is `src = min(inputColor.rgb * rand, 1.0)`. It uses one random value per pixel, but because it multiplies by each channel's value, it clamps differently per channel.
- The soft-light blend (`soft-light.frag`) is:
  ```glsl
  d = dst + (2src - 1);   b = d * (sqrt(dst) - dst)   // when src >= 0.5
  a = dst - (1 - 2src) * dst * (1 - dst)            // when src < 0.5
  ```
- For `dst > 1`, `sqrt(dst) - dst` is **negative**, so the "lighten" branch returns large negative numbers. Mixed at `opacity 0.35`:
  - About 80% of moon pixels (rand > ~0.19): out ≈ R 0.64, G 0.5, B 0.1. Blue is pushed hardest because it is the brightest channel. That reads as an **orange-yellow disc**.
  - Pixels with rand < ~0.15: `a` blows up to about 6–9, giving **white specks**.
  - Pixels where only the blue channel crosses `src ≥ 0.5`: **yellow**. In the halo (R < 1 < B) you get **red/orange** speckles.
- The same happens on every HDR pixel: window emissive 2.2 (`Castle.jsx:34`) and torch hot-spots. As a side issue, `premultiply` scales grain *down* in the dark gradients, which is exactly where it was meant to hide banding.
- Separately, postprocessing's soft-light formula looks different from the W3C formula even for in-range values, because `d` uses `dst + (2src-1)` rather than `(2src-1)` **[unsure if intentional]**. Either way, SOFT_LIGHT is unsafe on unclamped HDR.

**Verdict:** the "sun" is (A) an oversized, over-bright procedural disc, bloomed, then (C) mangled into yellow/red speckles by the SOFT_LIGHT noise acting on un-tonemapped HDR values (B). The `smoothstep` size and the missing tone mapping are both real causes. The colours come specifically from the Noise blend.

### 1.2 Glossy, plastic castle spires

Measured from the GLB itself (embedded textures extracted and averaged):

| model | base colour mean (sRGB) | ORM mean R / **G = roughness** / B = metal |
|---|---|---|
| `castle/castle.glb` | (10, 31, 48), very dark navy with baked night light and amber windows | 254 / **31 (0.12)** / 6 |
| `dem/gate.glb` | — | 253 / 199 (0.78) / 8 |
| `dem/dementor.glb` | (31, 33, 33) | 254 / 245 / 13 |
| `snape/snape.glb` | (44, 39, 36) | 254 / 229 / 5 |
| `ron/ron.glb` | (73, 62, 56) | 254 / 221 / 7 |
| `dem/owl.glb` | (181, 179, 174) | 253 / 165 / 7 |

- three.js **multiplies** the scalar by the map. `node_modules/three/src/renderers/shaders/ShaderChunk/roughnessmap_fragment.glsl.js`: `roughnessFactor = roughness; roughnessFactor *= texelRoughness.g;`
- So `m.roughness = 0.95` (`Castle.jsx:31`) gives an effective roughness of **0.95 × 0.12 ≈ 0.11**, which is mirror-glossy. The "matte" fix does nothing while `roughnessMap` is still attached.
- `m.color = '#5a6478'` (`Castle.jsx:32`) multiplies an already near-black albedo (linear ~0.003–0.03). Diffuse is therefore about 0. What you actually see on the stone is **specular only**: the HDRI reflection (`World.jsx:136`) plus the point light hot-spot (`Castle.jsx:59`). That is the textbook plastic look.
- The castle normal map (`castle.glb` image 0, 6 KB, almost flat blue) carries almost no detail. All the "detail" is painted into the baked base colour, so real lighting cannot reveal stone.
- `matte()` in `Gates.jsx:62–70` has the same multiply issue. It is harmless there because the gate's map is already rough (0.78).

### 1.3 Flat, washed-out, "unfinished" overall

1. **No tone mapping** (see 1.1B). Mid-tones sit on a linear curve and highlights clip, with no filmic contrast. Biggest single cause.
2. **Flat fill light.** `ambientLight 0.28 #8a90c0` (`World.jsx:124`) is direction-less. Add `environmentIntensity 0.35` (`World.jsx:136`) and **no shadows anywhere** (`<Canvas>` has no `shadows`, and no light has `castShadow`). The result is no form, no contact and no grounding.
3. **Moonlight is a weak back-light only.** It is a directional light of 2.4 from `MOON_DIR*60` (`Castle.jsx:86`), so it hits faces turned away from the camera. That is good for rim light, but nothing defines the front planes except the uniform ambient light.
4. **Non-diegetic lights sitting in the wrong place.**
   - The `Rig` spotlight (`World.jsx:54–56`) is placed at `look + (1.5, 7.5, 4)`. In the intro that is `(1.5, 7.5, -51)`, which is **inside the castle diorama** (it spans z −64.6…−45.4).
   - The castle `pointLight` (`Castle.jsx:59`, intensity 90, decay 1.2) adds a radial hot-spot that makes the model read like a lit toy. Moonlight is parallel and should not do that.
5. **Fog washes everything to a mid blue, but adds no depth where it is needed.**
   - `HORIZON #2b3652` (`Sky.jsx:7`) is a fairly lifted blue and is used as the fog colour (`Castle.jsx:69`). With linear fog near 18 / far 115 (`Castle.jsx:79–80`):
     - In the **gates** shot, the gates are 13–33 units from the camera, so they get 0–15% fog. There is no recession and the corridor looks flat.
     - In the intro the far terrain turns uniform blue-grey, which reads as a sea.
6. **Hills are invisible.** `Hills` (`Sky.jsx:70–71`, `meshBasicMaterial`, fog on) sit about 80–140 units away, which is past or near fog far. They render as exactly the horizon colour, so there is no silhouette layering.
7. **Drei `<Stars>` render over the hills.** `World.jsx:129` uses radius 70 + depth 30, so stars sit 70–100 units from the origin, *in front of* the hills (radius 110 around z −30). The sky shader also draws its own stars (`Sky.jsx:31–33`), so there are two star systems. The shader stars are blocky hashed cells about 0.15° in size.
8. **Mist sprites cut hard lines.** `Castle.jsx:111–129`: camera-facing planes at y 0.4–2.6 with scale 6–14. Half of each plane sits below the ground, and some intersect the castle (z −50…−25 overlaps the castle front at −45). With no soft-particle fade they leave straight intersection seams, a classic "unfinished CGI" tell.
9. **Ground reads as water.**
   - It is an infinite flat plane (`Ground.jsx:31–34`) seen at grazing angles from camera height 2.4 (`World.jsx:26`).
   - It is fogged to the horizon colour, has Fresnel environment reflections at grazing angles, and a 40×40 tiling normal map that shimmers.
   - There are no foreground objects and no silhouettes to break it up.
10. **Composition.**
    - The intro camera is at eye level (y 2.4), about 25 units from a model that is 31 units wide. Most of the diorama is buried below the ground (see 1.4) and the moon blob sits beside it.
    - The gates shot (`World.jsx:25`) is high, centred and symmetrical. There is no foreground frame.
11. **Heavy vignette** (`darkness 0.85`, `World.jsx:165`) on top of untonemapped output crushes the edges while the middle stays washed out.
12. **Antialiasing.** `gl={{ antialias: true }}` is wasted under the composer, which already uses `multisampling = 4` by default.
13. **Performance headroom (not a look bug).** Every Tripo GLB is about 400–550k triangles. Nine gates add about 4.3M triangles. Adding shadow maps renders these again, so keep the shadow frusta tight (see fix plan).

### 1.4 The intro diorama is buried (coordinator's item)

- `Castle.jsx:13–16`: `SCALE 32`, `TURN −π/2`, `CASTLE_POS = [−7.84, −0.34·32 + 1.5 = −9.38, −55]`.
- After the turn, world x = −native z and world z = native x. The diorama's world footprint is therefore about **31.4 wide (x) × 19.2 deep (z) × 17.3 tall**.
- At y −9.38 the ground plane (y ≈ 0, `Ground.jsx:31`) cuts it at native y 0.293. Only the top 1.5 units of the plateau and the castle stay above ground, and the whole rock base, path, gate posts and trees are hidden.
- The camera (`World.jsx:26`: pos `[1.5, 2.4, −30]`, fov 40) is 9–25 units from the front face, which is far too close to frame the whole thing.
- Fog near 18 already veils the front.
- The mist band at z −50…−25 sits between camera and model at sprite heights up to about 9.6, which makes the "sea of fog".

---

## 2. Findings by research topic

### 2.1 Colour management and tone mapping with an EffectComposer
- **Renderer tone mapping does not apply under the composer.** @react-three/postprocessing forces `NoToneMapping` (code above). The postprocessing README says to keep `NoToneMapping`, use high-precision (HalfFloat) buffers for HDR, and put a `ToneMappingEffect` at the end. Setting `outputColorSpace = SRGBColorSpace` is enough for the final encode. https://github.com/pmndrs/postprocessing · README: https://cdn.jsdelivr.net/npm/postprocessing@6.39.4/README.md
- **`<ToneMapping>` defaults to `ToneMappingMode.AGX`.** Other modes: `ACES_FILMIC`, `NEUTRAL`, `REINHARD`, `CINEON`, `LINEAR`. https://github.com/pmndrs/react-postprocessing/blob/master/docs/effects/tone-mapping.mdx · Three.js Journey (place ToneMapping last; AgX looks greyish out of the box): https://threejs-journey.com/lessons/post-processing-with-r3f
- **AgX vs ACES.**
  - AgX is less saturated and handles very bright highlights by desaturating toward white, where ACES skews hue (bright blues go cyan/purple, saturated reds go orange). Expect to add contrast after AgX.
  - ACES gives more contrast and saturation "for free".
  - Forum discussion: https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609
  - For a cold, desaturated PoA grade, **AgX + a contrast/LUT step** is the better base. ACES is acceptable if you want punch quickly.
- **Grading order.** Tone mapping is the last *linear* step. Artistic grading (LUT, contrast, grain, vignette) can go *after* it in LDR. https://discourse.threejs.org/t/tone-mapping-with-post-processing/7281
- **`toneMapped={false}`** only matters when the renderer does the tone mapping. Under the composer it has **no effect**. With a `<ToneMapping>` effect, everything is tone mapped, including the rune tori in `Gates.jsx:110`. To keep something punchy, give it HDR values (color × 3–10) so it lands near white after the curve.
- **Custom `ShaderMaterial`s.** These do not get `#include <tonemapping_fragment>` / `<colorspace_fragment>` unless you add them. Under the composer that is correct: write *linear HDR* into the float buffer and let the final pass tone map and encode. `THREE.Color('#hex')` uniforms are already converted to linear by ColorManagement. Values above 1 are fine *only* if a ToneMapping effect follows and no blend downstream assumes [0,1].
- **Exposure.** It is not obvious whether the ToneMapping effect reads `renderer.toneMappingExposure` **[unsure]**. Its GLSL references `toneMappingExposure` via three's `tonemapping_pars_fragment`. Safer to set exposure through light and emissive levels, or a `BrightnessContrast` step.

### 2.2 Night sky
- **Moon size.** The real moon is 0.52°. Film moons are often shot on long lenses so they read bigger, but 1.5–2.5° is the useful cinematic range at a 30–40° vertical fov. 5°+ reads as a sun.
- **Disc + halo.** Specify the halo as a multiple of the disc radius (1×–4×) with an exponential falloff, not `pow(dot, n)` with a hand-picked n. Halo-relative-to-moon convention (Sapphire Luna): https://borisfx.com/documentation/sapphire/ofx/luna
- **Texture vs procedural.** A textured moon (NASA LROC colour map on a small sphere, or a disc image) instantly removes the "CG blob" feel. It needs no lighting: an unlit material with HDR colour (×3–6 so it blooms slightly after tone mapping), `fog={false}`. Three.js forum on adding a moon to a sky shader: https://discourse.threejs.org/t/add-shadertorys-moon-to-sky/74368 · official sky shader starting point: https://threejs.org/examples/#webgl_shaders_sky
- **Stars.** Use one system, not two.
  - drei `<Stars>` places points on a sphere of `radius..radius+depth` around the origin. Keep the radius larger than any scenery (hills at 110–140), for example `radius={300} depth={60}`. Otherwise stars draw in front of terrain.
  - A star *texture* (NASA Deep Star Maps or Solar System Scope stars) on the dome gives realistic density and colour. Fade it near the horizon so the mist "eats" it.
- **drei `<Sky>`** is a daytime Preetham model and is not useful at night. **drei `<Clouds>/<Cloud>`** are particle clouds (texture sprites, `MeshLambertMaterial` by default, so moonlight lights them). They are good for slow moonlit cloud banks drifting across the moon. https://drei.docs.pmnd.rs/staging/cloud
- **@takram/three-atmosphere** (MIT): Bruneton precomputed scattering with `Sky`, `Stars` (Yale catalogue), moon direction and angular radius, and `AerialPerspective` as a post effect. It is physically correct, but it is built around ECEF geospatial coordinates and real sun/moon dates. **Overkill for a stylised deck; not recommended.** https://github.com/takram-design-engineering/three-geospatial/tree/main/packages/atmosphere
- **HDRI as visible background vs custom dome.**
  - Night HDRIs are usually low resolution in the sky (stars smear) and have fixed horizons that will not match the hills.
  - Keep the HDRI for **lighting only**, at low intensity, and keep a custom dome for the visible sky.
  - The current `kloppenheim_07_puresky` is an *overcast* night with "soft moonlight breaks" (https://polyhaven.com/a/kloppenheim_07_puresky). That is fine for diffuse fill. `qwantani_night_puresky` or `kloppenheim_02_puresky` are clear-sky alternatives.

### 2.3 Atmosphere
- **`Fog` vs `FogExp2`.**
  - Linear `Fog` gives a hard start (`near`) and a hard wall (`far`).
  - `FogExp2` (`1 − exp(−(density·d)²)`, from three's `fog_fragment`) has a soft onset and reads more like real air.
  - Match the fog colour to the sky at the horizon so geometry melts into the sky. https://threejs.org/manual/en/fog.html · https://discourse.threejs.org/t/matching-fog-color-with-the-sky-shader/52018
- **Height fog** (dense in hollows, thin above) is the PoA signature. It is not built in. Patch `fog_fragment` per material via `onBeforeCompile`, scaling the fog factor by `exp(−max(worldY − h0, 0)·falloff)`.
  - Only patch materials that need it; global chunk patching has side effects.
  - Ground-fog thread with CodePen: https://discourse.threejs.org/t/high-performance-ground-fog-for-games-three-js/88522 · https://codepen.io/the-red-reddington/full/wBGQQwO
  - Chunk-patch pitfalls: https://discourse.threejs.org/t/shader-error-fog-height/38665
- **God rays / light shafts.**
  - `<GodRays sun={meshRef}>` from @react-three/postprocessing. The sun mesh must be `transparent` with `depthWrite={false}`, and you need `<EffectComposer autoClear={false}>` for occlusion.
  - Defaults: samples 60, density 0.96, decay 0.9, weight 0.4, exposure 0.6, clampMax 1, blur on.
  - Moon *behind* towers is the ideal case.
  - https://github.com/pmndrs/react-postprocessing/blob/master/docs/effects/god-rays.mdx · three.js reference demo: https://threejs.org/examples/#webgl_postprocessing_godrays · shader-based volumetric rays (Codrops): https://tympanus.net/codrops/2022/06/27/volumetric-light-rays-with-three-js
- **Mist.** Use soft particles (fade alpha by depth difference to the scene), or drei `<Clouds>` with low opacity, so sprites never show intersection lines. Keep mist sprites *above* the ground, not half buried.

### 2.4 Postprocessing practice
- **Order** (one merged EffectPass, effects applied in child order):
  1. AO (N8AO, its own pass)
  2. Bloom (HDR, before tone mapping)
  3. GodRays (HDR)
  4. **ToneMapping**
  5. LUT / HueSaturation / BrightnessContrast (LDR grade)
  6. Vignette
  7. Noise
  8. SMAA (if multisampling is off)
- **Noise.** Use the default `BlendFunction.SCREEN`, or `OVERLAY`, with `premultiply={false}`, `opacity` around 0.04–0.08, and *after* ToneMapping so inputs are in [0,1]. SOFT_LIGHT on HDR produces negative numbers (see 1.1C).
- **Selective bloom without `SelectiveBloom`.** Keep everything that should not glow below 1.0 linear and push emitters (windows, moon, wand tips) to 2–10. Set `luminanceThreshold` to about 1.0 and `mipmapBlur` on. That is cheaper and more robust than selection layers.
- **SMAA vs MSAA.** The composer's default `multisampling={4}` is fine. N8AO says hardware MSAA does not work with AO, so if you add it, set `multisampling={0}` and add `<SMAA />`. https://github.com/N8python/n8ao
- **N8AO** (CC0) is `N8AOPostPass` in pmndrs. The R3F `<N8AO>` defaults are `aoRadius 5`, `distanceFalloff 1`, `intensity 1`, `halfRes` optional.
  - Set `aoRadius` 1–2 orders of magnitude below scene scale. Here that means **0.5–1.0** for the gates scene (gates are about 3.4 tall).
  - `intensity` around 2 is subtle and around 5 is strong. `halfRes` is 2–4× faster.
  - Interaction with fog: AO is applied after fog, so it can darken fogged distance **[unsure]**. Keep `distanceFalloff` at 1.
- **DepthOfField.** Optional, for the gates close-ups (focus on Ron or Snape, light background blur). Skip in the wide intro: a diorama with DOF reads as a miniature.
- **LUT grading.**
  - `postprocessing` exports `LUTCubeLoader` and `LookupTexture` (verified in `build/index.js`). R3F wraps it as `<LUT lut={texture} tetrahedralInterpolation />`.
  - Load with `useLoader(LUTCubeLoader, '/lut/azkaban.cube')`.
  - https://github.com/pmndrs/react-postprocessing/blob/master/docs/effects/lut.mdx · demo https://pmndrs.github.io/examples/lut
  - Best practice: author your own LUT. Screenshot the tone-mapped scene with an identity LUT, grade it in DaVinci Resolve (free) or Photoshop, export a 33³ `.cube`. That avoids licence ambiguity entirely.

### 2.5 Making Tripo/Meshy GLBs look good
- **Tripo maps** are standard glTF: baseColor + ORM (R = AO, G = roughness, B = metal) + normal. three.js multiplies scalars by the map channels (verified in source), so **to override gloss, null the map**: `roughnessMap = null; metalnessMap = null`.
- **Baked lighting in albedo.** Tripo's own guidance says albedo should be unlit and roughness often needs pulling into mid-range. https://www.tripo3d.ai/game-development/remove-baked-lighting-shadows-image-to-3d-ai-game-assets · https://www.tripo3d.ai/blog/explore/ai-3d-model-generator-and-pbr-workflow-metalness-roughness-rules
- **Two workable strategies:**
  - **Lean into the bake.** Treat the albedo as already lit: use it partly as `emissiveMap` (intensity 0.3–0.6), keep real lighting weak and use it only for rim and silhouette. Good for the castle, whose texture is already a night bake. The "MeshBakedMaterial" idea of combining baked colour with real speculars: https://npmjs.com/package/mesh-baked-material
  - **Neutralise the bake.** Brighten and desaturate the albedo, give it a matte surface, and light it properly. Better for characters that need to sit in the torch and moon lighting.
- **Silhouette and rim** are what read at night. A strong cool back-light (the moon) plus fog behind the subject gives a clean outline. A cheap Fresnel rim in `onBeforeCompile` (`pow(1 − dot(N, V), 3) · rimColor`) sells it even where the light misses **[tuning]**.
- **Hide low quality.** Keep AI models mid-ground and in partial silhouette, cut by fog. Light them with low-key light: one key, one rim, little fill. Avoid hero close-ups of faces. Add small high-quality "truth" details nearby (real PBR cobblestones, a flickering torch flame, particles) so the eye trusts the frame.

### 2.6 Lighting a moonlit scene
- **Moonlight.**
  - One `directionalLight`, cool `#9fb4ff`, intensity 1.5–3, from 3/4 back-side (camera looks −z, so the moon is at −z and to one side, which matches the current `MOON_DIR`).
  - `castShadow`, `shadow-mapSize` 2048, with a tight orthographic shadow camera around the action area only.
  - `shadow-bias` around −0.0005 and `shadow-normalBias` around 0.02 to avoid acne.
  - Three.js Journey "Realistic render" covers these knobs (tone mapping, env intensity, shadow acne): https://threejs-journey.com/lessons/realistic-render
- **Fill.** Replace `ambientLight` with a `hemisphereLight` (sky `#2a3550`, ground `#07080c`, intensity 0.3–0.5). That gives top-lit form instead of flat grey. Keep `environmentIntensity` around 0.2–0.4.
- **Practicals.**
  - Warm torches (`#ff9a4a`, already in `Gates.jsx:112`) against the cold moon is *the* PoA palette: teal/blue environment, rare warm pools.
  - Give practicals a visible source (flame sprite or emissive bulb with HDR colour) so the light is motivated.
  - `decay={2}` (physically correct) with `distance` 0 or large, and a raised intensity.
- **Remove non-diegetic lights** in the dark scenes: the `Rig` spotlight, and the castle point light at intensity 90.

### 2.7 Composition and camera
- **Lens.**
  - Vertical fov 25–32° (about 40–50 mm equivalent) compresses depth, flattens perspective distortion on models and enlarges distant objects like the moon. That is the "film" look.
  - 40° vertical (about 32 mm) reads as "game camera".
- **Layering.** Every frame wants:
  - Foreground: dark silhouette (rock, dead tree, gate edge), ideally slightly out of focus.
  - Mid-ground: the subject, lit, rimmed.
  - Background: fogged hills and sky with the moon.
  - Depth cues: fog gradient, scale, overlap, darker and cooler with distance.
- **Framing.** Rule of thirds. Put the castle off-centre with the moon in the opposite upper third. A low camera (just above the plateau base) looking slightly up makes the castle loom. Use a diagonal leading line (the path) in the gates scene instead of a centred corridor.
- **Movement.** The existing slow crane sway is good. Make it slower and longer-travel (dolly in 5–10%) rather than wobbling.

### 2.8 Reference projects
1. **Castle on a Hill** (luketurnbull/threejs-castle, demo https://castle.lukes.studio, repo https://github.com/luketurnbull/threejs-castle). React + three. Emissive, flame-lit castle windows, a sky system with drifting clouds and stars, a day/night blend. What works: the windows are the only warm light, and moving clouds give life. Licence: "educational and portfolio" only; read it, don't copy it.
2. **Kage** (MengTo, demo https://mengto.github.io/kage/, readme https://raw.githubusercontent.com/MengTo/kage/main/README.md). Night temple: fog, lantern light, rain, a big moon, a *restrained* bloom pipeline, and foreground cut-outs layered over the 3D. What works: a tight palette, strong foreground silhouettes, bloom used sparingly. No reuse licence.
3. **Three.js Journey "Haunted House"** (https://threejs-journey.com/lessons/haunted-house). Canonical small moonlit scene: cool moon directional light + bluish ambient + one warm door light + dark blue fog matched to background + shadows. What works: one warm practical against cold everything, and fog colour equal to background.
4. **three.js `webgl_postprocessing_godrays`** (https://threejs.org/examples/#webgl_postprocessing_godrays) and the **Codrops volumetric light rays** session (https://tympanus.net/codrops/2022/06/27/volumetric-light-rays-with-three-js). What works: a bright source behind dark silhouettes gives shafts, which is exactly the moon-behind-towers composition.

---

## 3. Fix plan (most impact per effort first)

### P0: fix the bugs (minutes)

1. **Add tone mapping; fix the noise.** `World.jsx:163–168`
   ```jsx
   import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing'
   import { BlendFunction, ToneMappingMode } from 'postprocessing'
   <EffectComposer>            {/* multisampling stays 4 */}
     <Bloom mipmapBlur intensity={0.6} luminanceThreshold={1.0} luminanceSmoothing={0.15} />
     <ToneMapping mode={ToneMappingMode.AGX} />          {/* or ACES_FILMIC for more punch */}
     {/* grade goes here (P2) */}
     <Vignette eskil={false} offset={0.3} darkness={0.55} />
     <Noise premultiply={false} blendFunction={BlendFunction.OVERLAY} opacity={0.06} />
   </EffectComposer>
   ```
   - Also drop `antialias: true` from `gl` (the composer's MSAA does the work).
   - **Re-check the hall scenes too.** Turning tone mapping on changes every scene. Expect to raise some light intensities by 1.3–2× after AgX **[tune by eye]**.

2. **Moon: correct size and brightness.** `Sky.jsx:25–29`. Replace with an angle-based disc and halo (about 1.8° diameter):
   ```glsl
   float m = dot(d, normalize(uMoonDir));
   float ang = sqrt(max(2.0 * (1.0 - m), 0.0));          // radians, accurate for small angles
   const float R = 0.0157;                               // 0.9° radius → 1.8° disc  [tune 0.012–0.022]
   float disc = 1.0 - smoothstep(R * 0.92, R, ang);
   col += vec3(0.92, 0.95, 1.0) * disc * 6.0;            // HDR: tone maps to white, blooms a little
   col += vec3(0.35, 0.42, 0.62) * exp(-ang / (R * 2.5)) * 0.6;  // tight halo
   col += vec3(0.10, 0.13, 0.22) * exp(-ang / 0.25) * 0.5;       // broad sky glow
   ```
   - Move `MOON_DIR` so it lands in the upper-left third of the *new* intro frame (see P1-6), clear of the towers or just grazing one tower (for god rays later). For example `[-0.42, 0.32, -0.85]` **[tune]**.
   - Keep the directional moon light's position matched to it.
   - Optional upgrade (P2): replace the procedural disc with a textured sphere (NASA LROC 1k), `meshBasicMaterial` with `color` scalar about 4 (HDR), `fog={false}`, placed at radius 350 along `MOON_DIR` with `scale = 350·tan(0.9°) ≈ 5.5`.

3. **Castle: kill the plastic.** `Castle.jsx:26–46`
   ```js
   m.roughnessMap = null; m.metalnessMap = null      // the ORM map makes roughness 0.95 × 0.12 = 0.11
   m.roughness = 0.9; m.metalness = 0
   m.color = new Color('#ffffff')                     // don't multiply the baked night texture to black
   m.envMapIntensity = 0.4
   m.emissiveMap = m.map                              // the bake already holds the night lighting
   m.emissive = new Color('#ffffff'); m.emissiveIntensity = 1
   // in onBeforeCompile: totalEmissiveRadiance = texel.rgb * 0.35 + texel.rgb * warm * 6.0;
   //   → whole castle faintly visible from its own bake, windows HDR (>1) so they bloom
   ```
   - The 0.35 (bake strength) and 6.0 (window boost) are **[tune]**.
   - Delete the castle `pointLight` (`Castle.jsx:59`).
   - Disable the `Rig` spotlight in dark scenes (`World.jsx:56`: target intensity `cold ? 0 : 38`). It sits inside the castle in the intro.

4. **Mist: no hard seams.** `Castle.jsx:111–113`. Raise the puffs so their bottom edge never meets geometry: `y = s * 0.5 + 0.2`. Use fewer, larger, fainter puffs, or switch to drei `<Clouds>` (see P1). Move the band to *around the castle base* (z −72…−38, see P1-6), not between the camera and the castle.

5. **Stars behind the hills.** `World.jsx:129`: `<Stars radius={300} depth={60} count={1500} factor={4} saturation={0} fade speed={0.2} />`. Or remove drei Stars in the dark scenes and keep only the sky-dome stars. Choose one system.

### P1: the cinematic look (an hour or two)

6. **Stage the whole intro diorama.** `Castle.jsx:13–16`, `World.jsx:26`, `Castle.jsx:79–80`
   - **Placement:** `CASTLE_POS = [0, -0.6, -55]`.
     - Base at ground level, sunk about 0.6 so the bottom lip of the rock hides the seam.
     - x 0 centres the *diorama*, not just the castle. Keep `TURN = −π/2` if that shows the path side.
     - If the castle tower cluster should sit on a third, offset x by about ±6.
   - **Scale:** keep `SCALE 32` (31 w × 17 h × 19 d). Alternatively use `SCALE 22` (about 21 × 12 × 13) to keep everything closer and cheaper to fog **[pick one]**.
   - **Camera (SCALE 32):** set the intro shot's `fov` to about **30** (the camera needs a per-shot fov lerp, or a fixed fov of 32 for all shots).
     - `pos: [0, 5.5, -2]`, `look: [0, 7.5, -55]`. That is about 53 units from the diorama centre.
     - At vfov 30 the frame is 28 units tall × 50 wide at the subject. The diorama fills about 60% of the height, which leaves sky above for the moon.
     - Keep the sway but scale it: `x ±2.5, y ±0.4, z ±1.5`.
     - For `SCALE 22`: `pos [0, 4, -20]`, `look [0, 5, -55]`.
   - **Fog:** switch the dark scenes to `FogExp2`. In `World.jsx:123` use `<fogExp2 attach="fog" args={[t.night, 0.03]} />` and have `Mood` damp `scene.fog.density` instead of near/far:
     - **intro: 0.007**. Gives about 10% at the castle (53 u), about 45% at the hills (110 u), about 60% at 140 u. The castle reads crisp, the land recedes.
     - **gates: 0.028**. Gives about 13% at the first gate (13 u) and about 60% at the Hat (35 u). That is the PoA corridor fading into fog.
     - **hall scenes:** about 0.045 to mimic the old 12/30 linear fog **[tune]**.
   - **Fog exemption for the hero:** not needed at 0.007. If any veil remains, scale its fog rather than disabling it (in the castle's `onBeforeCompile`, after `#include <fog_fragment>` is applied, or by patching `fogFactor *= 0.5`). With `fog=false` the castle would pop against the fogged ground at its own base.
   - **Ground blending into the rock base:**
     - The sink from step 6 hides the seam.
     - Add a dark radial "contact" under the diorama: drei `<ContactShadows position={[0, 0.01, -55]} scale={45} blur={3} opacity={0.6} far={20} frames={1} />` (static, render once). Or use a radial-gradient transparent plane.
     - Tint the terrain toward the diorama's baked rock (`Ground.jsx:33`: `color="#3a4356"` instead of `#6a7080`) so the plane is never brighter than the model.
     - Ideally replace the flat plane with a gently displaced terrain: noise mounds that rise to about 1–2 units in a skirt around the base, and a few hills mid-distance. That breaks the "table-top on a sea" read.
     - Ring the base with low mist or `<Clouds>` (y 0.5–3, opacity 0.15–0.3) to hide whatever seam remains.
   - **Mist positions:** z −72…−38, x −24…24, kept above ground (see P0-4).

7. **Lighting rig for the dark scenes.** `World.jsx:124–125`, `Castle.jsx:86`
   - `ambientLight` becomes `<hemisphereLight args={['#2a3550', '#07080c', 0.4]} />` in the dark scenes.
   - Moon light: `intensity 2.5`, `castShadow`, `shadow-mapSize={[2048, 2048]}`, `shadow-bias={-0.0005}`, `shadow-normalBias={0.02}`. Fit the shadow camera to the action: gates area left/right ±10, top/bottom ±14, centred on the path. Its `target` should be at the path centre, not the origin.
   - Add `<Canvas shadows>` and `castShadow`/`receiveShadow` on gates, characters and the path. **Performance:** 9 × 476k-triangle gates in the shadow pass. If too slow, use `shadows="soft"` with a lower map size, or bake gate shadows once (`<AccumulativeShadows frames={60}>` or `ContactShadows frames={1}`) and let only the characters cast live shadows **[measure]**.
   - Torches: `decay={2}`, intensity about 6–10, distance 0 or 8, plus a small flame sprite (additive, HDR colour) so the light is motivated.
   - `Environment` `environmentIntensity` 0.25. Consider `files="/env/qwantani_night_puresky_2k.hdr"` (clear night, see Assets) or keep the overcast Kloppenheim.

8. **Hills as silhouettes.** `Sky.jsx:70–71`: `<meshBasicMaterial color="#0a0d16" fog={false} />`. Or apply a partial fog so the nearer ridge is darker than the far ridge. Better still, add a second ring at R 160 in a lighter colour (`#141a2a`) for two layers of depth.

9. **Gates framing.** `World.jsx:25`
   - `gates: { pos: [-2.6, 2.6, 9.5], look: [0.6, 1.4, -14] }` with vfov about 32 **[tune]**. Lower, off-axis, the path running diagonally, the gates overlapping into fog.
   - Add one foreground silhouette, a dark rock or dead tree at about `[-4, 0, 5]` in the left third.

10. **Castle rim light** (optional, cheap). In the castle `onBeforeCompile`, add `totalEmissiveRadiance += moonCol * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0) * 0.6;`. The normal is in view space at that point **[check variable names for r186]**. This outlines the towers against the sky.

### P2: polish (half a day)

11. **Grade.** After `<ToneMapping>`:
    - `<HueSaturation saturation={-0.25} />`, `<BrightnessContrast contrast={0.12} brightness={-0.03} />`.
    - Then a custom `<LUT lut={azkabanLut} />`: author it as described in 2.4. Target cold teal shadows, neutral mid-grey, slightly warm highlights, crushed blacks lifted to about 3% (milky blacks).
12. **God rays from the moon.** Make the moon a small transparent mesh (`depthWrite={false}`), set `<EffectComposer autoClear={false}>`, and put `<GodRays sun={moonRef} samples={40} density={0.94} decay={0.92} weight={0.3} exposure={0.4} blur />` before ToneMapping. Put the moon just behind a tower edge in the intro framing.
13. **Clouds across the moon.** drei `<Clouds material={MeshLambertMaterial}><Cloud segments={30} bounds={[60, 4, 10]} volume={20} color="#3a4560" opacity={0.35} speed={0.05} position={[-60, 45, -260]} fade={200} /></Clouds>` **[tune positions/sizes]**.
14. **N8AO** for the gates scene: `<N8AO halfRes aoRadius={0.8} intensity={2.5} distanceFalloff={1} />` as the first child. Set `multisampling={0}` and add `<SMAA />` last. It grounds gates and characters on the cobbles.
15. **Height fog** via an `onBeforeCompile` patch on the ground, gates and castle materials (see 2.3). Dense below about y 1.5 and gone by y 5: mist pooled on the grounds, towers clear.
16. **Sky dome stars → texture.** Use a NASA Deep Star Map 4k or the Solar System Scope stars texture in the dome shader, multiplied by `smoothstep(0.05, 0.35, h)`. That removes the blocky hashed stars.
17. **Moon texture sphere** (see P0-2 optional).
18. **Foreground depth of field** in gates close-ups only: `<DepthOfField focusDistance={…} focalLength={0.02} bokehScale={2} />` **[tune; check perf]**.

### P3: assets and geometry (if time allows)
- **Decimate the Tripo models** with gltf-transform `simplify` to about 100k triangles each, mainly for the shadow pass.
- Replace the flat terrain with a sculpted heightmap. Add a few CC0 dead trees and rocks as foreground silhouettes.

---

## 4. Assets (free)

| Asset | URL | Licence |
|---|---|---|
| Qwantani Night (Pure Sky) HDRI, clear night (env lighting) | https://polyhaven.com/a/qwantani_night_puresky | CC0 |
| Kloppenheim 02 (Pure Sky), clear night | https://polyhaven.com/a/kloppenheim_02_puresky | CC0 |
| Rogland Moonlit Night / Moonlit Golf (moonlit with terrain) | https://polyhaven.com/a/rogland_moonlit_night · https://polyhaven.com/a/moonlit_golf | CC0 |
| Kloppenheim 07 (Pure Sky), *current*, overcast night | https://polyhaven.com/a/kloppenheim_07_puresky | CC0 |
| NASA CGI Moon Kit: `lroc_color_poles_1k.jpg` (1024×512) or `lroc_color_2k.jpg` | https://svs.gsfc.nasa.gov/4720 | NASA SVS; credit "NASA's Scientific Visualization Studio" (NASA media generally not copyrighted; follow the linked reproduction guidelines) |
| NASA Deep Star Maps 2020: 4K EXR (4096×2048) | https://svs.gsfc.nasa.gov/4851 | Credit NASA/Goddard SVS (+ ESA/Gaia/DPAC for the Gaia data) |
| Solar System Scope: Moon 2k, Stars 2k / Stars + Milky Way 2k | https://www.solarsystemscope.com/textures/ | CC BY 4.0 (attribution required) |
| drei Cloud texture (default hosted) | via `<Clouds>`; https://drei.docs.pmnd.rs/staging/cloud | MIT (pmndrs assets) **[unsure of exact licence for the texture]** |
| CC0 PBR textures (rock cliff, castle stone, mud) for terrain and base blend | https://ambientcg.com · https://polyhaven.com/textures | CC0 |
| CC0 dead trees, rocks (foreground silhouettes) | https://polyhaven.com/models · https://quaternius.com (nature packs) · https://kenney.nl/assets | CC0 |
| LUTs: author your own `.cube` in DaVinci Resolve (free) | https://www.blackmagicdesign.com/products/davinciresolve | yours |
| LUTs: Q-DDL "800+ free LUTs" (incl. "Color Moods") | https://cgpress.org/archives/800-free-luts.html | CC BY 4.0 |
| LUTs: FreeVisuals teal/orange pack (incl. "night" variant) | https://www.freevisuals.net/luts/free-12-teal-orange-luts-pack | Free commercial use per page **[verify terms]** |

Add new credits to `public/env/CREDITS.txt`.

---

## 5. Further sources
- postprocessing README / repo: https://github.com/pmndrs/postprocessing
- react-postprocessing docs (effects): https://github.com/pmndrs/react-postprocessing/tree/master/docs/effects
- Tone mapping guidance thread: https://discourse.threejs.org/t/pmndrs-post-processing-tone-mapping-guidance/59374
- three.js fog manual: https://threejs.org/manual/en/fog.html
- N8AO: https://github.com/N8python/n8ao
- takram three-geospatial atmosphere: https://github.com/takram-design-engineering/three-geospatial
