import * as THREE from 'three';
import { Object3D, WebGLRenderer } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer';
import { defaults, Renderer } from './constants';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TooltipHelper } from '../scene/tooltip-helper';
import { InsetHelper, ScenePosition } from '../scene/inset-helper';
import { getSceneWithBackground, ThreeBuilder } from './three_builder';
import { DebugHelper } from '../scene/debug-helper';

const vertexShader = require('./vertex_shader.glsl');
const fragmentShader = require('./fragment_shader.glsl');

console.log(vertexShader, fragmentShader);

const customMaterial = new THREE.ShaderMaterial({
  uniforms: {
    c: { type: 'f', value: 1.0 },
    p: { type: 'f', value: 1.4 },
    glowColor: { type: 'c', value: new THREE.Color(0xffff00) },
    viewVector: { type: 'v3', value: [0, 0, 0] }
  },
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  side: THREE.FrontSide,
  blending: THREE.AdditiveBlending,
  transparent: true
});

export default class Simple3DScene {
  private settings;
  private renderer!: THREE.WebGLRenderer | SVGRenderer;
  private labelRenderer!: CSS2DRenderer;
  public scene!: THREE.Scene; // expose getter instead
  private cachedMountNodeSize!: { width: number; height: number };
  private camera!: THREE.OrthographicCamera;
  private frameId?: number;
  private clickableObjects: THREE.Object3D[] = [];
  private tooltipObjects: THREE.Object3D[] = [];
  private objectDictionnary: { [id: string]: any } = {};
  private controls;
  private tooltipHelper = new TooltipHelper();
  private axis!: Object3D;
  private axisJson: any;
  private inset!: InsetHelper;
  private inletPosition!: ScenePosition;
  private objectBuilder: ThreeBuilder;
  private clickCallback: (objects: any[]) => void;
  private debugHelper!: DebugHelper;

  private cacheMountBBox(mountNode: Element) {
    this.cachedMountNodeSize = { width: mountNode.clientWidth, height: mountNode.clientHeight };
  }

  private determineSceneRenderer() {
    switch (this.settings.renderer) {
      case Renderer.WEBGL: {
        const renderer = new THREE.WebGLRenderer({
          antialias: this.settings.antialias,
          alpha: this.settings.transparentBackground
        });
        renderer.gammaFactor = 2.2;
        return renderer;
      }
      case Renderer.SVG: {
        return new SVGRenderer();
      }
      default: {
        console.error('Invalid renderer passed', this.settings.renderer);
        return null;
      }
    }
  }

  private configureSceneRenderer(mountNode: Element) {
    const renderer = this.determineSceneRenderer();
    if (!renderer) {
      throw new Error('No renderer');
    }
    this.renderer = renderer;
    this.renderer.setSize(this.cachedMountNodeSize.width, this.cachedMountNodeSize.height);
    //TODO(chab) This should be simpler
    mountNode.appendChild(this.renderer.domElement);
  }

  private configureLabelRenderer(mountNode: Element) {
    const labelRenderer = new CSS2DRenderer();
    this.labelRenderer = labelRenderer;
    const width = mountNode.clientWidth;
    const height = mountNode.clientHeight;
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = 'relative';
    labelRenderer.domElement.style.top = `-${height}px`;
    labelRenderer.domElement.style.pointerEvents = 'none';
    mountNode.appendChild(labelRenderer.domElement);
  }

  private configureScene(sceneJson) {
    this.scene = getSceneWithBackground(this.settings);
    this.addToScene(sceneJson);
    const lights = this.objectBuilder.makeLights(this.settings.lights);
    this.scene.add(lights);
    this.scene.add(this.tooltipHelper.tooltip);
    const controls = new OrbitControls(this.camera, this.renderer.domElement as HTMLElement);
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.enabled = true;
    this.renderer.domElement.addEventListener('mousemove', (e: any) => {
      const p = this.getClickedReference(e.offsetX, e.offsetY, this.tooltipObjects);
      if (p) {
        const { object, point } = p;
        this.tooltipHelper.updateTooltip(point, object!.jsonObject, object!.sceneObject);
        this.renderScene();
      } else {
        this.tooltipHelper.hideTooltipIfNeeded() && this.renderScene();
      }
    });

    this.renderer.domElement.addEventListener('click', (e: any) => {
      const p = this.getClickedReference(e.offsetX, e.offsetY, this.clickableObjects);

      if (p) {
        const { object, point } = p;
        this.clickCallback(object?.jsonObject);
      }
    });

    this.controls = controls;

    if (this.settings.staticScene) {
      // only re-render when scene is rotated
      controls.addEventListener('change', () => {
        this.renderScene();
      });
      controls.addEventListener('start', () => {
        controls.update();
      });
      controls.addEventListener('end', () => {
        controls.update();
      });
    } else {
      // constantly re-render (for animation)
      this.start();
    }
  }

  private readonly windowListener = () => this.resizeRendererToDisplaySize();

