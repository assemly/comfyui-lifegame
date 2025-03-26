// 生命游戏UI模板

// 生命游戏图标SVG
export const LIFEGAME_ICON_SVG = `
<svg viewBox="0 0 24 24" width="20" height="20">
  <defs>
    <linearGradient id="lifegameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4CAF50" />
      <stop offset="100%" stop-color="#2196F3" />
    </linearGradient>
  </defs>
  <g stroke="none" fill="url(#lifegameGradient)">
    <!-- 外框 -->
    <path d="M20,2H4C2.9,2 2,2.9 2,4V20C2,21.1 2.9,22 4,22H20C21.1,22 22,21.1 22,20V4C22,2.9 21.1,2 20,2M20,20H4V4H20V20Z" />
    <!-- 3x3网格生命游戏细胞 -->
    <rect x="5" y="5" width="3" height="3" rx="0.5" />
    <rect x="10.5" y="5" width="3" height="3" rx="0.5" />
    <rect x="16" y="5" width="3" height="3" rx="0.5" />
    
    <rect x="5" y="10.5" width="3" height="3" rx="0.5" />
    <rect x="10.5" y="10.5" width="3" height="3" rx="0.5" opacity="0.6" />
    <rect x="16" y="10.5" width="3" height="3" rx="0.5" />
    
    <rect x="5" y="16" width="3" height="3" rx="0.5" />
    <rect x="10.5" y="16" width="3" height="3" rx="0.5" />
    <rect x="16" y="16" width="3" height="3" rx="0.5" opacity="0.6" />
  </g>
</svg>
`;

// 生命游戏切换按钮模板
export const LIFEGAME_BUTTON_TEMPLATE = (svgIcon) => `
<div class="lifegame-icon">${svgIcon}</div>
<span>生命游戏</span>
`;

// 固定图标SVG
export const PIN_ICON_SVG = `
<svg viewBox="0 0 24 24" width="16" height="16">
  <path fill="currentColor" d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
</svg>
`;

// 关闭图标SVG
export const CLOSE_ICON_SVG = `
<svg viewBox="0 0 24 24" width="16" height="16">
  <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
</svg>
`;

// 生命游戏面板头部模板
export const LIFEGAME_HEADER_TEMPLATE = `
<div class="lifegame-title">生命游戏控制面板</div>
<div class="lifegame-header-buttons">
  <button class="lifegame-pin-btn" title="固定位置">
    ${PIN_ICON_SVG}
  </button>
  <button class="lifegame-close-btn" title="关闭面板">
    ${CLOSE_ICON_SVG}
  </button>
</div>
`;

// 生命游戏面板内容模板
export const LIFEGAME_CONTENT_TEMPLATE = `
<div id="lifegame-preview" class="lifegame-preview">
  <img id="lifegame-preview-img" class="lifegame-preview-img" src="" alt="生命游戏预览">
</div>
<div id="lifegame-status" class="lifegame-status">状态: 已停止</div>
<div class="lifegame-settings">
  <div class="lifegame-control-group">
    <label for="lifegame-preset">预设图案:</label>
    <select id="lifegame-preset" class="lifegame-select">
      <option value="">请选择预设...</option>
      <!-- 预设选项将通过JS动态添加 -->
    </select>
    <button id="lifegame-load-preset" class="lifegame-button lifegame-button-small">加载</button>
  </div>
  <div class="lifegame-control-group">
    <label for="lifegame-density">随机密度:</label>
    <input type="range" id="lifegame-density" min="0.1" max="0.9" step="0.1" value="0.3" class="lifegame-slider">
    <span id="lifegame-density-value">0.3</span>
  </div>
  <div class="lifegame-control-group">
    <label for="lifegame-speed">更新速度:</label>
    <input type="range" id="lifegame-speed" min="0.01" max="1" step="0.01" value="0.1" class="lifegame-slider">
    <span id="lifegame-speed-value">0.1秒</span>
  </div>
</div>
<div class="lifegame-button-container">
  <button class="lifegame-button lifegame-button-start">开始</button>
  <button class="lifegame-button lifegame-button-stop">停止</button>
  <button class="lifegame-button lifegame-button-random">随机</button>
  <button class="lifegame-button lifegame-button-clear">清空</button>
</div>
`; 