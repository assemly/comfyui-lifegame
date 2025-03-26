// 生命游戏UI创建与管理

import { api } from "../../scripts/api.js";
import {
    LIFEGAME_ICON_SVG,
    LIFEGAME_BUTTON_TEMPLATE,
    LIFEGAME_HEADER_TEMPLATE,
    LIFEGAME_CONTENT_TEMPLATE
} from "./templates.js";

import {
    loadPanelPosition,
    savePanelPosition,
    initDraggable,
    updatePinButton
} from "./utils.js";

// 预览更新的定时器ID
let previewUpdateInterval = null;
// 连续失败次数
let failureCount = 0;
// 最大连续失败次数，超过此数将暂停更新
const MAX_FAILURES = 5;
// 是否显示调试信息
const DEBUG = false;

/**
 * 创建生命游戏控制面板UI
 * @returns {HTMLElement} 菜单按钮元素
 */
export function createLifeGameUI() {
    // 创建主容器
    const container = document.createElement('div');
    container.id = 'lifegame-container';
    container.className = 'lifegame-container';
    
    // 添加标题栏（同时作为拖动区域）
    const headerDiv = document.createElement('div');
    headerDiv.className = 'lifegame-header';
    headerDiv.innerHTML = LIFEGAME_HEADER_TEMPLATE;
    container.appendChild(headerDiv);
    
    // 添加内容区域
    const contentDiv = document.createElement('div');
    contentDiv.className = 'lifegame-content';
    contentDiv.innerHTML = LIFEGAME_CONTENT_TEMPLATE;
    container.appendChild(contentDiv);
    
    // 添加到页面
    document.body.appendChild(container);
    
    // 从localStorage加载面板位置
    loadPanelPosition(container);
    
    // 是否已固定面板位置
    let isPinned = localStorage.getItem('lifegame_panel_pinned') === 'true';
    
    // 如果已固定，添加锁定样式到面板
    if (isPinned) {
        container.classList.add('locked');
        headerDiv.classList.add('locked');
    }
    
    // 获取按钮元素
    const pinButton = headerDiv.querySelector('.lifegame-pin-btn');
    const closeButton = headerDiv.querySelector('.lifegame-close-btn');
    const startButton = contentDiv.querySelector('.lifegame-button-start');
    const stopButton = contentDiv.querySelector('.lifegame-button-stop');
    const randomButton = contentDiv.querySelector('.lifegame-button-random');
    const clearButton = contentDiv.querySelector('.lifegame-button-clear');
    
    // 获取预设和控制元素
    const presetSelect = contentDiv.querySelector('#lifegame-preset');
    const loadPresetButton = contentDiv.querySelector('#lifegame-load-preset');
    const densitySlider = contentDiv.querySelector('#lifegame-density');
    const densityValue = contentDiv.querySelector('#lifegame-density-value');
    const speedSlider = contentDiv.querySelector('#lifegame-speed');
    const speedValue = contentDiv.querySelector('#lifegame-speed-value');
    
    // 初始化预设和控制元素
    initPresetSelector(presetSelect);
    
    // 初始化面板拖动功能
    const dragHandlers = initDraggable(container, headerDiv, isPinned, savePanelPosition);
    
    // 更新固定按钮状态
    updatePinButton(isPinned, pinButton, headerDiv);
    
    // 固定按钮点击事件
    pinButton.addEventListener('click', (e) => {
        e.stopPropagation();
        isPinned = !isPinned;
        localStorage.setItem('lifegame_panel_pinned', isPinned.toString());
        updatePinButton(isPinned, pinButton, headerDiv);
        
        // 根据固定状态启用或禁用拖动功能
        if (isPinned) {
            dragHandlers.disable();
            headerDiv.classList.add('locked');
            container.classList.add('locked');
        } else {
            dragHandlers.enable();
            headerDiv.classList.remove('locked');
            container.classList.remove('locked');
        }
    });
    
    // 创建一个包含按钮的包装器（用于菜单中显示的按钮）
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'lifegame-btn-wrapper';
    
    // 创建切换按钮
    const toggleButton = document.createElement('button');
    toggleButton.id = 'lifegame-toggle';
    toggleButton.className = 'lifegame-toggle-button';
    toggleButton.title = '生命游戏';
    toggleButton.innerHTML = LIFEGAME_BUTTON_TEMPLATE(LIFEGAME_ICON_SVG);
    buttonWrapper.appendChild(toggleButton);
    
    // 切换监控面板显示/隐藏
    let isPanelVisible = localStorage.getItem('lifegame_panel_visible') === 'true';
    
    // 如果上次是显示状态，则立即显示面板
    if (isPanelVisible) {
        container.style.display = 'block';
        startPreviewUpdate();
    } else {
        container.style.display = 'none';
    }
    
    // 关闭按钮点击事件
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        container.style.display = 'none';
        isPanelVisible = false;
        stopPreviewUpdate();
        localStorage.setItem('lifegame_panel_visible', 'false');
    });
    
    // 切换按钮点击事件
    toggleButton.addEventListener('click', () => {
        isPanelVisible = !isPanelVisible;
        localStorage.setItem('lifegame_panel_visible', isPanelVisible.toString());
        container.style.display = isPanelVisible ? 'block' : 'none';
        
        if (isPanelVisible) {
            startPreviewUpdate();
        } else {
            stopPreviewUpdate();
        }
    });
    
    // 开始按钮点击事件
    startButton.addEventListener('click', async () => {
        try {
            await api.fetchApi('/lifegame/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            updateStatus('状态: 运行中');
            resetFailureCount(); // 重置失败计数
        } catch (error) {
            if (DEBUG) console.error('启动游戏失败:', error);
            updateStatus('状态: 无法连接到服务器');
        }
    });
    
    // 停止按钮点击事件
    stopButton.addEventListener('click', async () => {
        try {
            await api.fetchApi('/lifegame/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            updateStatus('状态: 已停止');
            resetFailureCount(); // 重置失败计数
        } catch (error) {
            if (DEBUG) console.error('停止游戏失败:', error);
            updateStatus('状态: 无法连接到服务器');
        }
    });
    
    // 加载预设按钮点击事件
    loadPresetButton.addEventListener('click', async () => {
        const selectedPreset = presetSelect.value;
        if (!selectedPreset) return;
        
        try {
            await api.fetchApi('/lifegame/load_preset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    preset_name: selectedPreset
                })
            });
            updatePreview();
            updateStatus(`状态: 已加载预设 ${selectedPreset}`);
            resetFailureCount();
        } catch (error) {
            if (DEBUG) console.error('加载预设失败:', error);
            updateStatus('状态: 无法加载预设');
        }
    });
    
    // 密度滑块变化事件
    densitySlider.addEventListener('input', () => {
        densityValue.textContent = densitySlider.value;
    });
    
    // 速度滑块变化事件
    speedSlider.addEventListener('input', () => {
        speedValue.textContent = `${speedSlider.value}秒`;
    });
    
    // 随机初始化按钮点击事件
    randomButton.addEventListener('click', async () => {
        try {
            await api.fetchApi('/lifegame/random_init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    density: parseFloat(densitySlider.value)
                })
            });
            updatePreview();
            updateStatus('状态: 已随机初始化');
            resetFailureCount();
        } catch (error) {
            if (DEBUG) console.error('随机初始化失败:', error);
            updateStatus('状态: 无法连接到服务器');
        }
    });
    
    // 更新速度按钮点击事件
    speedSlider.addEventListener('change', async () => {
        try {
            await api.fetchApi('/lifegame/set_interval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    interval: parseFloat(speedSlider.value)
                })
            });
            updateStatus(`状态: 更新间隔设为 ${speedSlider.value}秒`);
        } catch (error) {
            if (DEBUG) console.error('设置更新间隔失败:', error);
            updateStatus('状态: 无法连接到服务器');
        }
    });
    
    // 清空按钮点击事件
    clearButton.addEventListener('click', async () => {
        try {
            await api.fetchApi('/lifegame/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            updatePreview();
            resetFailureCount(); // 重置失败计数
        } catch (error) {
            if (DEBUG) console.error('清空游戏失败:', error);
            updateStatus('状态: 无法连接到服务器');
        }
    });
    
    return buttonWrapper;
}

