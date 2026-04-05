// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Show boot splash briefly before full desktop interaction
    setupStartupSplash();

    // Reset wallpaper first thing to ensure personalization shows
    resetWallpaper();
    
    // Initialize the clock
    updateClock();
    setInterval(updateClock, 60000); // Update every minute
    
    // Initialize windows
    initWindows();
    
    // Setup context menu for creating files first
    setupContextMenu();
    
    // Initialize desktop icons
    initDesktopIcons();

    // Remove temporary duplicate New File entries
    cleanupDefaultNewFiles();
    
    // Load user-created files
    loadUserFiles();

    // Remove any lingering duplicate New File entries from the live desktop
    cleanupDefaultNewFiles();
    
    // Make icons draggable
    makeIconsDraggable();
    
    // Initialize blockchain
    initBlockchain();
    
    // Setup start button functionality
    setupStartButton();
    
    // Setup wallpaper settings
    setupWallpaperSettings();

    // Setup custom desktop dialog
    setupDesktopDialog();

    // Setup command prompt style terminal
    setupPortfolioTerminal();
});

let desktopDialogResolver = null;
let desktopCreationPosition = null;

function setupStartupSplash() {
    const splash = document.getElementById('startup-splash');
    if (!splash) return;

    setTimeout(function() {
        splash.classList.add('hidden');
    }, 2400);
}

function getDesktopIconBounds(icon) {
    const desktop = document.querySelector('.desktop');
    const taskbar = document.querySelector('.taskbar');

    if (!desktop || !icon) {
        return { maxLeft: 0, maxTop: 0 };
    }

    const desktopRect = desktop.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const iconWidth = Math.max(iconRect.width, icon.offsetWidth || 80, 80);
    const iconHeight = Math.max(iconRect.height, icon.offsetHeight || 100, 100);
    const taskbarHeight = taskbar ? taskbar.offsetHeight : 40;
    const bottomPadding = 2;

    return {
        maxLeft: Math.max(0, desktopRect.width - iconWidth),
        maxTop: Math.max(0, desktopRect.height - iconHeight - taskbarHeight - bottomPadding)
    };
}

function clampIconPosition(icon, left, top) {
    const bounds = getDesktopIconBounds(icon);

    return {
        left: Math.max(0, Math.min(left, bounds.maxLeft)),
        top: Math.max(0, Math.min(top, bounds.maxTop))
    };
}

function getDesktopIconGridPosition(icon, index) {
    const desktop = document.querySelector('.desktop');
    const taskbar = document.querySelector('.taskbar');
    const margin = 20;
    const iconHeight = 92;
    const rowSpacing = 6;
    const columnWidth = 96;
    const taskbarHeight = taskbar ? taskbar.offsetHeight : 40;
    const usableHeight = desktop
        ? desktop.getBoundingClientRect().height - taskbarHeight - (margin * 2) - 2
        : 600;
    const rowsPerColumn = Math.max(1, Math.floor(usableHeight / (iconHeight + rowSpacing)));
    const column = Math.floor(index / rowsPerColumn);
    const row = index % rowsPerColumn;

    return clampIconPosition(
        icon,
        margin + (column * columnWidth),
        margin + (row * (iconHeight + rowSpacing))
    );
}

function getPinnedSystemIconPosition(icon) {
    const windowType = icon.getAttribute('data-window');
    const systemIconOrder = [
        'projects',
        'contact',
        'resume',
        'about',
        'blockchain',
        'certifications',
        'current',
        'terminal',
        'trash'
    ];

    const systemIndex = systemIconOrder.indexOf(windowType);
    if (systemIndex === -1) {
        return null;
    }

    return getDesktopIconGridPosition(icon, systemIndex);
}

// Clear all user-created data
function clearUserData() {
    // Clear user files from localStorage
    localStorage.removeItem('userFiles');
    
    // Clear all file contents
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('file_') || key.startsWith('folder_')) {
            localStorage.removeItem(key);
        }
    }
    
    // Clear icon positions
    localStorage.removeItem('iconPositions');
    
    // Remove all user-created icons from desktop
    const desktop = document.querySelector('.desktop');
    const icons = document.querySelectorAll('.icon');
    icons.forEach(icon => {
        const windowType = icon.getAttribute('data-window');
        if (windowType === 'notepad' || windowType === 'folder') {
            icon.remove();
        }
    });
}

// Update the taskbar clock
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    document.getElementById('taskbar-clock').textContent = `${hours}:${minutes} ${ampm}`;
}

// Initialize window functionality
function initWindows() {
    const windows = document.querySelectorAll('.window');
    
    windows.forEach(window => {
        setupWindowDrag(window);
        setupWindowControls(window);
        setupWindowResizing(window);
    });
}

// Make icons draggable
function makeIconsDraggable() {
    const icons = document.querySelectorAll('.icon');
    const desktop = document.querySelector('.desktop');
    
    // Position icons initially
    positionIcons(icons);
    
    // Create selection box
    const selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    document.body.appendChild(selectionBox);
    
    let isSelecting = false;
    let startX, startY;
    
    // Handle selection start
    desktop.addEventListener('mousedown', function(e) {
        // Only start selection if clicking directly on desktop
        if (e.target === desktop) {
            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Position selection box at click point
            selectionBox.style.left = startX + 'px';
            selectionBox.style.top = startY + 'px';
            selectionBox.style.width = '0';
            selectionBox.style.height = '0';
            selectionBox.style.display = 'block';
            
            // Deselect all icons initially
            icons.forEach(icon => icon.classList.remove('selected'));
        }
    });
    
    // Handle selection move
    document.addEventListener('mousemove', function(e) {
        if (!isSelecting) return;
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        // Calculate selection box dimensions
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        // Update selection box position and size
        selectionBox.style.left = (currentX < startX ? currentX : startX) + 'px';
        selectionBox.style.top = (currentY < startY ? currentY : startY) + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
        
        // Check which icons are within the selection box
        icons.forEach(icon => {
            const rect = icon.getBoundingClientRect();
            const selectionRect = selectionBox.getBoundingClientRect();
            
            // Check if icon is within selection box
            if (rect.left < selectionRect.right &&
                rect.right > selectionRect.left &&
                rect.top < selectionRect.bottom &&
                rect.bottom > selectionRect.top) {
                icon.classList.add('selected');
            } else {
                icon.classList.remove('selected');
            }
        });
    });
    
    // Handle selection end
    document.addEventListener('mouseup', function() {
        if (isSelecting) {
            isSelecting = false;
            selectionBox.style.display = 'none';
        }
    });
    
    // Handle click on desktop to deselect
    desktop.addEventListener('click', function(e) {
        // Only deselect if clicking directly on desktop
        if (e.target === desktop) {
            icons.forEach(icon => icon.classList.remove('selected'));
        }
    });
    
    // Handle icon dragging
    icons.forEach((icon, index) => {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let hasMoved = false;
        
        // Touch events for mobile
        icon.addEventListener('touchstart', handleStart, { passive: false });
        icon.addEventListener('touchmove', handleMove, { passive: false });
        icon.addEventListener('touchend', handleEnd);
        
        // Mouse events for desktop
        icon.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        function handleStart(e) {
            // Prevent event conflicts
            if (e.type === 'touchstart') {
                e.preventDefault();
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }
            
            // Get current position
            const rect = icon.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            isDragging = true;
            hasMoved = false;
            icon.style.zIndex = 10; // Bring to front while dragging
            
            // Remove active class from all icons
            document.querySelectorAll('.icon').forEach(i => {
                i.classList.remove('active', 'selected', 'dragging');
            });
            
            // Add active class for dragging and selected class for visual
            icon.classList.add('active', 'selected');
        }
        
        function handleMove(e) {
            if (!isDragging) return;
            
            let clientX, clientY;
            
            if (e.type === 'touchmove') {
                e.preventDefault();
                const touch = e.touches[0];
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else if (e.type === 'mousemove') {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                return;
            }
            
            // Check if actually moved (more than 5px to account for small movements)
            const deltaX = Math.abs(clientX - startX);
            const deltaY = Math.abs(clientY - startY);
            
            if (deltaX > 5 || deltaY > 5) {
                hasMoved = true;
                
                // Add dragging class once we're sure the user is dragging
                if (!icon.classList.contains('dragging')) {
                    icon.classList.add('dragging');
                }
                
                // Calculate new position
                const moveX = clientX - startX;
                const moveY = clientY - startY;
                
                const newLeft = startLeft + moveX;
                const newTop = startTop + moveY;
                
                // Keep within desktop bounds
                const boundedPosition = clampIconPosition(icon, newLeft, newTop);
                
                // Apply new position
                icon.style.left = `${boundedPosition.left}px`;
                icon.style.top = `${boundedPosition.top}px`;
                
                // Save position
                saveIconPosition(icon);
            }
        }
        
        function handleEnd() {
            if (isDragging) {
                isDragging = false;
                icon.style.zIndex = 1; // Reset z-index
                icon.classList.remove('active', 'dragging');
                
                // If not moved, keep the selected class
                if (!hasMoved) {
                    icon.classList.add('selected');
                }
            }
        }
    });
}

// Position icons on load
function positionIcons(icons) {
    // Try to load saved positions first
    const savedPositions = localStorage.getItem('iconPositions');
    if (savedPositions) {
        const positions = JSON.parse(savedPositions);
        icons.forEach((icon, index) => {
            const id = icon.getAttribute('data-window');
            const pinnedPosition = getPinnedSystemIconPosition(icon);

            if (pinnedPosition) {
                icon.style.left = `${pinnedPosition.left}px`;
                icon.style.top = `${pinnedPosition.top}px`;
            } else if (positions[id]) {
                const savedLeft = parseFloat(positions[id].left);
                const savedTop = parseFloat(positions[id].top);
                const boundedPosition = clampIconPosition(icon, savedLeft, savedTop);

                icon.style.left = `${boundedPosition.left}px`;
                icon.style.top = `${boundedPosition.top}px`;
            } else {
                // Default position for new icons
                setDefaultIconPosition(icon, index);
            }
        });
    } else {
        // Set default positions for first time
        icons.forEach((icon, index) => {
            setDefaultIconPosition(icon, index);
        });
    }
}

// Set default icon position in a clean layout
function setDefaultIconPosition(icon, index = 0) {
    const boundedPosition = getPinnedSystemIconPosition(icon) || getDesktopIconGridPosition(icon, index);
    
    // Apply position directly
    icon.style.left = `${boundedPosition.left}px`;
    icon.style.top = `${boundedPosition.top}px`;
    
    // Save this position
    saveIconPosition(icon);
}

// Save icon position to localStorage
function saveIconPosition(icon) {
    const id = icon.getAttribute('data-window');
    const left = icon.style.left;
    const top = icon.style.top;
    
    // Get existing positions
    let positions = {};
    const savedPositions = localStorage.getItem('iconPositions');
    if (savedPositions) {
        positions = JSON.parse(savedPositions);
    }
    
    // Update with new position
    positions[id] = { left, top };
    
    // Save back to localStorage
    localStorage.setItem('iconPositions', JSON.stringify(positions));
}

// Make windows draggable
function setupWindowDrag(window) {
    const windowHeader = window.querySelector('.window-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    windowHeader.addEventListener('mousedown', function(e) {
        // Only allow dragging from the header itself, not its children (buttons)
        if (e.target !== windowHeader && !e.target.classList.contains('window-title') && !windowHeader.contains(e.target)) {
            return;
        }
        
        isDragging = true;
        
        // Make window active
        activateWindow(window);
        
        // Calculate the offset of the mouse relative to the window
        const rect = window.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Change cursor during drag
        window.style.cursor = 'move';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        // Exit fullscreen when trying to drag
        if (window.classList.contains('fullscreen')) {
            toggleFullscreen(window);
            
            // Recalculate offsets after exiting fullscreen
            const rect = window.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            return; // Skip this frame to avoid jumping
        }
        
        // Calculate new position
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // Apply new position
        window.style.left = `${x}px`;
        window.style.top = `${y}px`;
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        window.style.cursor = 'default';
    });
}

