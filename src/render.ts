import {
  plugins,
  downstreams,
  storages,
  connectors,
  cpuPins,
  memoryChips,
  memoryTopChips,
  memoryPins,
  taskButtons,
  taskLedRows,
  taskSliderFills,
  logDrawers,
  logDrawerSides,
  pciePins,
  serverVents
} from './data'

// 插件卡片 HTML 模板
export function createPluginCard(plugin: any, index: number) {
  return `
    <iso-cube entity-id="plugin-module-${index + 1}" x="${plugin.x}" y="100" z="0"
                width="14" height="40" depth="50"
                top-color="#1a1a2e" front-color="#2d3748" right-color="#1a202c">
      <div slot="top" class="plugin-card-top">
        <div class="plugin-chip">
          <span class="plugin-chip-label">GPU</span>
        </div>
      </div>
      <div slot="front" class="plugin-card-front tooltip-trigger">
        <div class="plugin-fan">
          <div class="plugin-fan-blade"></div>
        </div>
        <span class="plugin-name">${plugin.name}</span>
        <div class="tooltip">${plugin.tooltip}</div>
      </div>
      <div slot="right" class="plugin-card-right">
        <div class="plugin-pcie">${pciePins}</div>
      </div>
    </iso-cube>`
}

// 下级节点 HTML 模板
export function createDownstreamServer(downstream: any) {
  return `
    <iso-cube entity-id="downstream-${downstream.id}" x="${downstream.x}" y="350" z="0" 
                width="60" height="45" depth="70"
                top-color="#e0e0e0" front-color="#f5f5f5" right-color="#d0d0d0">
      <div slot="top" class="server-top">
        <div class="server-led" style="background: #00BCD4; box-shadow: 0 0 4px #00BCD4;"></div>
      </div>
      <div slot="front" class="server-front tooltip-trigger">
        <div class="server-screen">${downstream.name}</div>
        <div class="tooltip">${downstream.tooltip}</div>
      </div>
      <div slot="right" class="server-right">
        <div class="server-vent"></div>
        <div class="server-vent"></div>
      </div>
    </iso-cube>`
}

// 存储设备 HTML 模板
export function createStorageDevice(storage: any, index: number) {
  const hasTooltip = storage.tooltip ? `tooltip-trigger` : ''
  return `
    <iso-cube entity-id="storage-${storage.id}" x="380" y="180" z="${storage.z}" 
                width="70" height="70" depth="20"
                top-color="#78909C" front-color="#90A4AE" right-color="#78909C">
      <div slot="top" class="storage-top"></div>
      <div slot="front" class="storage-front ${hasTooltip}">
        ${index === 0 ? '<div class="storage-disk"></div>' : ''}
        ${storage.tooltip ? `<div class="tooltip">${storage.tooltip}</div>` : ''}
      </div>
      <div slot="right" class="storage-right"></div>
    </iso-cube>`
}

// 连接器 HTML 模板
export function createConnector(conn: any) {
  return `
    <iso-connector 
      slot="connectors"
      from="${conn.from}" to="${conn.to}" 
      color="${conn.color}" width="2" 
      route="${conn.route || 'x-y'}" 
      animation="${conn.animation}">
    </iso-connector>`
}

