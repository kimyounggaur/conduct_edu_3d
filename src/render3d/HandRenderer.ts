/**
 * 입체 손 레이어 (DESIGN.md 7.6의 일부를 먼저 구현)
 *
 * 2D 궤적 캔버스 위에 투명한 WebGL 캔버스를 겹쳐 손·지휘봉만 입체로 그린다.
 * - 정사영 카메라를 2D 변환(transform.ts)과 똑같이 맞춰서, 지휘봉 끝이 2D 궤적 점에 정확히 놓인다.
 * - 지휘자 시점 = 지휘자 뒤에서 본 모습, 청중 시점 = 앞에서 본 모습(카메라를 반 바퀴 돌림).
 * - 왼손잡이 = 오른손 모델을 거울로 뒤집음.
 * 좌표: 정규화 좌표 (x 오른쪽, y 위, z 앞) → three.js (x, y, -z). three.js는 앞쪽이 -z다.
 */
import {
  AmbientLight,
  Color,
  CircleGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
} from "three";
import type { Vec3 } from "@/engine/types";
import { palette } from "@/lib/palette";
import { makeTransform, type ViewMode } from "@/render/transform";
import { batonMatrix, corkGeometry, handGeometryAsync, shaftGeometry } from "./handGeometry";
import { buildRig, type HandRig, type PoseName } from "./handPose";
import { cross, norm, sub, type V3 } from "./sdf";

export interface Hand3DOptions {
  view: ViewMode;
  leftHanded: boolean;
  baton: boolean;
}

/** 2D와 같은 기준점 (DESIGN.md 부록 A): 손 = 끝 + 이 값 */
export const HAND_OFFSET: V3 = [0.22, -0.16, 0];
export const FINGER_HAND_OFFSET: V3 = [0.07, -0.085, 0];
/** 손이 지휘봉 끝보다 몸 쪽(뒤)에 있는 정도. 막대가 앞으로 뻗어 보인다 */
const HAND_BACK = 0.1;
const FINGER_BACK = 0.05;
/** 손 크기: 정규화 단위 / cm. 실제 비율보다 조금 크게 해서 작은 화면에서도 쥔 모양이 보이게 한다 */
export const HAND_SCALE = 0.0092;
/** 1 단위가 이 픽셀 수보다 작으면(작은 화면) 손을 조금 키운다 */
const SMALL_SCREEN_PPU = 380;

/** 손바닥이 향하는 쪽 (three.js 좌표): 아래 + 조금 앞. 지휘자 뒤에서 손등과 엄지가 보인다 */
const PALM_GRIP: V3 = norm([0.15, -1, -0.55]);
const PALM_POINT: V3 = norm([0.25, -1, -0.45]);

const toThree = (p: Vec3 | V3): V3 => [p[0], p[1], -(p[2] ?? 0)];

/** 손 좌표의 (a, b) 두 방향을 세계의 (A, B) 두 방향에 맞추는 회전. b·B는 a·A에 수직이 되도록 다듬는다 */
export function alignFrames(a: V3, b: V3, A: V3, B: V3): Quaternion {
  const basis = (p: V3, q: V3) => {
    const e1 = norm(p);
    const e2 = norm(sub(q, [e1[0] * dotv(q, e1), e1[1] * dotv(q, e1), e1[2] * dotv(q, e1)]));
    const e3 = cross(e1, e2);
    return new Matrix4().makeBasis(new Vector3(...e1), new Vector3(...e2), new Vector3(...e3));
  };
  const local = basis(a, b);
  const world = basis(A, B);
  const m = world.multiply(local.transpose());
  return new Quaternion().setFromRotationMatrix(m);
}
const dotv = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * 자세별 손 놓기 (그리지 않고 위치만 계산 — 테스트에서도 쓴다).
 * 반환: 손 그룹의 위치·회전·크기와, 지휘봉 길이(cm)
 */
export function placeHand(
  rig: HandRig,
  tip: Vec3,
  k = HAND_SCALE,
): { position: V3; quaternion: Quaternion; scale: number; shaftCm: number } {
  const T = toThree(tip);
  if (rig.pose === "grip") {
    const H: V3 = [T[0] + HAND_OFFSET[0], T[1] + HAND_OFFSET[1], T[2] + HAND_BACK];
    const D = sub(T, H);
    const L = Math.hypot(D[0], D[1], D[2]);
    const q = alignFrames(rig.batonAxis, [0, -1, 0], norm(D), PALM_GRIP);
    const c = new Vector3(...rig.corkCenter).multiplyScalar(k).applyQuaternion(q);
    return { position: [H[0] - c.x, H[1] - c.y, H[2] - c.z], quaternion: q, scale: k, shaftCm: L / k };
  }
  const H: V3 = [T[0] + FINGER_HAND_OFFSET[0], T[1] + FINGER_HAND_OFFSET[1], T[2] + FINGER_BACK];
  const D = norm(sub(T, H));
  const q = alignFrames(rig.indexDir, [0, -1, 0], D, PALM_POINT);
  const c = new Vector3(...rig.indexTip).multiplyScalar(k).applyQuaternion(q);
  return { position: [T[0] - c.x, T[1] - c.y, T[2] - c.z], quaternion: q, scale: k, shaftCm: 0 };
}