// Setup window control buttons (minimize, maximize, close)
function setupWindowControls(window) {
    const windowId = window.id;
    const minimizeBtn = window.querySelector('.minimize-btn');
    const maximizeBtn = window.querySelector('.maximize-btn');
    const closeBtn = window.querySelector('.close-btn');
    
    minimizeBtn.addEventListener('click', function() {
        minimizeWindow(window);
    });
    
    maximizeBtn.addEventListener('click', function() {
        toggleFullscreen(window);
    });
    
    closeBtn.addEventListener('click', function() {
        closeWindow(window);
    });
}

// Initialize desktop icons
function initDesktopIcons() {
    const icons = document.querySelectorAll('.icon');
    
    icons.forEach(icon => {
        // Remove single click handler and use only dblclick
        icon.addEventListener('dblclick', function() {
            const windowType = this.getAttribute('data-window');
            openWindow(windowType);
        });
        
        // Add touch double tap
        let lastTap = 0;
        icon.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                // Double tap detected
                const windowType = this.getAttribute('data-window');
                openWindow(windowType);
                e.preventDefault();
            }
            
            lastTap = currentTime;
        });
    });
    
    // Load user-created files from localStorage
    loadUserFiles();
}

// Open a window
function openWindow(windowType) {
    const window = document.getElementById(`${windowType}-window`);
    
    if (window) {
        // Get the title from the calling icon if clicked from an icon
        const callingIcon = document.querySelector('.icon.selected');
        let customTitle = '';
        
        if (callingIcon && callingIcon.getAttribute('data-window') === windowType) {
            customTitle = callingIcon.querySelector('.icon-text').textContent;
        }
        
        // Reset all windows first
        document.querySelectorAll('.window').forEach(w => {
            w.classList.remove('active');
            if (w !== window) {
                w.style.display = 'none';
            }
        });
        
        // Set fullscreen
        window.style.display = 'flex';
        window.style.width = '100%';
        window.style.height = 'calc(100% - 40px)';
        window.style.top = '0';
        window.style.left = '0';
        window.classList.add('fullscreen', 'active');
        
        // Update window title if we have a custom title
        if (customTitle) {
            window.querySelector('.window-title span').textContent = customTitle;
        } else {
            // Reset to default title
            if (windowType === 'notepad') {
                window.querySelector('.window-title span').textContent = 'Notepad';
            } else if (windowType === 'folder') {
                window.querySelector('.window-title span').textContent = 'Folder';
            }
        }
        
        // Add to taskbar if not already there
        addToTaskbar(windowType);
        
        // Special handling for specific windows
        if (windowType === 'blockchain') {
            // Initialize blockchain if this is the blockchain window
            initBlockchain();
        } else if (windowType === 'notepad') {
            // Clear notepad content or load from storage
            const textarea = window.querySelector('.notepad-textarea');
            
            // If we're opening a specific file, load its content
            if (customTitle) {
                const fileContent = localStorage.getItem(`file_${customTitle}`);
                textarea.value = fileContent || '';
                
                // Set up auto-save
                textarea.oninput = function() {
                    localStorage.setItem(`file_${customTitle}`, textarea.value);
                };
            } else {
                textarea.value = '';
                textarea.oninput = null;
            }
        } else if (windowType === 'folder') {
            // Clear folder content
            const folderContent = window.querySelector('.folder-content');
            folderContent.innerHTML = '';
            
            // Add folder items as demo
            if (customTitle) {
                const folderItems = localStorage.getItem(`folder_${customTitle}`);
                
                if (folderItems) {
                    const items = JSON.parse(folderItems);
                    
                    items.forEach(item => {
                        addFolderItem(folderContent, item.name, item.type);
                    });
                } else {
                    // First time opening this folder, add some demo items
                    const demoItems = [
                        { name: 'Document.txt', type: 'file' },
                        { name: 'Images', type: 'folder' },
                        { name: 'Data.csv', type: 'file' }
                    ];
                    
                    demoItems.forEach(item => {
                        addFolderItem(folderContent, item.name, item.type);
                    });
                    
                    // Save demo items
                    localStorage.setItem(`folder_${customTitle}`, JSON.stringify(demoItems));
                }
            }
        } else if (windowType === 'terminal') {
            focusTerminalInput();
        }
        
        // Play sound effect (optional)
        playSound('open');
    }
}

// Add an item to a folder
function addFolderItem(folderContent, name, type) {
    const item = document.createElement('div');
    item.className = 'folder-item';
    
    let iconClass = type === 'folder' ? 'fas fa-folder' : 'fas fa-file-alt';
    
    item.innerHTML = `
        <i class="${iconClass}"></i>
        <div class="folder-item-name">${name}</div>
    `;
    
    // Double click to open
    item.addEventListener('dblclick', function() {
        if (type === 'folder') {
            // Create or open subfolder
            const folderIcon = document.createElement('div');
            folderIcon.className = 'icon';
            folderIcon.setAttribute('data-window', 'folder');
            
            folderIcon.innerHTML = `
                <div class="icon-img">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="icon-text">${name}</div>
            `;
            
            // Add to desktop (temporarily, will be removed when closed)
            document.querySelector('.desktop').appendChild(folderIcon);
            
            // Open the folder
            openWindow('folder');
            
            // Set the folder title to match this folder
            document.querySelector('#folder-window .window-title span').textContent = name;
            
            // Remove the temporary icon
            setTimeout(() => {
                folderIcon.remove();
            }, 100);
        } else if (type === 'file') {
            // Create or open file
            const fileIcon = document.createElement('div');
            fileIcon.className = 'icon';
            fileIcon.setAttribute('data-window', 'notepad');
            
            fileIcon.innerHTML = `
                <div class="icon-img">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="icon-text">${name}</div>
            `;
            
            // Add to desktop (temporarily, will be removed when closed)
            document.querySelector('.desktop').appendChild(fileIcon);
            
            // Open the file
            openWindow('notepad');
            
            // Set the file title
            document.querySelector('#notepad-window .window-title span').textContent = name;
            
            // Remove the temporary icon
            setTimeout(() => {
                fileIcon.remove();
            }, 100);
        }
    });
    
    folderContent.appendChild(item);
}

// Toggle fullscreen mode
function toggleFullscreen(window) {
    if (window.classList.contains('fullscreen')) {
        // Exit fullscreen
        window.classList.remove('fullscreen');
        window.style.width = '700px';
        window.style.height = '500px';
        window.style.top = '50px';
        window.style.left = '100px';
    } else {
        // Enter fullscreen
        window.style.width = '100%';
        window.style.height = 'calc(100% - 40px)';
        window.style.top = '0';
        window.style.left = '0';
        window.classList.add('fullscreen');
    }
    
    // Make sure this window is active
    activateWindow(window);
    
    // Add sound effect
    playSound('maximize');
}

// Close a window
function closeWindow(window) {
    // Hide the window
    window.style.display = 'none';
    window.classList.remove('active', 'fullscreen');
    
    // Remove from taskbar
    const windowId = window.id;
    const windowType = windowId.replace('-window', '');
    
    // Reset blockchain if blockchain window is closed
    if (windowType === 'blockchain') {
        resetBlockchain();
    }
    
    // Remove from taskbar
    removeFromTaskbar(windowType);
    
    // Play sound effect
    playSound('close');
}

// Reset blockchain to genesis block
function resetBlockchain() {
    // Create a new blockchain with just the genesis block
    const genesisBlock = createGenesisBlock();
    const blockchain = [genesisBlock];
    
    // Save to localStorage
    localStorage.setItem('blockchainData', JSON.stringify(blockchain));
    
    // Re-render if blockchain window is visible
    const blockchainElement = document.getElementById('blockchain');
    if (blockchainElement && blockchainElement.offsetParent !== null) {
        renderBlockchain(blockchain);
    }
}

// Minimize a window
function minimizeWindow(window) {
    window.style.display = 'none';
    
    // Keep in taskbar
    // Play sound effect (optional)
    playSound('minimize');
}

