# Release Notes

### 1.3
- **`Timestep` Optimization of the `Engine` component.** Removal of all unused features, greatly boosts performance of JS optimizer compiler at startup time.
- **`Timestep` Whole code base linted.** Beware of broken features as not every component was tested!

### 1.2
- **`Timestep` New behavior of the ScrollView component.** It behaves more native-like
- **`Timestep` Optimization of bitmap font component.** Characters are not views but simply images with position.
- **`Timestep` Optimization of the particle engine component.** Particles are not views anymore but a custom type, aside from this, there should be no API change. Also, it can now be used as a substituted to the `IsoParticleEngine` that existed within the internal game librarys (`src/lib`).
- **`Timestep` Optimization of the ticking system.** Invisible views do not tick anymore
- **`Timestep` Optimization of the event emission system (known as `PubSub` or `Emitter`).**
- **`Timestep` Optimization of the `bind` method.** “bound” methods are now faster to execute and the call tree is smaller

### 1.1
- **`MovieClip-Viewer` Added MovieClip Viewer/Converter electron tool.** It uses open source JEFF component to parse and convert swf animations, uses timestep to view them.
- **`Timestep` Modified timestep MovieClip component to support JEFF's export format.** Exported metadata slightly heavier, exported images have smaller margins making spriting more efficient, running animations provide better performance.

### 1.0
- **Initial release**