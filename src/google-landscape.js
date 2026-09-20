import {
  googleCamera,
  localToGeographic,
  moveGoogleCamera,
} from "./google-camera.js";

let sdkPromise;
function loadMaps(key) {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const finish = (error) => {
      clearTimeout(timer);
      delete window.fieldLensMapsReady;
      if (error) {
        script.remove();
        reject(error);
      } else resolve();
    };
    const timer = setTimeout(
      () => finish(new Error("Google Maps did not respond.")),
      20000,
    );
    window.fieldLensMapsReady = () => finish();
    window.gm_authFailure = () =>
      finish(new Error("Google Maps rejected the demo key."));
    script.src =
      "https://maps.googleapis.com/maps/api/js?" +
      new URLSearchParams({
        key,
        v: "weekly",
        loading: "async",
        callback: "fieldLensMapsReady",
        libraries: "maps3d",
      });
    script.async = true;
    script.onerror = () =>
      finish(new Error("Google Maps could not be reached."));
    document.head.append(script);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}

export class GoogleLandscape {
  constructor(host, { views, photos, onView, onPhoto, onInteract, isVisible }) {
    Object.assign(this, {
      host,
      views,
      photos,
      onView,
      onPhoto,
      onInteract,
      isVisible,
    });
    this.keys = new Set();
    this.markers = [];
    this.fly = false;
    this.events = new AbortController();
  }

  async load(key) {
    await loadMaps(key);
    const {
      Map3DElement,
      MapMode,
      GestureHandling,
      MarkerInteractiveElement,
      AltitudeMode,
    } = await google.maps.importLibrary("maps3d");
    this.map = new Map3DElement({
      ...googleCamera(this.views[0]),
      mode: MapMode.SATELLITE,
      gestureHandling: GestureHandling.COOPERATIVE,
      defaultUIHidden: true,
      description:
        "Photorealistic 3D context of Lake Alice. Imagery capture date is not provided.",
      minAltitude: 12,
      maxAltitude: 2000,
      maxTilt: 85,
    });
    this.map.className = "google-map";
    const ready = new Promise((resolve, reject) => {
      const clean = () => {
        clearTimeout(timer);
        this.map.removeEventListener("gmp-steadychange", steady);
        this.map.removeEventListener("gmp-error", failed);
      };
      const steady = (event) => {
        if (event.isSteady) {
          clean();
          resolve();
        }
      };
      const failed = () => {
        clean();
        reject(new Error("Google 3D could not initialize on this device."));
      };
      const timer = setTimeout(() => {
        clean();
        reject(new Error("Google 3D imagery timed out."));
      }, 45000);
      this.map.addEventListener("gmp-steadychange", steady);
      this.map.addEventListener("gmp-error", failed);
    });
    this.host.append(this.map);
    const addMarker = (position, title, kind, index, callback) => {
      const marker = new MarkerInteractiveElement({
        position,
        title,
        altitudeMode: AltitudeMode.RELATIVE_TO_GROUND,
      });
      const badge = document.createElement("span");
      badge.className = `google-marker google-marker-${kind}`;
      badge.textContent =
        kind === "photo" ? `P${index + 1}` : String(index + 1);
      badge.setAttribute("aria-hidden", "true");
      marker.append(badge);
      marker.addEventListener("gmp-click", (event) => {
        event.stopPropagation();
        callback(index);
      });
      this.markers.push({ marker, kind, index, badge });
      this.map.append(marker);
    };
    this.views.forEach((view, i) =>
      addMarker(
        { ...localToGeographic(view.position), altitude: 6 },
        `View ${view.title}`,
        "view",
        i,
        this.onView,
      ),
    );
    this.photos.forEach((photo, i) =>
      addMarker(
        { lat: photo.latitude, lng: photo.longitude, altitude: 6 },
        `Open photo ${i + 1}: ${photo.title}`,
        "photo",
        i,
        this.onPhoto,
      ),
    );
    this.map.addEventListener(
      "pointerdown",
      () => {
        this.map.stopCameraAnimation();
        this.onInteract();
      },
      { signal: this.events.signal },
    );
    this.host.addEventListener(
      "keydown",
      (event) => {
        const key = event.key.toLowerCase();
        if (
          !this.fly ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          !["w", "a", "s", "d", "q", "e", "shift"].includes(key)
        )
          return;
        event.preventDefault();
        this.keys.add(key);
        this.onInteract();
      },
      { signal: this.events.signal },
    );
    window.addEventListener(
      "keyup",
      (event) => this.keys.delete(event.key.toLowerCase()),
      { signal: this.events.signal },
    );
    window.addEventListener("blur", () => this.keys.clear(), {
      signal: this.events.signal,
    });
    this.host.addEventListener("focusout", () => this.keys.clear(), {
      signal: this.events.signal,
    });
    this.lastFrame = performance.now();
    this.frame();
    await ready;
  }

  pose() {
    const center = this.map.center;
    return {
      center: { lat: center.lat, lng: center.lng, altitude: center.altitude },
      range: this.map.range,
      heading: this.map.heading,
      tilt: this.map.tilt,
    };
  }

  moveTo(view, instant = false) {
    this.setFly(false);
    this.map.flyCameraTo({
      endCamera: googleCamera(view),
      durationMillis:
        instant || matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 1500,
    });
  }

  setFly(enabled) {
    this.fly = enabled;
    this.keys.clear();
    if (enabled) {
      this.map.stopCameraAnimation();
      this.host.focus({ preventScroll: true });
    }
  }

  setMarkers(showViews, showPhotos) {
    for (const { marker, kind } of this.markers) {
      const visible = kind === "photo" ? showPhotos : showViews;
      if (visible && !marker.isConnected) this.map.append(marker);
      if (!visible && marker.isConnected) marker.remove();
    }
  }

  resize() {} // The Google element sizes itself from its host.

  setActiveView(index) {
    for (const item of this.markers)
      item.badge.classList.toggle(
        "is-active",
        item.kind === "view" && item.index === index,
      );
  }

  dispose() {
    this.setFly(false);
    this.events.abort();
    cancelAnimationFrame(this.frameId);
    this.map?.remove();
  }

  frame = () => {
    this.frameId = requestAnimationFrame(this.frame);
    const now = performance.now(),
      delta = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (!this.fly || !this.keys.size || !this.isVisible() || document.hidden)
      return;
    this.map.center = moveGoogleCamera(this.pose(), this.keys, delta).center;
  };
}
