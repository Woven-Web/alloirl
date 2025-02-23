import { fetchEventData, subscribeToProjectAllocations } from './supabase.js';

// Configuration object for the visualization
export const CONFIG = {
    dimensions: {
        width: 960,
        height: 500,
    },
    margin: { 
        top: 0,    // Remove top margin to align with attendees
        right: 40,   // added right margin for extra padding
        bottom: 0,
        left: 10     // added left margin for extra padding
    },
    project: {
        width: 200,
        height: 60,
        spacing: 12,  // Reduced from 20 to 12
        cornerRadius: 4,
        style: {
            display: "flex",
            alignItems: "center",
            marginBottom: "12px"  // Added to match spacing
        }
    },
    time: {
        interval: 15,     // minutes between time slots
        eventDuration: 5, // duration in hours
        startHour: 17, // 24h format
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

// Calculate event timing parameters
function getEventTiming() {
    const now = new Date();
    now.setMinutes(Math.floor(now.getMinutes() / CONFIG.time.interval) * CONFIG.time.interval);
    now.setSeconds(0);
    now.setMilliseconds(0);

    // Set event start to configured hour
    const eventStart = new Date(now);
    eventStart.setHours(CONFIG.time.startHour);
    eventStart.setMinutes(0);
    
    // Event end is 6 hours after event start
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventStart.getHours() + CONFIG.time.eventDuration);

    return {
        eventStart,
        eventEnd,
        currentTime: now
    };
}

/**
 * Generates time slots for the visualization
 * @returns {Array<TimeSlot>} Array of time slots, each with timestamp and votes
 */
function generateTimeSlots() {
    const { eventStart, eventEnd, currentTime } = getEventTiming();
    const totalSlots = (CONFIG.time.eventDuration * 60) / CONFIG.time.interval;
    
    return Array.from({ length: totalSlots }, (_, i) => {
        const time = new Date(eventStart);
        time.setMinutes(time.getMinutes() + (CONFIG.time.interval * i));
        
        return {
            timestamp: time,
            displayTime: CONFIG.time.format(time),
            votes: [],
            // Flag to indicate if this time slot is in the past (relative to now)
            isPast: time <= currentTime
        };
    });
}

// Replace generateData function with:
async function generateData(npl, dims) {
    // Replace with actual event ID
    const eventId = 'a6dbab6b-a108-4147-ab09-0cdf0d802edb';
    return await fetchEventData(eventId);
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
    drawIntersections(svg, data, timeScale);
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
function createTimeScale(data, fullWidth) {
    const drawableWidth = fullWidth - CONFIG.margin.left - CONFIG.margin.right;
    return d3.scaleTime()
        .domain([data.timeSlots[0].timestamp, data.timeSlots[data.timeSlots.length - 1].timestamp])
        .range([0, drawableWidth]);
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

        // Add hour lines and labels when minutes are 0
        if (slot.timestamp.getMinutes() === 0) {
            // Add vertical hour line
            svg.append("line")
                .attr("class", "hour-line")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "#F3FD8B")
                .attr("stroke-width", "0.5px")
                .attr("stroke-opacity", "1");

            // Add hour label
            timeHeader.append("div")
                .attr("class", "time-label")
                .style("position", "absolute")
                .style("left", `${CONFIG.margin.left + x}px`)  // offset the label by left margin
                .style("transform", "translateX(-50%)")
                .style("text-align", "center")
                .text(slot.displayTime);
        }
    });
    
    // Add a current time indicator line
    const { currentTime } = getEventTiming();
    const currentX = timeScale(currentTime);
    svg.append("line")
        .attr("class", "current-time-indicator")
        .attr("x1", currentX)
        .attr("x2", currentX)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#F3FD8B")
        .attr("stroke-width", "2px");
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
        .attr("class", "project-header")
        .style("padding", "8px 12px");  // Slightly reduced padding
    
    const headerLeft = headers.append("div")
        .attr("class", "project-header-left")
        .text('$0'); // Start at 0
    
    // Animate the matching amounts
    headerLeft.each(function(d) {
        animateNumber(this, 0, d.matchingAmount, 1000, '$');
    });
    
    const headerRight = headers.append("div")
        .attr("class", "project-header-right")
        .text((d, i) => `${getOrdinal(i + 1)} place`);

    // Add content section (simplified)
    const content = projectDivs.append("div")
        .attr("class", "project-content");
    
    content.append("div")
        .attr("class", "project-name")
        .text(d => d.name)
        .style("font-size", d => d.name.length > 15 ? "24px" : "32px") // Reduce font size for longer names
        .style("line-height", d => d.name.length > 15 ? "1.2" : "1.4"); // Adjust line height accordingly
    
    const projectPath = content.append("div")
        .attr("class", "project-path")
        .text('0 people • 0 votes'); // Start at 0
    
    // Animate the contribution numbers
    projectPath.each(function(d) {
        const element = this;
        // Create temporary elements for each number
        const peopleSpan = document.createElement('span');
        const votesSpan = document.createElement('span');
        element.textContent = '';
        element.appendChild(peopleSpan);
        element.appendChild(document.createTextNode(' people • '));
        element.appendChild(votesSpan);
        element.appendChild(document.createTextNode(' votes'));
        
        // Animate both numbers
        animateNumber(peopleSpan, 0, d.numberContributions, 1000);
        animateNumber(votesSpan, 0, d.contributionAmount, 1000);
    });

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
    const containerDim = getContainerDimensions();
    const drawableWidth = containerDim.width - CONFIG.margin.left - CONFIG.margin.right;
    
    // First draw all paths
    data.timeSlots.forEach((slot, slotIndex) => {
        slot.votes.forEach(vote => {
            const project = data.projects.find(p => p.id === vote.projectId);
            if (!project) return;

            const projectPosition = projectPositions.find(p => p.id === project.id);
            const sourceX = timeScale(slot.timestamp);
            const sourceY = vote.yPosition;
            const targetX = projectPosition.x;
            const targetY = projectPosition.y;

            // Calculate stroke width based on x position using drawableWidth
            const strokeWidth = 0.75 + ((sourceX / drawableWidth) * 1.25);

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
                .attr("fill", "none")
                .style("stroke-width", `${strokeWidth}px`);
        });
    });

    // Then draw all points
    data.timeSlots.forEach((slot, slotIndex) => {
        slot.votes.forEach(vote => {
            svg.append("circle")
                .attr("class", "vote-point")
                .attr("cx", timeScale(slot.timestamp))
                .attr("cy", vote.yPosition)
                .attr("r", 4)
                .attr("fill", "white");
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

    // Add credits with animation
    const creditElements = attendeeElements
        .append("div")
        .attr("class", "attendee-credits")
        .text('0cr'); // Start at 0
    
    // Animate the credits
    creditElements.each(function(d) {
        animateNumber(this, 0, d.credits, 1000, '', 'cr');
    });
}

/* Updated function to update event timing info in the control panel debug row */
function updateEventHeader() {
    const { eventStart, eventEnd, currentTime } = getEventTiming();
    d3.select('.control-panel .event-timing')
        .html(`Event: ${CONFIG.time.format(eventStart)} - ${CONFIG.time.format(eventEnd)} | Now: ${CONFIG.time.format(currentTime)}`);
}

// Update updateVisualization to be async:
async function updateVisualization() {
    const data = await generateData(nodesPerLine, DIMS);
    createVisualization(data, CONFIG, DIMS);
    updateEventHeader();
}

// Initial render needs to be async too:
(async function init() {
    const eventId = 'a6dbab6b-a108-4147-ab09-0cdf0d802edb';
    await updateVisualization();
    
    // Set up realtime subscription
    const channel = subscribeToProjectAllocations(eventId, async () => {
        console.log('Project allocations updated');
        // Use requestAnimationFrame to ensure smooth updates
        requestAnimationFrame(async () => {
            await updateVisualization();
        });
    });

    // Set up periodic refresh every minute
    // const refreshInterval = setInterval(async () => {
    //     console.log('Periodic refresh triggered');
    //     await updateVisualization();
    // }, 60000); // 60000ms = 1 minute

    // // Clean up subscription and interval when window unloads
    // window.addEventListener('unload', () => {
    //     channel.unsubscribe();
    //     clearInterval(refreshInterval);
    // });
})();

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

// Add ordinal formatter function
function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Add number formatter function
function formatMoney(n) {
    return `$${Math.round(n).toLocaleString()}`;
}

// Add typewriter animation utility
function animateNumber(element, start, end, duration = 1000, prefix = '', suffix = '') {
    const startTime = performance.now();
    const startValue = start || 0;
    const change = end - startValue;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (easeOutExpo)
        const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.round(startValue + (change * easing));
        
        element.textContent = `${prefix}${current.toLocaleString()}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/* New function to draw intersection dots for each attendee and each time slot where no vote exists */
function drawIntersections(svg, data, timeScale) {
    let intersections = [];
    data.attendees.forEach(attendee => {
        data.timeSlots.forEach((slot, slotIndex) => {
            // Check if a vote from this attendee exists in this slot
            const hasVote = slot.votes.some(vote => vote.attendeeId === attendee.id);
            if (!hasVote) {
                intersections.push({
                    x: timeScale(slot.timestamp),
                    y: (attendee.lane * CONFIG.grid.rowHeight) + (CONFIG.grid.rowHeight / 2),
                    isPast: slot.isPast
                });
            }
        });
    });
    
    svg.selectAll('.intersection-dot')
        .data(intersections)
        .enter()
        .append('circle')
        .attr('class', d => `intersection-dot ${d.isPast ? 'past' : 'future'}`)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
}