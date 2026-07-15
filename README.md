# iso-engine

轻量级 2.5D 等距视图引擎。提供两套渲染路径：

| 路径 | 技术 | 适用 |
|------|------|------|
| **SVG RoundedBox（推荐）** | 正交投影 + 纯 SVG | 水平圆角立方体、组合架构图、发 npm 后命令式拼场景 |
| CSS 3D Web Components | Lit + CSS 3D Transform | 直角立方体、插槽贴面内容、原有 `<iso-scene>` 生态 |

无需 Canvas / WebGL。

## 安装

```bash
pnpm add iso-engine
# 或 npm i iso-engine / yarn add iso-engine
```

```bash
pnpm build   # 本地开发后发版：产出 dist/
npm publish  # 需已登录 npm；包名 iso-engine
```

入口：

```ts
import {
  renderRoundedBox,
  createRoundedBoxSvg,
  projectPoint,
  viewDepth,
  IsoRoundedCube, // 副作用：注册 <iso-rounded-cube>
} from 'iso-engine'
```

## 快速开始（推荐：SVG RoundedBox）

### 单个圆角盒

```js
import { renderRoundedBox } from 'iso-engine'

const { svg } = renderRoundedBox({
  width: 140,
  height: 140,
  depth: 80,
  radius: 28,          // 仅水平圆角；上下棱保持锐利
  rotateX: 60,
  rotateZ: 45,
  shadow: true,
  colors: {
    top: '#7fa8ef',
    front: '#4f7fd9',
    right: '#3763b0',
  },
})

document.getElementById('box').innerHTML = svg
```

### 声明式 Web Component

```html
<script type="module">
  import { IsoRoundedCube } from 'iso-engine'
</script>

<iso-rounded-cube
  width="130" height="130" depth="44" radius="40"
  top-color="#1c1626" front-color="#8a5cf6" right-color="#5b34c4"
  shadow>
</iso-rounded-cube>
```

| 属性 | 说明 |
|------|------|
| `width` / `height` / `depth` | X / Y / Z 尺寸 |
| `radius` | 水平圆角，自动钳制到 `min(W,H)/2` |
| `top-color` / `front-color` / `right-color` | 三面颜色（支持 rgba） |
| `rotate-x` / `rotate-z` | 投影俯仰 / 水平旋转 |
| `shadow` | 地面软阴影 |
| `no-rim` | 关闭顶面边缘高光 |
| `scale` | 显示缩放 |

> `<iso-rounded-cube>` 输出的是**已投影的平面 SVG**，不要再放进 CSS 3D 的 `<iso-scene>` 里（会被二次变换）。

### 组合多个盒子（场景）

`renderRoundedBox` 返回的 `markup` 原点在模型 `(0,0,0)` 的投影处；用 `projectPoint` 摆世界坐标，用 `viewDepth` 做画家算法排序：

```js
import { renderRoundedBox, projectPoint, viewDepth } from 'iso-engine'

const RX = 60, RZ = 45
const nodes = [
  { id: 'a', x: 0, y: 0, z: 0, w: 100, h: 100, d: 60, r: 20,
    colors: { top: '#8fe3b8', front: '#54bd8b', right: '#3a9a6e' } },
  { id: 'b', x: 160, y: 40, z: 0, w: 90, h: 90, d: 70, r: 18,
    colors: { top: '#7fa8ef', front: '#4f7fd9', right: '#3763b0' } },
]

nodes.sort((a, b) =>
  viewDepth(a.x + a.w / 2, a.y + a.h / 2, a.z + a.d / 2, RX, RZ) -
  viewDepth(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2, RX, RZ)
)

const parts = nodes.map((n) => {
  const box = renderRoundedBox({
    width: n.w, height: n.h, depth: n.d, radius: n.r,
    rotateX: RX, rotateZ: RZ, colors: n.colors, id: n.id, shadow: true,
  })
  const [sx, sy] = projectPoint(n.x, n.y, n.z, RX, RZ)
  return `<g transform="translate(${sx} ${sy})">${box.markup}</g>`
})

root.innerHTML = `<svg viewBox="-200 -200 600 500">${parts.join('')}</svg>`
```

