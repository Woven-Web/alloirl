// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'

// Initialize Supabase client
const supabaseUrl = 'https://fudpimvsuddwhpbalpgy.supabase.co'; // Replace with your actual URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZHBpbXZzdWRkd2hwYmFscGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyNDE5NzEsImV4cCI6MjA1NjgxNzk3MX0.aOcmu851Xv52a3y2iBvgiKYR31mO5t8qWsPSLL4z4U4'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize JSConfetti
const jsConfetti = new JSConfetti();

// Available emoji options (matching VoteAllocation.tsx)
const EMOJI_OPTIONS = ['❤️', '🎉', '🚀', '💡', '🌱', '🐸', '🗿'];

// Cache for the last fetched data to optimize incremental updates
let lastFetchedData = null;

// Store event timing information with default values
// These will be updated when we fetch event data
let eventTimingInfo = {
    startHour: 10,        // Default start hour (11 AM)
    eventDuration: 6,     // Default duration (6 hours)
    interval: 15,         // Default interval (15 minutes)
    rowHeight: 45         // Default row height for attendees
};

// Function to get a random emoji from the options
function getRandomEmoji() {
    return EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)];
}

// Function to create a single emoji element
function createEmojiElement(emoji, x, y, scale = 1) {
    const element = document.createElement('div');
    element.textContent = emoji;
    element.style.position = 'fixed';
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.fontSize = `${24 * scale}px`;
    element.style.zIndex = '9999';
    element.style.pointerEvents = 'none';
    element.style.transition = 'all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1)';
    element.style.opacity = '1';
    return element;
}

// Function to animate emoji explosion
function rainEmoji(emoji, count = 150) {
    const container = document.body;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;
    
    for (let i = 0; i < count; i++) {
        // Create emoji with random size
        const scale = 0.5 + Math.random() * 1.5;
        const element = createEmojiElement(emoji, centerX, centerY, scale);
        container.appendChild(element);
        
        // Calculate random angle and distance for explosion effect
        const angle = (Math.random() * Math.PI * 2);
        const distance = 100 + Math.random() * 400;
        const finalX = centerX + Math.cos(angle) * distance;
        const finalY = centerY + Math.sin(angle) * distance;
        
        // Start animation after a tiny random delay
        setTimeout(() => {
            element.style.transform = `translate(${finalX - centerX}px, ${finalY - centerY}px) rotate(${Math.random() * 720 - 360}deg)`;
            element.style.opacity = '0';
        }, Math.random() * 50);
        
        // Remove element after animation
        setTimeout(() => {
            element.remove();
        }, 1000);
    }
}

// Function to create confetti explosion with emojis
function createConfettiExplosion(emoji) {
    jsConfetti.addConfetti({
        emojis: [emoji],
        emojiSize: 150,
        confettiNumber: 150,
        confettiRadius: 10,
        confettiColors: ['#F3FD8B', '#ffffff'],
    });
}

// Expose the createConfettiExplosion function globally for testing purposes
window.createConfettiExplosion = createConfettiExplosion;

/**
 * Fetches and transforms data for the visualization
 * @param {string} eventId - UUID of the event to fetch data for
 * @param {boolean} isIncremental - Whether this is an incremental update
 * @returns {Promise<Object>} Transformed data for visualization
 */
