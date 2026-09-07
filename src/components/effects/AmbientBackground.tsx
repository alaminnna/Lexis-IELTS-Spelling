import { useRef, useMemo, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

// Subtle premium mesh — not a gimmick, feels like paper with depth
function Blob({ color = "#e55a2b", speed = 0.12 }: { color?: string; speed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
  }), [color])

  const vert = /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
  const frag = /* glsl */`
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      float d = distance(uv, vec2(0.5));
      float glow = 1.0 - smoothstep(0.0, 0.42, d + 0.08 * sin(uTime*0.6 + uv.x*6.0));
      float vignette = smoothstep(0.9, 0.4, d);
      vec3 col = mix(vec3(1.0), uColor, glow * 0.18);
      float alpha = glow * 0.55 * vignette;
      gl_FragColor = vec4(col, alpha);
    }
  `

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime * speed * 6
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.07) * 0.12
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.06
    }
  })

  return (
    <mesh ref={meshRef} scale={[1.8, 1.2, 1]}>
      <planeGeometry args={[4, 4, 1, 1]} />
      <shaderMaterial ref={matRef} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  )
}

function Particles({ count = 48 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 6
      arr[i * 3 + 1] = (Math.random() - 0.5) * 3
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1
    }
    return arr
  }, [count])

  useFrame((state) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
    const pos = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      const y = pos.getY(i)
      pos.setY(i, y + Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.0006)
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.018} sizeAttenuation transparent opacity={0.28} color="#ff6b35" depthWrite={false} />
    </points>
  )
}

export function DashboardAmbient({ variant = "warm" }: { variant?: "warm" | "cool" }) {
  const color = variant === "warm" ? "#e55a2b" : "#0ea5e9"
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden rounded-[20px] pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 2.4], fov: 50 }}
        dpr={[1, 1.6]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        frameloop="always"
      >
        <Blob color={color} speed={0.1} />
        <Particles count={32} />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/40 dark:from-black/0 dark:via-black/0 dark:to-black/30" />
    </div>
  )
}

export function PracticeAmbient() {
  return (
    <div className="absolute inset-0 -z-10 opacity-[0.45] pointer-events-none overflow-hidden rounded-[20px]">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} frameloop="always">
        <Particles count={22} />
      </Canvas>
    </div>
  )
}

function ShaderMesh({ isDark }: { isDark: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(isDark ? "#ff7a3d" : "#e55a2b") },
    uColorB: { value: new THREE.Color(isDark ? "#5eead4" : "#0ea5e9") },
    uIsDark: { value: isDark ? 1 : 0 },
  }), [isDark])

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uColorA.value.set(isDark ? "#ff7a3d" : "#e55a2b")
      matRef.current.uniforms.uColorB.value.set(isDark ? "#5eead4" : "#0ea5e9")
      matRef.current.uniforms.uIsDark.value = isDark ? 1 : 0
    }
  }, [isDark])

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  const vert = /* glsl */`
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
  const frag = /* glsl */`
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uIsDark;
    varying vec2 vUv;
    // cheap noise
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0,0.0));
      float c = hash(i + vec2(0.0,1.0));
      float d = hash(i + vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    void main(){
      vec2 uv = vUv;
      float t = uTime * 0.11;
      vec2 p = uv - 0.5;
      float d = length(p);
      // flowing waves
      float n = noise(uv * 3.0 + t * 0.4);
      float n2 = noise(uv * 5.0 - t * 0.22);
      float wave = sin(uv.x * 4.2 + t) * 0.07 + cos(uv.y * 3.1 + t * 0.6) * 0.05 + (n - 0.5) * 0.06;
      float glow = smoothstep(0.62, 0.06, d + wave + n2*0.04);
      float vignette = smoothstep(1.05, 0.42, d);
      vec3 base = uIsDark > 0.5 ? vec3(0.09, 0.095, 0.11) : vec3(1.0);
      // accent layer
      vec3 col = mix(base, uColorA, glow * 0.20);
      // secondary subtle drift
      float drift = sin(uv.x * 2.8 - t*0.45 + uv.y*2.2) * 0.5 + 0.5;
      float ring = smoothstep(0.42, 0.28, abs(d - 0.36 + drift*0.04));
      col = mix(col, uColorB, ring * 0.07 * (0.6 + 0.4 * sin(t*0.3)));
      // grain
      float grain = hash(uv * 400.0 + t*8.0) * 0.015;
      col += grain;
      float alpha = 1.0;
      // fade edges for premium feel
      alpha *= vignette;
      gl_FragColor = vec4(col, alpha);
    }
  `
  return (
    <mesh scale={[2.2, 2.2, 1]}>
      <planeGeometry args={[4, 4, 1, 1]} />
      <shaderMaterial ref={matRef} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent={false} depthWrite={false} />
    </mesh>
  )
}

export function PracticeShader({ isDark }: { isDark?: boolean }) {
  const dark = isDark ?? (typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false)
  // listen to theme changes
  const [isDarkState, setIsDarkState] = useState(dark)
  useEffect(() => {
    const obs = new MutationObserver(() => setIsDarkState(document.documentElement.classList.contains("dark")))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden rounded-[24px] pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1.2], fov: 50 }} dpr={[1, 1.5]} gl={{ alpha: false, antialias: true }} frameloop="always" style={{ background: isDarkState ? "#141416" : "#ffffff" }}>
        <ShaderMesh isDark={isDarkState} />
      </Canvas>
      <div className="absolute inset-0 bg-white/[0.04] dark:bg-black/[0.08] backdrop-blur-[0.5px]" />
    </div>
  )
}
