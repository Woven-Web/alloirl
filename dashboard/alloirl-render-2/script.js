// Constants for configuration
const CONFIG = {
    margin: { top: 20, right: 200, bottom: 20, left: 50 },
    project: {
        width: 150,
        height: 60,
        spacing: 20,
        cornerRadius: 4
    }
};

// State management
let nodesPerLine = 3;

// Function to generate data based on nodes per line
function generateData(npl) {
    const votes = Array.from({ length: npl }, (_, i) => ({
        id: i + 1,
        time: `2024-${String(i + 1).padStart(2, '0')}`
        // Removed metadata as it's not currently used
    }));

    const projects = ['A', 'B', 'C', 'D'].map((name, id) => ({ 
        id: id + 1, 
        name: `Project ${name}`, 
        votes: [] 
    }));

    // Simplified connection distribution
    votes.forEach(vote => {
        const projectIndex = Math.floor(Math.random() * projects.length);
        projects[projectIndex].votes.push(vote.id);
    });

    return { votes, projects };
}

// Create control panel
function createControlPanel() {
    const panel = d3.select('body')
        .append('div')
        .attr('class', 'control-panel');
    
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
}

// Function to update the visualization
function updateVisualization() {
    // Clear existing visualization
    d3.select('#visualization').html('');
    
    // Update data based on nodesPerLine
    const data = generateData(nodesPerLine);
    
    // Recreate visualization
    createVisualization(data);
    
    // Update npl display
    d3.select('.control-panel .control-label:nth-child(3)')
        .text(nodesPerLine);
}

// Main visualization function
function createVisualization(data) {
    // Set up dimensions
    const margin = CONFIG.margin;
    const width = 960 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales with domain based on current number of nodes
    const timeScale = d3.scaleLinear()
        .domain([0, nodesPerLine - 1])
        .range([0, height]);

    // Set up project boxes
    const project = CONFIG.project;

    // Draw timeline
    const timeline = svg.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 0)
        .attr("y2", height)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

    // Draw vote points with transition
    const votePoints = svg.selectAll(".vote-point")
        .data(data.votes)
        .enter()
        .append("circle")
        .attr("class", "timeline-point")
        .attr("cx", 0)
        .attr("cy", (d, i) => timeScale(i))
        .attr("r", 4);

    // Draw project boxes
    const projectGroup = svg.append("g")
        .attr("transform", `translate(${width - project.width}, 0)`);

    const projects = projectGroup.selectAll(".project")
        .data(data.projects)
        .enter()
        .append("g")
        .attr("class", "project")
        .attr("transform", (d, i) => 
            `translate(0, ${i * (project.height + project.spacing)})`);

    projects.append("rect")
        .attr("class", "project-box")
        .attr("width", project.width)
        .attr("height", project.height)
        .attr("rx", project.cornerRadius);

    // Separate connection drawing logic
    function drawConnections(svg, data, timeScale, width) {
        svg.selectAll(".connection").remove();
        
        const projectConfig = CONFIG.project; // Get the project config values
        
        data.projects.forEach((projectData, projectIndex) => {
            projectData.votes.forEach(voteId => {
                const voteIndex = data.votes.findIndex(v => v.id === voteId);
                const sourceY = timeScale(voteIndex);
                const targetY = projectIndex * (projectConfig.height + projectConfig.spacing) + projectConfig.height/2;
                
                const path = d3.path();
                path.moveTo(0, sourceY);
                path.bezierCurveTo(
                    width/3, sourceY,
                    width * 2/3, targetY,
                    width - projectConfig.width, targetY
                );
                
                svg.append("path")
                    .attr("class", "connection")
                    .attr("d", path.toString());
            });
        });
    }

    drawConnections(svg, data, timeScale, width);

    // Add drag behavior for reordering projects
    const drag = d3.drag()
        .on("drag", function(event, d) {
            const currentY = d3.select(this).attr("transform");
            const newY = event.y;
            // Update project position
            d3.select(this)
                .attr("transform", `translate(0, ${newY})`);
            // Recreate connections
            drawConnections(svg, data, timeScale, width);
        });

    projects.call(drag);
}

// Initialize with initial data
const data = generateData(nodesPerLine);
createVisualization(data);
createControlPanel();