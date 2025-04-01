// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the clock
    updateClock();
    setInterval(updateClock, 60000); // Update every minute
    
    // Initialize windows
    initWindows();
    
    // Initialize desktop icons
    initDesktopIcons();
    
    // Make icons draggable
    makeIconsDraggable();
    
    // Initialize blockchain
    initBlockchain();
    
    // Setup start button functionality
    setupStartButton();
    
    // Setup wallpaper settings
    setupWallpaperSettings();
    
    // Load saved wallpaper if exists
    loadSavedWallpaper();
});

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
    
    // Add click handler to desktop to deselect icons when clicking elsewhere
    desktop.addEventListener('click', function(e) {
        // Only deselect if the click is directly on the desktop, not on an icon or its children
        if (e.target === desktop) {
            icons.forEach(icon => icon.classList.remove('selected'));
        }
    });
    
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
            icons.forEach(i => i.classList.remove('active', 'selected', 'dragging'));
            
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
                const desktopRect = desktop.getBoundingClientRect();
                const iconRect = icon.getBoundingClientRect();
                
                const maxLeft = desktopRect.width - iconRect.width;
                const maxTop = desktopRect.height - iconRect.height - 40; // 40px for taskbar
                
                // Apply bounds
                const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
                const boundedTop = Math.max(0, Math.min(newTop, maxTop));
                
                // Check if position would overlap with another icon
                let isOverlapping = false;
                const minDistance = 60; // Minimum distance between icon centers
                
                icons.forEach(otherIcon => {
                    if (otherIcon !== icon) {
                        const otherLeft = parseInt(otherIcon.style.left || 0);
                        const otherTop = parseInt(otherIcon.style.top || 0);
                        
                        // Calculate distance between icon centers
                        const distance = Math.sqrt(
                            Math.pow(boundedLeft - otherLeft, 2) + 
                            Math.pow(boundedTop - otherTop, 2)
                        );
                        
                        if (distance < minDistance) {
                            isOverlapping = true;
                        }
                    }
                });
                
                // Only apply new position if not overlapping
                if (!isOverlapping) {
                    // Apply bounded position
                    icon.style.left = `${boundedLeft}px`;
                    icon.style.top = `${boundedTop}px`;
                }
            }
        }
        
        function handleEnd() {
            if (isDragging) {
                isDragging = false;
                icon.style.zIndex = 1;
                
                // Remove dragging class
                icon.classList.remove('dragging');
                
                // Only save position if actually moved
                if (hasMoved) {
                    saveIconPosition(icon);
                    // If moved, remove the selected class
                    icon.classList.remove('selected');
                }
                // If not moved, keep the selected class
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
        icons.forEach(icon => {
            const id = icon.getAttribute('data-window');
            if (positions[id]) {
                icon.style.left = positions[id].left;
                icon.style.top = positions[id].top;
            } else {
                // Default position for new icons
                setDefaultIconPosition(icon);
            }
        });
    } else {
        // Set default positions for first time
        icons.forEach((icon, index) => {
            setDefaultIconPosition(icon, index);
        });
    }
}

// Set default icon position in a natural layout
function setDefaultIconPosition(icon, index = 0) {
    const margin = 20;
    const iconWidth = 80;
    const iconSpacingX = 120; // More horizontal space between icons
    const iconSpacingY = 100; // Vertical spacing between icons
    
    // Determine number of icons per column based on window height
    const iconsPerColumn = Math.floor((window.innerHeight - 40 - margin) / iconSpacingY);
    
    // Calculate base position
    const column = Math.floor(index / iconsPerColumn);
    const row = index % iconsPerColumn;
    
    // Try positions until we find a non-overlapping one
    let found = false;
    let left = 0;
    let top = 0;
    let attempts = 0;
    const maxAttempts = 10;
    const minDistance = 60; // Minimum distance between icon centers
    
    const allIcons = document.querySelectorAll('.icon');
    
    while (!found && attempts < maxAttempts) {
        // Generate a position with randomness
        const randomOffsetX = Math.floor(Math.random() * 30) - 15; // -15 to +15 pixels
        const randomOffsetY = Math.floor(Math.random() * 30) - 15; // -15 to +15 pixels
        
        left = margin + (column * iconSpacingX) + randomOffsetX;
        top = margin + (row * iconSpacingY) + randomOffsetY;
        
        // Check if this position overlaps with any existing icon
        let overlapping = false;
        
        for (let i = 0; i < allIcons.length; i++) {
            const otherIcon = allIcons[i];
            if (otherIcon !== icon && otherIcon.style.left && otherIcon.style.top) {
                const otherLeft = parseInt(otherIcon.style.left);
                const otherTop = parseInt(otherIcon.style.top);
                
                // Calculate distance between icon centers
                const distance = Math.sqrt(
                    Math.pow(left - otherLeft, 2) + 
                    Math.pow(top - otherTop, 2)
                );
                
                if (distance < minDistance) {
                    overlapping = true;
                    break;
                }
            }
        }
        
        if (!overlapping) {
            found = true;
        }
        
        attempts++;
    }
    
    // Keep within bounds
    const maxLeft = window.innerWidth - iconWidth - margin;
    const maxTop = window.innerHeight - 40 - iconWidth - margin;
    
    left = Math.max(margin, Math.min(left, maxLeft));
    top = Math.max(margin, Math.min(top, maxTop));
    
    // Apply position
    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;
    
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
}