  constructor(
    sceneJson,
    domElement: Element,
    settings,
    size,
    padding,
    clickCallback,
    private debugDOMElement?
  ) {
    this.settings = Object.assign(defaults, settings);
    this.objectBuilder = new ThreeBuilder(this.settings);
    this.cacheMountBBox(domElement);
    this.configureSceneRenderer(domElement);
    this.configureLabelRenderer(domElement);
    this.configureScene(sceneJson);
    this.clickCallback = clickCallback;
    window.addEventListener('resize', this.windowListener, false);
    this.inset = new InsetHelper(
      this.axis,
      this.axisJson,
      this.scene,
      sceneJson.origin,
      this.camera,
      this.objectBuilder,
      size,
      size,
      padding
    );
    if (this.debugDOMElement) {
      this.debugHelper = new DebugHelper(
        this.debugDOMElement,
        this.scene,
        this.camera,
        this.settings
      );
    }
  }

  updateInsetSettings(inletSize: number, inletPadding: number, axisView) {
    this.inletPosition = axisView as ScenePosition;
    this.inset.updateViewportsize(inletSize, inletPadding);
    this.renderScene();
  }

  resizeRendererToDisplaySize() {
    const canvas = this.renderer.domElement as HTMLCanvasElement;
    this.cacheMountBBox(canvas.parentElement as Element);
    const { width, height } = this.cachedMountNodeSize;
    if (canvas.width !== width || canvas.height !== height) {
      this.renderer.setSize(width, height, true);
      this.labelRenderer.setSize(width, height);

      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    }
  }

  addToScene(sceneJson) {
    this.removeObjectByName(sceneJson.name);
    this.clickableObjects = [];
    this.objectDictionnary = {};

    const rootObject = new THREE.Object3D();
    rootObject.name = sceneJson.name;
    sceneJson.visible && (rootObject.visible = sceneJson.visible);

    // recursively visit the scene, starting with the root object
    const traverse_scene = (o, parent) => {
      o.contents.forEach(childObject => {
        if (childObject.type) {
          parent.add(this.makeObject(childObject));
        } else {
          const threeObject = new THREE.Object3D();
          threeObject.name = childObject.name;
          childObject.visible && (threeObject.visible = childObject.visible);
          if (childObject.origin) {
            const translation = new THREE.Matrix4();
            // note(chab) have a typedefinition for the JSON
            translation.makeTranslation(...(childObject.origin as [number, number, number]));
            threeObject.applyMatrix4(translation);
          }
          if (!this.settings.extractAxis || threeObject.name !== 'axes') {
            parent.add(threeObject);
          }
          traverse_scene(childObject, threeObject);
          if (threeObject.name === 'axes') {
            this.axis = threeObject.clone();
            this.axisJson = { ...childObject };
          }
        }
      });
    };

    traverse_scene(sceneJson, rootObject);
    console.log('rootObject', rootObject, rootObject);
    this.scene.add(rootObject);
    this.setupCamera(rootObject);
    this.renderScene();

    // we can automatically output a screenshot to be the background of the parent div
    // this helps for automated testing, printing the web page, etc.
    if (this.settings.renderDivBackground) {
      this.renderer.domElement.parentElement!.style.backgroundSize = '100%';
      this.renderer.domElement.parentElement!.style.backgroundRepeat = 'no-repeat';
      this.renderer.domElement.parentElement!.style.backgroundPosition = 'center';
      if (this.renderer.domElement instanceof HTMLCanvasElement) {
        // TS magic, domElements is automatically coerced to HTMLCanvasElement
        this.renderer.domElement.parentElement!.style.backgroundImage = `url('${this.renderer.domElement.toDataURL(
          'image/png'
        )}')`;
      }
    }

    if (this.inset) {
      this.inset.updateAxis(this.axis, this.axisJson);
    }
  }

  private setupCamera(rootObject) {
    const bbox = new THREE.Box3();
    bbox.setFromObject(rootObject);
    // auto-zoom to fit object
    // TODO: maybe better to move this elsewhere (what if using perspective?)
    const box = new THREE.Box3();
    box.setFromObject(rootObject);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    let maxDim = Math.max(size.x, size.y, size.z);
    const CAMERA_BOX_PADDING = maxDim / 1.65;
    // we add a bit of padding, let's suppose we rotate, we want to avoid the
    // object to go out of the camera
    const maxExtent = maxDim / 2 + CAMERA_BOX_PADDING / 2;
    // we add a lot of padding to make sure the camera is always beyond/behind the object
    const Z_PADDING = 50;
    this.camera = new THREE.OrthographicCamera(
      center.x - maxExtent,
      center.x + maxExtent,
      center.y + maxExtent,
      center.y - maxExtent,
      center.z - maxExtent - Z_PADDING,
      center.z + maxExtent + Z_PADDING
    );
    // position camera behind the object
    this.camera.position.z = center.z + maxExtent + Z_PADDING / 2;
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrix();
    this.scene.add(this.camera);
  }

