import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The subdivision pass below is expensive (hundreds of ms). useGLTF's parsed
// geometry is a stable singleton, but this component can still remount more
// than once (StrictMode, parent re-renders, etc.) — cache by source geometry
// so the expensive work only ever runs once per geometry, not once per mount.
const smoothGeometryCache = new WeakMap()

const requestIdle =
  typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : (cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 1)
const cancelIdle =
  typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback.bind(window)
    : clearTimeout

function computeSmoothGeometry(sourceGeometry) {
  let geo = sourceGeometry.clone()
  geo.deleteAttribute('normal')
  geo = mergeVertices(geo, 1e-4)
  geo.computeBoundingBox()
  const boxSize = new THREE.Vector3()
  geo.boundingBox.getSize(boxSize)
  geo = new EdgeSubdivisionModifier(Math.max(boxSize.x, boxSize.y, boxSize.z) / 16, 3).modify(geo)
  geo = mergeVertices(geo, 1e-4)
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  return geo
}

// Recursively splits triangles whose edges exceed maxEdgeLength, up to
// maxIterations passes, so the ripple-perturbed normals below stay smooth
// instead of faceting on the source mesh's low native poly count.
class EdgeSubdivisionModifier {
  constructor(maxEdgeLength = 0.1, maxIterations = 6) {
    this.maxEdgeLength = maxEdgeLength
    this.maxIterations = maxIterations
  }

