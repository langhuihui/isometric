# Isometric Engine

一个轻量级的 2.5D 等距视图引擎，基于 CSS 3D Transform 和 Lit Web Components 构建。

## 特性

- 🎨 **纯 CSS 3D 渲染** - 基于 CSS 3D Transform，无需 Canvas/WebGL，性能优异
- 🧩 **声明式组件** - 提供 Web Components，支持 HTML 声明式使用
- 📦 **命令式 API** - 同时支持 JavaScript 命令式创建和管理
- 🔗 **智能连线** - 支持实体间连线，多种路由算法，流动动画
- 💡 **光影系统** - 内置光照效果和阴影
- 🎭 **特效系统** - 可扩展的特效管理器
- 📐 **灵活布局** - 支持等距坐标和网格坐标两种定位方式

## 安装

```bash
pnpm install isometric-engine
```

## 快速开始

### 声明式使用（Web Components）

```html
<script type="module">
  import 'isometric-engine'
</script>

<iso-scene center-origin width="800" height="600">
  <!-- 创建一个立方体实体 -->
  <iso-cube 
    entity-id="box1" 
    x="0" y="0" z="0" 
    width="100" height="100" depth="50"
    top-color="#667eea" 
    front-color="#5a67d8" 
    right-color="#4c51bf">
    <div slot="top">顶面内容</div>
    <div slot="front">前面内容</div>
    <div slot="right">右面内容</div>
  </iso-cube>

  <!-- 创建另一个实体 -->
  <iso-cube 
    entity-id="box2" 
    x="200" y="100" z="0" 
    width="80" height="80" depth="60">
  </iso-cube>

  <!-- 连接两个实体 -->
  <iso-connector 
    slot="connectors"
    from="box1" to="box2" 
    from-anchor="bottom:mr" 
    to-anchor="bottom:ml"
    color="#00d4ff" width="2" 
    route="x-y" 
    corner-radius="12"
    animation="flow">
  </iso-connector>
</iso-scene>
```

### 命令式使用（JavaScript API）

```javascript
import { IsometricEngine } from 'isometric-engine'

// 创建引擎实例
const engine = new IsometricEngine()

// 创建场景
const scene = engine.createScene(document.getElementById('container'), {
  width: 800,
  height: 600,
  centerOrigin: true
})

// 创建实体
const entity1 = engine.createEntity({
  x: 0, y: 0, z: 0,
  width: 100, height: 100, depth: 50,
  colors: {
    top: '#667eea',
    front: '#5a67d8',
    right: '#4c51bf'
  }
})

const entity2 = engine.createEntity({
  x: 200, y: 100, z: 0,
  width: 80, height: 80, depth: 60
})

// 添加到场景
scene.addEntity(entity1)
scene.addEntity(entity2)

// 创建连线
const connector = engine.createConnector(entity1, entity2, {
  color: '#00d4ff',
  width: 2,
  animated: true
})
engine.addConnectorToScene(connector, scene)
```

## 核心组件

### `<iso-scene>` 场景容器

场景是所有等距元素的容器，负责 3D 变换和坐标系统。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `width` | number | 800 | 场景宽度（px） |
| `height` | number | 500 | 场景高度（px） |
| `center-origin` | boolean | false | 是否将原点居中 |
| `origin-x` | number | 0 | 原点 X 偏移 |
| `origin-y` | number | 0 | 原点 Y 偏移 |
| `perspective` | number | 0 | 透视距离（0 为正交投影） |

### `<iso-cube>` 等距实体

基础的 3D 立方体实体，支持自定义各面内容。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `entity-id` | string | '' | 实体唯一标识 |
| `x` | number | 0 | 等距 X 坐标 |
| `y` | number | 0 | 等距 Y 坐标 |
| `z` | number | 0 | 等距 Z 坐标（高度） |
| `width` | number | 100 | 宽度 |
| `height` | number | 100 | 高度（深度方向） |
| `depth` | number | 50 | 深度（垂直方向） |
| `top-color` | string | '#ccc' | 顶面颜色 |
| `front-color` | string | '#aaa' | 前面颜色 |
| `right-color` | string | '#888' | 右面颜色 |
| `no-pointer` | boolean | false | 禁用鼠标事件 |
| `row` | number | null | 网格行（可选） |
| `col` | number | null | 网格列（可选） |
| `grid-size` | number | 30 | 网格单元大小 |

