// Configuration object for the visualization
const CONFIG = {
    dimensions: {
        width: 960,
        height: 500,
    },
    margin: { 
        top: 40,    // Space for time labels
        right: 0,   // Projects are in their own column
        bottom: 20,
        left: 0     // No left margin needed
    },
    project: {
        width: 200,
        height: 60,
        spacing: 20,
        cornerRadius: 4,
        style: {
            display: "flex",
            alignItems: "center",
            marginBottom: "20px"
        }
    },
    time: {
        interval: 15,     // minutes between time slots
        slots: 24,        // 6 hours = 24 15-minute slots
        format: d3.timeFormat("%I:%M %p")
    }
};

// Calculate actual drawing dimensions
const DIMS = {
    width: CONFIG.dimensions.width - CONFIG.margin.left - CONFIG.margin.right,
    height: CONFIG.dimensions.height - CONFIG.margin.top - CONFIG.margin.bottom
};

// State management
let nodesPerLine = 3;  // Number of data points per time slot
let numProjects = 5;   // Number of projects to display

/**
 * Generates time slots for the visualization
 * @returns {Array<TimeSlot>} Array of time slots, each with timestamp and votes
 */
function generateTimeSlots() {
    const now = new Date();
    // Round down to nearest interval
    now.setMinutes(Math.floor(now.getMinutes() / CONFIG.time.interval) * CONFIG.time.interval);
    now.setSeconds(0);
    now.setMilliseconds(0);

    return Array.from({ length: CONFIG.time.slots - 1 }, (_, i) => {
        const time = new Date(now);
        time.setMinutes(time.getMinutes() - (CONFIG.time.interval * (i + 1))); // Start one interval back
        return {
            timestamp: time,
            displayTime: CONFIG.time.format(time),
            votes: []
        };
    }).reverse(); // Reverse so oldest is first
}

/**
 * Generates the complete dataset for visualization
 * @param {number} npl - Nodes per line
 * @param {Object} dims - Visualization dimensions
 * @returns {Object} Dataset with timeSlots and projects
 */
function generateData(npl, dims) {
    const timeSlots = generateTimeSlots();
    
    // Create projects with unique IDs and names
    const projects = Array.from({ length: numProjects }, (_, id) => ({ 
        id: id + 1, 
        name: `Project ${String.fromCharCode(65 + id)}`,
        votes: []
    }));

    // Generate random votes for each time slot
    timeSlots.forEach((slot, slotIndex) => {
        for (let i = 0; i < npl; i++) {
            const voteId = `vote_${slotIndex}_${i}`;
            const projectIndex = Math.floor(Math.random() * projects.length);
            
            // Add vote to time slot
            slot.votes.push({
                id: voteId,
                projectId: projects[projectIndex].id,
                yPosition: Math.random() * dims.height
            });
            
            // Cross-reference vote in project
            projects[projectIndex].votes.push({
                timeSlotIndex: slotIndex,
                voteId: voteId
            });
        }
    });

    return { timeSlots, projects };
}

/**
 * Creates the timeline visualization
 * @param {Object} data - The dataset to visualize
 * @param {Object} config - Configuration options
 * @param {Object} dims - Visualization dimensions
 */
function createVisualization(data, config, dims) {
    // Setup SVG
    const svg = setupSVG();
    const { width, height } = getContainerDimensions();
    
    // Setup time scale
    const timeScale = createTimeScale(data, width);
    
    // Draw components
    drawTimeline(svg, data, timeScale, height);
    const projectPositions = drawProjects(data.projects);
    drawConnections(svg, data, timeScale, projectPositions);
}

/**
 * Sets up the main SVG container
 * @returns {d3.Selection} The SVG container
 */
function setupSVG() {
    d3.select("#visualization").html('');
    return d3.select("#visualization")
        .append("svg")
        .style("width", "100%")
        .style("height", "100%")
        .append("g")
        .attr("transform", `translate(${CONFIG.margin.left},${CONFIG.margin.top})`);
}

/**
 * Creates the time scale for the visualization
 * @param {Object} data - The dataset
 * @param {number} width - The visualization width
 * @returns {d3.ScaleTime} The time scale
 */
function createTimeScale(data, width) {
    const now = new Date();
    now.setMinutes(Math.floor(now.getMinutes() / CONFIG.time.interval) * CONFIG.time.interval);
    now.setSeconds(0);
    now.setMilliseconds(0);

    return d3.scaleTime()
        .domain([data.timeSlots[0].timestamp, now])
        .range([0, width]);
}