export async function fetchEventData(eventId, isIncremental = false) {
    try {
        // For incremental updates, we only need to fetch new matching data and transactions
        // We can reuse participant and project data from the last fetch
        let transactions, participants, projects, profiles, eventDetails;
        
        // Always fetch the latest matching data
        // const matchingResponse = await fetch('http://localhost:3000/api/matching', {
        // const matchingResponse = await fetch('https://dev.jon.bo/api/matching', {
        const matchingResponse = await fetch('https://irl.allo.capital/api/matching', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId })
        });
        const matchingData = await matchingResponse.json();
        
        if (isIncremental && lastFetchedData) {
            // For incremental updates, only fetch new transactions since last update
            const lastTransactionTime = lastFetchedData.lastTransactionTime || new Date(0);
            
            // Fetch only new transactions
            const { data: newTransactions } = await supabase
                .from('transactions')
                .select('*')
                .eq('event_id', eventId)
                .gt('created_at', lastTransactionTime.toISOString())
                .order('created_at', { ascending: true });
            
            // Merge new transactions with existing ones
            transactions = [...(lastFetchedData.transactions || []), ...(newTransactions || [])];
            
            // Reuse existing data for participants, projects, and profiles
            participants = lastFetchedData.participants;
            projects = lastFetchedData.projects;
            profiles = lastFetchedData.profiles;
            eventDetails = lastFetchedData.eventDetails;
        } else {
            // For full updates, fetch all data
            const [
                transactionsResponse,
                participantsResponse,
                projectsResponse,
                profilesResponse,
                eventResponse
            ] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('*')
                    .eq('event_id', eventId)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('event_participants')
                    .select('*')
                    .eq('event_id', eventId),
                supabase
                    .from('projects')
                    .select('*')
                    .eq('event_id', eventId),
                supabase.from('profiles')
                    .select('*'),
                supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .single()
            ]);
            
            // Extract data from responses
            transactions = transactionsResponse.data || [];
            participants = participantsResponse.data || [];
            projects = projectsResponse.data || [];
            profiles = profilesResponse.data || [];
            eventDetails = eventResponse.data;
            
            console.log('Event details from database:', eventDetails);
            console.log('Event start_date raw:', eventDetails ? eventDetails.start_date : 'No event details');
            console.log('Event end_date raw:', eventDetails ? eventDetails.end_date : 'No event details');
            
            // Calculate start hour and event duration from event details
            if (eventDetails) {
                // Parse dates and handle timezone correctly
                const startDate = new Date(eventDetails.start_date);
                const endDate = new Date(eventDetails.end_date);
                
                console.log('Raw start date from DB:', eventDetails.start_date);
                console.log('Raw end date from DB:', eventDetails.end_date);
                console.log('Parsed start date:', startDate);
                console.log('Parsed end date:', endDate);
                console.log('Start date local time:', startDate.toLocaleString());
                console.log('End date local time:', endDate.toLocaleString());
                
                // Calculate the timezone offset in hours
                const timezoneOffsetHours = startDate.getTimezoneOffset() / 60;
                
                // Extract start hour (in 24-hour format) from the event's start date
                // We need to use the local hour, not UTC hour
                const startHour = startDate.getHours();
                console.log('Raw start hour from event:', startHour);
                
                // MANUAL OVERRIDE: If the event was at 11am MT but showing as 4am, override it
                // This is a temporary fix until we resolve the timezone issues
                let correctedStartHour = startHour;
                if (startHour === 4 || startHour === 5) {
                    // If the hour is showing as 4am or 5am, it's likely a timezone issue
                    // Override to 11am (or whatever the actual start time was)
                    correctedStartHour = 11;
                    console.log('MANUAL OVERRIDE: Correcting start hour from', startHour, 'to', correctedStartHour);
                }
                
                // Calculate duration in hours
                const durationMs = endDate.getTime() - startDate.getTime();
                const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
                
                // Update event timing info
                eventTimingInfo = {
                    startDate: startDate, // Store the full start date
                    startHour: correctedStartHour, // Use the corrected start hour
                    eventDuration: durationHours,
                    interval: eventTimingInfo.interval, // Keep the existing interval
                    rowHeight: eventTimingInfo.rowHeight, // Keep the existing row height
                    timezoneOffsetHours: timezoneOffsetHours // Store timezone offset
                };
                
                console.log(`Event timing from database: date=${startDate.toLocaleDateString()}, startHour=${correctedStartHour} (corrected from ${startHour}), duration=${durationHours}h, timezoneOffset=${timezoneOffsetHours}h`);
            } else {
                console.warn('No event details found, using default timing values');
            }
        }
        
        console.log('Raw matchingData:', matchingData);
        
        // Ensure matchingData is properly structured
        const matchingResults = matchingData.results || [];
        console.log('Processed matchingData:', matchingResults);

        // Transform participants into attendees format
        console.log('Participants count:', participants.length);
        console.log('Profiles count:', profiles.length);
        console.log('Participants data sample:', participants.slice(0, 3));
        
        const attendees = participants.map((participant, index) => {
            const profile = profiles.find(p => p.id === participant.user_id);
            const displayName = profile ? profile.name : participant.user_id.substring(0, 8);
            
            console.log(`Processing participant ${index}:`, {
                id: participant.user_id,
                displayId: displayName,
                credits: participant.available_votes
            });
            
            return {
                id: participant.user_id,
                displayId: displayName,
                credits: participant.available_votes,
                votes: [], // Will be populated from transactions
                lane: index
            };
        });
        
        console.log('Generated attendees count:', attendees.length);

        // Transform projects into required format and sort by matching amount
        const transformedProjects = projects.map((project, index) => {
            const matchingInfo = matchingResults.find(m => m.project_id === project.id) || {
                matching_amount: 0,
                contribution_amount: 0,
                number_contributions: 0
            };
            
            return {
                id: project.id,
                name: project.name || `${String.fromCharCode(65 + index)}`,
                votes: [], // Will be populated from transactions
                matchingAmount: matchingInfo.matching_amount,
                contributionAmount: matchingInfo.contribution_amount,
                numberContributions: matchingInfo.number_contributions
            };
        })
        // .filter(project => project.matchingAmount > 0) // Filter out projects with no matching amount
        .sort((a, b) => b.matchingAmount - a.matchingAmount) // Sort by matching amount descending
        // .slice(0, 5); // Only take top 5 projects

        // If all projects have the same matching amount, randomize their order
        const allSameAmount = transformedProjects.every(p => p.matchingAmount === transformedProjects[0].matchingAmount);
        if (allSameAmount) {
            // Fisher-Yates shuffle
            for (let i = transformedProjects.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [transformedProjects[i], transformedProjects[j]] = [transformedProjects[j], transformedProjects[i]];
            }
        }

        // Generate time slots using our local eventTimingInfo
        const timeSlots = generateTimeSlots();
        
        // Log time slots for debugging
        console.log(`Generated ${timeSlots.length} time slots from ${timeSlots[0].displayTime} to ${timeSlots[timeSlots.length-1].displayTime}`);
        
        // Group transactions into 15-minute slots
        console.log(`Processing ${transactions.length} transactions`);
        console.log('Event date from database:', eventDetails ? new Date(eventDetails.start_date).toLocaleString() : 'No event details');
        console.log('Time slots date range:', timeSlots[0].timestamp.toLocaleString(), 'to', 
                   timeSlots[timeSlots.length-1].timestamp.toLocaleString());
        
        let processedTransactions = 0;
        let skippedTransactions = 0;
        
        transactions.forEach(transaction => {
            // if (transaction.type !== 'vote_allocation') return;

            const txTime = new Date(transaction.created_at);
            
            // Log transaction time for debugging
            if (processedTransactions < 5 || skippedTransactions < 5) {
                console.log(`Transaction time: ${txTime.toISOString()} (${txTime.toLocaleString()})`);
            }

            // TEMPORARY WORKAROUND: Adjust transaction date to match time slot date
            // This is needed because the transactions might be from a different date than the time slots
            if (timeSlots.length > 0) {
                // Get the date from the first time slot
                const slotDate = new Date(timeSlots[0].timestamp);
                
                // Create a new date with the slot date but transaction time
                const adjustedTxTime = new Date(slotDate);
                adjustedTxTime.setHours(txTime.getHours());
                adjustedTxTime.setMinutes(txTime.getMinutes());
                adjustedTxTime.setSeconds(txTime.getSeconds());
                
                if (processedTransactions < 5 || skippedTransactions < 5) {
                    console.log(`Adjusted transaction time: ${adjustedTxTime.toISOString()} (${adjustedTxTime.toLocaleString()})`);
                }
                
                // Use the adjusted time for slot matching
                const slotIndex = findTimeSlotIndex(timeSlots, adjustedTxTime);
                
                if (slotIndex === -1) {
                    skippedTransactions++;
                    if (skippedTransactions < 5) {
                        console.log(`Transaction outside visualization window: ${adjustedTxTime.toISOString()} (${adjustedTxTime.toLocaleString()})`);
                    }
                    return; // Transaction outside visualization window
                }
                
                const attendee = attendees.find(a => a.id === transaction.user_id);
                if (!attendee) {
                    skippedTransactions++;
                    if (skippedTransactions < 5) {
                        console.log(`No attendee found for user_id: ${transaction.user_id}`);
                    }
                    return;
                }

                const voteId = `vote_${slotIndex}_${attendee.id}_${transaction.id}`;
                
                // Add vote to time slot
                timeSlots[slotIndex].votes.push({
                    id: voteId,
                    projectId: transaction.project_id,
                    attendeeId: transaction.user_id,
                    yPosition: (attendee.lane * eventTimingInfo.rowHeight) + (eventTimingInfo.rowHeight / 2)
                });

                // Cross-reference vote in project
                const project = transformedProjects.find(p => p.id === transaction.project_id);
                if (project) {
                    project.votes.push({
                        timeSlotIndex: slotIndex,
                        voteId: voteId,
                        attendeeId: transaction.user_id
                    });
                }

                // Cross-reference vote in attendee
                attendee.votes.push({
                    timeSlotIndex: slotIndex,
                    voteId: voteId,
                    projectId: transaction.project_id
                });
                
                processedTransactions++;
            } else {
                // No time slots available
                skippedTransactions++;
                console.warn('No time slots available for transaction processing');
            }
        });
        
        console.log(`Processed ${processedTransactions} transactions, skipped ${skippedTransactions}`);
        console.log(`Attendees with votes: ${attendees.filter(a => a.votes.length > 0).length} out of ${attendees.length}`);
        
        // If no attendees have votes, log a warning
        if (attendees.filter(a => a.votes.length > 0).length === 0) {
            console.warn('No attendees have votes! This will result in an empty visualization.');
        }

        // Store the last transaction time for incremental updates
        const lastTransactionTime = transactions.length > 0 
            ? new Date(transactions[transactions.length - 1].created_at)
            : new Date();

        // Cache the raw data for future incremental updates
        lastFetchedData = {
            transactions,
            participants,
            projects,
            profiles,
            eventDetails,
            lastTransactionTime
        };

        return {
            timeSlots,
            projects: transformedProjects,
            attendees
        };
    } catch (error) {
        console.error('Error fetching event data:', error);
        throw error;
    }
}