/**
 * 정사영 카메라를 2D 변환과 똑같이 맞춘다: 세계 점 (x, y)가 2D의 toScreen과 같은 픽셀에 찍힌다.
 * 지휘자 시점은 뒤(+z)에서, 청중 시점은 앞(-z)에서 본다. 반환값은 1 단위당 픽셀 수.
 */
export function configureCamera(cam: OrthographicCamera, view: ViewMode, cssW: number, cssH: number): number {
  const tf = makeTransform(cssW, cssH, false);
  cam.left = -tf.cx / tf.scale;
  cam.right = (cssW - tf.cx) / tf.scale;
  cam.top = tf.baseY / tf.scale;
  cam.bottom = (tf.baseY - cssH) / tf.scale;
  const audience = view === "audience";
  cam.position.set(0, 0, audience ? -10 : 10);
  cam.rotation.set(0, audience ? Math.PI : 0, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return tf.scale;
}

interface PoseParts {
  rig: HandRig;
  group: Group;
  shaft?: Mesh;
  shaftCm?: number;
}

export class HandRenderer {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 40);
  /** 왼손잡이일 때 좌우를 뒤집는 바깥 그룹 */
  private root = new Group();
  private lights = new Group();
  private parts = new Map<PoseName, PoseParts>();
  private building = new Map<PoseName, Promise<void>>();
  private disposed = false;
  private skin: MeshStandardMaterial;
  private cork: MeshStandardMaterial;
  private shaft: MeshStandardMaterial;
  private dotRing: Mesh;
  private dotFill: Mesh;
  private dotFillMat: MeshBasicMaterial;
  private opts: Hand3DOptions = { view: "conductor", leftHanded: false, baton: true };
  private handScale = HAND_SCALE;
  private cssW = 1;
  private cssH = 1;
  private scale = 1;
  private lost = false;
  private disposables: { dispose(): void }[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private onContextChange?: (ok: boolean) => void,
  ) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 아래팔이 흐려지도록 색 속성의 투명도를 쓴다. 손 부분은 투명도 1이라 불투명하게 보인다
    this.skin = new MeshStandardMaterial({
      color: palette.hand3d,
      roughness: 0.6,
      metalness: 0,
      vertexColors: true,
      transparent: true,
    });
    this.cork = new MeshStandardMaterial({ color: palette.cork, roughness: 0.85, metalness: 0 });
    this.shaft = new MeshStandardMaterial({ color: palette.ink, roughness: 0.32, metalness: 0 });
    this.disposables.push(this.skin, this.cork, this.shaft);

    // 빛: 화면 왼쪽 위 앞에서 오는 주광 + 뒤에서 가장자리를 살리는 빛 + 은은한 하늘빛
    const hemi = new HemisphereLight(new Color("#ffffff"), new Color("#a3abbb"), 1.0);
    const key = new DirectionalLight(new Color("#ffffff"), 2.8);
    key.position.set(-3, 4, 2.5);
    const rim = new DirectionalLight(new Color("#e4ecff"), 1.4);
    rim.position.set(3, 1.5, -3);
    const amb = new AmbientLight(new Color("#ffffff"), 0.25);
    // 보는 쪽 아래에서 살짝 받쳐 주는 빛 (손바닥·팔 아랫면이 칙칙해지지 않게)
    const fill = new DirectionalLight(new Color("#fff6ee"), 0.7);
    fill.position.set(0.5, -1.5, 3);
    this.lights.add(hemi, key, rim, amb, fill);
    this.scene.add(this.lights, this.root);

    // 끝점 (2D와 같은 흰 테두리 + 박 색 점). 언제나 맨 위에 보이게 깊이 검사를 끈다
    const circle = new CircleGeometry(1, 40);
    this.disposables.push(circle);
    // transparent로 두어야 손(투명 단계에서 그림)보다 나중에 그려진다
    const dotMat = { depthTest: false, depthWrite: false, toneMapped: false, transparent: true };
    const ringMat = new MeshBasicMaterial({ color: palette.sheet, ...dotMat });
    this.dotFillMat = new MeshBasicMaterial({ color: palette.graphite, ...dotMat });
    this.disposables.push(ringMat, this.dotFillMat);
    this.dotRing = new Mesh(circle, ringMat);
    this.dotFill = new Mesh(circle, this.dotFillMat);
    this.dotRing.renderOrder = 10;
    this.dotFill.renderOrder = 11;
    this.root.add(this.dotRing, this.dotFill);

    canvas.addEventListener("webglcontextlost", this.handleLost);
    canvas.addEventListener("webglcontextrestored", this.handleRestored);
    this.applyView();
  }

  private handleLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.onContextChange?.(false);
  };

  private handleRestored = () => {
    this.lost = false;
    this.onContextChange?.(true);
  };

  /** 이 자세의 손이 그릴 준비가 됐는지 */
  hasPose(pose: PoseName): boolean {
    return this.parts.has(pose);
  }

  /**
   * 자세를 준비한다 (손 모양 계산 + 셰이더 준비). 화면을 멈추지 않게 나눠서 돌리고, 끝나면 resolve.
   * 준비되는 동안 화면은 2D 손을 그린다.
   */
  requestPose(pose: PoseName): Promise<void> {
    if (this.parts.has(pose)) return Promise.resolve();
    let job = this.building.get(pose);
    if (!job) {
      const rig = buildRig(pose);
      job = handGeometryAsync(rig).then(async (geo) => {
        if (this.disposed) return;
        const parts = this.makeParts(rig, geo);
        // 셰이더를 미리 (가능하면 병렬로) 준비해서 첫 프레임에 멈칫하지 않게 한다.
        // compileAsync는 숨겨 둔 물체의 재질도 준비하므로 손은 숨긴 채로 둔다
        try {
          await this.renderer.compileAsync(this.scene, this.camera);
        } catch {
          // 미리 준비를 못 해도 첫 그리기에서 준비된다
        }
        if (this.disposed) return;
        this.parts.set(pose, parts);
      });
      this.building.set(pose, job);
      job.catch(() => this.building.delete(pose));
    }
    return job;
  }

  private makeParts(rig: HandRig, handGeo: BufferGeometry): PoseParts {
    const group = new Group();
    group.add(new Mesh(handGeo, this.skin));
    this.disposables.push(handGeo);
    const parts: PoseParts = { rig, group };
    if (rig.pose === "grip") {
      const baton = new Group();
      baton.matrixAutoUpdate = false;
      baton.matrix.copy(batonMatrix(rig));
      const corkGeo = corkGeometry();
      this.disposables.push(corkGeo);
      baton.add(new Mesh(corkGeo, this.cork));
      parts.shaft = new Mesh(shaftGeometry(30), this.shaft);
      parts.shaftCm = 30;
      baton.add(parts.shaft);
      group.add(baton);
    }
    group.visible = false;
    this.root.add(group);
    return parts;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.renderer.setPixelRatio(Math.min(2, dpr));
    this.renderer.setSize(this.cssW, this.cssH, false);
    this.applyView();
  }

  setOptions(opts: Hand3DOptions): void {
    this.opts = opts;
    this.applyView();
  }

  private applyView(): void {
    const audience = this.opts.view === "audience";
    this.scale = configureCamera(this.camera, this.opts.view, this.cssW, this.cssH);
    this.lights.rotation.y = audience ? Math.PI : 0;
    this.root.scale.x = this.opts.leftHanded ? -1 : 1;
    // 작은 화면(휴대폰)에서는 손을 최대 1.35배까지 키워 쥔 모양이 보이게 한다.
    // 코르크 자리와 지휘봉 끝은 그대로라 궤적과의 관계는 바뀌지 않는다
    const s = this.scale;
    this.handScale = HAND_SCALE * Math.min(1.35, Math.max(1, SMALL_SCREEN_PPU / s));
    // 끝점 크기는 2D와 같은 픽셀 크기
    const r = Math.max(4, s * 0.012) / s;
    this.dotFill.scale.setScalar(r);
    this.dotRing.scale.setScalar(r + 2 / s);
    this.dotFill.quaternion.copy(this.camera.quaternion);
    this.dotRing.quaternion.copy(this.camera.quaternion);
  }

  /** tip이 null이거나 자세가 아직 준비 중이면 아무것도 그리지 않는다 (캔버스를 비운다) */
  render(tip: Vec3 | null, tipColor: string): void {
    if (this.lost || this.disposed) return;
    const pose: PoseName = this.opts.baton ? "grip" : "point";
    const parts = tip ? this.parts.get(pose) : undefined;
    for (const p of this.parts.values()) p.group.visible = p === parts;
    this.dotRing.visible = this.dotFill.visible = !!parts;
    if (tip && parts) {
      const place = placeHand(parts.rig, tip, this.handScale);
      parts.group.position.set(...place.position);
      parts.group.quaternion.copy(place.quaternion);
      parts.group.scale.setScalar(place.scale);
      if (parts.shaft && Math.abs((parts.shaftCm ?? 0) - place.shaftCm) > 0.05) {
        parts.shaft.geometry.dispose();
        parts.shaft.geometry = shaftGeometry(place.shaftCm);
        parts.shaftCm = place.shaftCm;
      }
      const T = toThree(tip);
      this.dotRing.position.set(T[0], T[1], T[2]);
      this.dotFill.position.set(T[0], T[1], T[2]);
      this.dotFillMat.color.set(tipColor);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.handleLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestored);
    for (const p of this.parts.values()) p.shaft?.geometry.dispose();
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
  }
}