  modify(geometry) {
    if (geometry.index !== null) geometry = geometry.toNonIndexed()

    const maxIterations = this.maxIterations
    const maxLenSq = this.maxEdgeLength * this.maxEdgeLength

    const vA = new THREE.Vector3()
    const vB = new THREE.Vector3()
    const vC = new THREE.Vector3()
    const vMid = new THREE.Vector3()
    const positions = [vA, vB, vC, vMid]

    const nA = new THREE.Vector3()
    const nB = new THREE.Vector3()
    const nC = new THREE.Vector3()
    const nMid = new THREE.Vector3()
    const normals = [nA, nB, nC, nMid]

    const cA = new THREE.Color()
    const cB = new THREE.Color()
    const cC = new THREE.Color()
    const cMid = new THREE.Color()
    const colors = [cA, cB, cC, cMid]

    const uvA = new THREE.Vector2()
    const uvB = new THREE.Vector2()
    const uvC = new THREE.Vector2()
    const uvMid = new THREE.Vector2()
    const uvs = [uvA, uvB, uvC, uvMid]

    const uv1A = new THREE.Vector2()
    const uv1B = new THREE.Vector2()
    const uv1C = new THREE.Vector2()
    const uv1Mid = new THREE.Vector2()
    const uv1s = [uv1A, uv1B, uv1C, uv1Mid]

    const attrs = geometry.attributes
    const hasNormal = attrs.normal !== undefined
    const hasColor = attrs.color !== undefined
    const hasUv = attrs.uv !== undefined
    const hasUv1 = attrs.uv1 !== undefined

    let srcPos = attrs.position.array
    let srcNormal = hasNormal ? attrs.normal.array : null
    let srcColor = hasColor ? attrs.color.array : null
    let srcUv = hasUv ? attrs.uv.array : null
    let srcUv1 = hasUv1 ? attrs.uv1.array : null

    let outPos = srcPos
    let outNormal = srcNormal
    let outColor = srcColor
    let outUv = srcUv
    let outUv1 = srcUv1

    let iteration = 0
    let didSplit = true

    function pushTriangle(i0, i1, i2) {
      const p0 = positions[i0]
      const p1 = positions[i1]
      const p2 = positions[i2]
      outPos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)

      if (hasNormal) {
        const n0 = normals[i0]
        const n1 = normals[i1]
        const n2 = normals[i2]
        outNormal.push(n0.x, n0.y, n0.z, n1.x, n1.y, n1.z, n2.x, n2.y, n2.z)
      }
      if (hasColor) {
        const c0 = colors[i0]
        const c1 = colors[i1]
        const c2 = colors[i2]
        outColor.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b, c2.r, c2.g, c2.b)
      }
      if (hasUv) {
        const u0 = uvs[i0]
        const u1 = uvs[i1]
        const u2 = uvs[i2]
        outUv.push(u0.x, u0.y, u1.x, u1.y, u2.x, u2.y)
      }
      if (hasUv1) {
        const u0 = uv1s[i0]
        const u1 = uv1s[i1]
        const u2 = uv1s[i2]
        outUv1.push(u0.x, u0.y, u1.x, u1.y, u2.x, u2.y)
      }
    }

    while (didSplit && iteration < maxIterations) {
      iteration++
      didSplit = false

      srcPos = outPos
      outPos = []
      if (hasNormal) {
        srcNormal = outNormal
        outNormal = []
      }
      if (hasColor) {
        srcColor = outColor
        outColor = []
      }
      if (hasUv) {
        srcUv = outUv
        outUv = []
      }
      if (hasUv1) {
        srcUv1 = outUv1
        outUv1 = []
      }

      for (let i = 0, uvI = 0, len = srcPos.length; i < len; i += 9, uvI += 6) {
        vA.fromArray(srcPos, i + 0)
        vB.fromArray(srcPos, i + 3)
        vC.fromArray(srcPos, i + 6)
        if (hasNormal) {
          nA.fromArray(srcNormal, i + 0)
          nB.fromArray(srcNormal, i + 3)
          nC.fromArray(srcNormal, i + 6)
        }
        if (hasColor) {
          cA.fromArray(srcColor, i + 0)
          cB.fromArray(srcColor, i + 3)
          cC.fromArray(srcColor, i + 6)
        }
        if (hasUv) {
          uvA.fromArray(srcUv, uvI + 0)
          uvB.fromArray(srcUv, uvI + 2)
          uvC.fromArray(srcUv, uvI + 4)
        }
        if (hasUv1) {
          uv1A.fromArray(srcUv1, uvI + 0)
          uv1B.fromArray(srcUv1, uvI + 2)
          uv1C.fromArray(srcUv1, uvI + 4)
        }

        const abSq = vA.distanceToSquared(vB)
        const bcSq = vB.distanceToSquared(vC)
        const caSq = vC.distanceToSquared(vA)

        if (abSq > maxLenSq || bcSq > maxLenSq || caSq > maxLenSq) {
          didSplit = true
          if (abSq >= bcSq && abSq >= caSq) {
            vMid.lerpVectors(vA, vB, 0.5)
            if (hasNormal) nMid.lerpVectors(nA, nB, 0.5)
            if (hasColor) cMid.lerpColors(cA, cB, 0.5)
            if (hasUv) uvMid.lerpVectors(uvA, uvB, 0.5)
            if (hasUv1) uv1Mid.lerpVectors(uv1A, uv1B, 0.5)
            pushTriangle(0, 3, 2)
            pushTriangle(3, 1, 2)
          } else if (bcSq >= abSq && bcSq >= caSq) {
            vMid.lerpVectors(vB, vC, 0.5)
            if (hasNormal) nMid.lerpVectors(nB, nC, 0.5)
            if (hasColor) cMid.lerpColors(cB, cC, 0.5)
            if (hasUv) uvMid.lerpVectors(uvB, uvC, 0.5)
            if (hasUv1) uv1Mid.lerpVectors(uv1B, uv1C, 0.5)
            pushTriangle(0, 1, 3)
            pushTriangle(3, 2, 0)
          } else {
            vMid.lerpVectors(vA, vC, 0.5)
            if (hasNormal) nMid.lerpVectors(nA, nC, 0.5)
            if (hasColor) cMid.lerpColors(cA, cC, 0.5)
            if (hasUv) uvMid.lerpVectors(uvA, uvC, 0.5)
            if (hasUv1) uv1Mid.lerpVectors(uv1A, uv1C, 0.5)
            pushTriangle(0, 1, 3)
            pushTriangle(3, 1, 2)
          }
        } else {
          pushTriangle(0, 1, 2)
        }
      }
    }

    const out = new THREE.BufferGeometry()
    out.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3))
    if (hasNormal) out.setAttribute('normal', new THREE.Float32BufferAttribute(outNormal, 3))
    if (hasColor) out.setAttribute('color', new THREE.Float32BufferAttribute(outColor, 3))
    if (hasUv) out.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2))
    if (hasUv1) out.setAttribute('uv1', new THREE.Float32BufferAttribute(outUv1, 2))
    return out
  }
}

