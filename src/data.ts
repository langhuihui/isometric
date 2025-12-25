// ========== 数据定义 ==========

// 模拟动态数据 - 后续可以替换为真实 API
export const mockData = {
  serverInfo: {
    name: 'Monibuca',
    version: 'v5.0.0',
    ip: '10.43.36.49',
    uptime: '35分钟前',
    goVersion: 'go1.24.10',
    os: 'darwin',
    cpu: '12核 arm64'
  },
  storage: {
    diskUsage: 86.6,
    diskTotal: '926GB',
    diskFree: '124GB',
    memoryUsage: 76.8,
    memoryTotal: '32.0GB',
    memoryFree: '7.4GB'
  },
  network: {
    cpuUsage: 0,
    upload: '3.6MB/s',
    download: '3.5MB/s'
  },
  modules: {
    plugins: ['rtmp', 'rtsp', 'hls', 'webrtc', 'record'],
    streams: 5,
    tasks: 3
  },
  upstream: [
    { id: 0, ip: '0.0.0.0' }
  ],
  downstream: [
    { id: 1, ip: '192.168.1.101' },
    { id: 2, ip: '192.168.1.102' }
  ],
  remoteServers: [
    { type: 'rtsp', url: 'rtsp://camera1.local/stream' },
    { type: 'rtmp', url: 'rtmp://source.local/live' }
  ]
}

// 插件模块配置
export const plugins = [
  { name: 'RTMP', x: -60, tooltip: 'RTMP 插件<br>支持 RTMP 推拉流' },
  { name: 'RTSP', x: -40, tooltip: 'RTSP 插件<br>支持 RTSP 推拉流' },
  { name: 'HLS', x: -20, tooltip: 'HLS 插件<br>支持 HLS 切片输出' },
  { name: 'RTC', x: 0, tooltip: 'WebRTC 插件<br>支持 WebRTC 低延迟播放' }
]

// 下级节点配置
export const downstreams = [
  { id: 1, x: -80, name: '下级1', tooltip: '下级节点<br>从本节点拉流的子服务器' },
  { id: 2, x: 80, name: '下级2', tooltip: '下级节点<br>从本节点拉流的子服务器' }
]

// 存储设备配置
export const storages = [
  { id: 1, z: 0, tooltip: '录像存储<br>HLS/FLV/MP4 录像文件' },
  { id: 2, z: 22 },
  { id: 3, z: 44 }
]

// 连接器配置
export const connectors = [
  { from: 'remote-server-1@bottom:mr', to: 'main-shell@bottom:tl', color: '#667eea', animation: 'flow 0.5' },
  { from: 'remote-server-2@bottom:mr', to: 'main-shell@bottom:ml', color: '#667eea', animation: 'flow 0.6' },
  { from: 'nvr-device@bottom:mr', to: 'main-shell@bottom:ml', color: '#00d4ff', route: 'direct', animation: 'flow 0.8' },
  { from: 'main-shell@bottom:bl', to: 'player-1@bottom:mr', color: '#2196F3', animation: 'flow 0.7' },
  { from: 'main-shell@bottom:bl', to: 'player-2@bottom:tr', color: '#2196F3', animation: 'flow 0.6' },
  { from: 'main-shell@bottom:tr', to: 'upstream-server@bottom:ml', color: '#9C27B0', animation: 'flow 0.5' },
  { from: 'main-shell@bottom:mr', to: 'cdn-server@bottom:ml', color: '#E91E63', animation: 'flow 0.7' },
  { from: 'pusher-device@bottom:ml', to: 'main-shell@bottom:mr', color: '#00d4ff', route: 'direct', animation: 'flow 0.8' },
  { from: 'main-shell@bottom:br', to: 'storage-1@bottom:ml', color: '#FF9800', animation: 'flow 0.6' },
  { from: 'main-shell@bottom:bc', to: 'downstream-1@bottom:tc', color: '#00BCD4', route: 'y-x', animation: 'flow 0.5' },
  { from: 'main-shell@bottom:bc', to: 'downstream-2@bottom:tc', color: '#00BCD4', route: 'y-x', animation: 'flow 0.5' }
]

// CPU pins 生成
export const cpuPins = Array(12).fill('<div class="cpu-pin"></div>').join('')

// Memory chips 生成
export const memoryChips = Array(4).fill('<div class="memory-chip"></div>').join('')

// Memory top chips 生成
export const memoryTopChips = Array(6).fill('<div class="memory-chip-top"></div>').join('')

// Memory pins 生成
export const memoryPins = Array(5).fill('<div class="memory-pin"></div>').join('')

// Task buttons 生成
export const taskButtons = [
  '', 'active', '', 'active', '', ''
].map(cls => `<div class="task-button ${cls}"></div>`).join('')

// Task LEDs 生成
export const taskLedRows = [
  ['on', 'on', ''],
  ['warn', 'on', '']
].map(row => 
  `<div class="task-led-row">${row.map(cls => `<div class="task-led ${cls}"></div>`).join('')}</div>`
).join('')

// Task slider fills
export const taskSliderFills = [
  { width: '60%' },
  { width: '30%' }
]

// Log drawers 生成
export const logDrawers = [
  { label: 'INFO' },
  { label: 'WARN' },
  { label: 'ERR' },
  { label: 'DBG' }
].map(d => `
  <div class="log-drawer">
    <div class="log-drawer-handle"></div>
    <span class="log-drawer-label">${d.label}</span>
  </div>`).join('')

// Log drawer sides 生成
export const logDrawerSides = Array(4).fill('<div class="log-drawer-side"></div>').join('')