// Make a window active (bring to front)
function activateWindow(window) {
    // Remove active class from all windows
    document.querySelectorAll('.window').forEach(w => {
        w.classList.remove('active');
    });
    
    // Add active class to this window
    window.classList.add('active');
    
    // Update taskbar
    const windowId = window.id;
    const windowType = windowId.replace('-window', '');
    updateTaskbarActiveItem(windowType);
}

// Add window to taskbar
function addToTaskbar(windowType) {
    const taskbarItems = document.querySelector('.taskbar-items');
    
    // Check if already in taskbar
    if (document.getElementById(`taskbar-${windowType}`)) {
        return;
    }
    
    // Create taskbar item
    const taskbarItem = document.createElement('div');
    taskbarItem.classList.add('taskbar-item');
    taskbarItem.id = `taskbar-${windowType}`;
    
    // Get icon and title from corresponding window
    const window = document.getElementById(`${windowType}-window`);
    const title = window.querySelector('.window-title span').textContent;
    const iconClass = window.querySelector('.window-icon').classList.value;
    
    taskbarItem.innerHTML = `<i class="${iconClass}"></i> ${title}`;
    
    // Add click event to toggle window visibility
    taskbarItem.addEventListener('click', function() {
        const window = document.getElementById(`${windowType}-window`);
        
        if (window.style.display === 'none') {
            // Show window if it's hidden
            openWindow(windowType);
        } else if (window.classList.contains('active')) {
            // Minimize window if it's active
            minimizeWindow(window);
        } else {
            // Activate window if it's not active but visible
            openWindow(windowType);
        }
    });
    
    // Add to taskbar
    taskbarItems.appendChild(taskbarItem);
}

// Remove window from taskbar
function removeFromTaskbar(windowType) {
    const taskbarItem = document.getElementById(`taskbar-${windowType}`);
    if (taskbarItem) {
        taskbarItem.remove();
    }
}

