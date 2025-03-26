# ComfyUI-LifeGame

A Conway's Game of Life custom node for ComfyUI with dynamic execution and real-time control.

## Project Overview

This project implements a Conway's Game of Life custom node for ComfyUI, allowing users to control the game's start and stop in real-time through a web interface and observe the dynamic changes of the game state.

## System Architecture Design

### 1. Frontend (Web Interface)
- **User Interface**: Provides "Start," "Stop" buttons and a game state display area.
- **Communication Mechanism**: Uses AJAX or WebSocket to communicate with the backend for real-time game state updates.

### 2. Backend (Game of Life Logic)
- **Core Logic**: Implements game of life initialization, state updates, start and stop functionality.
- **State Management**: Maintains a global state object to record the current game state.

### 3. Custom Node (ComfyUI Integration)
- **Node Definition**: Implements ComfyUI interface to handle user input and output.
- **Backend Communication**: Interacts with the backend through API or message queues.

## Directory Structure

```
/project_root
│
├── web/
│   ├── index.html          # User interface HTML file
│   ├── styles.css          # Style file
│   ├── lifegame.js         # Game of Life frontend logic
│   ├── lifegame-ui.js      # UI components
│   ├── lifegame_preview.js # GIF preview functionality
│   ├── utils.js            # Utility functions
│   └── temp/               # Temporary files directory
│
├── server/
│   ├── __init__.py
│   ├── lifegame_logic.py   # Game of Life core logic
│   ├── api.py              # API interface for frontend communication
│   └── monitor.py          # Monitoring and management module
│
├── comfyui_nodes/
│   ├── __init__.py
│   └── lifegame_node.py    # Custom node definition
│
├── examples/               # Example workflows
│   └── lifegame_animation_workflow.json
│
├── requirements.txt        # Project dependencies
└── README.md               # Project documentation
```

## Usage Instructions

1. Clone this project to ComfyUI's `custom_nodes` directory
2. Install required dependencies: `pip install -r requirements.txt`
3. Restart ComfyUI
4. Find the "LifeGame" node in ComfyUI's node list and use it

## Features

- Real-time control of game start and stop
- Customizable initial state and game rules
- Dynamically generated game states can be output as images to other ComfyUI nodes
- Real-time GIF preview and file operations

## Game of Life Animation Nodes

In addition to the real-time Game of Life control panel, this plugin also provides dedicated ComfyUI nodes for generating Game of Life animations:

### 1. Game of Life Animation (LifeGameAnimation)

This node generates Game of Life animation sequences.

**Input Parameters:**
- **width**: Grid width (default: 100)
- **height**: Grid height (default: 100)
- **cell_size**: Cell pixel size (default: 5)
- **frames**: Number of frames to generate (default: 30)
- **mode**: Initialization mode (preset/random)
- **preset**: Preset pattern, valid when mode is preset
- **density**: Random fill density, valid when mode is random
- **alive_color**: Color for living cells
- **dead_color**: Color for dead cells
- **x_offset**: Preset pattern X offset (optional)
- **y_offset**: Preset pattern Y offset (optional)

**Output:**
- **images**: Animation frame sequence
- **final_state**: Final state information

### 2. Save Game of Life Animation (LifeGameSaveAnimation)

This node saves Game of Life animations as GIF or image sequences.

**Input Parameters:**
- **images**: Image sequence from LifeGameAnimation
- **format**: Save format (png/jpg/webp/gif)
- **fps**: Frames per second
- **filename_prefix**: Filename prefix

**Special Features:**
- **Real-time GIF Preview**: Displays preview in the node immediately after GIF generation
- **File Operations**: Provides functions to open files, view files in system file explorer, etc.
- **Right-click Menu Options**: Access more file operations through the right-click menu

### New Feature - GIF Preview and File Operations

The node now supports the following file operation features:

1. **Real-time GIF Preview**
   - Automatically displays preview in the node after generating GIF
   - Uses WebSocket real-time notification mechanism, no need to refresh or wait for workflow completion

2. **File Operation Button**
   - Provides file open button in the preview area
   - Shows tooltip on hover

3. **Right-click Menu Options**
   - **Open GIF in New Window**: View the generated GIF in a new browser tab
   - **Copy Filename to Clipboard**: Copy filename for reference
   - **Show in System File Explorer**: Locate the file in local file system

4. **Cross-platform Support**
   - Supports file operations on Windows, macOS, and Linux systems

### Example Workflow

Example workflows are provided in the `examples` directory:

- `lifegame_animation_workflow.json`: Example of generating and saving a glider gun animation

Usage:
1. In ComfyUI, click the "Load" button in the menu
2. Navigate to `extensions/comfyui-lifegame/examples`
3. Select `lifegame_animation_workflow.json`
4. Execute the workflow to generate a GIF animation and save it to the output directory, while also displaying a preview in the node

### Preset Patterns

Supports various classic Game of Life patterns:

- **glider**: Glider
- **blinker**: Blinker
- **toad**: Toad
- **beacon**: Beacon
- **pulsar**: Pulsar
- **gosper_glider_gun**: Gosper Glider Gun
- **diehard**: Die Hard pattern
- **acorn**: Acorn pattern
- **lightweight_spaceship**: Lightweight Spaceship
- **r_pentomino**: R-pentomino
- **infinite_growth**: Infinite Growth pattern
- **glider_gun**: Glider Gun
- **line_puffer**: Line Puffer

## Technical Implementation

- **WebSocket Communication**: Uses WebSocket for real-time communication between server and frontend
- **Canvas Drawing**: Uses LiteGraph's Canvas API for GIF preview rendering
- **Event-driven**: Adopts event-driven pattern for handling node state changes and GIF generation
- **Cross-platform File Operations**: Supports local file access on multiple operating systems

## Contribution Guide

Issues and feature requests are welcome, as are contributions via Pull Requests.

## License

[License Information] 