  makeObject(object_json) {
    const obj = new THREE.Object3D();

    if (object_json.clickable) {
      this.clickableObjects.push(obj);
      this.objectDictionnary[obj.id] = object_json;
    }

    if (object_json.tooltip) {
      this.tooltipObjects.push(obj);
      this.objectDictionnary[obj.id] = object_json;
    }

    return this.objectBuilder.makeObject(object_json, obj);
  }

  start() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(() => this.animate());
    } else {
      console.warn('Trying to start animation, but it seems an animation loop is already running');
    }
  }

  stop() {
    cancelAnimationFrame(this.frameId!);
    this.frameId = undefined;
  }

  animate() {
    this.renderScene();
    this.frameId = window.requestAnimationFrame(() => this.animate());
  }

  renderScene() {
    if (this.renderer instanceof WebGLRenderer) {
      this.renderer.setClearColor(0x000000, 0.0);
      this.renderer.setSize(this.cachedMountNodeSize.width, this.cachedMountNodeSize.height);
    }

    // debug view
    if (this.debugHelper) {
      this.debugHelper.render();
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);

    this.inset &&
      this.inletPosition !== ScenePosition.HIDDEN &&
      this.inset.render(this.renderer, this.getInletOrigin(this.inletPosition));
  }

  toggleVisibility(namesToVisibility) {
    if (!!namesToVisibility) {
      Object.keys(namesToVisibility).forEach(objName => {
        if (!!namesToVisibility[objName]) {
          const obj = this.scene.getObjectByName(objName);
          if (obj) {
            obj.visible = Boolean(namesToVisibility[objName]);
          }
        }
      });
      this.renderScene();
    }
  }

  // i know this is can be done by implementing a color buffer, with each color matching one
  // object
  getClickedReference(clientX, clientY, objectsToCheck: Object3D[]) {
    if (!objectsToCheck || objectsToCheck.length === 0) {
      return;
    }
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const size = new THREE.Vector2();
    (this.renderer as WebGLRenderer).getSize(size);
    mouse.x = (clientX / size.width) * 2 - 1;
    mouse.y = -(clientY / size.height) * 2 + 1;
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(objectsToCheck, true);
    // they are a few cases where this does not work :( try to understand why
    if (intersects.length > 0) {
      return { point: intersects[0].point, object: this.getParentObject(intersects[0].object) };
    }
    return null;
  }

  getParentObject(object: Object3D): { sceneObject: Object3D; jsonObject: any } | null {
    if (!object.parent) {
      return null;
    }
    if (!this.objectDictionnary[object.id]) {
      return this.getParentObject(object.parent);
    } else {
      return { sceneObject: object, jsonObject: this.objectDictionnary[object.id] };
    }
  }

  public enableDebug(debugEnabled: boolean, node) {
    if (!debugEnabled) {
      if (!this.debugHelper) {
        console.warn('Turning off debug, while its not on');
      } else {
        this.debugHelper.onDestroy();
        this.debugHelper = (null as unknown) as DebugHelper;
      }
    } else {
      if (this.debugHelper) {
        console.warn('Turning on debug, while its not off');
      } else {
        this.debugDOMElement = node;
        this.debugHelper = new DebugHelper(
          this.debugDOMElement,
          this.scene,
          this.camera,
          this.settings
        );
        this.debugHelper.render();
      }
    }
  }

  // call this when the parent component is destroyed
  public onDestroy() {
    window.removeEventListener('resize', this.windowListener, false);
    this.debugHelper && this.debugHelper.onDestroy();
    this.inset.onDestroy();
    this.scene.dispose();
    this.controls.dispose();
    if (this.renderer instanceof THREE.WebGLRenderer) {
      this.renderer.forceContextLoss();
      this.renderer.dispose();
    }
    this.renderer.domElement!.parentElement!.removeChild(this.renderer.domElement);
    this.renderer.domElement = undefined as any;
    this.renderer = null as any;
    this.stop();
  }

  removeObjectByName(name) {
    // name is not necessarily unique, make this recursive ?
    const object = this.scene.getObjectByName(name);
    typeof object !== 'undefined' && this.scene.remove(object);
  }

  private getInletOrigin(pos: ScenePosition) {
    switch (pos) {
      case ScenePosition.SW: {
        return [this.inset.getPadding(), this.inset.getPadding()];
      }
      case ScenePosition.SE: {
        return [
          this.cachedMountNodeSize.width - this.inset.getPadding() - this.inset.getSize(),
          this.inset.getPadding()
        ];
      }
      case ScenePosition.NW: {
        return [
          0 + this.inset.getPadding(),
          this.cachedMountNodeSize.height - this.inset.getPadding() - this.inset.getSize()
        ];
      }
      case ScenePosition.NE: {
        return [
          this.cachedMountNodeSize.width - this.inset.getPadding() - this.inset.getSize(),
          this.cachedMountNodeSize.height - this.inset.getPadding() - this.inset.getSize()
        ];
      }
      default:
        return [this.inset.getPadding(), this.inset.getPadding()];
    }
  }
}