/**
 * Draws the timeline with markers and labels
 * @param {d3.Selection} svg - The SVG container
 * @param {Object} data - The dataset
 * @param {d3.ScaleTime} timeScale - The time scale
 * @param {number} height - The visualization height
 */
function drawTimeline(svg, data, timeScale, height) {
    data.timeSlots.forEach((slot, i) => {
        const x = timeScale(slot.timestamp);
        
        // Time marker
        svg.append("line")
            .attr("class", "time-marker")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        // Hour labels
        if (slot.timestamp.getMinutes() === 0) {
            svg.append("text")
                .attr("class", "time-label")
                .attr("x", x)
                .attr("y", -5)
                .attr("text-anchor", "middle")
                .attr("fill", "#fff")
                .text(slot.displayTime);
        }
    });
}

/**
 * Draws the project boxes and returns their positions
 * @param {Array} projects - The projects to draw
 * @returns {Array} Project positions for connections
 */
function drawProjects(projects) {
    const projectsContainer = d3.select(".projects-column").html('');
    
    // Create project boxes
    projectsContainer.selectAll(".project")
        .data(projects)
        .enter()
        .append("div")
        .attr("class", "project")
        .style("margin-bottom", `${CONFIG.project.spacing}px`)
        .append("div")
        .attr("class", "project-box")
        .style("height", `${CONFIG.project.height}px`)
        .style("display", "flex")
        .style("align-items", "center")
        .text(d => d.name);

    // Calculate positions for connections
    return calculateProjectPositions(projects, projectsContainer);
}

/**
 * Calculates the positions of projects for line connections
 * @param {Array} projects - The projects
 * @param {d3.Selection} container - The projects container
 * @returns {Array} Project positions
 */
function calculateProjectPositions(projects, container) {
    return projects.map((project, index) => {
        const element = container.select(`.project:nth-child(${index + 1}) .project-box`).node();
        const box = element.getBoundingClientRect();
        const visualizationBox = d3.select("#visualization").node().getBoundingClientRect();
        const projectsColumnBox = container.node().getBoundingClientRect();
        
        return {
            id: project.id,
            y: box.top + (box.height / 2) - visualizationBox.top - CONFIG.margin.top,
            x: projectsColumnBox.left - visualizationBox.left
        };
    });
}

/**
 * Gets the actual dimensions of the visualization container
 * @returns {Object} The container dimensions
 */
function getContainerDimensions() {
    const bbox = d3.select("#visualization").node().getBoundingClientRect();
    return {
        width: bbox.width,
        height: bbox.height
    };
}

/**
 * Draws the connection points and lines between time slots and projects
 * @param {d3.Selection} svg - The SVG container
 * @param {Object} data - The dataset
 * @param {d3.ScaleTime} timeScale - The time scale
 * @param {Array} projectPositions - The calculated project positions
 */
function drawConnections(svg, data, timeScale, projectPositions) {
    // Draw vote points and their connections
    data.timeSlots.forEach((slot, slotIndex) => {
        slot.votes.forEach(vote => {
            // Draw the point
            svg.append("circle")
                .attr("class", "vote-point")
                .attr("cx", timeScale(slot.timestamp))
                .attr("cy", vote.yPosition)
                .attr("r", 4)
                .attr("fill", "white");

            // Draw connection to project
            const project = data.projects.find(p => p.id === vote.projectId);
            if (!project) return;

            const projectPosition = projectPositions.find(p => p.id === project.id);
            const sourceX = timeScale(slot.timestamp);
            const sourceY = vote.yPosition;
            const targetX = projectPosition.x;
            const targetY = projectPosition.y;

            // Create bezier curve path
            const path = d3.path();
            path.moveTo(sourceX, sourceY);
            path.bezierCurveTo(
                sourceX + (targetX - sourceX)/3, sourceY,  // First control point
                sourceX + 2*(targetX - sourceX)/3, targetY, // Second control point
                targetX, targetY                           // End point
            );

            // Draw the connection line
            svg.append("path")
                .attr("class", "connection")
                .attr("d", path.toString())
                .attr("stroke", "white")
                .attr("fill", "none");
        });
    });
}

// Update visualization (called on changes)
function updateVisualization() {
    const data = generateData(nodesPerLine, DIMS);
    createVisualization(data, CONFIG, DIMS);
}

// Initialize
updateVisualization();

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