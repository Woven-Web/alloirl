# Allo IRL Leaderboard Visualization

## Overview
A real-time visualization dashboard designed for displaying live donation activity during in-person Quadratic Funding events. The visualization shows the relationship between attendees, their votes (donations), and projects over time, with an emphasis on clear visual representation for large display screens.

## Purpose
- Track and display live donation activity during events
- Visualize the relationship between attendees, votes, and projects
- Provide a clear, stable visual hierarchy for projects
- Support Quadratic Funding mechanics through Allo protocol / Gitcoin round integration

## Technical Implementation
- Pure JavaScript with D3.js for visualization
- Minimal dependencies to ensure maintainability
- Basic HTML/SVG primitives for maximum compatibility and AI-agent friendliness
- No mobile/responsive considerations (designed for TV/projector display only)

### Key Components
1. **Timeline View**
   - 6-hour window divided into 15-minute slots
   - Vertical time markers with hour labels
   - Points represent individual votes/donations

2. **Project Display**
   - Projects listed on the right
   - Rankings update every 15 minutes for visual stability
   - Connection lines show vote-to-project relationships

3. **Data Flow**
   - Votes come from Allo protocol / Gitcoin round (offchain)
   - Uses attestations for quadratic funding matching
   - Real-time vote visualization
   - Periodic (15-min) project rank updates

### Design Decisions
- **Stability First**: 15-minute update intervals for rankings to prevent visual chaos
- **High Contrast**: Designed for large-screen visibility
- **Simple Architecture**: Uses basic web primitives for easy modification
- **Modular Code**: Separated into logical components for maintainability

## Technical Constraints
- Display-only interface (no user input required)
- Optimized for large screens (1920x1080 minimum)
- No mobile/responsive requirements
- Must maintain visual stability during updates

## Data Structure
```javascript
{
  timeSlots: [
    {
      timestamp: Date,
      displayTime: String,
      votes: [
        {
          id: String,
          projectId: Number,
          yPosition: Number
        }
      ]
    }
  ],
  projects: [
    {
      id: Number,
      name: String,
      votes: [
        {
          timeSlotIndex: Number,
          voteId: String
        }
      ]
    }
  ]
}
```

## Future Considerations
- Integration with live Allo protocol data
- Enhanced visual effects for new votes
- Project status indicators
- Vote amount visualization
- Historical data replay
- Match amount predictions

## Development Guidelines
1. Maintain visual stability during updates
2. Keep code modular and well-documented
3. Use standard web primitives where possible
4. Optimize for large-screen display
5. Consider AI-agent maintainability in code structure

## Dependencies
- D3.js for visualization
- No other external dependencies required

## Performance Considerations
- Optimized for 6-hour data window
- Efficient DOM updates
- Smooth animation handling
- Memory management for long-running sessions 