// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { CONFIG } from './script.js';

// Initialize Supabase client
const supabaseUrl = 'https://fudpimvsuddwhpbalpgy.supabase.co'; // Replace with your actual URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZHBpbXZzdWRkd2hwYmFscGd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDI3NjAzNywiZXhwIjoyMDU1ODUyMDM3fQ.JjokWUheGRzs5_ggnAfab1ss3myQ0NUbtmH6ByWqbJk'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize JSConfetti
const jsConfetti = new JSConfetti();

// Available emoji options (matching VoteAllocation.tsx)
const EMOJI_OPTIONS = ['❤️', '🎉', '🚀', '💡', '🌱', '🐸', '🗿'];

// Cache for the last fetched data to optimize incremental updates
let lastFetchedData = null;

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
        let transactions, participants, projects, profiles;
        
        // Always fetch the latest matching data
        const matchingResponse = await fetch('https://dev.jon.bo/api/matching', {
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
        } else {
            // For full updates, fetch all data
            [
                { data: transactions },
                { data: participants },
                { data: projects },
                { data: profiles }
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
                    .select('*')
            ]);
        }
        
        console.log('Raw matchingData:', matchingData);
        
        // Ensure matchingData is properly structured
        const matchingResults = matchingData.results || [];
        console.log('Processed matchingData:', matchingResults);

        // Transform participants into attendees format
        console.log('Profiles:', profiles);
        const attendees = participants.map((participant, index) => ({
            id: participant.user_id,
            displayId: profiles.find(p => p.id === participant.user_id)?.name || participant.user_id.substring(0, 8),
            credits: participant.available_votes,
            votes: [], // Will be populated from transactions
            lane: index
        }));

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
        .filter(project => project.matchingAmount > 0) // Filter out projects with no matching amount
        .sort((a, b) => b.matchingAmount - a.matchingAmount) // Sort by matching amount descending
        // .slice(0, 5); // Only take top 5 projects

        // Generate time slots (using existing CONFIG from script.js)
        const timeSlots = generateTimeSlots();
        
        // Group transactions into 15-minute slots
        transactions.forEach(transaction => {
            // if (transaction.type !== 'vote_allocation') return;

            // const txTime = new Date(transaction.created_at);
            const txTime = new Date();
            txTime.setHours(new Date(transaction.created_at).getHours());
            txTime.setMinutes(new Date(transaction.created_at).getMinutes());
            txTime.setSeconds(new Date(transaction.created_at).getSeconds());
            const slotIndex = findTimeSlotIndex(timeSlots, txTime);
            
            if (slotIndex === -1) return; // Transaction outside visualization window
            
            const attendee = attendees.find(a => a.id === transaction.user_id);
            if (!attendee) return;

            const voteId = `vote_${slotIndex}_${attendee.id}_${transaction.id}`;
            
            // Add vote to time slot
            timeSlots[slotIndex].votes.push({
                id: voteId,
                projectId: transaction.project_id,
                attendeeId: transaction.user_id,
                yPosition: (attendee.lane * CONFIG.grid.rowHeight) + (CONFIG.grid.rowHeight / 2)
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
        });

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
    return timeSlots.findIndex((slot, index) => {
        const slotEnd = index < timeSlots.length - 1 
            ? timeSlots[index + 1].timestamp 
            : new Date(slot.timestamp.getTime() + (CONFIG.time.interval * 60000));
        
        return timestamp >= slot.timestamp && timestamp < slotEnd;
    });
}

// Re-export generateTimeSlots from script.js to avoid circular dependency
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
            isPast: time <= currentTime
        };
    });
}

// Re-export getEventTiming from script.js
function getEventTiming() {
    const now = new Date();
    now.setMinutes(Math.floor(now.getMinutes() / CONFIG.time.interval) * CONFIG.time.interval);
    now.setSeconds(0);
    now.setMilliseconds(0);

    const eventStart = new Date(now);
    eventStart.setHours(CONFIG.time.startHour);
    eventStart.setMinutes(0);
    
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(eventStart.getHours() + CONFIG.time.eventDuration);

    return {
        eventStart,
        eventEnd,
        currentTime: now
    };
}

/**
 * Sets up realtime subscription for project allocations
 * @param {string} eventId - UUID of the event to watch
 * @param {Function} onUpdate - Callback function to handle updates
 * @returns {Object} Subscription channel
 */
export function subscribeToProjectAllocations(eventId, onUpdate) {
    const channel = supabase
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
            
            // Call the update callback to refresh the visualization
            // We use setTimeout to ensure the confetti animation has time to start
            // before we begin updating the visualization
            setTimeout(() => {
                onUpdate();
            }, 100);
        })
        .subscribe();

    return channel;
}