const SIM_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const SIM_FRAGMENT = `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D textureA;
  uniform vec2 mouse;
  uniform vec2 prevMouse;
  uniform float brushStrength;
  uniform float time;
  uniform float ambientStrength;
  uniform vec2 resolution;
  uniform int frame;

  const float delta = 1.4;

  float distToSegment(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a;
      vec2 ba = b - a;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      return length(pa - ba * h);
  }

  void drip(inout float pressure, vec2 uv, vec2 center, float radius, float amount) {
      float dist = distance(uv, center);
      float falloff = 1.0 - smoothstep(0.0, radius, dist);
      pressure += falloff * falloff * amount;
  }

  void main() {
      vec2 uv = vUv;
      if (frame == 0) {
          gl_FragColor = vec4(0.0);
          return;
      }

      vec4 data = texture2D(textureA, uv);
      float pressure = data.x;
      float pVel = data.y;

      vec2 texelSize = 5.5 / resolution;
      float p_right = texture2D(textureA, uv + vec2(texelSize.x, 0.0)).x;
      float p_left  = texture2D(textureA, uv + vec2(-texelSize.x, 0.0)).x;
      float p_up    = texture2D(textureA, uv + vec2(0.0, texelSize.y)).x;
      float p_down  = texture2D(textureA, uv + vec2(0.0, -texelSize.y)).x;

      if (uv.x <= texelSize.x) p_left = p_right;
      if (uv.x >= 1.0 - texelSize.x) p_right = p_left;
      if (uv.y <= texelSize.y) p_down = p_up;
      if (uv.y >= 1.0 - texelSize.y) p_up = p_down;

      pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
      pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;

      pressure += delta * pVel;
      pVel -= 0.005 * delta * pressure;

      pVel *= 1.0 - 0.012 * delta;
      pressure *= 0.99;

      if (ambientStrength > 0.001) {
          float t = time;
          vec2 a = vec2(0.42 + 0.16 * sin(t * 0.45), 0.48 + 0.14 * cos(t * 0.38));
          vec2 b = vec2(0.58 + 0.14 * cos(t * 0.41 + 1.2), 0.55 + 0.12 * sin(t * 0.52 + 0.7));
          vec2 c = vec2(0.50 + 0.13 * sin(t * 0.32 + 2.1), 0.38 + 0.13 * cos(t * 0.44 + 1.5));
          vec2 d = vec2(0.35 + 0.10 * cos(t * 0.29 + 0.4), 0.62 + 0.09 * sin(t * 0.36 + 1.1));

          float pulseA = smoothstep(0.0, 0.08, fract(t * 0.55)) * (1.0 - smoothstep(0.08, 0.55, fract(t * 0.55)));
          float pulseB = smoothstep(0.0, 0.08, fract(t * 0.48 + 0.37)) * (1.0 - smoothstep(0.08, 0.55, fract(t * 0.48 + 0.37)));
          float pulseC = smoothstep(0.0, 0.08, fract(t * 0.42 + 0.71)) * (1.0 - smoothstep(0.08, 0.55, fract(t * 0.42 + 0.71)));
          float pulseD = smoothstep(0.0, 0.08, fract(t * 0.38 + 0.19)) * (1.0 - smoothstep(0.08, 0.55, fract(t * 0.38 + 0.19)));

          float breathe = 0.4 + 0.6 * (0.5 + 0.5 * sin(t * 0.9));
          drip(pressure, uv, a, 0.11, (0.28 * breathe + pulseA * 1.15) * ambientStrength);
          drip(pressure, uv, b, 0.10, (0.22 * breathe + pulseB * 1.0) * ambientStrength);
          drip(pressure, uv, c, 0.12, (0.20 * breathe + pulseC * 0.95) * ambientStrength);
          drip(pressure, uv, d, 0.10, (0.18 * breathe + pulseD * 0.85) * ambientStrength);
      }

      if (mouse.x >= 0.0 && brushStrength > 0.001) {
          vec2 mouseUV = mouse / resolution;
          vec2 prevUV = prevMouse.x >= 0.0 ? prevMouse / resolution : mouseUV;
          float dist = distToSegment(uv, prevUV, mouseUV);
          float outer = 0.11;
          float inner = 0.04;
          float soft = 1.0 - smoothstep(inner, outer, dist);
          float hard = 1.0 - smoothstep(0.0, inner, dist);
          pressure += (soft * 1.6 + hard * 0.9) * brushStrength;
      }

      gl_FragColor = vec4(pressure, pVel, (p_right - p_left) / 2.0, (p_up - p_down) / 2.0);
  }
`