遮挡是按整盒排序，适合分离的积木场景；互相穿模或半透明叠层过多时可能不准。

### `renderRoundedBox` API

```ts
function renderRoundedBox(options?: RoundedBoxOptions): RoundedBoxResult
```

**选项（节选）**

| 字段 | 默认 | 说明 |
|------|------|------|
| `width` / `height` / `depth` | 100 | 尺寸 |
| `radius` | 16 | 水平圆角 |
| `colors.top/front/right` | 蓝色系 | 面色 |
| `rotateX` / `rotateZ` | 60 / 45 | 投影角 |
| `gradientStops` | 8 | 侧面渐变采样密度 |
| `rim` | true | 顶边高光 |
| `shadow` | false | 软阴影 |
| `id` | 自动 | 渐变/滤镜 id 前缀（场景内须唯一） |

**返回值**

| 字段 | 说明 |
|------|------|
| `svg` | 完整 `<svg>…</svg>`，可直接 `innerHTML` |
| `markup` | 无外层 svg，便于拼进大场景 |
| `viewBox` | `{ x, y, width, height }` |
| `topPath` | 顶面轮廓 `d`，可裁剪/贴标签 |
| `project(x,y,z)` | 该盒模型坐标 → 本地屏幕坐标 |

另导出：

- `createRoundedBoxSvg(options)` → `SVGSVGElement`
- `projectPoint(x, y, z, rotateX?, rotateZ?)` → `[sx, sy]`
- `viewDepth(x, y, z, rotateX?, rotateZ?)` → number（越大越近）

## CSS 3D 路径（直角立方体 / 插槽内容）

适合面内容用 HTML 插槽、且不需要水平圆角时：

```html
<script type="module">
  import 'iso-engine' // 或分别 import IsoScene / IsoCube / IsoConnector
</script>

<iso-scene center-origin width="800" height="600">
  <iso-cube
    entity-id="box1" x="0" y="0" z="0"
    width="100" height="100" depth="50"
    top-color="#667eea" front-color="#5a67d8" right-color="#4c51bf">
    <div slot="top">顶</div>
    <div slot="front">前</div>
    <div slot="right">右</div>
  </iso-cube>
  <iso-connector
    slot="connectors"
    from="box1@bottom:mr" to="box2@bottom:ml"
    color="#00d4ff" route="x-y" animation="flow">
  </iso-connector>
</iso-scene>
```

命令式：

```js
import { IsometricEngine } from 'iso-engine'

const engine = new IsometricEngine()
const scene = engine.createScene(container, { width: 800, height: 600, centerOrigin: true })
const e1 = engine.createEntity({ x: 0, y: 0, z: 0, width: 100, height: 100, depth: 50 })
scene.addEntity(e1)
```

### 主要自定义元素

- `<iso-scene>` — CSS 3D 场景容器  
- `<iso-cube>` — 直角立方体（slots: `top` / `front` / `right`）  
- `<iso-rounded-cube>` — SVG 圆角盒（见上）  
- `<iso-connector>` — 连线（`from`/`to`、`route`、`animation`、`particles`）  
- `<iso-console-front>` / `<iso-console-right>`、`<iso-plane>`

连线锚点：`entityId@face:position`（face: top/bottom/…；position: tl/tc/tr/ml/mc/mr/bl/bc/br）。  
路由：`auto` | `direct` | `x-y` | `y-x` | …

动态改 CSS 3D 场景视角：

```js
window.dispatchEvent(new CustomEvent('iso-angles-changed', {
  detail: { rotateX: 60, rotateZ: 45, perspective: 0 },
}))
```

## 坐标系统

- **X**：向右下方  
- **Y**：向左下方  
- **Z**：垂直向上  

## 本地开发

```bash
pnpm install
pnpm dev      # http://localhost:5373  — index.html / demo-rounded.html
pnpm build    # 生成 dist/，供 npm 发布
```

## 许可证

MIT
