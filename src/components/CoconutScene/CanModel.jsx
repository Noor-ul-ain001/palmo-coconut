import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, Center } from '@react-three/drei'
import * as THREE from 'three'
import { FLAVOURS } from '../../data/flavours'

const DEFAULT_TEXTURE = '/model/tex/coconutWhite.webp'

export const CanModel = forwardRef(function CanModel(
  { texture = DEFAULT_TEXTURE, upright = true, autoSpin = true, ...rest },
  forwardedRef
) {
  const innerRef = useRef(null)
  const group = forwardedRef ?? innerRef
  const { nodes, materials } = useGLTF('/model/can1.glb')
  const map = useTexture(texture)

  const labelMaterial = useMemo(() => {
    const mat = materials.Etiquette.clone()
    map.colorSpace = THREE.SRGBColorSpace
    map.flipY = true
    map.needsUpdate = true
    mat.map = map
    mat.needsUpdate = true
    return mat
  }, [materials, map])

  useFrame((_, delta) => {
    if (autoSpin && group.current) group.current.rotation.y += delta * 0.35
  })

  return (
    <group ref={group} {...rest}>
      <Center>
        <group
          rotation={upright ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI]}
          scale={upright ? 0.18 : 0.005}
        >
          <mesh geometry={nodes.Shell.geometry} material={labelMaterial} />
          <mesh geometry={nodes.Bottom.geometry} material={materials.Metal} />
          <mesh geometry={nodes.Top.geometry} material={materials.Metal} />
        </group>
      </Center>
    </group>
  )
})

useGLTF.preload('/model/can1.glb')

// Every label is preloaded up front. useTexture suspends on a cache miss, and
// the can sits inside a `fallback={null}` boundary — so without this, changing
// flavour unmounts the can while the new label downloads and it pops back in
// instead of animating through the swap.
useTexture.preload([DEFAULT_TEXTURE, ...FLAVOURS.map((f) => f.texture)])

export default CanModel
