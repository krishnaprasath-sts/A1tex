'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function CustomCursor() {
  const [show, setShow] = useState(true)
  const mountRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Check if it's a touch device
    // Respect user's motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShow(false)
      return
    }

    if (window.matchMedia("(pointer: coarse)").matches) {
      setShow(false)
      return
    }

    if (!mountRef.current) return

    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer
    let earthGroup: THREE.Group, cursorInner: THREE.Group
    let customCursor: THREE.Group

    const mouse = new THREE.Vector2(-100, -100) // start off-screen
    const targetPosition = new THREE.Vector3()
    let isHovering = false
    let animationFrameId: number

    // 1. Scene
    scene = new THREE.Scene()
    
    // 2. Camera setup
    const aspect = window.innerWidth / window.innerHeight
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    camera.position.z = 20

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    // Prevent pointer events on the canvas
    renderer.domElement.style.background = 'transparent'
    renderer.domElement.style.pointerEvents = 'none'
    mountRef.current.appendChild(renderer.domElement)

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4) 
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xfffff0, 1.4)
    directionalLight.position.set(10, 10, 10)
    scene.add(directionalLight)
    
    const blueFillLight = new THREE.PointLight(0xE8C97E, 0.6) // Warm gold fill light
    blueFillLight.position.set(-10, -5, 5)
    scene.add(blueFillLight)

    // 5. Create the Earth Cursor
    earthGroup = new THREE.Group()
    cursorInner = new THREE.Group() 
    earthGroup.add(cursorInner)

    const radius = 1
    const geometry = new THREE.IcosahedronGeometry(radius, 16) 

    const positionAttribute = geometry.attributes.position
    const colors = []
    const color = new THREE.Color()

    function getNoise(x: number, y: number, z: number) {
        let n = Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5) * 0.15
        n += Math.sin(x * 8) * Math.cos(y * 8) * Math.sin(z * 8) * 0.05
        return n
    }

    const v = new THREE.Vector3()

    for ( let i = 0; i < positionAttribute.count; i ++ ) {
        v.fromBufferAttribute( positionAttribute, i )
        const noise = getNoise(v.x, v.y, v.z)
        const isLand = noise > 0
        const finalRadius = isLand ? radius + noise : radius

        v.normalize().multiplyScalar(finalRadius)
        positionAttribute.setXYZ(i, v.x, v.y, v.z)

        if (!isLand) {
            color.setHex(0x6B1A2A) // Burgundy (Oceans)
        } else {
            const elevation = noise
            if (elevation < 0.03) {
                color.setHex(0xC9A84C) // Gold (Lowlands/Beaches)
            } else if (elevation < 0.12) {
                color.setHex(0xE8C97E) // Light Gold (Midlands)
            } else {
                color.setHex(0xF5EDD6) // Ivory/Pale Gold (Mountains)
            }
        }
        colors.push(color.r, color.g, color.b)
    }

    geometry.computeVertexNormals()
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
    })

    const earth = new THREE.Mesh(geometry, material)
    cursorInner.add(earth)

    const atmoGeo = new THREE.SphereGeometry(radius * 1.15, 32, 32)
    const atmoMat = new THREE.MeshPhongMaterial({
        color: 0xC9A84C, // Gold atmosphere
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    })
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat)
    cursorInner.add(atmosphere)

    earthGroup.scale.set(0.35, 0.35, 0.35) // Slightly smaller base size
    scene.add(earthGroup)
    customCursor = earthGroup

    // Hide it initially until first mouse move
    customCursor.visible = false

    // Particle Trail Setup (Magical Gold Dust)
    const particleCount = 25 // reduced from 45 for performance
    const particles: { mesh: THREE.Mesh, active: boolean, life: number, velocity: THREE.Vector3 }[] = []
    
    const particleGeo = new THREE.SphereGeometry(0.12, 8, 8)
    const particleMat = new THREE.MeshBasicMaterial({ 
        color: 0xC9A84C, // Strong solid gold
        transparent: true, 
        opacity: 0.9,
        blending: THREE.NormalBlending, // Normal blending so it shows clearly on light backgrounds
        depthWrite: false
    })

    const trailGroup = new THREE.Group()
    scene.add(trailGroup)

    for (let i = 0; i < particleCount; i++) {
        const mesh = new THREE.Mesh(particleGeo, particleMat)
        mesh.visible = false
        trailGroup.add(mesh)
        particles.push({ mesh, active: false, life: 0, velocity: new THREE.Vector3() })
    }

    let particleIdx = 0
    const lastEmitPos = new THREE.Vector3(-100, -100, 0)

    // 6. Event Listeners
    const onMouseMove = (event: MouseEvent) => {
        customCursor.visible = true
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5)
        vector.unproject(camera)
        const dir = vector.sub(camera.position).normalize()
        const distance = -camera.position.z / dir.z
        const pos = camera.position.clone().add(dir.multiplyScalar(distance))
        
        targetPosition.copy(pos)
        // Adjust center slightly to the bottom right of the cursor point to avoid blocking clicks
        targetPosition.x += 0.3 
        targetPosition.y -= 0.3
    }

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isClickable = !!target.closest('a, button, input, textarea, select, [role="button"], .cursor-pointer, .icon-btn, .action-item, .interactive')
      isHovering = isClickable
    }

    const onWindowResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', onWindowResize, false)
    window.addEventListener('mousemove', onMouseMove, false)
    window.addEventListener('mouseover', onMouseOver, false)

    // 7. Animation Loop
    const animate = () => {
        animationFrameId = requestAnimationFrame(animate)

        if (customCursor && customCursor.visible) {
            customCursor.position.lerp(targetPosition, 0.15)
            cursorInner.rotation.y += 0.005
            cursorInner.rotation.x += 0.002

            if (isHovering) {
                // Shrink to a tiny precision dot on hover so it doesn't block text
                customCursor.scale.lerp(new THREE.Vector3(0.12, 0.12, 0.12), 0.15)
                cursorInner.rotation.y += 0.03 // Spin faster
            } else {
                // Return to normal elegant size
                customCursor.scale.lerp(new THREE.Vector3(0.35, 0.35, 0.35), 0.1)
            }

            // Particle Emission (Only emit if moving and not hovering to keep it clean)
            const dist = lastEmitPos.distanceTo(customCursor.position)
            if (dist > 0.15 && !isHovering) { // increased threshold to reduce particle spawn
                const p = particles[particleIdx]
                p.mesh.position.copy(customCursor.position)
                // Random scatter (tighter trail)
                p.mesh.position.x += (Math.random() - 0.5) * 0.15
                p.mesh.position.y += (Math.random() - 0.5) * 0.15
                
                p.mesh.scale.set(1, 1, 1)
                p.mesh.visible = true
                p.active = true
                p.life = 1.0
                // Float slowly upwards and drift
                p.velocity.set((Math.random() - 0.5) * 0.02, Math.random() * 0.03, 0)
                
                lastEmitPos.copy(customCursor.position)
                particleIdx = (particleIdx + 1) % particleCount
            }

            // Update active particles
            for (let i = 0; i < particleCount; i++) {
                const p = particles[i]
                if (p.active) {
                    p.life -= 0.035 // Fade out faster for shorter trail
                    p.mesh.position.add(p.velocity)
                    const pScale = Math.max(0, p.life)
                    p.mesh.scale.set(pScale, pScale, pScale)
                    
                    if (p.life <= 0) {
                        p.active = false
                        p.mesh.visible = false
                    }
                }
            }
        }

        renderer.render(scene, camera)
    }

    animate()

    // Cleanup
    return () => {
        window.removeEventListener('resize', onWindowResize)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseover', onMouseOver)
        cancelAnimationFrame(animationFrameId)
        if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement)
        }
        geometry.dispose()
        material.dispose()
        atmoGeo.dispose()
        atmoMat.dispose()
        particleGeo.dispose()
        particleMat.dispose()
        renderer.dispose()
    }
  }, [])

  if (!show) return null

  return (
    <div 
      ref={mountRef} 
      aria-hidden="true"
      className="fixed top-0 left-0 w-screen h-screen z-[99999] pointer-events-none"
      style={{ willChange: "transform", transform: "translateZ(0)" }} 
    />
  )
}
