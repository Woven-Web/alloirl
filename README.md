# about alloirl

* Objective: AlloIRL tests a new way to allocate funds democratically by merging blockchain-based capital allocation tools with local, in-person events.
* Approach: Uses Allo.Capital Tech to enable a simple, no-code interface where community events serve as participatory budgeting sessions.

- every user gets x votes (right now it's set to 100)
- users can vote on projects. each project_id has one event_id that it's a part of
- votes go into both project_allocations (current / latest source of truth) as well as transactions (historical record)
- an event lasts a certain amount of time: votes_active goes false -> true -> false
- users can update their votes over time