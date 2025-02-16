// Constants for configuration
const CONFIG = {
    dimensions: {
        width: 960,
        height: 500,
    },
    margin: { 
        top: 20, 
        right: 200, 
        bottom: 20, 
        left: 50 
    },
    project: {
        width: Math.min(200, 150),
        height: Math.min(100, 60),
        spacing: 20,
        cornerRadius: 4
    },
    time: {
        interval: 15, // minutes
        slots: 8,     // number of time slots to show (2 hours = 8 slots)
        format: d3.timeFormat("%I:%M %p")
    }
};

// Calculate actual drawing dimensions
const DIMS = {
    width: CONFIG.dimensions.width - CONFIG.margin.left - CONFIG.margin.right,
    height: CONFIG.dimensions.height - CONFIG.margin.top - CONFIG.margin.bottom
};

// State management
let nodesPerLine = 3;
let numProjects = 5;

// Function to generate time slots
function generateTimeSlots() {
    const now = new Date();
    // Round down to nearest 15 minutes
    now.setMinutes(Math.floor(now.getMinutes() / CONFIG.time.interval) * CONFIG.time.interval);
    now.setSeconds(0);
    now.setMilliseconds(0);

    return Array.from({ length: CONFIG.time.slots }, (_, i) => {
        const time = new Date(now);
        time.setMinutes(time.getMinutes() - (CONFIG.time.interval * i));
        return {
            timestamp: time,
            displayTime: CONFIG.time.format(time),
            votes: []
        };
    }).reverse(); // Reverse so oldest is first
}

// Function to generate data based on nodes per line
function generateData(npl, DIMS) {
    const timeSlots = generateTimeSlots();
    
    const projects = Array.from({ length: numProjects }, (_, id) => ({ 
        id: id + 1, 
        name: `Project ${String.fromCharCode(65 + id)}`,
        votes: []
    }));

    // Generate random votes for each time slot
    timeSlots.forEach((slot, slotIndex) => {
        // Generate exactly npl votes for this time slot
        for (let i = 0; i < npl; i++) {
            const voteId = `vote_${slotIndex}_${i}`;
            const projectIndex = Math.floor(Math.random() * projects.length);
            
            slot.votes.push({
                id: voteId,
                projectId: projects[projectIndex].id,
                // Random vertical position within the slot
                yPosition: Math.random() * DIMS.height
            });
            
            projects[projectIndex].votes.push({
                timeSlotIndex: slotIndex,
                voteId: voteId
            });
        }
    });

    return { timeSlots, projects };
}

// Create control panel
function createControlPanel() {
    const panel = d3.select('body')
        .append('div')
        .attr('class', 'control-panel');
    
    // NPL controls
    const nplRow = panel.append('div')
        .attr('class', 'control-row');
    
    nplRow.append('span')
        .attr('class', 'control-label')
        .text('npl: ');
    
    nplRow.append('button')
        .attr('class', 'control-button')
        .text('-')
        .on('click', () => {
            if (nodesPerLine > 1) {
                nodesPerLine--;
                updateVisualization();
            }
        });
    
    nplRow.append('span')
        .attr('class', 'control-label')
        .text(() => nodesPerLine);
    
    nplRow.append('button')
        .attr('class', 'control-button')
        .text('+')
        .on('click', () => {
            nodesPerLine++;
            updateVisualization();
        });

    // Project count controls
    const projRow = panel.append('div')
        .attr('class', 'control-row');
    
    projRow.append('span')
        .attr('class', 'control-label')
        .text('proj: ');
    
    projRow.append('button')
        .attr('class', 'control-button')
        .text('-')
        .on('click', () => {
            if (numProjects > 1) {
                numProjects--;
                updateVisualization();
            }
        });
    
    projRow.append('span')
        .attr('class', 'control-label')
        .text(() => numProjects);
    
    projRow.append('button')
        .attr('class', 'control-button')
        .text('+')
        .on('click', () => {
            numProjects++;
            updateVisualization();
        });
}

// Function to update the visualization
function updateVisualization() {
    const data = generateData(nodesPerLine, DIMS);
    createVisualization(data, CONFIG, DIMS);
}

