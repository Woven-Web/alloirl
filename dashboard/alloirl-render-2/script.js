// Configuration object for the visualization
const CONFIG = {
    dimensions: {
        width: 960,
        height: 500,
    },
    margin: { 
        top: 0,    // Remove top margin to align with attendees
        right: 0,   
        bottom: 0,
        left: 0     
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
        format: (time) => {
            // Custom format to show "10 PM", "11 PM", etc.
            const hours = time.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12; // Convert 0 to 12
            return `${displayHours}${ampm}`;
        }
    },
    attendees: {
        count: 20,        // Number of attendees to generate
        minCredits: 0,    // Minimum credits per attendee
        maxCredits: 100   // Maximum credits per attendee
    },
    grid: {
        rowHeight: 45,    // Match the attendee height
        verticalPadding: 0
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

    return Array.from({ length: CONFIG.time.slots }, (_, i) => {
        const time = new Date(now);
        // Remove the +1 so we start at the current time
        time.setMinutes(time.getMinutes() - (CONFIG.time.interval * i));
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
 * @returns {Object} Dataset with timeSlots, projects, and attendees
 */
function generateData(npl, dims) {
    const timeSlots = generateTimeSlots();
    
    // Create projects with unique IDs and names
    const projects = Array.from({ length: numProjects }, (_, id) => ({ 
        id: id + 1, 
        name: `Project ${String.fromCharCode(65 + id)}`,
        votes: []
    }));

    // Generate attendees
    const attendees = Array.from({ length: CONFIG.attendees.count }, (_, id) => ({
        id: id + 1,
        displayId: `Attendee#${String(id + 1).padStart(3, '0')}`,
        credits: Math.floor(Math.random() * (CONFIG.attendees.maxCredits - CONFIG.attendees.minCredits + 1)) + CONFIG.attendees.minCredits,
        votes: [],
        lane: id
    }));

    // Calculate lane height based on fixed grid
    const laneHeight = CONFIG.grid.rowHeight;

    // Generate votes for each attendee in each time slot
    attendees.forEach((attendee) => {
        timeSlots.forEach((slot, slotIndex) => {
            // 20% chance of voting in this time slot (reduced from 30%)
            if (Math.random() > 0.2) return;
            
            // 1-2 votes when they do vote
            const votesThisSlot = Math.floor(Math.random() * 2) + 1;
            
            for (let i = 0; i < votesThisSlot; i++) {
                const voteId = `vote_${slotIndex}_${attendee.id}_${i}`;
                const projectIndex = Math.floor(Math.random() * projects.length);
                
                // Add vote to time slot with fixed y-position based on attendee's lane
                slot.votes.push({
                    id: voteId,
                    projectId: projects[projectIndex].id,
                    attendeeId: attendee.id,
                    yPosition: (attendee.lane * laneHeight) + (laneHeight / 2)
                });
                
                // Cross-reference vote in project
                projects[projectIndex].votes.push({
                    timeSlotIndex: slotIndex,
                    voteId: voteId,
                    attendeeId: attendee.id
                });

                // Cross-reference vote in attendee
                attendee.votes.push({
                    timeSlotIndex: slotIndex,
                    voteId: voteId,
                    projectId: projects[projectIndex].id
                });
            }
        });
    });

    return { timeSlots, projects, attendees };
}

/**
 * Creates the visualization
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
    drawAttendees(data.attendees);
    drawAttendeeGridLines(svg, data.attendees, height);
    const projectPositions = drawProjects(data.projects);
    drawConnections(svg, data, timeScale, projectPositions);
}

/**
 * Draws horizontal grid lines for attendee lanes
 * @param {d3.Selection} svg - The SVG container
 * @param {Array} attendees - The attendees array
 * @param {number} height - The visualization height
 */
function drawAttendeeGridLines(svg, attendees, height) {
    // Draw horizontal grid lines for all lanes including first and last
    svg.selectAll(".grid-line")
        .data(attendees)
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", "100%")
        .attr("y1", (d, i) => i * CONFIG.grid.rowHeight)
        .attr("y2", (d, i) => i * CONFIG.grid.rowHeight);
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
    // Clear existing timeline header
    const timeHeader = d3.select("#timeline-header").html('');
    
    data.timeSlots.forEach((slot, i) => {
        const x = timeScale(slot.timestamp);
        
        // Time marker in visualization
        svg.append("line")
            .attr("class", "time-marker")
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", 0)
            .attr("y2", height);

        // Add hour labels only (when minutes are 0)
        if (slot.timestamp.getMinutes() === 0) {
            // For the first slot, check if we should show it based on position
            if (i === 0 && x < 50) {
                console.log("Skipping first label due to position:", x);
                return;
            }
            
            timeHeader.append("div")
                .attr("class", "time-label")
                .style("position", "absolute")
                .style("left", `${x}px`)
                .style("transform", "translateX(-50%)")
                .style("text-align", "center")
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
    
    // Create project containers
    const projectDivs = projectsContainer.selectAll(".project")
        .data(projects)
        .enter()
        .append("div")
        .attr("class", "project")
        .style("margin-bottom", `${CONFIG.project.spacing}px`);

    // Add header section with single-line layout
    const headers = projectDivs.append("div")
        .attr("class", "project-header");
    
    const headerLeft = headers.append("div")
        .attr("class", "project-header-left")
        .text(d => formatMoney(Math.floor(Math.random() * 5000)));
    
    const headerRight = headers.append("div")
        .attr("class", "project-header-right")
        .text(d => `${getOrdinal(d.id)} place`);

    // Add content section (simplified)
    const content = projectDivs.append("div")
        .attr("class", "project-content");
    
    content.append("div")
        .attr("class", "project-name")
        .text(d => d.name);
    
    content.append("div")
        .attr("class", "project-path")
        .text(d => `project.name/app/${d.name.toLowerCase()}`);

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
        const element = container.select(`.project:nth-child(${index + 1})`).node();
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

/**
 * Draws the attendees list
 * @param {Array} attendees - The attendees to display
 */
function drawAttendees(attendees) {
    const attendeesContainer = d3.select(".attendees-column").html('');
    
    // Create attendee elements
    const attendeeElements = attendeesContainer
        .selectAll(".attendee")
        .data(attendees)
        .enter()
        .append("div")
        .attr("class", "attendee");

    // Add attendee info section
    const attendeeInfo = attendeeElements
        .append("div")
        .attr("class", "attendee-info");

    // Add attendee ID
    attendeeInfo
        .append("div")
        .attr("class", "attendee-id")
        .text(d => d.displayId);

    // Add credits
    attendeeElements
        .append("div")
        .attr("class", "attendee-credits")
        .text(d => `$1,234`);
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

// Add ordinal formatter function
function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Add number formatter function
function formatMoney(n) {
    return `$${n.toLocaleString()}`;
}