/**
 * 初始化预设选择器
 * @param {HTMLSelectElement} selectElement 预设选择器元素
 */
async function initPresetSelector(selectElement) {
    if (!selectElement) return;
    
    try {
        const response = await api.fetchApi('/lifegame/presets');
        const data = await response.json();
        
        if (data.status === 'success' && Array.isArray(data.presets)) {
            // 清空已有选项(保留第一个默认选项)
            while (selectElement.options.length > 1) {
                selectElement.remove(1);
            }
            
            // 添加预设选项
            data.presets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset;
                option.textContent = formatPresetName(preset);
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        if (DEBUG) console.error('获取预设列表失败:', error);
    }
}

/**
 * 格式化预设名称为更友好的显示
 * @param {string} presetName 预设名称
 * @returns {string} 格式化后的名称
 */
function formatPresetName(presetName) {
    // 将下划线替换为空格，并将首字母大写
    return presetName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * 重置失败计数
 */
function resetFailureCount() {
    failureCount = 0;
}

/**
 * 更新状态显示
 * @param {string} text 状态文本
 */
export function updateStatus(text) {
    const statusElement = document.getElementById('lifegame-status');
    if (statusElement) {
        statusElement.textContent = text;
    }
}

/**
 * 开始定时更新预览
 */
export function startPreviewUpdate() {
    // 先停止已有的更新
    stopPreviewUpdate();
    // 重置失败计数
    resetFailureCount();
    // 立即更新一次
    updatePreview();
    // 设置定时更新
    previewUpdateInterval = setInterval(updatePreview, 500);
}

/**
 * 停止定时更新预览
 */
export function stopPreviewUpdate() {
    if (previewUpdateInterval) {
        clearInterval(previewUpdateInterval);
        previewUpdateInterval = null;
    }
}

/**
 * 更新预览图像
 */
export async function updatePreview() {
    const previewImg = document.getElementById('lifegame-preview-img');
    if (!previewImg) return;
    
    try {
        const response = await api.fetchApi('/lifegame/image');
        const data = await response.json();
        
        if (data.status === 'success' && data.image) {
            previewImg.src = data.image;
            resetFailureCount();
            
            // 同时获取状态更新
            updateGameState();
        }
    } catch (error) {
        if (DEBUG) console.error('更新预览失败:', error);
        
        failureCount++;
        if (failureCount >= MAX_FAILURES) {
            if (DEBUG) console.warn(`更新预览连续失败${MAX_FAILURES}次，暂停更新`);
            stopPreviewUpdate();
            updateStatus('状态: 无法连接到服务器');
        }
    }
}

/**
 * 更新游戏状态显示
 */
async function updateGameState() {
    try {
        const response = await api.fetchApi('/lifegame/state');
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            const state = data.data;
            const statusText = state.running ? 
                `状态: 运行中 (第${state.generation}代)` : 
                `状态: 已停止 (第${state.generation}代)`;
            
            updateStatus(statusText);
            
            // 更新速度滑块
            const speedSlider = document.getElementById('lifegame-speed');
            const speedValue = document.getElementById('lifegame-speed-value');
            if (speedSlider && speedValue && state.interval) {
                speedSlider.value = state.interval;
                speedValue.textContent = `${state.interval}秒`;
            }
        }
    } catch (error) {
        if (DEBUG) console.error('获取游戏状态失败:', error);
    }
} 