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
        // Make windows draggable
        makeWindowDraggable(window);
        
        // Window controls
        setupWindowControls(window);
    });
}

// Make icons draggable
function makeIconsDraggable() {
    const icons = document.querySelectorAll('.icon');
    const desktop = document.querySelector('.desktop');
    
    // Position icons initially
    positionIcons(icons);
    
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
            
            // Add active class
            icons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
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
                
                const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
                const boundedTop = Math.max(0, Math.min(newTop, maxTop));
                
                // Apply new position
                icon.style.left = `${boundedLeft}px`;
                icon.style.top = `${boundedTop}px`;
            }
        }
        
        function handleEnd() {
            if (isDragging) {
                isDragging = false;
                icon.style.zIndex = 1;
                
                // Only save position if actually moved
                if (hasMoved) {
                    saveIconPosition(icon);
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

// Set default icon position in a grid layout
function setDefaultIconPosition(icon, index = 0) {
    const margin = 20;
    const iconWidth = 80;
    const iconHeight = 100;
    const iconsPerColumn = Math.floor((window.innerHeight - 40) / iconHeight); // 40px for taskbar
    
    const column = Math.floor(index / iconsPerColumn);
    const row = index % iconsPerColumn;
    
    icon.style.left = `${margin + (column * (iconWidth + margin))}px`;
    icon.style.top = `${margin + (row * iconHeight)}px`;
    
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

// Make a window draggable
function makeWindowDraggable(window) {
    const header = window.querySelector('.window-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', function(e) {
        // Don't drag if clicked on window controls or if window is in fullscreen
        if (e.target.closest('.window-controls') || window.classList.contains('fullscreen')) return;
        
        isDragging = true;
        
        // Make window active
        activateWindow(window);
        
        // Calculate the offset from the mouse to the window corner
        const rect = window.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Change cursor
        window.style.cursor = 'move';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
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
        // Display the window
        window.style.display = 'flex';
        
        // Open in fullscreen by default
        window.classList.add('fullscreen');
        
        // Add active class
        activateWindow(window);
        
        // Add to taskbar if not already there
        addToTaskbar(windowType);
        
        // Add sound effect (optional)
        playSound('open');
    }
}

// Toggle fullscreen mode
function toggleFullscreen(window) {
    window.classList.toggle('fullscreen');
    
    // Add sound effect (optional)
    playSound('maximize');
}

// Close a window
function closeWindow(window) {
    window.style.display = 'none';
    window.classList.remove('fullscreen');
    
    // Remove from taskbar
    const windowId = window.id;
    const windowType = windowId.replace('-window', '');
    removeFromTaskbar(windowType);
    
    // Add sound effect (optional)
    playSound('close');
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
            window.style.display = 'flex';
            activateWindow(window);
        } else if (window.classList.contains('active')) {
            minimizeWindow(window);
        } else {
            activateWindow(window);
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
        blockchain = JSON.parse(savedBlockchain);
        renderBlockchain(blockchain);
    } else {
        // Create genesis block
        const genesisBlock = createGenesisBlock();
        blockchain.push(genesisBlock);
        renderBlockchain(blockchain);
        
        // Save to localStorage
        localStorage.setItem('blockchainData', JSON.stringify(blockchain));
    }
}

// Create the genesis block
function createGenesisBlock() {
    return {
        index: 0,
        timestamp: new Date().toISOString(),
        data: {
            title: "Genesis Block",
            description: "Welcome to my blockchain projects showcase. I'm passionate about blockchain technology and have been working on various projects in this space.",
            technologies: ["Blockchain", "Web3", "Smart Contracts"]
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
            title: "Decentralized Exchange",
            description: "Developed a decentralized exchange (DEX) using Ethereum smart contracts with automated market maker functionality.",
            technologies: ["Solidity", "React", "Web3.js", "Ethereum"]
        },
        {
            title: "NFT Marketplace",
            description: "Created a marketplace for digital art NFTs with features like minting, listing, bidding, and royalty payments to original creators.",
            technologies: ["ERC-721", "IPFS", "React", "Node.js"]
        },
        {
            title: "DeFi Lending Platform",
            description: "Built a decentralized lending platform that allows users to lend and borrow crypto assets with dynamic interest rates.",
            technologies: ["Solidity", "Smart Contracts", "DeFi", "Chainlink"]
        },
        {
            title: "Blockchain Voting System",
            description: "Implemented a secure and transparent voting system using blockchain to ensure vote integrity and public verification.",
            technologies: ["Ethereum", "Zero-Knowledge Proofs", "React"]
        },
        {
            title: "Supply Chain Tracking",
            description: "Developed a supply chain tracking solution using blockchain to provide traceability and transparency across the entire supply chain.",
            technologies: ["Hyperledger", "IoT", "React", "Node.js"]
        },
        {
            title: "Cross-Chain Bridge",
            description: "Built a bridge enabling asset transfers between different blockchain networks while maintaining security and efficiency.",
            technologies: ["Solidity", "Cosmos SDK", "Interoperability"]
        },
        {
            title: "DAO Governance Platform",
            description: "Created a decentralized autonomous organization platform with proposal submission, voting, and treasury management.",
            technologies: ["Aragon", "The Graph", "Ethereum", "React"]
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
        const dateFormatted = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        blockElement.innerHTML = `
            <div class="block-header">
                <span class="block-number">Block #${block.index}</span>
                <span class="timestamp">${dateFormatted}</span>
            </div>
            <div class="block-content">
                <h3 class="project-title">${block.data.title}</h3>
                <p class="project-description">${block.data.description}</p>
                <div class="technologies">
                    ${block.data.technologies.map(tech => `<span class="technology">${tech}</span>`).join('')}
                </div>
            </div>
            <div class="block-hash">
                <strong>Hash:</strong> ${block.hash}
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