// Update active taskbar item
function updateTaskbarActiveItem(windowType) {
    // Remove active class from all taskbar items
    document.querySelectorAll('.taskbar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to corresponding taskbar item
    const taskbarItem = document.getElementById(`taskbar-${windowType}`);
    if (taskbarItem) {
        taskbarItem.classList.add('active');
    }
}

// Play sound effect
function playSound(action) {
    // Define sound effects (you could replace with actual sounds)
    const sounds = {
        open: 'open',
        close: 'close',
        minimize: 'minimize',
        maximize: 'maximize',
        reset: 'reset',
        startup: 'startup',
        wallpaper: 'wallpaper',
        create: 'create',
        delete: 'delete'
    };
    
    // Log the sound effect (for development)
    console.log(`Sound played: ${action}`);
    
    // Here you could implement actual sounds
    // For example:
    /*
    const sound = new Audio(`./sounds/${sounds[action]}.mp3`);
    sound.volume = 0.5;
    sound.play().catch(e => console.log('Error playing sound:', e));
    */
}

// Handle window resize events for responsiveness
window.addEventListener('resize', function() {
    // Reposition icons within bounds if needed
    const icons = document.querySelectorAll('.icon');
    const desktop = document.querySelector('.desktop');
    const desktopRect = desktop.getBoundingClientRect();
    
    icons.forEach(icon => {
        const iconRect = icon.getBoundingClientRect();
        const pinnedPosition = getPinnedSystemIconPosition(icon);

        if (pinnedPosition) {
            icon.style.left = `${pinnedPosition.left}px`;
            icon.style.top = `${pinnedPosition.top}px`;
            saveIconPosition(icon);
            return;
        }
        
        // Check if icon is outside bounds
        const currentLeft = parseFloat(icon.style.left) || iconRect.left;
        const currentTop = parseFloat(icon.style.top) || iconRect.top;
        const boundedPosition = clampIconPosition(icon, currentLeft, currentTop);

        icon.style.left = `${boundedPosition.left}px`;
        icon.style.top = `${boundedPosition.top}px`;
        saveIconPosition(icon);
    });
});

// Initialize the blockchain
function initBlockchain() {
    const blockchainElement = document.getElementById('blockchain');
    if (!blockchainElement) return;
    
    // Check if blockchain data exists in localStorage
    let blockchain = [];
    const savedBlockchain = localStorage.getItem('blockchainData');
    
    if (savedBlockchain) {
        // Use the saved blockchain data (this will be reset on window close)
        blockchain = JSON.parse(savedBlockchain);
    } else {
        // Create genesis block for first time initialization
        const genesisBlock = createGenesisBlock();
        blockchain = [genesisBlock];
        
        // Save to localStorage
        localStorage.setItem('blockchainData', JSON.stringify(blockchain));
    }
    
    // Render the blockchain
    renderBlockchain(blockchain);
}

// Create the genesis block
function createGenesisBlock() {
    return {
        index: 0,
        timestamp: new Date().toISOString(),
        data: {
            title: "Genesis Block - Blockchain Journey",
            description: "Welcome to my blockchain journey! From AI-powered image verification on Polygon to pioneering quantum-safe Layer 3 protocols, I'm pushing the boundaries of Web3 security and interoperability. Explore my flagship blockchain projects by adding blocks to this chain.",
            technologies: ["Blockchain", "Quantum Security", "Layer 3", "Web3", "Interoperability"]
        },
        previousHash: "0000000000000000",
        hash: calculateHash(0, new Date().toISOString(), { title: "Genesis Block" }, "0000000000000000")
    };
}

// Calculate a simple hash
function calculateHash(index, timestamp, data, previousHash) {
    const content = index + timestamp + JSON.stringify(data) + previousHash;
    
    // A simple hash function (not secure, just for demo)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to hex string and ensure positive
    return Math.abs(hash).toString(16).padStart(16, '0');
}

// Create a new block
function createBlock(index, previousBlock) {
    // Block data based on index
    const blockData = getBlockData(index);
    
    const timestamp = new Date().toISOString();
    const previousHash = previousBlock.hash;
    
    const newBlock = {
        index: index,
        timestamp: timestamp,
        data: blockData,
        previousHash: previousHash,
        hash: calculateHash(index, timestamp, blockData, previousHash)
    };
    
    return newBlock;
}

// Get block data based on index
function getBlockData(index) {
    const projectsData = [
        {
            title: "ZorAi – AI Image Verification Platform",
            description: "Built full-stack decentralized platform to register and verify AI-generated images on blockchain to combat misinformation. Used OpenAI API + Pinata (IPFS) + Solidity on Polygon blockchain to link images with smart contracts.",
            technologies: ["Next.js", "React", "TypeScript", "Solidity", "OpenAI", "IPFS", "Polygon"]
        },
        {
            title: "QLink – Quantum-Safe Layer 3 Protocol",
            description: "World's first quantum-safe Layer 3 interoperability protocol for secure cross-chain asset transfers. Combines post-quantum cryptography (PQC) and quantum key distribution (QKD) to deliver physically unbreakable security for validator communication, proof generation, and key management across any blockchain.",
            technologies: ["Layer 3", "Post-Quantum Cryptography", "QKD", "Cross-Chain", "Validator Network", "Quantum Security"]
        },
        {
            title: "🚀 Next Innovation Loading...",
            description: "Something revolutionary is brewing in the lab! Stay tuned for the next breakthrough in blockchain technology. The future of Web3 is being built one block at a time.",
            technologies: ["Coming Soon", "Innovation", "Blockchain", "Web3", "Future Tech"]
        },
        {
            title: "🔮 The Plot Thickens...",
            description: "Another groundbreaking project is taking shape. The blockchain never sleeps, and neither does innovation. What could be next in this journey of technological excellence?",
            technologies: ["Mystery Project", "Blockchain", "Innovation", "TBD", "Exciting"]
        },
        {
            title: "🎯 Mission: Possible",
            description: "Every great blockchain journey needs another chapter. This block represents the endless possibilities in the decentralized future. More epic projects are on the horizon!",
            technologies: ["Future", "Blockchain", "Possibilities", "Coming Soon", "Epic"]
        },
        {
            title: "🌟 To Be Continued...",
            description: "The blockchain story doesn't end here! More innovative projects, more groundbreaking solutions, more ways to shape the future of technology. Keep clicking to see what imagination can build!",
            technologies: ["Infinite Potential", "Innovation", "Blockchain", "Future", "Amazing"]
        }
    ];
    
    // Return data for the current index
    if (index <= projectsData.length) {
        return projectsData[index - 1]; // Direct mapping: index 1 = projectsData[0], etc.
    } else {
        // Cycle through fun "coming soon" messages after running out of predefined ones
        const comingSoonMessages = [
            {
                title: "🎲 Roll the Dice!",
                description: "Another mystery project is in the works! The blockchain adventure continues with endless possibilities. Who knows what innovative solution will emerge next?",
                technologies: ["Surprise", "Innovation", "Random", "Fun", "Blockchain"]
            },
            {
                title: "🎪 The Show Must Go On!",
                description: "Step right up to see the next amazing blockchain creation! Every block tells a story, and this story is far from over. More thrills and innovation await!",
                technologies: ["Entertainment", "Blockchain", "Continuous", "Amazing", "Show"]
            },
            {
                title: "🎨 Masterpiece in Progress",
                description: "Every artist needs a canvas, and this blockchain is mine! Another stroke of genius is being painted in the world of decentralized technology.",
                technologies: ["Art", "Creativity", "Blockchain", "Masterpiece", "Genius"]
            }
        ];
        
        const randomIndex = (index - projectsData.length - 1) % comingSoonMessages.length;
        return comingSoonMessages[randomIndex];
    }
}

// Render the blockchain
function renderBlockchain(blockchain) {
    const blockchainElement = document.getElementById('blockchain');
    if (!blockchainElement) return;
    
    // Clear existing content
    blockchainElement.innerHTML = '';
    
    // Render each block
    blockchain.forEach((block, index) => {
        const blockElement = document.createElement('div');
        blockElement.className = 'block';
        
        // Format date for display
        const date = new Date(block.timestamp);
        const dateFormatted = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        // Ensure description doesn't exceed a certain length
        let description = block.data.description;
        
        blockElement.innerHTML = `
            <div class="block-header">
                <span class="block-number">Block #${block.index}</span>
                <span class="timestamp">${dateFormatted}</span>
            </div>
            <div class="block-content">
                <h3 class="project-title">${block.data.title}</h3>
                <p class="project-description">${description}</p>
                <div class="technologies">
                    ${block.data.technologies.map(tech => `<span class="technology">${tech}</span>`).join('')}
                </div>
            </div>
            <div class="block-hash">
                <strong>Hash:</strong> ${block.hash.substring(0, 16)}...
            </div>
        `;
        
        blockchainElement.appendChild(blockElement);
        
        // Add chain link if not the last block
        if (index < blockchain.length - 1) {
            const chainLink = document.createElement('div');
            chainLink.className = 'chain-link';
            blockchainElement.appendChild(chainLink);
        }
    });
    
    // Always show "Add Next Block" button for endless fun
    if (true) {
        const addBlockBtn = document.createElement('div');
        addBlockBtn.className = 'add-block-btn';
        addBlockBtn.setAttribute('data-track', 'CTA: Add Next Block');
        addBlockBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Add Next Block';
        addBlockBtn.addEventListener('click', function() {
            addNextBlock(blockchain);
        });
        
        blockchainElement.appendChild(addBlockBtn);
    }
}

// Add the next block
function addNextBlock(blockchain) {
    const lastBlock = blockchain[blockchain.length - 1];
    const newIndex = lastBlock.index + 1;
    
    // Create new block
    const newBlock = createBlock(newIndex, lastBlock);
    blockchain.push(newBlock);
    
    // Save to localStorage
    localStorage.setItem('blockchainData', JSON.stringify(blockchain));
    
    // Re-render
    renderBlockchain(blockchain);
}

// Setup start button functionality
function setupStartButton() {
    const startButton = document.querySelector('.start-button');
    if (!startButton) return;
    
    startButton.addEventListener('click', function() {
        // Add clicked class for animation
        startButton.classList.add('clicked');
        
        // Remove clicked class after animation completes
        setTimeout(() => {
            startButton.classList.remove('clicked');
        }, 500);
        
        // Reset icon positions to default
        resetIconPositions();
        
        // Check if personalization overlay exists, if not, reset wallpaper
        if (!document.querySelector('.wallpaper-personalization')) {
            resetWallpaper();
        }
        
        // Play startup sound
        playSound('startup');
    });
}

// Reset icon positions to a clean grid layout
function resetIconPositions() {
    // Clear saved positions
    localStorage.removeItem('iconPositions');
    
    // Get all icons
    const icons = document.querySelectorAll('.icon');
    
    // Disable transitions temporarily
    icons.forEach(icon => icon.style.transition = 'none');
    
    // Force a reflow
    document.body.offsetHeight;
    
    // Position each icon with a slight delay
    icons.forEach((icon, index) => {
        // Reset any scaling/opacity
        icon.style.transform = 'scale(0)';
        icon.style.opacity = '0';
        
        setTimeout(() => {
            // Reset transform and opacity with transition
            icon.style.transition = 'all 0.3s ease-out';
            icon.style.transform = 'scale(1)';
            icon.style.opacity = '1';
            
            // Set to default position
            setDefaultIconPosition(icon, index);
        }, index * 100); // Stagger the animations
    });
    
    // Play reset sound
    playSound('reset');
}

// Setup wallpaper settings functionality
function setupWallpaperSettings() {
    const wallpaperBtn = document.querySelector('.wallpaper-settings');
    const wallpaperPopup = document.querySelector('.wallpaper-popup');
    const wallpaperClose = document.querySelector('.wallpaper-close');
    const wallpaperOptions = document.querySelectorAll('.wallpaper-option');
    const applyCustomBtn = document.querySelector('.apply-custom-wallpaper');
    const fileInput = document.getElementById('wallpaper-file-input');
    const fileNameDisplay = document.getElementById('selected-file-name');
    
    let selectedFile = null;
    
    // Show/hide wallpaper popup
    wallpaperBtn.addEventListener('click', function() {
        wallpaperPopup.style.display = wallpaperPopup.style.display === 'block' ? 'none' : 'block';
        
        // Mark current wallpaper as active
        const currentWallpaper = localStorage.getItem('wallpaper') || 'default';
        wallpaperOptions.forEach(option => {
            if (option.getAttribute('data-wallpaper') === currentWallpaper) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    });
    
    // Close popup when clicking close button
    wallpaperClose.addEventListener('click', function() {
        wallpaperPopup.style.display = 'none';
    });
    
    // Close popup when clicking outside
    document.addEventListener('click', function(e) {
        if (!wallpaperPopup.contains(e.target) && !wallpaperBtn.contains(e.target)) {
            wallpaperPopup.style.display = 'none';
        }
    });
    
    // Handle wallpaper option selection
    wallpaperOptions.forEach(option => {
        option.addEventListener('click', function() {
            const wallpaperType = this.getAttribute('data-wallpaper');
            changeWallpaper(wallpaperType);
            
            // Update active state
            wallpaperOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Close popup after selection
            setTimeout(() => {
                wallpaperPopup.style.display = 'none';
            }, 300);
        });
    });
    
    // Handle file input change
    fileInput.addEventListener('change', function(e) {
        selectedFile = e.target.files[0];
        
        if (selectedFile) {
            // Display the file name
            fileNameDisplay.textContent = selectedFile.name;
            
            // Enable the apply button
            applyCustomBtn.disabled = false;
        } else {
            fileNameDisplay.textContent = 'No file selected';
            applyCustomBtn.disabled = true;
        }
    });
    
    // Handle custom wallpaper upload
    applyCustomBtn.addEventListener('click', function() {
        if (selectedFile) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Apply the wallpaper using the data URL
                changeWallpaper('custom', e.target.result);
                
                // Close the popup
                wallpaperPopup.style.display = 'none';
                
                // Reset the file input
                fileNameDisplay.textContent = 'No file selected';
                fileInput.value = '';
                selectedFile = null;
                applyCustomBtn.disabled = true;
                
                // Remove active state from preset options
                wallpaperOptions.forEach(opt => opt.classList.remove('active'));
            };
            
            // Read the file as a data URL
            reader.readAsDataURL(selectedFile);
        }
    });
}

// Change the desktop wallpaper
function changeWallpaper(type, customWallpaper = null) {
    const desktop = document.querySelector('.desktop');
    
    // Remove any previous background
    desktop.style.backgroundImage = '';
    desktop.style.backgroundColor = '';
    
    // Remove any existing personalization overlay
    const existingOverlay = document.querySelector('.wallpaper-personalization');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Apply new background based on type
    switch (type) {
        case 'default':
            desktop.style.background = 'linear-gradient(135deg, #0a1628 0%, #1a2332 25%, #0d1421 50%, #1e2a3a 75%, #0a1628 100%)';
            
            // Add personalization overlay with name, major and profile picture in center
            const personalizationOverlay = document.createElement('div');
            personalizationOverlay.className = 'wallpaper-personalization centered';
            personalizationOverlay.innerHTML = `
                <div class="personal-info-centered">
                    <div class="wallpaper-profile-picture">
                        <img src="./img/IMG_2532.jpg" alt="Joao Vitor Barros da Silva">
                    </div>
                    <h1>Joao Vitor Barros da Silva</h1>
                    <h2>Computer Science</h2>
                    <p class="welcome-message">Welcome to my portfolio, click anything to begin the experience</p>
                    <p class="welcome-message" style="font-size: 0.9rem; margin-top: 10px;">Don't forget to try the wallpaper feature!</p>
                </div>
            `;
            desktop.prepend(personalizationOverlay);
            break;
        case 'mountains':
            desktop.style.backgroundImage = 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80")';
            break;
        case 'ocean':
            desktop.style.backgroundImage = 'url("https://images.unsplash.com/photo-1505118380757-91f5f5632de0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80")';
            break;
        case 'forest':
            desktop.style.backgroundImage = 'url("https://images.unsplash.com/photo-1448375240586-882707db888b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80")';
            break;
        case 'cityscape':
            desktop.style.backgroundImage = 'url("https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80")';
            break;
        case 'space':
            desktop.style.backgroundImage = 'url("https://images.unsplash.com/photo-1462331940025-496dfbfc7564?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80")';
            break;
        case 'custom':
            if (customWallpaper) {
                desktop.style.backgroundImage = `url("${customWallpaper}")`;
                // Save custom wallpaper data
                localStorage.setItem('customWallpaperData', customWallpaper);
            } else {
                // Fallback to default if custom wallpaper data is missing
                desktop.style.background = 'linear-gradient(135deg, #0a1628 0%, #1a2332 25%, #0d1421 50%, #1e2a3a 75%, #0a1628 100%)';
                
                // Add personalization overlay 
                const fallbackOverlay = document.createElement('div');
                fallbackOverlay.className = 'wallpaper-personalization centered';
                fallbackOverlay.innerHTML = `
                    <div class="personal-info-centered">
                        <div class="wallpaper-profile-picture">
                            <img src="./img/IMG_2532.jpg" alt="Joao Vitor Barros da Silva">
                        </div>
                        <h1>Joao Vitor Barros da Silva</h1>
                        <h2>Computer Science</h2>
                        <p class="welcome-message">Welcome to my portfolio, click anything to begin the experience</p>
                        <p class="welcome-message" style="font-size: 0.9rem; margin-top: 10px;">Don't forget to try the wallpaper feature!</p>
                    </div>
                `;
                desktop.prepend(fallbackOverlay);
            }
            break;
        default:
            // Default fallback
            desktop.style.background = 'linear-gradient(135deg, #0a1628 0%, #1a2332 25%, #0d1421 50%, #1e2a3a 75%, #0a1628 100%)';
            
            // Add personalization overlay
            const defaultOverlay = document.createElement('div');
            defaultOverlay.className = 'wallpaper-personalization centered';
            defaultOverlay.innerHTML = `
                <div class="personal-info-centered">
                    <div class="wallpaper-profile-picture">
                        <img src="./img/IMG_2532.jpg" alt="Joao Vitor Barros da Silva">
                    </div>
                    <h1>Joao Vitor Barros da Silva</h1>
                    <h2>Computer Science</h2>
                    <p class="welcome-message">Welcome to my portfolio, click anything to begin the experience</p>
                    <p class="welcome-message" style="font-size: 0.9rem; margin-top: 10px;">Don't forget to try the wallpaper feature!</p>
                </div>
            `;
            desktop.prepend(defaultOverlay);
            break;
    }
    
    // Update icon text color for readability based on background
    if (type !== 'default') {
        enhanceIconTextReadability(true);
    } else {
        enhanceIconTextReadability(false);
    }
    
    // Save selection to localStorage
    localStorage.setItem('wallpaper', type);
    
    // Play sound effect (optional)
    playSound('wallpaper');
}

// Load saved wallpaper preference
function loadSavedWallpaper() {
    const savedWallpaper = localStorage.getItem('wallpaper');
    
    if (savedWallpaper) {
        if (savedWallpaper === 'custom') {
            const customWallpaperData = localStorage.getItem('customWallpaperData');
            if (customWallpaperData) {
                changeWallpaper('custom', customWallpaperData);
            } else {
                changeWallpaper('default');
            }
        } else {
            changeWallpaper(savedWallpaper);
        }
    } else {
        // If no wallpaper is saved, use the default one
        changeWallpaper('default');
    }
}

// Enhance icon text readability on darker backgrounds
function enhanceIconTextReadability(isDarkBackground) {
    const iconTexts = document.querySelectorAll('.icon-text');
    
    iconTexts.forEach(text => {
        if (isDarkBackground) {
            text.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            text.style.padding = '2px 4px';
            text.style.borderRadius = '3px';
        } else {
            text.style.backgroundColor = '';
            text.style.padding = '';
            text.style.borderRadius = '';
        }
    });
}

// Setup window resizing functionality
function setupWindowResizing(window) {
    if (window.querySelector('.resize-handle')) return; // Already setup
    
    // Add resize handles
    const directions = ['top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-right', 'bottom-left'];
    
    directions.forEach(direction => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${direction}`;
        window.appendChild(handle);
        
        // Setup resize events
        handle.addEventListener('mousedown', initResize);
        
        function initResize(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // If window is fullscreen, exit fullscreen first
            if (window.classList.contains('fullscreen')) {
                toggleFullscreen(window);
            }
            
            // Get initial cursor position
            const startX = e.clientX;
            const startY = e.clientY;
            
            // Get initial window dimensions
            const startWidth = parseInt(window.offsetWidth);
            const startHeight = parseInt(window.offsetHeight);
            const startLeft = parseInt(window.offsetLeft);
            const startTop = parseInt(window.offsetTop);
            
            // Minimum size constraints
            const minWidth = 300;
            const minHeight = 200;
            
            // Make window active
            activateWindow(window);
            
            // Setup resize tracking
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
            
            function resize(e) {
                e.preventDefault();
                
                // Calculate delta movement
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                // Apply resize based on direction
                if (direction.includes('right')) {
                    const newWidth = Math.max(minWidth, startWidth + dx);
                    window.style.width = `${newWidth}px`;
                }
                
                if (direction.includes('bottom')) {
                    const newHeight = Math.max(minHeight, startHeight + dy);
                    window.style.height = `${newHeight}px`;
                }
                
                if (direction.includes('left')) {
                    const newWidth = Math.max(minWidth, startWidth - dx);
                    if (newWidth !== minWidth) {
                        window.style.width = `${newWidth}px`;
                        window.style.left = `${startLeft + dx}px`;
                    }
                }
                
                if (direction.includes('top')) {
                    const newHeight = Math.max(minHeight, startHeight - dy);
                    if (newHeight !== minHeight) {
                        window.style.height = `${newHeight}px`;
                        window.style.top = `${startTop + dy}px`;
                    }
                }
            }
            
            function stopResize() {
                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', stopResize);
            }
        }
    });
}

// Setup right-click context menu
function setupContextMenu() {
    const desktop = document.querySelector('.desktop');
    
    // Create desktop context menu
    const desktopMenu = document.createElement('div');
    desktopMenu.className = 'context-menu';
    desktopMenu.id = 'desktop-menu';
    desktopMenu.style.zIndex = '10000'; // Ensure menu is on top
    desktopMenu.innerHTML = `
        <div class="context-menu-item" data-action="newfile">
            <i class="fas fa-file"></i> New Text File
        </div>
        <div class="context-menu-item" data-action="newfolder">
            <i class="fas fa-folder"></i> New Folder
        </div>
        <div class="context-menu-item" data-action="refresh">
            <i class="fas fa-sync"></i> Refresh
        </div>
    `;
    
    // Create file-specific context menu for user-created files
    const fileMenu = document.createElement('div');
    fileMenu.className = 'context-menu';
    fileMenu.id = 'file-menu-user';
    fileMenu.style.zIndex = '10000'; // Ensure menu is on top
    fileMenu.innerHTML = `
        <div class="context-menu-item" data-action="open">
            <i class="fas fa-folder-open"></i> Open
        </div>
        <div class="context-menu-item" data-action="rename">
            <i class="fas fa-edit"></i> Rename
        </div>
        <div class="context-menu-item" data-action="delete">
            <i class="fas fa-trash"></i> Delete
        </div>
    `;
    
    // Create file-specific context menu for system files (no delete option)
    const sysFileMenu = document.createElement('div');
    sysFileMenu.className = 'context-menu';
    sysFileMenu.id = 'file-menu-system';
    sysFileMenu.style.zIndex = '10000'; // Ensure menu is on top
    sysFileMenu.innerHTML = `
        <div class="context-menu-item" data-action="open">
            <i class="fas fa-folder-open"></i> Open
        </div>
        <div class="context-menu-item" data-action="rename">
            <i class="fas fa-edit"></i> Rename
        </div>
    `;
    
    document.body.appendChild(desktopMenu);
    document.body.appendChild(fileMenu);
    document.body.appendChild(sysFileMenu);
    
    // Variable to store the currently right-clicked icon
    let currentIcon = null;
    
    // Handle right-click on desktop
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up
        
        // First, hide all menus
        desktopMenu.style.display = 'none';
        fileMenu.style.display = 'none';
        sysFileMenu.style.display = 'none';
        
        // Check if we're clicking on an icon
        const icon = e.target.closest('.icon');
        
        if (icon) {
            // We're right-clicking on an icon
            currentIcon = icon;
            const windowType = icon.getAttribute('data-window');
            
            // Check if this is a system icon
            const systemIcons = ['projects', 'contact', 'resume', 'about', 'blockchain', 'certifications', 'current', 'terminal', 'trash'];
            const isSystemIcon = systemIcons.includes(windowType);
            
            // Position and show appropriate menu
            if (isSystemIcon) {
                sysFileMenu.style.left = e.clientX + 'px';
                sysFileMenu.style.top = e.clientY + 'px';
                sysFileMenu.style.display = 'block';
            } else {
                fileMenu.style.left = e.clientX + 'px';
                fileMenu.style.top = e.clientY + 'px';
                fileMenu.style.display = 'block';
            }
        } else {
            // We're right-clicking on empty desktop space
            currentIcon = null;
            desktopCreationPosition = {
                left: e.clientX,
                top: e.clientY
            };
            
            // Position and show desktop menu
            desktopMenu.style.left = e.clientX + 'px';
            desktopMenu.style.top = e.clientY + 'px';
            desktopMenu.style.display = 'block';
        }
    });
    
    // Hide all context menus when clicking elsewhere
    document.addEventListener('click', function(e) {
        // Don't hide if clicking inside a context menu
        if (e.target.closest('.context-menu')) {
            return;
        }
        desktopMenu.style.display = 'none';
        fileMenu.style.display = 'none';
        sysFileMenu.style.display = 'none';
    });
    
    // Handle desktop menu actions
    desktopMenu.addEventListener('click', function(e) {
        const item = e.target.closest('.context-menu-item');
        if (!item) return;
        
        const action = item.getAttribute('data-action');
        
        switch(action) {
            case 'newfile':
                createNewFile();
                break;
            case 'newfolder':
                createNewFolder();
                break;
            case 'refresh':
                resetIconPositions();
                break;
        }
    });
    
    // Handle user file menu actions
    fileMenu.addEventListener('click', function(e) {
        const item = e.target.closest('.context-menu-item');
        if (!item || !currentIcon) return;
        
        const action = item.getAttribute('data-action');
        const windowType = currentIcon.getAttribute('data-window');
        
        switch(action) {
            case 'open':
                // Select the icon
                document.querySelectorAll('.icon').forEach(icon => {
                    icon.classList.remove('selected');
                });
                currentIcon.classList.add('selected');
                
                openWindow(windowType);
                break;
            case 'rename':
                renameFile(currentIcon);
                break;
            case 'delete':
                deleteFile(currentIcon);
                break;
        }
    });
    
    // Handle system file menu actions
    sysFileMenu.addEventListener('click', function(e) {
        const item = e.target.closest('.context-menu-item');
        if (!item || !currentIcon) return;
        
        const action = item.getAttribute('data-action');
        const windowType = currentIcon.getAttribute('data-window');
        
        switch(action) {
            case 'open':
                // Select the icon
                document.querySelectorAll('.icon').forEach(icon => {
                    icon.classList.remove('selected');
                });
                currentIcon.classList.add('selected');
                
                openWindow(windowType);
                break;
            case 'rename':
                renameFile(currentIcon);
                break;
        }
    });
}

// Create a new text file
function createNewFile() {
    showDesktopDialog({
        title: 'Create New File',
        description: 'Give your new desktop file a clean, memorable name.',
        label: 'File name',
        defaultValue: 'New File.txt',
        confirmText: 'Create File'
    }, function(fileName) {
        if (!fileName) return;

        // Create a new icon
        const newIcon = createNewIcon(fileName, 'fas fa-file-alt', 'notepad');

        // Initialize empty file content
        localStorage.setItem(`file_${fileName}`, '');

        // Position the icon at the right-click location
        if (desktopCreationPosition) {
            const boundedPosition = clampIconPosition(newIcon, desktopCreationPosition.left, desktopCreationPosition.top);
            newIcon.style.left = `${boundedPosition.left}px`;
            newIcon.style.top = `${boundedPosition.top}px`;
            saveIconPosition(newIcon);
            saveUserFiles();
        }

        // Hide the context menu
        document.querySelectorAll('.context-menu').forEach(menu => {
            menu.style.display = 'none';
        });

        // Play sound effect
        playSound('create');
    });
}

function setupPortfolioTerminal() {
    const form = document.getElementById('portfolio-terminal-form');
    const input = document.getElementById('portfolio-terminal-input');
    const output = document.getElementById('portfolio-terminal-output');
    const prompt = document.querySelector('.terminal-prompt');

    if (!form || !input || !output || !prompt) return;

    let currentDirectory = [];

    const shortcutCommands = {
        about: () => launchSystemTarget('about', 'Opening About Me...'),
        resume: () => launchSystemTarget('resume', 'Opening Resume...'),
        projects: () => launchSystemTarget('projects', 'Opening Projects...'),
        contact: () => launchSystemTarget('contact', 'Opening Contact...'),
        blockchain: () => launchSystemTarget('blockchain', 'Opening Blockchain Projects...'),
        certifications: () => launchSystemTarget('certifications', 'Opening Certifications...'),
        current: () => launchSystemTarget('current', 'Opening Current.exe...'),
        github: () => launchSystemTarget('github', 'Launching GitHub profile...'),
        linkedin: () => launchSystemTarget('linkedin', 'Launching LinkedIn...')
    };

    updatePrompt();

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const rawCommand = input.value.trim();
        if (!rawCommand) return;

        printTerminalLine(`${getPromptText()} ${rawCommand}`);
        input.value = '';
        handleTerminalCommand(rawCommand);

        output.scrollTop = output.scrollHeight;
    });

    function handleTerminalCommand(rawCommand) {
        const parts = tokenizeTerminalCommand(rawCommand);
        if (!parts.length) return;

        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (shortcutCommands[command]) {
            shortcutCommands[command]();
            return;
        }

        switch (command) {
            case 'help':
                printTerminalLine('Commands: ls, dir, cd, pwd, open, cat, mkdir, touch, rm, del, cls, clear, help');
                printTerminalLine('Shortcuts: about, resume, projects, contact, github, linkedin, blockchain, certifications, current');
                break;
            case 'ls':
            case 'dir':
                listCurrentDirectory();
                break;
            case 'pwd':
                printTerminalLine(getPromptPath());
                break;
            case 'cd':
                changeDirectory(args);
                break;
            case 'open':
            case 'start':
                openTerminalTarget(args);
                break;
            case 'cat':
            case 'type':
                printFileContents(args);
                break;
            case 'mkdir':
                createTerminalFolder(args);
                break;
            case 'touch':
                createTerminalFile(args);
                break;
            case 'rm':
            case 'del':
                removeTerminalEntry(args);
                break;
            case 'cls':
            case 'clear':
                output.innerHTML = '';
                break;
            default:
                printTerminalLine(`Unknown command: ${command}. Type help to see available commands.`, 'terminal-error');
        }
    }

    function getPromptPath() {
        return `C:\\portfolio\\desktop${currentDirectory.length ? `\\${currentDirectory.join('\\')}` : ''}`;
    }

    function getPromptText() {
        return `${getPromptPath()}>`;
    }

    function updatePrompt() {
        prompt.textContent = getPromptText();
    }

    function listCurrentDirectory() {
        const entries = getCurrentEntries();
        if (!entries.length) {
            printTerminalLine('Directory is empty.');
            return;
        }

        entries.forEach(entry => {
            printTerminalLine(`${entry.label.padEnd(7)} ${entry.name}`);
        });
    }

    function changeDirectory(args) {
        if (!args.length) {
            printTerminalLine(getPromptPath());
            return;
        }

        const target = args.join(' ').trim();
        if (target === '\\' || target === '/' || target.toLowerCase() === 'desktop') {
            currentDirectory = [];
            updatePrompt();
            return;
        }

        if (target === '..') {
            if (currentDirectory.length) {
                currentDirectory.pop();
            }
            updatePrompt();
            return;
        }

        const folderEntry = findEntryByName(getCurrentEntries(), target, ['folder']);
        if (!folderEntry) {
            printTerminalLine(`The system cannot find the path specified: ${target}`, 'terminal-error');
            return;
        }

        currentDirectory.push(folderEntry.name);
        updatePrompt();
    }

    function openTerminalTarget(args) {
        if (!args.length) {
            printTerminalLine('Usage: open <target>', 'terminal-error');
            return;
        }

        const targetName = args.join(' ').trim();
        const entry = findEntryByName(getCurrentEntries(), targetName);

        if (!entry) {
            printTerminalLine(`Cannot open "${targetName}".`, 'terminal-error');
            return;
        }

        if (entry.kind === 'system') {
            launchSystemTarget(entry.id);
            printTerminalLine(`Opened ${entry.name}.`, 'terminal-success');
            return;
        }

        if (entry.kind === 'folder') {
            if (currentDirectory.length === 0) {
                openDesktopItem(entry.name, 'folder');
                printTerminalLine(`Opened folder ${entry.name}.`, 'terminal-success');
            } else {
                currentDirectory.push(entry.name);
                updatePrompt();
            }
            return;
        }

        if (entry.kind === 'file') {
            if (currentDirectory.length === 0) {
                openDesktopItem(entry.name, 'notepad');
            } else {
                openVirtualItem(entry.name, 'file');
            }
            printTerminalLine(`Opened file ${entry.name}.`, 'terminal-success');
        }
    }

    function printFileContents(args) {
        if (!args.length) {
            printTerminalLine('Usage: cat <file>', 'terminal-error');
            return;
        }

        const targetName = args.join(' ').trim();
        const entry = findEntryByName(getCurrentEntries(), targetName, ['file']);
        if (!entry) {
            printTerminalLine(`File not found: ${targetName}`, 'terminal-error');
            return;
        }

        const content = localStorage.getItem(`file_${entry.name}`) || '[empty file]';
        content.split('\n').forEach(line => printTerminalLine(line || ' '));
    }

    function createTerminalFolder(args) {
        if (!args.length) {
            printTerminalLine('Usage: mkdir <folder-name>', 'terminal-error');
            return;
        }

        const folderName = args.join(' ').trim();
        if (findEntryByName(getCurrentEntries(), folderName)) {
            printTerminalLine(`An item named "${folderName}" already exists.`, 'terminal-error');
            return;
        }

        if (currentDirectory.length === 0) {
            const newIcon = createNewIcon(folderName, 'fas fa-folder', 'folder');
            localStorage.setItem(`folder_${folderName}`, JSON.stringify([]));
            setDefaultIconPosition(newIcon, document.querySelectorAll('.icon').length - 1);
            saveUserFiles();
        } else {
            const items = getFolderItems(currentDirectory[currentDirectory.length - 1]);
            items.push({ name: folderName, type: 'folder' });
            setFolderItems(currentDirectory[currentDirectory.length - 1], items);
            localStorage.setItem(`folder_${folderName}`, JSON.stringify([]));
        }

        printTerminalLine(`Folder created: ${folderName}`, 'terminal-success');
    }

    function createTerminalFile(args) {
        if (!args.length) {
            printTerminalLine('Usage: touch <file-name>', 'terminal-error');
            return;
        }

        const fileName = args.join(' ').trim();
        if (findEntryByName(getCurrentEntries(), fileName)) {
            printTerminalLine(`An item named "${fileName}" already exists.`, 'terminal-error');
            return;
        }

        if (currentDirectory.length === 0) {
            const newIcon = createNewIcon(fileName, 'fas fa-file-alt', 'notepad');
            localStorage.setItem(`file_${fileName}`, '');
            setDefaultIconPosition(newIcon, document.querySelectorAll('.icon').length - 1);
            saveUserFiles();
        } else {
            const items = getFolderItems(currentDirectory[currentDirectory.length - 1]);
            items.push({ name: fileName, type: 'file' });
            setFolderItems(currentDirectory[currentDirectory.length - 1], items);
            localStorage.setItem(`file_${fileName}`, '');
        }

        printTerminalLine(`File created: ${fileName}`, 'terminal-success');
    }

    function removeTerminalEntry(args) {
        if (!args.length) {
            printTerminalLine('Usage: rm <file-or-folder>', 'terminal-error');
            return;
        }

        const targetName = args.join(' ').trim();
        const entry = findEntryByName(getCurrentEntries(), targetName);
        if (!entry) {
            printTerminalLine(`Cannot remove "${targetName}".`, 'terminal-error');
            return;
        }

        if (entry.kind === 'system') {
            printTerminalLine('System items are read-only in this terminal.', 'terminal-error');
            return;
        }

        if (currentDirectory.length === 0) {
            removeDesktopItem(entry.name, entry.kind === 'folder' ? 'folder' : 'notepad');
        } else {
            const folderName = currentDirectory[currentDirectory.length - 1];
            const items = getFolderItems(folderName).filter(item => normalizeTerminalName(item.name) !== normalizeTerminalName(entry.name));
            setFolderItems(folderName, items);

            if (entry.kind === 'folder') {
                localStorage.removeItem(`folder_${entry.name}`);
            } else {
                localStorage.removeItem(`file_${entry.name}`);
            }
        }

        printTerminalLine(`Removed ${entry.name}.`, 'terminal-success');
    }

    function getCurrentEntries() {
        if (currentDirectory.length === 0) {
            return [
                { name: 'about', kind: 'system', label: '<APP>', id: 'about' },
                { name: 'resume', kind: 'system', label: '<APP>', id: 'resume' },
                { name: 'projects', kind: 'system', label: '<APP>', id: 'projects' },
                { name: 'contact', kind: 'system', label: '<APP>', id: 'contact' },
                { name: 'blockchain', kind: 'system', label: '<APP>', id: 'blockchain' },
                { name: 'certifications', kind: 'system', label: '<APP>', id: 'certifications' },
                { name: 'current', kind: 'system', label: '<APP>', id: 'current' },
                { name: 'github', kind: 'system', label: '<LINK>', id: 'github' },
                { name: 'linkedin', kind: 'system', label: '<LINK>', id: 'linkedin' },
                ...getDesktopUserEntries()
            ];
        }

        return getFolderItems(currentDirectory[currentDirectory.length - 1]).map(item => ({
            name: item.name,
            kind: item.type === 'folder' ? 'folder' : 'file',
            label: item.type === 'folder' ? '<DIR>' : '<FILE>'
        }));
    }

    function launchSystemTarget(targetId, successMessage) {
        const links = {
            github: 'https://github.com/jvitorbarros15',
            linkedin: 'https://www.linkedin.com/in/joaovi/'
        };

        if (links[targetId]) {
            window.open(links[targetId], '_blank', 'noopener,noreferrer');
        } else {
            openPortfolioWindow(targetId);
        }

        if (successMessage) {
            printTerminalLine(successMessage, 'terminal-success');
        }
    }
}

function tokenizeTerminalCommand(rawCommand) {
    const matches = rawCommand.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    return matches.map(part => part.replace(/^"(.*)"$/, '$1'));
}

function normalizeTerminalName(name) {
    return (name || '').trim().toLowerCase();
}

function findEntryByName(entries, targetName, allowedKinds = null) {
    const normalizedTarget = normalizeTerminalName(targetName);
    return entries.find(entry => {
        const kindMatches = !allowedKinds || allowedKinds.includes(entry.kind);
        return kindMatches && normalizeTerminalName(entry.name) === normalizedTarget;
    });
}

function getDesktopUserEntries() {
    return Array.from(document.querySelectorAll('.icon'))
        .filter(icon => {
            const type = icon.getAttribute('data-window');
            return type === 'notepad' || type === 'folder';
        })
        .map(icon => {
            const name = icon.querySelector('.icon-text').textContent.trim();
            const type = icon.getAttribute('data-window');
            return {
                name,
                kind: type === 'folder' ? 'folder' : 'file',
                label: type === 'folder' ? '<DIR>' : '<FILE>'
            };
        });
}

function getFolderItems(folderName) {
    try {
        return JSON.parse(localStorage.getItem(`folder_${folderName}`)) || [];
    } catch (error) {
        return [];
    }
}

function setFolderItems(folderName, items) {
    localStorage.setItem(`folder_${folderName}`, JSON.stringify(items));
}

function openDesktopItem(name, windowType) {
    const icon = Array.from(document.querySelectorAll('.icon')).find(item => {
        return item.getAttribute('data-window') === windowType &&
            normalizeTerminalName(item.querySelector('.icon-text').textContent) === normalizeTerminalName(name);
    });

    if (!icon) return;

    document.querySelectorAll('.icon').forEach(item => item.classList.remove('selected'));
    icon.classList.add('selected');
    openWindow(windowType);
}

function openVirtualItem(name, type) {
    const tempIcon = document.createElement('div');
    tempIcon.className = 'icon selected';
    tempIcon.setAttribute('data-window', type === 'folder' ? 'folder' : 'notepad');
    tempIcon.innerHTML = `
        <div class="icon-img">
            <i class="fas ${type === 'folder' ? 'fa-folder' : 'fa-file-alt'}"></i>
        </div>
        <div class="icon-text">${name}</div>
    `;

    document.querySelector('.desktop').appendChild(tempIcon);
    openWindow(type === 'folder' ? 'folder' : 'notepad');

    setTimeout(function() {
        tempIcon.remove();
    }, 100);
}

function removeDesktopItem(name, windowType) {
    const icon = Array.from(document.querySelectorAll('.icon')).find(item => {
        return item.getAttribute('data-window') === windowType &&
            normalizeTerminalName(item.querySelector('.icon-text').textContent) === normalizeTerminalName(name);
    });

    if (!icon) return;

    if (windowType === 'folder') {
        localStorage.removeItem(`folder_${name}`);
    } else {
        localStorage.removeItem(`file_${name}`);
    }

    icon.remove();
    saveUserFiles();
}

function printTerminalLine(text, className = '') {
    const output = document.getElementById('portfolio-terminal-output');
    if (!output) return;

    const line = document.createElement('div');
    line.className = `terminal-line${className ? ` ${className}` : ''}`;
    line.textContent = text;
    output.appendChild(line);
}

function focusTerminalInput() {
    const input = document.getElementById('portfolio-terminal-input');
    if (!input) return;

    setTimeout(function() {
        input.focus();
    }, 30);
}

function openPortfolioWindow(windowType) {
    document.querySelectorAll('.icon').forEach(icon => {
        icon.classList.remove('selected');
    });

    const icon = document.querySelector(`.icon[data-window="${windowType}"]`);
    if (icon) {
        icon.classList.add('selected');
    }

    openWindow(windowType);
}

// Create a new folder
function createNewFolder() {
    showDesktopDialog({
        title: 'Create New Folder',
        description: 'Name your new folder and keep your desktop organized.',
        label: 'Folder name',
        defaultValue: 'New Folder',
        confirmText: 'Create Folder'
    }, function(folderName) {
        if (!folderName) return;

        // Create a new icon
        const newIcon = createNewIcon(folderName, 'fas fa-folder', 'folder');

        // Initialize empty folder content
        const emptyFolder = [];
        localStorage.setItem(`folder_${folderName}`, JSON.stringify(emptyFolder));

        // Position the icon at the right-click location
        if (desktopCreationPosition) {
            const boundedPosition = clampIconPosition(newIcon, desktopCreationPosition.left, desktopCreationPosition.top);
            newIcon.style.left = `${boundedPosition.left}px`;
            newIcon.style.top = `${boundedPosition.top}px`;
            saveIconPosition(newIcon);
            saveUserFiles();
        }

        // Hide the context menu
        document.querySelectorAll('.context-menu').forEach(menu => {
            menu.style.display = 'none';
        });

        // Play sound effect
        playSound('create');
    });
}

function setupDesktopDialog() {
    const overlay = document.getElementById('desktop-dialog-overlay');
    const closeBtn = document.getElementById('desktop-dialog-close');
    const cancelBtn = document.getElementById('desktop-dialog-cancel');
    const confirmBtn = document.getElementById('desktop-dialog-confirm');
    const input = document.getElementById('desktop-dialog-input');

    if (!overlay || !closeBtn || !cancelBtn || !confirmBtn || !input) return;

    function cancelDialog() {
        if (desktopDialogResolver) {
            desktopDialogResolver(null);
        }
        closeDesktopDialog();
    }

    function confirmDialog() {
        const value = input.value.trim();
        if (!value) {
            input.focus();
            return;
        }

        if (desktopDialogResolver) {
            desktopDialogResolver(value);
        }
        closeDesktopDialog();
    }

    closeBtn.addEventListener('click', cancelDialog);
    cancelBtn.addEventListener('click', cancelDialog);
    confirmBtn.addEventListener('click', confirmDialog);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            cancelDialog();
        }
    });

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmDialog();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelDialog();
        }
    });
}

function showDesktopDialog(options, onConfirm) {
    const overlay = document.getElementById('desktop-dialog-overlay');
    const title = document.getElementById('desktop-dialog-title');
    const description = document.getElementById('desktop-dialog-description');
    const label = document.getElementById('desktop-dialog-label');
    const input = document.getElementById('desktop-dialog-input');
    const confirmBtn = document.getElementById('desktop-dialog-confirm');

    if (!overlay || !title || !description || !label || !input || !confirmBtn) {
        const fallbackValue = prompt(options.label + ':', options.defaultValue || '');
        if (fallbackValue && onConfirm) {
            onConfirm(fallbackValue.trim());
        }
        return;
    }

    title.textContent = options.title || 'Create New Item';
    description.textContent = options.description || '';
    label.textContent = options.label || 'Name';
    input.value = options.defaultValue || '';
    confirmBtn.textContent = options.confirmText || 'Create';
    desktopDialogResolver = onConfirm;

    document.querySelectorAll('.context-menu').forEach(menu => {
        menu.style.display = 'none';
    });

    overlay.classList.add('visible');

    setTimeout(function() {
        input.focus();
        input.select();
    }, 10);
}

function closeDesktopDialog() {
    const overlay = document.getElementById('desktop-dialog-overlay');
    const input = document.getElementById('desktop-dialog-input');

    if (overlay) {
        overlay.classList.remove('visible');
    }

    if (input) {
        input.value = '';
    }

    desktopDialogResolver = null;
}

// Create a new icon on the desktop
function createNewIcon(name, iconClass, windowType) {
    const desktop = document.querySelector('.desktop');
    
    // Create the icon element
    const newIcon = document.createElement('div');
    newIcon.className = 'icon';
    newIcon.setAttribute('data-window', windowType);
    
    newIcon.innerHTML = `
        <div class="icon-img">
            <i class="${iconClass}"></i>
        </div>
        <div class="icon-text">${name}</div>
    `;
    
    // Add to desktop
    desktop.appendChild(newIcon);
    
    // Set initial position
    const icons = document.querySelectorAll('.icon');
    const index = icons.length - 1;
    const margin = 20;
    const iconHeight = 100;
    const spacing = 10;
    
    // Position vertically on the left side
    newIcon.style.left = `${margin}px`;
    newIcon.style.top = `${margin + (index * (iconHeight + spacing))}px`;
    
    // Make the new icon draggable
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    let hasMoved = false;
    
    // Touch events for mobile
    newIcon.addEventListener('touchstart', handleStart, { passive: false });
    newIcon.addEventListener('touchmove', handleMove, { passive: false });
    newIcon.addEventListener('touchend', handleEnd);
    
    // Mouse events for desktop
    newIcon.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    function handleStart(e) {
        // Prevent event conflicts
        if (e.type === 'touchstart') {
            e.preventDefault();
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }
        
        // Get current position
        const rect = newIcon.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        isDragging = true;
        hasMoved = false;
        newIcon.style.zIndex = 10; // Bring to front while dragging
        
        // Remove active class from all icons
        document.querySelectorAll('.icon').forEach(i => {
            i.classList.remove('active', 'selected', 'dragging');
        });
        
        // Add active class for dragging and selected class for visual
        newIcon.classList.add('active', 'selected');
    }
    
    function handleMove(e) {
        if (!isDragging) return;
        
        let clientX, clientY;
        
        if (e.type === 'touchmove') {
            e.preventDefault();
            const touch = e.touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            return;
        }
        
        // Check if actually moved (more than 5px to account for small movements)
        const deltaX = Math.abs(clientX - startX);
        const deltaY = Math.abs(clientY - startY);
        
        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;
            
            // Add dragging class once we're sure the user is dragging
            if (!newIcon.classList.contains('dragging')) {
                newIcon.classList.add('dragging');
            }
            
            // Calculate new position
            const moveX = clientX - startX;
            const moveY = clientY - startY;
            
            const newLeft = startLeft + moveX;
            const newTop = startTop + moveY;
            
            // Keep within desktop bounds
            const boundedPosition = clampIconPosition(newIcon, newLeft, newTop);
            
            // Apply new position
            newIcon.style.left = `${boundedPosition.left}px`;
            newIcon.style.top = `${boundedPosition.top}px`;
            
            // Save position
            saveIconPosition(newIcon);
        }
    }
    
    function handleEnd() {
        if (isDragging) {
            isDragging = false;
            newIcon.style.zIndex = 1; // Reset z-index
            newIcon.classList.remove('active', 'dragging');
            
            // If not moved, keep the selected class
            if (!hasMoved) {
                newIcon.classList.add('selected');
            }

            if (hasMoved) {
                saveUserFiles();
            }
        }
    }
    
    // Add double-click functionality
    newIcon.addEventListener('dblclick', function() {
        const windowType = this.getAttribute('data-window');
        const fileName = this.querySelector('.icon-text').textContent;
        
        // Select the icon
        document.querySelectorAll('.icon').forEach(icon => {
            icon.classList.remove('selected');
        });
        this.classList.add('selected');
        
        // Open the window
        openWindow(windowType);
        
        // Set the window title
        const windowTitle = document.querySelector(`#${windowType}-window .window-title span`);
        if (windowTitle) {
            windowTitle.textContent = fileName;
        }
    });
    
    // Save user files to localStorage
    saveUserFiles();
    
    return newIcon;
}