// PCI-E pins 生成
export const pciePins = Array(3).fill('<div class="plugin-pcie-pin"></div>').join('')

// Server vents 生成
export const serverVents = Array(3).fill('<div class="server-vent"></div>').join('')

// 进度条样式获取
export function getProgressClass(value: number) {
  if (value < 50) return 'low'
  if (value < 80) return 'medium'
  return 'high'
}

// 值样式获取
export function getValueClass(value: number) {
  if (value < 50) return 'success'
  if (value < 80) return 'warning'
  return 'danger'
}

// 生成 CPU 弹窗内容
export function getCpuPopupContent() {
  const cpuUsage = mockData.network.cpuUsage
  return `
    <div class="info-popup-header">
      <div class="info-popup-icon cpu">🔲</div>
      <div>
        <div class="info-popup-title">CPU 处理器</div>
        <div class="info-popup-subtitle">服务器核心计算单元</div>
      </div>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">架构</span>
      <span class="info-popup-value glow-cyan">ARM64</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">核心数</span>
      <span class="info-popup-value glow-cyan">12 核心</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">Go 版本</span>
      <span class="info-popup-value">${mockData.serverInfo.goVersion}</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">操作系统</span>
      <span class="info-popup-value">${mockData.serverInfo.os}</span>
    </div>
    <div class="info-popup-progress">
      <div class="info-popup-row">
        <span class="info-popup-label">CPU 使用率</span>
        <span class="info-popup-value ${getValueClass(cpuUsage)}">${cpuUsage}%</span>
      </div>
      <div class="info-popup-progress-bar">
        <div class="info-popup-progress-fill ${getProgressClass(cpuUsage)}" style="width: ${Math.max(cpuUsage, 5)}%"></div>
      </div>
    </div>
    <div class="info-popup-stats">
      <div class="info-popup-stat">
        <div class="info-popup-stat-value">${mockData.serverInfo.uptime}</div>
        <div class="info-popup-stat-label">运行时间</div>
      </div>
      <div class="info-popup-stat">
        <div class="info-popup-stat-value">${mockData.serverInfo.version}</div>
        <div class="info-popup-stat-label">版本</div>
      </div>
    </div>
  `
}

// 生成内存弹窗内容
export function getMemoryPopupContent() {
  const memUsage = mockData.storage.memoryUsage
  const memUsed = (parseFloat(mockData.storage.memoryTotal) * memUsage / 100).toFixed(1)
  return `
    <div class="info-popup-header">
      <div class="info-popup-icon memory">💾</div>
      <div>
        <div class="info-popup-title">内存 DDR5</div>
        <div class="info-popup-subtitle">高速随机存取存储器</div>
      </div>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">总容量</span>
      <span class="info-popup-value glow-cyan">${mockData.storage.memoryTotal}</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">已使用</span>
      <span class="info-popup-value ${getValueClass(memUsage)}">${memUsed}GB</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">可用</span>
      <span class="info-popup-value glow-green">${mockData.storage.memoryFree}</span>
    </div>
    <div class="info-popup-progress">
      <div class="info-popup-row">
        <span class="info-popup-label">使用率</span>
        <span class="info-popup-value ${getValueClass(memUsage)}">${memUsage}%</span>
      </div>
      <div class="info-popup-progress-bar">
        <div class="info-popup-progress-fill ${getProgressClass(memUsage)}" style="width: ${memUsage}%"></div>
      </div>
    </div>
    <div class="info-popup-stats">
      <div class="info-popup-stat">
        <div class="info-popup-stat-value">4</div>
        <div class="info-popup-stat-label">内存芯片</div>
      </div>
      <div class="info-popup-stat">
        <div class="info-popup-stat-value">5600</div>
        <div class="info-popup-stat-label">频率 MHz</div>
      </div>
    </div>
  `
}

// 生成网卡弹窗内容
export function getNicPopupContent() {
  return `
    <div class="info-popup-header">
      <div class="info-popup-icon network">🌐</div>
      <div>
        <div class="info-popup-title">网络接口</div>
        <div class="info-popup-subtitle">实时网络传输监控</div>
      </div>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">IP 地址</span>
      <span class="info-popup-value glow-cyan">${mockData.serverInfo.ip}</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">上行速率</span>
      <span class="info-popup-value glow-green">↑ ${mockData.network.upload}</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">下行速率</span>
      <span class="info-popup-value glow-blue">↓ ${mockData.network.download}</span>
    </div>
    <div class="info-popup-row">
      <span class="info-popup-label">端口状态</span>
      <span class="info-popup-value glow-green">● 已连接</span>
    </div>
    <div class="info-popup-stats">
      <div class="info-popup-stat">
        <div class="info-popup-stat-value">${mockData.modules.streams}</div>
        <div class="info-popup-stat-label">活跃流</div>
      </div>
      <div class="info-popup-stat">
        <div class="info-popup-stat-value">2</div>
        <div class="info-popup-stat-label">端口数</div>
      </div>
      <div class="info-popup-stat">
        <div class="info-popup-stat-value">1Gbps</div>
        <div class="info-popup-stat-label">带宽</div>
      </div>
    </div>
  `
}

// 更新数据的函数
export function updateData(newData: Partial<typeof mockData>) {
  Object.assign(mockData, newData)
  console.log('Data updated:', mockData)
}

// 扩展 Window 接口
declare global {
  interface Window {
    monibucaData: typeof mockData
    updateMonibucaData: typeof updateData
  }
}

// 暴露到全局，方便调试
if (typeof window !== 'undefined') {
  window.monibucaData = mockData
  window.updateMonibucaData = updateData
}