/**
 * Finds the index of the time slot for a given timestamp
 * @param {Array} timeSlots - Array of time slots
 * @param {Date} timestamp - Timestamp to find slot for
 * @returns {number} Index of the slot, or -1 if not found
 */
function findTimeSlotIndex(timeSlots, timestamp) {
    // For debugging, log the first and last time slot
    if (!window.hasLoggedTimeSlots) {
        console.log('First time slot:', timeSlots[0].timestamp.toISOString(), timeSlots[0].displayTime);
        console.log('Last time slot:', timeSlots[timeSlots.length - 1].timestamp.toISOString(), timeSlots[timeSlots.length - 1].displayTime);
        console.log('First time slot local:', timeSlots[0].timestamp.toLocaleString());
        console.log('Last time slot local:', timeSlots[timeSlots.length - 1].timestamp.toLocaleString());
        
        // Log date comparison for debugging
        console.log('Transaction date check:');
        console.log('- First slot date:', timeSlots[0].timestamp.toDateString());
        console.log('- Example transaction date:', timestamp.toDateString());
        console.log('- Dates match?', timeSlots[0].timestamp.toDateString() === timestamp.toDateString());
        
        window.hasLoggedTimeSlots = true;
    }
    
    // Check if timestamp is before first slot or after last slot
    if (timestamp < timeSlots[0].timestamp) {
        console.log(`Transaction time ${timestamp.toLocaleString()} is before first slot ${timeSlots[0].timestamp.toLocaleString()}`);
        console.log(`Date comparison: Transaction=${timestamp.toDateString()}, Slot=${timeSlots[0].timestamp.toDateString()}`);
        return -1; // Before first slot
    }
    
    if (timestamp > new Date(timeSlots[timeSlots.length - 1].timestamp.getTime() + (eventTimingInfo.interval * 60000))) {
        console.log(`Transaction time ${timestamp.toLocaleString()} is after last slot ${timeSlots[timeSlots.length - 1].timestamp.toLocaleString()}`);
        return -1; // After last slot
    }
    
    const slotIndex = timeSlots.findIndex((slot, index) => {
        const slotEnd = index < timeSlots.length - 1 
            ? timeSlots[index + 1].timestamp 
            : new Date(slot.timestamp.getTime() + (eventTimingInfo.interval * 60000));
        
        return timestamp >= slot.timestamp && timestamp < slotEnd;
    });
    
    if (slotIndex === -1) {
        console.log(`Transaction time ${timestamp.toLocaleString()} doesn't match any slot despite being within range`);
    } else {
        console.log(`Transaction time ${timestamp.toLocaleString()} matched to slot ${slotIndex} (${timeSlots[slotIndex].displayTime})`);
    }
    
    return slotIndex;
}