function setupIconDraggable(icon) {
    const desktop = document.querySelector('.desktop');
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    let hasMoved = false;

    icon.addEventListener('touchstart', handleStart, { passive: false });
    icon.addEventListener('touchmove', handleMove, { passive: false });
    icon.addEventListener('touchend', handleEnd);

    icon.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    function handleStart(e) {
        if (e.type === 'touchstart') {
            e.preventDefault();
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }

        const rect = icon.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;

        isDragging = true;
        hasMoved = false;
        icon.style.zIndex = 10;

        document.querySelectorAll('.icon').forEach(i => {
            i.classList.remove('active', 'selected', 'dragging');
        });

        icon.classList.add('active', 'selected');
    }

    function handleMove(e) {
        if (!isDragging) return;

        let clientX, clientY;

        if (e.type === 'touchmove') {
            e.preventDefault();
            const touch = e.touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else if (e.type === 'mousemove') {
            clientX = e.clientX;
            clientY = e.clientY;
        } else {
            return;
        }

        const deltaX = Math.abs(clientX - startX);
        const deltaY = Math.abs(clientY - startY);

        if (deltaX > 5 || deltaY > 5) {
            hasMoved = true;

            if (!icon.classList.contains('dragging')) {
                icon.classList.add('dragging');
            }

            const moveX = clientX - startX;
            const moveY = clientY - startY;
            const boundedPosition = clampIconPosition(icon, startLeft + moveX, startTop + moveY);

            icon.style.left = `${boundedPosition.left}px`;
            icon.style.top = `${boundedPosition.top}px`;
            saveUserFiles();
        }
    }

    function handleEnd() {
        if (isDragging) {
            isDragging = false;
            icon.style.zIndex = 1;
            icon.classList.remove('active', 'dragging');

            if (!hasMoved) {
                icon.classList.add('selected');
            }
        }
    }
}

function cleanupDefaultNewFiles() {
    const savedFiles = localStorage.getItem('userFiles');
    if (savedFiles) {
        let files = [];
        try {
            files = JSON.parse(savedFiles);
        } catch (error) {
            files = [];
        }

        const filteredFiles = files.filter(file => {
            return !(file.windowType === 'notepad' && file.name === 'New File.txt');
        });

        if (filteredFiles.length !== files.length) {
            localStorage.setItem('userFiles', JSON.stringify(filteredFiles));
        }
    }

    document.querySelectorAll('.icon').forEach(icon => {
        const windowType = icon.getAttribute('data-window');
        const name = icon.querySelector('.icon-text')?.textContent?.trim();

        if (windowType === 'notepad' && name === 'New File.txt') {
            icon.remove();
        }
    });

    localStorage.removeItem('file_New File.txt');
    saveUserFiles();
}

// Save user created files to localStorage
function saveUserFiles() {
    const userFiles = [];
    
    // Collect all user-created icons (excluding default ones)
    document.querySelectorAll('.icon').forEach(icon => {
        // Get file data
        const windowType = icon.getAttribute('data-window');
        const name = icon.querySelector('.icon-text').textContent;
        const iconClass = icon.querySelector('.icon-img i').className;
        const left = icon.style.left;
        const top = icon.style.top;
        
        // Only save user-created files
        if (windowType === 'notepad' || windowType === 'folder') {
            userFiles.push({
                name,
                iconClass,
                windowType,
                position: { left, top }
            });
        }
    });
    
    // Save to localStorage
    localStorage.setItem('userFiles', JSON.stringify(userFiles));
}

// Load user files from localStorage
function loadUserFiles() {
    const savedFiles = localStorage.getItem('userFiles');
    
    if (savedFiles) {
        const files = JSON.parse(savedFiles);
        
        files.forEach(file => {
            // Create the icon element
            const newIcon = document.createElement('div');
            newIcon.className = 'icon';
            newIcon.setAttribute('data-window', file.windowType);
            
            newIcon.innerHTML = `
                <div class="icon-img">
                    <i class="${file.iconClass}"></i>
                </div>
                <div class="icon-text">${file.name}</div>
            `;
            
            // Position the icon
            // Add to desktop
            document.querySelector('.desktop').appendChild(newIcon);

            if (file.position) {
                const savedLeft = parseFloat(file.position.left);
                const savedTop = parseFloat(file.position.top);
                const boundedPosition = clampIconPosition(newIcon, savedLeft, savedTop);
                newIcon.style.left = `${boundedPosition.left}px`;
                newIcon.style.top = `${boundedPosition.top}px`;
            } else {
                setDefaultIconPosition(newIcon, document.querySelectorAll('.icon').length - 1);
            }
            
            // Make the icon draggable
            setupIconDraggable(newIcon);
            
            // Add double-click functionality
            newIcon.addEventListener('dblclick', function() {
                const windowType = this.getAttribute('data-window');
                openWindow(windowType);
            });
        });

        saveUserFiles();
    }
}

// Rename a file
function renameFile(icon) {
    const iconText = icon.querySelector('.icon-text');
    const currentName = iconText.textContent;
    const windowType = icon.getAttribute('data-window');
    
    // Check if this is a system icon that should not be renamed
    const systemIcons = ['projects', 'contact', 'resume', 'about', 'blockchain', 'certifications', 'current', 'terminal', 'trash'];
    if (systemIcons.includes(windowType)) {
        // For system files, just show the current name instead of allowing a rename
        alert(`This is a system file: "${currentName}"`);
        return;
    }
    
    const newName = prompt('Enter new name:', currentName);
    
    if (newName && newName !== currentName) {
        // Update the icon text
        iconText.textContent = newName;
        
        // If this is a user-created file, update storage
        if (windowType === 'notepad' || windowType === 'folder') {
            // If it's a text file, rename its content in localStorage
            if (windowType === 'notepad') {
                const content = localStorage.getItem(`file_${currentName}`);
                if (content !== null) {
                    localStorage.setItem(`file_${newName}`, content);
                    localStorage.removeItem(`file_${currentName}`);
                }
            }
            
            // If it's a folder, rename its content in localStorage
            if (windowType === 'folder') {
                const items = localStorage.getItem(`folder_${currentName}`);
                if (items !== null) {
                    localStorage.setItem(`folder_${newName}`, items);
                    localStorage.removeItem(`folder_${currentName}`);
                }
            }
            
            // Save updated user files
            saveUserFiles();
        }
    }
}

// Delete a file
function deleteFile(icon) {
    const fileName = icon.querySelector('.icon-text').textContent;
    const windowType = icon.getAttribute('data-window');
    
    // Check if this is a system icon that should not be deleted
    const systemIcons = ['projects', 'contact', 'resume', 'about', 'blockchain', 'certifications', 'current', 'terminal', 'trash'];
    if (systemIcons.includes(windowType)) {
        alert("This is a system file and cannot be deleted.");
        return;
    }
    
    // Confirm deletion
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
        // Remove file content from localStorage
        if (windowType === 'notepad') {
            localStorage.removeItem(`file_${fileName}`);
        } else if (windowType === 'folder') {
            localStorage.removeItem(`folder_${fileName}`);
        }
        
        // Add delete animation
        icon.style.transition = 'transform 0.3s, opacity 0.3s';
        icon.style.transform = 'scale(0.5)';
        icon.style.opacity = '0';
        
        // Remove the icon after animation
        setTimeout(() => {
            icon.remove();
            
            // Update user files
            saveUserFiles();
            
            // Play delete sound
            playSound('delete');
        }, 300);
    }
}

// Reset wallpaper to default
function resetWallpaper() {
    // Remove any saved wallpaper settings
    localStorage.removeItem('wallpaper');
    localStorage.removeItem('customWallpaperData');
    
    // Apply default wallpaper
    changeWallpaper('default');
} 