// Main visualization function
function createVisualization(data, CONFIG, DIMS) {
    // Clear previous visualization
    d3.select("#visualization").html('');

    // Create SVG
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", CONFIG.dimensions.width)
        .attr("height", CONFIG.dimensions.height)
        .append("g")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);

    // Create time scale based on actual timestamps
    const timeScale = d3.scaleTime()
        .domain([
            data.timeSlots[0].timestamp,
            data.timeSlots[data.timeSlots.length - 1].timestamp
        ])
        .range([0, DIMS.width - CONFIG.margin.right]);

    // Draw timeline with actual times
    data.timeSlots.forEach((slot, i) => {
        const x = timeScale(slot.timestamp);
        
        // Draw vertical time marker
        svg.append("line")
            .attr("class", "time-marker")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", 0)
            .attr("y2", DIMS.height)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        // Add time label
        svg.append("text")
            .attr("class", "time-label")
            .attr("x", x)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("fill", "#fff")
            .text(slot.displayTime);
    });

    // Adjust project boxes to stretch vertically
    const projectGroup = svg.append("g")
        .attr("transform", `translate(${DIMS.width - CONFIG.project.width}, 0)`);

    const totalProjectsHeight = data.projects.length * (CONFIG.project.height + CONFIG.project.spacing);
    const startY = 0; // Start from the top
    
    const projects = projectGroup.selectAll(".project")
        .data(data.projects)
        .enter()
        .append("g")
        .attr("class", "project")
        .attr("transform", (d, i) => {
            const y = startY + (i * (CONFIG.project.height + CONFIG.project.spacing));
            return `translate(0, ${y})`;
        });

    projects.append("rect")
        .attr("class", "project-box")
        .attr("width", CONFIG.project.width)
        .attr("height", CONFIG.project.height)
        .attr("rx", CONFIG.project.cornerRadius);

    projects.append("text")
        .attr("x", CONFIG.project.width / 2)
        .attr("y", CONFIG.project.height / 2)
        .text(d => d.name);

    // Draw vote points with random vertical positions
    data.timeSlots.forEach((slot, slotIndex) => {
        slot.votes.forEach(vote => {
            svg.append("circle")
                .attr("class", "vote-point")
                .attr("cx", timeScale(slot.timestamp))
                .attr("cy", vote.yPosition)
                .attr("r", 4)
                .attr("fill", "white");

            // Draw connection to project
            const project = data.projects.find(p => p.id === vote.projectId);
            if (!project) return;

            const projectIndex = data.projects.indexOf(project);
            const sourceX = timeScale(slot.timestamp);
            const sourceY = vote.yPosition;
            const targetX = DIMS.width - CONFIG.project.width;
            const targetY = startY + (projectIndex * (CONFIG.project.height + CONFIG.project.spacing)) + (CONFIG.project.height / 2);

            const path = d3.path();
            path.moveTo(sourceX, sourceY);
            path.bezierCurveTo(
                sourceX + (targetX - sourceX)/3, sourceY,
                sourceX + 2*(targetX - sourceX)/3, targetY,
                targetX, targetY
            );

            svg.append("path")
                .attr("class", "connection")
                .attr("d", path.toString())
                .attr("stroke", "white")
                .attr("fill", "none");
        });
    });
}

// Get container dimensions
function getContainerDimensions() {
    const container = d3.select("#visualization").node();
    if (!container) return { width: 960, height: 500 }; // fallback dimensions
    
    const bbox = container.getBoundingClientRect();
    return {
        width: bbox.width,
        height: bbox.height
    };
}

// Dynamic CONFIG that updates with container size
function createConfig() {
    const containerDims = getContainerDimensions();
    
    return {
        dimensions: containerDims,
        margin: { 
            top: 20, 
            right: 200, 
            bottom: 20, 
            left: 50 
        },
        project: {
            width: Math.min(200, 150),
            height: Math.min(100, 60),
            spacing: 20,
            cornerRadius: 4
        },
        time: {
            interval: 15,
            slots: 8,
            format: d3.timeFormat("%I:%M %p")
        }
    };
}

// Calculate actual drawing dimensions
function getDims(config) {
    return {
        width: config.dimensions.width - config.margin.left - config.margin.right,
        height: config.dimensions.height - config.margin.top - config.margin.bottom
    };
}

// Update visualization with new dimensions
function updateVisualization() {
    const CONFIG = createConfig();
    const DIMS = getDims(CONFIG);
    const data = generateData(nodesPerLine, DIMS);
    createVisualization(data, CONFIG, DIMS);
}

// Simple debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add window resize handler with our own debounce
window.addEventListener('resize', debounce(() => {
    updateVisualization();
}, 250));

// Initial render
updateVisualization();
createControlPanel();