**插槽（Slots）：**
- `top` - 顶面内容
- `front` - 前面内容
- `right` - 右面内容

### `<iso-cube>` 简化立方体

预设样式的立方体组件，继承自 `iso-cube`。

### `<iso-console>` 控制台面板

带倾斜面板的控制台组件，适合展示仪表盘、控制面板等。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tilt` | number | 30 | 面板倾斜角度 |
| `facing` | 'front' \| 'right' | 'front' | 面板朝向 |

### `<iso-plane>` 平面

单一平面组件，可用于地板、墙面等。

### `<iso-connector>` 连线

连接两个实体的连线组件，支持多种路由和动画效果。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `from` | string | - | 起始实体 ID |
| `to` | string | - | 目标实体 ID |
| `from-anchor` | string | 'top:mc' | 起始锚点（格式：`face:position`） |
| `to-anchor` | string | 'top:mc' | 目标锚点（格式：`face:position`） |
| `color` | string | '#00d4ff' | 连线颜色 |
| `width` | number | 2 | 连线宽度 |
| `line-style` | string | 'solid' | 线条样式：`solid` / `dashed` / `dotted` |
| `route` | string | 'auto' | 路由类型 |
| `corner-radius` | number | 8 | 转角圆角 |
| `perpendicular-length` | number | 0 | 垂直延伸距离 |
| `animation` | string | 'none' | 动画类型：`none` / `flow` / `pulse` / `glow` |
| `animate-speed` | number | 1 | 动画速度 |
| `particles` | boolean | false | 是否启用粒子效果 |
| `particle-color` | string | '' | 粒子颜色（默认使用连线颜色） |
| `particle-size` | number | 8 | 粒子大小 |
| `particle-rate` | number | 2 | 粒子发射频率（每秒） |
| `particle-speed` | number | 0.5 | 粒子移动速度 |
| `particle-effect` | string | 'glow' | 粒子特效：`none` / `glow` / `trail` / `pulse` / `rainbow` / `spark` |
| `particle-direction` | string | 'forward' | 粒子方向：`forward` / `backward` / `bidirectional` |

**锚点格式：** `face:position`
- **面类型（face）：** `top` | `bottom` | `front` | `back` | `left` | `right`
- **位置类型（position）：** 
  - `tl` (top-left) | `tc` (top-center) | `tr` (top-right)
  - `ml` (middle-left) | `mc` (middle-center) | `mr` (middle-right)
  - `bl` (bottom-left) | `bc` (bottom-center) | `br` (bottom-right)

**示例：** `from-anchor="bottom:mr"` 表示从实体底面的右中位置连接

**路由类型：** `auto` | `direct` | `x-y` | `y-x` | `x-z` | `z-x` 等轴组合

## 坐标系统

引擎使用等距坐标系统：

- **X 轴**：向右下方延伸
- **Y 轴**：向左下方延伸
- **Z 轴**：垂直向上

```
        Z
        |
        |
        +------ X
       /
      /
     Y
```

## 动态更新角度

可以通过全局事件动态调整等距视角：

```javascript
window.dispatchEvent(new CustomEvent('iso-angles-changed', {
  detail: { 
    rotateX: 60,    // 俯视角度
    rotateZ: 45,    // 旋转角度
    perspective: 0  // 透视距离（0 为正交）
  }
}))
```

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build
```

## 项目结构

```
src/
├── components/       # 组件
│   ├── IsoScene.ts      # 场景组件
│   ├── IsoEntity.ts     # 实体基类
│   ├── IsoCube.ts       # 立方体组件
│   ├── IsoConsole.ts    # 控制台组件
│   ├── IsoPlane.ts      # 平面组件
│   ├── IsoConnector.ts  # 连线组件
│   ├── Entity.ts        # 命令式实体
│   ├── Connector.ts     # 命令式连线
│   └── ...
├── core/             # 核心模块
│   ├── IsometricEngine.ts  # 引擎主类
│   ├── Scene.ts           # 场景类
│   ├── Transform.ts       # 变换工具
│   └── BaseComponent.ts   # 组件基类
├── effects/          # 特效系统
│   ├── EffectManager.ts   # 特效管理器
│   └── LightingSystem.ts  # 光影系统
├── events/           # 事件系统
├── utils/            # 工具函数
├── constants/        # 常量定义
├── types/            # 类型定义
└── index.ts          # 入口文件
```

## 许可证

MIT
