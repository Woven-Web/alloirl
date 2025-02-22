// Import Supabase from CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm'
import { CONFIG } from './script.js';

// Initialize Supabase client
const supabaseUrl = 'https://uxylrdyyuidugrbbkurv.supabase.co'; // Replace with your actual URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eWxyZHl5dWlkdWdyYmJrdXJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjM3MjY0MSwiZXhwIjoyMDUxOTQ4NjQxfQ.IMYYavm93SOK6cNa4V_is8MROrXZ-X610crXaEGan-8'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize JSConfetti
const jsConfetti = new JSConfetti();

// Available emoji options (matching VoteAllocation.tsx)
const EMOJI_OPTIONS = ['❤️', '🎉', '🚀', '💡', '🌱', '🐸', '🗿'];

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
        emojiSize: 100,
        confettiNumber: 150,
        confettiRadius: 8,
        confettiColors: ['#F3FD8B', '#ffffff'],
    });
}

/**
 * Fetches and transforms data for the visualization
 * @param {string} eventId - UUID of the event to fetch data for
 * @returns {Promise<Object>} Transformed data for visualization
 */
export async function fetchEventData(eventId) {
    try {
        // TODO: figure out pagination for initial dump of transactions
        const [
            { data: transactions },
            { data: participants },
            { data: projects },
            { data: profiles },
            matchingData
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
            fetch('http://localhost:3000/api/matching', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            }).then(res => res.json())
        ]);

        // Transform participants into attendees format
        console.log({profiles})
        const attendees = participants.map((participant, index) => ({
            id: participant.user_id,
            displayId: profiles.find(p => p.id === participant.user_id)?.name || participant.user_id.substring(0, 8),
            credits: participant.available_votes,
            votes: [], // Will be populated from transactions
            lane: index
        }));

        // Transform projects into required format and sort by matching amount
        const transformedProjects = projects.map((project, index) => {
            const matchingInfo = matchingData.find(m => m.project_id === project.id) || {
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
        .sort((a, b) => b.matchingAmount - a.matchingAmount); // Sort by matching amount descending

        // Generate time slots (using existing CONFIG from script.js)
        const timeSlots = generateTimeSlots();
        
        // Group transactions into 15-minute slots
        transactions.forEach(transaction => {
            // if (transaction.type !== 'vote_allocation') return;

            const txTime = new Date(transaction.created_at);
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
            createConfettiExplosion(reaction);
            
            // Call the update callback to refresh the visualization
            onUpdate();
        })
        .subscribe();

    return channel;
}
