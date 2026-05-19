# Reflections on a One-Week Electronics Design Competition

> Problem D, 28th Electronics Design Contest of Southeast University: A Beverage Cup Measuring Device Based on Monocular Vision  
> May 2026

---

## 1. From Zero to One: How Much Can Be Done in Seven Days

Seven days — transforming a seemingly simple problem ("measure the height of a beverage in a cup using a single camera") from a paper proposal into a reliably functioning embedded vision system. This was, without a doubt, the most technically dense period of my undergraduate journey.

Looking back, we started with nothing more than a MaixCAM PRO development board, a GC4653 camera sensor, an STM32 minimal system board, and a pile of Dupont wires. We ended up delivering a complete device integrating **dual-model YOLOv5 object detection + liquid surface recognition + reference color extraction + UART cross-chip communication + real-time OLED display**. Glancing at the project file structure, the `launch/` directory evolved from `v1.0.1` all the way to `v1.3.6` — every version number marking a late-night debugging breakthrough.

## 2. The Breadth of the Tech Stack: Vision, Embedded, Communication — None Optional

The difficulty of this problem lay not in drilling deep into any single domain, but in **multi-disciplinary system integration**:

| Layer | Technology | Pitfalls Encountered |
|-------|------------|----------------------|
| **Perception** | GC4653 2560×1440 image capture | High-res VI pool allocation failure — Camera must be initialized before YOLO |
| **Algorithm** | Dual-model YOLOv5 inference, liquid surface gradient detection, EMA smoothing & locking | Model A/B confidence fusion weights tuned across 20+ parameter sets |
| **Communication** | MaixCAM UART → STM32 serial reception | Frame synchronization for CSV parsing at 115200 baud |
| **Actuation** | STM32 ADC sampling (INA240A1 current) + SSD1315 OLED display | Current sampling noise filtering |

The deepest lesson: **system integration is far harder than any individual algorithm**. Getting YOLOv5 running took only half a day. Getting the detection results to flow reliably over UART to the STM32 and render correctly on a 0.96-inch OLED took two full days. Any subtle deviation in one link is magnified in an end-to-end system.

## 3. The Algorithmic Heart: Liquid Surface Detection Was the Real Challenge

Object detection (finding cups/bottles with YOLO) was actually the easiest part — the model was pre-trained, just tune the parameters. The real challenge was **pinpointing the exact liquid surface inside the cup**.

This went through multiple rounds of trial and error:
1. **Canny edge detection approach** (`core/edge_detect.py`) — completely unreliable under varying lighting; abandoned.
2. **Single blob detection** — cup patterns and shadows produced overwhelming false positives.
3. **Final approach**: within the lower-half ROI of the object bounding box, score every row across four dimensions — gradient strength + color similarity + above/below contrast + gradient direction bonus — apply weighted scoring, then lock the result after 8 stable frames.

This algorithm consumed nearly 60% of total development time from conception to stable operation. The takeaway: **a seemingly intuitive problem (the human eye instantly tells where the water surface is) often demands a mountain of engineering tricks when implemented in computer vision**.

## 4. Lessons from Dual-Model Fusion

Running two YOLOv5 models in parallel —
- Model A (custom 2-class): high precision, limited generalization
- Model B (COCO-pretrained 80-class): good generalization, lower confidence

Their fusion was never a simple weighted average. We designed a **candidate scoring system** (confidence weight 5.0 + center proximity 2.0 + previous-frame proximity 4.0 + liquid-level proximity 3.0), essentially encoding temporal information and task priors into the fusion logic. This drove home a crucial insight: **on resource-constrained edge devices, algorithmic competition is not about model size — it's about how efficiently you inject domain knowledge into the inference pipeline**.

## 5. Hardware War Stories

A few unforgettable hardware-level issues:

1. **Camera initialization order**: loading the YOLO model before initializing the Camera caused the 2560×1440 VI pool (~16.6 MB) allocation to fail with `_create_vb_pool failed, id -2`. The NPU's shared memory was already consumed by model weights. The fix was trivial — swap two lines of code — but isolating this bug took an entire afternoon.

2. **Display resolution mismatch**: `img.resize(disp.width(), disp.height())` must be called before `disp.show()`, otherwise the JPEG encoder's VB pool overflows with `convert format failed`. A classic embedded Linux memory management gotcha.

3. **Lens selection**: the 2.8–12mm variant of the JY-SDM12 proved far more suitable than the 6.0–22mm for desktop scenarios at a 20–50 cm working distance. Hardware selection cannot rely solely on spec sheets — it must be tested against actual workspace conditions.

The common thread: **error messages are separated from their root causes by multiple layers of abstraction**. On PC, we take transparent error stacks for granted. On embedded platforms, every step is running bare-metal.

## 6. The New Paradigm of AI-Assisted Development

This project used AI coding assistants (DeepSeek V4 Pro / GPT-5.2-Codex) throughout, consuming an estimated 400–500 million cumulative tokens. That's not a cold, impersonal number — it represents a fundamentally new way of developing:

- **Rapid prototyping**: from idea to runnable code, AI dramatically shortened "typing time."
- **Cross-domain knowledge bridging**: when a vision algorithm engineer needed to write an STM32 ADC driver, AI served as an instant translator.
- **Debugging acceleration**: throw error logs at the AI, and it often pinpoints the root cause quickly (e.g., the VI pool allocation issue above).

But clear-eyed honesty is required: **AI cannot replace systems design judgment**. When to use dual models, how to design the four-dimensional liquid surface scoring system, what IoU locking threshold to choose — these decisions still depend on deep understanding of the problem. AI is an amplifier, not a replacement.

## 7. Collaboration & Project Management

Although I competed solo, the engineering rigor of this README — system architecture diagrams, communication protocol documentation, parameter tables, file structure explanations — was itself a discipline of "collaborating with myself." Over seven days, without clear documentation and version management, merely locating the latest version among a dozen `.py` files would have wasted enormous time.

The version numbering under `launch/` (v1.0.1 → v1.3.6) seems trivial, but it was a lifeline: duplicate the old version before every major change, and roll back instantly if things went wrong.

## 8. Summary & Outlook

| Dimension | Takeaways |
|-----------|-----------|
| **Technical** | Mastered the end-to-end embedded vision pipeline: capture → inference → post-processing → communication → display |
| **Engineering** | Deeply understood how edge-device resource constraints (memory, compute, bandwidth) inversely shape algorithm design |
| **Methodology** | Established an efficient rhythm of "rapid iteration + version control + AI assistance" |
| **Mindset** | Shifted from "pursuing the perfect solution" to "get it running first, optimize later" — the only viable strategy under competition time pressure |

If there's a next edition, I would improve in three areas:
1. **Front-load hardware bring-up**: camera, display, and UART driver debugging should be completed on Day 0, not interleaved with algorithm development.
2. **Build an automated test pipeline**: collect a batch of labeled test images and run regression tests after every algorithm change, rather than squinting at the screen and thinking "it looks a bit more accurate."
3. **Introduce Kalman filtering earlier**: EMA smoothing works acceptably, but for fast-moving cups, a Kalman filter's predictive capability would be superior.

---

Seven days of competition compressed a semester's worth of technical density into a single week. From Day 1's "the camera just won't turn on" to the final night's "liquid level height displayed steadily on the OLED," every error message, every false detection, every UART frame drop forced rapid learning, rapid decision-making, and rapid validation. That, perhaps, is the magic of the electronics design contest — making the impossible possible, within the tightest of deadlines.

*— May 2026, Southeast University*