// Open a window
function openWindow(windowType) {
    const window = document.getElementById(`${windowType}-window`);
    
    if (window) {
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
        
        // Add to taskbar if not already there
        addToTaskbar(windowType);
        
        // Special handling for specific windows
        if (windowType === 'blockchain') {
            // Initialize blockchain if this is the blockchain window
            initBlockchain();
        }
        
        // Play sound effect (optional)
        playSound('open');
    }
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
    window.style.display = 'none';
    window.classList.remove('fullscreen');
    
    // Remove from taskbar
    const windowId = window.id;
    const windowType = windowId.replace('-window', '');
    
    // Reset blockchain if blockchain window is closed
    if (windowType === 'blockchain') {
        resetBlockchain();
    }
    
    removeFromTaskbar(windowType);
    
    // Add sound effect (optional)
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
    
    // Add click event to toggle window
    taskbarItem.addEventListener('click', function() {
        const window = document.getElementById(`${windowType}-window`);
        
        if (window.style.display === 'none') {
            // Use openWindow to show the window
            openWindow(windowType);
        } else if (window.classList.contains('active')) {
            // Minimize window if it's active
            minimizeWindow(window);
        } else {
            // Activate window if it's not active
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

// Play sound effect (for future implementation)
function playSound(action) {
    // This function is a placeholder for sound effects
    console.log(`Sound played: ${action}`);
}

// Handle window resize events for responsiveness
window.addEventListener('resize', function() {
    // Reposition icons within bounds if needed
    const icons = document.querySelectorAll('.icon');
    const desktop = document.querySelector('.desktop');
    const desktopRect = desktop.getBoundingClientRect();
    
    icons.forEach(icon => {
        const iconRect = icon.getBoundingClientRect();
        
        // Check if icon is outside bounds
        if (iconRect.right > desktopRect.width || iconRect.bottom > desktopRect.height - 40) {
            setDefaultIconPosition(icon);
        }
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
            title: "Genesis Block",
            description: "Welcome to my blockchain journey! As a Computer Science graduate from Penn State, I've been working on blockchain projects ranging from DeFi applications to quantum computing research. Explore my projects by adding blocks to this chain.",
            technologies: ["Blockchain", "Ethereum", "Solidity", "Web3"]
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
            title: "Decentralized Exchange (DEX)",
            description: "Developed a decentralized exchange using Ethereum smart contracts with automated market maker functionality, allowing users to swap tokens without intermediaries.",
            technologies: ["Solidity", "React", "Web3.js", "Ethereum", "Smart Contracts"]
        },
        {
            title: "NFT Marketplace",
            description: "Created a marketplace for digital art NFTs with features like minting, listing, bidding, and royalty payments to original creators. Integrated IPFS for decentralized storage.",
            technologies: ["ERC-721", "IPFS", "React", "Node.js", "Solidity"]
        },
        {
            title: "DeFi Lending Platform",
            description: "Built a decentralized lending platform that allows users to lend and borrow crypto assets with dynamic interest rates based on supply and demand.",
            technologies: ["Solidity", "Smart Contracts", "DeFi", "Chainlink", "React"]
        },
        {
            title: "Secure Decentralized Quantum Computing",
            description: "Research project exploring the integration of quantum computing with blockchain for enhanced security, scalability, and computational power in decentralized applications.",
            technologies: ["Quantum Algorithms", "Blockchain", "Security", "Research"]
        },
        {
            title: "Interoperable Blockchain Solutions",
            description: "Collaborating with Cosmos Network to develop cross-chain communication protocols enabling secure data exchange between different blockchain networks.",
            technologies: ["Cosmos SDK", "IBC Protocol", "Tendermint", "Cross-Chain"]
        },
        {
            title: "Blockchain Voting System",
            description: "Implemented a secure and transparent voting system using blockchain to ensure vote integrity and public verification while maintaining privacy.",
            technologies: ["Ethereum", "Zero-Knowledge Proofs", "Smart Contracts", "React"]
        },
        {
            title: "Web3 Personal Portfolio",
            description: "Created this interactive Windows-style portfolio showcasing blockchain and AI projects with features like draggable icons, theme customization, and blockchain simulation.",
            technologies: ["JavaScript", "HTML/CSS", "Web Design", "Interactive UI"]
        }
    ];
    
    // Return data for the current index, or the last one if index exceeds array length
    const dataIndex = (index - 1) % projectsData.length;
    return projectsData[dataIndex];
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
    
    // Add "Add Next Block" button if there are fewer than 8 blocks
    if (blockchain.length < 8) {
        const addBlockBtn = document.createElement('div');
        addBlockBtn.className = 'add-block-btn';
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
    });
}

// Reset all icon positions with an organic, natural arrangement
function resetIconPositions() {
    const icons = document.querySelectorAll('.icon');
    
    // Clear saved positions
    localStorage.removeItem('iconPositions');
    
    // Set new positions with staggered animation
    icons.forEach((icon, index) => {
        // Add a small animation effect
        icon.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        icon.style.opacity = '0';
        icon.style.transform = 'scale(0.8) translateY(20px)';
        
        // Stagger the animations
        setTimeout(() => {
            setDefaultIconPosition(icon, index);
            icon.style.opacity = '1';
            icon.style.transform = '';
        }, 100 + (index * 80)); // Staggered with longer delays
        
        // Remove transition after animation completes
        setTimeout(() => {
            icon.style.transition = '';
        }, 600 + (index * 80));
    });
    
    // Play sound effect (optional)
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
            desktop.style.backgroundColor = '#0078d7';
            
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
                    <p class="welcome-message">Welcome to my portfolio, click any icon to begin the search</p>
                </div>
            `;
            desktop.appendChild(personalizationOverlay);
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
            }
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