// Re-export generateTimeSlots from script.js to avoid circular dependency
function generateTimeSlots() {
    const { eventStart, eventEnd, currentTime } = getEventTiming();
    const totalSlots = (eventTimingInfo.eventDuration * 60) / eventTimingInfo.interval;
    
    console.log(`Generating ${totalSlots} time slots with interval ${eventTimingInfo.interval} minutes`);
    console.log(`Event start: ${eventStart.toLocaleString()}, Event end: ${eventEnd.toLocaleString()}`);
    
    return Array.from({ length: totalSlots }, (_, i) => {
        const time = new Date(eventStart);
        time.setMinutes(time.getMinutes() + (eventTimingInfo.interval * i));
        
        return {
            timestamp: time,
            displayTime: formatTime(time),
            votes: [],
            isPast: time <= currentTime
        };
    });
}

// Simple time formatter function to avoid circular dependency
function formatTime(time) {
    // Format the time in local timezone for display
    const hours = time.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12
    return `${displayHours}${ampm}`;
}

// Re-export getEventTiming from script.js
function getEventTiming() {
    // Get the current date and time
    const now = new Date();
    
    // Use the exact start date from eventTimingInfo if available
    // This ensures we're using the exact date of the event, not today's date
    let eventDate;
    if (eventTimingInfo.startDate) {
        // Use the exact date from the event
        eventDate = new Date(eventTimingInfo.startDate);
        console.log('Using exact event date from database:', eventDate.toLocaleString());
    } else if (lastFetchedData && lastFetchedData.eventDetails && lastFetchedData.eventDetails.start_date) {
        // Fallback to lastFetchedData if available
        eventDate = new Date(lastFetchedData.eventDetails.start_date);
        console.log('Using event date from lastFetchedData:', eventDate.toLocaleString());
    } else {
        // Last resort: use current date
        eventDate = new Date(now);
        console.warn('No event date available, using current date:', eventDate.toLocaleString());
    }
    
    // For "now" time, use the same date as the event but with current time
    const currentTime = new Date(eventDate);
    currentTime.setHours(now.getHours());
    currentTime.setMinutes(Math.floor(now.getMinutes() / eventTimingInfo.interval) * eventTimingInfo.interval);
    currentTime.setSeconds(0);
    currentTime.setMilliseconds(0);

    // Create event start time using the exact event date
    // Important: preserve the original date, only set hours if needed
    const eventStart = new Date(eventDate);
    
    // Always set the hours to the corrected start hour from eventTimingInfo
    // This ensures we're using the correct start hour (e.g., 11am instead of 4am)
    eventStart.setHours(eventTimingInfo.startHour);
    eventStart.setMinutes(0);
    eventStart.setSeconds(0);
    eventStart.setMilliseconds(0);
    
    // Create event end time based on event start and duration
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventStart.getHours() + eventTimingInfo.eventDuration);

    // Log the event timing for debugging
    console.log('Event timing:', {
        eventDate: eventDate.toLocaleDateString(),
        startHour: eventStart.getHours(),
        eventDuration: eventTimingInfo.eventDuration,
        eventStart: eventStart.toISOString(),
        eventStartLocal: eventStart.toLocaleString(),
        eventEnd: eventEnd.toISOString(),
        eventEndLocal: eventEnd.toLocaleString(),
        currentTime: currentTime.toLocaleString()
    });

    return {
        eventStart,
        eventEnd,
        currentTime
    };
}

