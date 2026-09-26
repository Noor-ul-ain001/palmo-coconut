import { useThree } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import { MathUtils } from 'three'
import { MilkSurface } from './MilkSurface'
import { CanModel } from './CanModel'

const deg = MathUtils.degToRad

// Both halves of the model sit in a rig rotated this far about Z. The scroll
// controller needs it to work out how far to counter-rotate the can so it
// stands upright, so it is exported rather than buried inline.
export const RIG_Z = deg(-30)

export function CoconutModel({ coconut, coconutWithWater, coconutEmpty, coconutMilk, can }) {
  const { nodes, materials } = useGLTF('/model/coconut.glb')
  const width = useThree((s) => s.size.width)

  return (
    <group ref={coconut} scale={width <= 1025 ? 7 : 12} dispose={null}>
      <group rotation={[deg(180), deg(180), RIG_Z]}>
        <CanModel ref={can} position={[0.01, 0, 0]} rotation={[-deg(90), -deg(90), 0]} autoSpin={false} />
      </group>
      <Center>
        <group rotation={[deg(180), deg(180), RIG_Z]}>
          <group ref={coconutWithWater} name="left-side-coconut">
            <group ref={coconutMilk} position={[-0.02, 0, 0]}>
              <MilkSurface geometry={nodes.milk.geometry} malaiColor="#E8DCC8" />
            </group>
            <mesh
              castShadow
              receiveShadow
              name="left-side-shell"
              geometry={nodes.Roundcube001.geometry}
              material={materials['Material.002']}
            />
            <mesh
              castShadow
              receiveShadow
              name="left-side-malai"
              geometry={nodes.Roundcube001_1.geometry}
              material={materials['dalam kelapa.001']}
              scale={0.995}
            />
          </group>
          <group ref={coconutEmpty} name="right-side-coconut">
            <mesh
              castShadow
              receiveShadow
              name="right-side"
              geometry={nodes.Roundcube002.geometry}
              material={materials['Material.002']}
            />
            <mesh
              castShadow
              receiveShadow
              name="right-side-malai"
              geometry={nodes.Roundcube002_1.geometry}
              material={materials['dalam kelapa.001']}
            />
          </group>
        </group>
      </Center>
    </group>
  )
}

useGLTF.preload('/model/coconut.glb')

export default CoconutModel