const MILK_VERTEX = `
  uniform vec3 uBBoxMin;
  uniform vec3 uBBoxMax;
  varying vec2 vUv;
  varying vec2 vSimUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vLocalPos;

  void main() {
    vUv = uv;
    vLocalPos = position;
    vec3 size = max(uBBoxMax - uBBoxMin, vec3(1e-4));
    vec3 n = (position - uBBoxMin) / size;
    vSimUv = clamp(n.zy, 0.0, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const MILK_FRAGMENT = `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uMalaiColor;
  uniform vec3 uLightPos;
  uniform sampler2D uSimTexture;
  uniform vec2 uTilt;
  uniform float uTime;
  uniform vec3 uBBoxMin;
  uniform vec3 uBBoxMax;
  varying vec2 vUv;
  varying vec2 vSimUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vLocalPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float softNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fresnelSchlick(float cosTheta, float F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
  }

  void main() {
    vec4 simData = texture2D(uSimTexture, vSimUv);
    float pressure = simData.x;
    float gradX = simData.z;
    float gradY = simData.w;
    float rippleAmt = abs(gradX) + abs(gradY);

    vec3 center = (uBBoxMin + uBBoxMax) * 0.5;
    vec3 halfSize = max((uBBoxMax - uBBoxMin) * 0.5, vec3(1e-4));
    vec3 nPos = abs((vLocalPos - center) / halfSize);
    float boxRim = max(nPos.x, max(nPos.y, nPos.z));
    float radial = length(nPos.yz);
    float contact = max(boxRim, radial);
    float edgeBlend = 1.0 - smoothstep(0.62, 0.98, contact);
    float edgeSoft = smoothstep(0.55, 0.92, contact);

    vec3 baseNormal = normalize(vNormal);
    vec3 ripplePerturb = vec3(
      -gradX * 6.5 + uTilt.y * 0.12,
      0.0,
      -gradY * 6.5 + uTilt.x * 0.12
    );
    vec3 normal = normalize(baseNormal + ripplePerturb);

    vec3 lightDir = normalize(uLightPos - vViewPos);
    vec3 viewDir = normalize(-vViewPos);
    vec3 halfDir = normalize(lightDir + viewDir);

    float NdotV = clamp(dot(normal, viewDir), 0.0, 1.0);
    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotH = max(dot(normal, halfDir), 0.0);

    float F = fresnelSchlick(NdotV, 0.02);

    float sharpSpec = pow(NdotH, 220.0) * 2.2;
    float softSpec = pow(NdotH, 28.0) * 0.28;
    float rippleSpec = rippleAmt * 1.8 + abs(pressure) * 0.14;
    float spec = (sharpSpec + softSpec) * (0.55 + F * 1.6) + rippleSpec;
    spec *= mix(1.0, 0.15, edgeSoft);

    float n1 = softNoise(vUv * 48.0 + uTime * 0.08);
    float n2 = softNoise(vUv * 110.0 - uTime * 0.05);
    float haze = smoothstep(0.35, 0.95, n1 * 0.65 + n2 * 0.35);

    float fleck = smoothstep(0.92, 0.995, softNoise(vUv * 220.0 + vec2(uTime * 0.03, -uTime * 0.02)));
    fleck *= 0.55 + 0.45 * softNoise(vUv * 40.0);

    float opticalDepth = mix(0.10, 0.55, pow(1.0 - NdotV, 1.6));
    float bodyAlpha = opticalDepth * (0.55 + haze * 0.45);

    vec3 thinTint = uColor;
    vec3 thickTint = mix(uColor, vec3(0.90, 0.88, 0.78), 0.35);
    vec3 absorb = mix(thinTint, thickTint, opticalDepth);

    float wrap = NdotL * 0.5 + 0.5;
    vec3 litBody = absorb * (0.42 + wrap * 0.48);

    float backLit = pow(max(dot(viewDir, -lightDir), 0.0), 2.2);
    float thickness = pow(1.0 - NdotV, 1.4);
    vec3 sss = vec3(1.0, 0.93, 0.82) * backLit * thickness * 0.22;
    litBody += sss;

    litBody += absorb * abs(pressure) * 0.22;
    litBody += vec3(1.0) * fleck * 0.12;
    litBody += vec3(0.95, 0.97, 1.0) * rippleAmt * 0.32;

    vec3 reflectColor = vec3(0.92, 0.96, 1.0);
    vec3 finalColor = mix(litBody, reflectColor, F * 0.85 * (1.0 - edgeSoft * 0.85));
    finalColor += vec3(0.98, 0.99, 1.0) * spec * 0.9;

    finalColor = mix(finalColor, uMalaiColor, edgeSoft * 0.72);

    float alpha = bodyAlpha * 0.55
      + F * 0.48
      + thickness * 0.10
      + spec * 0.22
      + fleck * 0.08
      + rippleAmt * 0.22
      + abs(pressure) * 0.06;

    alpha *= edgeBlend;
    alpha = mix(alpha, alpha * 0.2, edgeSoft);

    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 0.78));
  }