/**
 * Sets up realtime subscription for project allocations and transactions
 * @param {string} eventId - UUID of the event to watch
 * @param {Function} onUpdate - Callback function to handle updates
 * @returns {Object} Subscription object with unsubscribe method
 */
export function subscribeToProjectAllocations(eventId, onUpdate) {
    // Create a channel for transactions
    const transactionsChannel = supabase
        .channel('transactions_changes')
        .on('postgres_changes', {
            event: 'INSERT',  // Listen to insert events
            schema: 'public',
            table: 'transactions',
            filter: `event_id=eq.${eventId}`
        }, (payload) => {
            console.log('New transaction detected:', payload);
            
            // Force a complete redraw of connections
            setTimeout(() => {
                // First update the data
                onUpdate();
                
                // Then force a complete redraw of connections
                // setTimeout(() => {
                //     // Clear existing connections and redraw them completely
                //     if (window.forceConnectionsRedraw && typeof window.forceConnectionsRedraw === 'function') {
                //         window.forceConnectionsRedraw();
                //     }
                // }, 300);
            }, 100);
        })
        .subscribe();
    
    // Keep the existing project allocations subscription
    const projectAllocationsChannel = supabase
        .channel('project_allocations_changes')
        .on('postgres_changes', {
            event: '*',  // Listen to all events
            schema: 'public',
            table: 'project_allocations',
            filter: `event_id=eq.${eventId}`
        }, (payload) => {
            // Get reaction from payload or generate random one
            const reaction = payload.new?.reaction || getRandomEmoji();
            
            // Create confetti explosion with the reaction emoji
            createConfettiExplosion(reaction);
            
            // Force a complete redraw of connections
            setTimeout(() => {
                // First update the data
                onUpdate();
                
                // Then force a complete redraw of connections
                // setTimeout(() => {
                //     // Clear existing connections and redraw them completely
                //     if (window.forceConnectionsRedraw && typeof window.forceConnectionsRedraw === 'function') {
                //         window.forceConnectionsRedraw();
                //     }
                // }, 300);
            }, 100);
        })
        .subscribe();

    // Return an object with both channels and an unsubscribe method
    return {
        unsubscribe: () => {
            transactionsChannel.unsubscribe();
            projectAllocationsChannel.unsubscribe();
        }
    };
}

// Export event timing info for use in other modules
export function getEventTimingInfo() {
    return eventTimingInfo;
}

// Function to update event timing info from script.js
export function updateEventTimingInfo(config) {
    // Update values from CONFIG if provided
    if (config && config.time && config.time.interval) {
        eventTimingInfo.interval = config.time.interval;
    }
    
    if (config && config.grid && config.grid.rowHeight) {
        eventTimingInfo.rowHeight = config.grid.rowHeight;
    }
}
