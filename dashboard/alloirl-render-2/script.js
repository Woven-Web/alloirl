// Remove the Supabase import since we're using fake data
// import { fetchEventData, subscribeToProjectAllocations } from './supabase.js';
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
        eventDuration: 6, // duration in hours (changed from 5 to 4 to end at 9PM)
        startHour: 11, // 24h format
        format: (time) => {
            // Custom format to show "10 PM", "11 PM", etc.
            const hours = time.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12; // Convert 0 to 12
            return `${displayHours}${ampm}`;
        }
    },
    attendees: {
        count: 60,        // Increased number of attendees to generate
        minCredits: 0,    // Minimum credits per attendee
        maxCredits: 100,  // Maximum credits per attendee
        visibleCount: 15, // Number of attendees visible at once
    },
    grid: {
        rowHeight: 45,    // Match the attendee height
        verticalPadding: 0
    },
    scroll: {
        enabled: true,    // Enable auto-scrolling
        speed: .5,         // Base scroll speed in pixels per frame
        pauseAtEnds: 3000, // Pause at top and bottom (ms)
        easing: true,     // Use easing for smoother scroll direction changes
        bufferZone: 500,  // Buffer zone for rendering elements outside viewport
        adaptiveSpeed: false// Adjust speed based on total height
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
let scrollPosition = 0; // Current scroll position
let scrollDirection = 1; // 1 = down, -1 = up
let scrollPaused = false; // Flag to pause scrolling
let pauseTimeout = null; // Timeout for pausing at ends
let lastScrollTime = 0; // Last time we scrolled
let totalHeight = 0; // Total scrollable height
let viewportHeight = 0; // Visible viewport height

// Add state variables for easing
let isApproachingBoundary = false;
let easingToStop = false;
let easingStopStartTime = null;
let easingStopStartPosition = 0;
let easingStopTargetPosition = 0;

// Global state to track current data
let currentData = null;

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
async function generateData(npl, dims, isIncremental = false) {
    // Get the event ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId') || 'd7a18f34-c7a8-499b-be2a-ca0316c9a680'; // Default event ID
    
    try {
        // Use the fetchEventData function from supabase.js
        return await fetchEventData(eventId, isIncremental);
    } catch (error) {
        console.error('Error fetching event data:', error);
        
        // Fallback to fake data if there's an error
        console.log('Falling back to fake data generation');
        
        // Create fake data instead of fetching from Supabase
        // Generate time slots
        const timeSlots = generateTimeSlots();
        const { eventStart, eventEnd } = getEventTiming();
        
        // Create 6 fake projects
        const projects = Array.from({ length: 6 }, (_, i) => {
            const contributionAmount = Math.floor(Math.random() * 500) + 100;
            const numberContributions = Math.floor(Math.random() * 40) + 10;
            
            return {
                id: `project-${i + 1}`,
                name: `Project ${String.fromCharCode(65 + i)}`,
                votes: [],
                matchingAmount: Math.floor(Math.random() * 1000) + 500,
                contributionAmount: contributionAmount,
                numberContributions: numberContributions
            };
        }).sort((a, b) => b.matchingAmount - a.matchingAmount); // Sort by matching amount
        
        // Create attendees (use CONFIG.attendees.count)
        const attendees = Array.from({ length: CONFIG.attendees.count }, (_, i) => {
            return {
                id: `user-${i + 1}`,
                displayId: `User ${i + 1}`,
                credits: Math.floor(Math.random() * (CONFIG.attendees.maxCredits - CONFIG.attendees.minCredits)) + CONFIG.attendees.minCredits,
                votes: [],
                lane: i
            };
        });
        
        // Generate 2-5 transactions per attendee
        attendees.forEach(attendee => {
            // Random number of transactions for this attendee (2-5)
            const numTransactions = Math.floor(Math.random() * 4) + 2;
            
            for (let j = 0; j < numTransactions; j++) {
                // Pick a random project
                const projectIndex = Math.floor(Math.random() * projects.length);
                const project = projects[projectIndex];
                
                // Pick a random time slot, but only from slots before 9pm
                // Calculate the 9pm cutoff index (this would be the last valid slot)
                const cutoffHour = 21; // 9pm in 24-hour format
                const validTimeSlots = timeSlots.filter(slot => slot.timestamp.getHours() < cutoffHour);
                const slotIndex = Math.floor(Math.random() * validTimeSlots.length);
                const timeSlot = validTimeSlots[slotIndex];
                
                // Find the actual index in the original timeSlots array
                const actualSlotIndex = timeSlots.findIndex(slot => 
                    slot.timestamp.getTime() === timeSlot.timestamp.getTime());
                
                // Create a unique vote ID
                const voteId = `vote_${actualSlotIndex}_${attendee.id}_${j}`;
                
                // Calculate exact y position based on attendee lane
                const yPosition = (attendee.lane * CONFIG.grid.rowHeight) + (CONFIG.grid.rowHeight / 2);
                
                // Add vote to time slot
                timeSlot.votes.push({
                    id: voteId,
                    projectId: project.id,
                    attendeeId: attendee.id,
                    yPosition: yPosition
                });
                
                // Cross-reference vote in project
                project.votes.push({
                    timeSlotIndex: actualSlotIndex,
                    voteId: voteId,
                    attendeeId: attendee.id
                });
                
                // Cross-reference vote in attendee
                attendee.votes.push({
                    timeSlotIndex: actualSlotIndex,
                    voteId: voteId,
                    projectId: project.id
                });
            }
        });
        
        return {
            timeSlots,
            projects,
            attendees
        };
    }
}

/**
 * Creates the visualization
 * @param {Object} data - The dataset to visualize
 * @param {Object} config - Configuration options
 * @param {Object} dims - Visualization dimensions
 * @param {boolean} isFullRedraw - Whether this is a full redraw or an incremental update
 */
function createVisualization(data, config, dims, isFullRedraw = true) {
    // Filter out attendees with no transactions
    data.attendees = data.attendees.filter(attendee => attendee.votes.length > 0);
    
    // Reassign lane numbers to be sequential after filtering
    data.attendees.forEach((attendee, index) => {
        attendee.lane = index;
    });
    
    // Update vote positions based on new lane numbers
    data.timeSlots.forEach(slot => {
        slot.votes.forEach(vote => {
            const attendee = data.attendees.find(a => a.id === vote.attendeeId);
            if (attendee) {
                vote.yPosition = (attendee.lane * CONFIG.grid.rowHeight) + (CONFIG.grid.rowHeight / 2);
            }
        });
    });
    
    // Store the current data for future updates
    currentData = data;
    
    // Setup SVG
    const svg = setupSVG();
    const { width, height } = getContainerDimensions();
    viewportHeight = height;
    
    // Calculate total height based on number of attendees
    // Add a small buffer to ensure grid extends below the last attendee
    totalHeight = (data.attendees.length * CONFIG.grid.rowHeight) + CONFIG.grid.rowHeight;
    
    // Setup time scale
    const timeScale = createTimeScale(data, width);
    
    // Draw components
    drawTimeline(svg, data, timeScale, totalHeight);
    
    // For incremental updates, we need to update the attendees list too
    // This ensures new participants with transactions are shown
    drawAttendees(data.attendees);
    drawAttendeeGridLines(svg, data.attendees, totalHeight);
    
    drawIntersections(svg, data, timeScale);
    const projectPositions = drawProjects(data.projects);
    drawConnections(svg, data, timeScale, projectPositions);
    
    // Start auto-scrolling if enabled
    if (CONFIG.scroll.enabled) {
        // If we already have an animation running, just update the total height
        // This prevents resetting the scroll position when data is refreshed
        if (window.scrollAnimation) {
            // Ensure scroll position is within bounds
            const maxScroll = Math.max(0, totalHeight - viewportHeight);
            if (scrollPosition > maxScroll) {
                scrollPosition = maxScroll;
            }
            updateScrollPosition();
        } else {
            // Start fresh animation if none is running
            startAutoScroll(data);
        }
    }
}

/**
 * Starts the auto-scrolling animation
 * @param {Object} data - The dataset
 */
function startAutoScroll(data) {
    // Clear any existing animation
    if (window.scrollAnimation) {
        cancelAnimationFrame(window.scrollAnimation);
    }
    
    // Reset scroll state
    scrollPosition = 0;
    scrollDirection = 1;
    scrollPaused = false;
    if (pauseTimeout) clearTimeout(pauseTimeout);
    
    // Adjust scroll speed based on total height if adaptive speed is enabled
    if (CONFIG.scroll.adaptiveSpeed) {
        // Base speed on the ratio of total height to viewport height
        // This ensures consistent scrolling time regardless of number of attendees
        const heightRatio = totalHeight / viewportHeight;
        const baseSpeed = CONFIG.scroll.speed;
        
        // Adjust speed to ensure complete scroll takes about the same time
        // regardless of how many attendees there are
        CONFIG.scroll.speed = Math.max(0.5, Math.min(2.5, baseSpeed * (heightRatio / 10)));
    }
    
    // Set initial scroll position
    updateScrollPosition();
    
    // Start animation loop
    animateScroll();
}

/**
 * Animates the scrolling of the visualization
 */
function animateScroll() {
    const now = performance.now();
    const elapsed = now - lastScrollTime;
    
    // Only update if not paused and enough time has passed
    if (!scrollPaused && elapsed > 16) { // Cap at ~60fps
        lastScrollTime = now;
        
        // Calculate the max scroll position
        const maxScroll = Math.max(0, totalHeight - viewportHeight);
        
        // Calculate approach distance as a percentage of the total height
        // This ensures consistent behavior regardless of the number of attendees
        const approachDistancePercent = 0.1; // 10% of total height
        const approachDistance = Math.max(50, Math.min(200, totalHeight * approachDistancePercent));
        
        // Check if we're approaching a boundary
        const isNearTop = scrollDirection === -1 && scrollPosition < approachDistance;
        const isNearBottom = scrollDirection === 1 && scrollPosition > maxScroll - approachDistance;
        
        if ((isNearTop || isNearBottom) && !isApproachingBoundary && !easingToStop) {
            // Start slowing down as we approach the boundary
            isApproachingBoundary = true;
            
            // Calculate a deceleration factor based on distance to boundary
            const distanceToBoundary = isNearTop ? scrollPosition : maxScroll - scrollPosition;
            const decelerationFactor = Math.max(0.1, distanceToBoundary / approachDistance);
            
            // Apply the deceleration
            scrollPosition += (CONFIG.scroll.speed * scrollDirection * decelerationFactor);
            
            // If we're very close to the boundary, start the stopping animation
            if (distanceToBoundary < 10) {
                startEasingToStop(isNearTop ? 0 : maxScroll);
            }
        } else if (easingToStop) {
            // We're in the process of easing to a stop
            const easingElapsed = now - easingStopStartTime;
            const easingDuration = 800; // Increased duration for smoother stop
            const progress = Math.min(easingElapsed / easingDuration, 1);
            
            // Use easeOutQuad for smooth deceleration
            const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
            const easedProgress = easeOutQuad(progress);
            
            // Interpolate between start and target position
            scrollPosition = easingStopStartPosition + (easingStopTargetPosition - easingStopStartPosition) * easedProgress;
            
            // Check if we've completed the easing
            if (progress >= 1) {
                easingToStop = false;
                scrollPosition = easingStopTargetPosition;
                scrollPaused = true;
                
                // Set timeout to change direction
                pauseTimeout = setTimeout(() => {
                    scrollDirection *= -1; // Reverse direction
                    scrollPaused = false;
                    isApproachingBoundary = false;
                    
                    // Start easing in the new direction
                    startEasedScrolling(scrollDirection);
                }, CONFIG.scroll.pauseAtEnds);
            }
        } else {
            // Normal scrolling
            isApproachingBoundary = false;
            scrollPosition += CONFIG.scroll.speed * scrollDirection;
            
            // Ensure we don't go beyond boundaries during normal scrolling
            if (scrollPosition < 0) scrollPosition = 0;
            if (scrollPosition > maxScroll) scrollPosition = maxScroll;
        }
        
        // Apply scroll position
        updateScrollPosition();
    }
    
    // Continue animation
    window.scrollAnimation = requestAnimationFrame(animateScroll);
}

/**
 * Starts a smooth eased scrolling in the given direction
 * @param {number} direction - The scroll direction (1 = down, -1 = up)
 */
function startEasedScrolling(direction) {
    let startTime = null;
    const duration = 2000; // Duration of easing in ms
    const startSpeed = 0.01; // Very slow starting speed
    const targetSpeed = CONFIG.scroll.speed; // Target speed
    
    // Store original speed to restore later
    const originalSpeed = CONFIG.scroll.speed;
    
    // Set initial speed to very slow
    CONFIG.scroll.speed = startSpeed;
    
    function easeInOut(t) {
        // Cubic easing function for smoother acceleration
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    function easeStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOut(progress);
        
        // Interpolate between start and target speed
        CONFIG.scroll.speed = startSpeed + (targetSpeed - startSpeed) * easedProgress;
        
        if (progress < 1) {
            requestAnimationFrame(easeStep);
        } else {
            // Ensure we end at exactly the target speed
            CONFIG.scroll.speed = originalSpeed;
        }
    }
    
    requestAnimationFrame(easeStep);
}

/**
 * Updates the scroll position of the visualization and attendees
 */
function updateScrollPosition() {
    // Update the SVG viewBox to scroll
    const svg = d3.select("#visualization svg");
    const { width } = getContainerDimensions();
    
    // Set the viewBox to create a scrolling window effect
    svg.attr("viewBox", `0 ${scrollPosition} ${width} ${viewportHeight}`);
    
    // Synchronize the attendees column scroll position
    const attendeesColumn = d3.select(".attendees-column");
    const scrollContainer = attendeesColumn.select(".attendees-scroll-container");
    
    // Use transform instead of scrollTop for smoother animation
    scrollContainer.style("transform", `translateY(${-scrollPosition}px)`);
    
    // Update connections to ensure they stay connected to projects
    updateConnections();
    
    // Update intersection dots
    updateIntersections();
}

/**
 * Updates the connections between time slots and projects during scrolling
 */
function updateConnections() {
    // Only update connections if we have stored the necessary data
    if (!window.connectionData) return;
    
    const { data, timeScale, projectPositions } = window.connectionData;
    const svg = d3.select("#visualization svg g");
    
    // Calculate the time range for scaling stroke width (same as in drawConnections)
    const firstSlotTime = data.timeSlots[0].timestamp.getTime();
    const lastSlotTime = data.timeSlots[data.timeSlots.length - 1].timestamp.getTime();
    const timeRange = lastSlotTime - firstSlotTime;
    
    // Instead of removing and redrawing connections, update their paths
    data.timeSlots.forEach((slot, slotIndex) => {
        // Calculate a normalized time position (0 to 1) for this slot
        const timePosition = (slot.timestamp.getTime() - firstSlotTime) / timeRange;
        
        // Calculate stroke width based on time position
        const minStrokeWidth = 0.1;
        const maxStrokeWidth = 0.8;
        const strokeWidth = minStrokeWidth + (timePosition * (maxStrokeWidth - minStrokeWidth));
        
        slot.votes.forEach(vote => {
            const project = data.projects.find(p => p.id === vote.projectId);
            if (!project) return;

            const projectPosition = projectPositions.find(p => p.id === project.id);
            if (!projectPosition) return;
            
            const sourceX = timeScale(slot.timestamp);
            const sourceY = vote.yPosition;
            const targetX = projectPosition.x;
            
            // Adjust target Y to account for scrolling
            // Project positions are fixed in the viewport, so we need to adjust
            // the target Y based on the current scroll position
            const targetY = projectPosition.y + scrollPosition;

            // Update the path for this connection
            const path = d3.path();
            path.moveTo(sourceX, sourceY);
            path.bezierCurveTo(
                sourceX + (targetX - sourceX)/3, sourceY,
                sourceX + 2*(targetX - sourceX)/3, targetY,
                targetX, targetY
            );

            // Find and update the connection path
            const connectionId = `connection-${vote.id}`;
            const connection = svg.select(`#${connectionId}`);
            
            if (connection.node()) {
                // Update existing connection
                connection.attr("d", path.toString())
                    .attr("stroke-width", strokeWidth) // Apply variable stroke width
                    .attr("fill", "none");
            }
        });
    });
    
    // Update vote points positions
    data.timeSlots.forEach((slot, slotIndex) => {
        // Calculate a normalized time position (0 to 1) for this slot
        const timePosition = (slot.timestamp.getTime() - firstSlotTime) / timeRange;
        
        // Calculate point radius based on time position
        const minRadius = 6;
        const maxRadius = 10;
        const radius = minRadius + (timePosition * (maxRadius - minRadius));
        
        slot.votes.forEach(vote => {
            const pointId = `vote-point-${vote.id}`;
            const point = svg.select(`#${pointId}`);
            
            if (point.node()) {
                // Update existing point
                point.attr("cy", vote.yPosition)
                     .attr("r", radius); // Apply variable radius
            }
        });
    });
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
        
    // Add an extra grid line at the bottom to complete the grid
    svg.append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", "100%")
        .attr("y1", attendees.length * CONFIG.grid.rowHeight)
        .attr("y2", attendees.length * CONFIG.grid.rowHeight);
}

/**
 * Sets up the main SVG container
 * @returns {d3.Selection} The SVG container
 */
function setupSVG() {
    d3.select("#visualization").html('');
    const svg = d3.select("#visualization")
        .append("svg")
        .style("width", "100%")
        .style("height", "100%");
        
    return svg.append("g")
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
    
    // Use a much larger height value to ensure lines extend well beyond the visible area
    const extendedHeight = Math.max(height, 10000); // Use a very large value to ensure full coverage
    
    // Get current time for determining past/future
    const { currentTime } = getEventTiming();
    
    data.timeSlots.forEach((slot, i) => {
        const x = timeScale(slot.timestamp);
        const isFuture = slot.timestamp > currentTime;
        
        // Time marker in visualization - extend to full extended height
        svg.append("line")
            .attr("class", `time-marker ${isFuture ? 'future' : 'past'}`)
            .attr("x1", x)
            .attr("x2", x)
            .attr("y1", 0)
            .attr("y2", extendedHeight);

        // Add hour lines and labels when minutes are 0
        if (slot.timestamp.getMinutes() === 0) {
            // Add vertical hour line - make sure it extends to full extended height
            svg.append("line")
                .attr("class", "hour-line")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", 0)
                .attr("y2", extendedHeight);

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
    
    // Add a current time indicator line - extend to full extended height
    const currentX = timeScale(currentTime);
    svg.append("line")
        .attr("class", "current-time-indicator")
        .attr("x1", currentX)
        .attr("x2", currentX)
        .attr("y1", 0)
        .attr("y2", extendedHeight);
}

/**
 * Draws the project boxes and returns their positions
 * @param {Array} projects - The projects to draw
 * @returns {Array} Project positions for connections
 */
function drawProjects(projects) {
    const projectsContainer = d3.select(".projects-column");
    
    // Clear existing projects
    projectsContainer.selectAll(".project").remove();
    
    // Create project elements
    const projectElements = projectsContainer
        .selectAll(".project")
        .data(projects)
        .enter()
        .append("div")
        .attr("class", "project")
        .attr("id", d => `project-${d.id}`);
    
    // Add project headers
    const projectHeaders = projectElements
        .append("div")
        .attr("class", "project-header");
    
    // Add project rank
    projectHeaders
        .append("div")
        .attr("class", "project-header-left")
        .text((d, i) => getOrdinal(i + 1));
    
    // Add project matching amount
    const matchingAmountElements = projectHeaders
        .append("div")
        .attr("class", "project-header-right")
        .text(d => formatMoney(0)); // Start at 0
    
    // Animate the matching amount
    matchingAmountElements.each(function(d) {
        animateNumber(this, 0, d.matchingAmount, 1500, '$');
    });
    
    // Add project content
    const projectContent = projectElements
        .append("div")
        .attr("class", "project-content");
    
    // Add project name
    projectContent
        .append("div")
        .attr("class", "project-name")
        .text(d => d.name);
    
    // Add project contribution info
    projectContent
        .append("div")
        .attr("class", "project-path")
        .text(d => `${d.numberContributions} contributions`);
    
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
            // Store the absolute position relative to the visualization
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
    // Store connection data for updates during scrolling
    window.connectionData = { data, timeScale, projectPositions };
    
    // Create a container for connections if it doesn't exist
    let connectionsGroup = svg.select(".connections-group");
    if (connectionsGroup.empty()) {
        connectionsGroup = svg.append("g").attr("class", "connections-group");
    }
    
    // Collect all connections to draw
    const connections = [];
    
    // Calculate the time range for scaling stroke width
    const firstSlotTime = data.timeSlots[0].timestamp.getTime();
    const lastSlotTime = data.timeSlots[data.timeSlots.length - 1].timestamp.getTime();
    const timeRange = lastSlotTime - firstSlotTime;
    
    data.timeSlots.forEach((slot, slotIndex) => {
        // Calculate a normalized time position (0 to 1) for this slot
        const timePosition = (slot.timestamp.getTime() - firstSlotTime) / timeRange;
        
        // Calculate stroke width based on time position
        // Older connections (lower timePosition) get thinner strokes
        // Newer connections (higher timePosition) get thicker strokes
        const minStrokeWidth = 0.1;
        const maxStrokeWidth = 0.8;
        const strokeWidth = minStrokeWidth + (timePosition * (maxStrokeWidth - minStrokeWidth));
        
        slot.votes.forEach(vote => {
            const project = data.projects.find(p => p.id === vote.projectId);
            if (!project) return;
            
            const projectPosition = projectPositions.find(p => p.id === project.id);
            if (!projectPosition) return;
            
            connections.push({
                id: `connection-${vote.id}`,
                sourceX: timeScale(slot.timestamp),
                sourceY: vote.yPosition,
                targetX: projectPosition.x,
                targetY: projectPosition.y,
                projectId: project.id,
                voteId: vote.id,
                strokeWidth: strokeWidth, // Add stroke width to connection data
                timePosition: timePosition // Store time position for potential use in styling
            });
        });
    });
    
    // Get existing connection IDs
    const existingConnectionIds = new Set();
    connectionsGroup.selectAll("path.connection").each(function() {
        existingConnectionIds.add(d3.select(this).attr("id"));
    });
    
    // Split connections into new and existing
    const newConnections = connections.filter(conn => !existingConnectionIds.has(conn.id));
    const existingConnections = connections.filter(conn => existingConnectionIds.has(conn.id));
    
    // Update existing connections
    existingConnections.forEach(conn => {
        const path = d3.path();
        path.moveTo(conn.sourceX, conn.sourceY);
        path.bezierCurveTo(
            conn.sourceX + (conn.targetX - conn.sourceX)/3, conn.sourceY,
            conn.sourceX + 2*(conn.targetX - conn.sourceX)/3, conn.targetY,
            conn.targetX, conn.targetY
        );
        
        connectionsGroup.select(`#${conn.id}`)
            .attr("d", path.toString())
            .attr("data-project-id", conn.projectId)
            .attr("stroke-width", conn.strokeWidth) // Apply variable stroke width
            .attr("fill", "none");
    });
    
    // Add new connections
    newConnections.forEach(conn => {
        const path = d3.path();
        path.moveTo(conn.sourceX, conn.sourceY);
        path.bezierCurveTo(
            conn.sourceX + (conn.targetX - conn.sourceX)/3, conn.sourceY,
            conn.sourceX + 2*(conn.targetX - conn.sourceX)/3, conn.targetY,
            conn.targetX, conn.targetY
        );
        
        connectionsGroup.append("path")
            .attr("id", conn.id)
            .attr("class", "connection")
            .attr("d", path.toString())
            .attr("data-project-id", conn.projectId)
            .attr("stroke-width", conn.strokeWidth) // Apply variable stroke width
            .attr("fill", "none")
            .style("opacity", 0)
            .transition()
            .duration(500)
            .style("opacity", 1);
    });
    
    // Remove connections that no longer exist
    const currentConnectionIds = new Set(connections.map(conn => conn.id));
    connectionsGroup.selectAll("path.connection")
        .filter(function() {
            const id = d3.select(this).attr("id");
            return !currentConnectionIds.has(id);
        })
        .transition()
        .duration(300)
        .style("opacity", 0)
        .remove();
    
    // Draw vote points
    let votePointsGroup = svg.select(".vote-points-group");
    if (votePointsGroup.empty()) {
        votePointsGroup = svg.append("g").attr("class", "vote-points-group");
    }
    
    // Collect all vote points
    const votePoints = [];
    data.timeSlots.forEach((slot, slotIndex) => {
        // Calculate a normalized time position (0 to 1) for this slot
        const timePosition = (slot.timestamp.getTime() - firstSlotTime) / timeRange;
        
        // Calculate point radius based on time position
        // Older points (lower timePosition) get smaller radius
        // Newer points (higher timePosition) get larger radius
        const minRadius = 6;
        const maxRadius = 10;
        const radius = minRadius + (timePosition * (maxRadius - minRadius));
        
        slot.votes.forEach(vote => {
            votePoints.push({
                id: `vote-point-${vote.id}`,
                x: timeScale(slot.timestamp),
                y: vote.yPosition,
                voteId: vote.id,
                radius: radius // Add radius to vote point data
            });
        });
    });
    
    // Get existing vote point IDs
    const existingVotePointIds = new Set();
    votePointsGroup.selectAll("circle.vote-point").each(function() {
        existingVotePointIds.add(d3.select(this).attr("id"));
    });
    
    // Split vote points into new and existing
    const newVotePoints = votePoints.filter(point => !existingVotePointIds.has(point.id));
    const existingVotePoints = votePoints.filter(point => existingVotePointIds.has(point.id));
    
    // Update existing vote points
    existingVotePoints.forEach(point => {
        votePointsGroup.select(`#${point.id}`)
            .attr("cx", point.x)
            .attr("cy", point.y)
            .attr("r", point.radius); // Apply variable radius
    });
    
    // Add new vote points
    newVotePoints.forEach(point => {
        votePointsGroup.append("circle")
            .attr("id", point.id)
            .attr("class", "vote-point")
            .attr("cx", point.x)
            .attr("cy", point.y)
            .attr("r", point.radius) // Apply variable radius
            .style("opacity", 0)
            .transition()
            .duration(500)
            .style("opacity", 1);
    });
    
    // Remove vote points that no longer exist
    const currentVotePointIds = new Set(votePoints.map(point => point.id));
    votePointsGroup.selectAll("circle.vote-point")
        .filter(function() {
            const id = d3.select(this).attr("id");
            return !currentVotePointIds.has(id);
        })
        .transition()
        .duration(300)
        .style("opacity", 0)
        .remove();
}

/**
 * Draws the attendees list
 * @param {Array} attendees - The attendees to display
 */
function drawAttendees(attendees) {
    const attendeesContainer = d3.select(".attendees-column").html('');
    
    // Create a container div that will be as tall as the SVG content
    const scrollContainer = attendeesContainer.append("div")
        .attr("class", "attendees-scroll-container")
        .style("position", "relative")
        .style("height", `${attendees.length * CONFIG.grid.rowHeight}px`);
    
    // Create attendee elements
    const attendeeElements = scrollContainer
        .selectAll(".attendee")
        .data(attendees)
        .enter()
        .append("div")
        .attr("class", "attendee")
        .style("position", "absolute")
        .style("width", "100%")
        .style("height", `${CONFIG.grid.rowHeight}px`)
        .style("top", (d, i) => `${i * CONFIG.grid.rowHeight}px`);

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

/**
 * Updates the visualization with new data
 * @param {boolean} isFullRedraw - Whether to perform a full redraw or incremental update
 */
async function updateVisualization(isFullRedraw = true) {
    // Store current scroll position
    const currentScrollPos = scrollPosition;
    
    // Get new data with incremental flag
    const data = await generateData(nodesPerLine, DIMS, !isFullRedraw);
    
    // Create visualization with flag indicating if this is a full redraw
    createVisualization(data, CONFIG, DIMS, isFullRedraw);
    updateEventHeader();
    
    // Recalculate total height based on the current number of attendees
    totalHeight = data.attendees.length * CONFIG.grid.rowHeight;
    
    // Restore scroll position if possible
    if (!isFullRedraw) {
        scrollPosition = currentScrollPos;
        
        // Ensure scroll position is within bounds
        const maxScroll = Math.max(0, totalHeight - viewportHeight);
        if (scrollPosition > maxScroll) {
            scrollPosition = maxScroll;
        }
        
        updateScrollPosition();
    }
}

/**
 * Performs an incremental update of the visualization
 * Only updates projects and their connections
 */
async function incrementalUpdate() {
    await updateVisualization(true);
}

// Initial render needs to be async too:
(async function init() {
    // Get the event ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId') || 'd7a18f34-c7a8-499b-be2a-ca0316c9a680'; // Default event ID
    
    // Initial full render
    await updateVisualization(true);
    
    // Set up animation control button
    const animationControl = document.getElementById('animation-control');
    if (animationControl) {
        animationControl.addEventListener('click', toggleAnimation);
    }
    
    // Set up reset control button
    const resetControl = document.getElementById('reset-control');
    if (resetControl) {
        resetControl.addEventListener('click', resetScrollPosition);
    }
    
    // Set up test data button (for development only)
    // setupTestDataButton(eventId);
    
    // Subscribe to project allocations for real-time updates
    console.log(`Setting up subscription for event ID: ${eventId}`);
    const subscription = subscribeToProjectAllocations(eventId, () => {
        console.log('Project allocation update received');
        incrementalUpdate();
    });
    
    // Set up periodic refresh every 5 minutes to ensure data stays fresh
    const refreshInterval = setInterval(async () => {
        console.log('Periodic refresh triggered');
        await incrementalUpdate();
    }, 300000); // 300000ms = 5 minutes

    // Clean up interval and subscription when window unloads
    window.addEventListener('unload', () => {
        clearInterval(refreshInterval);
        if (window.scrollAnimation) {
            cancelAnimationFrame(window.scrollAnimation);
        }
        if (subscription) {
            subscription.unsubscribe();
        }
    });
})();

/**
 * Sets up a test button for generating synthetic data (for development only)
 * @param {string} eventId - The event ID to use for the synthetic data
 */
function setupTestDataButton(eventId) {
    // Create the test button container
    const testButtonContainer = document.createElement('div');
    testButtonContainer.className = 'test-button-container';
    testButtonContainer.style.position = 'fixed';
    testButtonContainer.style.bottom = '20px';
    testButtonContainer.style.right = '20px';
    testButtonContainer.style.zIndex = '1000';
    
    // Create the test button
    const testButton = document.createElement('button');
    testButton.className = 'test-button';
    testButton.innerHTML = '🧪 Test Data';
    testButton.style.background = 'rgba(243, 253, 139, 0.9)';
    testButton.style.color = '#0001B2';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '4px';
    testButton.style.padding = '8px 12px';
    testButton.style.cursor = 'pointer';
    testButton.style.fontWeight = 'bold';
    testButton.style.fontSize = '14px';
    testButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    testButton.style.transition = 'all 0.2s ease';
    
    // Add hover effect
    testButton.addEventListener('mouseenter', () => {
        testButton.style.background = 'rgba(243, 253, 139, 1)';
        testButton.style.transform = 'translateY(-2px)';
        testButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    });
    
    testButton.addEventListener('mouseleave', () => {
        testButton.style.background = 'rgba(243, 253, 139, 0.9)';
        testButton.style.transform = 'translateY(0)';
        testButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    });
    
    // Add click handler
    testButton.addEventListener('click', () => {
        generateSyntheticData(eventId);
    });
    
    // Add the button to the container
    testButtonContainer.appendChild(testButton);
    
    // Add the container to the document
    document.body.appendChild(testButtonContainer);
}

/**
 * Generates synthetic data and triggers the subscription event
 * @param {string} eventId - The event ID to use for the synthetic data
 */
function generateSyntheticData(eventId) {
    // Only proceed if we have current data
    if (!currentData) {
        console.error('No current data available for synthetic data generation');
        return;
    }
    
    console.log('Generating synthetic data...');
    
    // Get a random attendee from the filtered list (all should have transactions)
    const maxAttendeeIndex = Math.min(30, currentData.attendees.length);
    const randomAttendeeIndex = Math.floor(Math.random() * maxAttendeeIndex);
    const randomAttendee = currentData.attendees[randomAttendeeIndex];
    
    // Get a random project
    const randomProjectIndex = Math.floor(Math.random() * currentData.projects.length);
    const randomProject = currentData.projects[randomProjectIndex];
    
    // Get a random time slot (preferably a recent one)
    const recentSlotCount = Math.min(5, currentData.timeSlots.length);
    const slotIndex = currentData.timeSlots.length - 1 - Math.floor(Math.random() * recentSlotCount);
    const timeSlot = currentData.timeSlots[slotIndex];
    
    console.log(`Creating synthetic vote: Attendee ${randomAttendee.displayId} -> Project ${randomProject.name} at ${timeSlot.displayTime}`);
    
    // Create a unique vote ID
    const voteId = `synthetic_vote_${Date.now()}`;
    
    // Calculate y position based on attendee lane
    const yPosition = (randomAttendee.lane * CONFIG.grid.rowHeight) + (CONFIG.grid.rowHeight / 2);
    
    // Add vote to time slot
    timeSlot.votes.push({
        id: voteId,
        projectId: randomProject.id,
        attendeeId: randomAttendee.id,
        yPosition: yPosition
    });
    
    // Cross-reference vote in project
    randomProject.votes.push({
        timeSlotIndex: slotIndex,
        voteId: voteId,
        attendeeId: randomAttendee.id
    });
    
    // Cross-reference vote in attendee
    randomAttendee.votes.push({
        timeSlotIndex: slotIndex,
        voteId: voteId,
        projectId: randomProject.id
    });
    
    // Shuffle project order to simulate re-ranking
    shuffleProjects();
    
    // Directly draw the new connection instead of redrawing everything
    drawSingleConnection(voteId, randomProject.id, timeSlot, yPosition);
    
    // Update project display to reflect new ranking
    updateProjectDisplay();
    
    // Trigger the emoji animation from supabase.js
    if (typeof createConfettiExplosion === 'function') {
        // Get a random emoji
        const emojis = ['❤️', '🎉', '🚀', '💡', '🌱', '🐸', '🗿'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        createConfettiExplosion(randomEmoji);
    } else {
        console.warn('createConfettiExplosion function not available');
    }
}

/**
 * Draws a single new connection without redrawing the entire visualization
 * @param {string} voteId - The ID of the vote to draw
 * @param {string} projectId - The ID of the project the vote is for
 * @param {Object} timeSlot - The time slot the vote belongs to
 * @param {number} yPosition - The y-position of the vote point
 */
function drawSingleConnection(voteId, projectId, timeSlot, yPosition) {
    // Only proceed if we have connection data
    if (!window.connectionData) {
        console.error('No connection data available');
        return;
    }
    
    const { data, timeScale, projectPositions } = window.connectionData;
    const svg = d3.select("#visualization svg g");
    
    // Find the project
    const project = data.projects.find(p => p.id === projectId);
    if (!project) {
        console.error('Project not found');
        return;
    }
    
    // Find the project position
    const projectPosition = projectPositions.find(p => p.id === projectId);
    if (!projectPosition) {
        console.error('Project position not found');
        return;
    }
    
    // Calculate the time range for scaling stroke width
    const firstSlotTime = data.timeSlots[0].timestamp.getTime();
    const lastSlotTime = data.timeSlots[data.timeSlots.length - 1].timestamp.getTime();
    const timeRange = lastSlotTime - firstSlotTime;
    
    // Calculate a normalized time position (0 to 1) for this slot
    const timePosition = (timeSlot.timestamp.getTime() - firstSlotTime) / timeRange;
    
    // Calculate stroke width based on time position
    const minStrokeWidth = 0.1;
    const maxStrokeWidth = 0.8;
    const strokeWidth = minStrokeWidth + (timePosition * (maxStrokeWidth - minStrokeWidth));
    
    // Calculate point radius based on time position
    const minRadius = 6;
    const maxRadius = 10;
    const radius = minRadius + (timePosition * (maxRadius - minRadius));
    
    // Calculate connection path
    const sourceX = timeScale(timeSlot.timestamp);
    const sourceY = yPosition;
    const targetX = projectPosition.x;
    const targetY = projectPosition.y + scrollPosition; // Adjust for current scroll
    
    const path = d3.path();
    path.moveTo(sourceX, sourceY);
    path.bezierCurveTo(
        sourceX + (targetX - sourceX)/3, sourceY,
        sourceX + 2*(targetX - sourceX)/3, targetY,
        targetX, targetY
    );
    
    // Get the connections group
    let connectionsGroup = svg.select(".connections-group");
    if (connectionsGroup.empty()) {
        connectionsGroup = svg.append("g").attr("class", "connections-group");
    }
    
    // Add the new connection with animation
    const connectionId = `connection-${voteId}`;
    connectionsGroup.append("path")
        .attr("id", connectionId)
        .attr("class", "connection")
        .attr("d", path.toString())
        .attr("data-project-id", projectId)
        .attr("stroke-width", strokeWidth)
        .attr("fill", "none")
        .style("opacity", 0)
        .transition()
        .duration(500)
        .style("opacity", 1);
    
    // Get the vote points group
    let votePointsGroup = svg.select(".vote-points-group");
    if (votePointsGroup.empty()) {
        votePointsGroup = svg.append("g").attr("class", "vote-points-group");
    }
    
    // Add the new vote point with animation
    const pointId = `vote-point-${voteId}`;
    votePointsGroup.append("circle")
        .attr("id", pointId)
        .attr("class", "vote-point")
        .attr("cx", sourceX)
        .attr("cy", sourceY)
        .attr("r", radius)
        .style("opacity", 0)
        .transition()
        .duration(500)
        .style("opacity", 1);
}

/**
 * Updates the project display to reflect new ranking without redrawing everything
 */
function updateProjectDisplay() {
    const projectsContainer = d3.select(".projects-column");
    
    // Get all project elements
    const projectElements = projectsContainer.selectAll(".project");
    
    // Update project order and matching amounts
    currentData.projects.forEach((project, index) => {
        // Find the project element
        const projectElement = projectsContainer.select(`#project-${project.id}`);
        if (!projectElement.node()) return;
        
        // Update project rank
        projectElement.select(".project-header-left")
            .text(getOrdinal(index + 1));
        
        // Update project matching amount with animation
        const matchingAmountElement = projectElement.select(".project-header-right").node();
        if (matchingAmountElement) {
            // Get current displayed amount (remove $ and commas)
            const currentAmount = parseInt(matchingAmountElement.textContent.replace(/[$,]/g, '')) || 0;
            // Animate to new amount
            animateNumber(matchingAmountElement, currentAmount, project.matchingAmount, 1000, '$');
        }
        
        // Reorder the element in the DOM
        projectElement.node().parentNode.appendChild(projectElement.node());
    });
}

/**
 * Shuffles the order of projects to simulate re-ranking
 */
function shuffleProjects() {
    // Only proceed if we have current data
    if (!currentData || !currentData.projects || currentData.projects.length < 2) {
        return;
    }
    
    // Randomly adjust matching amounts to change ranking
    currentData.projects.forEach(project => {
        // Adjust by -20% to +20%
        const adjustmentFactor = 0.8 + (Math.random() * 0.4);
        project.matchingAmount = Math.round(project.matchingAmount * adjustmentFactor);
    });
    
    // Re-sort projects by matching amount
    currentData.projects.sort((a, b) => b.matchingAmount - a.matchingAmount);
    
    console.log('Projects re-ranked based on new matching amounts');
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

/**
 * Updates the intersection dots during scrolling
 */
function updateIntersections() {
    // Only update if we have stored the necessary data
    if (!window.intersectionData) return;
    
    const { data, timeScale } = window.intersectionData;
    const svg = d3.select("#visualization svg g");
    
    // Calculate visible range with a large buffer to ensure smooth transitions
    const visibleStart = scrollPosition - (viewportHeight * 2);
    const visibleEnd = scrollPosition + (viewportHeight * 3);
    
    // Filter intersections to only those in the visible range (with large buffer)
    let visibleIntersections = [];
    
    // Only process attendees who have at least one transaction
    data.attendees.forEach(attendee => {
        const yPosition = (attendee.lane * CONFIG.grid.rowHeight) + (CONFIG.grid.rowHeight / 2);
        
        // Skip if the attendee is outside the visible range with buffer
        if (yPosition < visibleStart || yPosition > visibleEnd) {
            return;
        }
        
        data.timeSlots.forEach((slot, slotIndex) => {
            // Check if a vote from this attendee exists in this slot
            const hasVote = slot.votes.some(vote => vote.attendeeId === attendee.id);
            if (!hasVote) {
                const intersectionId = `intersection-${attendee.id}-${slotIndex}`;
                visibleIntersections.push({
                    id: intersectionId,
                    x: timeScale(slot.timestamp),
                    y: yPosition,
                    isPast: slot.isPast
                });
            }
        });
    });
    
    // Update existing dots and add new ones as needed
    visibleIntersections.forEach(intersection => {
        const dot = svg.select(`#${intersection.id}`);
        if (dot.node()) {
            // Update existing dot
            dot.attr("cy", intersection.y);
        } else {
            // Add new dot
            svg.append("circle")
                .attr("id", intersection.id)
                .attr("class", `intersection-dot ${intersection.isPast ? 'past' : 'future'}`)
                .attr("cx", intersection.x)
                .attr("cy", intersection.y)
                // Set the radius directly as an attribute instead of via CSS
                .attr("r", intersection.isPast ? 3 : 2);
        }
    });
}

/* New function to draw intersection dots for each attendee and each time slot where no vote exists */
function drawIntersections(svg, data, timeScale) {
    // Store data for updates during scrolling
    window.intersectionData = { data, timeScale };
    
    // Draw all intersection dots
    let allIntersections = [];
    
    // Only process attendees who have at least one transaction
    data.attendees.forEach(attendee => {
        const yPosition = (attendee.lane * CONFIG.grid.rowHeight) + (CONFIG.grid.rowHeight / 2);
        
        data.timeSlots.forEach((slot, slotIndex) => {
            // Check if a vote from this attendee exists in this slot
            const hasVote = slot.votes.some(vote => vote.attendeeId === attendee.id);
            if (!hasVote) {
                const intersectionId = `intersection-${attendee.id}-${slotIndex}`;
                allIntersections.push({
                    id: intersectionId,
                    x: timeScale(slot.timestamp),
                    y: yPosition,
                    isPast: slot.isPast
                });
            }
        });
    });
    
    svg.selectAll('.intersection-dot')
        .data(allIntersections)
        .enter()
        .append('circle')
        .attr('id', d => d.id)
        .attr('class', d => `intersection-dot ${d.isPast ? 'past' : 'future'}`)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        // Set the radius directly as an attribute instead of via CSS
        .attr('r', d => d.isPast ? 3 : 2);
}

/**
 * Starts the easing to stop animation
 * @param {number} targetPosition - The target position to stop at
 */
function startEasingToStop(targetPosition) {
    easingToStop = true;
    easingStopStartTime = performance.now();
    easingStopStartPosition = scrollPosition;
    easingStopTargetPosition = targetPosition;
}

/**
 * Toggles the animation state between playing and paused
 */
function toggleAnimation() {
    scrollPaused = !scrollPaused;
    
    // Update button icons
    const pauseIcon = document.getElementById('pause-icon');
    const playIcon = document.getElementById('play-icon');
    
    if (scrollPaused) {
        // Show play icon when paused
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
    } else {
        // Show pause icon when playing
        pauseIcon.style.display = 'block';
        playIcon.style.display = 'none';
    }
}

/**
 * Resets the scroll position to the top
 */
function resetScrollPosition() {
    // Temporarily pause scrolling
    const wasPaused = scrollPaused;
    scrollPaused = true;
    
    // Reset scroll position
    scrollPosition = 0;
    scrollDirection = 1; // Set direction to downward
    updateScrollPosition();
    
    // If animation was playing before, resume it after a short delay
    if (!wasPaused) {
        setTimeout(() => {
            scrollPaused = false;
        }, 500);
    }
}