`

export function MilkSurface({ geometry, color = '#EFE9DC', malaiColor = '#E8DCC8', size = 512, tiltRef }) {
  const internalRef = useRef()
  const meshRef = tiltRef ?? internalRef
  const { gl } = useThree()

  const fboOptions = {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false,
  }
  const fboRead = useFBO(size, size, fboOptions)
  const fboWrite = useFBO(size, size, fboOptions)
  const buffers = useRef({ read: fboRead, write: fboWrite })

  const mouse = useRef(new THREE.Vector2(-1, -1))
  const prevMouse = useRef(new THREE.Vector2(-1, -1))
  const painting = useRef(false)
  const localPoint = useRef(new THREE.Vector3())

  // The milk mesh stays hidden inside the closed shell until the crack-open
  // burst, which only happens after scrolling through the whole Hero ->
  // Benefits -> runway span — so there's no visible cost to computing this
  // off the critical first-paint path instead of blocking render with it.
  const [smoothGeometry, setSmoothGeometry] = useState(() => smoothGeometryCache.get(geometry) ?? null)

  useEffect(() => {
    if (smoothGeometry) return undefined
    let cancelled = false
    const handle = requestIdle(() => {
      if (cancelled) return
      const cached = smoothGeometryCache.get(geometry)
      const geo = cached ?? computeSmoothGeometry(geometry)
      if (!cached) smoothGeometryCache.set(geometry, geo)
      if (!cancelled) setSmoothGeometry(geo)
    })
    return () => {
      cancelled = true
      cancelIdle(handle)
    }
  }, [geometry, smoothGeometry])

  const bbox = useMemo(() => {
    if (!smoothGeometry) return null
    const box = smoothGeometry.boundingBox
    return { min: box.min.clone(), max: box.max.clone() }
  }, [smoothGeometry])

  const simScene = useMemo(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        textureA: { value: null },
        mouse: { value: new THREE.Vector2(-1, -1) },
        prevMouse: { value: new THREE.Vector2(-1, -1) },
        brushStrength: { value: 0 },
        time: { value: 0 },
        ambientStrength: { value: 0.95 },
        resolution: { value: new THREE.Vector2(size, size) },
        frame: { value: 0 },
      },
      vertexShader: SIM_VERTEX,
      fragmentShader: SIM_FRAGMENT,
    })
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))
    return { scene, camera, material }
  }, [size])

  const milkMaterial = useMemo(() => {
    if (!bbox) return null
    return new THREE.ShaderMaterial({
      uniforms: {
        uSimTexture: { value: null },
        uColor: { value: new THREE.Color(color) },
        uMalaiColor: { value: new THREE.Color(malaiColor) },
        uLightPos: { value: new THREE.Vector3(5, 10, 7) },
        uTilt: { value: new THREE.Vector2(0, 0) },
        uTime: { value: 0 },
        uBBoxMin: { value: bbox.min },
        uBBoxMax: { value: bbox.max },
      },
      vertexShader: MILK_VERTEX,
      fragmentShader: MILK_FRAGMENT,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    })
  }, [color, malaiColor, bbox])

  useFrame(({ clock }) => {
    if (!smoothGeometry || !milkMaterial) return
    const { read, write } = buffers.current
    const simUniforms = simScene.material.uniforms
    let brushStrength = 0

    if (painting.current && mouse.current.x >= 0) {
      const dist =
        prevMouse.current.x >= 0
          ? Math.hypot(mouse.current.x - prevMouse.current.x, mouse.current.y - prevMouse.current.y)
          : 0.04 * size
      brushStrength = THREE.MathUtils.clamp(dist / (0.06 * size), 0.15, 1.25)
    }

    simUniforms.textureA.value = read.texture
    simUniforms.mouse.value.copy(mouse.current)
    simUniforms.prevMouse.value.copy(prevMouse.current)
    simUniforms.brushStrength.value = brushStrength
    simUniforms.time.value = clock.elapsedTime
    simUniforms.ambientStrength.value = brushStrength > 0.2 ? 0.45 : 0.95
    simUniforms.frame.value += 1

    gl.setRenderTarget(write)
    gl.render(simScene.scene, simScene.camera)
    gl.setRenderTarget(null)

    buffers.current = { read: write, write: read }
    milkMaterial.uniforms.uSimTexture.value = write.texture
    milkMaterial.uniforms.uTime.value = clock.elapsedTime

    if (mouse.current.x >= 0) prevMouse.current.copy(mouse.current)
    painting.current = false

    if (meshRef.current) {
      const tilt = milkMaterial.uniforms.uTilt.value
      tilt.set(0, 0)
      let node = meshRef.current.parent
      while (node) {
        tilt.x += node.rotation.x
        tilt.y += node.rotation.y
        node = node.parent
      }
    }
  })

  if (!smoothGeometry || !milkMaterial || !bbox) return null

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      name="milk"
      geometry={smoothGeometry}
      material={milkMaterial}
      onPointerMove={(e) => {
        localPoint.current.copy(e.point)
        e.object.worldToLocal(localPoint.current)
        const depthZ = Math.max(bbox.max.z - bbox.min.z, 1e-4)
        const depthY = Math.max(bbox.max.y - bbox.min.y, 1e-4)
        const u = THREE.MathUtils.clamp((localPoint.current.z - bbox.min.z) / depthZ, 0, 1)
        const v = THREE.MathUtils.clamp((localPoint.current.y - bbox.min.y) / depthY, 0, 1)
        mouse.current.set(u * size, v * size)
        painting.current = true
      }}
      onPointerOut={() => {
        mouse.current.set(-1, -1)
        prevMouse.current.set(-1, -1)
        painting.current = false
      }}
    />
  )
}

export default MilkSurface
