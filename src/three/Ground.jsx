import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { RepeatWrapping, SRGBColorSpace } from 'three'

// Night ground for the castle scenes: rocky terrain with a cobblestone path up
// to the castle. Textures: Poly Haven (CC0), see public/env/CREDITS.txt.
function useTiled(name, repeat) {
  const maps = useTexture({
    map: `/env/${name}_diff.jpg`,
    normalMap: `/env/${name}_nor.jpg`,
    roughnessMap: `/env/${name}_rough.jpg`,
  })
  return useMemo(() => {
    for (const [k, t] of Object.entries(maps)) {
      t.wrapS = t.wrapT = RepeatWrapping
      t.repeat.set(repeat[0], repeat[1])
      if (k === 'map') t.colorSpace = SRGBColorSpace
    }
    return maps
  }, [maps, repeat])
}

const TERRAIN_REPEAT = [40, 40]
const PATH_REPEAT = [3, 14]

// path: the cobblestone road up to the gates (the gates scene only)
export function Ground({ path: showPath = true }) {
  const terrain = useTiled('rocky_terrain_02', TERRAIN_REPEAT)
  const path = useTiled('cobblestone_floor_04', PATH_REPEAT)
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -20]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        {/* never brighter than the castle's baked rock */}
        <meshStandardMaterial {...terrain} color="#3a4356" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -15]} receiveShadow visible={showPath}>
        <planeGeometry args={[7.5, 44]} />
        <meshStandardMaterial {...path} color="#8a8f9c" />
      </mesh>
    </group>
  )
}