// 主场景 HTML 模板
export function renderScene() {
  return `
    <!-- ========== 主服务器半透明外壳 ========== -->
    <iso-cube id="main-shell" entity-id="main-shell" x="0" y="0" z="0" 
                width="400" height="360" depth="140"
                top-color="rgba(102, 126, 234, 0.2)" 
                front-color="rgba(255, 255, 255, 0.1)" 
                right-color="rgba(200, 200, 200, 0.1)"
                no-pointer>
      <div slot="top" class="glass-top"></div>
      <div slot="front" class="glass-front"></div>
      <div slot="right" class="glass-right"></div>
    </iso-cube>

    <!-- ========== 主服务器内部模块 ========== -->
    
    <!-- CPU 模块 -->
    <iso-cube entity-id="cpu-module" x="0" y="0" z="10" 
                width="80" height="80" depth="15"
                top-color="#1a1a2e" front-color="#2d3748" right-color="#1a202c">
      <div slot="top" class="cpu-top tooltip-trigger">
        <div class="cpu-info">
          <span class="cpu-arch">ARM64</span>
          <span class="cpu-cores">12 核心</span>
          <span class="cpu-usage">0%</span>
        </div>
        <div class="tooltip">CPU 处理器<br>服务器核心计算单元</div>
      </div>
      <div slot="front" class="cpu-front">
        <div class="cpu-pins">${cpuPins}</div>
      </div>
      <div slot="right" class="cpu-right"></div>
    </iso-cube>

    <!-- 内存模块 -->
    <iso-cube entity-id="memory-module" x="-60" y="-80" z="0" 
                width="80" height="12" depth="35"
                top-color="#1a1a2e" front-color="#2d5016" right-color="#1a3009">
      <div slot="top" class="memory-top tooltip-trigger">
        ${memoryTopChips}
        <span class="memory-label-top">DDR5</span>
        <div class="memory-notch-top"></div>
        <div class="tooltip">内存 32GB<br>已用: 24.6GB / 可用: 7.4GB</div>
      </div>
      <div slot="front" class="memory-front">
        <div class="memory-chips">${memoryChips}</div>
        <span class="memory-info">76.8%</span>
      </div>
      <div slot="right" class="memory-right">
        <div class="memory-pins">${memoryPins}</div>
      </div>
    </iso-cube>

    <!-- 网卡模块 -->
    <iso-cube entity-id="nic-module" x="120" y="-100" z="0" 
                width="60" height="25" depth="45"
                top-color="#37474F" front-color="#455A64" right-color="#37474F">
      <div slot="top" class="nic-top">
        <div class="nic-port"></div>
        <div class="nic-port"></div>
      </div>
      <div slot="front" class="nic-front tooltip-trigger">
        <div class="nic-speed"><span class="nic-arrow-up">↑</span>3.6MB/s</div>
        <div class="nic-speed"><span class="nic-arrow-down">↓</span>3.5MB/s</div>
        <div class="tooltip">网络接口<br>实时网络传输速率</div>
      </div>
      <div slot="right" class="nic-right">
        <div class="nic-led green"></div>
        <div class="nic-led orange"></div>
      </div>
    </iso-cube>

    <!-- 插件模块 -->
    ${plugins.map((p, i) => createPluginCard(p, i)).join('')}

    <!-- 流模块 -->
    <iso-cube entity-id="stream-module" x="120" y="100" z="0" 
                width="50" height="50" depth="40"
                top-color="#2196F3" front-color="#fff" right-color="#e0e0e0">
      <div slot="top" class="inner-module-top stream-top"></div>
      <div slot="front" class="inner-module-front stream-front tooltip-trigger">
        <span class="module-icon">📡</span>
        <span class="module-label">流</span>
        <div class="tooltip">流管理<br>查看和管理所有活跃的媒体流</div>
      </div>
      <div slot="right" class="inner-module-right stream-right"></div>
    </iso-cube>

    <!-- 任务模块 -->
    <iso-cube entity-id="task-module" x="60" y="100" z="0" 
                width="60" height="50" depth="40"
                top-color="#1a1a2e" front-color="#2d3748" right-color="#1a202c">
      <div slot="top" class="task-top tooltip-trigger">
        ${taskButtons}
        <div class="tooltip">任务调度<br>管理拉流、转推等后台任务</div>
      </div>
      <div slot="front" class="task-front">
        ${taskSliderFills.map(f => `<div class="task-slider"><div class="task-slider-fill" style="width: ${f.width};"></div></div>`).join('')}
        <div class="task-knob-row">
          <div class="task-knob"></div><div class="task-knob"></div><div class="task-knob"></div>
        </div>
      </div>
      <div slot="right" class="task-right">
        ${taskLedRows}
      </div>
    </iso-cube>

    <!-- 日志模块 -->
    <iso-cube entity-id="log-module" x="0" y="-100" z="0" 
                width="60" height="50" depth="50"
                top-color="#455A64" front-color="#546E7A" right-color="#37474F">
      <div slot="top" class="log-top">
        <div class="log-handle-top"></div>
      </div>
      <div slot="front" class="log-front tooltip-trigger">
        ${logDrawers}
        <div class="tooltip">系统日志<br>实时查看服务器运行日志</div>
      </div>
      <div slot="right" class="log-right">
        ${logDrawerSides}
      </div>
    </iso-cube>

    <!-- 主服务器底座 -->
    <iso-cube entity-id="main-platform" x="0" y="0" z="-20" 
                width="420" height="380" depth="20"
                top-color="#444" front-color="#333" right-color="#2a2a2a">
      <div slot="top" class="platform-top"></div>
      <div slot="front" class="platform-front"></div>
      <div slot="right" class="platform-right"></div>
    </iso-cube>

    <!-- ========== 左上 - 远端服务器 ========== -->
    <iso-cube entity-id="remote-server-1" x="-400" y="-250" z="0" 
                width="70" height="50" depth="90"
                top-color="#e0e0e0" front-color="#f5f5f5" right-color="#d0d0d0">
      <div slot="top" class="server-top">
        <div class="server-led"></div>
        <div class="server-led" style="background: #2196F3; box-shadow: 0 0 4px #2196F3;"></div>
      </div>
      <div slot="front" class="server-front tooltip-trigger">
        <div class="server-screen">RTSP://</div>
        <div class="tooltip">远端服务器<br>拉流代理：主动从远端拉取流</div>
      </div>
      <div slot="right" class="server-right">${serverVents}</div>
    </iso-cube>

    <iso-cube entity-id="remote-server-2" x="-400" y="-160" z="0" 
                width="70" height="50" depth="90"
                top-color="#e0e0e0" front-color="#f5f5f5" right-color="#d0d0d0">
      <div slot="top" class="server-top">
        <div class="server-led"></div>
      </div>
      <div slot="front" class="server-front tooltip-trigger">
        <div class="server-screen">RTMP://</div>
        <div class="tooltip">远端服务器<br>拉流代理：主动从远端拉取流</div>
      </div>
      <div slot="right" class="server-right">${serverVents}</div>
    </iso-cube>

    <!-- ========== 左中 - 推流器 (NVR/摄像头) ========== -->
    <iso-cube entity-id="nvr-device" x="-380" y="20" z="0" 
                width="60" height="60" depth="50"
                top-color="#37474F" front-color="#455A64" right-color="#37474F">
      <div slot="top" class="nvr-top">
        <span class="nvr-label">NVR</span>
      </div>
      <div slot="front" class="nvr-front tooltip-trigger">
        <div class="nvr-lens"></div>
        <div class="tooltip">NVR / 摄像头<br>通过 RTSP/RTMP 推流到服务器</div>
      </div>
      <div slot="right" class="nvr-right"></div>
    </iso-cube>

    <!-- ========== 左下 - 播放器群组 ========== -->
    <iso-cube entity-id="player-1" x="-400" y="200" z="0" 
                width="55" height="55" depth="45"
                top-color="#424242" front-color="#616161" right-color="#424242">
      <div slot="top" class="player-top"></div>
      <div slot="front" class="player-front tooltip-trigger">
        <div class="player-screen">
          <div class="player-icon"></div>
        </div>
        <div class="tooltip">播放器<br>VLC/ffplay 等客户端播放</div>
      </div>
      <div slot="right" class="player-right"></div>
    </iso-cube>

    <iso-cube entity-id="player-2" x="-400" y="280" z="0" 
                width="55" height="55" depth="45"
                top-color="#424242" front-color="#616161" right-color="#424242">
      <div slot="top" class="player-top"></div>
      <div slot="front" class="player-front tooltip-trigger">
        <div class="player-screen">
          <div class="player-icon"></div>
        </div>
        <div class="tooltip">Web 播放器<br>Jessibuca/WebRTC 播放</div>
      </div>
      <div slot="right" class="player-right"></div>
    </iso-cube>

    <!-- ========== 右上 - 上级节点/CDN ========== -->
    <iso-cube entity-id="upstream-server" x="380" y="-250" z="0" 
                width="70" height="50" depth="90"
                top-color="#e0e0e0" front-color="#f5f5f5" right-color="#d0d0d0">
      <div slot="top" class="server-top">
        <div class="server-led" style="background: #9C27B0; box-shadow: 0 0 4px #9C27B0;"></div>
      </div>
      <div slot="front" class="server-front tooltip-trigger">
        <div class="server-screen">上级节点</div>
        <div class="tooltip">上级 M7S 节点<br>级联架构中的父节点</div>
      </div>
      <div slot="right" class="server-right">${serverVents}</div>
    </iso-cube>

    <iso-cube entity-id="cdn-server" x="380" y="-150" z="0" 
                width="70" height="50" depth="90"
                top-color="#e0e0e0" front-color="#f5f5f5" right-color="#d0d0d0">
      <div slot="top" class="server-top">
        <div class="server-led" style="background: #E91E63; box-shadow: 0 0 4px #E91E63;"></div>
      </div>
      <div slot="front" class="server-front tooltip-trigger">
        <div class="server-screen">CDN</div>
        <div class="tooltip">远端 CDN<br>转推到第三方 CDN 服务</div>
      </div>
      <div slot="right" class="server-right">${serverVents}</div>
    </iso-cube>

    <!-- ========== 右中 - 推流器设备 ========== -->
    <iso-cube entity-id="pusher-device" x="380" y="20" z="0" 
                width="60" height="60" depth="50"
                top-color="#37474F" front-color="#455A64" right-color="#37474F">
      <div slot="top" class="nvr-top">
        <span class="nvr-label">OBS</span>
      </div>
      <div slot="front" class="nvr-front tooltip-trigger">
        <div class="nvr-lens"></div>
        <div class="tooltip">推流器<br>OBS/ffmpeg 等工具推流</div>
      </div>
      <div slot="right" class="nvr-right"></div>
    </iso-cube>

    <!-- ========== 右下 - 存储设备 ========== -->
    ${storages.map((s, i) => createStorageDevice(s, i)).join('')}

    <!-- ========== 中下 - 下级节点 ========== -->
    ${downstreams.map(d => createDownstreamServer(d)).join('')}

    <!-- ========== 操作台演示 ========== -->
    <iso-console-front entity-id="control-console-front" x="-100" y="-350" z="0"
                 width="120" height="80" depth="60"
                 top-color="#1a1a2e" front-color="#2d3748" right-color="#1a202c">
      <div slot="top" class="tooltip-trigger" style="width:100%;height:100%;background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border:1px solid #00d4ff;">
        <span style="font-size:10px;color:#00d4ff;font-weight:bold;">控制台</span>
        <span style="font-size:8px;color:#888;margin-top:2px;">FRONT</span>
        <div class="tooltip">操作控制台<br>facing="front" 向前倾斜</div>
      </div>
    </iso-console-front>

    <iso-console-right entity-id="control-console-right" x="100" y="-350" z="0"
                 width="120" height="80" depth="60"
                 top-color="#1a1a2e" front-color="#2d3748" right-color="#2d3748">
      <div slot="top" class="tooltip-trigger" style="width:100%;height:100%;background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;border:1px solid #9C27B0;">
        <span style="font-size:10px;color:#9C27B0;font-weight:bold;">控制台</span>
        <span style="font-size:8px;color:#888;margin-top:2px;">RIGHT</span>
        <div class="tooltip">操作控制台<br>facing="right" 向右倾斜</div>
      </div>
    </iso-console-right>

    <!-- ========== 连接线 ========== -->
    ${connectors.map(c => createConnector(c)).join('')}
  `
}
